# Monolithic Backend Refactoring Plan

**Created:** January 15, 2026  
**Status:** Draft - Pending Approval  
**Purpose:** Split routes.ts and storage.ts into domain-based modules with hybrid service layer strategy

---

## Executive Summary

This plan addresses the "Monolithic Backend Files" issue from audit-20260106.md while aligning with the existing AI/MCP readiness architecture.

| File | Lines | Key Metrics |
|------|-------|-------------|
| server/routes.ts | 6,657 | 210 route handlers |
| server/storage.ts | 4,198 | 148 storage methods |
| **Total** | **10,855** | **15+ domains identified** |

**Hybrid Approach:** Extract storage for all domains, add service layer selectively for high-value domains where AI/MCP actions would be useful.

---

## Part 1: Current Architecture Analysis

### 1.1 Existing Service Layer Pattern

The codebase has a partial service layer with domain events:

```
┌─────────────────────────────────────────────────────────────┐
│                     routes.ts                                │
├─────────────────────────────────────────────────────────────┤
│ Deals routes → DealsService → storage + domainEvents.emit() │
│ Auth routes  → googleAuth.ts → domainEvents.emit()          │
├─────────────────────────────────────────────────────────────┤
│ All other routes → storage.method() + logAuditEvent()       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Event System Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| Domain Events | `server/lib/events.ts` | 22 event types defined |
| Event Registry | `server/lib/event-registry.ts` | Maps events → audit format |
| Audit Bridge | `server/lib/audit-bridge.ts` | Auto-persists events to audit_logs |
| Request Context | `server/lib/request-context.ts` | AsyncLocalStorage for request metadata |

### 1.3 Two Audit Patterns in Use

1. **Event-based (Deals, Auth):** Service emits `domainEvents.emit()` → audit-bridge persists automatically
2. **Manual (Everything else):** Route calls `logAuditEvent(req, {...})` directly

---

## Part 2: Domain Analysis

### 2.1 Identified Domains (by route count)

| Domain | Routes | Storage Methods | Service Layer? | Priority |
|--------|--------|-----------------|----------------|----------|
| **Venues** | 24 | 28 | YES (AI actions) | High |
| **Deals** | 13 | 14 | EXISTS | High |
| **Vendors** | 16 | 16 | LATER | High |
| **Contacts** | 13 | 12 | LATER | High |
| **Clients** | 13 | 9 | LATER | High |
| **Features** | 13 | 16 | NO (internal) | Medium |
| **Releases** | 15 | 12 | NO (internal) | Medium |
| **Forms** | 14 | 11 | YES (AI actions) | Medium |
| **Comments** | 6 | 8 | NO | Low |
| **Reference Data** | 25 | 15 | NO | Low |
| **Admin/Settings** | 12 | 8 | NO | Low |
| **Auth/Team** | 10 | 8 | EXISTS (partial) | Low |
| **Analytics** | 8 | 8 | NO | Low |
| **Photos/Files** | 18 | 12 | LATER | Medium |
| **Collections** | 10 | 8 | LATER | Low |

### 2.2 Domain Dependencies

```
Auth → Team, Users
Deals → Clients, Contacts, Venues, DealServices
Clients → Contacts, Industries, Brands
Vendors → Contacts, VendorServices
Venues → Amenities, Tags, Photos, Files, Floorplans, Collections
Features → Comments, Categories, Votes
Releases → Features, Issues, Changes
Forms → Templates, Requests, Recipients, Responses
Comments → (shared across entities)
Reference Data → Industries, Tags, Amenities, DealServices, VendorServices, Brands
```

---

## Part 3: Unused/Dead Code Analysis

### 3.1 Storage Methods Not Called From Routes

28 storage methods are not directly called from `routes.ts`. After analysis:

| Method | Used By | Verdict |
|--------|---------|---------|
| `createAuditLog` | audit.ts, audit-bridge.ts | **KEEP** |
| Deal methods (9) | deals.service.ts | **KEEP** |
| Floorplan methods (5) | routes.ts (verified) | **KEEP** |
| `markInviteUsed`, `upsertUser` | googleAuth.ts | **KEEP** |
| `getContacts()` | None | **REVIEW** - superseded by WithRelations |
| `getVendors()` | None | **REVIEW** - superseded by WithRelations |
| `getVenues()` | None | **REVIEW** - superseded by WithRelations |
| `getVendorsWithServices()` | None | **REVIEW** - superseded by WithRelations |
| `getSetting()`, `setSetting()` | None | **REVIEW** - unused |
| `getFormResponseByToken()` | None | **REVIEW** - potentially unused |
| `getOutreachTokensByRequestId()` | None | **REVIEW** - potentially unused |

### 3.2 Candidates for Removal (Post-Refactor)

| Method | Reason | Risk |
|--------|--------|------|
| `getContacts()` | Superseded by `getContactsWithRelations()` | Low |
| `getVendors()` | Superseded by `getVendorsWithRelations()` | Low |
| `getVendorsWithServices()` | Superseded by `getVendorsWithRelations()` | Low |
| `getVenues()` | Superseded by `getVenuesWithRelations()` | Low |
| `getSetting()`, `setSetting()` | No callers found | Low |
| `getFormResponseByToken()` | No callers found | Medium |
| `getOutreachTokensByRequestId()` | No callers found | Medium |

**Action:** Verify with full grep before removal; postpone until refactor is stable.

---

## Part 4: Naming Consistency Analysis

### 4.1 Route Path Inconsistencies

| Issue | Examples | Recommendation |
|-------|----------|----------------|
| Mixed kebab/camelCase | `vendor-services` vs `dealServices` (in code) | Standardize URLs to kebab-case |
| Mixed param naming | `:id` vs `:venueId` vs `:featureId` | Use descriptive params for nested resources |
| Admin prefix inconsistency | `/api/admin/categories` vs `/api/categories` | Keep admin prefix for admin-only routes |

### 4.2 Storage Method Naming

| Issue | Examples | Recommendation |
|-------|----------|----------------|
| Mixed relation naming | `WithRelations` vs `WithServices` vs `WithCreator` | Standardize to `WithRelations` |
| Bulk operations | `createVenueFiles` vs `createVenuePhotos` | Consider `Bulk` suffix for clarity |

### 4.3 Validation Gaps

~15 routes destructure `req.body` without Zod validation. Will be fixed during extraction.

---

## Part 5: Proposed Architecture

### 5.1 Target Directory Structure

```
server/
├── domains/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   └── auth.storage.ts
│   ├── deals/
│   │   ├── deals.routes.ts
│   │   ├── deals.storage.ts
│   │   └── deals.service.ts      # EXISTS - relocate
│   ├── venues/
│   │   ├── venues.routes.ts
│   │   ├── venues.storage.ts
│   │   ├── venues.service.ts     # NEW - AI/MCP actions
│   │   ├── photos.routes.ts
│   │   ├── photos.storage.ts
│   │   ├── files.routes.ts
│   │   ├── files.storage.ts
│   │   ├── floorplans.routes.ts
│   │   └── floorplans.storage.ts
│   ├── vendors/
│   │   ├── vendors.routes.ts
│   │   └── vendors.storage.ts
│   ├── clients/
│   │   ├── clients.routes.ts
│   │   └── clients.storage.ts
│   ├── contacts/
│   │   ├── contacts.routes.ts
│   │   └── contacts.storage.ts
│   ├── features/
│   │   ├── features.routes.ts
│   │   └── features.storage.ts
│   ├── releases/
│   │   ├── releases.routes.ts
│   │   └── releases.storage.ts
│   ├── forms/
│   │   ├── forms.routes.ts
│   │   ├── forms.storage.ts
│   │   └── forms.service.ts      # NEW - AI/MCP actions
│   ├── comments/
│   │   ├── comments.routes.ts
│   │   └── comments.storage.ts
│   ├── reference/
│   │   ├── reference.routes.ts
│   │   └── reference.storage.ts
│   ├── admin/
│   │   ├── admin.routes.ts
│   │   └── admin.storage.ts
│   └── analytics/
│       ├── analytics.routes.ts
│       └── analytics.storage.ts
├── lib/
│   ├── events.ts                 # Domain events (exists)
│   ├── event-registry.ts         # Event → audit mapping (exists)
│   ├── audit-bridge.ts           # Auto-persist (exists)
│   ├── request-context.ts        # Request metadata (exists)
│   └── route-utils.ts            # NEW - shared route helpers
├── services/
│   ├── base.service.ts           # EXISTS
│   ├── deals.service.ts          # EXISTS - will move to domains/deals/
│   └── index.ts
├── routes.ts         # Aggregator - composes domain routers
├── storage.ts        # Facade - delegates to domain storage
└── index.ts
```

### 5.2 Shared Route Utilities (New)

Create `server/lib/route-utils.ts` before extraction:

```typescript
import { Response } from "express";
import { ServiceError } from "../services/base.service";
import { ZodSchema, ZodError } from "zod";

