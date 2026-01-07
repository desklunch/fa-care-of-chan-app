# AI/MCP Readiness Implementation Plan

**Created:** January 6, 2026  
**Last Updated:** January 6, 2026  
**Status:** Planning Complete - Implementation Starting

---

## Overview

This document tracks the implementation of AI/MCP (Model Context Protocol) readiness for Care of Chan OS. The goal is to prepare the application architecture to support:

1. **Embedded AI Agent** - An AI assistant that can help users manage deals, venues, and contacts
2. **MCP Server** - A standardized interface for AI models to interact with the application
3. **Event Observability** - A system for AI to understand user actions and provide contextual assistance

---

## Architecture Vision

### Current State
```
User → Frontend → API Routes → Storage → Database
                      ↓
              (Business logic embedded in routes)
```

### Target State
```
                    ┌─────────────────┐
                    │   Frontend UI   │
                    └────────┬────────┘
                             │ HTTP
┌─────────────┐     ┌────────▼────────┐     ┌─────────────┐
│  AI Agent   │────►│  Domain Service │◄────│  MCP Server │
│  (Claude)   │     │     Layer       │     │   (Tools)   │
└─────────────┘     └────────┬────────┘     └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Event System   │──► AI Context / Observability
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Storage      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
```

---

## Implementation Phases

### Phase 1: Domain Service Layer Foundation
**Status:** Not Started  
**Estimated Effort:** 3-4 days  
**Dependencies:** None

#### Objectives
- Create a reusable service layer that encapsulates business logic
- Enable the same logic to be called from HTTP routes, MCP tools, or CLI
- Centralize validation, audit logging, and permission checks

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/services/base.service.ts` | Base service class with common utilities | Not Started |
| `server/services/deals.service.ts` | Deals domain service | Not Started |
| `server/services/index.ts` | Service exports and initialization | Not Started |
| Route refactoring | Update deal routes to use service layer | Not Started |

#### DealsService Methods

```typescript
interface IDealsService {
  // Query methods
  list(options: ListDealsOptions): Promise<DealWithRelations[]>;
  getById(id: string): Promise<DealWithRelations | null>;
  
  // Command methods
  create(data: CreateDealInput, actorId: string): Promise<Deal>;
  update(id: string, data: UpdateDealInput, actorId: string): Promise<Deal>;
  delete(id: string, actorId: string): Promise<void>;
  
  // Business operations
  moveToStage(id: string, stage: DealStatus, actorId: string): Promise<Deal>;
  assignOwner(id: string, ownerId: string, actorId: string): Promise<Deal>;
  linkContact(id: string, contactId: string, actorId: string): Promise<void>;
  unlinkContact(id: string, contactId: string, actorId: string): Promise<void>;
}
```

#### Design Decisions
- Services receive `actorId` for audit logging (not the full user object)
- Services throw typed errors that routes catch and translate to HTTP responses
- Services are stateless and can be instantiated per-request or as singletons

---

### Phase 2: Event System
**Status:** Not Started  
**Estimated Effort:** 1-2 days  
**Dependencies:** Phase 1

#### Objectives
- Create a typed event emitter for domain events
- Enable AI to observe application activity
- Support future features like webhooks, real-time updates, analytics

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/lib/events.ts` | Typed event emitter with domain events | Not Started |
| `server/lib/event-types.ts` | Type definitions for all events | Not Started |
| Service integration | Emit events from service methods | Not Started |

#### Event Types

```typescript
// Deal events
type DealEvents = {
  'deal:created': { deal: Deal; actorId: string };
  'deal:updated': { deal: Deal; changes: Partial<Deal>; actorId: string };
  'deal:deleted': { dealId: string; actorId: string };
  'deal:stage_changed': { deal: Deal; from: DealStatus; to: DealStatus; actorId: string };
  'deal:owner_assigned': { deal: Deal; previousOwnerId: string | null; actorId: string };
  'deal:contact_linked': { dealId: string; contactId: string; actorId: string };
  'deal:contact_unlinked': { dealId: string; contactId: string; actorId: string };
};

// Future: Venue events, Contact events, etc.
```

