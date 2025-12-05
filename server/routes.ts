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
  publicVendorUpdateSchema,
  featureStatuses,
  type FeatureStatus,
  themeConfigSchema,
  insertAppIssueSchema,
  updateAppIssueSchema,
  issueStatuses,
  type IssueStatus,
  insertFormTemplateSchema,
  updateFormTemplateSchema,
  insertFormRequestSchema,
  updateFormRequestSchema,
  insertFormResponseSchema,
  type RecipientType,
} from "@shared/schema";
import { sendInvitationEmail, sendVendorUpdateEmail, sendFormRequestEmail } from "./email";
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
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`
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

  // Google Places Text Search API (New Places API v1)
  app.post("/api/places/text-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // Request comprehensive field mask for full PlaceDetails display
      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.location",
        "places.types",
        "places.businessStatus",
        "places.priceLevel",
        "places.rating",
        "places.userRatingCount",
        "places.regularOpeningHours",
        "places.currentOpeningHours",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.editorialSummary",
        "places.reviews",
        "places.photos",
        "places.paymentOptions",
        "places.parkingOptions",
        "places.accessibilityOptions",
        "places.dineIn",
        "places.takeout",
        "places.delivery",
        "places.curbsidePickup",
        "places.reservable",
        "places.servesBreakfast",
        "places.servesLunch",
        "places.servesDinner",
        "places.servesBeer",
        "places.servesWine",
        "places.servesBrunch",
        "places.servesVegetarianFood",
        "places.outdoorSeating",
        "places.liveMusic",
        "places.menuForChildren",
        "places.servesCocktails",
        "places.servesDessert",
        "places.servesCoffee",
        "places.goodForChildren",
        "places.allowsDogs",
        "places.restroom",
        "places.goodForGroups",
        "places.goodForWatchingSports",
        "places.utcOffsetMinutes",
        "places.adrFormatAddress",
        "places.iconMaskBaseUri",
        "places.iconBackgroundColor",
        "places.shortFormattedAddress",
      ].join(",");

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: "en",
            pageSize: 10,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();
      
      // Transform the response to a simpler format
      const places = (data.places || []).map((place: any) => {
        // Parse address components
        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let stateCode = "";
        let zipCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("street_number")) {
              streetNumber = component.longText || "";
            } else if (types.includes("route")) {
              route = component.longText || "";
            } else if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("postal_code")) {
              zipCode = component.longText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        const streetAddress1 = [streetNumber, route].filter(Boolean).join(" ");

        return {
          placeId: place.id || "",
          name: place.displayName?.text || "",
          formattedAddress: place.formattedAddress || "",
          streetAddress1,
          city,
          state,
          stateCode,
          zipCode,
          country,
          countryCode,
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
          website: place.websiteUri || "",
          googleMapsUrl: place.googleMapsUri || "",
          location: place.location || null,
          // Include raw Google Places API response for debugging/display
          rawPlaceDetails: place,
        };
      });

      res.json({ places });
    } catch (error) {
      console.error("Error in text search:", error);
      res.status(500).json({ message: "Failed to search places" });
    }
  });

  // Google Places Photos API - Fetch photos for a place
  app.get("/api/places/:placeId/photos", isAuthenticated, async (req, res) => {
    try {
      const { placeId } = req.params;
      if (!placeId) {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // Use Places API v1 to get place details with photos
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "photos",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch place photos");
      }

      const data = await response.json();
      
      // Transform photos to include the photo reference for proxying
      const photos = (data.photos || []).map((photo: any, index: number) => ({
        name: photo.name, // e.g., "places/ChIJ.../photos/..."
        widthPx: photo.widthPx,
        heightPx: photo.heightPx,
        authorAttributions: photo.authorAttributions || [],
        // Create a proxy URL for the photo
        photoUrl: `/api/places/photos/${encodeURIComponent(photo.name)}`,
      }));

      res.json({ photos });
    } catch (error) {
      console.error("Error fetching place photos:", error);
      res.status(500).json({ message: "Failed to fetch place photos" });
    }
  });

  // Google Places Photo Proxy - Fetch the actual photo binary (public endpoint since Google photos are public)
  app.get("/api/places/photos/:photoName(*)", async (req, res) => {
    try {
      const { photoName } = req.params;
      if (!photoName) {
        return res.status(400).json({ message: "Photo name is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // Get optional size parameters
      const maxWidthPx = parseInt(req.query.maxWidthPx as string) || 800;
      const maxHeightPx = parseInt(req.query.maxHeightPx as string) || 600;

      // Use Places API v1 to get the photo media
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&maxHeightPx=${maxHeightPx}&key=${apiKey}`;
      
      const response = await fetch(photoUrl, {
        redirect: 'follow',
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places Photo API error:", errorData);
        throw new Error("Failed to fetch photo");
      }

      // Get the content type and pass it through
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=604800"); // Cache for 7 days

      // Stream the image response
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error proxying photo:", error);
      res.status(500).json({ message: "Failed to fetch photo" });
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

  // Generate vendor update link (admin only)
  app.post("/api/vendors/:id/generate-update-link", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const vendorId = req.params.id;
      const userId = req.user.id;
      const vendor = await storage.getVendorById(vendorId);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      const expiresInHours = req.body.expiresInHours || 720; // Default 30 days
      const { token, expiresAt } = await storage.createVendorUpdateToken(vendorId, userId, expiresInHours);
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const url = `${protocol}://${host}/vendor-update/${token}`;
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: vendorId,
        status: "success",
        metadata: { vendorName: vendor.businessName, expiresAt: expiresAt.toISOString() },
      });
      
      res.json({ url, token, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error("Error generating vendor update link:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to generate update link" });
    }
  });
  
  // Batch generate vendor update links and send emails (admin only)
  app.post("/api/vendors/batch-update-links", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { vendorIds, sendEmail = true, expiresInHours = 720 } = req.body;
      const userId = req.user.id;
      
      if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
        return res.status(400).json({ message: "vendorIds must be a non-empty array" });
      }
      
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      
      const results = [];
      
      for (const vendorId of vendorIds) {
        try {
          const vendor = await storage.getVendorById(vendorId);
          
          if (!vendor) {
            results.push({ vendorId, success: false, error: "Vendor not found" });
            continue;
          }
          
          if (!vendor.email) {
            results.push({ vendorId, success: false, error: "Vendor has no email address" });
            continue;
          }
          
          // Generate token
          const { token, expiresAt } = await storage.createVendorUpdateToken(vendorId, userId, expiresInHours);
          const updateUrl = `${protocol}://${host}/vendor-update/${token}`;
          
          // Send email if requested
          if (sendEmail) {
            try {
              const emailResult = await sendVendorUpdateEmail(vendor.email, vendor.businessName, updateUrl);
              
              if (emailResult.success) {
                await logAuditEvent(req, {
                  action: "email_sent",
                  entityType: "vendor_update_token",
                  entityId: vendorId,
                  status: "success",
                  metadata: { 
                    vendorName: vendor.businessName, 
                    email: vendor.email,
                    expiresAt: expiresAt.toISOString(),
                    batch: true,
                  },
                });
                results.push({ vendorId, success: true, updateUrl });
              } else {
                await logAuditEvent(req, {
                  action: "email_sent",
                  entityType: "vendor_update_token",
                  entityId: vendorId,
                  status: "failure",
                  metadata: { 
                    vendorName: vendor.businessName, 
                    email: vendor.email,
                    error: emailResult.error,
                    batch: true,
                  },
                });
                results.push({ vendorId, success: false, error: emailResult.error, updateUrl });
              }
            } catch (emailError) {
              results.push({ vendorId, success: false, error: String(emailError), updateUrl });
            }
          } else {
            results.push({ vendorId, success: true, updateUrl });
          }
        } catch (vendorError) {
          results.push({ vendorId, success: false, error: String(vendorError) });
        }
      }
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_update_token",
        entityId: "batch",
        status: "success",
        metadata: { 
          totalVendors: vendorIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
      
      res.json({ results });
    } catch (error) {
      console.error("Error in batch update links:", error);
      res.status(500).json({ message: "Failed to process batch update links" });
    }
  });

  // Get all vendor update tokens (admin only)
  app.get("/api/vendor-update-tokens", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tokens = await storage.getAllVendorUpdateTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching vendor update tokens:", error);
      res.status(500).json({ message: "Failed to fetch vendor update tokens" });
    }
  });

  // ===== PUBLIC VENDOR UPDATE ROUTES (no auth required) =====
  
  // Get vendor data for update form (public - token validates access)
  app.get("/api/vendor-update/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const vendor = await storage.getVendorByToken(token);
      
      if (!vendor) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }
      
      // Return vendor data without internal fields
      const { isPreferred, notes, ...publicVendorData } = vendor;
      
      res.json(publicVendorData);
    } catch (error) {
      console.error("Error fetching vendor by token:", error);
      res.status(500).json({ message: "Failed to load vendor data" });
    }
  });
  
  // Submit vendor updates (public - token validates access)
  app.post("/api/vendor-update/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const vendor = await storage.getVendorByToken(token);
      
      if (!vendor) {
        return res.status(404).json({ message: "Invalid or expired link" });
      }
      
      // Validate the update data
      const result = publicVendorUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.errors 
        });
      }
      
      const { serviceIds, ...vendorData } = result.data;
      
      // Normalize URLs if present
      if (vendorData.website) {
        try {
          const url = new URL(vendorData.website.startsWith('http') ? vendorData.website : `https://${vendorData.website}`);
          vendorData.website = url.toString();
        } catch {
          // Keep as-is if URL parsing fails
        }
      }
      if (vendorData.capabilitiesDeck) {
        try {
          const url = new URL(vendorData.capabilitiesDeck.startsWith('http') ? vendorData.capabilitiesDeck : `https://${vendorData.capabilitiesDeck}`);
          vendorData.capabilitiesDeck = url.toString();
        } catch {
          // Keep as-is if URL parsing fails
        }
      }
      
      // Update the vendor (preserving internal fields)
      const updatedVendor = await storage.updateVendor(vendor.id, vendorData, serviceIds);
      
      // Mark token as used
      await storage.markTokenAsUsed(token);
      
      res.json({ 
        success: true, 
        message: "Your information has been updated successfully" 
      });
    } catch (error) {
      console.error("Error updating vendor via token:", error);
      res.status(500).json({ message: "Failed to update vendor information" });
    }
  });

  // ===== VENUES ROUTES =====

  // Get all venues with relationships
  app.get("/api/venues", isAuthenticated, async (req, res) => {
    try {
      const venues = await storage.getVenuesWithRelations();
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  // Get single venue
  app.get("/api/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const venue = await storage.getVenueById(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  // Get single venue with all relationships (amenities and tags)
  app.get("/api/venues/:id/full", isAuthenticated, async (req, res) => {
    try {
      const venue = await storage.getVenueByIdWithRelations(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue with relations:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  // Create new venue (admin only)
  app.post("/api/venues", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { amenityIds, cuisineTagIds, styleTagIds, ...venueData } = req.body;
      const venue = await storage.createVenue(venueData);
      
      if (amenityIds && amenityIds.length > 0) {
        await storage.setVenueAmenities(venue.id, amenityIds);
      }
      
      const allTagIds = [...(cuisineTagIds || []), ...(styleTagIds || [])];
      if (allTagIds.length > 0) {
        await storage.setVenueTags(venue.id, allTagIds);
      }
      
      const fullVenue = await storage.getVenueByIdWithRelations(venue.id);
      res.status(201).json(fullVenue);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  // Update venue (admin only)
  app.patch("/api/venues/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { amenityIds, cuisineTagIds, styleTagIds, ...venueData } = req.body;
      const venue = await storage.updateVenue(req.params.id, venueData);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      if (amenityIds !== undefined) {
        await storage.setVenueAmenities(venue.id, amenityIds || []);
      }
      
      if (cuisineTagIds !== undefined || styleTagIds !== undefined) {
        const allTagIds = [...(cuisineTagIds || []), ...(styleTagIds || [])];
        await storage.setVenueTags(venue.id, allTagIds);
      }
      
      const fullVenue = await storage.getVenueByIdWithRelations(venue.id);
      res.json(fullVenue);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  // Delete venue (admin only)
  app.delete("/api/venues/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteVenue(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ message: "Failed to delete venue" });
    }
  });

  // Get venue amenities
  app.get("/api/venues/:id/amenities", isAuthenticated, async (req, res) => {
    try {
      const amenities = await storage.getVenueAmenities(req.params.id);
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching venue amenities:", error);
      res.status(500).json({ message: "Failed to fetch venue amenities" });
    }
  });

  // Get venue tags
  app.get("/api/venues/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getVenueTags(req.params.id);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching venue tags:", error);
      res.status(500).json({ message: "Failed to fetch venue tags" });
    }
  });

  // Get tags by category
  app.get("/api/tags/category/:category", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getTagsByCategory(req.params.category);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags by category:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // ===== AMENITIES ROUTES =====

  // Get all amenities
  app.get("/api/amenities", isAuthenticated, async (req, res) => {
    try {
      const amenities = await storage.getAmenities();
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching amenities:", error);
      res.status(500).json({ message: "Failed to fetch amenities" });
    }
  });

  // Get single amenity
  app.get("/api/amenities/:id", isAuthenticated, async (req, res) => {
    try {
      const amenity = await storage.getAmenityById(req.params.id);
      if (!amenity) {
        return res.status(404).json({ message: "Amenity not found" });
      }
      res.json(amenity);
    } catch (error) {
      console.error("Error fetching amenity:", error);
      res.status(500).json({ message: "Failed to fetch amenity" });
    }
  });

  // Create new amenity (admin only)
  app.post("/api/amenities", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const amenity = await storage.createAmenity(req.body);
      res.status(201).json(amenity);
    } catch (error) {
      console.error("Error creating amenity:", error);
      res.status(500).json({ message: "Failed to create amenity" });
    }
  });

  // Update amenity (admin only)
  app.patch("/api/amenities/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const amenity = await storage.updateAmenity(req.params.id, req.body);
      if (!amenity) {
        return res.status(404).json({ message: "Amenity not found" });
      }
      res.json(amenity);
    } catch (error) {
      console.error("Error updating amenity:", error);
      res.status(500).json({ message: "Failed to update amenity" });
    }
  });

  // Delete amenity (admin only)
  app.delete("/api/amenities/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteAmenity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting amenity:", error);
      res.status(500).json({ message: "Failed to delete amenity" });
    }
  });

  // ===== TAG ROUTES =====
  
  // Get all tags
  app.get("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Get single tag
  app.get("/api/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const tag = await storage.getTagById(req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      console.error("Error fetching tag:", error);
      res.status(500).json({ message: "Failed to fetch tag" });
    }
  });

  // Create new tag (admin only)
  app.post("/api/tags", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tag = await storage.createTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // Update tag (admin only)
  app.patch("/api/tags/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tag = await storage.updateTag(req.params.id, req.body);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      console.error("Error updating tag:", error);
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  // Delete tag (admin only)
  app.delete("/api/tags/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tag:", error);
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // ===== APP ISSUES / BUG REPORTING ROUTES =====
  
  // Get all issues
  app.get("/api/app-issues", isAuthenticated, async (req: any, res) => {
    try {
      const statusFilter = req.query.status
        ? (req.query.status as string).split(",") as IssueStatus[]
        : undefined;
      const severity = req.query.severity as string | undefined;

      const issues = await storage.getIssues({
        status: statusFilter,
        severity,
      });
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  // Get single issue
  app.get("/api/app-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const issue = await storage.getIssueById(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  // Create new issue
  app.post("/api/app-issues", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertAppIssueSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const userId = req.user.claims.sub;
      const issue = await storage.createIssue(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "app_issue",
        entityId: issue.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "app_issue",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  // Update issue
  app.patch("/api/app-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const issue = await storage.getIssueById(req.params.id);

      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Non-admin users can only edit their own issues and only title/description/severity
      const isOwner = issue.createdById === userId;
      const isAdminUser = user?.role === "admin";

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized to edit this issue" });
      }

      const result = updateAppIssueSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      // Non-admin can only update title, description, severity
      let updateData = result.data;
      if (!isAdminUser) {
        updateData = {
          title: result.data.title,
          description: result.data.description,
          severity: result.data.severity,
        };
      }

      const updated = await storage.updateIssue(req.params.id, updateData);

      const changes = getChangedFields(
        issue as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "app_issue",
        entityId: req.params.id,
        changes,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating issue:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "app_issue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Delete issue (admin only)
  app.delete("/api/app-issues/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const issue = await storage.getIssueById(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      await storage.deleteIssue(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "app_issue",
        entityId: req.params.id,
        changes: { before: { title: issue.title } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting issue:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "app_issue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete issue" });
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

  // ==========================================
  // FORM OUTREACH / RFI ROUTES
  // ==========================================

  // Form Template Routes
  app.get("/api/form-templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getFormTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ message: "Failed to fetch form templates" });
    }
  });

  app.get("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching form template:", error);
      res.status(500).json({ message: "Failed to fetch form template" });
    }
  });

  app.post("/api/form-templates", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertFormTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const userId = req.user.claims.sub;
      const template = await storage.createFormTemplate(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "form_template",
        entityId: template.id,
        status: "success",
        metadata: { name: template.name },
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "form_template",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create form template" });
    }
  });

  app.patch("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateFormTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const template = await storage.updateFormTemplate(req.params.id, result.data);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "form_template",
        entityId: req.params.id,
        status: "success",
      });

      res.json(template);
    } catch (error) {
      console.error("Error updating form template:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "form_template",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update form template" });
    }
  });

  app.delete("/api/form-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      await storage.deleteFormTemplate(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_template",
        entityId: req.params.id,
        status: "success",
        metadata: { name: template.name },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_template",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // Form Request Routes
  app.get("/api/form-requests", isAuthenticated, async (req: any, res) => {
    try {
      const requests = await storage.getFormRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching form requests:", error);
      res.status(500).json({ message: "Failed to fetch form requests" });
    }
  });

  app.get("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching form request:", error);
      res.status(500).json({ message: "Failed to fetch form request" });
    }
  });

  app.post("/api/form-requests", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertFormRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const userId = req.user.claims.sub;
      const request = await storage.createFormRequest(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "form_request",
        entityId: request.id,
        status: "success",
        metadata: { title: request.title },
      });

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating form request:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "form_request",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create form request" });
    }
  });

  app.patch("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateFormRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      // Check if request exists and if it's editable (only drafts can be edited)
      const existingRequest = await storage.getFormRequestById(req.params.id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Form request not found" });
      }
      
      // Only allow formSchema changes on draft requests
      if (existingRequest.status !== "draft" && result.data.formSchema !== undefined) {
        return res.status(400).json({ message: "Cannot modify form schema of non-draft requests" });
      }

      const request = await storage.updateFormRequest(req.params.id, result.data);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
      });

      res.json(request);
    } catch (error) {
      console.error("Error updating form request:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update form request" });
    }
  });

  app.delete("/api/form-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      await storage.deleteFormRequest(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
        metadata: { title: request.title },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form request:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete form request" });
    }
  });

  // Add recipients to a form request
  app.post("/api/form-requests/:id/recipients", isAuthenticated, async (req: any, res) => {
    try {
      const { recipients } = req.body as {
        recipients: Array<{ type: RecipientType; id: string }>;
      };

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients array is required" });
      }

      const request = await storage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      // Create outreach tokens for recipients
      const tokens = await storage.createOutreachTokens(req.params.id, recipients);

      await logAuditEvent(req, {
        action: "create",
        entityType: "outreach_token",
        entityId: req.params.id,
        status: "success",
        metadata: { recipientCount: recipients.length },
      });

      res.status(201).json({ count: tokens.length, tokens });
    } catch (error) {
      console.error("Error adding recipients:", error);
      res.status(500).json({ message: "Failed to add recipients" });
    }
  });

  // Send form request to all pending recipients
  app.post("/api/form-requests/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      if (!request.tokens || request.tokens.length === 0) {
        return res.status(400).json({ message: "No recipients to send to" });
      }

      const pendingTokens = request.tokens.filter((t) => t.status === "pending" && !t.sentAt);
      if (pendingTokens.length === 0) {
        return res.status(400).json({ message: "No pending recipients to send to" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      let sentCount = 0;
      const errors: string[] = [];

      for (const tokenRecord of pendingTokens) {
        let recipientEmail: string | null = null;
        let recipientName: string = "";

        if (tokenRecord.recipientType === "vendor" && tokenRecord.vendor) {
          recipientEmail = tokenRecord.vendor.email;
          recipientName = tokenRecord.vendor.businessName;
        } else if (tokenRecord.recipientType === "contact" && tokenRecord.contact) {
          recipientEmail = tokenRecord.contact.emailAddresses?.[0] || null;
          recipientName = `${tokenRecord.contact.firstName} ${tokenRecord.contact.lastName}`;
        }

        if (!recipientEmail) {
          errors.push(`No email for ${recipientName || tokenRecord.recipientId}`);
          continue;
        }

        try {
          const formUrl = `${baseUrl}/form/${tokenRecord.token}`;
          await sendFormRequestEmail(
            recipientEmail,
            recipientName,
            request.title,
            request.description || "",
            formUrl,
            request.dueDate
          );

          // Mark token as sent
          await storage.markOutreachTokenSent(tokenRecord.token);
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${recipientEmail}:`, emailError);
          errors.push(`Failed to send to ${recipientEmail}`);
        }
      }

      // Update request status to sent
      await storage.updateFormRequest(req.params.id, { status: "sent" } as never);

      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "form_request",
        entityId: req.params.id,
        status: "success",
        metadata: { sentCount, errors },
      });

      res.json({ sentCount, errors });
    } catch (error) {
      console.error("Error sending form request:", error);
      await logAuditEvent(req, {
        action: "email_sent",
        entityType: "form_request",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to send form request" });
    }
  });

  // Preview form request - returns form data with dummy recipient for preview
  app.get("/api/form-requests/:id/preview", isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getFormRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Form request not found" });
      }

      // Return preview data with dummy recipient info
      res.json({
        request: {
          title: request.title,
          description: request.description,
          formSchema: request.formSchema,
          dueDate: request.dueDate,
        },
        recipient: {
          name: "Preview Recipient",
          type: "vendor",
          email: "preview@example.com",
        },
        isPreview: true,
        existingResponse: null,
      });
    } catch (error) {
      console.error("Error fetching form preview:", error);
      res.status(500).json({ message: "Failed to fetch form preview" });
    }
  });

  // Public Form Routes (no authentication required)
  // GET /api/form/:token - get form for submission
  app.get("/api/form/:token", async (req, res) => {
    try {
      const formData = await storage.getPublicFormData(req.params.token);
      if (!formData) {
        return res.status(404).json({ message: "Form not found or expired" });
      }
      res.json(formData);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  // POST /api/form/:token - submit form response
  app.post("/api/form/:token", async (req, res) => {
    try {
      const tokenRecord = await storage.getOutreachTokenByToken(req.params.token);
      if (!tokenRecord) {
        return res.status(404).json({ message: "Form not found or expired" });
      }

      // Check if token is expired
      if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
        return res.status(410).json({ message: "This form link has expired" });
      }

      const result = insertFormResponseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      // Create or update response
      const response = await storage.createOrUpdateFormResponse(tokenRecord.id, result.data);

      // Mark token as responded
      await storage.markOutreachTokenResponded(req.params.token);

      res.json({ message: "Response submitted successfully", response });
    } catch (error) {
      console.error("Error submitting form response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  return httpServer;
}
