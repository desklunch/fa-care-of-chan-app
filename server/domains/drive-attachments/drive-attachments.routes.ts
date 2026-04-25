import type { Express } from "express";
import { isAuthenticated, getDriveAccessToken } from "../../googleAuth";
import { loadPermissions, checkPermission, checkAnyPermission } from "../../middleware/permissions";
import {
  driveAttachmentsService,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "./drive-attachments.service";
import { driveAttachmentsStorage } from "./drive-attachments.storage";
import {
  driveAttachmentEntityTypes,
  createDriveAttachmentSchema,
  updateDriveAttachmentSchema,
  getEntityPermissionPrefix,
  type DriveAttachmentEntityType,
} from "@shared/schema";
import { searchDriveFiles, listDriveFolders } from "../../googleDrive";
import type { Permission } from "../../../shared/permissions";

const MINIMUM_DRIVE_ACCESS_PERMISSIONS: Permission[] = [
  "venues.write",
  "clients.write",
  "contacts.write",
  "vendors.write",
  "deals.read",
];

function isValidEntityType(value: string): value is DriveAttachmentEntityType {
  return (driveAttachmentEntityTypes as readonly string[]).includes(value);
}

export function registerDriveAttachmentsRoutes(app: Express): void {
  app.get("/api/drive-attachments/:entityType/:entityId", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;

      if (!isValidEntityType(entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const readPerm = `${getEntityPermissionPrefix(entityType)}.read` as Permission;
      if (!checkPermission(req, readPerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attachments = await driveAttachmentsService.getAttachments(entityType, entityId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching drive attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  async function handleCreateAttachment(req: any, res: any, body: unknown) {
    try {
      const userId = req.user.claims.sub;
      const result = createDriveAttachmentSchema.safeParse(body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const writePerm = `${getEntityPermissionPrefix(result.data.entityType)}.write` as Permission;
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const accessToken = await getDriveAccessToken(userId, req.session);
      if (!accessToken) {
        return res.status(403).json({
          message: "Google Drive access not authorized",
          code: "drive_auth_required",
        });
      }

      const attachment = await driveAttachmentsService.createAttachment(
        result.data,
        userId,
        accessToken,
      );

      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof ValidationError) {
        return res.status(422).json({ message: error.message });
      }
      console.error("Error creating drive attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  }

  async function handleDeleteAttachment(req: any, res: any, attachmentId: string, expectedEntityType?: string, expectedEntityId?: string) {
    try {
      const userId = req.user.claims.sub;

      const existing = await driveAttachmentsStorage.getAttachmentById(attachmentId);
      if (!existing) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      if (!isValidEntityType(existing.entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }
      if (expectedEntityType && existing.entityType !== expectedEntityType) {
        return res.status(400).json({ message: "entityType in path does not match attachment" });
      }
      if (expectedEntityId && existing.entityId !== expectedEntityId) {
        return res.status(400).json({ message: "entityId in path does not match attachment" });
      }

      const prefix = getEntityPermissionPrefix(existing.entityType);
      const writePerm = `${prefix}.write` as Permission;
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const deletePerm = `${prefix}.delete` as Permission;
      const hasDeleteAny = checkPermission(req, deletePerm);

      await driveAttachmentsService.deleteAttachment(attachmentId, userId, hasDeleteAny);

      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof ForbiddenError) {
        return res.status(403).json({ message: error.message });
      }
      console.error("Error deleting drive attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  }

  // Standardized create — entityType/entityId in path per docs/universal-utilities.md §3.
  app.post("/api/drive-attachments/:entityType/:entityId", isAuthenticated, loadPermissions, async (req: any, res) => {
    const { entityType, entityId } = req.params;
    await handleCreateAttachment(req, res, { ...req.body, entityType, entityId });
  });

  // Legacy create — entityType/entityId in body. Kept temporarily for backward compatibility.
  app.post("/api/drive-attachments", isAuthenticated, loadPermissions, async (req: any, res) => {
    console.warn(
      `[deprecated] POST /api/drive-attachments (entityType/entityId in body) — use POST /api/drive-attachments/:entityType/:entityId instead`,
    );
    await handleCreateAttachment(req, res, req.body);
  });

  app.patch("/api/drive-attachments/:entityType/:entityId/:id", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId, id } = req.params;

      const existing = await driveAttachmentsStorage.getAttachmentById(id);
      if (!existing) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      if (!isValidEntityType(existing.entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }
      if (existing.entityType !== entityType || existing.entityId !== entityId) {
        return res.status(400).json({ message: "entityType/entityId in path does not match attachment" });
      }

      const prefix = getEntityPermissionPrefix(existing.entityType);
      const writePerm = `${prefix}.write` as Permission;
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const parsed = updateDriveAttachmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const deletePerm = `${prefix}.delete` as Permission;
      const hasDeleteAny = checkPermission(req, deletePerm);

      const updated = await driveAttachmentsService.updateAttachment(
        id,
        parsed.data,
        userId,
        hasDeleteAny,
      );
      res.json(updated);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof ForbiddenError) {
        return res.status(403).json({ message: error.message });
      }
      if (error instanceof ValidationError) {
        return res.status(422).json({ message: error.message });
      }
      console.error("Error updating drive attachment:", error);
      res.status(500).json({ message: "Failed to update attachment" });
    }
  });

  // Standardized delete — entityType/entityId in path per docs/universal-utilities.md §3.
  app.delete("/api/drive-attachments/:entityType/:entityId/:id", isAuthenticated, loadPermissions, async (req: any, res) => {
    const { entityType, entityId, id } = req.params;
    await handleDeleteAttachment(req, res, id, entityType, entityId);
  });

  // Legacy delete — :id only, no parent in path. Kept temporarily for backward compatibility.
  app.delete("/api/drive-attachments/:id", isAuthenticated, loadPermissions, async (req: any, res) => {
    console.warn(
      `[deprecated] DELETE /api/drive-attachments/:id — use DELETE /api/drive-attachments/:entityType/:entityId/:id instead (id=${req.params.id})`,
    );
    await handleDeleteAttachment(req, res, req.params.id);
  });

  app.get("/api/drive/search", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      if (!checkAnyPermission(req, MINIMUM_DRIVE_ACCESS_PERMISSIONS)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const accessToken = await getDriveAccessToken(req.user.claims.sub, req.session);
      if (!accessToken) {
        return res.status(403).json({
          message: "Google Drive access not authorized",
          code: "drive_auth_required",
        });
      }

      const query = req.query.q as string || "";
      const pageToken = req.query.pageToken as string || "";
      const parentId = req.query.parentId as string || "";

      const data = await searchDriveFiles(
        accessToken,
        query,
        pageToken || undefined,
        parentId || undefined,
      );
      res.json(data);
    } catch (error) {
      console.error("Error searching Drive files:", error);
      res.status(500).json({ message: "Failed to search Drive files" });
    }
  });

  app.get("/api/drive/folders", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      if (!checkAnyPermission(req, MINIMUM_DRIVE_ACCESS_PERMISSIONS)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const accessToken = await getDriveAccessToken(req.user.claims.sub, req.session);
      if (!accessToken) {
        return res.status(403).json({
          message: "Google Drive access not authorized",
          code: "drive_auth_required",
        });
      }

      const parentId = req.query.parentId as string | undefined;
      const data = await listDriveFolders(accessToken, parentId || undefined);
      res.json(data);
    } catch (error) {
      console.error("Error listing Drive folders:", error);
      res.status(500).json({ message: "Failed to list Drive folders" });
    }
  });
}
