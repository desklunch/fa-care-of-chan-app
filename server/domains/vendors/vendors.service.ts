import { BaseService, ServiceError } from "../../services/base.service";
import { domainEvents } from "../../lib/events";
import { vendorsStorage } from "./vendors.storage";
import { getChangedFields } from "../../audit";
import { sendVendorUpdateEmail } from "../../email";
import type { Vendor, CreateVendor, UpdateVendor } from "@shared/schema";
import { insertVendorSchema, updateVendorSchema, publicVendorUpdateSchema } from "@shared/schema";

export class VendorsService extends BaseService {
  async create(data: CreateVendor, actorId: string): Promise<Vendor> {
    const parsed = insertVendorSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid vendor data", {
        errors: parsed.error.flatten(),
      });
    }

    const { serviceIds, ...vendorData } = parsed.data;
    const vendor = await vendorsStorage.createVendor(vendorData, serviceIds);

    domainEvents.emit({
      type: "vendor:created",
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      actorId,
      timestamp: new Date(),
    });

    return vendor;
  }

  async update(id: string, data: UpdateVendor, actorId: string): Promise<Vendor> {
    const existing = await vendorsStorage.getVendorById(id);
    this.ensureExists(existing, "Vendor", id);

    const parsed = updateVendorSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid vendor update data", {
        errors: parsed.error.flatten(),
      });
    }

    const { serviceIds, ...vendorData } = parsed.data;
    const vendor = await vendorsStorage.updateVendor(id, vendorData, serviceIds);
    if (!vendor) {
      throw ServiceError.notFound("Vendor", id);
    }

    const changes = getChangedFields(
      existing as unknown as Record<string, unknown>,
      vendor as unknown as Record<string, unknown>,
    );

    domainEvents.emit({
      type: "vendor:updated",
      vendorId: id,
      vendorName: vendor.businessName,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return vendor;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const existing = await vendorsStorage.getVendorById(id);
    this.ensureExists(existing, "Vendor", id);

    await vendorsStorage.deleteVendor(id);

    domainEvents.emit({
      type: "vendor:deleted",
      vendorId: id,
      vendorName: existing!.businessName,
      actorId,
      timestamp: new Date(),
    });
  }

  async linkContact(vendorId: string, contactId: string, actorId: string): Promise<void> {
    const vendor = await vendorsStorage.getVendorById(vendorId);
    this.ensureExists(vendor, "Vendor", vendorId);

    const contact = await vendorsStorage.getContactById(contactId);
    this.ensureExists(contact, "Contact", contactId);

    await vendorsStorage.linkVendorContact(vendorId, contactId);

    domainEvents.emit({
      type: "vendor:linked_contact",
      vendorId,
      contactId,
      contactName: `${contact!.firstName} ${contact!.lastName}`,
      actorId,
      timestamp: new Date(),
    });
  }

  async unlinkContact(vendorId: string, contactId: string, actorId: string): Promise<void> {
    await vendorsStorage.unlinkVendorContact(vendorId, contactId);

    domainEvents.emit({
      type: "vendor:unlinked_contact",
      vendorId,
      contactId,
      actorId,
      timestamp: new Date(),
    });
  }

  async generateUpdateToken(
    vendorId: string,
    actorId: string,
    expiresInHours: number = 720,
  ): Promise<{ token: string; expiresAt: Date }> {
    const vendor = await vendorsStorage.getVendorById(vendorId);
    this.ensureExists(vendor, "Vendor", vendorId);

    const result = await vendorsStorage.createVendorUpdateToken(vendorId, actorId, expiresInHours);

    domainEvents.emit({
      type: "vendor:token_generated",
      vendorId,
      vendorName: vendor!.businessName,
      expiresAt: result.expiresAt.toISOString(),
      actorId,
      timestamp: new Date(),
    });

    return result;
  }

  async consumeToken(token: string): Promise<Vendor> {
    const vendorWithServices = await vendorsStorage.getVendorByToken(token);
    if (!vendorWithServices) {
      throw ServiceError.notFound("Vendor update token");
    }

    return vendorWithServices;
  }

  async updateViaToken(token: string, data: unknown): Promise<void> {
    const vendorWithServices = await vendorsStorage.getVendorByToken(token);
    if (!vendorWithServices) {
      throw ServiceError.notFound("Vendor update token");
    }

    const parsed = publicVendorUpdateSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid vendor update data", {
        errors: parsed.error.flatten(),
      });
    }

    const { serviceIds, ...vendorData } = parsed.data;

    if (vendorData.website) {
      try {
        const url = new URL(vendorData.website.startsWith("http") ? vendorData.website : `https://${vendorData.website}`);
        vendorData.website = url.toString();
      } catch {
      }
    }
    if (vendorData.capabilitiesDeck) {
      try {
        const url = new URL(vendorData.capabilitiesDeck.startsWith("http") ? vendorData.capabilitiesDeck : `https://${vendorData.capabilitiesDeck}`);
        vendorData.capabilitiesDeck = url.toString();
      } catch {
      }
    }

    await vendorsStorage.updateVendor(vendorWithServices.id, vendorData, serviceIds);
    await vendorsStorage.markTokenAsUsed(token);

    domainEvents.emit({
      type: "vendor:token_consumed",
      vendorId: vendorWithServices.id,
      vendorName: vendorWithServices.businessName,
      token,
      actorId: "public",
      timestamp: new Date(),
    });
  }

  async batchGenerateAndEmail(
    vendorIds: string[],
    actorId: string,
    baseUrl: string,
    sendEmail: boolean = true,
    expiresInHours: number = 720,
  ): Promise<Array<{ vendorId: string; success: boolean; updateUrl?: string; error?: string }>> {
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      throw ServiceError.validation("vendorIds must be a non-empty array");
    }

    const results: Array<{ vendorId: string; success: boolean; updateUrl?: string; error?: string }> = [];

    for (const vendorId of vendorIds) {
      try {
        const vendor = await vendorsStorage.getVendorById(vendorId);

        if (!vendor) {
          results.push({ vendorId, success: false, error: "Vendor not found" });
          continue;
        }

        if (!vendor.email) {
          results.push({ vendorId, success: false, error: "Vendor has no email address" });
          continue;
        }

        const { token, expiresAt } = await vendorsStorage.createVendorUpdateToken(vendorId, actorId, expiresInHours);
        const updateUrl = `${baseUrl}/vendor-update/${token}`;

        if (sendEmail) {
          try {
            const emailResult = await sendVendorUpdateEmail(vendor.email, vendor.businessName, updateUrl);

            if (emailResult.success) {
              results.push({ vendorId, success: true, updateUrl });
            } else {
              results.push({ vendorId, success: false, error: emailResult.error, updateUrl });
            }
          } catch (emailError) {
            results.push({ vendorId, success: false, error: String(emailError), updateUrl });
          }
        } else {
          results.push({ vendorId, success: true, updateUrl });
        }
      } catch (vendorError) {
        results.push({ vendorId, success: false, error: String(vendorError) });
      }
    }

    domainEvents.emit({
      type: "vendor:bulk_email_sent",
      totalVendors: vendorIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      actorId,
      timestamp: new Date(),
    });

    return results;
  }
}
