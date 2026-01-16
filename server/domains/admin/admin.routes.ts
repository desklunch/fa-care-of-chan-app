/**
 * Admin Domain Routes
 * 
 * Routes for admin functionality:
 * - Team management: GET /api/team, /api/users, /api/team/:id, PATCH /api/team/:id/role, PATCH /api/team/:id
 * - Invites: GET/POST/DELETE /api/invites, validate token, send email
 * - Admin: GET /api/admin/stats, /api/admin/recent-employees, /api/admin/logs
 * - Activity tracking: /api/activity/* (session, pageview, event)
 * - Admin analytics: GET /api/admin/activity, /api/admin/activity/pageviews/recent
 * 
 * Total: 21 routes
 */

import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { adminStorage } from "./admin.storage";
import { storage } from "../../storage";
import { updateProfileSchema, insertInviteSchema } from "@shared/schema";
import { sendInvitationEmail } from "../../email";

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
      
      if (!role || !["admin", "manager", "employee", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin', 'manager', 'employee', or 'viewer'" });
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

      const userBefore = await storage.getUser(id);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const { role, isActive } = req.body;
      
      let updatedUser = await storage.updateUser(id, result.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (role && ["admin", "manager", "employee", "viewer"].includes(role)) {
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

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // ==================== Invite Routes ====================

  app.get("/api/invites", isAuthenticated, requirePermission("invites.read"), async (req, res) => {
    try {
      const allInvites = await adminStorage.getAllInvites();
      res.json(allInvites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.get("/api/invites/pending", isAuthenticated, requirePermission("invites.read"), async (req, res) => {
    try {
      const pendingInvites = await adminStorage.getPendingInvites();
      res.json(pendingInvites);
    } catch (error) {
      console.error("Error fetching pending invites:", error);
      res.status(500).json({ message: "Failed to fetch pending invites" });
    }
  });

  app.get("/api/invites/validate/:token", async (req, res) => {
    try {
      const invite = await adminStorage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.usedAt) {
        return res.status(400).json({ message: "Invite already used" });
      }
      
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invite expired" });
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ message: "Failed to validate invite" });
    }
  });

  app.post("/api/invites", isAuthenticated, requirePermission("invites.manage"), async (req: any, res) => {
    try {
      const result = insertInviteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.flatten() 
        });
      }

      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this email already exists" 
        });
      }

      const pendingInvites = await adminStorage.getPendingInvites();
      const existingInvite = pendingInvites.find(
        inv => inv.email.toLowerCase() === result.data.email.toLowerCase()
      );
      if (existingInvite) {
        return res.status(400).json({ 
          message: "An active invitation already exists for this email" 
        });
      }

      const userId = req.user.claims.sub;
      const invite = await adminStorage.createInvite(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "invite",
        entityId: invite.id,
        changes: {
          after: {
            email: invite.email,
            firstName: invite.firstName,
            lastName: invite.lastName,
          },
        },
      });

      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "invite",
        status: "failure",
        metadata: { error: String(error), email: req.body?.email },
      });
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, requirePermission("invites.manage"), async (req: any, res) => {
    try {
      const invite = await adminStorage.getInviteById(req.params.id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await adminStorage.deleteInvite(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "invite",
        entityId: req.params.id,
        changes: {
          before: {
            email: invite.email,
            firstName: invite.firstName,
            lastName: invite.lastName,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "invite",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.post("/api/invites/:id/send-email", isAuthenticated, requirePermission("invites.manage"), async (req: any, res) => {
    try {
      const invite = await adminStorage.getInviteById(req.params.id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.usedAt) {
        return res.status(400).json({ message: "Cannot send email for an already used invite" });
      }
      
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Cannot send email for an expired invite" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const inviteLink = `${protocol}://${host}/invite?token=${invite.token}`;

      await sendInvitationEmail({
        recipientEmail: invite.email,
        recipientName: `${invite.firstName} ${invite.lastName}`.trim() || 'Team Member',
        inviteLink,
        organizationName: 'Team Directory',
      });

      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "invite",
        entityId: invite.id,
        metadata: { 
          recipientEmail: invite.email,
          recipientName: `${invite.firstName} ${invite.lastName}`.trim(),
        },
      });

      res.json({ message: "Invitation email sent successfully" });
    } catch (error) {
      console.error("Error sending invitation email:", error);
      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "invite",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to send invitation email" });
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

  app.get("/api/admin/logs", isAuthenticated, requirePermission("audit.read"), async (req, res) => {
    try {
      const logs = await adminStorage.getRecentAuditLogs(250);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
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
