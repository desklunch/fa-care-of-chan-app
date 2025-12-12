# Care of Chan OS - Enterprise Management System

## Overview

An enterprise-grade management system for organizing venues, vendors, and team members. The system provides a centralized platform for browsing venues, managing vendor relationships, coordinating team members, and submitting feature requests through role-based access controls. Built with a modern full-stack architecture featuring React, Express, and PostgreSQL.

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

### Google Places Integration

**Text Search API**
- POST /api/places/text-search - Search for places by name using Google Places API v1
- Returns parsed address components (street, city, state abbreviation, zip)
- Extracts phone, website, and Google Place ID

**Photo Integration**
- GET /api/places/:placeId/photos - Fetch photo metadata for a place
- GET /api/places/photos/:photoName - Public proxy endpoint for serving Google Place photos
- Photos cached for 7 days to reduce API calls
- GooglePlacePhotoPicker component for selecting photos to import

**Venue Form Integration**
- GooglePlaceSearch component for searching venues by name
- Auto-populates name, address, phone, website, googlePlaceId
- "Import Photos" button appears after selecting a place
- Photo picker allows multi-select for gallery and single-select for primary photo
- Photos uploaded to App Storage (not just proxy URLs)
- Deduplication prevents adding the same photo twice

### Photo Management System

**App Storage Integration**
- Photos stored in Replit App Storage (object storage bucket)
- ObjectStorageService class wraps @google-cloud/storage operations
- Storage paths: `/objects/venues/{venueId}/photos/` for photos, `/objects/venues/{venueId}/thumbnails/` for thumbnails
- Environment variables: DEFAULT_OBJECT_STORAGE_BUCKET_ID, PUBLIC_OBJECT_SEARCH_PATHS, PRIVATE_OBJECT_DIR

**Photo Upload API Endpoints**
- POST /api/photos/upload - Upload base64-encoded image data
  - Validates file size (10MB max) and MIME type (jpg, png, webp, gif, avif)
  - Automatically generates WebP thumbnail using Sharp
  - Returns photoUrl and thumbnailUrl paths
- POST /api/photos/from-url - Fetch and upload image from external URL
  - Handles Google Places proxy URLs internally
  - Same validation and thumbnail generation as direct upload
- DELETE /api/photos - Delete photo and thumbnail from storage
- GET /objects/:objectPath(*) - Serve photos from storage with 7-day cache

**Photo Organization**
- Photos are now stored in the venue_photos table (not just photoUrls array)
- Each photo has: url, altText, sortOrder, isHero flag
- The isHero flag marks the primary photo for each venue
- Drag-drop reordering allows easy hero image selection

**Venue Photos Database Schema (venue_photos table)**
- id: varchar primary key with UUID default
- venueId: references venues table (cascade delete)
- url: storage path to the photo
- altText: descriptive alt text for accessibility
- sortOrder: integer for display ordering
- isHero: boolean flag for primary photo
- createdAt: timestamp

**Venue Photos API Routes**
- GET /api/venues/:venueId/photos - List photos for a venue
- POST /api/venues/:venueId/photos - Create a single photo
- POST /api/venues/:venueId/photos/bulk - Create multiple photos
- PUT /api/venue-photos/:id - Update photo metadata
- DELETE /api/venue-photos/:id - Delete a photo
- PUT /api/venues/:venueId/photos/:photoId/hero - Set hero photo

**Frontend Components**
- PhotoUploader component (client/src/components/ui/photo-uploader.tsx)
  - File input for direct upload
  - Drag-drop zone with visual feedback
  - URL import field for external images
  - Progress indicator during upload
  - Error handling with toast notifications
- GooglePlacePhotoPicker (client/src/components/ui/google-place-photo-picker.tsx)
  - Fetches available photos from Google Places API
  - Multi-select for gallery photos, single-select for primary photo
  - Uploads selected photos to App Storage (not just copying URLs)
  - Progress tracking with per-photo status
- SortablePhotoItem component (client/src/pages/venue-form.tsx)
  - Always-visible drag handle for accessibility
  - Uses dnd-kit for drag-and-drop reordering
  - View full-size in new window
  - Delete functionality with storage cleanup

**Drag-Drop Reordering**
- Uses @dnd-kit/core and @dnd-kit/sortable
- PointerSensor and KeyboardSensor for mouse/keyboard support
- rectSortingStrategy for grid layout
- Immediate visual feedback during drag with transform and shadow

**Migration Script**
- scripts/migrate-venue-photos.ts
- Migrates existing external URLs and Google Places proxy URLs to App Storage
- Run with: `npx tsx scripts/migrate-venue-photos.ts`
- Dry run mode: `npx tsx scripts/migrate-venue-photos.ts --dry-run`

### Venue File Management System

**Database Schema (venue_files table)**
- Unified table for both floorplans and attachments with category field
- category: 'floorplan' | 'attachment' - distinguishes file purpose
- Fields: id, venueId, fileUrl, thumbnailUrl, title, caption, fileType, mimeType, originalFilename
- uploadedById: references users table for tracking who uploaded the file
- sortOrder: integer for custom ordering within category
- uploadedAt: timestamp for display of relative upload age

**VenueFileWithUploader Type**
- Includes uploader user details (firstName, lastName) via join query
- Used by frontend to display "uploaded by [name] [time ago]"

**API Routes**
- GET /api/venues/:venueId/files?category=floorplan|attachment - List files with optional filtering
- POST /api/venues/:venueId/files - Create new file record (returns VenueFileWithUploader)
- PUT /api/venue-files/:id - Update file metadata (title, caption, sortOrder)
- DELETE /api/venue-files/:id - Delete file record (storage cleanup handled separately)

**Frontend Components**
- VenueFileUploader (client/src/components/ui/venue-file-uploader.tsx)
  - Supports both floorplans and attachments via category prop
  - Accepts wide range of file types: images, PDFs, Office docs, archives, design files
  - Uploads files to App Storage and creates database records
  - Displays progress during upload with toast notifications
- FileTypeIcon (client/src/components/ui/file-type-icon.tsx)
  - Displays appropriate icon based on file extension/MIME type
  - Shows file extension label below icon
  - Supports: PDF, Word, Excel, PowerPoint, ZIP/archives, Photoshop, Illustrator, images
- AttachmentItem component (in venue-form.tsx)
  - Inline editing of title and caption
  - Copy link and download actions with SSR-safe handlers
  - Displays uploader name and relative upload age

**Venue Detail Display**
- Floorplans card: Grid layout with thumbnail images, links to full-size PDFs
- Attachments card: List layout with file icons, download/copy/view buttons
- Both sections show uploader name and relative upload timestamp