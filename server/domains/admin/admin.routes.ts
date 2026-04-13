/**
 * Admin Domain Routes
 * 
 * Routes for admin functionality:
 * - Team management: GET /api/team, /api/users, /api/team/:id, PATCH /api/team/:id/role, PATCH /api/team/:id
 * - Admin: GET /api/admin/stats, /api/admin/recent-employees, /api/admin/logs
 * - Activity tracking: /api/activity/* (session, pageview, event)
 * - Admin analytics: GET /api/admin/activity, /api/admin/activity/pageviews/recent
 * 
 * Total: 15 routes
 */

import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { adminStorage } from "./admin.storage";
import { storage } from "../../storage";
import { updateProfileSchema, insertRoleSchema, updateRoleSchema } from "@shared/schema";
import { ALL_PERMISSIONS, type Permission } from "../../../shared/permissions";

const allPermissionsSet = new Set<string>(ALL_PERMISSIONS);

function isValidPermission(p: string): p is Permission {
  return allPermissionsSet.has(p);
}

export function registerAdminRoutes(app: Express): void {
  // ==================== Team Routes ====================
  
  app.get("/api/team", isAuthenticated, requirePermission("team.read"), async (req, res) => {
    try {
      const team = await adminStorage.getAllEmployees();
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get("/api/users", isAuthenticated, requirePermission("team.read"), async (req, res) => {
    try {
      const users = await adminStorage.getAllEmployees();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/team/:id", isAuthenticated, requirePermission("team.read"), async (req, res) => {
    try {
      const member = await storage.getUser(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching team member:", error);
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  app.patch("/api/team/:id/role", isAuthenticated, requirePermission("team.manage"), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const roleRecord = await adminStorage.getRoleByName(role);
      if (!roleRecord) {
        return res.status(400).json({ message: `Invalid role: '${role}'. Role not found in the system.` });
      }

      const userBefore = await storage.getUser(id);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(id, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: id,
        changes: { before: { role: userBefore.role }, after: { role } },
        metadata: { changedBy: req.user.claims.sub },
      });

      const { clearPermissionCache } = await import("../../middleware/permissions");
      if (id === req.user.claims.sub) {
        clearPermissionCache(req.session);
      }
      await adminStorage.invalidatePermissionCacheForUser(id);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/team/:id", isAuthenticated, requirePermission("team.manage"), async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.flatten() 
        });
      }

      const { role, isActive } = req.body;

      if (role) {
        const roleRecord = await adminStorage.getRoleByName(role);
        if (!roleRecord) {
          return res.status(400).json({ message: `Invalid role: '${role}'. Role not found in the system.` });
        }
      }

      const userBefore = await storage.getUser(id);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      let updatedUser = await storage.updateUser(id, result.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (role) {
        updatedUser = await storage.updateUser(id, { role });
      }
      
      if (typeof isActive === "boolean") {
        updatedUser = await storage.updateUser(id, { isActive });
      }

      const changes = getChangedFields(
        userBefore as unknown as Record<string, unknown>,
        updatedUser as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: id,
        changes,
        metadata: { changedBy: req.user.claims.sub },
      });

      if (role) {
        await adminStorage.invalidatePermissionCacheForUser(id);
      }
      const { clearPermissionCache } = await import("../../middleware/permissions");
      if (id === req.user.claims.sub) {
        clearPermissionCache(req.session);
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // ==================== Admin Stats Routes ====================

  app.get("/api/admin/stats", isAuthenticated, requirePermission("admin.settings"), async (req, res) => {
    try {
      const stats = await adminStorage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/recent-employees", isAuthenticated, requirePermission("admin.settings"), async (req, res) => {
    try {
      const employees = await adminStorage.getRecentEmployees(5);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching recent employees:", error);
      res.status(500).json({ message: "Failed to fetch recent employees" });
    }
  });

  app.get("/api/audit-logs/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = parseInt(req.query.limit as string);
      const limit = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 100) : 25;
      const logs = await adminStorage.getAuditLogsByUser(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ message: "Failed to fetch user audit logs" });
    }
  });

  app.get("/api/admin/logs", isAuthenticated, requirePermission("audit.read"), async (req, res) => {
    try {
      const logs = await adminStorage.getRecentAuditLogs(250);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==================== Role Management Routes ====================

  app.get("/api/roles", isAuthenticated, requirePermission("admin.settings"), async (req, res) => {
    try {
      const allRoles = await adminStorage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.get("/api/roles/names", isAuthenticated, requirePermission("team.manage"), async (req, res) => {
    try {
      const allRoles = await adminStorage.getAllRoles();
      res.json(allRoles.map(r => ({ id: r.id, name: r.name, description: r.description, permissions: r.permissions })));
    } catch (error) {
      console.error("Error fetching role names:", error);
      res.status(500).json({ message: "Failed to fetch role names" });
    }
  });

  app.get("/api/roles/:id", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid role ID" });
      
      const role = await adminStorage.getRoleById(id);
      if (!role) return res.status(404).json({ message: "Role not found" });
      
      const userCount = await adminStorage.getUserCountByRole(role.name);
      res.json({ ...role, userCount });
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  app.post("/api/roles", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const result = insertRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const invalidPermissions = result.data.permissions.filter(p => !isValidPermission(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({ message: `Unknown permissions: ${invalidPermissions.join(", ")}` });
      }
      
      const existing = await adminStorage.getRoleByName(result.data.name);
      if (existing) {
        return res.status(409).json({ message: "A role with this name already exists" });
      }

      const role = await adminStorage.createRole({
        ...result.data,
        permissions: result.data.permissions,
        isSystem: false,
      });

      await logAuditEvent(req, {
        action: "create",
        entityType: "role",
        entityId: String(role.id),
        metadata: { roleName: role.name },
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid role ID" });

      const existing = await adminStorage.getRoleById(id);
      if (!existing) return res.status(404).json({ message: "Role not found" });

      const result = updateRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const updateData: { name?: string; description?: string | null; permissions?: string[] } = { ...result.data };
      if (updateData.permissions) {
        const invalidPerms = updateData.permissions.filter(p => !isValidPermission(p));
        if (invalidPerms.length > 0) {
          return res.status(400).json({ message: `Unknown permissions: ${invalidPerms.join(", ")}` });
        }
      }

      if (existing.isSystem && updateData.name && updateData.name !== existing.name) {
        return res.status(403).json({ message: "System roles cannot be renamed" });
      }

      if (updateData.name && updateData.name !== existing.name) {
        const nameConflict = await adminStorage.getRoleByName(updateData.name);
        if (nameConflict) {
          return res.status(409).json({ message: "A role with this name already exists" });
        }
      }

      const isRename = updateData.name && updateData.name !== existing.name;
      const role = await adminStorage.updateRole(id, updateData);

      if (isRename) {
        await adminStorage.renameUsersRole(existing.name, updateData.name!);
      }

      await adminStorage.invalidatePermissionCacheForRole(existing.name);
      if (isRename) {
        await adminStorage.invalidatePermissionCacheForRole(updateData.name!);
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "role",
        entityId: String(id),
        changes: { before: { permissions: existing.permissions }, after: { permissions: role?.permissions } },
        metadata: { roleName: role?.name },
      });

      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid role ID" });

      const existing = await adminStorage.getRoleById(id);
      if (!existing) return res.status(404).json({ message: "Role not found" });

      if (existing.isSystem) {
        return res.status(403).json({ message: "System roles cannot be deleted" });
      }

      const userCount = await adminStorage.getUserCountByRole(existing.name);
      if (userCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete role "${existing.name}" — ${userCount} user(s) currently have this role. Reassign them first.`,
          userCount,
        });
      }

      await adminStorage.deleteRole(id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "role",
        entityId: String(id),
        metadata: { roleName: existing.name },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  app.get("/api/roles/:id/users/count", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid role ID" });

      const role = await adminStorage.getRoleById(id);
      if (!role) return res.status(404).json({ message: "Role not found" });

      const userCount = await adminStorage.getUserCountByRole(role.name);
      res.json({ count: userCount });
    } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ message: "Failed to fetch user count" });
    }
  });

  // ==================== Activity Tracking Routes ====================

  app.post("/api/activity/session", async (req: any, res) => {
    try {
      const { sessionToken, userAgent, deviceType, environment } = req.body;
      
      if (!sessionToken) {
        return res.status(400).json({ message: "Session token required" });
      }

      const existingSession = await adminStorage.getAnalyticsSessionByToken(sessionToken);
      if (existingSession) {
        await adminStorage.updateAnalyticsSessionActivity(existingSession.id);
        return res.json(existingSession);
      }

      const session = req.session as any;
      const userId = session?.userId || null;

      const analyticsSession = await adminStorage.createAnalyticsSession({
        sessionToken,
        userId,
        userAgent,
        deviceType,
        ipAddress: req.ip || req.connection?.remoteAddress,
        environment: environment || "development",
      });

      res.json(analyticsSession);
    } catch (error) {
      console.error("Error creating analytics session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.post("/api/activity/pageview", async (req: any, res) => {
    try {
      const { sessionId, path, title, referrer, environment } = req.body;
      
      if (!path) {
        return res.status(400).json({ message: "Path required" });
      }

      const session = req.session as any;
      const userId = session?.userId || null;

      const pageView = await adminStorage.createPageView({
        sessionId: sessionId || null,
        userId,
        path,
        title,
        referrer,
        environment: environment || "development",
      });

      res.json(pageView);
    } catch (error) {
      console.error("Error creating page view:", error);
      res.status(500).json({ message: "Failed to record page view" });
    }
  });

  app.put("/api/activity/pageview/:id/duration", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { durationMs } = req.body;
      
      if (typeof durationMs !== "number") {
        return res.status(400).json({ message: "Duration required" });
      }

      await adminStorage.updatePageViewDuration(id, durationMs);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating page view duration:", error);
      res.status(500).json({ message: "Failed to update duration" });
    }
  });

  app.post("/api/activity/event", async (req: any, res) => {
    try {
      const { sessionId, eventType, eventName, eventCategory, path, elementId, metadata, environment } = req.body;
      
      if (!eventType || !eventName) {
        return res.status(400).json({ message: "Event type and name required" });
      }

      const session = req.session as any;
      const userId = session?.userId || null;

      const event = await adminStorage.createAnalyticsEvent({
        sessionId: sessionId || null,
        userId,
        eventType,
        eventName,
        eventCategory,
        path,
        elementId,
        metadata,
        environment: environment || "development",
      });

      res.json(event);
    } catch (error) {
      console.error("Error creating analytics event:", error);
      res.status(500).json({ message: "Failed to record event" });
    }
  });

  app.post("/api/activity/session/:id/end", async (req: any, res) => {
    try {
      const { id } = req.params;
      await adminStorage.endAnalyticsSession(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending analytics session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // ==================== Admin Analytics Routes ====================

  app.get("/api/admin/activity", isAuthenticated, requirePermission("admin.analytics"), async (req: any, res) => {
    try {
      const { startDate, endDate, environment } = req.query;
      
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const envFilter = environment && environment !== "all" ? environment as string : undefined;
      const summary = await adminStorage.getAnalyticsSummary(start, end, envFilter);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/activity/pageviews/recent", isAuthenticated, requirePermission("admin.analytics"), async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const environment = req.query.environment as string | undefined;
      
      const envFilter = environment && environment !== "all" ? environment : undefined;
      const recentPageViews = await adminStorage.getRecentPageViews(Math.min(limit, 100), envFilter);
      res.json(recentPageViews);
    } catch (error) {
      console.error("Error fetching recent page views:", error);
      res.status(500).json({ message: "Failed to fetch recent page views" });
    }
  });
}
