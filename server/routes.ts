import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isManagerOrAdmin } from "./googleAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import OpenAI from "openai";
import sharp from "sharp";
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
  insertVenueCollectionSchema,
  updateVenueCollectionSchema,
  addVenuesToCollectionSchema,
  insertCommentSchema,
  updateCommentSchema,
  commentEntityTypes,
  insertVenuePhotoSchema,
  updateVenuePhotoSchema,
  insertAppReleaseSchema,
  updateAppReleaseSchema,
  insertAppReleaseChangeSchema,
  releaseStatuses,
  type ReleaseStatus,
  insertVenueSchema,
  updateVenueSchema,
  dealStatuses,
  type DealStatus,
  insertClientSchema,
  updateClientSchema,
  insertBrandSchema,
  updateBrandSchema,
  insertIndustrySchema,
  updateIndustrySchema,
  insertTagSchema,
  updateTagSchema,
  insertDealServiceSchema,
} from "@shared/schema";
import { sendInvitationEmail, sendVendorUpdateEmail, sendFormRequestEmail } from "./email";
import { logAuditEvent, getChangedFields } from "./audit";
import { DealsService } from "./services/deals.service";
import { ServiceError } from "./services/base.service";
import aiRoutes from "./routes/ai.routes";
import mcpRoutes from "./mcp/transport";
import { requestContextMiddleware, updateRequestContext } from "./lib/request-context";
import { initializeAuditBridge } from "./lib/audit-bridge";

const dealsService = new DealsService(storage);

