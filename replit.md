# Care of Chan OS - Enterprise Management System

## Overview
Care of Chan OS is an enterprise-grade management system designed to centralize the organization of venues, vendors, and team members. It provides a platform for browsing venues, managing vendor relationships, coordinating team activities, and submitting feature requests. The system incorporates role-based access controls and is built with a modern full-stack architecture utilizing React, Express, and PostgreSQL, aiming to streamline operations and enhance collaboration within an enterprise environment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system uses a React frontend with TypeScript, employing `shadcn/ui` (based on Radix UI) and Tailwind CSS for a utility-first styling approach. The design system adopts a Fluent/Carbon hybrid aesthetic, optimized for enterprise data presentation. AG Grid Community is used for data-intensive tables. Wouter handles client-side routing, and TanStack Query manages server state.

### Technical Implementations
**Frontend:**
- **Framework:** React 18+ with TypeScript, Vite build tool.
- **PWA:** Progressive Web App with manifest.json and service worker for app shell caching.
- **State Management:** TanStack Query for server state, React Hook Form with Zod for form state.
- **UI:** `shadcn/ui`, Tailwind CSS, AG Grid Community, Lucide React.

**Backend:**
- **Framework:** Express.js with TypeScript.
- **Authentication:** Replit OIDC via `passport.js` with session storage in PostgreSQL (`connect-pg-simple`).
- **Authorization:** Database-backed role-based access control with tiered permissions middleware.
    - Roles are stored in the `roles` table with explicit per-role permission arrays
    - System roles: admin, manager, employee, viewer (cannot be deleted)
    - Custom roles: Sales Admin, Sales (and any user-created roles)
    - Permission resolution: middleware fetches from `roles` table, falls back to hardcoded tier presets
    - Tier presets available for creating new roles: Tier 0 (Viewer), Tier 1 (Employee), Tier 2 (Manager), Tier 3 (Admin)
    - Admin UI for role management at `/admin/roles` (requires `admin.settings` permission)
- **Database ORM:** Drizzle ORM with Neon serverless PostgreSQL driver for type-safe queries.
- **API:** RESTful endpoints under `/api`, consistent JSON request/response, and error handling.
- **Domain-Based Modules:** Backend organized into domain modules under `server/domains/`:
    - `reference-data/` - Tags, amenities, industries, deal services, brands, vendor services (31 routes)
    - `admin/` - Team, invites, admin settings, activity tracking (21 routes)
    - `settings-comments/` - Theme settings and entity comments (7 routes)
    - `issues-features/` - App issues, feature requests, and categories (19 routes)
    - `releases/` - App release and version management (14 routes)
    - `contacts/` - Contact CRUD with email/social management (12 routes)
    - `clients/` - Client organizations management (10 routes)
    - `vendors/` - Vendor management (14 routes)
    - `deals/` - Deal pipeline with service layer, linked clients, deal tags, deal intakes, intake-to-deal sync (21 routes)
    - `places/` - Google Places API integration (10 routes)
    - `venues/` - Venues, collections, floorplans, photos, files, tag suggestions (37 routes)
    - `forms/` - Form templates, requests, and public form submission (15 routes)
    - `proposals/` - Proposal management with Asana-style task backlog, team, stakeholders, and comments (30+ routes)
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
    - `settings-comments.storage.ts` (217 lines) - theme settings, entity comments
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
- **User Management:** Role-based access and employee directory.
- **Invite System:** Token-based registration.
- **App Features System:** User-submitted ideas, feature status management, voting, and commenting.
- **App Release Management:** Create, manage, and publish software releases, linking features and issues.
- **Contact Management:** External contact information storage.
- **Google Places Integration:** Search, extract details, and import photos for venues.
- **Photo Management:** Stores venue photos in Replit App Storage, generates thumbnails, handles various upload sources, and supports reordering.
- **File Management:** Manages venue floorplans and general attachments with metadata.
- **Google Drive Attachments:** Attach Google Drive files to entities (deals, venues, clients, vendors, contacts) via sharing links.
- **Deal Summary Sheet Generation:** Generates Google Sheets from templates with `{{token}}` placeholders, saving the sheet as a drive attachment on the deal.
- **Notification System:** Multi-channel notifications (in-app, email, browser push) with entity following, declarative routing rules, and user preferences.

### Theme System
The application supports a multi-theme system allowing administrators to create and manage unlimited named themes:
- **Data Model:** `themes` table stores theme configurations (colors, fonts).
- **Built-in Themes:** Default, Ocean, Warm, Monochrome (non-deletable but duplicable).
- **Font System:** Themes define heading and body fonts loaded dynamically from Google Fonts.
- **Status Indicator Colors:** Presence and deal-status pipeline colors are theme-defined via CSS variables.
- **User Selection:** Users select themes via a UI, persisted server-side with local storage fallback.
- **Admin Editor:** Comprehensive theme editor at `/admin/theme` with live preview.

### System Design Choices
- **Database Schema:** Comprehensive schemas for all entities with relationships.
- **Storage:** Replit App Storage for photos and files with specific directory structures and thumbnail generation.
- **Optimistic UI Updates:** TanStack Query is used for an enhanced user experience in features like voting.
- **Migration Scripts:** Provided for data migration.
- **Audit Logging Architecture:** Uses both manual `logAuditEvent()` calls and an Event-to-Audit Bridge for domain events to ensure comprehensive audit trail persistence.

## External Dependencies

- **Authentication:** Replit OIDC provider.
- **Database:** Neon serverless PostgreSQL.
- **UI Components:** Radix UI primitives, AG Grid Community, Lucide React.
- **Mapping/Location Services:** Google Places API.
- **Image Processing:** Sharp (for thumbnail generation).
- **Object Storage:** Google Cloud Storage (via Replit App Storage).
- **Drag-and-Drop:** `@dnd-kit/core` and `@dnd-kit/sortable`.
- **Email Service:** Resend.