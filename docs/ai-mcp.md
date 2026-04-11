# AI/MCP Readiness Implementation Plan

**Created:** January 6, 2026  
**Last Updated:** April 11, 2026  
**Status:** All Phases Complete - MCP Server Ready for Production (16 tools)

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
**Status:** Complete  
**Estimated Effort:** 3-4 days  
**Dependencies:** None

#### Objectives
- Create a reusable service layer that encapsulates business logic
- Enable the same logic to be called from HTTP routes, MCP tools, or CLI
- Centralize validation, audit logging, and permission checks

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/services/base.service.ts` | Base service class with common utilities | Complete |
| `server/services/deals.service.ts` | Deals domain service | Complete |
| `server/services/index.ts` | Service exports and initialization | Complete |
| Route refactoring | Update deal routes to use service layer | Complete |

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
**Status:** Complete  
**Estimated Effort:** 1-2 days  
**Dependencies:** Phase 1

#### Objectives
- Create a typed event emitter for domain events
- Enable AI to observe application activity
- Support future features like webhooks, real-time updates, analytics

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/lib/events.ts` | Typed event emitter with domain events | Complete |
| `server/lib/event-types.ts` | Type definitions for all events | Complete (integrated in events.ts) |
| Service integration | Emit events from service methods | Complete |

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
**Status:** Complete  
**Estimated Effort:** 1-2 days  
**Dependencies:** Phase 1, Phase 2

#### Objectives
- Create endpoints optimized for AI consumption
- Provide summarized, relevant context without overwhelming detail
- Enable AI to discover available actions

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `GET /api/ai/context/deal/:id` | Summarized deal with key relationships | Complete |
| `GET /api/ai/context/workspace` | User's current workspace state | Complete |
| `GET /api/ai/actions` | Available MCP tools/actions | Complete |
| `GET /api/ai/recent-activity` | Recent events for context | Complete |
| `server/routes/ai.routes.ts` | AI context routes module | Complete |

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
**Status:** Complete  
**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 1, Phase 2, Phase 3

#### Objectives
- Implement Model Context Protocol server
- Expose domain services as MCP tools
- Add authentication and safety guards

#### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| `server/mcp/index.ts` | MCP server initialization with 11 tools | Complete |
| `server/mcp/transport.ts` | SSE transport and HTTP endpoints | Complete |
| `server/mcp/rate-limit.ts` | Rate limiting (100 req/min per client) | Complete |
| Deal tools | list, get, create, update, move_stage, assign_owner | Complete |
| Venue tools | search, get | Complete |
| Contact tools | search, get | Complete |
| Workspace tool | workspace_summary | Complete |

#### MCP Tools

| Tool | Description | Risk Level |
|------|-------------|------------|
| `deals_list` | Search/filter deals | Low (read-only) |
| `deals_get` | Get deal by ID | Low (read-only) |
| `deals_create` | Create new deal | Medium |
| `deals_update` | Update deal fields | Medium |
| `deals_move_stage` | Change deal stage | Medium |
| `deals_assign_owner` | Assign/change deal owner | Medium |
| `venues_search` | Search venues | Low (read-only) |
| `venues_get` | Get venue details | Low (read-only) |
| `contacts_search` | Search contacts | Low (read-only) |
| `contacts_get` | Get contact details | Low (read-only) |
| `workspace_summary` | Get workspace state summary | Low (read-only) |
| `features_list` | List/filter feature requests by status and/or category | Low (read-only) |
| `features_get` | Get feature details including comments, category, creator | Low (read-only) |
| `features_update` | Update feature status, priority, title, description | Medium |
| `features_add_comment` | Post a comment to a feature as Replit Agent | Medium |
| `features_list_categories` | List available feature categories | Low (read-only) |

#### Safety Guards
- All MCP requests require authentication
- Rate limiting: 100 requests/minute per user
- High-risk operations require confirmation
- All MCP actions are audit logged with `source: 'mcp'`

---

## Progress Log

