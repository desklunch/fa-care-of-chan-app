import type { AuditAction, AuditEntityType } from "@shared/schema";
import type { DomainEvent } from "./events";

export interface EventAuditMapping {
  action: AuditAction;
  entityType: AuditEntityType;
  extractEntityId: (event: DomainEvent) => string | null;
  extractChanges?: (event: DomainEvent) => Record<string, unknown> | null;
}

export interface EventDefinition {
  type: string;
  audit: EventAuditMapping;
}

export const EVENT_REGISTRY: Record<string, EventDefinition> = {
  "deal:created": {
    type: "deal:created",
    audit: {
      action: "create",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
    },
  },
  "deal:updated": {
    type: "deal:updated",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({ after: (e as any).changes }),
    },
  },
  "deal:deleted": {
    type: "deal:deleted",
    audit: {
      action: "delete",
      entityType: "deal",
      extractEntityId: (e) => (e as any).dealId ?? null,
    },
  },
  "deal:stage_changed": {
    type: "deal:stage_changed",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({
        before: { status: (e as any).fromStage },
        after: { status: (e as any).toStage },
      }),
    },
  },
  "deal:owner_assigned": {
    type: "deal:owner_assigned",
    audit: {
      action: "update",
      entityType: "deal",
      extractEntityId: (e) => (e as any).deal?.id ?? null,
      extractChanges: (e) => ({
        before: { ownerId: (e as any).previousOwnerId },
        after: { ownerId: (e as any).newOwnerId },
      }),
    },
  },
  "deal:task_created": {
    type: "deal:task_created",
    audit: {
      action: "create",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).task?.id ?? null,
    },
  },
  "deal:task_updated": {
    type: "deal:task_updated",
    audit: {
      action: "update",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).task?.id ?? null,
      extractChanges: (e) => ({ after: (e as any).changes }),
    },
  },
  "deal:task_deleted": {
    type: "deal:task_deleted",
    audit: {
      action: "delete",
      entityType: "deal_task",
      extractEntityId: (e) => (e as any).taskId ?? null,
    },
  },
  "user:logged_in": {
    type: "user:logged_in",
    audit: {
      action: "login",
      entityType: "user",
      extractEntityId: (e) => (e as any).userId ?? null,
      extractChanges: (e) => (e as any).metadata ?? null,
    },
  },
  "user:logged_out": {
    type: "user:logged_out",
    audit: {
      action: "logout",
      entityType: "user",
      extractEntityId: (e) => (e as any).userId ?? null,
    },
  },
  "session:created": {
    type: "session:created",
    audit: {
      action: "create",
      entityType: "session",
      extractEntityId: (e) => (e as any).sessionId ?? null,
    },
  },
  "session:destroyed": {
    type: "session:destroyed",
    audit: {
      action: "delete",
      entityType: "session",
      extractEntityId: (e) => (e as any).sessionId ?? null,
    },
  },
  "venue:created": {
    type: "venue:created",
    audit: {
      action: "create",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
    },
  },
  "venue:updated": {
    type: "venue:updated",
    audit: {
      action: "update",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "venue:deleted": {
    type: "venue:deleted",
    audit: {
      action: "delete",
      entityType: "venue",
      extractEntityId: (e) => (e as any).venueId ?? null,
    },
  },
  "venue:photo_uploaded": {
    type: "venue:photo_uploaded",
    audit: {
      action: "upload",
      entityType: "venue_photo",
      extractEntityId: (e) => (e as any).photoId ?? null,
    },
  },
  "venue:photo_deleted": {
    type: "venue:photo_deleted",
    audit: {
      action: "delete",
      entityType: "venue_photo",
      extractEntityId: (e) => (e as any).photoId ?? null,
    },
  },
  "venue:file_uploaded": {
    type: "venue:file_uploaded",
    audit: {
      action: "upload",
      entityType: "venue_file",
      extractEntityId: (e) => (e as any).fileId ?? null,
    },
  },
  "venue:file_deleted": {
    type: "venue:file_deleted",
    audit: {
      action: "delete",
      entityType: "venue_file",
      extractEntityId: (e) => (e as any).fileId ?? null,
    },
  },
  "contact:created": {
    type: "contact:created",
    audit: {
      action: "create",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
    },
  },
  "contact:updated": {
    type: "contact:updated",
    audit: {
      action: "update",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
      extractChanges: (e) => (e as any).changes ?? null,
    },
  },
  "contact:deleted": {
    type: "contact:deleted",
    audit: {
      action: "delete",
      entityType: "contact",
      extractEntityId: (e) => (e as any).contactId ?? null,
    },
  },
  "comment:created": {
    type: "comment:created",
    audit: {
      action: "create",
      entityType: "comment" as any,
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        entityType: (e as any).entityType,
        entityId: (e as any).entityId,
      }),
    },
  },
  "comment:reply_created": {
    type: "comment:reply_created",
    audit: {
      action: "create",
      entityType: "comment" as any,
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        entityType: (e as any).entityType,
        entityId: (e as any).entityId,
        parentCommentId: (e as any).parentCommentId,
      }),
    },
  },
  "form:submission_received": {
    type: "form:submission_received",
    audit: {
      action: "create",
      entityType: "form_response",
      extractEntityId: (e) => (e as any).formRequestId ?? null,
    },
  },
  "feature_comment:created": {
    type: "feature_comment:created",
    audit: {
      action: "create",
      entityType: "feature_comment",
      extractEntityId: (e) => (e as any).commentId ?? null,
      extractChanges: (e) => ({
        featureId: (e as any).featureId,
      }),
    },
  },
};

export type RegisteredEventType = keyof typeof EVENT_REGISTRY;

export function isRegisteredEvent(type: string): type is RegisteredEventType {
  return type in EVENT_REGISTRY;
}

export function getEventMapping(type: string): EventAuditMapping | null {
  const definition = EVENT_REGISTRY[type];
  return definition?.audit ?? null;
}

export function getAllRegisteredEventTypes(): string[] {
  return Object.keys(EVENT_REGISTRY);
}
