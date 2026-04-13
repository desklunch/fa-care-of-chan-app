import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { settingsCommentsStorage } from "./settings-comments.storage";
import {
  themeConfigSchema,
  insertCommentSchema,
  updateCommentSchema,
  commentEntityTypes,
} from "@shared/schema";
import { domainEvents } from "../../lib/events";

export function registerSettingsCommentsRoutes(app: Express): void {
  // ===== THEME SETTINGS ROUTES =====

  app.get("/api/settings/theme", async (req, res) => {
    try {
      const theme = await settingsCommentsStorage.getTheme();
      res.json(theme);
    } catch (error) {
      console.error("Error fetching theme:", error);
      res.status(500).json({ message: "Failed to fetch theme" });
    }
  });

  app.patch("/api/settings/theme", isAuthenticated, requirePermission("theme.manage"), async (req: any, res) => {
    try {
      const result = themeConfigSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid theme data", errors: result.error.errors });
      }

      const userId = req.user.claims.sub;
      const setting = await settingsCommentsStorage.setTheme(result.data, userId);

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

  // ===== DEAL SUMMARY TEMPLATE SETTING =====

  app.get("/api/settings/deal-summary-template", isAuthenticated, requirePermission("admin.settings"), async (_req, res) => {
    try {
      const value = await settingsCommentsStorage.getAppSetting("deal_summary_template_sheet_id");
      res.json({ templateSheetId: value || "" });
    } catch (error) {
      console.error("Error fetching deal summary template setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.patch("/api/settings/deal-summary-template", isAuthenticated, requirePermission("admin.settings"), async (req: any, res) => {
    try {
      const { templateSheetId } = req.body;
      if (typeof templateSheetId !== "string") {
        return res.status(400).json({ message: "templateSheetId must be a string" });
      }
      const userId = req.user.claims.sub;
      await settingsCommentsStorage.setAppSetting("deal_summary_template_sheet_id", templateSheetId, userId);

      await logAuditEvent(req, {
        action: "update",
        entityType: "app_setting",
        entityId: "deal_summary_template_sheet_id",
        status: "success",
        metadata: { key: "deal_summary_template_sheet_id" },
      });

      res.json({ templateSheetId });
    } catch (error) {
      console.error("Error updating deal summary template setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // ===== ENTITY COMMENTS ROUTES =====

  app.get("/api/comments", isAuthenticated, async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (entityType && !commentEntityTypes.includes(entityType as any)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const comments = await settingsCommentsStorage.getAllComments({ entityType, limit });
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.get("/api/comments/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      if (!commentEntityTypes.includes(entityType as any)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const comments = await settingsCommentsStorage.getCommentsByEntity(entityType, entityId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const result = insertCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      if (result.data.parentId) {
        const parentComment = await settingsCommentsStorage.getEntityCommentById(result.data.parentId);
        if (!parentComment) {
          return res.status(404).json({ message: "Parent comment not found" });
        }
        if (parentComment.parentId) {
          return res.status(400).json({ message: "Cannot reply to a reply. Only single-level replies are supported." });
        }
      }

      const comment = await settingsCommentsStorage.createEntityComment(result.data, userId);
      const commentWithAuthor = await settingsCommentsStorage.getEntityCommentById(comment.id);

      await logAuditEvent(req, {
        action: "create",
        entityType: "comment",
        entityId: comment.id,
        status: "success",
        metadata: { targetEntityType: result.data.entityType, targetEntityId: result.data.entityId },
      });

      if (result.data.parentId) {
        const parentComment = await settingsCommentsStorage.getEntityCommentById(result.data.parentId);
        if (parentComment) {
          domainEvents.emit({
            type: "comment:reply_created",
            commentId: comment.id,
            body: result.data.body,
            entityType: result.data.entityType,
            entityId: result.data.entityId,
            parentCommentId: result.data.parentId,
            parentCommentAuthorId: parentComment.createdById,
            authorId: userId,
            actorId: userId,
            timestamp: new Date(),
          });
        }
      } else {
        domainEvents.emit({
          type: "comment:created",
          commentId: comment.id,
          body: result.data.body,
          entityType: result.data.entityType,
          entityId: result.data.entityId,
          authorId: userId,
          actorId: userId,
          timestamp: new Date(),
        });
      }

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

  app.patch("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = req.params.id;

      const existingComment = await settingsCommentsStorage.getEntityCommentById(commentId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (existingComment.deletedAt) {
        return res.status(400).json({ message: "Cannot edit a deleted comment" });
      }

      if (existingComment.createdById !== userId) {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }

      const result = updateCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const updatedComment = await settingsCommentsStorage.updateEntityComment(commentId, result.data.body);
      const commentWithAuthor = await settingsCommentsStorage.getEntityCommentById(commentId);

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

  app.delete("/api/comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentId = req.params.id;

      const existingComment = await settingsCommentsStorage.getEntityCommentById(commentId);
      if (!existingComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (existingComment.deletedAt) {
        return res.status(400).json({ message: "Comment already deleted" });
      }

      const user = await settingsCommentsStorage.getUser(userId);
      const isAdminUser = user?.role === "admin";

      if (existingComment.createdById !== userId && !isAdminUser) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      await settingsCommentsStorage.softDeleteEntityComment(commentId);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "comment",
        entityId: commentId,
        status: "success",
        metadata: {
          targetEntityType: existingComment.entityType,
          targetEntityId: existingComment.entityId,
          deletedByAdmin: existingComment.createdById !== userId,
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
}
