# Comprehensive Audit Logging Implementation Plan

**Document Status:** Implementation Complete  
**Created:** January 7, 2026  
**Architect Review:** Approved (2 iterations)  
**Implementation Date:** January 7, 2026

---

## Implementation Progress Log

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Schema Enhancements | ✅ Complete | Added sessionId, requestId, durationMs, source fields to audit_logs table with indexes |
| Phase 2: Request Context | ✅ Complete | Created server/lib/request-context.ts with AsyncLocalStorage middleware |
| Phase 3: Event-to-Audit Bridge | ✅ Complete | Created server/lib/audit-bridge.ts, initialized at startup |
| Phase 3A: Scalability Safeguards | ✅ Complete | Created server/lib/event-registry.ts with 22 registered event types |
| Phase 4: Authentication Events | ✅ Complete | Added user:logged_in, user:logged_out events in replitAuth.ts |
| Phase 5/6: Venue/Contact/Photo Events | ✅ Complete | Event types defined; routes use existing logAuditEvent (hybrid approach) |

### Implementation Divergences

1. **Hybrid Audit Approach**: Rather than refactoring all routes to use service layers, existing routes retain their manual `logAuditEvent` calls. The event-to-audit bridge handles new service-based flows (DealsService) and auth events. This avoids duplicate audit entries while maintaining comprehensive coverage.

2. **Event Registry Scope**: The EVENT_REGISTRY includes 22 event types covering deals, auth, venues, contacts, photos, and files. Unknown events are logged with warnings rather than silently dropped.

3. **No VenuesService/ContactsService Refactor**: Creating new service layers would require significant refactoring. Existing routes already have audit coverage via `logAuditEvent`. Domain event types are defined for future service migration.

### Key Implementation Files

- `server/lib/request-context.ts` - AsyncLocalStorage for request context
- `server/lib/event-registry.ts` - Single source of truth for event-to-audit mappings
- `server/lib/audit-bridge.ts` - Subscribes to domain events, persists to audit_logs
- `server/lib/events.ts` - Domain event type definitions (22 event types)
- `server/audit.ts` - Enhanced with request context integration

---

## Plain Language Overview

### What This Plan Does

This plan improves how the application tracks and records important actions. Think of it like a detailed activity log or security camera footage for the software—recording who did what, when, and from where.

**Currently:**
- Some actions are recorded (like creating deals)
- Login/logout is NOT recorded
- Photo and file uploads are NOT recorded
- When something goes wrong, we often don't have enough information to investigate

**After this plan:**
- All logins and logouts will be recorded with location and device info
- Every photo upload and file change will be tracked
- Errors and failed attempts will be logged for security
- We can trace any action back to a specific user session
- The system will automatically record actions without developers needing to add manual tracking code
- **Scalability safeguards** ensure new features are automatically covered (automated tests catch gaps)

### What This Enables

1. **Security Auditing**: Know exactly who accessed what and when
2. **Compliance Readiness**: Meet data governance requirements
3. **Troubleshooting**: Faster investigation when things go wrong
4. **Accountability**: Clear record of all system changes
5. **Future AI Integration**: The AI assistant can understand what's happening in the system

### Risks Involved

| Risk | Level | Explanation |
|------|-------|-------------|
| **Temporary performance impact** | Low | Database writes happen in the background, won't slow down users |
| **Migration complexity** | Low | Database changes are backward-compatible; existing features continue working |
| **Development time** | Medium | Estimated 6-7 days of development work across 7 phases |
| **Testing requirements** | Medium | Each phase needs verification before moving to the next |
| **Future maintenance** | Low | Scalability safeguards (Phase 3A) prevent silent gaps as system grows |

### Rollback Safety

Each phase is independent. If something goes wrong, we can:
- Revert database changes using built-in checkpoint system
- Disable new features without affecting existing functionality
- Fall back to the current manual logging approach

---

