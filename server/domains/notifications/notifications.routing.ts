import type {
  DomainEvent,
  DealOwnerAssignedEvent,
  CommentCreatedEvent,
  CommentReplyCreatedEvent,
  FeatureCommentCreatedEvent,
  FormSubmissionReceivedEvent,
} from "../../lib/events";
import { notificationsStorage } from "./notifications.storage";

export interface RecipientResolution {
  recipientIds: string[];
}

type RecipientResolver = (event: DomainEvent) => Promise<RecipientResolution>;

interface NotificationRule {
  eventType: string;
  resolveRecipients: RecipientResolver;
  buildPayload: (event: DomainEvent) => {
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  };
}

async function resolveEntityFollowers(entityType: string, entityId: string): Promise<string[]> {
  return notificationsStorage.getFollowers(entityType, entityId);
}

export const NOTIFICATION_RULES: NotificationRule[] = [
  {
    eventType: "deal:owner_assigned",
    resolveRecipients: async (event) => {
      const e = event as DealOwnerAssignedEvent;
      return { recipientIds: [e.newOwnerId] };
    },
    buildPayload: (event) => {
      const e = event as DealOwnerAssignedEvent;
      return {
        type: "deal:owner_assigned",
        title: "Deal Assigned to You",
        body: `You have been assigned as owner of deal "${e.deal?.displayName || "a deal"}"`,
        entityType: "deal",
        entityId: e.deal?.id,
        metadata: { dealName: e.deal?.displayName, previousOwnerId: e.previousOwnerId },
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
    buildPayload: (event) => {
      const e = event as CommentCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      return {
        type: "comment:created",
        title: "New Comment",
        body: `A new comment was posted: "${preview}"`,
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
    buildPayload: (event) => {
      const e = event as CommentReplyCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      return {
        type: "comment:reply_created",
        title: "Reply to Your Comment",
        body: `Someone replied to your comment: "${preview}"`,
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
    buildPayload: (event) => {
      const e = event as FeatureCommentCreatedEvent;
      const preview = e.body?.length > 100 ? e.body.substring(0, 100) + "..." : e.body;
      return {
        type: "feature_comment:created",
        title: `Comment on "${e.featureTitle}"`,
        body: `A comment was posted on feature "${e.featureTitle}": "${preview}"`,
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
    buildPayload: (event) => {
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