#### Design Decisions
- Events are fire-and-forget (don't block the main operation)
- Event payloads include enough context for consumers to act without additional queries
- Events are typed using TypeScript discriminated unions

---

### Phase 3: AI Context Endpoints
**Status:** Not Started  
**Estimated Effort:** 1-2 days  
**Dependencies:** Phase 1, Phase 2

#### Objectives
- Create endpoints optimized for AI consumption
- Provide summarized, relevant context without overwhelming detail
- Enable AI to discover available actions

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `GET /api/ai/context/deal/:id` | Summarized deal with key relationships | Not Started |
| `GET /api/ai/context/workspace` | User's current workspace state | Not Started |
| `GET /api/ai/actions` | Available MCP tools/actions | Not Started |
| `GET /api/ai/recent-activity` | Recent events for context | Not Started |

#### Endpoint Specifications

**GET /api/ai/context/deal/:id**
```json
{
  "deal": {
    "id": "abc123",
    "displayName": "Acme Corp Holiday Party",
    "status": "qualifying",
    "budget": { "low": 50000, "high": 75000 },
    "client": { "id": "...", "name": "Acme Corp" },
    "owner": { "id": "...", "name": "Jane Smith" },
    "primaryContact": { "id": "...", "name": "John Doe", "email": "..." }
  },
  "summary": "Qualifying stage deal for Acme Corp, $50-75k budget, last contact 3 days ago",
  "suggestedActions": [
    { "action": "deals.move_stage", "label": "Move to Proposal", "params": { "stage": "proposal" } },
    { "action": "deals.update", "label": "Update last contact date" }
  ]
}
```

**GET /api/ai/actions**
```json
{
  "tools": [
    {
      "name": "deals.list",
      "description": "Search and filter deals",
      "parameters": { "status": "DealStatus[]", "ownerId": "string", "search": "string" }
    },
    {
      "name": "deals.create",
      "description": "Create a new deal",
      "parameters": { "displayName": "string", "clientId": "string", "status": "DealStatus" }
    }
  ]
}
```

---

### Phase 4: MCP Server Implementation
**Status:** Not Started  
**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 1, Phase 2, Phase 3

#### Objectives
- Implement Model Context Protocol server
- Expose domain services as MCP tools
- Add authentication and safety guards

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/mcp/index.ts` | MCP server initialization | Not Started |
| `server/mcp/tools/deals.ts` | Deal-related MCP tools | Not Started |
| `server/mcp/tools/venues.ts` | Venue-related MCP tools | Not Started |
| `server/mcp/tools/contacts.ts` | Contact-related MCP tools | Not Started |
| `server/mcp/auth.ts` | MCP authentication middleware | Not Started |
| `server/mcp/rate-limit.ts` | Rate limiting for AI requests | Not Started |

#### MCP Tools (Initial Set)

| Tool | Description | Risk Level |
|------|-------------|------------|
| `deals.list` | Search/filter deals | Low (read-only) |
| `deals.get` | Get deal by ID | Low (read-only) |
| `deals.create` | Create new deal | Medium |
| `deals.update` | Update deal fields | Medium |
| `deals.move_stage` | Change deal stage | Medium |
| `venues.search` | Search venues | Low (read-only) |
| `venues.get` | Get venue details | Low (read-only) |
| `contacts.search` | Search contacts | Low (read-only) |
| `contacts.get` | Get contact details | Low (read-only) |

#### Safety Guards
- All MCP requests require authentication
- Rate limiting: 100 requests/minute per user
- High-risk operations require confirmation
- All MCP actions are audit logged with `source: 'mcp'`

---

## Progress Log

### January 6, 2026
- Created initial implementation plan
- Defined phase structure and deliverables
- Established architecture vision

---

## Future Considerations

### Expansion to Other Domains
After validating the pattern with Deals, extend to:
- VenuesService
- ClientsService
- ContactsService
- CollectionsService

### Advanced AI Features
- Proactive suggestions based on event patterns
- Natural language query interface
- Automated deal stage recommendations
- Meeting/follow-up scheduling assistance

### Multi-tenant Considerations
- Tenant-scoped MCP connections
- Per-tenant rate limits
- Tenant-specific tool availability

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- Audit Report: `audit-20260106.md`