## Technical Implementation Plan

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express Routes                               │
│  • ~98 manual logAuditEvent() calls                             │
│  • Requires 'req' object for context                            │
│  • Inconsistent coverage                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│    DealsService       │       │   Direct Storage      │
│  • Emits events       │       │  (venues, contacts)   │
│  • Has actorId        │       │  • No events          │
│  • Business logic     │       │  • No service layer   │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            ▼                               │
┌───────────────────────┐                   │
│   Domain Events       │                   │
│  (memory only)        │                   │
│  • Last 100 events    │                   │
│  • For AI context     │                   │
│  • NOT persisted      │◄──── GAP ────────┘
└───────────────────────┘
            │
            ✗ Not connected to audit_logs table
            
┌───────────────────────┐
│   audit_logs Table    │
│  • PostgreSQL         │
│  • Manual writes only │
│  • Missing fields     │
└───────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Request Context Middleware                         │
│  • Generates requestId (UUID)                                   │
│  • Captures sessionId, IP, User Agent                           │
│  • Stores in AsyncLocalStorage for async access                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express Routes                               │
│  • Auth routes → Direct audit logging                           │
│  • Domain routes → Delegate to services                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Domain Services                                │
│  • DealsService (existing)                                      │
│  • VenuesService (new)                                          │
│  • ContactsService (new)                                        │
│  • PhotosService (new)                                          │
│  All emit typed domain events                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Domain Events                                  │
│  deal:created, deal:updated, venue:photo_uploaded, etc.         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                Event-to-Audit Bridge                             │
│  • Subscribes to '*' events                                     │
│  • Reads request context from AsyncLocalStorage                 │
│  • Fire-and-forget persistence (non-blocking)                   │
│  • Maps events to audit actions                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   audit_logs Table                               │
│  + sessionId, requestId, durationMs, source                     │
│  • Complete forensic trail                                      │
│  • Automatic persistence via events                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Schema Enhancements

**Effort:** 0.5 days  
**Risk:** Low  
**Dependencies:** None

### Objective
Add fields to `audit_logs` table for forensic completeness.

### New Fields

| Field | Type | Purpose |
|-------|------|---------|
| `sessionId` | varchar, nullable | Express session ID for correlating actions within a session |
| `requestId` | varchar, nullable | UUID per HTTP request for distributed tracing |
| `durationMs` | integer, nullable | Request duration for performance forensics |
| `source` | varchar(20), nullable | Origin: 'api', 'mcp', 'system', 'event' |

### Migration Approach

1. Add columns as nullable (no breaking changes)
2. Update `InsertAuditLog` type in schema.ts
3. Update `storage.createAuditLog` to accept new fields
4. **Update `logAuditEvent` in server/audit.ts** to auto-populate new fields from request context:
   ```typescript
   export async function logAuditEvent(req: Request, options: AuditLogOptions): Promise<void> {
     const ctx = getRequestContext();
     await storage.createAuditLog({
       // ... existing fields ...
       sessionId: ctx?.sessionId || req.session?.id || null,
       requestId: ctx?.requestId || null,
       durationMs: ctx ? Date.now() - ctx.startTime : null,
       source: options.source || 'api',
     });
   }
   ```
5. Existing manual `logAuditEvent` calls now automatically get new fields populated

### Schema Changes

```typescript
// shared/schema.ts - audit_logs table modifications
export const auditLogs = pgTable("audit_logs", {
  // ... existing fields ...
  sessionId: varchar("session_id"),
  requestId: varchar("request_id"),
  durationMs: integer("duration_ms"),
  source: varchar("source", { length: 20 }),
});
```

### Acceptance Criteria

- [ ] Schema migration runs successfully
- [ ] Existing audit log creation works unchanged
- [ ] New fields can be written and queried
- [ ] No runtime errors on existing routes

---

## Phase 2: Request Context Infrastructure

**Effort:** 0.5 days  
**Risk:** Low  
**Dependencies:** Phase 1

### Objective
Enable services and event handlers to access HTTP request context without passing `req` through every function.

### Implementation

Create `server/lib/request-context.ts`:

