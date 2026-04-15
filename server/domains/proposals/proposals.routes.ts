import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { handleServiceError } from "../../lib/route-helpers";
import { proposalsService } from "./proposals.service";
import { db } from "../../db";
import { auditLogs, users } from "@shared/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";

export function registerProposalsRoutes(app: Express): void {
  app.get("/api/proposals/statuses", isAuthenticated, requirePermission("proposals.read"), async (_req, res) => {
    try {
      const statuses = await proposalsService.getStatuses();
      res.json(statuses);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch proposal statuses");
    }
  });

  app.get(
    "/api/admin/proposal-task-templates",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (_req, res) => {
      try {
        const templates = await proposalsService.getTaskTemplates();
        res.json(templates);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch task templates");
      }
    },
  );

  app.post(
    "/api/admin/proposal-task-templates",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        const template = await proposalsService.createTaskTemplate(req.body);
        res.status(201).json(template);
      } catch (error) {
        handleServiceError(res, error, "Failed to create task template");
      }
    },
  );

  app.patch(
    "/api/admin/proposal-task-templates/:id",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        const template = await proposalsService.updateTaskTemplate(
          req.params.id,
          req.body,
        );
        res.json(template);
      } catch (error) {
        handleServiceError(res, error, "Failed to update task template");
      }
    },
  );

  app.delete(
    "/api/admin/proposal-task-templates/:id",
    isAuthenticated,
    requirePermission("admin.settings"),
    async (req, res) => {
      try {
        await proposalsService.deleteTaskTemplate(req.params.id);
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to delete task template");
      }
    },
  );

  app.get(
    "/api/proposals",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (_req, res) => {
      try {
        const proposals = await proposalsService.list();
        res.json(proposals);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch proposals");
      }
    },
  );

  app.get(
    "/api/proposals/:id",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const proposal = await proposalsService.getById(req.params.id);
        res.json(proposal);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch proposal");
      }
    },
  );

  app.get(
    "/api/deals/:dealId/proposal",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const proposal = await proposalsService.getByDealId(req.params.dealId);
        res.json(proposal);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch proposal by deal");
      }
    },
  );

  app.post(
    "/api/proposals",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const proposal = await proposalsService.create(req.body, actorId);
        res.status(201).json(proposal);
      } catch (error) {
        handleServiceError(res, error, "Failed to create proposal");
      }
    },
  );

  app.patch(
    "/api/proposals/:id",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const proposal = await proposalsService.update(
          req.params.id,
          req.body,
          actorId,
        );
        res.json(proposal);
      } catch (error) {
        handleServiceError(res, error, "Failed to update proposal");
      }
    },
  );

  app.delete(
    "/api/proposals/:id",
    isAuthenticated,
    requirePermission("proposals.delete"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.delete(req.params.id, actorId);
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to delete proposal");
      }
    },
  );

  app.get(
    "/api/proposals/:proposalId/tasks",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const tasks = await proposalsService.getTasks(req.params.proposalId);
        res.json(tasks);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch tasks");
      }
    },
  );

  app.post(
    "/api/proposals/:proposalId/tasks",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const task = await proposalsService.createTask(
          { ...req.body, proposalId: req.params.proposalId },
          actorId,
        );
        res.status(201).json(task);
      } catch (error) {
        handleServiceError(res, error, "Failed to create task");
      }
    },
  );

  app.patch(
    "/api/proposals/:proposalId/tasks/:taskId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const task = await proposalsService.updateTask(
          req.params.proposalId,
          req.params.taskId,
          req.body,
          actorId,
        );
        res.json(task);
      } catch (error) {
        handleServiceError(res, error, "Failed to update task");
      }
    },
  );

  app.delete(
    "/api/proposals/:proposalId/tasks/:taskId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.deleteTask(
          req.params.proposalId,
          req.params.taskId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to delete task");
      }
    },
  );

  app.get(
    "/api/proposals/tasks/:taskId/collaborators",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const collaborators = await proposalsService.getTaskCollaborators(
          req.params.taskId,
        );
        res.json(collaborators);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch collaborators");
      }
    },
  );

  app.post(
    "/api/proposals/tasks/:taskId/collaborators",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.addTaskCollaborator(
          req.params.taskId,
          req.body.userId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to add collaborator");
      }
    },
  );

  app.delete(
    "/api/proposals/tasks/:taskId/collaborators/:userId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.removeTaskCollaborator(
          req.params.taskId,
          req.params.userId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to remove collaborator");
      }
    },
  );

  app.get(
    "/api/proposals/tasks/:taskId/links",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const links = await proposalsService.getTaskLinks(req.params.taskId);
        res.json(links);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch task links");
      }
    },
  );

  app.post(
    "/api/proposals/tasks/:taskId/links",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const link = await proposalsService.createTaskLink(
          req.params.taskId,
          req.body,
          actorId,
        );
        res.status(201).json(link);
      } catch (error) {
        handleServiceError(res, error, "Failed to create task link");
      }
    },
  );

  app.delete(
    "/api/proposals/tasks/:taskId/links/:linkId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const task = await proposalsService.getTaskById(req.params.taskId);
        await proposalsService.deleteTaskLink(
          req.params.linkId,
          req.params.taskId,
          task.proposalId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to delete task link");
      }
    },
  );

  app.get(
    "/api/proposals/tasks/:taskId/activity",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
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
            or(
              and(
                eq(auditLogs.entityType, "proposal_task"),
                eq(auditLogs.entityId, req.params.taskId),
              ),
              and(
                eq(auditLogs.entityType, "proposal_task_link"),
                sql`${auditLogs.metadata}->>'taskId' = ${req.params.taskId}`,
              ),
            ),
          )
          .orderBy(desc(auditLogs.performedAt))
          .limit(50);
        res.json(logs);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch task activity");
      }
    },
  );

  app.get(
    "/api/proposals/:proposalId/activity",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const proposalId = req.params.proposalId;
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
            or(
              and(
                eq(auditLogs.entityType, "proposal"),
                eq(auditLogs.entityId, proposalId),
              ),
              and(
                sql`${auditLogs.entityType} IN ('proposal_task', 'proposal_task_link', 'proposal_stakeholder', 'entity_team_member')`,
                sql`${auditLogs.metadata}->>'proposalId' = ${proposalId}`,
              ),
            ),
          )
          .orderBy(desc(auditLogs.performedAt))
          .limit(100);
        res.json(logs);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch proposal activity");
      }
    },
  );

  app.post(
    "/api/proposals/:proposalId/tasks/reorder",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const { taskIds } = req.body as { taskIds: string[] };
        if (!Array.isArray(taskIds)) {
          return res.status(400).json({ message: "taskIds must be an array" });
        }
        for (let i = 0; i < taskIds.length; i++) {
          await proposalsService.updateTask(
            req.params.proposalId,
            taskIds[i],
            { sortOrder: i },
            actorId,
          );
        }
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to reorder tasks");
      }
    },
  );

  app.get(
    "/api/proposals/:proposalId/stakeholders",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const stakeholders = await proposalsService.getStakeholders(
          req.params.proposalId,
        );
        res.json(stakeholders);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch stakeholders");
      }
    },
  );

  app.post(
    "/api/proposals/:proposalId/stakeholders",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const stakeholder = await proposalsService.addStakeholder(
          req.params.proposalId,
          req.body,
          actorId,
        );
        res.status(201).json(stakeholder);
      } catch (error) {
        handleServiceError(res, error, "Failed to add stakeholder");
      }
    },
  );

  app.delete(
    "/api/proposals/:proposalId/stakeholders/:stakeholderId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.removeStakeholder(
          req.params.proposalId,
          req.params.stakeholderId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to remove stakeholder");
      }
    },
  );

  app.get(
    "/api/proposals/:proposalId/team",
    isAuthenticated,
    requirePermission("proposals.read"),
    async (req, res) => {
      try {
        const members = await proposalsService.getTeamMembers(
          req.params.proposalId,
        );
        res.json(members);
      } catch (error) {
        handleServiceError(res, error, "Failed to fetch team members");
      }
    },
  );

  app.post(
    "/api/proposals/:proposalId/team",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const member = await proposalsService.addTeamMember(
          req.params.proposalId,
          req.body,
          actorId,
        );
        res.status(201).json(member);
      } catch (error) {
        handleServiceError(res, error, "Failed to add team member");
      }
    },
  );

  app.patch(
    "/api/proposals/:proposalId/team/:memberId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        const member = await proposalsService.updateTeamMember(
          req.params.proposalId,
          req.params.memberId,
          req.body,
          actorId,
        );
        res.json(member);
      } catch (error) {
        handleServiceError(res, error, "Failed to update team member");
      }
    },
  );

  app.delete(
    "/api/proposals/:proposalId/team/:memberId",
    isAuthenticated,
    requirePermission("proposals.write"),
    async (req: any, res) => {
      try {
        const actorId = req.user?.claims?.sub;
        await proposalsService.removeTeamMember(
          req.params.proposalId,
          req.params.memberId,
          actorId,
        );
        res.json({ success: true });
      } catch (error) {
        handleServiceError(res, error, "Failed to remove team member");
      }
    },
  );
}
