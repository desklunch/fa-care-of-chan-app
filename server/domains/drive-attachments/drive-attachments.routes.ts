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
  type DriveAttachmentEntityType,
} from "@shared/schema";
import { searchDriveFiles, listDriveFolders } from "../../googleDrive";
import type { Permission } from "../../../shared/permissions";

const ATTACHMENT_READ_PERMISSIONS: Record<DriveAttachmentEntityType, Permission> = {
  deal: "deals.read",
  venue: "venues.write",
  client: "clients.write",
  vendor: "vendors.write",
  contact: "contacts.write",
};

const ATTACHMENT_WRITE_PERMISSIONS: Record<DriveAttachmentEntityType, Permission> = {
  deal: "deals.write",
  venue: "venues.write",
  client: "clients.write",
  vendor: "vendors.write",
  contact: "contacts.write",
};

const ATTACHMENT_DELETE_PERMISSIONS: Record<DriveAttachmentEntityType, Permission> = {
  deal: "deals.delete",
  venue: "venues.delete",
  client: "clients.delete",
  vendor: "vendors.delete",
  contact: "contacts.delete",
};

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

      const readPerm = ATTACHMENT_READ_PERMISSIONS[entityType];
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

  app.post("/api/drive-attachments", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = createDriveAttachmentSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const writePerm = ATTACHMENT_WRITE_PERMISSIONS[result.data.entityType];
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const accessToken = await getDriveAccessToken(req.session);
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
  });

  app.delete("/api/drive-attachments/:id", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attachmentId = req.params.id;

      const existing = await driveAttachmentsStorage.getAttachmentById(attachmentId);
      if (!existing) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      if (!isValidEntityType(existing.entityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const writePerm = ATTACHMENT_WRITE_PERMISSIONS[existing.entityType];
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const deletePerm = ATTACHMENT_DELETE_PERMISSIONS[existing.entityType];
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
  });

  app.get("/api/drive/search", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      if (!checkAnyPermission(req, MINIMUM_DRIVE_ACCESS_PERMISSIONS)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const accessToken = await getDriveAccessToken(req.session);
      if (!accessToken) {
        return res.status(403).json({
          message: "Google Drive access not authorized",
          code: "drive_auth_required",
        });
      }

      const query = req.query.q as string || "";
      const pageToken = req.query.pageToken as string || "";

      const data = await searchDriveFiles(accessToken, query, pageToken || undefined);
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

      const accessToken = await getDriveAccessToken(req.session);
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