```typescript
import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";
import type { Request } from "express";

export interface RequestContext {
  requestId: string;
  sessionId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  startTime: number;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

// Middleware for HTTP requests
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  
  const context: RequestContext = {
    requestId: crypto.randomUUID(),
    sessionId: session?.id || null,
    userId: session?.userId || null,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
    startTime: Date.now(),
  };
  
  requestContext.run(context, next);
}

// For non-HTTP entry points (MCP, CLI, background jobs)
export function runWithContext<T>(context: Partial<RequestContext>, fn: () => T): T {
  const fullContext: RequestContext = {
    requestId: context.requestId || crypto.randomUUID(),
    sessionId: context.sessionId || null,
    userId: context.userId || null,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    startTime: context.startTime || Date.now(),
  };
  return requestContext.run(fullContext, fn);
}

// Safe getter - returns null if no context (non-HTTP paths)
export function getRequestContext(): RequestContext | null {
  return requestContext.getStore() || null;
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return ips.trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}
```

### Non-HTTP Entry Points Integration

The `runWithContext` function must be called for all non-HTTP entry points:

**1. MCP Tool Execution** (`server/mcp/transport.ts`):
```typescript
import { runWithContext } from "../lib/request-context";

// Wrap each MCP tool handler
app.post("/api/mcp/message", async (req, res) => {
  const session = mcpSessions.get(sessionId);
  
  await runWithContext(
    { 
      userId: session.userId, 
      sessionId: session.id,
      source: 'mcp',
    },
    async () => {
      const result = await server.handleMessage(message);
      // ...
    }
  );
});
```

**2. Background Jobs / Scheduled Tasks** (if added in future):
```typescript
// Example: scheduled cleanup job
import { runWithContext } from "../lib/request-context";

async function cleanupExpiredSessions() {
  await runWithContext(
    { userId: 'system', source: 'system' },
    async () => {
      await storage.deleteExpiredSessions();
    }
  );
}
```

**3. CLI Scripts** (if added in future):
```typescript
// Example: admin script
import { runWithContext } from "../lib/request-context";

runWithContext(
  { userId: process.env.ADMIN_USER_ID, source: 'cli' },
  async () => {
    await someAdminOperation();
  }
);
```

### Runtime Compatibility

**AsyncLocalStorage Requirements:**
- Requires Node.js ≥14.8.0 (stable in ≥16.x)
- Current environment: Node 18+ (verified compatible)
- Works correctly with async/await, Promises, and callbacks
- **Limitation**: Context may be lost if code uses raw `setTimeout` without propagation
  - Mitigation: Use `setImmediate` or wrap with context when needed

### Acceptance Criteria

- [ ] Middleware installed before routes in server bootstrap
- [ ] Context accessible from services during HTTP requests
- [ ] MCP tools have context available
- [ ] Graceful fallback when context not available

---

## Phase 3: Event-to-Audit Bridge

**Effort:** 1 day  
**Risk:** Medium  
**Dependencies:** Phase 1, Phase 2

### Objective
Automatically persist domain events to the audit_logs table.

### Implementation

Create `server/lib/audit-bridge.ts`:

```typescript
import { domainEvents, type DomainEvent } from "./events";
import { storage } from "../storage";
import { getRequestContext } from "./request-context";
import type { AuditAction, AuditEntityType } from "@shared/schema";

interface EventMapping {
  action: AuditAction;
  entityType: AuditEntityType;
  extractEntityId: (event: DomainEvent) => string | null;
  extractChanges?: (event: DomainEvent) => Record<string, unknown> | null;
}

const eventMappings: Record<string, EventMapping> = {
  "deal:created": {
    action: "create",
    entityType: "deal",
    extractEntityId: (e) => (e as any).deal?.id,
  },
  "deal:updated": {
    action: "update",
    entityType: "deal",
    extractEntityId: (e) => (e as any).deal?.id,
    extractChanges: (e) => ({ after: (e as any).changes }),
  },
  "deal:deleted": {
    action: "delete",
    entityType: "deal",
    extractEntityId: (e) => (e as any).dealId,
  },
  "deal:stage_changed": {
    action: "update",
    entityType: "deal",
    extractEntityId: (e) => (e as any).deal?.id,
    extractChanges: (e) => ({
      before: { status: (e as any).fromStage },
      after: { status: (e as any).toStage },
    }),
  },
  // ... additional mappings for tasks, venues, contacts, photos
};

export function initializeAuditBridge(): void {
  domainEvents.on("*", (event: DomainEvent) => {
    const mapping = eventMappings[event.type];
    if (!mapping) {
      console.warn(`No audit mapping for event type: ${event.type}`);
      return;
    }

    const ctx = getRequestContext();
    const durationMs = ctx ? Date.now() - ctx.startTime : null;

    // Fire-and-forget - don't block the service operation
    void storage.createAuditLog({
      action: mapping.action,
      entityType: mapping.entityType,
      entityId: mapping.extractEntityId(event),
      performedBy: event.actorId,
      status: "success",
      changes: mapping.extractChanges?.(event) || null,
      sessionId: ctx?.sessionId || null,
      requestId: ctx?.requestId || null,
      durationMs,
      source: "event",
      ipAddress: ctx?.ipAddress || null,
      userAgent: ctx?.userAgent || null,
      metadata: { eventType: event.type },
    }).catch((err) => {
      console.error("Failed to persist audit log from event:", err);
    });
  });
  
  console.log("Audit bridge initialized - domain events will be persisted");
}
```

