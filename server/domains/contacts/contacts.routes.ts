import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { contactsStorage } from "./contacts.storage";
import { ContactsService } from "./contacts.service";
import { ServiceError } from "../../services/base.service";
import type { IStorage } from "../../storage";

export function registerContactsRoutes(app: Express, storage?: IStorage): void {
  const contactsService = new ContactsService(storage ?? ({} as IStorage));

  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await contactsStorage.getContactsWithRelations();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/clients/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await contactsStorage.getClientLinkedContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client-linked contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });

  app.get("/api/vendors/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await contactsStorage.getVendorLinkedContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching vendor-linked contacts:", error);
      res.status(500).json({ message: "Failed to fetch vendor contacts" });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.get("/api/contacts/:id/full", isAuthenticated, async (req, res) => {
    try {
      const contact = await contactsStorage.getContactByIdWithRelations(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact with relations:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const contact = await contactsService.create(req.body, actorId);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const contact = await contactsService.update(req.params.id, req.body, actorId);
      res.json(contact);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await contactsService.delete(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  app.get("/api/contacts/:id/clients", isAuthenticated, async (req, res) => {
    try {
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const clients = await contactsStorage.getClientsForContact(req.params.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching contact clients:", error);
      res.status(500).json({ message: "Failed to fetch contact clients" });
    }
  });

  app.get("/api/contacts/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const deals = await contactsStorage.getDealsByPrimaryContactId(req.params.id);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching contact deals:", error);
      res.status(500).json({ message: "Failed to fetch contact deals" });
    }
  });

  app.post("/api/contacts/:id/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await contactsService.linkClient(req.params.id, req.params.clientId, actorId);
      res.status(201).json({ message: "Client linked to contact" });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error linking client to contact:", error);
      res.status(500).json({ message: "Failed to link client to contact" });
    }
  });

  app.delete("/api/contacts/:id/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await contactsService.unlinkClient(req.params.id, req.params.clientId, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error unlinking client from contact:", error);
      res.status(500).json({ message: "Failed to unlink client from contact" });
    }
  });

  app.get("/api/contacts/:id/vendors", isAuthenticated, async (req, res) => {
    try {
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const vendors = await contactsStorage.getVendorsForContact(req.params.id);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching contact vendors:", error);
      res.status(500).json({ message: "Failed to fetch contact vendors" });
    }
  });

  app.post("/api/contacts/:id/vendors/:vendorId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await contactsService.linkVendor(req.params.id, req.params.vendorId, actorId);
      res.status(201).json({ message: "Vendor linked to contact" });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error linking vendor to contact:", error);
      res.status(500).json({ message: "Failed to link vendor to contact" });
    }
  });

  app.delete("/api/contacts/:id/vendors/:vendorId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await contactsService.unlinkVendor(req.params.id, req.params.vendorId, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error unlinking vendor from contact:", error);
      res.status(500).json({ message: "Failed to unlink vendor from contact" });
    }
  });
}
