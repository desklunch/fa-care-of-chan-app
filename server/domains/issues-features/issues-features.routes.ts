import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { issuesFeaturesStorage } from "./issues-features.storage";
import {
  insertAppFeatureSchema,
  updateAppFeatureSchema,
  insertFeatureCommentSchema,
  insertAppIssueSchema,
  updateAppIssueSchema,
  insertFeatureCategorySchema,
  updateFeatureCategorySchema,
  type FeatureStatus,
} from "@shared/schema";
import { storage } from "../../storage";
import { domainEvents } from "../../lib/events";
import { notificationsStorage } from "../notifications/notifications.storage";

export function registerIssuesFeaturesRoutes(app: Express): void {
  // ===== FEATURES ROUTES =====

  app.get("/api/features", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const statusFilter = req.query.status
        ? (req.query.status as string).split(",") as FeatureStatus[]
        : undefined;
      const categoryId = req.query.categoryId as string | undefined;

      const features = await issuesFeaturesStorage.getFeatures({
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

  app.get("/api/features/:id", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feature = await issuesFeaturesStorage.getFeatureById(req.params.id, userId);
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

      const category = await issuesFeaturesStorage.getCategoryById(result.data.categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({ message: "Invalid category" });
      }

      const userId = req.user.claims.sub;
      const feature = await issuesFeaturesStorage.createFeature(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "feature",
        entityId: feature.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      void notificationsStorage.createFollow(userId, "app_feature", feature.id).catch(() => {});

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

  app.patch("/api/features/reorder", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }

      const validStatuses: FeatureStatus[] = ["proposed", "under_review", "planned", "in_progress", "completed", "archived"];
      for (const update of updates) {
        if (!update.id || typeof update.sortOrder !== "number") {
          return res.status(400).json({ message: "Each update must have id and sortOrder" });
        }
        if (update.status !== undefined && !validStatuses.includes(update.status)) {
          return res.status(400).json({ message: `Invalid status: ${update.status}` });
        }
      }

      await issuesFeaturesStorage.reorderFeatures(updates);

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
      const user = await issuesFeaturesStorage.getUser(userId);
      const feature = await issuesFeaturesStorage.getFeatureById(req.params.id);

      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

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

      let updateData = result.data;
      if (!isAdminUser) {
        updateData = {
          title: result.data.title,
          description: result.data.description,
          categoryId: result.data.categoryId,
        };
      }

      if (updateData.status !== undefined) {
        const wasCompleted = feature.status === "completed";
        const isNowCompleted = updateData.status === "completed";

        if (!wasCompleted && isNowCompleted) {
          (updateData as any).completedAt = new Date();
        } else if (wasCompleted && !isNowCompleted) {
          (updateData as any).completedAt = null;
        }
      }

      const updated = await issuesFeaturesStorage.updateFeature(req.params.id, updateData);

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

  app.delete("/api/features/:id", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
    try {
      const feature = await issuesFeaturesStorage.getFeatureById(req.params.id);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      await issuesFeaturesStorage.deleteFeature(req.params.id);

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

  app.post("/api/features/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const featureId = req.params.id;

      const feature = await issuesFeaturesStorage.getFeatureById(featureId);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      const result = await issuesFeaturesStorage.toggleVote(featureId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling vote:", error);
      res.status(500).json({ message: "Failed to toggle vote" });
    }
  });

  app.get("/api/features/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const comments = await issuesFeaturesStorage.getComments(req.params.id);
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

      const feature = await issuesFeaturesStorage.getFeatureById(req.params.id);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      const userId = req.user.claims.sub;
      const comment = await issuesFeaturesStorage.createComment(req.params.id, userId, result.data.body);

      await logAuditEvent(req, {
        action: "create",
        entityType: "feature_comment",
        entityId: comment.id,
        metadata: { featureId: req.params.id },
      });

      domainEvents.emit({
        type: "feature_comment:created",
        commentId: comment.id,
        body: result.data.body,
        featureId: req.params.id,
        featureTitle: feature.title,
        featureCreatedById: feature.createdById,
        authorId: userId,
        actorId: userId,
        timestamp: new Date(),
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
      const user = await issuesFeaturesStorage.getUser(userId);
      const comments = await issuesFeaturesStorage.getComments(req.params.featureId);
      const comment = comments.find((c) => c.id === req.params.commentId);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (comment.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }

      await issuesFeaturesStorage.deleteComment(req.params.commentId);

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

  // ===== APP ISSUES ROUTES =====

  app.get("/api/app-issues", isAuthenticated, async (req: any, res) => {
    try {
      const statusFilter = req.query.status
        ? (req.query.status as string).split(",") as any[]
        : undefined;
      const severity = req.query.severity as string | undefined;

      const issues = await issuesFeaturesStorage.getIssues({
        status: statusFilter,
        severity,
      });
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.get("/api/app-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const issue = await issuesFeaturesStorage.getIssueById(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

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
      const issue = await issuesFeaturesStorage.createIssue(result.data, userId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "app_issue",
        entityId: issue.id,
        changes: { after: result.data as Record<string, unknown> },
      });

      void notificationsStorage.createFollow(userId, "app_issue", issue.id).catch(() => {});

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

  app.patch("/api/app-issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await issuesFeaturesStorage.getUser(userId);
      const issue = await issuesFeaturesStorage.getIssueById(req.params.id);

      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

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

      let updateData = result.data;
      if (!isAdminUser) {
        updateData = {
          title: result.data.title,
          description: result.data.description,
          severity: result.data.severity,
        };
      }

      const updated = await issuesFeaturesStorage.updateIssue(req.params.id, updateData);

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

  app.delete("/api/app-issues/:id", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
    try {
      const issue = await issuesFeaturesStorage.getIssueById(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      await issuesFeaturesStorage.deleteIssue(req.params.id);

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

  // ===== FEATURE CATEGORIES ROUTES =====

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

  app.post("/api/admin/categories", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
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

  app.patch("/api/admin/categories/:id", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
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

  app.put("/api/admin/categories/order", isAuthenticated, requirePermission("app_features.manage"), async (req: any, res) => {
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
}
