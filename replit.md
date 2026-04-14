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
-   **PWA:** Progressive Web App with manifest.json, service worker (sw.js) for app shell caching, and update banner component. Icons at client/public/icon-192.png and icon-512.png. Service worker registered in production only.
-   **State Management:** TanStack Query for server state, React Hook Form with Zod for form state, and session-based caching for authentication.
-   **UI:** `shadcn/ui`, Tailwind CSS, AG Grid Community, Lucide React for iconography.

**Backend:**
-   **Framework:** Express.js with TypeScript.
-   **Authentication:** Replit OIDC via `passport.js` with session storage in PostgreSQL (`connect-pg-simple`).
-   **Authorization:** Database-backed role-based access control with tiered permissions middleware.
    - Roles are stored in the `roles` table with explicit per-role permission arrays
    - System roles: admin, manager, employee, viewer (cannot be deleted)
    - Custom roles: Sales Admin, Sales (and any user-created roles)
    - Permission resolution: middleware fetches from `roles` table, falls back to hardcoded tier presets
    - Tier presets available for creating new roles: Tier 0 (Viewer), Tier 1 (Employee), Tier 2 (Manager), Tier 3 (Admin)
    - Admin UI for role management at `/admin/roles` (requires `admin.settings` permission)
-   **Database ORM:** Drizzle ORM with Neon serverless PostgreSQL driver for type-safe queries.
-   **API:** RESTful endpoints under `/api`, consistent JSON request/response, and error handling.
-   **Domain-Based Modules:** Backend organized into domain modules under `server/domains/`:
    - `reference-data/` - Tags, amenities, industries, deal services, brands, vendor services (31 routes)
    - `admin/` - Team, invites, admin settings, activity tracking (21 routes)
    - `settings-comments/` - Theme settings, named themes CRUD, and entity comments (13 routes)
    - `issues-features/` - App issues, feature requests, and categories (19 routes)
    - `releases/` - App release and version management (14 routes)
    - `contacts/` - Contact CRUD with email/social management (12 routes)
    - `clients/` - Client organizations management (10 routes)
    - `vendors/` - Vendor management (14 routes)
    - `deals/` - Deal pipeline with service layer, linked clients, deal tags, deal intakes, intake-to-deal sync (21 routes)
    - `places/` - Google Places API integration (10 routes)
    - `venues/` - Venues, collections, floorplans, photos, files, tag suggestions (37 routes)
    - `forms/` - Form templates, requests, and public form submission (15 routes)
    - `drive-attachments/` - Google Drive file attachments for deals, venues, clients, vendors, contacts (3 routes)
    - `notifications/` - User notification system with in-app, email (Resend), and browser push channels (12 routes)
    
    **Refactor Status (January 2026):**
    - `routes.ts` reduced from 6,714 to 506 lines (92% reduction)
    - `storage.ts` reduced from 4,087 to 2,573 lines (37% reduction)
    - 201 routes extracted to domain modules
    - 8 core infrastructure routes remain in routes.ts (auth, object storage)
    
    **Domain Storage Files (3,211 lines total):**
    - `venues.storage.ts` (600 lines) - venue CRUD, photos, files, floorplans, collections, amenities, tags
    - `forms.storage.ts` (477 lines) - templates, requests, outreach tokens, responses
    - `admin.storage.ts` (365 lines) - team, invites, audit logs, activity tracking
    - `issues-features.storage.ts` (325 lines) - app issues, feature requests, categories
    - `reference-data.storage.ts` (322 lines) - tags, amenities, industries, brands, vendor services
    - `vendors.storage.ts` (309 lines) - vendor CRUD, services, update tokens
    - `releases.storage.ts` (289 lines) - app releases, version management
    - `contacts.storage.ts` (224 lines) - contact CRUD, relations, linking
    - `settings-comments.storage.ts` (315 lines) - theme settings, named themes CRUD, entity comments
    - `themes.seed.ts` - Built-in theme seeding (Default, Ocean, Warm, Monochrome)
    - `clients.storage.ts` (83 lines) - client CRUD, contact linking
    - `typeform-webhook.storage.ts` - Typeform webhook find-or-create logic for deals/contacts/clients
    - `typeform-webhook.routes.ts` - POST /api/webhooks/typeform endpoint with signature verification
    
    **Email Service:**
    - Provider: Resend (via `resend` npm package) — replaced SendGrid
    - Configuration: `RESEND_API_KEY` secret, `RESEND_FROM_EMAIL` env var (defaults to noreply@functionalartists.ai)
    - Functions: `sendVendorUpdateEmail`, `sendFormRequestEmail` in `server/email.ts`
    - Used by: `server/domains/vendors/vendors.routes.ts`, `server/domains/forms/forms.routes.ts`
    
    **Hybrid Service Layer:**
    - DealsService uses main storage interface for business logic with domain events
    - Other domains use direct storage access from domain storage files
    - Cross-domain queries (e.g., getDealsByClientId) remain in main storage.ts

    **Deal Status Reference Table (March 2026):**
    - `deal_statuses` table replaces hardcoded `dealStatuses` array
    - `deals.status` is now an integer FK to `deal_statuses.id`
    - `deals.status_legacy` preserves old string status values
    - 8 pipeline stages seeded: Prospecting, Initial Contact, Qualified Lead, Negotiation, Closed Won, Closed Lost, Declined by Us, Legacy
    - Active pipeline stages: Prospecting, Initial Contact, Qualified Lead, Negotiation (isActive=true)
    - Terminal/inactive stages: Closed Won, Closed Lost, Declined by Us, Legacy (isActive=false)
    - `GET /api/deal-statuses` endpoint returns all status metadata (colors, sort order, win probabilities, active/inactive flags)
    - Frontend uses `useDealStatuses()` hook to fetch status data from API
    - `DealWithRelations` includes `statusName` field from JOIN with `deal_statuses`
    - Migration order for deployments: run `scripts/migrations/001-deal-statuses.sql` before `db:push`
    - App startup seeds deal_statuses if empty (idempotent, for fresh databases only)

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
-   **Google Drive Attachments:** Allows users to attach Google Drive files (Docs, Sheets, Slides, PDFs, etc.) to deals, venues, clients, vendors, and contacts by pasting Drive sharing links. Uses the Google Drive connector for metadata resolution. Attached files display name, type icon, who attached them, and when. Files open in Google Drive in a new tab.
-   **Deal Summary Sheet Generation:** Generates Google Sheets from a configurable template. The template uses `{{token}}` placeholders (e.g. `{{client_name}}`, `{{budget_low}}`, `{{intake:field-event-name}}`) that get replaced with deal data. Template Sheet ID is configured in admin settings at `/admin/deal-settings`. OAuth scopes include `drive.file` and `spreadsheets`. The generated sheet is saved as a drive attachment on the deal.
-   **Notification System:** Multi-channel notification system (in-app, email via Resend, browser push via web-push/VAPID). Users can follow entities (deals, venues, vendors, clients, features, issues) to receive updates. Declarative routing rules map domain events to notification channels. Auto-follows on deal assignment, feature/issue creation. NotificationBell in header with unread count, mark-as-read. FollowButton on all entity detail pages. Push subscription management in service worker. Notification preferences per user per channel.

