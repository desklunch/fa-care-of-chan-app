import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertInviteSchema, updateProfileSchema } from "@shared/schema";
import { sendInvitationEmail } from "./email";
import { logAuditEvent, getChangedFields } from "./audit";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Team routes
  app.get("/api/team", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getAllEmployees();
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get("/api/team/:id", isAuthenticated, async (req, res) => {
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

  // Profile routes
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.flatten() 
        });
      }

      // Get user before update for change tracking
      const userBefore = await storage.getUser(userId);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, result.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the profile update
      const changes = getChangedFields(
        userBefore as unknown as Record<string, unknown>,
        updatedUser as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: userId,
        changes,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: req.user?.claims?.sub,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/recent-employees", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const employees = await storage.getRecentEmployees(5);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching recent employees:", error);
      res.status(500).json({ message: "Failed to fetch recent employees" });
    }
  });

  // Invite routes
  app.get("/api/invites", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allInvites = await storage.getAllInvites();
      res.json(allInvites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.get("/api/invites/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingInvites = await storage.getPendingInvites();
      res.json(pendingInvites);
    } catch (error) {
      console.error("Error fetching pending invites:", error);
      res.status(500).json({ message: "Failed to fetch pending invites" });
    }
  });

  // Validate invite token (public route)
  app.get("/api/invites/validate/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      
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

  app.post("/api/invites", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = insertInviteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.flatten() 
        });
      }

      // Check if email is already registered
      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "A user with this email already exists" 
        });
      }

      // Check if there's already a pending invite for this email
      const pendingInvites = await storage.getPendingInvites();
      const existingInvite = pendingInvites.find(
        inv => inv.email.toLowerCase() === result.data.email.toLowerCase()
      );
      if (existingInvite) {
        return res.status(400).json({ 
          message: "An active invitation already exists for this email" 
        });
      }

      const userId = req.user.claims.sub;
      const invite = await storage.createInvite(result.data, userId);

      // Log invite creation
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

  app.delete("/api/invites/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const invite = await storage.getInviteById(req.params.id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await storage.deleteInvite(req.params.id);

      // Log invite deletion
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

  // Send invitation email
  app.post("/api/invites/:id/send-email", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const invite = await storage.getInviteById(req.params.id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.usedAt) {
        return res.status(400).json({ message: "Cannot send email for an already used invite" });
      }
      
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Cannot send email for an expired invite" });
      }

      // Build the invite link
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const inviteLink = `${protocol}://${host}/invite?token=${invite.token}`;

      await sendInvitationEmail({
        recipientEmail: invite.email,
        recipientName: `${invite.firstName} ${invite.lastName}`.trim() || 'Team Member',
        inviteLink,
        organizationName: 'Team Directory',
      });

      // Log email sent
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

  // Admin audit logs endpoint
  app.get("/api/admin/logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
      
      const filters: {
        entityType?: string;
        action?: string;
        performedBy?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (req.query.entityType) {
        filters.entityType = req.query.entityType as string;
      }
      if (req.query.action) {
        filters.action = req.query.action as string;
      }
      if (req.query.performedBy) {
        filters.performedBy = req.query.performedBy as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const result = await storage.getAuditLogs(page, pageSize, filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  return httpServer;
}