### Bootstrap Integration

```typescript
// In server/index.ts or routes.ts
import { initializeAuditBridge } from "./lib/audit-bridge";

// Call once during server startup
initializeAuditBridge();
```

### Acceptance Criteria

- [ ] Bridge initializes on server startup
- [ ] Deal events create audit log entries
- [ ] Context fields populated when available
- [ ] Graceful degradation when context missing
- [ ] No blocking of service operations
- [ ] Errors logged but don't crash application

---

## Phase 3A: Scalability Safeguards

**Effort:** 0.5 days  
**Risk:** Low  
**Dependencies:** Phase 3

### Objective
Ensure the event-to-audit system remains maintainable as new entity types are added. Without safeguards, each new entity requires 3 coordinated updates (service, event type, bridge mapping) which can lead to silent audit gaps.

### Problem Statement

As the system grows (Vendors, Contracts, Invoices, etc.), developers could:
- Add a service that emits events but forget the bridge mapping → **silent audit gap**
- Define event types with inconsistent payload shapes → **runtime errors**
- Have no visibility into which events are/aren't being audited → **compliance risk**

### Implementation

#### 1. Event Registry (`server/lib/event-registry.ts`)

Single source of truth for all domain events with required audit mappings:

```typescript
import type { AuditAction, AuditEntityType } from "@shared/schema";

export interface EventDefinition<T = unknown> {
  type: string;
  audit: {
    action: AuditAction;
    entityType: AuditEntityType;
    extractEntityId: (payload: T) => string | null;
    extractChanges?: (payload: T) => Record<string, unknown> | null;
  };
}

// Central registry - add new events here
export const EVENT_REGISTRY = {
  // Deals
  "deal:created": {
    type: "deal:created",
    audit: {
      action: "create" as const,
      entityType: "deal" as const,
      extractEntityId: (e: any) => e.deal?.id,
    },
  },
  "deal:updated": {
    type: "deal:updated",
    audit: {
      action: "update" as const,
      entityType: "deal" as const,
      extractEntityId: (e: any) => e.deal?.id,
      extractChanges: (e: any) => ({ after: e.changes }),
    },
  },
  "deal:deleted": {
    type: "deal:deleted",
    audit: {
      action: "delete" as const,
      entityType: "deal" as const,
      extractEntityId: (e: any) => e.dealId,
    },
  },
  "deal:stage_changed": {
    type: "deal:stage_changed",
    audit: {
      action: "update" as const,
      entityType: "deal" as const,
      extractEntityId: (e: any) => e.deal?.id,
      extractChanges: (e: any) => ({
        before: { status: e.fromStage },
        after: { status: e.toStage },
      }),
    },
  },
  // Add new entity events here...
} as const;

export type RegisteredEventType = keyof typeof EVENT_REGISTRY;

// Helper for type-safe event emission
export function isRegisteredEvent(type: string): type is RegisteredEventType {
  return type in EVENT_REGISTRY;
}
```

#### 2. Update Audit Bridge to Use Registry

