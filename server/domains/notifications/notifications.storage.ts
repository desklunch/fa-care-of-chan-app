import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  notifications,
  entityFollows,
  pushSubscriptions,
  notificationPreferences,
  notificationTypePreferences,
  NOTIFICATION_TYPE_KEYS,
  users,
  type Notification,
  type InsertNotification,
  type EntityFollow,
  type NotificationPreference,
  type NotificationTypePref,
  type PushSubscription as PushSubscriptionType,
} from "@shared/schema";

interface WebPushSubscription {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  expirationTime?: number | null;
}

export const notificationsStorage = {
  async createNotification(data: Omit<InsertNotification, "id">): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  },

  async getNotificationsByUser(userId: string, limit = 50): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), eq(notifications.read, false)));
    return Number(result.count);
  },

  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)))
      .returning();
    return updated || null;
  },

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.recipientId, userId), eq(notifications.read, false)));
  },

  async createFollow(userId: string, entityType: string, entityId: string): Promise<EntityFollow> {
    const [follow] = await db
      .insert(entityFollows)
      .values({ userId, entityType, entityId })
      .onConflictDoNothing()
      .returning();
    if (!follow) {
      const [existing] = await db
        .select()
        .from(entityFollows)
        .where(
          and(
            eq(entityFollows.userId, userId),
            eq(entityFollows.entityType, entityType),
            eq(entityFollows.entityId, entityId),
          )
        );
      return existing;
    }
    return follow;
  },

  async removeFollow(userId: string, entityType: string, entityId: string): Promise<void> {
    await db
      .delete(entityFollows)
      .where(
        and(
          eq(entityFollows.userId, userId),
          eq(entityFollows.entityType, entityType),
          eq(entityFollows.entityId, entityId),
        )
      );
  },

  async isFollowing(userId: string, entityType: string, entityId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(entityFollows)
      .where(
        and(
          eq(entityFollows.userId, userId),
          eq(entityFollows.entityType, entityType),
          eq(entityFollows.entityId, entityId),
        )
      );
    return !!follow;
  },

  async getFollowers(entityType: string, entityId: string): Promise<string[]> {
    const follows = await db
      .select({ userId: entityFollows.userId })
      .from(entityFollows)
      .where(
        and(
          eq(entityFollows.entityType, entityType),
          eq(entityFollows.entityId, entityId),
        )
      );
    return follows.map((f) => f.userId);
  },

  async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    const [pref] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return pref || null;
  },

  async getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.getUserPreferences(userId);
    if (existing) return existing;

    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      return (await this.getUserPreferences(userId))!;
    }
    return created;
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Pick<NotificationPreference, "emailEnabled" | "pushEnabled" | "inAppEnabled">>,
  ): Promise<NotificationPreference> {
    const prefs = await this.getOrCreatePreferences(userId);
    const [updated] = await db
      .update(notificationPreferences)
      .set(updates)
      .where(eq(notificationPreferences.id, prefs.id))
      .returning();
    return updated;
  },

  async getOrCreateTypePreferences(userId: string): Promise<NotificationTypePref[]> {
    const existing = await db
      .select()
      .from(notificationTypePreferences)
      .where(eq(notificationTypePreferences.userId, userId));

    if (existing.length === NOTIFICATION_TYPE_KEYS.length) return existing;

    const existingTypes = new Set(existing.map((p) => p.notificationType));
    const missing = NOTIFICATION_TYPE_KEYS.filter((k) => !existingTypes.has(k));

    if (missing.length > 0) {
      await db
        .insert(notificationTypePreferences)
        .values(missing.map((notificationType) => ({ userId, notificationType })))
        .onConflictDoNothing();
    }

    return db
      .select()
      .from(notificationTypePreferences)
      .where(eq(notificationTypePreferences.userId, userId));
  },

  async updateTypePref(
    userId: string,
    notificationType: string,
    updates: Partial<Pick<NotificationTypePref, "inAppEnabled" | "emailEnabled" | "pushEnabled">>,
  ): Promise<NotificationTypePref> {
    await this.getOrCreateTypePreferences(userId);
    const [updated] = await db
      .update(notificationTypePreferences)
      .set(updates)
      .where(
        and(
          eq(notificationTypePreferences.userId, userId),
          eq(notificationTypePreferences.notificationType, notificationType),
        ),
      )
      .returning();
    return updated;
  },

  async getTypePref(userId: string, notificationType: string): Promise<NotificationTypePref | null> {
    const prefs = await this.getOrCreateTypePreferences(userId);
    return prefs.find((p) => p.notificationType === notificationType) || null;
  },

  async savePushSubscription(userId: string, subscription: WebPushSubscription): Promise<PushSubscriptionType> {
    const [sub] = await db
      .insert(pushSubscriptions)
      .values({ userId, subscription })
      .returning();
    return sub;
  },

  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    for (const sub of subs) {
      const subData = sub.subscription as WebPushSubscription | null;
      if (subData?.endpoint === endpoint) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  },

  async getPushSubscriptions(userId: string): Promise<PushSubscriptionType[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  },

  async getUserEmail(userId: string): Promise<string | null> {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return user?.email || null;
  },

  async getUserRole(userId: string): Promise<string | null> {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    return user?.role || null;
  },

  async getUserName(userId: string): Promise<string> {
    const [user] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return "Unknown";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email || "Unknown";
  },

  async getAllUsers(): Promise<Array<{ id: string; email: string | null }>> {
    return db.select({ id: users.id, email: users.email }).from(users);
  },
};
