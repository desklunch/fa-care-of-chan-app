import { db } from "../../db";
import { and, desc, eq } from "drizzle-orm";
import {
  googleDriveAttachments,
  users,
  type DriveAttachmentWithUser,
} from "@shared/schema";

const attachmentSelect = {
  id: googleDriveAttachments.id,
  entityType: googleDriveAttachments.entityType,
  entityId: googleDriveAttachments.entityId,
  driveFileId: googleDriveAttachments.driveFileId,
  name: googleDriveAttachments.name,
  mimeType: googleDriveAttachments.mimeType,
  iconUrl: googleDriveAttachments.iconUrl,
  webViewLink: googleDriveAttachments.webViewLink,
  label: googleDriveAttachments.label,
  description: googleDriveAttachments.description,
  attachedById: googleDriveAttachments.attachedById,
  attachedAt: googleDriveAttachments.attachedAt,
  attachedBy: {
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
  },
};

export const driveAttachmentsStorage = {
  async getAttachmentsByEntity(
    entityType: string,
    entityId: string
  ): Promise<DriveAttachmentWithUser[]> {
    const results = await db
      .select(attachmentSelect)
      .from(googleDriveAttachments)
      .leftJoin(users, eq(googleDriveAttachments.attachedById, users.id))
      .where(
        and(
          eq(googleDriveAttachments.entityType, entityType),
          eq(googleDriveAttachments.entityId, entityId)
        )
      )
      .orderBy(desc(googleDriveAttachments.attachedAt));

    return results as DriveAttachmentWithUser[];
  },

  async getAttachmentById(id: string): Promise<DriveAttachmentWithUser | null> {
    const [result] = await db
      .select(attachmentSelect)
      .from(googleDriveAttachments)
      .leftJoin(users, eq(googleDriveAttachments.attachedById, users.id))
      .where(eq(googleDriveAttachments.id, id));

    return (result as DriveAttachmentWithUser) || null;
  },

  async createAttachment(data: {
    entityType: string;
    entityId: string;
    driveFileId: string;
    name: string;
    mimeType?: string | null;
    iconUrl?: string | null;
    webViewLink?: string | null;
    label?: string | null;
    description?: string | null;
    attachedById: string;
  }) {
    const [attachment] = await db
      .insert(googleDriveAttachments)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        driveFileId: data.driveFileId,
        name: data.name,
        mimeType: data.mimeType || null,
        iconUrl: data.iconUrl || null,
        webViewLink: data.webViewLink || null,
        label: data.label || null,
        description: data.description || null,
        attachedById: data.attachedById,
      })
      .returning();
    return attachment;
  },

  async updateAttachment(
    id: string,
    data: { label?: string | null; description?: string | null },
  ) {
    const updates: { label?: string | null; description?: string | null } = {};
    if (data.label !== undefined) updates.label = data.label;
    if (data.description !== undefined) updates.description = data.description;
    if (Object.keys(updates).length === 0) return;
    await db
      .update(googleDriveAttachments)
      .set(updates)
      .where(eq(googleDriveAttachments.id, id));
  },

  async deleteAttachment(id: string): Promise<void> {
    await db
      .delete(googleDriveAttachments)
      .where(eq(googleDriveAttachments.id, id));
  },
};
