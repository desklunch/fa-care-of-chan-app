import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceError } from "../services/base.service";
import { EventCapture } from "./events-helper";
import type { Client, CreateClient, UpdateClient } from "@shared/schema";

const { mockClientsStorage } = vi.hoisted(() => ({
  mockClientsStorage: {
    createClient: vi.fn(),
    getClientById: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    getContactById: vi.fn(),
    linkClientContact: vi.fn(),
    unlinkClientContact: vi.fn(),
  },
}));

vi.mock("../domains/clients/clients.storage", () => ({
  clientsStorage: mockClientsStorage,
}));

vi.mock("../audit", () => ({
  getChangedFields: vi.fn().mockReturnValue({ before: {}, after: {} }),
}));

import { ClientsService } from "../domains/clients/clients.service";
import { createMockStorage } from "./mock-storage";

const makeClient = (overrides: Partial<Client> = {}): Client => ({
  id: "client-1",
  name: "Acme Corp",
  website: null,
  industryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as Client);

describe("ClientsService", () => {
  let service: ClientsService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    const storage = createMockStorage();
    service = new ClientsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
  });

  describe("create", () => {
    it("creates a client and emits client:created", async () => {
      const client = makeClient();
      mockClientsStorage.createClient.mockResolvedValue(client);

      const data: CreateClient = { name: "Acme Corp" };
      const result = await service.create(data, "actor-1");

      expect(result).toEqual(client);
      expect(mockClientsStorage.createClient).toHaveBeenCalled();

      const emitted = events.ofType("client:created");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].clientId).toBe("client-1");
      expect(emitted[0].clientName).toBe("Acme Corp");
    });

    it("throws validation error for empty name", async () => {
      const data: CreateClient = { name: "" };
      await expect(
        service.create(data, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("update", () => {
    it("updates a client and emits client:updated", async () => {
      const existing = makeClient();
      const updated = makeClient({ name: "Updated Corp" });
      mockClientsStorage.getClientById.mockResolvedValue(existing);
      mockClientsStorage.updateClient.mockResolvedValue(updated);

      const data: UpdateClient = { name: "Updated Corp" };
      const result = await service.update("client-1", data, "actor-1");

      expect(result).toEqual(updated);
      const emitted = events.ofType("client:updated");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].clientName).toBe("Updated Corp");
    });

    it("throws NOT_FOUND when client is missing", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(undefined);

      const data: UpdateClient = { name: "X" };
      await expect(
        service.update("missing", data, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when update returns null", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(makeClient());
      mockClientsStorage.updateClient.mockResolvedValue(null);

      const data: UpdateClient = { name: "X" };
      await expect(
        service.update("client-1", data, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("deletes a client and emits client:deleted", async () => {
      const existing = makeClient();
      mockClientsStorage.getClientById.mockResolvedValue(existing);
      mockClientsStorage.deleteClient.mockResolvedValue(undefined);

      await service.delete("client-1", "actor-1");

      expect(mockClientsStorage.deleteClient).toHaveBeenCalledWith("client-1");
      const emitted = events.ofType("client:deleted");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].clientName).toBe("Acme Corp");
    });

    it("throws NOT_FOUND when client is missing", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(undefined);

      await expect(service.delete("missing", "actor-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("linkContact", () => {
    it("links a contact and emits client:linked_contact", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(makeClient());
      mockClientsStorage.getContactById.mockResolvedValue({
        id: "contact-1",
        firstName: "John",
        lastName: "Doe",
      });
      mockClientsStorage.linkClientContact.mockResolvedValue(undefined);

      await service.linkContact("client-1", "contact-1", "actor-1");

      expect(mockClientsStorage.linkClientContact).toHaveBeenCalledWith(
        "client-1",
        "contact-1",
      );
      const emitted = events.ofType("client:linked_contact");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].contactName).toBe("John Doe");
    });

    it("throws NOT_FOUND when client is missing", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(undefined);

      await expect(
        service.linkContact("missing", "contact-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when contact is missing", async () => {
      mockClientsStorage.getClientById.mockResolvedValue(makeClient());
      mockClientsStorage.getContactById.mockResolvedValue(undefined);

      await expect(
        service.linkContact("client-1", "missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("unlinkContact", () => {
    it("unlinks a contact and emits client:unlinked_contact", async () => {
      mockClientsStorage.unlinkClientContact.mockResolvedValue(undefined);

      await service.unlinkContact("client-1", "contact-1", "actor-1");

      expect(mockClientsStorage.unlinkClientContact).toHaveBeenCalledWith(
        "client-1",
        "contact-1",
      );
      const emitted = events.ofType("client:unlinked_contact");
      expect(emitted).toHaveLength(1);
    });
  });
});
