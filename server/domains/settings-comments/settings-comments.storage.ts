import { db } from "../../db";
import { eq, desc, and, isNull } from "drizzle-orm";
import {
  appSettings,
  comments,
  users,
  type AppSetting,
  type Comment,
} from "@shared/schema";

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  replies?: CommentWithAuthor[];
}

export const settingsCommentsStorage = {
  async getAppSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);
    if (!setting) return null;
    return setting.value as string;
  },

  async setAppSetting(key: string, value: string | number | boolean | Record<string, unknown>, userId: string): Promise<void> {
    const jsonValue: unknown = value;
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(appSettings)
        .set({ value: jsonValue, updatedBy: userId, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
    } else {
      await db
        .insert(appSettings)
        .values({ key, value: jsonValue, updatedBy: userId });
    }
  },

  async getTheme(): Promise<{
    light: Record<string, string>;
    dark: Record<string, string>;
  }> {
    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "theme"))
      .limit(1);

    if (setting.length === 0) {
      return { light: {}, dark: {} };
    }

    return setting[0].value as { light: Record<string, string>; dark: Record<string, string> };
  },

  async setTheme(
    theme: { light: Record<string, string>; dark: Record<string, string> },
    userId: string
  ): Promise<AppSetting> {
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "theme"))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(appSettings)
        .set({ value: theme, updatedById: userId })
        .where(eq(appSettings.key, "theme"))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(appSettings)
      .values({ key: "theme", value: theme, updatedById: userId })
      .returning();
    return created;
  },

  async getAllComments(filters?: {
    entityType?: string;
    limit?: number;
  }): Promise<CommentWithAuthor[]> {
    let query = db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        body: comments.body,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .where(isNull(comments.deletedAt))
      .orderBy(desc(comments.createdAt))
      .$dynamic();

    if (filters?.entityType) {
      query = query.where(
        and(
          eq(comments.entityType, filters.entityType),
          isNull(comments.deletedAt)
        )
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const results = await query;
    return results as CommentWithAuthor[];
  },

  async getCommentsByEntity(
    entityType: string,
    entityId: string
  ): Promise<CommentWithAuthor[]> {
    const allComments = await db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        body: comments.body,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .where(
        and(
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      )
      .orderBy(comments.createdAt);

    const topLevel = allComments.filter((c) => !c.parentId);
    const replies = allComments.filter((c) => c.parentId);

    return topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parentId === comment.id),
    })) as CommentWithAuthor[];
  },

  async getEntityCommentById(commentId: string): Promise<CommentWithAuthor | null> {
    const [comment] = await db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        body: comments.body,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .where(eq(comments.id, commentId));

    return comment as CommentWithAuthor | null;
  },

  async createEntityComment(
    data: { entityType: string; entityId: string; body: string; parentId?: string | null },
    userId: string
  ): Promise<EntityComment> {
    const [comment] = await db
      .insert(comments)
      .values({
        entityType: data.entityType,
        entityId: data.entityId,
        body: data.body,
        parentId: data.parentId || null,
        createdById: userId,
      })
      .returning();
    return comment;
  },

  async updateEntityComment(
    commentId: string,
    body: string
  ): Promise<EntityComment> {
    const [updated] = await db
      .update(comments)
      .set({ body, updatedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning();
    return updated;
  },

  async softDeleteEntityComment(commentId: string): Promise<void> {
    await db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(eq(comments.id, commentId));
  },

  async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  },
};
