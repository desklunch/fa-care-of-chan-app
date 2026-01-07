# Care of Chan OS - Enterprise Management System

## Overview
Care of Chan OS is an enterprise-grade management system designed to centralize the organization of venues, vendors, and team members. It provides a platform for browsing venues, managing vendor relationships, coordinating team activities, and submitting feature requests. The system incorporates role-based access controls and is built with a modern full-stack architecture utilizing React, Express, and PostgreSQL, aiming to streamline operations and enhance collaboration within an enterprise environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system uses a React frontend with TypeScript, employing `shadcn/ui` (based on Radix UI) and Tailwind CSS for a utility-first styling approach. The design system adopts a Fluent/Carbon hybrid aesthetic, optimized for enterprise data presentation. AG Grid Community is used for data-intensive tables like employee directories. Wouter handles client-side routing, and TanStack Query manages server state.

### Technical Implementations
**Frontend:**
-   **Framework:** React 18+ with TypeScript.
-   **Build Tool:** Vite.
-   **State Management:** TanStack Query for server state, React Hook Form with Zod for form state, and session-based caching for authentication.
-   **UI:** `shadcn/ui`, Tailwind CSS, AG Grid Community, Lucide React for iconography.

**Backend:**
-   **Framework:** Express.js with TypeScript.
-   **Authentication:** Replit OIDC via `passport.js` with session storage in PostgreSQL (`connect-pg-simple`).
-   **Authorization:** Role-based access control (admin/employee) with middleware.
-   **Database ORM:** Drizzle ORM with Neon serverless PostgreSQL driver for type-safe queries.
-   **API:** RESTful endpoints under `/api`, consistent JSON request/response, and error handling.

### Feature Specifications
The system includes modules for:
-   **User Management:** Role-based access, employee directory.
-   **Invite System:** Token-based registration for new users.
-   **App Features System:** Allows users to submit ideas and requirements, manage feature status (proposed, in_progress, completed), and vote/comment on features. Includes admin tools for category management.
-   **App Release Management:** Enables administrators to create, manage, and publish software releases, linking features and issues to specific versions.
-   **Contact Management:** Stores external contact information including personal details, contact methods, and social profiles.
-   **Google Places Integration:** Facilitates searching for venues, extracting details (address, phone, website), and importing photos from Google Places.
-   **Photo Management:** Stores venue-related photos in Replit App Storage, generates thumbnails, handles uploads from various sources (direct, URL, Google Places), and supports drag-and-drop reordering with a hero image flag.
-   **File Management:** Manages venue floorplans and general attachments, supporting various file types, secure storage, and detailed metadata.

### System Design Choices
-   **Database Schema:** Comprehensive schemas for users, invites, sessions, audit logs, app features, releases, contacts, venue photos, and venue files, including relationships and specific data types for each entity.
-   **Storage:** Replit App Storage (object storage) is used for photos and files, with specific directory structures and automatic thumbnail generation.
-   **Optimistic UI Updates:** TanStack Query is configured for optimistic updates in features like voting to enhance user experience.
-   **Migration Scripts:** Provided for data migration, e.g., for moving existing venue photos to the new storage system.

### Audit Logging Architecture

The system uses a comprehensive audit logging infrastructure with two complementary patterns:

1. **Manual Audit Logging (`logAuditEvent`)**: Most routes call `logAuditEvent()` directly for audit trail persistence. This handles venues, contacts, photos, files, and other CRUD operations.

2. **Event-to-Audit Bridge**: Domain events (deals, auth) are automatically persisted to audit_logs via the bridge in `server/lib/audit-bridge.ts`. This pattern is preferred for new service-layer code.

**Key Infrastructure Files:**
- `server/lib/request-context.ts` - AsyncLocalStorage for request context propagation
- `server/lib/event-registry.ts` - Single source of truth for event-to-audit mappings (22 event types)
- `server/lib/audit-bridge.ts` - Auto-persists domain events to audit_logs table
- `server/lib/events.ts` - Domain event type definitions
- `server/audit.ts` - Manual audit logging helper with request context integration

**Developer Guidelines:**
- For new service layers: Emit domain events, let the bridge handle audit persistence
- For existing routes: Continue using `logAuditEvent()` 
- Add new event types to both `events.ts` AND `event-registry.ts` to avoid silent audit gaps
- Reference `audit-logging-plan.md` for detailed implementation documentation

## External Dependencies

-   **Authentication:** Replit OIDC provider.
-   **Database:** Neon serverless PostgreSQL.
-   **UI Components:** Radix UI primitives, AG Grid Community, Lucide React.
-   **Utilities:** `date-fns`, `nanoid`, `zod`, `class-variance-authority`.
-   **Mapping/Location Services:** Google Places API.
-   **Image Processing:** Sharp (for thumbnail generation).
-   **Object Storage:** Google Cloud Storage (via Replit App Storage).
-   **Drag-and-Drop:** `@dnd-kit/core` and `@dnd-kit/sortable`.

## Documentation Requirements

### Mandatory Documentation Files

The following documentation files MUST be maintained as part of development:

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `ai-mcp.md` | AI/MCP implementation plan and progress tracking | Update after completing each phase, or when implementation diverges from plan |
| `replit.md` | Project overview, architecture, and preferences | Update when adding major features or changing architecture |
| `audit-*.md` | Technical audit reports | Create new file for each audit |

### ai-mcp.md Maintenance Requirements

**STRICT REQUIREMENT:** The `ai-mcp.md` file must be updated:
1. After completing each phase of the AI/MCP implementation
2. When implementation details diverge from the original plan
3. When design decisions are made that affect the architecture
4. To log progress with dates in the Progress Log section

The file serves as the source of truth for AI/MCP readiness work and must accurately reflect the current state of implementation.