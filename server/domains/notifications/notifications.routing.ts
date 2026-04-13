import type {
  DomainEvent,
  DealOwnerAssignedEvent,
  CommentCreatedEvent,
  CommentReplyCreatedEvent,
  FeatureCommentCreatedEvent,
  FormSubmissionReceivedEvent,
} from "../../lib/events";
import { notificationsStorage } from "./notifications.storage";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import {
  deals,
  venues,
  contacts,
  vendors,
  clients,
  appFeatures,
  formRequests,
} from "@shared/schema";

export interface RecipientResolution {
  recipientIds: string[];
}

type RecipientResolver = (event: DomainEvent) => Promise<RecipientResolution>;

interface NotificationRule {
  eventType: string;
  resolveRecipients: RecipientResolver;
  buildPayload: (event: DomainEvent) => Promise<{
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }>;
}

async function resolveEntityFollowers(entityType: string, entityId: string): Promise<string[]> {
  return notificationsStorage.getFollowers(entityType, entityId);
}

function formatEntityType(entityType: string): string {
  const typeMap: Record<string, string> = {
    deal: "Deal",
    venue: "Venue",
    vendor: "Vendor",
    contact: "Contact",
    client: "Client",
    app_feature: "Feature",
    feedback: "Feedback",
    venue_collection: "Collection",
  };
  return typeMap[entityType] || entityType;
}

async function resolveEntityDisplayName(entityType: string, entityId: string): Promise<string> {
  try {
    switch (entityType) {
      case "deal": {
        const [deal] = await db.select({ displayName: deals.displayName }).from(deals).where(eq(deals.id, entityId));
        return deal?.displayName || "a deal";
      }
      case "venue": {
        const [venue] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, entityId));
        return venue?.name || "a venue";
      }
      case "contact": {
        const [contact] = await db.select({ firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(eq(contacts.id, entityId));
        if (contact) {
          const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          return name || "a contact";
        }
        return "a contact";
      }
      case "vendor": {
        const [vendor] = await db.select({ businessName: vendors.businessName }).from(vendors).where(eq(vendors.id, entityId));
        return vendor?.businessName || "a vendor";
      }
      case "client": {
        const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, entityId));
        return client?.name || "a client";
      }
      case "app_feature": {
        const [feature] = await db.select({ title: appFeatures.title }).from(appFeatures).where(eq(appFeatures.id, entityId));
        return feature?.title || "a feature";
      }
      case "form_request": {
        const [formRequest] = await db.select({ title: formRequests.title }).from(formRequests).where(eq(formRequests.id, entityId));
        return formRequest?.title || "a form";
      }
      default:
        return entityType;
    }
  } catch (err) {
    console.error(`[NotificationRouting] Failed to resolve display name for ${entityType}:${entityId}`, err);
    return entityType;
  }
}

export const NOTIFICATION_RULES: NotificationRule[] = [
  {
    eventType: "deal:owner_assigned",
    resolveRecipients: async (event) => {
      const e = event as DealOwnerAssignedEvent;
      return { recipientIds: [e.newOwnerId] };
    },
    buildPayload: async (event) => {
      const e = event as DealOwnerAssignedEvent;
      const actorName = await notificationsStorage.getUserName(e.actorId);
      const dealName = e.deal?.displayName || "a deal";
      return {
        type: "deal:owner_assigned",
        title: "Deal Assigned to You",
        body: `${actorName} assigned you the deal '${dealName}'`,
        entityType: "deal",
        entityId: e.deal?.id,
        metadata: { dealName, previousOwnerId: e.previousOwnerId },
      };
    },
  },
  {
    eventType: "comment:created",
    resolveRecipients: async (event) => {
      const e = event as CommentCreatedEvent;
      const followers = await resolveEntityFollowers(e.entityType, e.entityId);
      return { recipientIds: followers };
    },
    buildPayload: async (event) => {
      const e = event as CommentCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      const actorName = await notificationsStorage.getUserName(e.actorId);
      const entityName = await resolveEntityDisplayName(e.entityType, e.entityId);
      const entityLabel = formatEntityType(e.entityType);
      return {
        type: "comment:created",
        title: `New Comment on ${entityLabel} '${entityName}'`,
        body: `${actorName} commented on ${entityName}: '${preview}'`,
        entityType: e.entityType,
        entityId: e.entityId,
        metadata: { commentId: e.commentId, commentBody: e.body },
      };
    },
  },
  {
    eventType: "comment:reply_created",
    resolveRecipients: async (event) => {
      const e = event as CommentReplyCreatedEvent;
      const followers = await resolveEntityFollowers(e.entityType, e.entityId);
      const recipientIds = [...new Set([...followers, e.parentCommentAuthorId])];
      return { recipientIds };
    },
    buildPayload: async (event) => {
      const e = event as CommentReplyCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      const actorName = await notificationsStorage.getUserName(e.actorId);
      const entityName = await resolveEntityDisplayName(e.entityType, e.entityId);
      const entityLabel = formatEntityType(e.entityType);
      return {
        type: "comment:reply_created",
        title: `Reply on ${entityLabel} '${entityName}'`,
        body: `${actorName} replied to a comment on ${entityName}: '${preview}'`,
        entityType: e.entityType,
        entityId: e.entityId,
        metadata: {
          commentId: e.commentId,
          parentCommentId: e.parentCommentId,
          commentBody: e.body,
        },
      };
    },
  },
  {
    eventType: "feature_comment:created",
    resolveRecipients: async (event) => {
      const e = event as FeatureCommentCreatedEvent;
      const followers = await resolveEntityFollowers("app_feature", e.featureId);
      const recipientIds = [...new Set([...followers, e.featureCreatedById])];
      return { recipientIds };
    },
    buildPayload: async (event) => {
      const e = event as FeatureCommentCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      const actorName = await notificationsStorage.getUserName(e.actorId);
      const featureTitle = e.featureTitle || "a feature";
      return {
        type: "feature_comment:created",
        title: `Comment on '${featureTitle}'`,
        body: `${actorName} commented on ${featureTitle}: '${preview}'`,
        entityType: "app_feature",
        entityId: e.featureId,
        metadata: { commentId: e.commentId, featureTitle: e.featureTitle, commentBody: e.body },
      };
    },
  },
  {
    eventType: "form:submission_received",
    resolveRecipients: async (_event) => {
      const allUsers = await notificationsStorage.getAllUsers();
      return { recipientIds: allUsers.map((u) => u.id) };
    },
    buildPayload: async (event) => {
      const e = event as FormSubmissionReceivedEvent;
      return {
        type: "form:submission_received",
        title: "New Form Submission",
        body: `${e.respondentName} submitted a response to "${e.formRequestTitle}"`,
        entityType: "form_request",
        entityId: e.formRequestId,
        metadata: { respondentName: e.respondentName, formRequestTitle: e.formRequestTitle },
      };
    },
  },
];

export function findRuleForEvent(eventType: string): NotificationRule | undefined {
  return NOTIFICATION_RULES.find((r) => r.eventType === eventType);
}
