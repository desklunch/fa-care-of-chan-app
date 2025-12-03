# Employee Directory - Enterprise Employee Management System

## Overview

An enterprise-grade employee directory application for managing organizational employee information. The system provides a centralized platform for browsing employee profiles, managing contact details, and administering team members through role-based access controls. Built with a modern full-stack architecture featuring React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server with HMR support
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- AG Grid Community for data-intensive employee directory tables
- Design system follows Fluent/Carbon hybrid approach optimized for enterprise data presentation

**State Management Strategy**
- Server state managed via TanStack Query with configured stale times
- Form state handled by React Hook Form with Zod validation
- Authentication state cached in React Query with 5-minute stale time
- No global client state management library - leverages React Query cache

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for REST API endpoints
- Custom middleware for request logging and error handling
- Session-based authentication with secure cookie storage

**Authentication & Authorization**
- Replit OIDC (OpenID Connect) integration via passport.js
- Session storage in PostgreSQL using connect-pg-simple
- Role-based access control (admin/employee roles)
- Protected routes with isAuthenticated and isAdmin middleware

**Database Layer**
- Drizzle ORM with Neon serverless PostgreSQL driver
- Type-safe database queries with schema validation
- Storage abstraction layer (IStorage interface) for data operations
- Schema includes users, invites, and sessions tables

**API Design Pattern**
- RESTful endpoints under `/api` namespace
- Consistent error handling with HTTP status codes
- JSON request/response format
- CRUD operations for employees and invite management

### Data Storage

**Database Schema**

Users table:
- Authentication fields (id, email)
- Profile information (firstName, lastName, title, department, phone, location, bio)
- Role-based access (role: 'admin' | 'employee')
- Profile image URL storage
- Timestamps for audit trail

Invites table:
- Token-based registration system
- Pre-populated employee details (email, firstName, lastName)
- Expiration tracking
- Usage tracking (usedAt timestamp)
- Creator reference (createdById)

Sessions table:
- Express session storage for Replit Auth
- Session ID, data blob, and expiration

Audit Logs table:
- Action tracking (create, update, delete, login, logout, email_sent, invite_used)
- Entity type and ID for affected resources (user, invite, session, app_feature, app_feature_category, app_feature_comment)
- Performer tracking with user reference
- Request metadata (IP address, user agent)
- Status field (success/failure)
- JSONB changes field for before/after state tracking
- JSONB metadata for additional context
- Indexed by performedAt, entityType, and performedBy for efficient queries

### App Features System

App Feature Categories table (app_feature_categories):
- Unique category name with optional description
- Color for visual identification
- Active flag to control visibility
- sortOrder for drag-and-drop reordering
- Timestamps for audit

App Features table (app_features):
- Title and description for feature requests
- featureType: "idea" or "requirement" - submitter labels their request
- Status workflow: proposed → under_review → planned → in_progress → completed → archived
- Required categoryId linking to app_feature_categories
- createdById and ownerId for user attribution
- voteCount cached for performance
- Timestamps for tracking

App Feature Votes table (app_feature_votes):
- Unique constraint on featureId + userId (one vote per user per feature)
- Value field for vote weight (default 1)

App Feature Comments table (app_feature_comments):
- featureId and userId references
- body text field for comment content
- Timestamps for audit

Contacts table:
- externalId for integration with external systems (indexed)
- firstName and lastName (required varchar fields)
- phoneNumbers and emailAddresses (text arrays for multiple values)
- jobTitle for professional role
- dateOfBirth (timestamp)
- instagramUsername and linkedinUsername for social profiles
- homeAddress (text field)
- Timestamps for audit

**App Features Frontend Pages**
- /app/features - Feature list with cards, status/category filters, voting, and new feature dialog
- /app/features/:id - Feature detail view with comments, admin status controls, voting
- /admin/app/features - Category management (admin only) with create/edit dialogs

**Key Implementation Details**
- Optimistic voting updates via TanStack Query's setQueryData in onMutate/onError
- Vote buttons disabled during pending mutations to prevent double-clicks
- Feature cards link to detail view, vote buttons stop propagation
- Comments use "body" field name (not "content")
- Admin status dropdown only visible to admin users

**ORM Configuration**
- Drizzle Kit for schema migrations
- Type generation from schema definitions
- Zod schema validation via drizzle-zod integration

### External Dependencies

**Authentication Service**
- Replit OIDC provider for authentication
- OAuth 2.0/OpenID Connect flow
- User claims include sub (user ID) and email

**Database Service**
- Neon serverless PostgreSQL
- WebSocket connections for serverless execution
- Connection pooling via @neondatabase/serverless

**UI Component Libraries**
- Radix UI primitives for accessible components
- AG Grid Community for enterprise data tables
- Lucide React for consistent iconography

**Third-Party Utilities**
- date-fns for date formatting and manipulation
- nanoid for unique ID generation
- zod for runtime type validation
- class-variance-authority for component variant management