### Theme System
The app uses a multi-theme system where admins can create unlimited named themes:
- **Data Model:** `themes` table stores named themes with light/dark color variables, font selections, and built-in flag
- **Built-in Themes:** Default, Ocean, Warm, Monochrome - cannot be deleted but can be duplicated
- **Font System:** Each theme defines heading and body fonts loaded dynamically from Google Fonts CSS API
- **Status Indicator Colors:** Presence colors (online/away/busy/offline) and deal-status pipeline colors are part of the theme via CSS variables
- **Deal Status Colors:** Deal pipeline stage colors (prospecting, warm-lead, proposal, etc.) consolidated into theme CSS variables in index.css, replacing hardcoded hex values
- **User Selection:** Users pick themes via a popover in the sidebar; selection persisted in `users.selectedThemeId` column (server-side) with localStorage fallback for anonymous users
- **Light/Dark/System Toggle:** Remains as a separate sub-control within each theme
- **Admin Editor:** Full theme editor at `/admin/theme` with theme list panel, font picker, organized color groups (presence indicators, deal status colors), and live preview
- **API Endpoints:** `GET/POST /api/themes`, `GET/PATCH/DELETE /api/themes/:id`, `POST /api/themes/:id/duplicate`, `GET/PUT /api/themes/user-preference`
- **Legacy API Bridge:** `GET/PATCH /api/settings/theme` bridges to the new themes model for backward compatibility
- **Migration:** Existing `app_settings` theme entry migrated to `themes` table on first run; SQL migration at `migrations/0007_create_themes_table.sql`
- **Key Files:** `client/src/lib/theme-provider.tsx`, `client/src/pages/admin-theme-editor.tsx`, `server/domains/settings-comments/themes.seed.ts`

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
- Reference `docs/audit-logging-plan.md` for detailed implementation documentation

**Audit Coverage Status (January 2026):**
- 110 of 120 mutating routes now have audit logging (92% coverage)
- 10 routes intentionally excluded (analytics, search operations)
- All core business data routes covered: venues, collections, floorplans, photos, files, comments, deals, contacts
- All reference data management covered: amenities, industries, tags, vendor services, deal services
- Release management includes custom actions: link_feature, unlink_feature, link_issue, unlink_issue, add_change, remove_change
- See `docs/audit-coverage-report.md` for complete implementation status

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
| `docs/ai-mcp.md` | AI/MCP implementation plan and progress tracking | Update after completing each phase, or when implementation diverges from plan |
| `docs/mobile-app-support.md` | Mobile app backend support implementation plan | Update when implementing phases or making architectural decisions |
| `replit.md` | Project overview, architecture, and preferences | Update when adding major features or changing architecture |
| `docs/audit-*.md` | Technical audit reports | Create new file for each audit |

### ai-mcp.md Maintenance Requirements

**STRICT REQUIREMENT:** The `ai-mcp.md` file must be updated:
1. After completing each phase of the AI/MCP implementation
2. When implementation details diverge from the original plan
3. When design decisions are made that affect the architecture
4. To log progress with dates in the Progress Log section

The file serves as the source of truth for AI/MCP readiness work and must accurately reflect the current state of implementation.