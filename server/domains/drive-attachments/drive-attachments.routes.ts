import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { loadPermissions, checkPermission, checkAnyPermission } from "../../middleware/permissions";
import { logAuditEvent } from "../../audit";
import { driveAttachmentsStorage } from "./drive-attachments.storage";
import { driveAttachmentEntityTypes, type DriveAttachmentEntityType } from "@shared/schema";
import { getDriveFileMetadata, extractDriveFileId } from "../../googleDrive";
import type { Permission } from "../../../shared/permissions";
import { z } from "zod";
import { ReplitConnectors } from "@replit/connectors-sdk";

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

const MINIMUM_DRIVE_ACCESS_PERMISSIONS: Permission[] = [
  "venues.write",
  "clients.write",
  "contacts.write",
  "vendors.write",
  "deals.read",
];

const createAttachmentSchema = z.object({
  entityType: z.enum(driveAttachmentEntityTypes),
  entityId: z.string().min(1),
  driveFileId: z.string().optional(),
  driveUrl: z.string().url().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  iconUrl: z.string().optional(),
  webViewLink: z.string().optional(),
}).refine(
  (data) => data.driveFileId || data.driveUrl,
  { message: "Either driveFileId or driveUrl must be provided" }
);

export function registerDriveAttachmentsRoutes(app: Express): void {
  app.get("/api/drive-attachments/:entityType/:entityId", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;

      if (!driveAttachmentEntityTypes.includes(entityType as DriveAttachmentEntityType)) {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      const readPerm = ATTACHMENT_READ_PERMISSIONS[entityType as DriveAttachmentEntityType];
      if (!checkPermission(req, readPerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attachments = await driveAttachmentsStorage.getAttachmentsByEntity(entityType, entityId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching drive attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/drive-attachments", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = createAttachmentSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const { entityType, entityId, driveUrl } = result.data;
      let { driveFileId, name, mimeType, iconUrl, webViewLink } = result.data;

      const writePerm = ATTACHMENT_WRITE_PERMISSIONS[entityType];
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (driveUrl && !driveFileId) {
        const extractedId = extractDriveFileId(driveUrl);
        if (!extractedId) {
          return res.status(400).json({ message: "Could not extract file ID from the provided Google Drive URL" });
        }
        driveFileId = extractedId;
      }

      if (!driveFileId) {
        return res.status(400).json({ message: "Drive file ID is required" });
      }

      try {
        const metadata = await getDriveFileMetadata(driveFileId);
        name = metadata.name || name;
        mimeType = metadata.mimeType || mimeType;
        iconUrl = metadata.iconLink || iconUrl;
        webViewLink = metadata.webViewLink || webViewLink;
      } catch (err) {
        console.error("Failed to fetch Drive file metadata:", err);
        return res.status(422).json({
          message: "Could not verify this Google Drive file. Please check the file exists and is accessible.",
        });
      }

      if (!name) {
        return res.status(422).json({ message: "Could not resolve file metadata from Google Drive" });
      }

      const attachment = await driveAttachmentsStorage.createAttachment({
        entityType,
        entityId,
        driveFileId,
        name: name!,
        mimeType: mimeType || null,
        iconUrl: iconUrl || null,
        webViewLink: webViewLink || null,
        attachedById: userId,
      });

      const attachmentWithUser = await driveAttachmentsStorage.getAttachmentById(attachment.id);

      await logAuditEvent(req, {
        action: "create",
        entityType: "drive_attachment",
        entityId: attachment.id,
        status: "success",
        metadata: { targetEntityType: entityType, targetEntityId: entityId, fileName: name },
      });

      res.status(201).json(attachmentWithUser);
    } catch (error) {
      console.error("Error creating drive attachment:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "drive_attachment",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
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

      const writePerm = ATTACHMENT_WRITE_PERMISSIONS[existing.entityType as DriveAttachmentEntityType];
      if (!checkPermission(req, writePerm)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (existing.attachedById !== userId) {
        const user = await driveAttachmentsStorage.getUser(userId);
        if (!user || user.role !== "admin") {
          return res.status(403).json({ message: "You can only remove attachments you added" });
        }
      }

      await driveAttachmentsStorage.deleteAttachment(attachmentId);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "drive_attachment",
        entityId: attachmentId,
        status: "success",
        metadata: {
          targetEntityType: existing.entityType,
          targetEntityId: existing.entityId,
          fileName: existing.name,
          deletedByAdmin: existing.attachedById !== userId,
        },
      });

      res.json({ message: "Attachment deleted successfully" });
    } catch (error) {
      console.error("Error deleting drive attachment:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "drive_attachment",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  app.get("/api/drive/search", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      if (!checkAnyPermission(req, MINIMUM_DRIVE_ACCESS_PERMISSIONS)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const query = req.query.q as string || "";
      const pageToken = req.query.pageToken as string || "";

      const connectors = new ReplitConnectors();

      const params = new URLSearchParams({
        fields: "files(id,name,mimeType,iconLink,webViewLink,modifiedTime,owners),nextPageToken",
        pageSize: "20",
        orderBy: "modifiedByMeTime desc,viewedByMeTime desc",
      });

      if (query) {
        const words = query.trim().split(/\s+/).filter(Boolean);
        const clauses = words.map((word) => {
          const escaped = word.replace(/'/g, "\\'");
          return `name contains '${escaped}'`;
        });
        params.set("q", `${clauses.join(" and ")} and trashed=false`);
      } else {
        params.set("q", "trashed=false");
      }

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const apiPath = `/drive/v3/files?${params.toString()}`;

      const response = await connectors.proxy("google-drive", apiPath, { method: "GET" });
      if (!response.ok) {
        return res.status(502).json({ message: "Failed to search Drive files" });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error searching Drive files:", error);
      res.status(500).json({ message: "Failed to search Drive files" });
    }
  });
}