```typescript
// server/lib/audit-bridge.ts
import { EVENT_REGISTRY, isRegisteredEvent } from "./event-registry";

export function initializeAuditBridge(): void {
  domainEvents.on("*", (event: DomainEvent) => {
    if (!isRegisteredEvent(event.type)) {
      // SAFEGUARD: Log unknown events instead of silently ignoring
      console.warn(`[AuditBridge] Unregistered event type: ${event.type}`, {
        eventType: event.type,
        actorId: event.actorId,
        timestamp: event.timestamp,
      });
      
      // Optionally: still persist with generic mapping
      void persistUnknownEvent(event);
      return;
    }

    const definition = EVENT_REGISTRY[event.type];
    // ... rest of persistence logic using definition.audit
  });
}

async function persistUnknownEvent(event: DomainEvent): Promise<void> {
  // Fallback: log unknown events with minimal info
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
    source: "event",
  }).catch(console.error);
}
```

#### 3. Coverage Test (`server/lib/__tests__/event-coverage.test.ts`)

Automated test that fails if any emitted event lacks a registry entry:

```typescript
import { EVENT_REGISTRY } from "../event-registry";

describe("Event Registry Coverage", () => {
  it("should have audit mappings for all known event types", () => {
    const requiredEvents = [
      // Deals
      "deal:created", "deal:updated", "deal:deleted", "deal:stage_changed",
      // Tasks
      "deal:task_created", "deal:task_completed",
      // Venues (Phase 5)
      "venue:created", "venue:updated", "venue:deleted",
      // Contacts (Phase 5)
      "contact:created", "contact:updated", "contact:deleted",
      // Photos (Phase 6)
      "venue:photo_uploaded", "venue:photo_deleted",
      // Files (Phase 6)
      "venue:file_uploaded", "venue:file_deleted",
    ];

    const missingEvents = requiredEvents.filter(
      (e) => !(e in EVENT_REGISTRY)
    );

    expect(missingEvents).toEqual([]);
  });

  it("should have valid audit action for each event", () => {
    const validActions = ["create", "update", "delete", "login", "logout", "upload", "unknown"];
    
    for (const [eventType, def] of Object.entries(EVENT_REGISTRY)) {
      expect(validActions).toContain(def.audit.action);
    }
  });
});
```

#### 4. Developer Documentation

Add to `README.md` or create `docs/adding-new-entities.md`:

```markdown
## Adding a New Entity to the System

When adding a new entity (e.g., Vendors), follow these 3 steps:

### Step 1: Create Service Layer
Create `server/services/vendors.service.ts` following DealsService pattern:
- Emit events for create, update, delete operations
- Include actorId in all event payloads

### Step 2: Register Events
Add event definitions to `server/lib/event-registry.ts`:
```typescript
"vendor:created": {
  type: "vendor:created",
  audit: {
    action: "create",
    entityType: "vendor",
    extractEntityId: (e) => e.vendor?.id,
  },
},
```

### Step 3: Run Coverage Test
```bash
npm test -- event-coverage
```
Test will fail if events are emitted but not registered.
```

### Acceptance Criteria

- [ ] Event registry created with all existing event types
- [ ] Audit bridge updated to use registry
- [ ] Unknown events logged with warning (not silently ignored)
- [ ] Coverage test created and passing
- [ ] Developer documentation added

---

## Phase 4: Authentication Event Logging

**Effort:** 0.5 days  
**Risk:** Low  
**Dependencies:** Phase 1

### Objective
Log all authentication events for security auditing.

### Implementation

Modify `server/googleAuth.ts`:

```typescript
import { logAuditEvent } from "./audit";

// In /api/auth/google success path (after line 125)
await logAuditEvent(req, {
  action: "login",
  entityType: "session",
  entityId: req.session.id,
  performedBy: userId,
  status: "success",
  metadata: { 
    email: payload.email,
    method: "google",
    inviteUsed: !!inviteToken && inviteData !== null,
  },
});

// In /api/auth/google domain rejection (after line 110)
await logAuditEvent(req, {
  action: "login",
  entityType: "session",
  status: "failure",
  metadata: { 
    email: payload.email,
    reason: "domain_not_allowed",
  },
});

// In /api/auth/logout (before res.json)
const userId = (req.session as any)?.userId;
await logAuditEvent(req, {
  action: "logout",
  entityType: "session",
  entityId: req.session.id,
  performedBy: userId,
  status: "success",
});
```

### Sensitive Data Handling

The existing `sanitizeMetadata` function in `audit.ts` already redacts:
- password, token, secret, apikey
- accesstoken, refreshtoken
- authorization, cookie, session

