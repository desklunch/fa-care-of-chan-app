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
  const hasContext = ctx !== null && ctx.startTime > 0;
  const durationMs = hasContext ? Date.now() - ctx.startTime : null;

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
    source: hasContext ? "event" : "event_no_ctx",
    ipAddress: ctx?.ipAddress ?? null,
    userAgent: ctx?.userAgent ?? null,
    metadata: { eventType: event.type },
  });
}

function handleUnknownEvent(event: DomainEvent): void {
  console.error(`[AuditBridge] UNREGISTERED EVENT - add to EVENT_REGISTRY:`, {
    eventType: event.type,
    actorId: event.actorId,
    timestamp: event.timestamp,
    action: "Add this event type to server/lib/event-registry.ts to enable audit persistence",
  });
}

export function initializeAuditBridge(): void {
  if (initialized) {
    console.warn("[AuditBridge] Already initialized, skipping");
    return;
  }

  domainEvents.on("*", (event: DomainEvent) => {
    if (!isRegisteredEvent(event.type)) {
      handleUnknownEvent(event);
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