export function handleServiceError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
      FORBIDDEN: 403,
      CONFLICT: 409,
    };
    const status = statusMap[error.code] || 500;
    res.status(status).json({ message: error.message, details: error.details });
    return;
  }
  console.error(fallbackMessage, error);
  res.status(500).json({ message: fallbackMessage });
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): 
  { success: true; data: T } | { success: false; errors: unknown } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, errors: result.error.flatten() };
  }
  return { success: true, data: result.data };
}

export function handleValidationError(res: Response, error: ZodError): void {
  res.status(400).json({ 
    message: "Validation failed", 
    errors: error.flatten() 
  });
}
```

---

## Part 6: Hybrid Migration Strategy

### Phase 0: Foundation (Pre-requisite)
- [ ] Create `server/lib/route-utils.ts` with shared helpers
- [ ] Create `server/domains/` directory structure
- [ ] Verify middleware order documentation

### Phase 1: Reference Data (Low Risk, No Service Layer)
- [ ] Extract reference data routes (industries, tags, amenities, deal-services, vendor-services, brands)
- [ ] Extract reference data storage methods
- [ ] Update imports, verify application works
- [ ] **Pattern:** Routes → Storage directly, keep `logAuditEvent()`

### Phase 2: Analytics & Admin (Low Risk, Validate Composition)
- [ ] Extract analytics routes and storage
- [ ] Extract admin routes and storage
- [ ] Validate router composition pattern works
- [ ] **Pattern:** Routes → Storage directly

### Phase 3: Contacts (Medium Risk, No Service Layer Yet)
- [ ] Extract contacts routes and storage
- [ ] Verify client-contact and vendor-contact linking
- [ ] **Pattern:** Routes → Storage directly, keep `logAuditEvent()`

### Phase 4: Clients & Vendors (Medium Risk, No Service Layer Yet)
- [ ] Extract clients routes and storage
- [ ] Extract vendors routes and storage
- [ ] Verify relationships and inline editing
- [ ] **Pattern:** Routes → Storage directly

### Phase 5: Deals (Relocate Existing Service)
- [ ] Move `deals.service.ts` to `domains/deals/`
- [ ] Extract deals routes and storage
- [ ] Verify service layer still works
- [ ] **Pattern:** Routes → DealsService → Storage + domainEvents (EXISTS)

### Phase 6: Venues Complex (High Value, Add Service Layer)
- [ ] Extract venues core routes and storage
- [ ] Extract photos, files, floorplans as sub-modules
- [ ] Extract collections routes and storage
- [ ] **Create VenuesService** with domain events for AI/MCP actions
- [ ] Activate existing venue events in event-registry
- [ ] **Pattern:** Routes → VenuesService → Storage + domainEvents

### Phase 7: Features & Releases (Internal, No Service Layer)
- [ ] Extract features routes and storage
- [ ] Extract releases routes and storage
- [ ] Verify feature-release linking, voting, comments
- [ ] **Pattern:** Routes → Storage directly

### Phase 8: Forms (Add Service Layer for AI Actions)
- [ ] Extract forms routes and storage
- [ ] **Create FormsService** with domain events
- [ ] Add form events to event-registry
- [ ] Verify form requests, templates, email sending
- [ ] **Pattern:** Routes → FormsService → Storage + domainEvents

### Phase 9: Auth & Team (Last, Highest Risk)
- [ ] Extract auth routes and storage
- [ ] Extract team routes
- [ ] Preserve existing auth event emissions
- [ ] Verify login/logout, invites, session management
- [ ] **Pattern:** Keep existing auth patterns

### Phase 10: Cleanup & Standardization
- [ ] Remove verified dead code
- [ ] Standardize naming conventions per domain
- [ ] Add missing Zod validation
- [ ] Update replit.md with new architecture
- [ ] Update ai-mcp.md with service layer status

---

## Part 7: Service Layer Strategy

### 7.1 When to Add Service Layer

Add service layer for domains where:
1. AI/MCP agents need to perform actions
2. Complex business logic exists
3. Multiple events should be emitted per operation
4. Audit trail via events is preferred over manual logging

### 7.2 Domains Getting Service Layer

| Domain | Service | Reason |
|--------|---------|--------|
| Deals | EXISTS | Complex workflows, AI pipeline management |
| Venues | NEW | AI can create/update venues, manage photos |
| Forms | NEW | AI can send form requests, process responses |
| Clients | FUTURE | AI can manage client relationships |
| Vendors | FUTURE | AI can coordinate vendor outreach |

### 7.3 Service Layer Pattern

```typescript
// domains/venues/venues.service.ts
export class VenuesService extends BaseService {
  async create(data: CreateVenue, actorId: string): Promise<Venue> {
    const parsed = insertVenueSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid venue data", {
        errors: parsed.error.flatten(),
      });
    }

    const venue = await this.storage.createVenue(parsed.data);

    domainEvents.emit({
      type: "venue:created",
      venueId: venue.id,
      venueName: venue.name,
      actorId,
      timestamp: new Date(),
    });

    return venue;
  }
  // ... update, delete with events
}
```

---

## Part 8: Production Risk Assessment

### 8.1 Risk Matrix

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking API contracts | HIGH | No URL changes; only internal reorganization |
| Missing middleware | HIGH | Document and verify order (auth → CSRF → context) |
| Circular imports | MEDIUM | Use barrel exports, dependency injection |
| Storage unavailable | MEDIUM | Facade pattern maintains single interface |
| Event system breaks | MEDIUM | Service layers tested individually |
| Session/auth issues | MEDIUM | Auth extracted last after all patterns validated |

### 8.2 Production Compatibility

**Aggregator Pattern (Safe):**
```typescript
// routes.ts (after refactor)
import { registerReferenceRoutes } from "./domains/reference/reference.routes";
import { registerVenueRoutes } from "./domains/venues/venues.routes";
// ...

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  setupCsrf(app);
  app.use(requestContextMiddleware);
  initializeAuditBridge();

  registerReferenceRoutes(app);
  registerVenueRoutes(app);
  // ... all domain routes
  
  return createServer(app);
}
```

### 8.3 Rollback Strategy

- Each phase is a separate commit
- Checkpoints created before each major change
- No database migrations required
- If issues arise, rollback to previous checkpoint

---

## Part 9: Testing Strategy

### Per-Phase Checklist
- [ ] TypeScript compiles without errors
- [ ] Application starts without errors
- [ ] Route count matches previous (verify with grep)
- [ ] Frontend features work (manual smoke test)
- [ ] Audit logs still created for mutations
- [ ] No new console errors

### Post-Phase 6 (Venues Service)
- [ ] Domain events emit correctly
- [ ] Audit bridge persists events
- [ ] No duplicate audit entries (event + manual)

---

## Part 10: Integration with AI/MCP Roadmap

### Current State (from ai-mcp.md)
- Domain events: 22 types defined
- Audit bridge: Functional
- Service layer: Deals only
- MCP readiness: Partial

### Post-Refactor State
- Service layer: Deals, Venues, Forms
- New events: Venue CRUD, Form actions
- MCP actions: Can use services directly
- Code organization: Domain-based, testable

### Future MCP Actions Enabled
```typescript
// Example MCP action using VenuesService
{
  name: "create_venue",
  handler: async (params, context) => {
    const venue = await venuesService.create(params, context.actorId);
    return { success: true, venueId: venue.id };
  }
}
```

---

## Appendix A: Route Count by Domain

| Domain | GET | POST | PATCH | PUT | DELETE | Total |
|--------|-----|------|-------|-----|--------|-------|
| Auth/Team | 6 | 2 | 2 | 0 | 0 | 10 |
| Invites | 3 | 2 | 0 | 0 | 1 | 6 |
| Features | 3 | 3 | 2 | 0 | 2 | 10 |
| Categories | 1 | 1 | 1 | 1 | 0 | 4 |
| Contacts | 5 | 3 | 1 | 0 | 3 | 12 |
| Vendors | 4 | 4 | 2 | 0 | 2 | 12 |
| Vendor Services | 2 | 1 | 1 | 0 | 1 | 5 |
| Venues | 5 | 3 | 1 | 2 | 1 | 12 |
| Venue Photos | 1 | 2 | 1 | 1 | 1 | 6 |
| Venue Files | 1 | 2 | 1 | 0 | 1 | 5 |
| Venue Collections | 3 | 2 | 1 | 1 | 2 | 9 |
| Deals | 3 | 3 | 1 | 0 | 1 | 8 |
| Deal Tasks | 1 | 1 | 1 | 0 | 1 | 4 |
| Clients | 4 | 2 | 1 | 0 | 2 | 9 |
| Reference Data | 15 | 5 | 5 | 0 | 5 | 30 |
| Releases | 4 | 4 | 1 | 0 | 4 | 13 |
| Forms | 5 | 5 | 2 | 0 | 2 | 14 |
| Comments | 2 | 1 | 1 | 0 | 1 | 5 |
| Analytics | 2 | 4 | 0 | 1 | 0 | 7 |
| Admin | 3 | 0 | 1 | 0 | 0 | 4 |
| Places | 10 | 1 | 0 | 0 | 0 | 11 |
| Public | 2 | 0 | 0 | 0 | 0 | 2 |
| **Total** | **85** | **51** | **26** | **6** | **30** | **210** |

---

## Progress Log

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2026-01-15 | Plan Created | Draft | Hybrid approach with selective service layers |
| | | | |

---

## Approval Checklist

- [ ] Plan reviewed by user
- [ ] Architect review passed
- [ ] Phase 0 prerequisites identified
- [ ] Ready for implementation