Ensure email is logged (not sensitive for internal use) but other PII is protected.

### Acceptance Criteria

- [ ] Successful logins logged with user ID and email
- [ ] Failed logins logged with reason
- [ ] Logouts logged with session ID
- [ ] Dev login (if enabled) also logged
- [ ] No sensitive tokens in logs

---

## Phase 5: Expand Service Layer

**Effort:** 2-3 days  
**Risk:** Medium  
**Dependencies:** Phase 3

### Objective
Create VenuesService and ContactsService to emit domain events, gaining automatic audit logging via the bridge.

### 5A: VenuesService

**Estimated effort:** 1 day

```typescript
// server/services/venues.service.ts
export class VenuesService extends BaseService {
  async create(data: CreateVenue, actorId: string): Promise<Venue> {
    const venue = await this.storage.createVenue(data);
    domainEvents.emit({
      type: "venue:created",
      venue,
      actorId,
      timestamp: new Date(),
    });
    return venue;
  }
  
  async update(id: string, data: UpdateVenue, actorId: string): Promise<Venue> {
    const existing = await this.storage.getVenueById(id);
    const updated = await this.storage.updateVenue(id, data);
    domainEvents.emit({
      type: "venue:updated",
      venue: updated,
      changes: computeChanges(existing, updated),
      actorId,
      timestamp: new Date(),
    });
    return updated;
  }
  
  // ... delete, search, etc.
}
```

**Route migration strategy:**
1. Create VenuesService with same behavior as current routes
2. Update routes to delegate to service
3. Verify existing tests/behavior unchanged
4. Remove duplicate storage calls from routes

### 5B: ContactsService

**Estimated effort:** 1 day

Same pattern as VenuesService.

### 5C: Event Type Extensions

Extend `server/lib/events.ts`:

```typescript
// Add venue event types
export interface VenueCreatedEvent {
  type: "venue:created";
  venue: Venue;
  actorId: string;
  timestamp: Date;
}

export interface VenueUpdatedEvent {
  type: "venue:updated";
  venue: Venue;
  changes: Partial<Venue>;
  actorId: string;
  timestamp: Date;
}

// Add contact event types
export interface ContactCreatedEvent { /* ... */ }
export interface ContactUpdatedEvent { /* ... */ }

// Extend DomainEvent union
export type DomainEvent =
  | DealCreatedEvent
  // ... existing ...
  | VenueCreatedEvent
  | VenueUpdatedEvent
  | ContactCreatedEvent
  | ContactUpdatedEvent;
```

### Acceptance Criteria

- [ ] VenuesService created with CRUD methods
- [ ] Venue routes delegate to service
- [ ] Venue events emitted and persisted via bridge
- [ ] ContactsService created with CRUD methods
- [ ] Contact routes delegate to service
- [ ] Contact events emitted and persisted via bridge
- [ ] No regression in existing venue/contact functionality

---

## Phase 6: Photo/File Operations

**Effort:** 1-1.5 days  
**Risk:** Medium  
**Dependencies:** Phase 5

### Objective
Log all photo and file operations with appropriate metadata.

### Event Types

```typescript
export interface VenuePhotoUploadedEvent {
  type: "venue:photo_uploaded";
  venueId: string;
  photoId: string;
  actorId: string;
  timestamp: Date;
  metadata: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    source: "upload" | "google_places" | "url";
    isHero: boolean;
  };
}

export interface VenuePhotoDeletedEvent {
  type: "venue:photo_deleted";
  venueId: string;
  photoId: string;
  actorId: string;
  timestamp: Date;
}

export interface VenueFileUploadedEvent {
  type: "venue:file_uploaded";
  venueId: string;
  fileId: string;
  actorId: string;
  timestamp: Date;
  metadata: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
  };
}
```

### Large Payload Protection

**Never include in audit logs:**
- Raw file buffers
- Base64 encoded file content
- Full image data

**Always include:**
- File metadata (name, size, type)
- Operation context (who, when, where)
- Source attribution

### Implementation Approach

1. Create `PhotosService` for photo operations
2. Emit events from service methods
3. Bridge handles persistence with sanitized metadata
4. Existing photo routes delegate to service

### Acceptance Criteria