### April 11, 2026 — Feature Backlog MCP Tools, Auth & System User
- **Feature MCP Tools**: Added 5 new tools to the MCP server for feature backlog access:
  - `features_list` — List/filter features by status and/or category
  - `features_get` — Get a single feature by ID with comments, category, and creator
  - `features_update` — Update status, priority, title, description (auto-manages `completedAt`)
  - `features_add_comment` — Post a comment as the Replit Agent system user
  - `features_list_categories` — List available feature categories
- **Bearer Token Auth on MCP Transport**: Added `Authorization: Bearer <AGENT_API_KEY>` validation to all MCP endpoints (SSE, message, tools, health). When `AGENT_API_KEY` env var is set, unauthenticated connections are rejected with 401/403. Auth is disabled when the env var is not set (for development).
- **Replit Agent System User**: Created `ensureReplitAgentUser()` which upserts a well-known user record (`id: replit-agent`, role: admin) on first MCP connection. This fixes the existing silent audit log FK violations for deal MCP tools that used a non-existent `mcp-system` actor ID.
- **Agent Skill**: Created `.agents/skills/feature-backlog/SKILL.md` documenting the feature lifecycle workflow, available tools, authentication, and Replit integration registration steps.
- **Tools listing updated**: `/api/mcp/tools` now returns 16 tools (was 11) including all feature tools.

### January 7, 2026 (Phase 4)
- **Phase 4 Complete**: MCP Server Implementation
  - Installed `@modelcontextprotocol/sdk` package
  - Created `server/mcp/index.ts` with McpServer class and 11 registered tools
  - Created `server/mcp/transport.ts` with SSE transport and HTTP endpoints
  - Created `server/mcp/rate-limit.ts` with 100 requests/minute per client limiting
  - Implemented Deal tools: deals_list, deals_get, deals_create, deals_update, deals_move_stage, deals_assign_owner
  - Implemented Venue tools: venues_search, venues_get
  - Implemented Contact tools: contacts_search, contacts_get
  - Implemented workspace_summary tool for workspace state
  - All tools return structured JSON responses with error handling
  - MCP endpoints mounted at `/api/mcp` prefix (health, tools, sse, message)
  - **Security hardening**: 
    - Session IDs now use cryptographically secure randomBytes(32) from Node crypto
    - Session IDs are server-generated only (client-supplied IDs ignored)
    - Proper ServiceError unwrapping for structured error responses

### January 7, 2026 (Phase 3)
- **Phase 3 Complete**: AI Context Endpoints
  - Created `server/routes/ai.routes.ts` with four AI-optimized endpoints
  - `GET /api/ai/context/deal/:id`: Returns summarized deal with key relationships, natural language summary, and suggested next actions
  - `GET /api/ai/context/workspace`: Returns user context, deals summary by status, and recent activity count
  - `GET /api/ai/actions`: Lists 11 available MCP tools with descriptions, parameters, categories, and risk levels
  - `GET /api/ai/recent-activity`: Returns formatted domain events with human-readable summaries
  - All endpoints work without authentication for initial testing (production should add auth)
  - Endpoints mounted at `/api/ai` prefix in main routes

### January 7, 2026
- **Phase 1 Complete**: Domain Service Layer Foundation
  - Created `server/services/base.service.ts` with BaseService class and ServiceError types (NOT_FOUND, VALIDATION_ERROR, FORBIDDEN, CONFLICT)
  - Created `server/services/deals.service.ts` with full CRUD operations, stage transitions, owner assignment, and task management
  - Created `server/services/index.ts` for exports
  - Refactored all deal routes in `server/routes.ts` to use DealsService instead of direct storage calls
  - Added `handleServiceError` helper function for consistent HTTP error responses
  
- **Phase 2 Complete**: Event System
  - Created `server/lib/events.ts` with typed `DomainEventEmitter` class
  - Implemented 8 deal event types: created, updated, deleted, stage_changed, owner_assigned, task_created, task_updated, task_deleted
  - Event system stores last 100 events in memory for AI context retrieval
  - Integrated event emissions into all DealsService methods
  - Added `reorderDeals` to IStorage interface

- **Architecture Pattern Established**:
  - Route handlers now delegate to services for business logic
  - Services emit domain events for observability
  - Services throw typed errors; routes translate to HTTP status codes
  - All service methods accept `actorId` for audit trail

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
