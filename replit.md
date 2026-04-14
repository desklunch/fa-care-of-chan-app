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
- **Authentication:** Replit OIDC via `passport.js` with PostgreSQL session storage.
- **Authorization:** Database-backed role-based access control with tiered permissions middleware.
    - Roles are stored in the `roles` table with explicit per-role permission arrays.
    - System roles: admin, manager, employee, viewer.
    - Custom roles can be created and managed via an Admin UI.
- **Database ORM:** Drizzle ORM with Neon serverless PostgreSQL driver.
- **API:** RESTful endpoints under `/api` with consistent JSON and error handling.
- **Domain-Based Modules:** Backend organized into domain modules (e.g., `reference-data`, `admin`, `settings-comments`, `issues-features`, `releases`, `contacts`, `clients`, `vendors`, `deals`, `places`, `venues`, `forms`, `drive-attachments`, `notifications`) for modularity and maintainability.
- **Email Service:** Uses Resend for sending transactional emails.
- **Hybrid Service Layer:** Business logic for deals uses a service layer with domain events, while other domains directly access storage.
- **Deal Status Reference Table:** `deal_statuses` table stores pipeline stages, replacing hardcoded values, with an API endpoint to retrieve status metadata.

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