function handleServiceError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
      FORBIDDEN: 403,
      CONFLICT: 409,
    };
    const status = statusMap[error.code] || 500;
    res.status(status).json({ message: error.message, details: error.details });
    return;
  }
  console.error(fallbackMessage, error);
  res.status(500).json({ message: fallbackMessage });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Request context middleware - must come after auth so we have user info
  app.use(requestContextMiddleware);
  
  // Update context with user info after authentication
  app.use((req: any, res, next) => {
    if (req.user?.claims?.sub) {
      updateRequestContext({ userId: req.user.claims.sub });
    }
    next();
  });

  // Initialize audit bridge - domain events will be persisted to audit_logs
  initializeAuditBridge();

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

  // Team routes (also exposed as /api/users for compatibility)
  app.get("/api/team", isAuthenticated, async (req, res) => {
    try {
      const team = await storage.getAllEmployees();
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllEmployees();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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

  // Update user role (admin only)
  app.patch("/api/team/:id/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!role || !["admin", "manager", "employee"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin', 'manager', or 'employee'" });
      }

      const userBefore = await storage.getUser(id);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(id, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the role change
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: id,
        changes: { before: { role: userBefore.role }, after: { role } },
        metadata: { changedBy: req.user.claims.sub },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
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

      // Auto-manage completed_at based on status changes
      if (updateData.status !== undefined) {
        const wasCompleted = feature.status === "completed";
        const isNowCompleted = updateData.status === "completed";
        
        if (!wasCompleted && isNowCompleted) {
          // Status changed to completed - set completed_at
          (updateData as any).completedAt = new Date();
        } else if (wasCompleted && !isNowCompleted) {
          // Status changed from completed to something else - clear completed_at
          (updateData as any).completedAt = null;
        }
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

  // Client-linked contacts (contacts that belong to at least one client)
  app.get("/api/clients/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getClientLinkedContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client-linked contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });

  // Vendor-linked contacts (contacts that belong to at least one vendor)
  app.get("/api/vendors/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getVendorLinkedContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching vendor-linked contacts:", error);
      res.status(500).json({ message: "Failed to fetch vendor contacts" });
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

  app.post("/api/vendor-services", isAdmin, async (req: any, res) => {
    try {
      const parsed = insertVendorServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const service = await storage.createVendorService(parsed.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_service",
        entityId: service.id,
        status: "success",
        metadata: { name: service.name },
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating vendor service:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "vendor_service",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create vendor service" });
    }
  });

  app.patch("/api/vendor-services/:id", isAdmin, async (req: any, res) => {
    try {
      const parsed = updateVendorServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const original = await storage.getVendorServiceById(req.params.id);
      const service = await storage.updateVendorService(req.params.id, parsed.data);
      if (!service) {
        return res.status(404).json({ message: "Vendor service not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor_service",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, service),
      });
      
      res.json(service);
    } catch (error) {
      console.error("Error updating vendor service:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "vendor_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update vendor service" });
    }
  });

  app.delete("/api/vendor-services/:id", isAdmin, async (req: any, res) => {
    try {
      const service = await storage.getVendorServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Vendor service not found" });
      }
      await storage.deleteVendorService(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor_service",
        entityId: req.params.id,
        status: "success",
        metadata: { name: service.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor service:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "vendor_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
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
          editorialSummary: place.editorialSummary?.text || "",
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

  // Google Places City Search - Search for cities only
  app.post("/api/places/city-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // Request only the fields needed for city information
      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
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
            textQuery: `${query} city`,
            includedType: "locality",
            maxResultCount: 10,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const data = await response.json();

      // Transform the response to city format
      const cities = (data.places || []).map((place: any) => {
        let city = "";
        let state = "";
        let stateCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        // Use display name as city if locality not found
        if (!city && place.displayName?.text) {
          city = place.displayName.text;
        }

        // Format displayName: "City, StateCode" for US, "City, Country" for international
        let displayName = city;
        if (countryCode === "US" && stateCode) {
          displayName = `${city}, ${stateCode}`;
        } else if (country) {
          displayName = `${city}, ${country}`;
        }

        return {
          placeId: place.id || "",
          city,
          state,
          stateCode,
          country,
          countryCode,
          displayName,
          formattedAddress: place.formattedAddress || "",
        };
      }).filter((c: any) => c.city); // Only return results with a city name

      res.json({ cities });
    } catch (error) {
      console.error("Error in city search:", error);
      res.status(500).json({ message: "Failed to search cities" });
    }
  });

  // Google Places Location Search - Search for cities OR countries
  app.post("/api/places/location-search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      const fieldMask = [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.types",
      ].join(",");

      // Search for cities
      const cityResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: `${query} city`,
            includedType: "locality",
            maxResultCount: 5,
          }),
        }
      );

      // Search for countries
      const countryResponse = await fetch(
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
            includedType: "country",
            maxResultCount: 3,
          }),
        }
      );

      // Search for US states (administrative_area_level_1)
      const stateResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            textQuery: `${query} state USA`,
            includedType: "administrative_area_level_1",
            maxResultCount: 3,
          }),
        }
      );

      const cityData = cityResponse.ok ? await cityResponse.json() : { places: [] };
      const countryData = countryResponse.ok ? await countryResponse.json() : { places: [] };
      const stateData = stateResponse.ok ? await stateResponse.json() : { places: [] };

      const parseLocation = (place: any, locationType: "city" | "country" | "state") => {
        let city = "";
        let state = "";
        let stateCode = "";
        let country = "";
        let countryCode = "";

        if (place.addressComponents) {
          for (const component of place.addressComponents) {
            const types = component.types || [];
            if (types.includes("locality")) {
              city = component.longText || "";
            } else if (types.includes("sublocality_level_1") && !city) {
              city = component.longText || "";
            } else if (types.includes("administrative_area_level_1")) {
              state = component.longText || "";
              stateCode = component.shortText || "";
            } else if (types.includes("country")) {
              country = component.longText || "";
              countryCode = component.shortText || "";
            }
          }
        }

        // For countries, use display name as country if not parsed
        if (locationType === "country" && !country && place.displayName?.text) {
          country = place.displayName.text;
          // Try to get country code from types or addressComponents
          if (place.addressComponents?.length === 1) {
            countryCode = place.addressComponents[0].shortText || "";
          }
        }

        // For states, use display name if state not found
        if (locationType === "state" && !state && place.displayName?.text) {
          state = place.displayName.text;
          stateCode = place.addressComponents?.[0]?.shortText || "";
        }

        // For cities, use display name if locality not found
        if (locationType === "city" && !city && place.displayName?.text) {
          city = place.displayName.text;
        }

        // Format displayName based on type
        let displayName: string;
        if (locationType === "country") {
          displayName = country;
        } else if (locationType === "state") {
          displayName = `${state}, USA`;
        } else if (countryCode === "US" && stateCode) {
          displayName = `${city}, ${stateCode}`;
        } else if (country) {
          displayName = `${city}, ${country}`;
        } else {
          displayName = city;
        }

        return {
          placeId: place.id || "",
          city: locationType === "city" ? city : undefined,
          state: locationType === "city" ? state : (locationType === "state" ? state : undefined),
          stateCode: locationType === "city" ? stateCode : (locationType === "state" ? stateCode : undefined),
          country,
          countryCode,
          displayName,
          formattedAddress: place.formattedAddress || "",
          type: locationType,
        };
      };

      const cities = (cityData.places || [])
        .map((p: any) => parseLocation(p, "city"))
        .filter((c: any) => c.city);

      const countries = (countryData.places || [])
        .map((p: any) => parseLocation(p, "country"))
        .filter((c: any) => c.country);

      const states = (stateData.places || [])
        .map((p: any) => parseLocation(p, "state"))
        .filter((s: any) => s.state && s.countryCode === "US");

      // Combine results: countries first, then US states, then cities
      const locations = [...countries, ...states, ...cities];

      res.json({ locations });
    } catch (error) {
      console.error("Error in location search:", error);
      res.status(500).json({ message: "Failed to search locations" });
    }
  });

  // Google Places Refresh - Re-fetch full place details by placeId
  app.post("/api/places/refresh", isAuthenticated, async (req, res) => {
    try {
      const { placeId } = req.body;
      if (!placeId || typeof placeId !== "string") {
        return res.status(400).json({ message: "Place ID is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // Request comprehensive field mask for full PlaceDetails
      const fieldMask = [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "nationalPhoneNumber",
        "internationalPhoneNumber",
        "websiteUri",
        "googleMapsUri",
        "location",
        "types",
        "businessStatus",
        "priceLevel",
        "rating",
        "userRatingCount",
        "regularOpeningHours",
        "primaryType",
        "primaryTypeDisplayName",
        "editorialSummary",
        "photos",
      ].join(",");

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Google Places API error:", errorData);
        throw new Error("Failed to fetch from Google Places API");
      }

      const place = await response.json();
      
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

      const result = {
        placeId: place.id || placeId,
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
        editorialSummary: place.editorialSummary?.text || "",
        rawPlaceDetails: place,
      };

      res.json(result);
    } catch (error) {
      console.error("Error refreshing place details:", error);
      res.status(500).json({ message: "Failed to refresh place details" });
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

  // Google Maps Static API - Serve static map image for venue
  app.get("/api/maps/static", async (req, res) => {
    try {
      const { placeId, address, width, height, theme } = req.query;
      
      if (!placeId && !address) {
        return res.status(400).json({ message: "Either placeId or address is required" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }

      const mapWidth = parseInt(width as string) || 600;
      const mapHeight = parseInt(height as string) || 300;
      const mapTheme = (theme as string) || "light";
      
      // Build the static map URL
      let location: string;
      if (placeId) {
        location = `place_id:${placeId}`;
      } else {
        location = address as string;
      }

      // Dark theme styles for Google Maps Static API
      const darkModeStyles = [
        "style=element:geometry|color:0x212121",
        "style=element:labels.icon|visibility:off",
        "style=element:labels.text.fill|color:0x757575",
        "style=element:labels.text.stroke|color:0x212121",
        "style=feature:administrative|element:geometry|color:0x757575",
        "style=feature:administrative.country|element:labels.text.fill|color:0x9e9e9e",
        "style=feature:administrative.land_parcel|visibility:off",
        "style=feature:administrative.locality|element:labels.text.fill|color:0xbdbdbd",
        "style=feature:poi|element:labels.text.fill|color:0x757575",
        "style=feature:poi.park|element:geometry|color:0x181818",
        "style=feature:poi.park|element:labels.text.fill|color:0x616161",
        "style=feature:road|element:geometry.fill|color:0x2c2c2c",
        "style=feature:road|element:labels.text.fill|color:0x8a8a8a",
        "style=feature:road.arterial|element:geometry|color:0x373737",
        "style=feature:road.highway|element:geometry|color:0x3c3c3c",
        "style=feature:road.highway.controlled_access|element:geometry|color:0x4e4e4e",
        "style=feature:road.local|element:labels.text.fill|color:0x616161",
        "style=feature:transit|element:labels.text.fill|color:0x757575",
        "style=feature:water|element:geometry|color:0x000000",
        "style=feature:water|element:labels.text.fill|color:0x3d3d3d",
      ];

      let staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
        `center=${encodeURIComponent(location)}` +
        `&zoom=15` +
        `&size=${mapWidth}x${mapHeight}` +
        `&scale=2` +
        `&maptype=roadmap` +
        `&markers=color:red%7C${encodeURIComponent(location)}` +
        `&key=${apiKey}`;
      
      // Apply dark mode styles if theme is dark
      if (mapTheme === "dark") {
        staticMapUrl += "&" + darkModeStyles.join("&");
      }

      // Fetch the static map image and proxy it
      const response = await fetch(staticMapUrl);
      
      if (!response.ok) {
        throw new Error("Failed to fetch static map");
      }

      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error generating static map:", error);
      res.status(500).json({ message: "Failed to generate static map" });
    }
  });

  // Photo Upload and Object Storage Routes
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const THUMBNAIL_SIZE = 300;

  // Helper function to generate thumbnails
  async function generateThumbnail(buffer: Buffer, contentType: string): Promise<Buffer> {
    let sharpInstance = sharp(buffer);
    
    if (contentType === "image/gif") {
      // For GIFs, just resize without animation
      sharpInstance = sharpInstance.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "center",
      });
    } else {
      sharpInstance = sharpInstance.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "center",
      });
    }
    
    // Convert to WebP for smaller thumbnails (except GIFs)
    if (contentType !== "image/gif") {
      return sharpInstance.webp({ quality: 80 }).toBuffer();
    }
    return sharpInstance.toBuffer();
  }

  // Get upload URL for client-side upload
  app.post("/api/photos/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve objects from storage (public for venues)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/${req.params.objectPath}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      objectStorageService.downloadObject(objectFile, res, 604800); // 7 day cache
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      console.error("Error serving object:", error);
      res.status(500).json({ message: "Failed to serve object" });
    }
  });

  // Upload photo from URL (fetch and save to storage)
  app.post("/api/photos/from-url", isAuthenticated, async (req: any, res) => {
    try {
      const { url, venueId } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Fetch the image from URL
      let fetchUrl = url;
      
      // Handle internal proxy URLs (Google Places photos)
      if (url.startsWith("/api/places/photos/")) {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers.host;
        fetchUrl = `${protocol}://${host}${url}`;
      }

      const response = await fetch(fetchUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VenuePhotoFetcher/1.0)",
        },
      });

      if (!response.ok) {
        return res.status(400).json({ message: "Failed to fetch image from URL" });
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!ALLOWED_IMAGE_TYPES.some(t => contentType.startsWith(t.split("/")[0] + "/" + t.split("/")[1]))) {
        return res.status(400).json({ message: "Invalid image type. Allowed: jpg, png, webp, gif, avif" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "Image too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const photoPath = venueId 
        ? `venues/${venueId}/photos/${timestamp}-${randomId}.${ext}`
        : `photos/${timestamp}-${randomId}.${ext}`;
      const thumbPath = venueId 
        ? `venues/${venueId}/thumbnails/${timestamp}-${randomId}.webp`
        : `thumbnails/${timestamp}-${randomId}.webp`;

      const objectStorageService = new ObjectStorageService();

      // Upload original
      const photoObjectPath = await objectStorageService.uploadBuffer(buffer, photoPath, contentType);

      // Generate and upload thumbnail
      const thumbnailBuffer = await generateThumbnail(buffer, contentType);
      const thumbnailContentType = contentType === "image/gif" ? "image/gif" : "image/webp";
      const thumbObjectPath = await objectStorageService.uploadBuffer(thumbnailBuffer, thumbPath, thumbnailContentType);

      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { venueId, originalUrl: url, size: buffer.length },
      });
      
      res.json({
        photoUrl: photoObjectPath,
        thumbnailUrl: thumbObjectPath,
        originalUrl: url,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading photo from URL:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload photo from URL" });
    }
  });

  // Upload photo from base64 data
  app.post("/api/photos/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { data, filename, contentType, venueId } = req.body;
      
      if (!data || !contentType) {
        return res.status(400).json({ message: "Data and content type are required" });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return res.status(400).json({ message: "Invalid image type. Allowed: jpg, png, webp, gif, avif" });
      }

      // Decode base64
      const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "Image too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const photoPath = venueId 
        ? `venues/${venueId}/photos/${timestamp}-${randomId}.${ext}`
        : `photos/${timestamp}-${randomId}.${ext}`;
      const thumbPath = venueId 
        ? `venues/${venueId}/thumbnails/${timestamp}-${randomId}.webp`
        : `thumbnails/${timestamp}-${randomId}.webp`;

      const objectStorageService = new ObjectStorageService();

      // Upload original
      const photoObjectPath = await objectStorageService.uploadBuffer(buffer, photoPath, contentType);

      // Generate and upload thumbnail
      const thumbnailBuffer = await generateThumbnail(buffer, contentType);
      const thumbnailContentType = contentType === "image/gif" ? "image/gif" : "image/webp";
      const thumbObjectPath = await objectStorageService.uploadBuffer(thumbnailBuffer, thumbPath, thumbnailContentType);

      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { venueId, filename, size: buffer.length },
      });
      
      res.json({
        photoUrl: photoObjectPath,
        thumbnailUrl: thumbObjectPath,
        filename,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Delete photo from storage
  app.delete("/api/photos", isAuthenticated, async (req: any, res) => {
    try {
      const { photoUrl, thumbnailUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ message: "Photo URL is required" });
      }

      const objectStorageService = new ObjectStorageService();

      // Delete the main photo
      if (photoUrl.startsWith("/objects/")) {
        await objectStorageService.deleteObject(photoUrl);
      }

      // Delete the thumbnail if provided
      if (thumbnailUrl && thumbnailUrl.startsWith("/objects/")) {
        await objectStorageService.deleteObject(thumbnailUrl);
      }

      await logAuditEvent(req, {
        action: "delete",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { photoUrl, thumbnailUrl },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Upload PDF floorplan (no thumbnail generation)
  app.post("/api/floorplans/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { data, filename, contentType, venueId } = req.body;
      
      if (!data || !contentType) {
        return res.status(400).json({ message: "Data and content type are required" });
      }

      if (contentType !== "application/pdf") {
        return res.status(400).json({ message: "This endpoint only accepts PDF files" });
      }

      // Decode base64
      const base64Data = data.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const sanitizedFilename = filename?.replace(/[^a-zA-Z0-9.-]/g, "_") || "floorplan";
      const filePath = venueId 
        ? `venues/${venueId}/floorplans/${timestamp}-${randomId}-${sanitizedFilename}`
        : `floorplans/${timestamp}-${randomId}-${sanitizedFilename}`;

      const objectStorageService = new ObjectStorageService();

      // Upload PDF
      const fileObjectPath = await objectStorageService.uploadBuffer(buffer, filePath, contentType);

      res.json({
        fileUrl: fileObjectPath,
        filename,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading floorplan:", error);
      res.status(500).json({ message: "Failed to upload floorplan" });
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

  // ===== PUBLIC VENUES ROUTES (no authentication required) =====

  // Get single venue with all relationships - public read-only access
  app.get("/api/public/venues/:id", async (req, res) => {
    try {
      const venue = await storage.getVenueByIdWithRelations(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching public venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  // Get venue collection with venues - public read-only access
  app.get("/api/public/venue-collections/:id", async (req, res) => {
    try {
      const collection = await storage.getVenueCollectionById(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching public venue collection:", error);
      res.status(500).json({ message: "Failed to fetch venue collection" });
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

  // Create new venue
  app.post("/api/venues", isAuthenticated, async (req: any, res) => {
    let venueId: string | undefined;
    try {
      const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = req.body;
      
      const parsed = insertVenueSchema.safeParse(rawVenueData);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid venue data", 
          errors: parsed.error.flatten() 
        });
      }
      
      const venue = await storage.createVenue(parsed.data);
      venueId = venue.id;
      
      if (amenityIds && amenityIds.length > 0) {
        await storage.setVenueAmenities(venue.id, amenityIds);
      }
      
      const allTagIds = [...(cuisineTagIds || []), ...(styleTagIds || [])];
      if (allTagIds.length > 0) {
        await storage.setVenueTags(venue.id, allTagIds);
      }
      
      const fullVenue = await storage.getVenueByIdWithRelations(venue.id);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue",
        entityId: venue.id,
        status: "success",
        metadata: { venueName: venue.name },
      });
      
      res.status(201).json(fullVenue);
    } catch (error) {
      console.error("Error creating venue:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue",
        entityId: venueId || "unknown",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  // Update venue
  app.patch("/api/venues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingVenue = await storage.getVenueById(req.params.id);
      if (!existingVenue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = req.body;
      
      const parsed = updateVenueSchema.safeParse(rawVenueData);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid venue data", 
          errors: parsed.error.flatten() 
        });
      }
      
      const venue = await storage.updateVenue(req.params.id, parsed.data);
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
      
      const changes = getChangedFields(
        existingVenue as unknown as Record<string, unknown>,
        venue as unknown as Record<string, unknown>
      );
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue",
        entityId: req.params.id,
        changes,
        status: "success",
        metadata: { venueName: venue.name },
      });
      
      res.json(fullVenue);
    } catch (error) {
      console.error("Error updating venue:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  // Delete venue (manager or admin only)
  app.delete("/api/venues/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const existingVenue = await storage.getVenueById(req.params.id);
      if (!existingVenue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      await storage.deleteVenue(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue",
        entityId: req.params.id,
        status: "success",
        metadata: { deletedVenue: existingVenue.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
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

  // Get collections that a venue belongs to
  app.get("/api/venues/:id/collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await storage.getCollectionsForVenue(req.params.id);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching venue collections:", error);
      res.status(500).json({ message: "Failed to fetch venue collections" });
    }
  });

  // ===== VENUE COLLECTION ROUTES =====

  // Get all venue collections
  app.get("/api/venue-collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await storage.getVenueCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error fetching venue collections:", error);
      res.status(500).json({ message: "Failed to fetch venue collections" });
    }
  });

  // Get a single venue collection by ID
  app.get("/api/venue-collections/:id", isAuthenticated, async (req, res) => {
    try {
      const collection = await storage.getVenueCollectionById(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching venue collection:", error);
      res.status(500).json({ message: "Failed to fetch venue collection" });
    }
  });

  // Create a new venue collection
  app.post("/api/venue-collections", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertVenueCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      const collection = await storage.createVenueCollection(
        parsed.data,
        req.user.claims.sub
      );
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_collection",
        entityId: collection.id,
        status: "success",
        metadata: { name: collection.name },
      });
      
      res.status(201).json(collection);
    } catch (error) {
      console.error("Error creating venue collection:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_collection",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create venue collection" });
    }
  });

  // Update a venue collection
  app.patch("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = updateVenueCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      const original = await storage.getVenueCollectionById(req.params.id);
      const collection = await storage.updateVenueCollection(
        req.params.id,
        parsed.data
      );
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, collection),
      });
      
      res.json(collection);
    } catch (error) {
      console.error("Error updating venue collection:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update venue collection" });
    }
  });

  // Delete a venue collection
  app.delete("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const collection = await storage.getVenueCollectionById(req.params.id);
      await storage.deleteVenueCollection(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { name: collection?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue collection:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete venue collection" });
    }
  });

  // Add venues to a collection
  app.post("/api/venue-collections/:id/venues", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = addVenuesToCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      await storage.addVenuesToCollection(
        req.params.id,
        parsed.data.venueIds,
        req.user.claims.sub
      );
      
      await logAuditEvent(req, {
        action: "add_venues",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { venueIds: parsed.data.venueIds, count: parsed.data.venueIds.length },
      });
      
      // Return the updated collection
      const collection = await storage.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      console.error("Error adding venues to collection:", error);
      await logAuditEvent(req, {
        action: "add_venues",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to add venues to collection" });
    }
  });

  // Remove a venue from a collection
  app.delete("/api/venue-collections/:collectionId/venues/:venueId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeVenueFromCollection(
        req.params.collectionId,
        req.params.venueId
      );
      
      await logAuditEvent(req, {
        action: "remove_venue",
        entityType: "venue_collection",
        entityId: req.params.collectionId,
        status: "success",
        metadata: { venueId: req.params.venueId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing venue from collection:", error);
      await logAuditEvent(req, {
        action: "remove_venue",
        entityType: "venue_collection",
        entityId: req.params.collectionId,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove venue from collection" });
    }
  });

  // Reorder venues in a collection
  app.put("/api/venue-collections/:id/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { venueIds } = req.body;
      if (!Array.isArray(venueIds)) {
        return res.status(400).json({ message: "venueIds must be an array" });
      }
      
      await storage.reorderVenuesInCollection(req.params.id, venueIds);
      
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { venueCount: venueIds.length },
      });
      
      // Return the updated collection
      const collection = await storage.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      console.error("Error reordering venues in collection:", error);
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to reorder venues in collection" });
    }
  });

  // ===== VENUE FLOORPLAN ROUTES =====

  // Get all floorplans for a venue
  app.get("/api/venues/:venueId/floorplans", isAuthenticated, async (req, res) => {
    try {
      const floorplans = await storage.getVenueFiles(req.params.venueId, 'floorplan');
      res.json(floorplans);
    } catch (error) {
      console.error("Error fetching venue floorplans:", error);
      res.status(500).json({ message: "Failed to fetch venue floorplans" });
    }
  });

  // Get a single floorplan by ID
  app.get("/api/floorplans/:id", isAuthenticated, async (req, res) => {
    try {
      const floorplan = await storage.getVenueFileById(req.params.id);
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      res.json(floorplan);
    } catch (error) {
      console.error("Error fetching floorplan:", error);
      res.status(500).json({ message: "Failed to fetch floorplan" });
    }
  });

  // Create a new floorplan
  app.post("/api/venues/:venueId/floorplans", isAuthenticated, async (req: any, res) => {
    try {
      const { fileUrl, thumbnailUrl, fileType, title, caption, sortOrder } = req.body;
      
      if (!fileUrl || !fileType) {
        return res.status(400).json({ message: "fileUrl and fileType are required" });
      }
      
      if (!["image", "pdf"].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });
      }
      
      const floorplan = await storage.createVenueFile({
        venueId: req.params.venueId,
        category: 'floorplan',
        fileUrl,
        thumbnailUrl,
        fileType,
        title,
        caption,
        sortOrder: sortOrder ?? 0,
        uploadedById: req.user?.id,
      });
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "floorplan",
        entityId: floorplan.id,
        status: "success",
        metadata: { venueId: req.params.venueId, title },
      });
      
      res.status(201).json(floorplan);
    } catch (error) {
      console.error("Error creating floorplan:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "floorplan",
        entityId: null,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create floorplan" });
    }
  });

  // POST /api/venues/:venueId/floorplans/bulk - Create multiple floorplans for a venue
  app.post("/api/venues/:venueId/floorplans/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { floorplans: floorplansData } = req.body;
      
      if (!Array.isArray(floorplansData) || floorplansData.length === 0) {
        return res.status(400).json({ message: "floorplans must be a non-empty array" });
      }

      const filesToCreate = floorplansData.map((f: any, index: number) => ({
        venueId: req.params.venueId,
        category: 'floorplan' as const,
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || 'image',
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: req.user?.id,
      }));

      const floorplans = await storage.createVenueFiles(filesToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, category: 'floorplan', count: floorplans.length },
      });

      res.status(201).json(floorplans);
    } catch (error) {
      console.error("Error creating floorplans:", error);
      res.status(500).json({ message: "Failed to create floorplans" });
    }
  });

  // Update a floorplan
  app.patch("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      
      const original = await storage.getVenueFileById(req.params.id);
      const floorplan = await storage.updateVenueFile(req.params.id, {
        title,
        caption,
        sortOrder,
        thumbnailUrl,
      });
      
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, floorplan),
      });
      
      res.json(floorplan);
    } catch (error) {
      console.error("Error updating floorplan:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update floorplan" });
    }
  });

  // Delete a floorplan
  app.delete("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const floorplan = await storage.getVenueFileById(req.params.id);
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      
      const storageService = new ObjectStorageService();
      
      // Delete the file from object storage if it's stored there
      if (floorplan.fileUrl.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(floorplan.fileUrl);
        } catch (err) {
          console.error("Failed to delete floorplan file from storage:", err);
        }
      }
      
      // Delete thumbnail if it exists
      if (floorplan.thumbnailUrl?.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(floorplan.thumbnailUrl);
        } catch (err) {
          console.error("Failed to delete floorplan thumbnail from storage:", err);
        }
      }
      
      await storage.deleteVenueFile(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "success",
        metadata: { venueId: floorplan.venueId, title: floorplan.title },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting floorplan:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete floorplan" });
    }
  });

  // ===== VENUE FILES ROUTES (unified for floorplans and attachments) =====

  // Get all files for a venue with optional category filter
  app.get("/api/venues/:venueId/files", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const files = await storage.getVenueFiles(req.params.venueId, category);
      res.json(files);
    } catch (error) {
      console.error("Error fetching venue files:", error);
      res.status(500).json({ message: "Failed to fetch venue files" });
    }
  });

  // Get a single file by ID
  app.get("/api/venue-files/:id", isAuthenticated, async (req, res) => {
    try {
      const file = await storage.getVenueFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error fetching venue file:", error);
      res.status(500).json({ message: "Failed to fetch venue file" });
    }
  });

  // Upload a file to object storage and create venue file record
  app.post("/api/venue-files/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { venueId, category, fileData, filename, mimeType, title, caption } = req.body;
      
      if (!fileData || !filename) {
        return res.status(400).json({ message: "fileData and filename are required" });
      }
      
      if (!category || !["floorplan", "attachment"].includes(category)) {
        return res.status(400).json({ message: "category must be 'floorplan' or 'attachment'" });
      }
      
      // Determine file type from mime type
      const getFileType = (mime: string): "image" | "pdf" | "document" | "archive" | "other" => {
        if (mime.startsWith("image/")) return "image";
        if (mime === "application/pdf") return "pdf";
        if (mime.includes("word") || mime.includes("document") || mime.includes("spreadsheet") || 
            mime.includes("presentation") || mime === "text/plain" || mime === "text/csv") return "document";
        if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || 
            mime.includes("gzip") || mime.includes("7z")) return "archive";
        return "other";
      };
      
      const fileType = getFileType(mimeType || "application/octet-stream");
      
      // Validate file size (max 50MB for attachments)
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (buffer.length > maxSize) {
        return res.status(400).json({ message: "File size exceeds maximum limit of 50MB" });
      }
      
      const storageService = new ObjectStorageService();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = venueId 
        ? `venues/${venueId}/${category}s/${timestamp}-${randomId}-${sanitizedFilename}`
        : `staged/${category}s/${timestamp}-${randomId}-${sanitizedFilename}`;
      
      // Upload file
      await storageService.uploadBuffer(buffer, objectPath, mimeType);
      const fileUrl = `/objects/${objectPath}`;
      
      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (fileType === "image") {
        try {
          const sharp = (await import("sharp")).default;
          const thumbnailBuffer = await sharp(buffer)
            .resize(400, 400, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          
          const thumbnailPath = objectPath.replace(/\.[^.]+$/, "_thumb.webp");
          await storageService.uploadBuffer(thumbnailBuffer, thumbnailPath, "image/webp");
          thumbnailUrl = `/objects/${thumbnailPath}`;
        } catch (thumbErr) {
          console.error("Failed to generate thumbnail:", thumbErr);
        }
      }
      
      // If venueId is provided, create a database record
      // Otherwise, just return the file info for staging
      if (venueId) {
        const file = await storage.createVenueFile({
          venueId,
          category,
          fileUrl,
          thumbnailUrl,
          fileType,
          originalFilename: filename,
          mimeType,
          title,
          caption,
          sortOrder: 0,
          uploadedById: req.user?.id,
        });
        
        await logAuditEvent(req, {
          action: "upload",
          entityType: "venue_file",
          entityId: file.id,
          status: "success",
          metadata: { venueId, category, filename },
        });
        
        res.status(201).json(file);
      } else {
        // Return file info for staging (no database record created)
        await logAuditEvent(req, {
          action: "upload_staged",
          entityType: "venue_file",
          entityId: null,
          status: "success",
          metadata: { category, filename },
        });
        
        res.status(201).json({
          fileUrl,
          thumbnailUrl,
          fileType,
          originalFilename: filename,
          mimeType,
          title,
          caption,
        });
      }
    } catch (error) {
      console.error("Error uploading venue file:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "venue_file",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload venue file" });
    }
  });

  // Create a venue file record (for files already uploaded)
  app.post("/api/venues/:venueId/files", isAuthenticated, async (req: any, res) => {
    try {
      const { category, fileUrl, thumbnailUrl, fileType, originalFilename, mimeType, title, caption, sortOrder } = req.body;
      
      if (!fileUrl || !fileType || !category) {
        return res.status(400).json({ message: "fileUrl, fileType, and category are required" });
      }
      
      if (!["floorplan", "attachment"].includes(category)) {
        return res.status(400).json({ message: "category must be 'floorplan' or 'attachment'" });
      }
      
      if (!["image", "pdf", "document", "archive", "other"].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'image', 'pdf', 'document', 'archive', or 'other'" });
      }
      
      const file = await storage.createVenueFile({
        venueId: req.params.venueId,
        category,
        fileUrl,
        thumbnailUrl,
        fileType,
        originalFilename,
        mimeType,
        title,
        caption,
        sortOrder: sortOrder ?? 0,
        uploadedById: req.user?.id,
      });
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: file.id,
        status: "success",
        metadata: { venueId: req.params.venueId, category, title },
      });
      
      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating venue file:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: null,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create venue file" });
    }
  });

  // POST /api/venues/:venueId/files/bulk - Create multiple files for a venue
  app.post("/api/venues/:venueId/files/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { files: filesData } = req.body;
      
      if (!Array.isArray(filesData) || filesData.length === 0) {
        return res.status(400).json({ message: "files must be a non-empty array" });
      }

      const filesToCreate = filesData.map((f: any, index: number) => ({
        venueId: req.params.venueId,
        category: f.category || 'attachment',
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || 'other',
        originalFilename: f.originalFilename,
        mimeType: f.mimeType,
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: req.user?.id,
      }));

      const files = await storage.createVenueFiles(filesToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, count: files.length },
      });

      res.status(201).json(files);
    } catch (error) {
      console.error("Error creating venue files:", error);
      res.status(500).json({ message: "Failed to create venue files" });
    }
  });

  // Update a venue file
  app.patch("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      
      const original = await storage.getVenueFileById(req.params.id);
      const file = await storage.updateVenueFile(req.params.id, {
        title,
        caption,
        sortOrder,
        thumbnailUrl,
      });
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, file),
      });
      
      res.json(file);
    } catch (error) {
      console.error("Error updating venue file:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update venue file" });
    }
  });

  // Delete a venue file
  app.delete("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const file = await storage.getVenueFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const storageService = new ObjectStorageService();
      
      // Delete the file from object storage if it's stored there
      if (file.fileUrl.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(file.fileUrl);
        } catch (err) {
          console.error("Failed to delete file from storage:", err);
        }
      }
      
      // Delete thumbnail if it exists
      if (file.thumbnailUrl?.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(file.thumbnailUrl);
        } catch (err) {
          console.error("Failed to delete thumbnail from storage:", err);
        }
      }
      
      await storage.deleteVenueFile(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "success",
        metadata: { venueId: file.venueId, category: file.category, title: file.title },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue file:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete venue file" });
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

  // Create new amenity
  app.post("/api/amenities", isAuthenticated, async (req: any, res) => {
    try {
      const amenity = await storage.createAmenity(req.body);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "amenity",
        entityId: amenity.id,
        status: "success",
        metadata: { name: amenity.name },
      });
      
      res.status(201).json(amenity);
    } catch (error) {
      console.error("Error creating amenity:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "amenity",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create amenity" });
    }
  });

  // Update amenity
  app.patch("/api/amenities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const original = await storage.getAmenityById(req.params.id);
      const amenity = await storage.updateAmenity(req.params.id, req.body);
      if (!amenity) {
        return res.status(404).json({ message: "Amenity not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "amenity",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, amenity),
      });
      
      res.json(amenity);
    } catch (error) {
      console.error("Error updating amenity:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "amenity",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update amenity" });
    }
  });

  // Delete amenity
  app.delete("/api/amenities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const amenity = await storage.getAmenityById(req.params.id);
      await storage.deleteAmenity(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "amenity",
        entityId: req.params.id,
        status: "success",
        metadata: { name: amenity?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting amenity:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "amenity",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete amenity" });
    }
  });

  // ===== INDUSTRY ROUTES =====

  // Get all industries
  app.get("/api/industries", isAuthenticated, async (req, res) => {
    try {
      const industries = await storage.getIndustries();
      res.json(industries);
    } catch (error) {
      console.error("Error fetching industries:", error);
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  // Get single industry
  app.get("/api/industries/:id", isAuthenticated, async (req, res) => {
    try {
      const industry = await storage.getIndustryById(req.params.id);
      if (!industry) {
        return res.status(404).json({ message: "Industry not found" });
      }
      res.json(industry);
    } catch (error) {
      console.error("Error fetching industry:", error);
      res.status(500).json({ message: "Failed to fetch industry" });
    }
  });

  // Create new industry
  app.post("/api/industries", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertIndustrySchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const industry = await storage.createIndustry(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "industry",
        entityId: industry.id,
        status: "success",
        metadata: { name: industry.name },
      });
      
      res.status(201).json(industry);
    } catch (error) {
      console.error("Error creating industry:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "industry",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create industry" });
    }
  });

  // Update industry
  app.patch("/api/industries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = updateIndustrySchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await storage.getIndustryById(req.params.id);
      const industry = await storage.updateIndustry(req.params.id, validatedData.data);
      if (!industry) {
        return res.status(404).json({ message: "Industry not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "industry",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, industry),
      });
      
      res.json(industry);
    } catch (error) {
      console.error("Error updating industry:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "industry",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update industry" });
    }
  });

  // Delete industry
  app.delete("/api/industries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const industry = await storage.getIndustryById(req.params.id);
      await storage.deleteIndustry(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "industry",
        entityId: req.params.id,
        status: "success",
        metadata: { name: industry?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting industry:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "industry",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete industry" });
    }
  });

  // ===== DEAL SERVICE ROUTES =====

  // Get all deal services
  app.get("/api/deal-services", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getDealServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching deal services:", error);
      res.status(500).json({ message: "Failed to fetch deal services" });
    }
  });

  // Get single deal service
  app.get("/api/deal-services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await storage.getDealServiceById(parseInt(req.params.id));
      if (!service) {
        return res.status(404).json({ message: "Deal service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching deal service:", error);
      res.status(500).json({ message: "Failed to fetch deal service" });
    }
  });

  // Create new deal service
  app.post("/api/deal-services", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDealServiceSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const service = await storage.createDealService(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_service",
        entityId: String(service.id),
        status: "success",
        metadata: { name: service.name },
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating deal service:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_service",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create deal service" });
    }
  });

  // Update deal service
  app.patch("/api/deal-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDealServiceSchema.partial().safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await storage.getDealServiceById(parseInt(req.params.id));
      const service = await storage.updateDealService(parseInt(req.params.id), validatedData.data);
      if (!service) {
        return res.status(404).json({ message: "Deal service not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, service),
      });
      
      res.json(service);
    } catch (error) {
      console.error("Error updating deal service:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update deal service" });
    }
  });

  // Delete deal service
  app.delete("/api/deal-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const service = await storage.getDealServiceById(parseInt(req.params.id));
      await storage.deleteDealService(parseInt(req.params.id));
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "success",
        metadata: { name: service?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting deal service:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete deal service" });
    }
  });

  // ===== TAG ROUTES =====
  
  // Get all tags (optionally filtered by category)
  app.get("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const tags = await storage.getTags(category);
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

  // Create new tag
  app.post("/api/tags", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTagSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const tag = await storage.createTag(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "tag",
        entityId: tag.id,
        status: "success",
        metadata: { name: tag.name, category: tag.category },
      });
      
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "tag",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // Update tag
  app.patch("/api/tags/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = updateTagSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await storage.getTagById(req.params.id);
      const tag = await storage.updateTag(req.params.id, validatedData.data);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "tag",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, tag),
      });
      
      res.json(tag);
    } catch (error) {
      console.error("Error updating tag:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "tag",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  // Delete tag
  app.delete("/api/tags/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tag = await storage.getTagById(req.params.id);
      await storage.deleteTag(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "tag",
        entityId: req.params.id,
        status: "success",
        metadata: { name: tag?.name, category: tag?.category },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tag:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "tag",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
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

  // ===== COMMENTS ROUTES =====

  // GET /api/comments - get all comments with optional entity type filter
  app.get("/api/comments", isAuthenticated, async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Validate entityType if provided
      if (entityType && !commentEntityTypes.includes(entityType as any)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }
      
      const comments = await storage.getAllComments({ entityType, limit });
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // GET /api/comments/:entityType/:entityId - get comments for a specific entity
  app.get("/api/comments/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      // Validate entityType
      if (!commentEntityTypes.includes(entityType as any)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }
      
      const comments = await storage.getCommentsByEntity(entityType, entityId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // POST /api/comments - create a new comment
  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const result = insertCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      // If this is a reply, verify parent exists and get its entityType/entityId
      if (result.data.parentId) {
        const parentComment = await storage.getEntityCommentById(result.data.parentId);
        if (!parentComment) {
          return res.status(404).json({ message: "Parent comment not found" });
        }
        // Don't allow replying to replies (single level only)
        if (parentComment.parentId) {
          return res.status(400).json({ message: "Cannot reply to a reply. Only single-level replies are supported." });
        }
      }

      const comment = await storage.createEntityComment(result.data, userId);
      
      // Fetch the comment with author info to return
      const commentWithAuthor = await storage.getEntityCommentById(comment.id);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "comment",
        entityId: comment.id,
        status: "success",
        metadata: { targetEntityType: result.data.entityType, targetEntityId: result.data.entityId },
      });
      
      res.status(201).json(commentWithAuthor);
    } catch (error) {
      console.error("Error creating comment:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "comment",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // PATCH /api/comments/:id - update a comment (only author can update)
  app.patch("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = req.params.id;
      
      const existingComment = await storage.getEntityCommentById(commentId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if deleted
      if (existingComment.deletedAt) {
        return res.status(400).json({ message: "Cannot edit a deleted comment" });
      }

      // Only author can edit
      if (existingComment.createdById !== userId) {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }

      const result = updateCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const updatedComment = await storage.updateEntityComment(commentId, result.data.body);
      
      // Fetch updated comment with author info
      const commentWithAuthor = await storage.getEntityCommentById(commentId);
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "comment",
        entityId: commentId,
        status: "success",
        changes: getChangedFields(existingComment, updatedComment),
      });
      
      res.json(commentWithAuthor);
    } catch (error) {
      console.error("Error updating comment:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "comment",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // DELETE /api/comments/:id - soft delete a comment (author or admin only)
  app.delete("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = req.params.id;
      
      const existingComment = await storage.getEntityCommentById(commentId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if already deleted
      if (existingComment.deletedAt) {
        return res.status(400).json({ message: "Comment already deleted" });
      }

      // Get user to check if admin
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === "admin";

      // Only author or admin can delete
      if (existingComment.createdById !== userId && !isAdminUser) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      await storage.softDeleteEntityComment(commentId);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "comment",
        entityId: commentId,
        status: "success",
        metadata: { 
          targetEntityType: existingComment.entityType, 
          targetEntityId: existingComment.entityId,
          deletedByAdmin: existingComment.createdById !== userId
        },
      });
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "comment",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ============================================
  // Activity Tracking Routes (renamed from "analytics" to avoid ad blockers)
  // ============================================

  // POST /api/activity/session - Create or get analytics session
  app.post("/api/activity/session", async (req: any, res) => {
    try {
      const { sessionToken, userAgent, deviceType, environment } = req.body;
      
      if (!sessionToken) {
        return res.status(400).json({ message: "Session token required" });
      }

      // Check if session already exists
      const existingSession = await storage.getAnalyticsSessionByToken(sessionToken);
      if (existingSession) {
        await storage.updateAnalyticsSessionActivity(existingSession.id);
        return res.json(existingSession);
      }

      // Get user ID if authenticated
      const session = req.session as any;
      const userId = session?.userId || null;

      const analyticsSession = await storage.createAnalyticsSession({
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

  // POST /api/activity/pageview - Record a page view
  app.post("/api/activity/pageview", async (req: any, res) => {
    try {
      const { sessionId, path, title, referrer, environment } = req.body;
      
      if (!path) {
        return res.status(400).json({ message: "Path required" });
      }

      // Get user ID if authenticated
      const session = req.session as any;
      const userId = session?.userId || null;

      const pageView = await storage.createPageView({
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

  // PUT /api/activity/pageview/:id/duration - Update page view duration
  app.put("/api/activity/pageview/:id/duration", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { durationMs } = req.body;
      
      if (typeof durationMs !== "number") {
        return res.status(400).json({ message: "Duration required" });
      }

      await storage.updatePageViewDuration(id, durationMs);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating page view duration:", error);
      res.status(500).json({ message: "Failed to update duration" });
    }
  });

  // POST /api/activity/event - Record an analytics event
  app.post("/api/activity/event", async (req: any, res) => {
    try {
      const { sessionId, eventType, eventName, eventCategory, path, elementId, metadata, environment } = req.body;
      
      if (!eventType || !eventName) {
        return res.status(400).json({ message: "Event type and name required" });
      }

      // Get user ID if authenticated
      const session = req.session as any;
      const userId = session?.userId || null;

      const event = await storage.createAnalyticsEvent({
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

  // POST /api/activity/session/:id/end - End an analytics session
  app.post("/api/activity/session/:id/end", async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.endAnalyticsSession(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending analytics session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // GET /api/admin/activity - Get analytics summary (admin only)
  app.get("/api/admin/activity", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate, environment } = req.query;
      
      // Default to last 30 days
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Pass environment filter (undefined means all environments)
      const envFilter = environment && environment !== "all" ? environment as string : undefined;
      const summary = await storage.getAnalyticsSummary(start, end, envFilter);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // GET /api/admin/activity/pageviews/recent - Get recent page views (admin only)
  app.get("/api/admin/activity/pageviews/recent", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const environment = req.query.environment as string | undefined;
      
      // Pass environment filter (undefined means all environments)
      const envFilter = environment && environment !== "all" ? environment : undefined;
      const recentPageViews = await storage.getRecentPageViews(Math.min(limit, 100), envFilter);
      res.json(recentPageViews);
    } catch (error) {
      console.error("Error fetching recent page views:", error);
      res.status(500).json({ message: "Failed to fetch recent page views" });
    }
  });

  // ====== VENUE PHOTOS ROUTES ======

  // GET /api/venues/:venueId/photos - List photos for a venue
  app.get("/api/venues/:venueId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getVenuePhotos(req.params.venueId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching venue photos:", error);
      res.status(500).json({ message: "Failed to fetch venue photos" });
    }
  });

  // POST /api/venues/:venueId/photos - Create a photo for a venue
  app.post("/api/venues/:venueId/photos", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertVenuePhotoSchema.safeParse({
        ...req.body,
        venueId: req.params.venueId,
      });
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const photo = await storage.createVenuePhoto(result.data);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_photo",
        entityId: photo.id,
        changes: { after: { venueId: req.params.venueId, url: result.data.url } },
      });

      res.status(201).json(photo);
    } catch (error) {
      console.error("Error creating venue photo:", error);
      res.status(500).json({ message: "Failed to create venue photo" });
    }
  });

  // POST /api/venues/:venueId/photos/bulk - Create multiple photos for a venue
  app.post("/api/venues/:venueId/photos/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { photos: photosData } = req.body;
      
      if (!Array.isArray(photosData) || photosData.length === 0) {
        return res.status(400).json({ message: "photos must be a non-empty array" });
      }

      const photosToCreate = photosData.map((p: any, index: number) => ({
        venueId: req.params.venueId,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        altText: p.altText,
        sortOrder: p.sortOrder ?? index,
        isHero: p.isHero ?? (index === 0),
      }));

      const photos = await storage.createVenuePhotos(photosToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_photo",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, count: photos.length },
      });

      res.status(201).json(photos);
    } catch (error) {
      console.error("Error creating venue photos:", error);
      res.status(500).json({ message: "Failed to create venue photos" });
    }
  });

  // PUT /api/venue-photos/:id - Update a photo
  app.put("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateVenuePhotoSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const before = await storage.getVenuePhotoById(req.params.id);
      if (!before) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const photo = await storage.updateVenuePhoto(req.params.id, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_photo",
        entityId: req.params.id,
        changes: getChangedFields(
          before as unknown as Record<string, unknown>,
          photo as unknown as Record<string, unknown>
        ),
      });

      res.json(photo);
    } catch (error) {
      console.error("Error updating venue photo:", error);
      res.status(500).json({ message: "Failed to update venue photo" });
    }
  });

  // DELETE /api/venue-photos/:id - Delete a photo
  app.delete("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const photo = await storage.getVenuePhotoById(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const storageService = new ObjectStorageService();

      // Delete the photo file from object storage if it's stored there
      if (photo.url && photo.url.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(photo.url);
        } catch (err) {
          console.error("Failed to delete photo from storage:", err);
        }
      }

      await storage.deleteVenuePhoto(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_photo",
        entityId: req.params.id,
        changes: { before: { venueId: photo.venueId, url: photo.url } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue photo:", error);
      res.status(500).json({ message: "Failed to delete venue photo" });
    }
  });

  // PUT /api/venues/:venueId/photos/:photoId/hero - Set a photo as hero
  app.put("/api/venues/:venueId/photos/:photoId/hero", isAuthenticated, async (req: any, res) => {
    try {
      const photo = await storage.getVenuePhotoById(req.params.photoId);
      if (!photo || photo.venueId !== req.params.venueId) {
        return res.status(404).json({ message: "Photo not found" });
      }

      await storage.setVenuePhotoHero(req.params.venueId, req.params.photoId);

      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_photo",
        entityId: req.params.photoId,
        metadata: { venueId: req.params.venueId, setAsHero: true },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting hero photo:", error);
      res.status(500).json({ message: "Failed to set hero photo" });
    }
  });

  // ==========================================
  // APP RELEASE / VERSION MANAGEMENT ROUTES
  // ==========================================

  // GET /api/releases - List all releases
  app.get("/api/releases", isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as ReleaseStatus | undefined;
      if (status && !releaseStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const releases = await storage.getReleases(status);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  // GET /api/releases/:id - Get release details
  app.get("/api/releases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      res.json(release);
    } catch (error) {
      console.error("Error fetching release:", error);
      res.status(500).json({ message: "Failed to fetch release" });
    }
  });

  // POST /api/releases - Create new release (admin only)
  app.post("/api/releases", isAdmin, async (req: any, res) => {
    try {
      const result = insertAppReleaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const userId = req.user.claims.sub;
      const release = await storage.createRelease(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "app_release",
        entityId: release.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      res.status(201).json(release);
    } catch (error: any) {
      console.error("Error creating release:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Version label already exists" });
      }
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  // PUT /api/releases/:id - Update release (admin only)
  app.put("/api/releases/:id", isAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Cannot edit a published release" });
      }

      const result = updateAppReleaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const release = await storage.updateRelease(req.params.id, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "app_release",
        entityId: req.params.id,
        changes: { before: existing, after: result.data as Record<string, unknown> },
      });

      res.json(release);
    } catch (error: any) {
      console.error("Error updating release:", error);
      if (error.code === "23505") {
        return res.status(400).json({ message: "Version label already exists" });
      }
      res.status(500).json({ message: "Failed to update release" });
    }
  });

  // POST /api/releases/:id/publish - Publish release (admin only)
  app.post("/api/releases/:id/publish", isAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Release is already published" });
      }

      const release = await storage.publishRelease(req.params.id);

      await logAuditEvent(req, {
        action: "update",
        entityType: "app_release",
        entityId: req.params.id,
        metadata: { action: "publish" },
      });

      res.json(release);
    } catch (error) {
      console.error("Error publishing release:", error);
      res.status(500).json({ message: "Failed to publish release" });
    }
  });

  // DELETE /api/releases/:id - Delete release (admin only)
  app.delete("/api/releases/:id", isAdmin, async (req: any, res) => {
    try {
      const existing = await storage.getReleaseById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (existing.status === "released") {
        return res.status(400).json({ message: "Cannot delete a published release" });
      }

      await storage.deleteRelease(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "app_release",
        entityId: req.params.id,
        changes: { before: { versionLabel: existing.versionLabel } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting release:", error);
      res.status(500).json({ message: "Failed to delete release" });
    }
  });

  // POST /api/releases/:id/features - Add feature to release (admin only)
  app.post("/api/releases/:id/features", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const { featureId, notes } = req.body;
      if (!featureId) {
        return res.status(400).json({ message: "featureId is required" });
      }

      const releaseFeature = await storage.addFeatureToRelease(req.params.id, featureId, notes);
      
      await logAuditEvent(req, {
        action: "link_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { featureId, releaseVersion: release.versionLabel },
      });
      
      res.status(201).json(releaseFeature);
    } catch (error: any) {
      console.error("Error adding feature to release:", error);
      await logAuditEvent(req, {
        action: "link_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { featureId: req.body.featureId, error: (error as Error).message },
      });
      if (error.code === "23505") {
        return res.status(400).json({ message: "Feature already added to this release" });
      }
      res.status(500).json({ message: "Failed to add feature to release" });
    }
  });

  // DELETE /api/releases/:id/features/:featureId - Remove feature from release
  app.delete("/api/releases/:id/features/:featureId", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await storage.removeFeatureFromRelease(req.params.id, req.params.featureId);
      
      await logAuditEvent(req, {
        action: "unlink_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { featureId: req.params.featureId, releaseVersion: release.versionLabel },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing feature from release:", error);
      await logAuditEvent(req, {
        action: "unlink_feature",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { featureId: req.params.featureId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove feature from release" });
    }
  });

  // POST /api/releases/:id/issues - Add issue to release (admin only)
  app.post("/api/releases/:id/issues", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const { issueId, notes } = req.body;
      if (!issueId) {
        return res.status(400).json({ message: "issueId is required" });
      }

      const releaseIssue = await storage.addIssueToRelease(req.params.id, issueId, notes);
      
      await logAuditEvent(req, {
        action: "link_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { issueId, releaseVersion: release.versionLabel },
      });
      
      res.status(201).json(releaseIssue);
    } catch (error: any) {
      console.error("Error adding issue to release:", error);
      await logAuditEvent(req, {
        action: "link_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { issueId: req.body.issueId, error: (error as Error).message },
      });
      if (error.code === "23505") {
        return res.status(400).json({ message: "Issue already added to this release" });
      }
      res.status(500).json({ message: "Failed to add issue to release" });
    }
  });

  // DELETE /api/releases/:id/issues/:issueId - Remove issue from release
  app.delete("/api/releases/:id/issues/:issueId", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await storage.removeIssueFromRelease(req.params.id, req.params.issueId);
      
      await logAuditEvent(req, {
        action: "unlink_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { issueId: req.params.issueId, releaseVersion: release.versionLabel },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing issue from release:", error);
      await logAuditEvent(req, {
        action: "unlink_issue",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { issueId: req.params.issueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove issue from release" });
    }
  });

  // POST /api/releases/:id/changes - Add manual change to release (admin only)
  app.post("/api/releases/:id/changes", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      const result = insertAppReleaseChangeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const userId = req.user.claims.sub;
      const change = await storage.addChangeToRelease(req.params.id, result.data, userId);
      
      await logAuditEvent(req, {
        action: "add_change",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { changeId: change.id, title: change.title, releaseVersion: release.versionLabel },
      });
      
      res.status(201).json(change);
    } catch (error) {
      console.error("Error adding change to release:", error);
      await logAuditEvent(req, {
        action: "add_change",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { title: req.body.title, category: req.body.category, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to add change to release" });
    }
  });

  // DELETE /api/releases/:id/changes/:changeId - Remove change from release
  app.delete("/api/releases/:id/changes/:changeId", isAdmin, async (req: any, res) => {
    try {
      const release = await storage.getReleaseById(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }

      if (release.status === "released") {
        return res.status(400).json({ message: "Cannot modify a published release" });
      }

      await storage.removeChangeFromRelease(req.params.changeId);
      
      await logAuditEvent(req, {
        action: "remove_change",
        entityType: "release",
        entityId: req.params.id,
        status: "success",
        metadata: { changeId: req.params.changeId, releaseVersion: release.versionLabel },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing change from release:", error);
      await logAuditEvent(req, {
        action: "remove_change",
        entityType: "release",
        entityId: req.params.id,
        status: "failure",
        metadata: { changeId: req.params.changeId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove change from release" });
    }
  });

  // GET /api/releases/suggestions/features - Get suggested features for release
  app.get("/api/releases/suggestions/features", isAdmin, async (req: any, res) => {
    try {
      const lastRelease = await storage.getLatestReleasedVersion();
      const sinceDate = lastRelease?.releaseDate || undefined;
      const features = await storage.getCompletedFeaturesNotInRelease(sinceDate);
      res.json(features);
    } catch (error) {
      console.error("Error fetching suggested features:", error);
      res.status(500).json({ message: "Failed to fetch suggested features" });
    }
  });

  // GET /api/releases/suggestions/issues - Get suggested issues for release
  app.get("/api/releases/suggestions/issues", isAdmin, async (req: any, res) => {
    try {
      const lastRelease = await storage.getLatestReleasedVersion();
      const sinceDate = lastRelease?.releaseDate || undefined;
      const issues = await storage.getFixedIssuesNotInRelease(sinceDate);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching suggested issues:", error);
      res.status(500).json({ message: "Failed to fetch suggested issues" });
    }
  });

  // POST /api/venues/tag-suggestions - Get AI-suggested tags for a venue based on Google Places data
  app.post("/api/venues/tag-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const { googlePlaceData } = req.body;
      
      if (!googlePlaceData) {
        return res.status(400).json({ message: "googlePlaceData is required" });
      }

      const systemPrompt = `You are a venue categorization assistant. Analyze Google Places data and suggest tags that are EXPLICITLY confirmed by the data.

CRITICAL RULES:
1. ONLY suggest tags if the Google Places data EXPLICITLY confirms them
2. DO NOT infer, guess, or assume - if the data doesn't explicitly state it, don't suggest it
3. Be concise - just list the tag names, no explanations needed for each tag
4. If nothing is explicitly confirmed for a category, say "None confirmed"

WHAT TO LOOK FOR:
- Cuisine: The "primaryType" field (e.g., "italian_restaurant" means Italian cuisine)
- Style: The "editorialSummary" for explicit descriptions (e.g., "fine dining", "casual", "romantic", "retro")
- Amenities: Explicit boolean fields like outdoorSeating, liveMusic, servesCocktails, wheelchairAccessibleEntrance, valetParking, etc.

Format your response as plain text with three sections:
CUISINE: [list cuisine types, or "None confirmed"]
STYLE: [list style descriptors, or "None confirmed"]  
AMENITIES: [list amenities, or "None confirmed"]`;

      const userPrompt = `Analyze this venue's Google Places data and suggest appropriate tags:

${JSON.stringify(googlePlaceData, null, 2)}`;

      // Initialize OpenAI client with Replit AI Integrations
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return res.status(500).json({ message: "No response from AI" });
      }

      res.json({ suggestions: responseText });
    } catch (error: any) {
      console.error("Error generating tag suggestions:", error);
      res.status(500).json({ message: "Failed to generate tag suggestions", error: error.message });
    }
  });

  // ==========================================
  // DEALS / SALES PIPELINE ROUTES
  // ==========================================

  // GET /api/deals - Get all deals
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

  // GET /api/deals/:id - Get a single deal
  app.get("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const deal = await dealsService.getById(req.params.id);
      res.json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal");
    }
  });

  // POST /api/deals - Create a new deal
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

  // PATCH /api/deals/:id - Update a deal
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

  // POST /api/deals/reorder - Reorder deals by updating deal_number
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

  // DELETE /api/deals/:id - Delete a deal
  app.delete("/api/deals/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
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

  // GET /api/deals/:dealId/tasks - Get tasks for a deal
  app.get("/api/deals/:dealId/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await dealsService.getTasks(req.params.dealId);
      res.json(tasks);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal tasks");
    }
  });

  // POST /api/deals/:dealId/tasks - Create a task for a deal
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

  // PATCH /api/deals/:dealId/tasks/:taskId - Update a task
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

  // DELETE /api/deals/:dealId/tasks/:taskId - Delete a task
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

  // GET /api/clients - Get all clients
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // GET /api/clients/:id - Get a single client
  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // GET /api/clients/:id/deals - Get deals for a client
  app.get("/api/clients/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
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

  // POST /api/clients - Create a new client
  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      
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

  // PATCH /api/clients/:id - Update a client
  app.patch("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingClient = await storage.getClientById(req.params.id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const validatedData = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      
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

  // DELETE /api/clients/:id - Delete a client
  app.delete("/api/clients/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await storage.deleteClient(req.params.id);
      
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

  // ==========================================
  // CLIENT-CONTACT LINKING
  // ==========================================

  // GET /api/clients/:id/contacts - Get contacts linked to a client
  app.get("/api/clients/:id/contacts", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const contacts = await storage.getContactsForClient(req.params.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ message: "Failed to fetch client contacts" });
    }
  });

  // POST /api/clients/:id/contacts/:contactId - Link a contact to a client
  app.post("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req: any, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const contact = await storage.getContactById(req.params.contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await storage.linkClientContact(req.params.id, req.params.contactId);
      
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

  // DELETE /api/clients/:id/contacts/:contactId - Unlink a contact from a client
  app.delete("/api/clients/:id/contacts/:contactId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.unlinkClientContact(req.params.id, req.params.contactId);
      
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

  // GET /api/contacts/:id/clients - Get clients linked to a contact
  app.get("/api/contacts/:id/clients", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const clients = await storage.getClientsForContact(req.params.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching contact clients:", error);
      res.status(500).json({ message: "Failed to fetch contact clients" });
    }
  });

  // GET /api/contacts/:id/deals - Get deals where contact is primary contact
  app.get("/api/contacts/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const deals = await storage.getDealsByPrimaryContactId(req.params.id);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching contact deals:", error);
      res.status(500).json({ message: "Failed to fetch contact deals" });
    }
  });

  // POST /api/contacts/:id/clients/:clientId - Link a client to a contact
  app.post("/api/contacts/:id/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const client = await storage.getClientById(req.params.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await storage.linkClientContact(req.params.clientId, req.params.id);
      
      await logAuditEvent(req, {
        action: "link",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, clientId: req.params.clientId, clientName: client.name },
      });
      
      res.status(201).json({ message: "Client linked to contact" });
    } catch (error) {
      console.error("Error linking client to contact:", error);
      res.status(500).json({ message: "Failed to link client to contact" });
    }
  });

  // DELETE /api/contacts/:id/clients/:clientId - Unlink a client from a contact
  app.delete("/api/contacts/:id/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      await storage.unlinkClientContact(req.params.clientId, req.params.id);
      
      await logAuditEvent(req, {
        action: "unlink",
        entityType: "client_contact",
        entityId: req.params.id,
        metadata: { contactId: req.params.id, clientId: req.params.clientId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error unlinking client from contact:", error);
      res.status(500).json({ message: "Failed to unlink client from contact" });
    }
  });

  // ==========================================
  // BRANDS
  // ==========================================

  // GET /api/brands - Get all brands
  app.get("/api/brands", isAuthenticated, async (req, res) => {
    try {
      const brands = await storage.getBrands();
      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  // GET /api/brands/:id - Get a single brand
  app.get("/api/brands/:id", isAuthenticated, async (req, res) => {
    try {
      const brand = await storage.getBrandById(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  // POST /api/brands - Create a new brand
  app.post("/api/brands", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(validatedData);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "brand",
        entityId: brand.id,
        metadata: { name: brand.name },
      });
      
      res.status(201).json(brand);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  // PATCH /api/brands/:id - Update a brand
  app.patch("/api/brands/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingBrand = await storage.getBrandById(req.params.id);
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const validatedData = updateBrandSchema.parse(req.body);
      const brand = await storage.updateBrand(req.params.id, validatedData);
      
      const changes = getChangedFields(existingBrand, brand);
      await logAuditEvent(req, {
        action: "update",
        entityType: "brand",
        entityId: req.params.id,
        changes,
      });
      
      res.json(brand);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  // DELETE /api/brands/:id - Delete a brand
  app.delete("/api/brands/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const brand = await storage.getBrandById(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      await storage.deleteBrand(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "brand",
        entityId: req.params.id,
        metadata: { name: brand.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // AI Context endpoints for MCP readiness
  app.use("/api/ai", aiRoutes);

  // MCP Server endpoints
  app.use("/api/mcp", mcpRoutes);

  return httpServer;
}
