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
