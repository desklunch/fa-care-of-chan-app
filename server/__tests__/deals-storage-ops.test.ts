import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceError } from "../services/base.service";
import { createMockStorage } from "./mock-storage";
import { EventCapture } from "./events-helper";
import type { IStorage } from "../storage";
import type { DealWithRelations } from "@shared/schema";

const { mockDealsStorage } = vi.hoisted(() => ({
  mockDealsStorage: {
    linkDealClient: vi.fn(),
    unlinkDealClient: vi.fn(),
    getLinkedClientsByDealId: vi.fn(),
    getDealTagIds: vi.fn(),
    setDealTags: vi.fn(),
    getAllDealTags: vi.fn(),
  },
}));

vi.mock("../domains/deals/deals.storage", () => ({
  dealsStorage: mockDealsStorage,
}));

vi.mock("../domains/notifications/notifications.storage", () => ({
  notificationsStorage: {
    createFollow: vi.fn().mockResolvedValue(undefined),
    removeFollow: vi.fn().mockResolvedValue(undefined),
  },
}));

import { DealsService } from "../domains/deals/deals.service";

type MockFn = ReturnType<typeof vi.fn>;

const makeDealWithRelations = (overrides: Partial<DealWithRelations> = {}): DealWithRelations => ({
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

describe("DealsService – client linking", () => {
  let storage: IStorage;
  let service: DealsService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createMockStorage();
    service = new DealsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
    vi.restoreAllMocks();
  });

  describe("linkClient", () => {
    it("links a client and emits deal:client_linked", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      mockDealsStorage.linkDealClient.mockResolvedValue(undefined);
      const linkedClients = [
        { dealId: "deal-1", clientId: "client-1", clientName: "Acme", label: "Primary", createdAt: new Date() },
      ];
      mockDealsStorage.getLinkedClientsByDealId.mockResolvedValue(linkedClients);

      const result = await service.linkClient("deal-1", "client-1", "actor-1", "Primary");

      expect(result).toEqual(linkedClients);
      expect(mockDealsStorage.linkDealClient).toHaveBeenCalledWith("deal-1", "client-1", "Primary");
      expect(mockDealsStorage.getLinkedClientsByDealId).toHaveBeenCalledWith("deal-1");

      const emitted = events.ofType("deal:client_linked");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].dealId).toBe("deal-1");
      expect(emitted[0].clientId).toBe("client-1");
      expect(emitted[0].label).toBe("Primary");
      expect(emitted[0].actorId).toBe("actor-1");
    });

    it("links without a label", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      mockDealsStorage.linkDealClient.mockResolvedValue(undefined);
      mockDealsStorage.getLinkedClientsByDealId.mockResolvedValue([]);

      await service.linkClient("deal-1", "client-1", "actor-1");

      expect(mockDealsStorage.linkDealClient).toHaveBeenCalledWith("deal-1", "client-1", undefined);
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(
        service.linkClient("missing", "client-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(mockDealsStorage.linkDealClient).not.toHaveBeenCalled();
    });

    it("throws VALIDATION_ERROR when clientId is empty", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);

      await expect(
        service.linkClient("deal-1", "", "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

      expect(mockDealsStorage.linkDealClient).not.toHaveBeenCalled();
    });
  });

  describe("unlinkClient", () => {
    it("unlinks a client and emits deal:client_unlinked", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      mockDealsStorage.unlinkDealClient.mockResolvedValue(undefined);

      await service.unlinkClient("deal-1", "client-1", "actor-1");

      expect(mockDealsStorage.unlinkDealClient).toHaveBeenCalledWith("deal-1", "client-1");

      const emitted = events.ofType("deal:client_unlinked");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].dealId).toBe("deal-1");
      expect(emitted[0].clientId).toBe("client-1");
      expect(emitted[0].actorId).toBe("actor-1");
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(
        service.unlinkClient("missing", "client-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(mockDealsStorage.unlinkDealClient).not.toHaveBeenCalled();
    });
  });

  describe("getLinkedClients", () => {
    it("returns linked clients for existing deal", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      const linkedClients = [
        { dealId: "deal-1", clientId: "c1", clientName: "Acme", label: null, createdAt: new Date() },
        { dealId: "deal-1", clientId: "c2", clientName: "Globex", label: "Sponsor", createdAt: new Date() },
      ];
      mockDealsStorage.getLinkedClientsByDealId.mockResolvedValue(linkedClients);

      const result = await service.getLinkedClients("deal-1");
      expect(result).toEqual(linkedClients);
      expect(result).toHaveLength(2);
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(
        service.getLinkedClients("missing"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});

describe("DealsService – tag management", () => {
  let storage: IStorage;
  let service: DealsService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createMockStorage();
    service = new DealsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
    vi.restoreAllMocks();
  });

  describe("getDealTagIds", () => {
    it("returns tag IDs for a deal", async () => {
      mockDealsStorage.getDealTagIds.mockResolvedValue(["tag-1", "tag-2"]);

      const result = await service.getDealTagIds("deal-1");
      expect(result).toEqual(["tag-1", "tag-2"]);
      expect(mockDealsStorage.getDealTagIds).toHaveBeenCalledWith("deal-1");
    });

    it("returns empty array when deal has no tags", async () => {
      mockDealsStorage.getDealTagIds.mockResolvedValue([]);

      const result = await service.getDealTagIds("deal-no-tags");
      expect(result).toEqual([]);
    });
  });

  describe("setDealTags", () => {
    it("sets tags and emits deal:tags_updated", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      mockDealsStorage.setDealTags.mockResolvedValue(undefined);

      await service.setDealTags("deal-1", ["tag-1", "tag-3"], "actor-1");

      expect(mockDealsStorage.setDealTags).toHaveBeenCalledWith("deal-1", ["tag-1", "tag-3"]);

      const emitted = events.ofType("deal:tags_updated");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].dealId).toBe("deal-1");
      expect(emitted[0].tagIds).toEqual(["tag-1", "tag-3"]);
      expect(emitted[0].actorId).toBe("actor-1");
    });

    it("clears all tags with empty array", async () => {
      const deal = makeDealWithRelations();
      (storage.getDealById as MockFn).mockResolvedValue(deal);
      mockDealsStorage.setDealTags.mockResolvedValue(undefined);

      await service.setDealTags("deal-1", [], "actor-1");

      expect(mockDealsStorage.setDealTags).toHaveBeenCalledWith("deal-1", []);
    });

    it("throws NOT_FOUND when deal does not exist", async () => {
      (storage.getDealById as MockFn).mockResolvedValue(undefined);

      await expect(
        service.setDealTags("missing", ["tag-1"], "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      expect(mockDealsStorage.setDealTags).not.toHaveBeenCalled();
    });

    it("throws VALIDATION_ERROR when tagIds is not an array", async () => {
      await expect(
        service.setDealTags("deal-1", null as unknown as string[], "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

      expect(mockDealsStorage.setDealTags).not.toHaveBeenCalled();
    });
  });

  describe("getAllDealTags", () => {
    it("returns all deal-tag associations", async () => {
      const expected = [
        { dealId: "deal-1", tagId: "tag-1", tagName: "VIP" },
        { dealId: "deal-2", tagId: "tag-1", tagName: "VIP" },
        { dealId: "deal-1", tagId: "tag-2", tagName: "Urgent" },
      ];
      mockDealsStorage.getAllDealTags.mockResolvedValue(expected);

      const result = await service.getAllDealTags();
      expect(result).toEqual(expected);
      expect(result).toHaveLength(3);
    });

    it("returns empty array when no tags exist", async () => {
      mockDealsStorage.getAllDealTags.mockResolvedValue([]);

      const result = await service.getAllDealTags();
      expect(result).toEqual([]);
    });
  });
});
