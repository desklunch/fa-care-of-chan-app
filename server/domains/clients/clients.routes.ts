import { Express } from "express";
import { isAuthenticated, isManagerOrAdmin } from "../../googleAuth";
import { clientsStorage } from "./clients.storage";
import { ClientsService } from "./clients.service";
import { ServiceError } from "../../services/base.service";
import { storage } from "../../storage";
import type { IStorage } from "../../storage";

export function registerClientsRoutes(app: Express, storageOverride?: IStorage): void {
  const clientsService = new ClientsService(storageOverride ?? ({} as IStorage));

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

  app.get("/api/clients/:id/full", isAuthenticated, async (req, res) => {
    try {
      const client = await clientsStorage.getClientByIdWithRelations(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client with relations:", error);
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
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const client = await clientsService.create(req.body, actorId);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      const client = await clientsService.update(req.params.id, req.body, actorId);
      res.json(client);
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message, ...(error.details || {}) });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await clientsService.delete(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
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
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await clientsService.linkContact(req.params.id, req.params.contactId, actorId);
      res.status(201).json({ message: "Contact linked to client" });
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error linking contact to client:", error);
      res.status(500).json({ message: "Failed to link contact to client" });
    }
  });

  app.delete("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user?.id || req.user?.claims?.sub || "unknown";
      await clientsService.unlinkContact(req.params.id, req.params.contactId, actorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error("Error unlinking contact from client:", error);
      res.status(500).json({ message: "Failed to unlink contact from client" });
    }
  });
}
