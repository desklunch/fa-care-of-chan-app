import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { 
  insertInviteSchema, 
  updateProfileSchema,
  insertFeatureCategorySchema,
  updateFeatureCategorySchema,
  insertAppFeatureSchema,
  updateAppFeatureSchema,
  insertFeatureCommentSchema,
  insertVendorServiceSchema,
  updateVendorServiceSchema,
  insertContactSchema,
  updateContactSchema,
  insertVendorSchema,
  updateVendorSchema,
  featureStatuses,
  type FeatureStatus,
  themeConfigSchema,
} from "@shared/schema";
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

  // ====== PRODUCT PLANNING ROUTES ======

  // Feature Categories (admin only for create/update)
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const categories = await storage.getCategories(includeInactive);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = insertFeatureCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const category = await storage.createCategory(result.data);

      await logAuditEvent(req, {
        action: "create",
        entityType: "feature_category",
        entityId: category.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "feature_category",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = updateFeatureCategorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const before = await storage.getCategoryById(req.params.id);
      if (!before) {
        return res.status(404).json({ message: "Category not found" });
      }

      const category = await storage.updateCategory(req.params.id, result.data);

      const changes = getChangedFields(
        before as unknown as Record<string, unknown>,
        category as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature_category",
        entityId: req.params.id,
        changes,
      });

      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature_category",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Update category order (for drag-and-drop reordering)
  app.put("/api/admin/categories/order", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }

      await storage.updateCategoryOrder(orderedIds);

      await logAuditEvent(req, {
        action: "update",
        entityType: "feature_category",
        entityId: "order",
        metadata: { orderedIds },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating category order:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature_category",
        entityId: "order",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update category order" });
    }
  });

  // Product Features
  app.get("/api/features", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statusFilter = req.query.status
        ? (req.query.status as string).split(",") as FeatureStatus[]
        : undefined;
      const categoryId = req.query.categoryId as string | undefined;

      const features = await storage.getFeatures({
        status: statusFilter,
        categoryId,
        userId,
      });
      res.json(features);
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.get("/api/features/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feature = await storage.getFeatureById(req.params.id, userId);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      res.json(feature);
    } catch (error) {
      console.error("Error fetching feature:", error);
      res.status(500).json({ message: "Failed to fetch feature" });
    }
  });

  app.post("/api/features", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertAppFeatureSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      // Verify category exists
      const category = await storage.getCategoryById(result.data.categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const userId = req.user.claims.sub;
      const feature = await storage.createFeature(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "feature",
        entityId: feature.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      res.status(201).json(feature);
    } catch (error) {
      console.error("Error creating feature:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "feature",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  // Feature Reordering (for roadmap drag and drop) - MUST be before /:id route
  app.patch("/api/features/reorder", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      // Validate each update has required fields and status values
      const validStatuses: FeatureStatus[] = ["proposed", "under_review", "planned", "in_progress", "completed", "archived"];
      for (const update of updates) {
        if (!update.id || typeof update.sortOrder !== 'number') {
          return res.status(400).json({ message: "Each update must have id and sortOrder" });
        }
        if (update.status !== undefined && !validStatuses.includes(update.status)) {
          return res.status(400).json({ message: `Invalid status: ${update.status}` });
        }
      }
      
      await storage.reorderFeatures(updates);
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature",
        entityId: "batch",
        metadata: { reorderedCount: updates.length },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering features:", error);
      res.status(500).json({ message: "Failed to reorder features" });
    }
  });

  app.patch("/api/features/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const feature = await storage.getFeatureById(req.params.id);

      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      // Non-admin users can only edit their own features and only title/description
      const isOwner = feature.createdById === userId;
      const isAdminUser = user?.role === "admin";

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized to edit this feature" });
      }

      const result = updateAppFeatureSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      // Non-admin can only update title, description, categoryId
      let updateData = result.data;
      if (!isAdminUser) {
        updateData = {
          title: result.data.title,
          description: result.data.description,
          categoryId: result.data.categoryId,
        };
      }

      const updated = await storage.updateFeature(req.params.id, updateData);

      const changes = getChangedFields(
        feature as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature",
        entityId: req.params.id,
        changes,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating feature:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "feature",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update feature" });
    }
  });

  app.delete("/api/features/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const feature = await storage.getFeatureById(req.params.id);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      await storage.deleteFeature(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "feature",
        entityId: req.params.id,
        changes: { before: { title: feature.title } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feature:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "feature",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  // Feature Voting
  app.post("/api/features/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const featureId = req.params.id;

      const feature = await storage.getFeatureById(featureId);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      const result = await storage.toggleVote(featureId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling vote:", error);
      res.status(500).json({ message: "Failed to toggle vote" });
    }
  });

  // Feature Comments
  app.get("/api/features/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/features/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertFeatureCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const feature = await storage.getFeatureById(req.params.id);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      const userId = req.user.claims.sub;
      const comment = await storage.createComment(req.params.id, userId, result.data.body);

      await logAuditEvent(req, {
        action: "create",
        entityType: "feature_comment",
        entityId: comment.id,
        metadata: { featureId: req.params.id },
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "feature_comment",
        status: "failure",
        metadata: { error: String(error), featureId: req.params.id },
      });
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/features/:featureId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const comments = await storage.getComments(req.params.featureId);
      const comment = comments.find((c) => c.id === req.params.commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Only comment author or admin can delete
      if (comment.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }

      await storage.deleteComment(req.params.commentId);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "feature_comment",
        entityId: req.params.commentId,
        metadata: { featureId: req.params.featureId },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "feature_comment",
        entityId: req.params.commentId,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContactsWithVendors();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getContactById(req.params.id);
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

      const contact = await storage.createContact(result.data);

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

      const existingContact = await storage.getContactById(req.params.id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const contact = await storage.updateContact(req.params.id, result.data);

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
      const existingContact = await storage.getContactById(req.params.id);
      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await storage.deleteContact(req.params.id);

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

  // Vendors routes
  app.get("/api/vendors", isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getVendorsWithRelations();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req, res) => {
    try {
      const vendor = await storage.getVendorByIdWithRelations(req.params.id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  // Vendor services routes
  app.get("/api/vendor-services", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getVendorServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching vendor services:", error);
      res.status(500).json({ message: "Failed to fetch vendor services" });
    }
  });

  app.get("/api/vendor-services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.getVendorServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Vendor service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching vendor service:", error);
      res.status(500).json({ message: "Failed to fetch vendor service" });
    }
  });

  app.post("/api/vendor-services", isAdmin, async (req, res) => {
    try {
      const parsed = insertVendorServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const service = await storage.createVendorService(parsed.data);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating vendor service:", error);
      res.status(500).json({ message: "Failed to create vendor service" });
    }
  });

  app.patch("/api/vendor-services/:id", isAdmin, async (req, res) => {
    try {
      const parsed = updateVendorServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const service = await storage.updateVendorService(req.params.id, parsed.data);
      if (!service) {
        return res.status(404).json({ message: "Vendor service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating vendor service:", error);
      res.status(500).json({ message: "Failed to update vendor service" });
    }
  });

  app.delete("/api/vendor-services/:id", isAdmin, async (req, res) => {
    try {
      const service = await storage.getVendorServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Vendor service not found" });
      }
      await storage.deleteVendorService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor service:", error);
      res.status(500).json({ message: "Failed to delete vendor service" });
    }
  });

  // Google Places API routes
  app.get("/api/places/autocomplete", isAuthenticated, async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Input is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching places autocomplete:", error);
      res.status(500).json({ message: "Failed to fetch place suggestions" });
    }
  });

  app.get("/api/places/address-autocomplete", isAuthenticated, async (req, res) => {
    try {
      const { input } = req.query;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Input is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment|address&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching address autocomplete:", error);
      res.status(500).json({ message: "Failed to fetch address suggestions" });
    }
  });

  app.get("/api/places/address-details", isAuthenticated, async (req, res) => {
    try {
      const { place_id } = req.query;
      if (!place_id || typeof place_id !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=formatted_address,name,address_components&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      const result = data.result;
      
      res.json({
        formattedAddress: result?.formatted_address || "",
        name: result?.name || "",
        addressComponents: result?.address_components || [],
      });
    } catch (error) {
      console.error("Error fetching address details:", error);
      res.status(500).json({ message: "Failed to fetch address details" });
    }
  });

  app.get("/api/places/details", isAuthenticated, async (req, res) => {
    try {
      const { place_id } = req.query;
      if (!place_id || typeof place_id !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=address_components,formatted_address&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      
      // Parse address components
      const result = data.result;
      let city = "";
      let region = "";
      let regionCode = "";
      let country = "";
      let countryCode = "";

      if (result?.address_components) {
        for (const component of result.address_components) {
          if (component.types.includes("locality")) {
            city = component.long_name;
          } else if (component.types.includes("administrative_area_level_1")) {
            region = component.long_name;
            regionCode = component.short_name;
          } else if (component.types.includes("country")) {
            country = component.long_name;
            countryCode = component.short_name;
          }
        }
      }

      res.json({ city, region, regionCode, country, countryCode });
    } catch (error) {
      console.error("Error fetching place details:", error);
      res.status(500).json({ message: "Failed to fetch place details" });
    }
  });

  // Vendor CRUD routes
  app.post("/api/vendors", isAdmin, async (req: any, res) => {
    try {
      const parsed = insertVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const { serviceIds, ...vendorData } = parsed.data;
      const vendor = await storage.createVendor(vendorData, serviceIds);

      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor",
        entityId: vendor.id,
        status: "success",
        metadata: { businessName: vendor.businessName },
      });

      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAdmin, async (req: any, res) => {
    try {
      const existingVendor = await storage.getVendorById(req.params.id);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const parsed = updateVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const { serviceIds, ...vendorData } = parsed.data;
      const vendor = await storage.updateVendor(req.params.id, vendorData, serviceIds);

      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      const changes = getChangedFields(
        existingVendor as unknown as Record<string, unknown>,
        vendor as unknown as Record<string, unknown>
      );

      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor",
        entityId: req.params.id,
        changes,
        status: "success",
      });

      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAdmin, async (req: any, res) => {
    try {
      const existingVendor = await storage.getVendorById(req.params.id);
      if (!existingVendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      await storage.deleteVendor(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor",
        entityId: req.params.id,
        status: "success",
        metadata: { deletedVendor: existingVendor.businessName },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Theme settings routes
  // GET /api/settings/theme - get current theme (public for app theming)
  app.get("/api/settings/theme", async (req, res) => {
    try {
      const theme = await storage.getTheme();
      res.json(theme);
    } catch (error) {
      console.error("Error fetching theme:", error);
      res.status(500).json({ message: "Failed to fetch theme" });
    }
  });
  
  // PATCH /api/settings/theme - update theme (admin only)
  app.patch("/api/settings/theme", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = themeConfigSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid theme data", errors: result.error.errors });
      }
      
      const userId = req.user.claims.sub;
      const setting = await storage.setTheme(result.data, userId);
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "app_setting",
        entityId: "theme",
        status: "success",
        metadata: { key: "theme" },
      });
      
      res.json(setting.value);
    } catch (error) {
      console.error("Error updating theme:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "app_setting",
        entityId: "theme",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update theme" });
    }
  });

  return httpServer;
}
