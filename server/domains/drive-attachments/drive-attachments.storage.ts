import { db } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import {
  googleDriveAttachments,
  users,
  type DriveAttachmentWithUser,
} from "@shared/schema";

export const driveAttachmentsStorage = {
  async getAttachmentsByEntity(
    entityType: string,
    entityId: string
  ): Promise<DriveAttachmentWithUser[]> {
    const results = await db
      .select({
        id: googleDriveAttachments.id,
        entityType: googleDriveAttachments.entityType,
        entityId: googleDriveAttachments.entityId,
        driveFileId: googleDriveAttachments.driveFileId,
        name: googleDriveAttachments.name,
        mimeType: googleDriveAttachments.mimeType,
        iconUrl: googleDriveAttachments.iconUrl,
        webViewLink: googleDriveAttachments.webViewLink,
        attachedById: googleDriveAttachments.attachedById,
        attachedAt: googleDriveAttachments.attachedAt,
        attachedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
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
      .select({
        id: googleDriveAttachments.id,
        entityType: googleDriveAttachments.entityType,
        entityId: googleDriveAttachments.entityId,
        driveFileId: googleDriveAttachments.driveFileId,
        name: googleDriveAttachments.name,
        mimeType: googleDriveAttachments.mimeType,
        iconUrl: googleDriveAttachments.iconUrl,
        webViewLink: googleDriveAttachments.webViewLink,
        attachedById: googleDriveAttachments.attachedById,
        attachedAt: googleDriveAttachments.attachedAt,
        attachedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
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
        attachedById: data.attachedById,
      })
      .returning();
    return attachment;
  },

  async deleteAttachment(id: string): Promise<void> {
    await db
      .delete(googleDriveAttachments)
      .where(eq(googleDriveAttachments.id, id));
  },

  async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  },
};
