import { Express } from "express";
import { isAuthenticated, isManagerOrAdmin } from "../../googleAuth";
import { logAuditEvent, getChangedFields } from "../../audit";
import { clientsStorage } from "./clients.storage";
import { storage } from "../../storage";
import { insertClientSchema, updateClientSchema } from "@shared/schema";

export function registerClientsRoutes(app: Express): void {
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const clients = await clientsStorage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await clientsStorage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.get("/api/clients/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const client = await clientsStorage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const deals = await storage.getDealsByClientId(req.params.id);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching client deals:", error);
      res.status(500).json({ message: "Failed to fetch client deals" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await clientsStorage.createClient(validatedData);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "client",
        entityId: client.id,
        metadata: { name: client.name },
      });
      
      res.status(201).json(client);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingClient = await clientsStorage.getClientById(req.params.id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const validatedData = updateClientSchema.parse(req.body);
      const client = await clientsStorage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(500).json({ message: "Failed to update client" });
      }
      
      const changes = getChangedFields(existingClient, client);
      await logAuditEvent(req, {
        action: "update",
        entityType: "client",
        entityId: req.params.id,
        changes,
      });
      
      res.json(client);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const client = await clientsStorage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await clientsStorage.deleteClient(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "client",
        entityId: req.params.id,
        metadata: { name: client.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.get("/api/clients/:id/contacts", isAuthenticated, async (req, res) => {
    try {
      const client = await clientsStorage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const contacts = await clientsStorage.getContactsForClient(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });

  app.post("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req: any, res) => {
    try {
      const client = await clientsStorage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const contact = await clientsStorage.getContactById(req.params.contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await clientsStorage.linkClientContact(req.params.id, req.params.contactId);
      
      await logAuditEvent(req, {
        action: "link",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { clientId: req.params.id, contactId: req.params.contactId, contactName: `${contact.firstName} ${contact.lastName}` },
      });
      
      res.status(201).json({ message: "Contact linked to client" });
    } catch (error) {
      console.error("Error linking contact to client:", error);
      res.status(500).json({ message: "Failed to link contact to client" });
    }
  });

  app.delete("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req: any, res) => {
    try {
      await clientsStorage.unlinkClientContact(req.params.id, req.params.contactId);
      
      await logAuditEvent(req, {
        action: "unlink",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { clientId: req.params.id, contactId: req.params.contactId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking contact from client:", error);
      res.status(500).json({ message: "Failed to unlink contact from client" });
    }
  });
}
