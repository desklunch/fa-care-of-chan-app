import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent } from "../../audit";
import { handleServiceError } from "../../lib/route-helpers";
import { storage } from "../../storage";
import { DealsService } from "../../services/deals.service";
import { dealStatuses, type DealStatus } from "@shared/schema";
import { dealsStorage } from "./deals.storage";

const dealsService = new DealsService(storage);

export function registerDealsRoutes(app: Express): void {
  app.get("/api/deals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let statusFilter: DealStatus[] | undefined;
      
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        statusFilter = statusArray.filter(s => dealStatuses.includes(s as DealStatus)) as DealStatus[];
      }
      
      const deals = await dealsService.list({ status: statusFilter });
      res.json(deals);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deals");
    }
  });

  app.get("/api/deals/all-deal-tags", isAuthenticated, async (req, res) => {
    try {
      const results = await dealsStorage.getAllDealTags();
      res.json(results);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch all deal tags");
    }
  });

  app.get("/api/deals/all-linked-clients", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("../../db");
      const { dealClients, clients } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const results = await db
        .select({
          dealId: dealClients.dealId,
          clientId: dealClients.clientId,
          clientName: clients.name,
          label: dealClients.label,
        })
        .from(dealClients)
        .innerJoin(clients, eq(dealClients.clientId, clients.id));
      res.json(results);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch all linked clients");
    }
  });

  app.get("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const deal = await dealsService.getById(req.params.id);
      res.json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal");
    }
  });

  app.post("/api/deals", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.create(req.body, actorId);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal",
        entityId: deal.id,
        metadata: { displayName: deal.displayName, status: deal.status },
      });
      
      res.status(201).json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to create deal");
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.update(req.params.id, req.body, actorId);
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal",
        entityId: req.params.id,
        changes: req.body,
      });
      
      res.json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to update deal");
    }
  });

  app.post("/api/deals/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { dealIds } = req.body;
      const actorId = req.user.claims.sub;
      
      await dealsService.reorder(dealIds, actorId);
      
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "deals",
        entityId: "bulk",
        metadata: { count: dealIds?.length || 0 },
      });
      
      res.json({ success: true, reorderedCount: dealIds?.length || 0 });
    } catch (error) {
      handleServiceError(res, error, "Failed to reorder deals");
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, requirePermission("deals.delete"), async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.getById(req.params.id);
      
      await dealsService.delete(req.params.id, actorId);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { displayName: deal.displayName },
      });
      
      res.status(204).send();
    } catch (error) {
      handleServiceError(res, error, "Failed to delete deal");
    }
  });

  app.get("/api/deals/:dealId/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await dealsService.getTasks(req.params.dealId);
      res.json(tasks);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal tasks");
    }
  });

  app.post("/api/deals/:dealId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const task = await dealsService.createTask(
        { ...req.body, dealId: req.params.dealId },
        actorId
      );
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_task",
        entityId: task.id,
        status: "success",
        metadata: { dealId: req.params.dealId, title: task.title },
      });
      
      res.status(201).json(task);
    } catch (error) {
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_task",
        entityId: null,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to create deal task");
    }
  });

  app.patch("/api/deals/:dealId/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const task = await dealsService.updateTask(
        req.params.dealId,
        req.params.taskId,
        req.body,
        actorId
      );
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "success",
        metadata: { dealId: req.params.dealId },
      });
      
      res.json(task);
    } catch (error) {
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to update deal task");
    }
  });

  app.get("/api/deals/:id/linked-clients", isAuthenticated, async (req, res) => {
    try {
      const linkedClients = await dealsStorage.getLinkedClientsByDealId(req.params.id);
      res.json(linkedClients);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch linked clients");
    }
  });

  app.post("/api/deals/:id/linked-clients", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId, label } = req.body;
      if (!clientId) {
        return res.status(400).json({ message: "clientId is required" });
      }
      await dealsStorage.linkDealClient(req.params.id, clientId, label);

      await logAuditEvent(req, {
        action: "link_client",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { clientId, label },
      });

      const linkedClients = await dealsStorage.getLinkedClientsByDealId(req.params.id);
      res.status(201).json(linkedClients);
    } catch (error) {
      handleServiceError(res, error, "Failed to link client to deal");
    }
  });

  app.delete("/api/deals/:id/linked-clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      await dealsStorage.unlinkDealClient(req.params.id, req.params.clientId);

      await logAuditEvent(req, {
        action: "unlink_client",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { clientId: req.params.clientId },
      });

      res.status(204).send();
    } catch (error) {
      handleServiceError(res, error, "Failed to unlink client from deal");
    }
  });

  app.get("/api/deals/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const tagIds = await dealsStorage.getDealTagIds(req.params.id);
      res.json(tagIds);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal tags");
    }
  });

  app.put("/api/deals/:id/tags", isAuthenticated, async (req: any, res) => {
    try {
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: "tagIds must be an array" });
      }
      await dealsStorage.setDealTags(req.params.id, tagIds);

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { field: "tags", tagIds },
      });

      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to update deal tags");
    }
  });

  app.delete("/api/deals/:dealId/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      await dealsService.deleteTask(req.params.dealId, req.params.taskId, actorId);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "success",
        metadata: { dealId: req.params.dealId },
      });
      
      res.status(204).send();
    } catch (error) {
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to delete deal task");
    }
  });
}