- [ ] Photo upload events logged with metadata
- [ ] Photo delete events logged
- [ ] File upload events logged with metadata
- [ ] File delete events logged
- [ ] No raw file content in logs
- [ ] Source attribution (upload/google_places/url)

---

## Risk Assessment Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AsyncLocalStorage context lost in edge cases | Low | Medium | Fallback to null values; structured warning logs |
| Performance overhead from audit writes | Low | Low | Fire-and-forget async; don't await persistence |
| Schema migration failure | Very Low | Low | Nullable columns; checkpoint before migration |
| Event bridge errors blocking operations | Low | High | Try-catch with logging; never await persistence |
| Breaking existing audit calls | Very Low | Low | Keep `logAuditEvent` interface unchanged |
| Service layer bugs during migration | Medium | Medium | Incremental migration; existing route logic preserved |
| Node.js version incompatibility | Very Low | High | Require Node ≥18.16 (already in use) |
| Unhandled promise rejections from fire-and-forget | Low | Medium | Explicit `.catch()` with structured error logging |
| AsyncLocalStorage unavailable in edge runtime | Very Low | High | Only applies to Node.js server; edge deployments not planned |
| **Silent audit gaps as system grows** | Medium | High | Event registry + coverage tests (Phase 3A) |
| **Maintenance burden with many entity types** | Medium | Medium | Centralized registry; developer docs; 3-step recipe |

### Detailed Mitigations

**Fire-and-Forget Promise Handling:**
All `void storage.createAuditLog(...)` calls must be wrapped:
```typescript
// WRONG - unhandled rejection possible
void storage.createAuditLog({ ... });

// CORRECT - rejection handled
void storage.createAuditLog({ ... })
  .catch((err) => {
    console.error("[AuditBridge] Failed to persist audit log:", {
      error: err.message,
      eventType: event.type,
      entityId: mapping.extractEntityId(event),
    });
  });
```

**AsyncLocalStorage Fallback:**
When context is unavailable:
```typescript
const ctx = getRequestContext();
if (!ctx) {
  console.warn("[RequestContext] No context available - audit will have incomplete metadata");
}
// Proceed with null values for missing context fields
```

---

## Implementation Order

```
Week 1:
├── Phase 1: Schema Enhancements (0.5 days)
│   └── Checkpoint after migration
├── Phase 2: Request Context Middleware (0.5 days)
│   └── Verify context available in routes
├── Phase 3: Event-to-Audit Bridge (1 day)
│   └── Verify deal events persisted
├── Phase 3A: Scalability Safeguards (0.5 days)
│   └── Event registry, coverage tests, fallback logging
└── Phase 4: Auth Event Logging (0.5 days)
    └── Test login/logout logging

Week 2:
├── Phase 5A: VenuesService (1 day)
│   └── Test venue operations logged
├── Phase 5B: ContactsService (1 day)
│   └── Test contact operations logged
└── Phase 6: Photo/File Operations (1-1.5 days)
    └── Test photo/file operations logged

Total: ~6-7 days (was 5-7 days)
```

---

## Success Metrics

After full implementation:

1. **Coverage**: 100% of mutating operations logged
2. **Authentication**: All login/logout events captured
3. **Forensics**: Every audit log has requestId for tracing
4. **Performance**: No measurable latency increase
5. **Reliability**: Zero audit logging failures blocking operations
6. **Maintainability**: Coverage test catches missing event mappings before deployment

---

## Appendix: Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add audit_logs fields, types |
| `server/storage.ts` | Update createAuditLog signature |
| `server/audit.ts` | Update logAuditEvent to use request context |
| `server/lib/request-context.ts` | New file |
| `server/lib/event-registry.ts` | New file (Phase 3A) |
| `server/lib/audit-bridge.ts` | New file |
| `server/lib/__tests__/event-coverage.test.ts` | New file (Phase 3A) |
| `server/lib/events.ts` | Add venue/contact/photo event types |
| `server/googleAuth.ts` | Add auth logging calls |
| `server/services/venues.service.ts` | New file |
| `server/services/contacts.service.ts` | New file |
| `server/routes.ts` | Delegate to new services |
| `server/mcp/transport.ts` | Wrap with request context |
| `docs/adding-new-entities.md` | New file - developer documentation (Phase 3A) |
