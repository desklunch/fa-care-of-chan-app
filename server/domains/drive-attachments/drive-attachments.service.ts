import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  deals,
  venues,
  clients,
  vendors,
  contacts,
  type CreateDriveAttachmentInput,
  type DriveAttachmentEntityType,
  type DriveAttachmentWithUser,
  type GoogleDriveAttachment,
  type UpdateDriveAttachmentInput,
} from "@shared/schema";
import { driveAttachmentsStorage } from "./drive-attachments.storage";
import { domainEvents } from "../../lib/events";
import {
  getDriveFileMetadata,
  extractDriveFileId,
  isDriveFolderUrl,
} from "../../googleDrive";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

async function verifyEntityExists(
  entityType: DriveAttachmentEntityType,
  entityId: string,
): Promise<void> {
  let exists = false;
  switch (entityType) {
    case "deal": {
      const [row] = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, entityId));
      exists = !!row;
      break;
    }
    case "venue": {
      const [row] = await db.select({ id: venues.id }).from(venues).where(eq(venues.id, entityId));
      exists = !!row;
      break;
    }
    case "client": {
      const [row] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, entityId));
      exists = !!row;
      break;
    }
    case "vendor": {
      const [row] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, entityId));
      exists = !!row;
      break;
    }
    case "contact": {
      const [row] = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, entityId));
      exists = !!row;
      break;
    }
  }
  if (!exists) {
    throw new NotFoundError(`${entityType} not found`);
  }
}

export const driveAttachmentsService = {
  verifyEntityExists,

  async getAttachments(
    entityType: string,
    entityId: string,
  ): Promise<DriveAttachmentWithUser[]> {
    return driveAttachmentsStorage.getAttachmentsByEntity(entityType, entityId);
  },

  async createAttachment(
    input: CreateDriveAttachmentInput,
    actorId: string,
    accessToken: string,
  ): Promise<DriveAttachmentWithUser> {
    const { entityType, entityId, driveUrl } = input;
    let { driveFileId, name, mimeType, iconUrl, webViewLink } = input;
    const looksLikeFolder = !!driveUrl && isDriveFolderUrl(driveUrl);
    const itemNoun = looksLikeFolder ? "folder" : "file";
    const trimToNull = (v: string | null | undefined) => {
      if (v === null || v === undefined) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    };
    const label = trimToNull(input.label);
    const description = trimToNull(input.description);

    await verifyEntityExists(entityType, entityId);

    if (driveUrl && !driveFileId) {
      const extractedId = extractDriveFileId(driveUrl);
      if (!extractedId) {
        throw new ValidationError(
          `Could not extract ${itemNoun} ID from the provided Google Drive URL`,
        );
      }
      driveFileId = extractedId;
    }

    if (!driveFileId) {
      throw new ValidationError(`Drive ${itemNoun} ID is required`);
    }

    try {
      const metadata = await getDriveFileMetadata(driveFileId, accessToken);
      name = metadata.name || name;
      mimeType = metadata.mimeType || mimeType;
      iconUrl = metadata.iconLink || iconUrl;
      webViewLink = metadata.webViewLink || webViewLink;
    } catch (err) {
      console.error("Failed to fetch Drive file metadata:", err);
      throw new ValidationError(
        `Could not verify this Google Drive ${itemNoun}. Please check the ${itemNoun} exists and is accessible.`,
      );
    }

    if (!name) {
      throw new ValidationError(
        `Could not resolve ${itemNoun} metadata from Google Drive`,
      );
    }

    const attachment = await driveAttachmentsStorage.createAttachment({
      entityType,
      entityId,
      driveFileId,
      name,
      mimeType: mimeType || null,
      iconUrl: iconUrl || null,
      webViewLink: webViewLink || null,
      label,
      description,
      attachedById: actorId,
    });

    const attachmentWithUser =
      (await driveAttachmentsStorage.getAttachmentById(attachment.id)) ?? {
        ...attachment,
        attachedBy: null,
      };

    domainEvents.emit({
      type: "drive_attachment:created",
      attachmentId: attachment.id,
      entityType,
      entityId,
      driveFileId,
      fileName: name,
      actorId,
      timestamp: new Date(),
    });

    return attachmentWithUser;
  },

  async updateAttachment(
    attachmentId: string,
    input: UpdateDriveAttachmentInput,
    actorId: string,
    hasDeletePermission: boolean,
  ): Promise<DriveAttachmentWithUser> {
    const existing = await driveAttachmentsStorage.getAttachmentById(attachmentId);
    if (!existing) {
      throw new NotFoundError("Attachment not found");
    }

    if (existing.attachedById !== actorId && !hasDeletePermission) {
      throw new ForbiddenError("You can only edit attachments you added");
    }

    const trimToNull = (v: string | null | undefined) => {
      if (v === null) return null;
      if (v === undefined) return undefined;
      const t = v.trim();
      return t.length === 0 ? null : t;
    };

    const updates: { label?: string | null; description?: string | null } = {};
    const label = trimToNull(input.label);
    const description = trimToNull(input.description);
    if (label !== undefined) updates.label = label;
    if (description !== undefined) updates.description = description;

    await driveAttachmentsStorage.updateAttachment(attachmentId, updates);

    const updated = await driveAttachmentsStorage.getAttachmentById(attachmentId);
    return updated ?? { ...existing };
  },

  async deleteAttachment(
    attachmentId: string,
    actorId: string,
    hasDeletePermission: boolean,
  ): Promise<GoogleDriveAttachment> {
    const existing = await driveAttachmentsStorage.getAttachmentById(attachmentId);
    if (!existing) {
      throw new NotFoundError("Attachment not found");
    }

    if (existing.attachedById !== actorId && !hasDeletePermission) {
      throw new ForbiddenError("You can only remove attachments you added");
    }

    await driveAttachmentsStorage.deleteAttachment(attachmentId);

    domainEvents.emit({
      type: "drive_attachment:deleted",
      attachmentId,
      entityType: existing.entityType,
      entityId: existing.entityId,
      fileName: existing.name,
      deletedByOther: existing.attachedById !== actorId,
      actorId,
      timestamp: new Date(),
    });

    return existing;
  },
};
