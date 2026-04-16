import { Express, Request, Response } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission, loadPermissions } from "../../middleware/permissions";
import { handleServiceError } from "../../lib/route-helpers";
import { entityTasksService } from "./entity-tasks.service";
import { db } from "../../db";
import { auditLogs, users, entityTasks } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

function getPermissionPrefix(entityType: string): string {
  switch (entityType) {
    case "deal":
      return "deals";
    case "proposal":
      return "proposals";
    default:
      return entityType;
  }
}

function checkEntityPermission(
  req: Request,
  res: Response,
  entityType: string,
  level: "read" | "write" | "delete",
): boolean {
  const prefix = getPermissionPrefix(entityType);
  const permission = `${prefix}.${level}`;
  const ctx = req.permissionContext;
  if (!ctx || !ctx.permissions.includes(permission)) {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }
  return true;
}

async function lookupTaskEntityType(taskId: string): Promise<string | null> {
  const [task] = await db
    .select({ entityType: entityTasks.entityType })
    .from(entityTasks)
    .where(eq(entityTasks.id, taskId));
  return task?.entityType ?? null;
}

export function registerEntityTasksRoutes(app: Express): void {
  app.get("/api/entity-tasks/all", isAuthenticated, requirePermission("admin.settings"), async (_req, res) => {
    try {
      const tasks = await entityTasksService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch all entity tasks");
    }
  });

  app.get("/api/entity-tasks", isAuthenticated, loadPermissions, async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      if (!checkEntityPermission(req, res, entityType as string, "read")) return;
      const tasks = await entityTasksService.getTasks(
        entityType as string,
        entityId as string,
      );
      res.json(tasks);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch entity tasks");
    }
  });

  app.post("/api/entity-tasks", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const { entityType } = req.body;
      if (!entityType) {
        return res.status(400).json({ message: "entityType is required" });
      }
      if (!checkEntityPermission(req, res, entityType, "write")) return;
      const task = await entityTasksService.createTask(req.body, actorId);
      res.status(201).json(task);
    } catch (error) {
      handleServiceError(res, error, "Failed to create entity task");
    }
  });

  app.patch("/api/entity-tasks/:taskId", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "write")) return;
      const { entityType, entityId } = req.body;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      const task = await entityTasksService.updateTask(
        entityType,
        entityId,
        req.params.taskId,
        req.body,
        actorId,
      );
      res.json(task);
    } catch (error) {
      handleServiceError(res, error, "Failed to update entity task");
    }
  });

  app.delete("/api/entity-tasks/:taskId", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "delete")) return;
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }
      await entityTasksService.deleteTask(
        entityType as string,
        entityId as string,
        req.params.taskId,
        actorId,
      );
      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to delete entity task");
    }
  });

  app.post("/api/entity-tasks/reorder", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const { entityType, entityId, taskIds } = req.body;
      if (!entityType || !entityId || !Array.isArray(taskIds)) {
        return res.status(400).json({ message: "entityType, entityId, and taskIds[] are required" });
      }
      if (!checkEntityPermission(req, res, entityType, "write")) return;
      for (let i = 0; i < taskIds.length; i++) {
        await entityTasksService.updateTask(
          entityType,
          entityId,
          taskIds[i],
          { sortOrder: i },
          actorId,
        );
      }
      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to reorder entity tasks");
    }
  });

  app.get("/api/entity-tasks/:taskId/collaborators", isAuthenticated, loadPermissions, async (req, res) => {
    try {
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "read")) return;
      const collaborators = await entityTasksService.getTaskCollaborators(req.params.taskId);
      res.json(collaborators);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch collaborators");
    }
  });

  app.post("/api/entity-tasks/:taskId/collaborators", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "write")) return;
      await entityTasksService.addTaskCollaborator(
        req.params.taskId,
        req.body.userId,
        actorId,
      );
      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to add collaborator");
    }
  });

  app.delete("/api/entity-tasks/:taskId/collaborators/:userId", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const actorId = req.user?.claims?.sub;
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "write")) return;
      await entityTasksService.removeTaskCollaborator(
        req.params.taskId,
        req.params.userId,
        actorId,
      );
      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to remove collaborator");
    }
  });

  app.get("/api/entity-tasks/:taskId/activity", isAuthenticated, loadPermissions, async (req, res) => {
    try {
      const taskEntityType = await lookupTaskEntityType(req.params.taskId);
      if (!taskEntityType) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (!checkEntityPermission(req, res, taskEntityType, "read")) return;
      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          performedBy: auditLogs.performedBy,
          changes: auditLogs.changes,
          metadata: auditLogs.metadata,
          performedAt: auditLogs.performedAt,
          performerFirstName: users.firstName,
          performerLastName: users.lastName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.performedBy, users.id))
        .where(
          and(
            eq(auditLogs.entityType, "entity_task"),
            eq(auditLogs.entityId, req.params.taskId),
          ),
        )
        .orderBy(desc(auditLogs.performedAt))
        .limit(50);
      res.json(logs);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch task activity");
    }
  });

  app.get(
    "/api/admin/entity-task-templates",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        const entityType = req.query.entityType as string | undefined;
        const templates = await entityTasksService.getTaskTemplates(entityType);
        res.json(templates);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch task templates");
      }
    },
  );

  app.post(
    "/api/admin/entity-task-templates",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        const template = await entityTasksService.createTaskTemplate(req.body);
        res.status(201).json(template);
      } catch (error) {
        handleServiceError(res, error, "Failed to create task template");
      }
    },
  );

  app.patch(
    "/api/admin/entity-task-templates/:id",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        const template = await entityTasksService.updateTaskTemplate(req.params.id, req.body);
        res.json(template);
      } catch (error) {
        handleServiceError(res, error, "Failed to update task template");
      }
    },
  );

  app.delete(
    "/api/admin/entity-task-templates/:id",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req: any, res) => {
      try {
        await entityTasksService.deleteTaskTemplate(req.params.id);
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to delete task template");
      }
    },
  );
}
