import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { vendorsStorage } from "./vendors.storage";
import { VendorsService } from "./vendors.service";
import { ServiceError } from "../../services/base.service";
import type { IStorage } from "../../storage";

export function registerVendorsRoutes(app: Express, storage?: IStorage): void {
  const vendorsService = new VendorsService(storage ?? ({} as IStorage));

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
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const vendor = await vendorsService.create(req.body, actorId);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const vendor = await vendorsService.update(req.params.id, req.body, actorId);
      res.json(vendor);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, requirePermission("vendors.delete"), async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await vendorsService.delete(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error deleting vendor:", error);
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
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await vendorsService.linkContact(req.params.id, req.params.contactId, actorId);
      res.status(201).json({ message: "Contact linked to vendor" });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error linking contact to vendor:", error);
      res.status(500).json({ message: "Failed to link contact to vendor" });
    }
  });

  app.delete("/api/vendors/:id/contacts/:contactId", isAuthenticated, requirePermission("vendors.write"), async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await vendorsService.unlinkContact(req.params.id, req.params.contactId, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error unlinking contact from vendor:", error);
      res.status(500).json({ message: "Failed to unlink contact from vendor" });
    }
  });

  app.post("/api/vendors/:id/generate-update-link", isAuthenticated, requirePermission("vendor_tokens.manage"), async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const expiresInHours = req.body.expiresInHours || 720;
      const { token, expiresAt } = await vendorsService.generateUpdateToken(req.params.id, actorId, expiresInHours);

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const url = `${protocol}://${host}/vendor-update/${token}`;

      res.json({ url, token, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error generating vendor update link:", error);
      res.status(500).json({ message: "Failed to generate update link" });
    }
  });

  app.post("/api/vendors/batch-update-links", isAuthenticated, requirePermission("vendor_tokens.manage"), async (req: any, res) => {
    try {
      const { vendorIds, sendEmail = true, expiresInHours = 720 } = req.body;
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const results = await vendorsService.batchGenerateAndEmail(vendorIds, actorId, baseUrl, sendEmail, expiresInHours);
      res.json({ results });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
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

  app.get("/api/vendor-update/:token", async (req, res) => {
    try {
      const vendorWithServices = await vendorsService.consumeToken(req.params.token);
      const { isPreferred, notes, ...publicVendorData } = vendorWithServices as any;
      res.json(publicVendorData);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: "Invalid or expired link" });
      }
      console.error("Error fetching vendor by token:", error);
      res.status(500).json({ message: "Failed to load vendor data" });
    }
  });

  app.post("/api/vendor-update/:token", async (req, res) => {
    try {
      await vendorsService.updateViaToken(req.params.token, req.body);
      res.json({
        success: true,
        message: "Your information has been updated successfully",
      });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error updating vendor via token:", error);
      res.status(500).json({ message: "Failed to update vendor information" });
    }
  });
}
