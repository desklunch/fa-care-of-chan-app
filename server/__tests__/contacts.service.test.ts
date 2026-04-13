import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceError } from "../services/base.service";
import { EventCapture } from "./events-helper";
import type { Contact, CreateContact, UpdateContact } from "@shared/schema";

const { mockContactsStorage } = vi.hoisted(() => ({
  mockContactsStorage: {
    createContact: vi.fn(),
    getContactById: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    getClientById: vi.fn(),
    getVendorById: vi.fn(),
    linkClientContact: vi.fn(),
    unlinkClientContact: vi.fn(),
    linkVendorContact: vi.fn(),
    unlinkVendorContact: vi.fn(),
  },
}));

vi.mock("../domains/contacts/contacts.storage", () => ({
  contactsStorage: mockContactsStorage,
}));

vi.mock("../audit", () => ({
  getChangedFields: vi.fn().mockReturnValue({ before: {}, after: {} }),
}));

import { ContactsService } from "../domains/contacts/contacts.service";
import { createMockStorage } from "./mock-storage";

const makeContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: "contact-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: null,
  title: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as Contact);

describe("ContactsService", () => {
  let service: ContactsService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    const storage = createMockStorage();
    service = new ContactsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
  });

  describe("create", () => {
    it("creates a contact and emits contact:created", async () => {
      const contact = makeContact();
      mockContactsStorage.createContact.mockResolvedValue(contact);

      const data: CreateContact = { firstName: "John", lastName: "Doe", email: "john@example.com" };
      const result = await service.create(data, "actor-1");

      expect(result).toEqual(contact);
      expect(mockContactsStorage.createContact).toHaveBeenCalled();

      const emitted = events.ofType("contact:created");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].contactId).toBe("contact-1");
      expect(emitted[0].actorId).toBe("actor-1");
    });

    it("throws validation error for missing first name", async () => {
      const data: CreateContact = { firstName: "", lastName: "Doe" };
      await expect(
        service.create(data, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("update", () => {
    it("updates a contact and emits contact:updated", async () => {
      const existing = makeContact();
      const updated = makeContact({ firstName: "Jane" });
      mockContactsStorage.getContactById.mockResolvedValue(existing);
      mockContactsStorage.updateContact.mockResolvedValue(updated);

      const data: UpdateContact = { firstName: "Jane" };
      const result = await service.update("contact-1", data, "actor-1");

      expect(result).toEqual(updated);
      const emitted = events.ofType("contact:updated");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when contact is missing", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(undefined);

      const data: UpdateContact = { firstName: "Jane" };
      await expect(
        service.update("missing", data, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("deletes a contact and emits contact:deleted", async () => {
      const existing = makeContact();
      mockContactsStorage.getContactById.mockResolvedValue(existing);
      mockContactsStorage.deleteContact.mockResolvedValue(undefined);

      await service.delete("contact-1", "actor-1");

      expect(mockContactsStorage.deleteContact).toHaveBeenCalledWith("contact-1");
      const emitted = events.ofType("contact:deleted");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].contactName).toBe("John Doe");
    });

    it("throws NOT_FOUND when contact is missing", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(undefined);

      await expect(service.delete("missing", "actor-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("linkClient", () => {
    it("links a client to a contact and emits event", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(makeContact());
      mockContactsStorage.getClientById.mockResolvedValue({
        id: "client-1",
        name: "Acme Corp",
      });
      mockContactsStorage.linkClientContact.mockResolvedValue(undefined);

      await service.linkClient("contact-1", "client-1", "actor-1");

      expect(mockContactsStorage.linkClientContact).toHaveBeenCalledWith(
        "client-1",
        "contact-1",
      );
      const emitted = events.ofType("contact:linked_client");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].clientName).toBe("Acme Corp");
    });

    it("throws NOT_FOUND when contact is missing", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(undefined);

      await expect(
        service.linkClient("missing", "client-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when client is missing", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(makeContact());
      mockContactsStorage.getClientById.mockResolvedValue(undefined);

      await expect(
        service.linkClient("contact-1", "missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("unlinkClient", () => {
    it("unlinks a client and emits event", async () => {
      mockContactsStorage.unlinkClientContact.mockResolvedValue(undefined);

      await service.unlinkClient("contact-1", "client-1", "actor-1");

      expect(mockContactsStorage.unlinkClientContact).toHaveBeenCalledWith(
        "client-1",
        "contact-1",
      );
      const emitted = events.ofType("contact:unlinked_client");
      expect(emitted).toHaveLength(1);
    });
  });

  describe("linkVendor", () => {
    it("links a vendor to a contact and emits event", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(makeContact());
      mockContactsStorage.getVendorById.mockResolvedValue({
        id: "vendor-1",
        businessName: "Vendor LLC",
      });
      mockContactsStorage.linkVendorContact.mockResolvedValue(undefined);

      await service.linkVendor("contact-1", "vendor-1", "actor-1");

      expect(mockContactsStorage.linkVendorContact).toHaveBeenCalledWith(
        "vendor-1",
        "contact-1",
      );
      const emitted = events.ofType("contact:linked_vendor");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].vendorName).toBe("Vendor LLC");
    });

    it("throws NOT_FOUND when vendor is missing", async () => {
      mockContactsStorage.getContactById.mockResolvedValue(makeContact());
      mockContactsStorage.getVendorById.mockResolvedValue(undefined);

      await expect(
        service.linkVendor("contact-1", "missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("unlinkVendor", () => {
    it("unlinks a vendor and emits event", async () => {
      mockContactsStorage.unlinkVendorContact.mockResolvedValue(undefined);

      await service.unlinkVendor("contact-1", "vendor-1", "actor-1");

      expect(mockContactsStorage.unlinkVendorContact).toHaveBeenCalledWith(
        "vendor-1",
        "contact-1",
      );
      const emitted = events.ofType("contact:unlinked_vendor");
      expect(emitted).toHaveLength(1);
    });
  });
});
