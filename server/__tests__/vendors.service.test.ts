import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceError } from "../services/base.service";
import { EventCapture } from "./events-helper";
import type { Vendor, CreateVendor, UpdateVendor } from "@shared/schema";

const { mockVendorsStorage, mockSendEmail } = vi.hoisted(() => ({
  mockVendorsStorage: {
    createVendor: vi.fn(),
    getVendorById: vi.fn(),
    updateVendor: vi.fn(),
    deleteVendor: vi.fn(),
    getContactById: vi.fn(),
    linkVendorContact: vi.fn(),
    unlinkVendorContact: vi.fn(),
    createVendorUpdateToken: vi.fn(),
    getVendorByToken: vi.fn(),
    markTokenAsUsed: vi.fn(),
  },
  mockSendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../domains/vendors/vendors.storage", () => ({
  vendorsStorage: mockVendorsStorage,
}));

vi.mock("../audit", () => ({
  getChangedFields: vi.fn().mockReturnValue({ before: {}, after: {} }),
}));

vi.mock("../email", () => ({
  sendVendorUpdateEmail: mockSendEmail,
}));

import { VendorsService } from "../domains/vendors/vendors.service";
import { createMockStorage } from "./mock-storage";

const makeVendor = (overrides: Partial<Vendor> = {}): Vendor => ({
  id: "vendor-1",
  businessName: "Vendor LLC",
  email: "vendor@example.com",
  phone: null,
  address: null,
  website: null,
  capabilitiesDeck: null,
  isPreferred: false,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as Vendor);

describe("VendorsService", () => {
  let service: VendorsService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    const storage = createMockStorage();
    service = new VendorsService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
  });

  describe("create", () => {
    it("creates a vendor and emits vendor:created", async () => {
      const vendor = makeVendor();
      mockVendorsStorage.createVendor.mockResolvedValue(vendor);

      const data: CreateVendor = { businessName: "Vendor LLC" };
      const result = await service.create(data, "actor-1");

      expect(result).toEqual(vendor);
      expect(mockVendorsStorage.createVendor).toHaveBeenCalled();

      const emitted = events.ofType("vendor:created");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].vendorName).toBe("Vendor LLC");
    });

    it("throws validation error for empty business name", async () => {
      const data: CreateVendor = { businessName: "" };
      await expect(
        service.create(data, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("update", () => {
    it("updates a vendor and emits vendor:updated", async () => {
      const existing = makeVendor();
      const updated = makeVendor({ businessName: "Updated LLC" });
      mockVendorsStorage.getVendorById.mockResolvedValue(existing);
      mockVendorsStorage.updateVendor.mockResolvedValue(updated);

      const data: UpdateVendor = { businessName: "Updated LLC" };
      const result = await service.update("vendor-1", data, "actor-1");

      expect(result).toEqual(updated);
      const emitted = events.ofType("vendor:updated");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when vendor is missing", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(undefined);

      const data: UpdateVendor = { businessName: "X" };
      await expect(
        service.update("missing", data, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when update returns null", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(makeVendor());
      mockVendorsStorage.updateVendor.mockResolvedValue(null);

      const data: UpdateVendor = { businessName: "X" };
      await expect(
        service.update("vendor-1", data, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("deletes a vendor and emits vendor:deleted", async () => {
      const existing = makeVendor();
      mockVendorsStorage.getVendorById.mockResolvedValue(existing);
      mockVendorsStorage.deleteVendor.mockResolvedValue(undefined);

      await service.delete("vendor-1", "actor-1");

      expect(mockVendorsStorage.deleteVendor).toHaveBeenCalledWith("vendor-1");
      const emitted = events.ofType("vendor:deleted");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].vendorName).toBe("Vendor LLC");
    });

    it("throws NOT_FOUND when vendor is missing", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(undefined);

      await expect(service.delete("missing", "actor-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("linkContact", () => {
    it("links a contact and emits vendor:linked_contact", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(makeVendor());
      mockVendorsStorage.getContactById.mockResolvedValue({
        id: "contact-1",
        firstName: "John",
        lastName: "Doe",
      });
      mockVendorsStorage.linkVendorContact.mockResolvedValue(undefined);

      await service.linkContact("vendor-1", "contact-1", "actor-1");

      expect(mockVendorsStorage.linkVendorContact).toHaveBeenCalledWith(
        "vendor-1",
        "contact-1",
      );
      const emitted = events.ofType("vendor:linked_contact");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].contactName).toBe("John Doe");
    });

    it("throws NOT_FOUND when vendor is missing", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(undefined);

      await expect(
        service.linkContact("missing", "contact-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when contact is missing", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(makeVendor());
      mockVendorsStorage.getContactById.mockResolvedValue(undefined);

      await expect(
        service.linkContact("vendor-1", "missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("unlinkContact", () => {
    it("unlinks a contact and emits vendor:unlinked_contact", async () => {
      mockVendorsStorage.unlinkVendorContact.mockResolvedValue(undefined);

      await service.unlinkContact("vendor-1", "contact-1", "actor-1");

      expect(mockVendorsStorage.unlinkVendorContact).toHaveBeenCalledWith(
        "vendor-1",
        "contact-1",
      );
      const emitted = events.ofType("vendor:unlinked_contact");
      expect(emitted).toHaveLength(1);
    });
  });

  describe("generateUpdateToken", () => {
    it("generates a token and emits vendor:token_generated", async () => {
      const vendor = makeVendor();
      const expiresAt = new Date("2026-05-13");
      mockVendorsStorage.getVendorById.mockResolvedValue(vendor);
      mockVendorsStorage.createVendorUpdateToken.mockResolvedValue({
        token: "abc123",
        expiresAt,
      });

      const result = await service.generateUpdateToken("vendor-1", "actor-1");

      expect(result.token).toBe("abc123");
      expect(result.expiresAt).toEqual(expiresAt);

      const emitted = events.ofType("vendor:token_generated");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].vendorName).toBe("Vendor LLC");
    });

    it("throws NOT_FOUND when vendor is missing", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(undefined);

      await expect(
        service.generateUpdateToken("missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("consumeToken", () => {
    it("returns vendor for valid token", async () => {
      const vendor = makeVendor();
      mockVendorsStorage.getVendorByToken.mockResolvedValue(vendor);

      const result = await service.consumeToken("valid-token");
      expect(result).toEqual(vendor);
    });

    it("throws NOT_FOUND for invalid token", async () => {
      mockVendorsStorage.getVendorByToken.mockResolvedValue(null);

      await expect(
        service.consumeToken("invalid"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("updateViaToken", () => {
    it("updates vendor via token and emits vendor:token_consumed", async () => {
      const vendor = makeVendor();
      mockVendorsStorage.getVendorByToken.mockResolvedValue(vendor);
      mockVendorsStorage.updateVendor.mockResolvedValue(vendor);
      mockVendorsStorage.markTokenAsUsed.mockResolvedValue(undefined);

      await service.updateViaToken("valid-token", {
        businessName: "Updated LLC",
        serviceIds: ["svc-1"],
      });

      expect(mockVendorsStorage.updateVendor).toHaveBeenCalled();
      expect(mockVendorsStorage.markTokenAsUsed).toHaveBeenCalledWith("valid-token");

      const emitted = events.ofType("vendor:token_consumed");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].token).toBe("valid-token");
    });

    it("throws NOT_FOUND for invalid token", async () => {
      mockVendorsStorage.getVendorByToken.mockResolvedValue(null);

      await expect(
        service.updateViaToken("invalid", { businessName: "X" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("normalizes website URLs", async () => {
      const vendor = makeVendor();
      mockVendorsStorage.getVendorByToken.mockResolvedValue(vendor);
      mockVendorsStorage.updateVendor.mockResolvedValue(vendor);
      mockVendorsStorage.markTokenAsUsed.mockResolvedValue(undefined);

      await service.updateViaToken("valid-token", {
        businessName: "LLC",
        website: "example.com",
        serviceIds: ["svc-1"],
      });

      const callArgs = mockVendorsStorage.updateVendor.mock.calls[0];
      expect(callArgs[1].website).toBe("https://example.com/");
    });
  });

  describe("batchGenerateAndEmail", () => {
    it("throws validation error for empty vendorIds", async () => {
      await expect(
        service.batchGenerateAndEmail([], "actor-1", "https://example.com"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("processes vendors and emits vendor:bulk_email_sent", async () => {
      const vendor = makeVendor();
      mockVendorsStorage.getVendorById.mockResolvedValue(vendor);
      mockVendorsStorage.createVendorUpdateToken.mockResolvedValue({
        token: "tok-1",
        expiresAt: new Date(),
      });

      const results = await service.batchGenerateAndEmail(
        ["vendor-1"],
        "actor-1",
        "https://app.com",
        false,
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);

      const emitted = events.ofType("vendor:bulk_email_sent");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].totalVendors).toBe(1);
    });

    it("handles missing vendor gracefully", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(null);

      const results = await service.batchGenerateAndEmail(
        ["missing"],
        "actor-1",
        "https://app.com",
        false,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("not found");
    });

    it("handles vendor without email", async () => {
      mockVendorsStorage.getVendorById.mockResolvedValue(
        makeVendor({ email: null }),
      );

      const results = await service.batchGenerateAndEmail(
        ["vendor-1"],
        "actor-1",
        "https://app.com",
        true,
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("no email");
    });
  });
});
