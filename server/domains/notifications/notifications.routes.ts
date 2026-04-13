import type { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { notificationsStorage } from "./notifications.storage";

export function registerNotificationsRoutes(app: Express): void {
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await notificationsStorage.getNotificationsByUser(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await notificationsStorage.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notification = await notificationsStorage.markAsRead(req.params.id, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await notificationsStorage.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.post("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      const follow = await notificationsStorage.createFollow(userId, entityType, entityId);
      res.status(201).json(follow);
    } catch (error) {
      console.error("Error creating follow:", error);
      res.status(500).json({ message: "Failed to follow entity" });
    }
  });

  app.delete("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      await notificationsStorage.removeFollow(userId, entityType, entityId);
      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Error removing follow:", error);
      res.status(500).json({ message: "Failed to unfollow entity" });
    }
  });

  app.get("/api/follows/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;

      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId query params are required" });
      }

      const following = await notificationsStorage.isFollowing(userId, entityType, entityId);
      res.json({ following });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid push subscription" });
      }

      const sub = await notificationsStorage.savePushSubscription(userId, subscription);
      res.status(201).json(sub);
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "endpoint is required" });
      }

      await notificationsStorage.removePushSubscription(userId, endpoint);
      res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.get("/api/push/vapid-key", async (_req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      return res.status(404).json({ message: "VAPID key not configured" });
    }
    res.json({ publicKey: key });
  });

  app.post("/api/notifications/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notification = await notificationsStorage.createNotification({
        recipientId: userId,
        type: "test",
        title: "Test Notification",
        body: "This is a test notification to verify the system is working correctly.",
        entityType: null,
        entityId: null,
        metadata: null,
        read: false,
      });
      res.json({ message: "Test notification created", notification });
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });
}
