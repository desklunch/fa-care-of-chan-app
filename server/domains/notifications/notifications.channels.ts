import { notificationsStorage } from "./notifications.storage";
import type { Notification } from "@shared/schema";

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  name: string;
  send(recipientId: string, payload: NotificationPayload): Promise<void>;
}

export class InAppChannel implements NotificationChannel {
  name = "in_app";

  async send(recipientId: string, payload: NotificationPayload): Promise<void> {
    await notificationsStorage.createNotification({
      recipientId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entityType: payload.entityType || null,
      entityId: payload.entityId || null,
      metadata: payload.metadata || null,
      read: false,
    });
  }
}

export class EmailChannel implements NotificationChannel {
  name = "email";

  async send(recipientId: string, payload: NotificationPayload): Promise<void> {
    try {
      const email = await notificationsStorage.getUserEmail(recipientId);
      if (!email) {
        console.log(`[EmailChannel] No email for user ${recipientId}, skipping`);
        return;
      }

      const { sendNotificationEmail } = await import("./notifications.email");
      await sendNotificationEmail(email, payload);
    } catch (error) {
      console.error(`[EmailChannel] Failed to send to ${recipientId}:`, error);
    }
  }
}

interface WebPushSubscriptionData {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

interface WebPushError {
  statusCode?: number;
  message?: string;
}

export class PushChannel implements NotificationChannel {
  name = "push";

  async send(recipientId: string, payload: NotificationPayload): Promise<void> {
    try {
      const subscriptions = await notificationsStorage.getPushSubscriptions(recipientId);
      if (subscriptions.length === 0) return;

      let webpush: typeof import("web-push");
      try {
        webpush = await import("web-push");
      } catch {
        console.log("[PushChannel] web-push not available, skipping");
        return;
      }

      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@example.com";

      if (!vapidPublicKey || !vapidPrivateKey) {
        console.log("[PushChannel] VAPID keys not configured, skipping push");
        return;
      }

      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType,
        entityId: payload.entityId,
        type: payload.type,
      });

      for (const sub of subscriptions) {
        try {
          const subData = sub.subscription as WebPushSubscriptionData;
          await webpush.sendNotification(subData, pushPayload);
        } catch (error: unknown) {
          const pushError = error as WebPushError;
          if (pushError?.statusCode === 410 || pushError?.statusCode === 404) {
            const subData = sub.subscription as WebPushSubscriptionData;
            await notificationsStorage.removePushSubscription(
              recipientId,
              subData?.endpoint,
            );
          } else {
            console.error("[PushChannel] Push failed:", error);
          }
        }
      }
    } catch (error) {
      console.error(`[PushChannel] Failed to send to ${recipientId}:`, error);
    }
  }
}
