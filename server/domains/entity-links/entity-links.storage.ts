import { db } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import {
  entityLinks,
  users,
  type EntityLink,
  type EntityLinkWithUser,
} from "@shared/schema";

export const entityLinksStorage = {
  async getLinks(entityType: string, entityId: string): Promise<EntityLinkWithUser[]> {
    const results = await db
      .select({
        id: entityLinks.id,
        entityType: entityLinks.entityType,
        entityId: entityLinks.entityId,
        url: entityLinks.url,
        label: entityLinks.label,
        previewTitle: entityLinks.previewTitle,
        previewDescription: entityLinks.previewDescription,
        previewImage: entityLinks.previewImage,
        createdById: entityLinks.createdById,
        createdAt: entityLinks.createdAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(entityLinks)
      .leftJoin(users, eq(entityLinks.createdById, users.id))
      .where(
        and(
          eq(entityLinks.entityType, entityType),
          eq(entityLinks.entityId, entityId),
        ),
      )
      .orderBy(desc(entityLinks.createdAt));
    return results as EntityLinkWithUser[];
  },

  async createLink(data: {
    entityType: string;
    entityId: string;
    url: string;
    label?: string | null;
    previewTitle?: string | null;
    previewDescription?: string | null;
    previewImage?: string | null;
    createdById: string;
  }): Promise<EntityLink> {
    const [link] = await db
      .insert(entityLinks)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        url: data.url,
        label: data.label || null,
        previewTitle: data.previewTitle || null,
        previewDescription: data.previewDescription || null,
        previewImage: data.previewImage || null,
        createdById: data.createdById,
      })
      .returning();
    return link;
  },

  async getLinkById(linkId: string): Promise<EntityLink | null> {
    const [link] = await db
      .select()
      .from(entityLinks)
      .where(eq(entityLinks.id, linkId));
    return link || null;
  },

  async deleteLink(linkId: string): Promise<void> {
    await db.delete(entityLinks).where(eq(entityLinks.id, linkId));
  },
};
