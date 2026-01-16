import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { vendorsStorage } from "./vendors.storage";
import { sendVendorUpdateEmail } from "../../email";
import {
  insertVendorSchema,
  updateVendorSchema,
  publicVendorUpdateSchema,
} from "@shared/schema";

export function registerVendorsRoutes(app: Express): void {
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await vendorsStorage.getVendorsWithRelations();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const vendor = await vendorsStorage.getVendorByIdWithRelations(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      const parsed = insertVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const { serviceIds, ...vendorData } = parsed.data;
      const vendor = await vendorsStorage.createVendor(vendorData, serviceIds);

      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor",
        entityId: vendor.id,
        status: "success",
        metadata: { businessName: vendor.businessName },
      });

      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      const existingVendor = await vendorsStorage.getVendorById(req.params.id);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const parsed = updateVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const { serviceIds, ...vendorData } = parsed.data;
      const vendor = await vendorsStorage.updateVendor(req.params.id, vendorData, serviceIds);

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const changes = getChangedFields(
        existingVendor as unknown as Record<string, unknown>,
        vendor as unknown as Record<string, unknown>
      );

      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor",
        entityId: req.params.id,
        changes,
        status: "success",
      });

      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, requirePermission("vendors.delete"), async (req: any, res) => {
    try {
      const existingVendor = await vendorsStorage.getVendorById(req.params.id);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      await vendorsStorage.deleteVendor(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor",
        entityId: req.params.id,
        status: "success",
        metadata: { deletedVendor: existingVendor.businessName },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  app.get("/api/vendors/:id/contacts", isAuthenticated, async (req, res) => {
    try {
      const vendor = await vendorsStorage.getVendorById(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      const contacts = await vendorsStorage.getContactsForVendor(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching vendor contacts:", error);
      res.status(500).json({ message: "Failed to fetch vendor contacts" });
    }
  });

  app.post("/api/vendors/:id/contacts/:contactId", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      const vendor = await vendorsStorage.getVendorById(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      const contact = await vendorsStorage.getContactById(req.params.contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await vendorsStorage.linkVendorContact(req.params.id, req.params.contactId);
      
      await logAuditEvent(req, {
        action: "link",
        entityType: "vendor",
        entityId: req.params.id,
        metadata: { vendorId: req.params.id, contactId: req.params.contactId, contactName: `${contact.firstName} ${contact.lastName}` },
      });
      
      res.status(201).json({ message: "Contact linked to vendor" });
    } catch (error) {
      console.error("Error linking contact to vendor:", error);
      res.status(500).json({ message: "Failed to link contact to vendor" });
    }
  });

  app.delete("/api/vendors/:id/contacts/:contactId", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      await vendorsStorage.unlinkVendorContact(req.params.id, req.params.contactId);
      
      await logAuditEvent(req, {
        action: "unlink",
        entityType: "vendor",
        entityId: req.params.id,
        metadata: { vendorId: req.params.id, contactId: req.params.contactId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking contact from vendor:", error);
      res.status(500).json({ message: "Failed to unlink contact from vendor" });
    }
  });

  app.post("/api/vendors/:id/generate-update-link", isAuthenticated, requirePermission("vendor_tokens.manage"), async (req: any, res) => {
    try {
      const vendorId = req.params.id;
      const userId = req.user.id;
      const vendor = await vendorsStorage.getVendorById(vendorId);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      const expiresInHours = req.body.expiresInHours || 720;
      const { token, expiresAt } = await vendorsStorage.createVendorUpdateToken(vendorId, userId, expiresInHours);
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const url = `${protocol}://${host}/vendor-update/${token}`;
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: vendorId,
        status: "success",
        metadata: { vendorName: vendor.businessName, expiresAt: expiresAt.toISOString() },
      });
      
      res.json({ url, token, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error("Error generating vendor update link:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to generate update link" });
    }
  });
  
  app.post("/api/vendors/batch-update-links", isAuthenticated, requirePermission("vendor_tokens.manage"), async (req: any, res) => {
    try {
      const { vendorIds, sendEmail = true, expiresInHours = 720 } = req.body;
      const userId = req.user.id;
      
      if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
        return res.status(400).json({ message: "vendorIds must be a non-empty array" });
      }
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      
      const results = [];
      
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
          
          const { token, expiresAt } = await vendorsStorage.createVendorUpdateToken(vendorId, userId, expiresInHours);
          const updateUrl = `${protocol}://${host}/vendor-update/${token}`;
          
          if (sendEmail) {
            try {
              const emailResult = await sendVendorUpdateEmail(vendor.email, vendor.businessName, updateUrl);
              
              if (emailResult.success) {
                await logAuditEvent(req, {
                  action: "email_sent",
                  entityType: "vendor_update_token",
                  entityId: vendorId,
                  status: "success",
                  metadata: { 
                    vendorName: vendor.businessName, 
                    email: vendor.email,
                    expiresAt: expiresAt.toISOString(),
                    batch: true,
                  },
                });
                results.push({ vendorId, success: true, updateUrl });
              } else {
                await logAuditEvent(req, {
                  action: "email_sent",
                  entityType: "vendor_update_token",
                  entityId: vendorId,
                  status: "failure",
                  metadata: { 
                    vendorName: vendor.businessName, 
                    email: vendor.email,
                    error: emailResult.error,
                    batch: true,
                  },
                });
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
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: "batch",
        status: "success",
        metadata: { 
          totalVendors: vendorIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
      
      res.json({ results });
    } catch (error) {
      console.error("Error in batch update links:", error);
      res.status(500).json({ message: "Failed to process batch update links" });
    }
  });

  app.get("/api/vendor-update-tokens", isAuthenticated, requirePermission("vendor_tokens.manage"), async (req: any, res) => {
    try {
      const tokens = await vendorsStorage.getAllVendorUpdateTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching vendor update tokens:", error);
      res.status(500).json({ message: "Failed to fetch vendor update tokens" });
    }
  });

  // Public vendor update routes (no auth required)
  app.get("/api/vendor-update/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const vendor = await vendorsStorage.getVendorByToken(token);
      
      if (!vendor) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }
      
      const { isPreferred, notes, ...publicVendorData } = vendor;
      
      res.json(publicVendorData);
    } catch (error) {
      console.error("Error fetching vendor by token:", error);
      res.status(500).json({ message: "Failed to load vendor data" });
    }
  });
  
  app.post("/api/vendor-update/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const vendor = await vendorsStorage.getVendorByToken(token);
      
      if (!vendor) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }
      
      const result = publicVendorUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.errors 
        });
      }
      
      const { serviceIds, ...vendorData } = result.data;
      
      if (vendorData.website) {
        try {
          const url = new URL(vendorData.website.startsWith('http') ? vendorData.website : `https://${vendorData.website}`);
          vendorData.website = url.toString();
        } catch {
          // Keep as-is if URL parsing fails
        }
      }
      if (vendorData.capabilitiesDeck) {
        try {
          const url = new URL(vendorData.capabilitiesDeck.startsWith('http') ? vendorData.capabilitiesDeck : `https://${vendorData.capabilitiesDeck}`);
          vendorData.capabilitiesDeck = url.toString();
        } catch {
          // Keep as-is if URL parsing fails
        }
      }
      
      await vendorsStorage.updateVendor(vendor.id, vendorData, serviceIds);
      await vendorsStorage.markTokenAsUsed(token);
      
      res.json({ 
        success: true, 
        message: "Your information has been updated successfully" 
      });
    } catch (error) {
      console.error("Error updating vendor via token:", error);
      res.status(500).json({ message: "Failed to update vendor information" });
    }
  });
}
