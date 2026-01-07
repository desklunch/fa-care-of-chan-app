import { domainEvents, type DomainEvent } from "./events";
import { storage } from "../storage";
import { getRequestContext } from "./request-context";
import { EVENT_REGISTRY, isRegisteredEvent, type EventAuditMapping } from "./event-registry";

let initialized = false;

async function persistAuditLog(
  event: DomainEvent,
  mapping: EventAuditMapping
): Promise<void> {
  const ctx = getRequestContext();
  const durationMs = ctx ? Date.now() - ctx.startTime : null;

  await storage.createAuditLog({
    action: mapping.action,
    entityType: mapping.entityType,
    entityId: mapping.extractEntityId(event),
    performedBy: event.actorId,
    status: "success",
    changes: mapping.extractChanges?.(event) ?? null,
    sessionId: ctx?.sessionId ?? null,
    requestId: ctx?.requestId ?? null,
    durationMs,
    source: "event",
    ipAddress: ctx?.ipAddress ?? null,
    userAgent: ctx?.userAgent ?? null,
    metadata: { eventType: event.type },
  });
}

async function persistUnknownEvent(event: DomainEvent): Promise<void> {
  const ctx = getRequestContext();

  await storage.createAuditLog({
    action: "unknown",
    entityType: "system",
    entityId: null,
    performedBy: event.actorId,
    status: "success",
    metadata: {
      eventType: event.type,
      warning: "Event not in registry - add to EVENT_REGISTRY",
    },
    sessionId: ctx?.sessionId ?? null,
    requestId: ctx?.requestId ?? null,
    durationMs: null,
    source: "event",
    ipAddress: ctx?.ipAddress ?? null,
    userAgent: ctx?.userAgent ?? null,
  });
}

export function initializeAuditBridge(): void {
  if (initialized) {
    console.warn("[AuditBridge] Already initialized, skipping");
    return;
  }

  domainEvents.on("*", (event: DomainEvent) => {
    if (!isRegisteredEvent(event.type)) {
      console.warn(`[AuditBridge] Unregistered event type: ${event.type}`, {
        eventType: event.type,
        actorId: event.actorId,
        timestamp: event.timestamp,
      });

      void persistUnknownEvent(event).catch((err) => {
        console.error("[AuditBridge] Failed to persist unknown event:", {
          error: err.message,
          eventType: event.type,
        });
      });
      return;
    }

    const definition = EVENT_REGISTRY[event.type];
    const mapping = definition.audit;

    void persistAuditLog(event, mapping).catch((err) => {
      console.error("[AuditBridge] Failed to persist audit log:", {
        error: err.message,
        eventType: event.type,
        entityId: mapping.extractEntityId(event),
      });
    });
  });

  initialized = true;
  console.log("[AuditBridge] Initialized - domain events will be persisted to audit_logs");
}

export function isAuditBridgeInitialized(): boolean {
  return initialized;
}
