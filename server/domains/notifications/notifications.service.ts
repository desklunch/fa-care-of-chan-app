import { domainEvents, type DomainEvent } from "../../lib/events";
import { notificationsStorage } from "./notifications.storage";
import { findRuleForEvent } from "./notifications.routing";
import {
  InAppChannel,
  EmailChannel,
  PushChannel,
  type NotificationChannel,
  type NotificationPayload,
} from "./notifications.channels";

export class NotificationService {
  private channels: NotificationChannel[] = [];
  private initialized = false;

  constructor() {
    this.channels = [new InAppChannel(), new EmailChannel(), new PushChannel()];
  }

  initialize(): void {
    if (this.initialized) {
      console.warn("[NotificationService] Already initialized");
      return;
    }

    domainEvents.on("*", (event: DomainEvent) => {
      void this.handleEvent(event).catch((err) => {
        console.error("[NotificationService] Error handling event:", err);
      });
    });

    this.initialized = true;
    console.log("[NotificationService] Initialized - listening for domain events");
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const rule = findRuleForEvent(event.type);
    if (!rule) return;

    try {
      const { recipientIds } = await rule.resolveRecipients(event);
      const payload = await rule.buildPayload(event);

      const uniqueRecipients = [...new Set(recipientIds)];
      const filteredRecipients = uniqueRecipients.filter((id) => id !== event.actorId);

      if (filteredRecipients.length === 0) return;

      for (const recipientId of filteredRecipients) {
        await this.dispatchToRecipient(recipientId, payload);
      }
    } catch (error) {
      console.error(
        `[NotificationService] Failed to process event ${event.type}:`,
        error,
      );
    }
  }

  private async dispatchToRecipient(
    recipientId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const typePref = await notificationsStorage.getTypePref(recipientId, payload.type);

    let isAdmin = false;
    if (this.channels.some((c) => c.name === "email")) {
      const role = await notificationsStorage.getUserRole(recipientId);
      isAdmin = role === "admin";
    }

    let inAppEnabled = false;
    let emailEnabled = false;
    let pushEnabled = false;

    if (typePref) {
      inAppEnabled = typePref.inAppEnabled;
      emailEnabled = typePref.emailEnabled;
      pushEnabled = typePref.pushEnabled;
    } else {
      const globalPrefs = await notificationsStorage.getOrCreatePreferences(recipientId);
      inAppEnabled = globalPrefs.inAppEnabled;
      emailEnabled = globalPrefs.emailEnabled;
      pushEnabled = globalPrefs.pushEnabled;
    }

    for (const channel of this.channels) {
      const isEnabled =
        (channel.name === "in_app" && inAppEnabled) ||
        (channel.name === "email" && emailEnabled && isAdmin) ||
        (channel.name === "push" && pushEnabled);

      if (!isEnabled) continue;

      try {
        await channel.send(recipientId, payload);
      } catch (error) {
        console.error(
          `[NotificationService] ${channel.name} failed for ${recipientId}:`,
          error,
        );
      }
    }
  }
}

let serviceInstance: NotificationService | null = null;

export function initializeNotificationService(): NotificationService {
  if (!serviceInstance) {
    serviceInstance = new NotificationService();
    serviceInstance.initialize();
  }
  return serviceInstance;
}
