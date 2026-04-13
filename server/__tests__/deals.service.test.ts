import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DealsService } from "../domains/deals/deals.service";
import { ServiceError } from "../services/base.service";
import { createMockStorage } from "./mock-storage";
import { EventCapture } from "./events-helper";
import type { IStorage } from "../storage";
import type { Deal, DealWithRelations, CreateDeal, UpdateDeal, DealTask, CreateDealTask } from "@shared/schema";

vi.mock("../domains/notifications/notifications.storage", () => ({
  notificationsStorage: {
    createFollow: vi.fn().mockResolvedValue(undefined),
    removeFollow: vi.fn().mockResolvedValue(undefined),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  id: "deal-1",
  dealNumber: 1,
  displayName: "Test Deal",
  status: 1,
  clientId: null,
  primaryContactId: null,
  ownerId: null,
  budgetHigh: null,
  budgetLow: null,
  budgetNotes: null,
  locations: [],
  eventSchedule: [],
  serviceIds: [],
  locationsText: null,
  concept: null,
  notes: null,
  nextSteps: null,
  projectDate: null,
  createdById: "actor-1",
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  startedOn: null,
  wonOn: null,
  lastContactOn: null,
  externalId: null,
  ...overrides,
});

const makeDealWithRelations = (overrides: Partial<DealWithRelations> = {}): DealWithRelations => ({
  ...makeDeal(),
  statusName: "Lead",
  statusColor: "#ccc",
  ownerName: null,
  clientName: null,
  primaryContactName: null,
  services: [],
  tasks: [],
  tags: [],
  links: [],
  clients: [],
  attachments: [],
  ...overrides,
});

const makeTask = (overrides: Partial<DealTask> = {}): DealTask => ({
  id: "task-1",
  dealId: "deal-1",
  title: "Test Task",
  completed: false,
  assignedUserId: null,
  dueDate: null,
  createdById: "actor-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const validCreateDeal: CreateDeal = {
  displayName: "Test Deal",
  status: 1,
  clientId: "client-1",
  locations: [],
};

describe("DealsService", () => {
  let storage: IStorage;
  let service: DealsService;
  let events: EventCapture;

  beforeEach(() => {
    storage = createMockStorage();
    service = new DealsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
    vi.restoreAllMocks();
  });

  describe("list", () => {
    it("delegates to storage.getDeals", async () => {
      const expected = [makeDealWithRelations()];
      (storage.getDeals as MockFn).mockResolvedValue(expected);

      const result = await service.list();
      expect(result).toEqual(expected);
      expect(storage.getDeals).toHaveBeenCalledWith(undefined);
    });

    it("passes options through", async () => {
      (storage.getDeals as MockFn).mockResolvedValue([]);
      const options = { status: ["Lead" as const] };
      await service.list(options);
      expect(storage.getDeals).toHaveBeenCalledWith(options);
    });
  });

  describe("getById", () => {
    it("returns deal when found", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);

      const result = await service.getById("deal-1");
      expect(result).toEqual(deal);
    });

    it("throws ServiceError.notFound when deal is missing", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(service.getById("missing")).rejects.toThrow(ServiceError);
      await expect(service.getById("missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("create", () => {
    it("creates a deal and emits deal:created", async () => {
      const created = makeDeal({ ownerId: null });
      (storage.getDealStatuses as MockFn).mockResolvedValue([
        { id: 1, name: "Lead", isDefault: true },
      ]);
      (storage.createDeal as MockFn).mockResolvedValue(created);

      const result = await service.create(validCreateDeal, "actor-1");

      expect(result).toEqual(created);
      expect(storage.createDeal).toHaveBeenCalled();

      const emitted = events.ofType("deal:created");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].deal).toEqual(created);
      expect(emitted[0].actorId).toBe("actor-1");
    });

    it("assigns default status when none provided", async () => {
      (storage.getDealStatuses as MockFn).mockResolvedValue([
        { id: 5, name: "Lead", isDefault: true },
      ]);
      (storage.createDeal as MockFn).mockResolvedValue(makeDeal({ status: 5 }));

      const { status, ...createWithoutStatus } = validCreateDeal;
      await service.create(createWithoutStatus as CreateDeal, "actor-1");

      const callArgs = (storage.createDeal as MockFn).mock.calls[0];
      expect(callArgs[0].status).toBe(5);
    });

    it("throws validation error for invalid data", async () => {
      (storage.getDealStatuses as MockFn).mockResolvedValue([
        { id: 1, name: "Lead", isDefault: true },
      ]);

      const invalid: CreateDeal = { ...validCreateDeal, displayName: "" };
      await expect(
        service.create(invalid, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("update", () => {
    it("updates a deal and emits deal:updated", async () => {
      const existing = makeDealWithRelations({ status: 1 });
      const updated = makeDeal({ status: 1, displayName: "Updated" });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.updateDeal as MockFn).mockResolvedValue(updated);

      const updateData: UpdateDeal = { displayName: "Updated" };
      const result = await service.update("deal-1", updateData, "actor-1");

      expect(result).toEqual(updated);
      const emitted = events.ofType("deal:updated");
      expect(emitted).toHaveLength(1);
    });

    it("emits deal:stage_changed when status changes", async () => {
      const existing = makeDealWithRelations({ status: 1 });
      const updated = makeDeal({ status: 2 });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.updateDeal as MockFn).mockResolvedValue(updated);
      (storage.getDealStatuses as MockFn).mockResolvedValue([
        { id: 2, name: "Proposal" },
      ]);

      const updateData: UpdateDeal = { status: 2 };
      await service.update("deal-1", updateData, "actor-1");

      const stageEvents = events.ofType("deal:stage_changed");
      expect(stageEvents).toHaveLength(1);
    });

    it("emits deal:owner_assigned when owner changes", async () => {
      const existing = makeDealWithRelations({ ownerId: "user-1" });
      const updated = makeDeal({ ownerId: "user-2" });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.updateDeal as MockFn).mockResolvedValue(updated);

      const updateData: UpdateDeal = { ownerId: "user-2" };
      await service.update("deal-1", updateData, "actor-1");

      const ownerEvents = events.ofType("deal:owner_assigned");
      expect(ownerEvents).toHaveLength(1);
      expect(ownerEvents[0].previousOwnerId).toBe("user-1");
      expect(ownerEvents[0].newOwnerId).toBe("user-2");
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      const updateData: UpdateDeal = { displayName: "X" };
      await expect(
        service.update("missing", updateData, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("deletes a deal and emits deal:deleted", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      (storage.deleteDeal as MockFn).mockResolvedValue(undefined);

      await service.delete("deal-1", "actor-1");

      expect(storage.deleteDeal).toHaveBeenCalledWith("deal-1");
      const emitted = events.ofType("deal:deleted");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].dealId).toBe("deal-1");
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(service.delete("missing", "actor-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("moveToStage", () => {
    it("moves deal to new stage and emits deal:stage_changed", async () => {
      const existing = makeDealWithRelations({ status: 1 });
      const updated = makeDeal({ status: 2 });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.getDealStatusByName as MockFn).mockResolvedValue({
        id: 2,
        name: "Proposal",
      });
      (storage.updateDeal as MockFn).mockResolvedValue(updated);

      const result = await service.moveToStage("deal-1", "Proposal" as Deal["status"], "actor-1");
      expect(result).toEqual(updated);

      const stageEvents = events.ofType("deal:stage_changed");
      expect(stageEvents).toHaveLength(1);
    });

    it("returns existing deal if already at target stage", async () => {
      const existing = makeDealWithRelations({ status: 2 });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.getDealStatusByName as MockFn).mockResolvedValue({
        id: 2,
        name: "Proposal",
      });

      const result = await service.moveToStage("deal-1", "Proposal" as Deal["status"], "actor-1");
      expect(result).toEqual(existing);
      expect(storage.updateDeal).not.toHaveBeenCalled();
    });

    it("throws validation error for invalid stage", async () => {
      const existing = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.getDealStatusByName as MockFn).mockResolvedValue(undefined);

      await expect(
        service.moveToStage("deal-1", "Invalid" as Deal["status"], "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("assignOwner", () => {
    it("assigns owner and emits deal:owner_assigned", async () => {
      const existing = makeDealWithRelations({ ownerId: null });
      const updated = makeDeal({ ownerId: "user-2" });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.updateDeal as MockFn).mockResolvedValue(updated);

      const result = await service.assignOwner("deal-1", "user-2", "actor-1");
      expect(result).toEqual(updated);

      const emitted = events.ofType("deal:owner_assigned");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].newOwnerId).toBe("user-2");
    });

    it("returns existing deal if owner is already assigned", async () => {
      const existing = makeDealWithRelations({ ownerId: "user-2" });
      (storage.getDealById as MockFn).mockResolvedValue(existing);

      const result = await service.assignOwner("deal-1", "user-2", "actor-1");
      expect(result).toEqual(existing);
      expect(storage.updateDeal).not.toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("delegates to storage.reorderDeals", async () => {
      (storage.reorderDeals as MockFn).mockResolvedValue(undefined);

      await service.reorder(["d1", "d2", "d3"], "actor-1");
      expect(storage.reorderDeals).toHaveBeenCalledWith(["d1", "d2", "d3"]);
    });

    it("throws validation error for empty array", async () => {
      await expect(service.reorder([], "actor-1")).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
    });

    it("throws validation error for non-array", async () => {
      await expect(
        service.reorder(null as unknown as string[], "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("createTask", () => {
    it("creates a task and emits deal:task_created", async () => {
      const deal = makeDealWithRelations();
      const task = makeTask();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      (storage.createDealTask as MockFn).mockResolvedValue(task);

      const taskData: CreateDealTask = { dealId: "deal-1", title: "Test Task" };
      const result = await service.createTask(taskData, "actor-1");

      expect(result).toEqual(task);
      const emitted = events.ofType("deal:task_created");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when deal is missing", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      const taskData: CreateDealTask = { dealId: "missing", title: "T" };
      await expect(
        service.createTask(taskData, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("updateTask", () => {
    it("updates a task and emits deal:task_updated", async () => {
      const task = makeTask();
      const updatedTask = makeTask({ completed: true });
      (storage.getDealTaskById as MockFn).mockResolvedValue(task);
      (storage.updateDealTask as MockFn).mockResolvedValue(updatedTask);

      const result = await service.updateTask(
        "deal-1",
        "task-1",
        { completed: true },
        "actor-1",
      );

      expect(result).toEqual(updatedTask);
      const emitted = events.ofType("deal:task_updated");
      expect(emitted).toHaveLength(1);
    });

    it("throws validation error when task does not belong to deal", async () => {
      const task = makeTask({ dealId: "other-deal" });
      (storage.getDealTaskById as MockFn).mockResolvedValue(task);

      await expect(
        service.updateTask("deal-1", "task-1", { completed: true }, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("deleteTask", () => {
    it("deletes a task and emits deal:task_deleted", async () => {
      const task = makeTask();
      (storage.getDealTaskById as MockFn).mockResolvedValue(task);
      (storage.deleteDealTask as MockFn).mockResolvedValue(undefined);

      await service.deleteTask("deal-1", "task-1", "actor-1");

      expect(storage.deleteDealTask).toHaveBeenCalledWith("task-1");
      const emitted = events.ofType("deal:task_deleted");
      expect(emitted).toHaveLength(1);
    });

    it("throws validation error when task does not belong to deal", async () => {
      const task = makeTask({ dealId: "other-deal" });
      (storage.getDealTaskById as MockFn).mockResolvedValue(task);

      await expect(
        service.deleteTask("deal-1", "task-1", "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("getByClientId", () => {
    it("delegates to storage.getDealsByClientId", async () => {
      const expected = [makeDealWithRelations({ clientId: "client-1" })];
      (storage.getDealsByClientId as MockFn).mockResolvedValue(expected);

      const result = await service.getByClientId("client-1");
      expect(result).toEqual(expected);
      expect(storage.getDealsByClientId).toHaveBeenCalledWith("client-1");
    });

    it("returns empty array when client has no deals", async () => {
      (storage.getDealsByClientId as MockFn).mockResolvedValue([]);

      const result = await service.getByClientId("client-no-deals");
      expect(result).toEqual([]);
    });
  });

  describe("getByPrimaryContactId", () => {
    it("delegates to storage.getDealsByPrimaryContactId", async () => {
      const expected = [makeDealWithRelations({ primaryContactId: "contact-1" })];
      (storage.getDealsByPrimaryContactId as MockFn).mockResolvedValue(expected);

      const result = await service.getByPrimaryContactId("contact-1");
      expect(result).toEqual(expected);
      expect(storage.getDealsByPrimaryContactId).toHaveBeenCalledWith("contact-1");
    });
  });

  describe("getTasks", () => {
    it("returns tasks for an existing deal", async () => {
      const deal = makeDealWithRelations();
      const tasks = [makeTask()];
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      (storage.getDealTasks as MockFn).mockResolvedValue(tasks);

      const result = await service.getTasks("deal-1");
      expect(result).toEqual(tasks);
      expect(storage.getDealTasks).toHaveBeenCalledWith("deal-1");
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(service.getTasks("missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("duplicate", () => {
    it("duplicates a deal and emits deal:created", async () => {
      const existing = makeDealWithRelations({ displayName: "Original" });
      const duplicated = makeDeal({ id: "deal-2", displayName: "Copy of Original" });
      (storage.getDealById as MockFn).mockResolvedValue(existing);
      (storage.createDeal as MockFn).mockResolvedValue(duplicated);

      const result = await service.duplicate("deal-1", "actor-1");

      expect(result).toEqual(duplicated);
      const callArgs = (storage.createDeal as MockFn).mock.calls[0];
      expect(callArgs[0].displayName).toBe("Copy of Original");

      const emitted = events.ofType("deal:created");
      expect(emitted).toHaveLength(1);
    });
  });
});
