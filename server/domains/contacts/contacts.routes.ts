import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { logAuditEvent, getChangedFields } from "../../audit";
import { contactsStorage } from "./contacts.storage";
import { insertContactSchema, updateContactSchema } from "@shared/schema";

export function registerContactsRoutes(app: Express): void {
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

  app.post("/api/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertContactSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const contact = await contactsStorage.createContact(result.data);

      await logAuditEvent(req, {
        action: "create",
        entityType: "contact",
        entityId: contact.id,
        status: "success",
        metadata: { contact: `${result.data.firstName} ${result.data.lastName}` },
      });

      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "contact",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateContactSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const existingContact = await contactsStorage.getContactById(req.params.id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const contact = await contactsStorage.updateContact(req.params.id, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "contact",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(existingContact, result.data),
      });

      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "contact",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingContact = await contactsStorage.getContactById(req.params.id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await contactsStorage.deleteContact(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "contact",
        entityId: req.params.id,
        status: "success",
        metadata: { 
          deletedContact: `${existingContact.firstName} ${existingContact.lastName}` 
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "contact",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
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
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const client = await contactsStorage.getClientById(req.params.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await contactsStorage.linkClientContact(req.params.clientId, req.params.id);
      
      await logAuditEvent(req, {
        action: "link",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, clientId: req.params.clientId, clientName: client.name },
      });
      
      res.status(201).json({ message: "Client linked to contact" });
    } catch (error) {
      console.error("Error linking client to contact:", error);
      res.status(500).json({ message: "Failed to link client to contact" });
    }
  });

  app.delete("/api/contacts/:id/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      await contactsStorage.unlinkClientContact(req.params.clientId, req.params.id);
      
      await logAuditEvent(req, {
        action: "unlink",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, clientId: req.params.clientId },
      });
      
      res.status(204).send();
    } catch (error) {
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
      const contact = await contactsStorage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const vendor = await contactsStorage.getVendorById(req.params.vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      await contactsStorage.linkVendorContact(req.params.vendorId, req.params.id);
      
      await logAuditEvent(req, {
        action: "link",
        entityType: "vendor_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, vendorId: req.params.vendorId, vendorName: vendor.businessName },
      });
      
      res.status(201).json({ message: "Vendor linked to contact" });
    } catch (error) {
      console.error("Error linking vendor to contact:", error);
      res.status(500).json({ message: "Failed to link vendor to contact" });
    }
  });

  app.delete("/api/contacts/:id/vendors/:vendorId", isAuthenticated, async (req: any, res) => {
    try {
      await contactsStorage.unlinkVendorContact(req.params.vendorId, req.params.id);
      
      await logAuditEvent(req, {
        action: "unlink",
        entityType: "vendor_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, vendorId: req.params.vendorId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking vendor from contact:", error);
      res.status(500).json({ message: "Failed to unlink vendor from contact" });
    }
  });
}
