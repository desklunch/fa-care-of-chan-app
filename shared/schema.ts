import { sql, relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  unique,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("employee").notNull(), // 'admin' | 'manager' | 'employee' | 'viewer'
  title: varchar("title"),
  department: varchar("department"),
  phone: varchar("phone"),
  location: varchar("location"),
  bio: text("bio"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log source enum values
export const auditSources = ['api', 'mcp', 'system', 'event'] as const;
export type AuditSource = (typeof auditSources)[number];

// Audit logs for tracking all CRUD operations
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    action: varchar("action", { length: 50 }).notNull(), // 'create' | 'update' | 'delete' | 'login' | 'email_sent'
    entityType: varchar("entity_type", { length: 50 }).notNull(), // 'user' | 'invite' | 'session'
    entityId: varchar("entity_id"), // ID of the affected entity
    performedBy: varchar("performed_by").references(() => users.id), // User who performed the action
    performedAt: timestamp("performed_at").defaultNow().notNull(),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
    userAgent: text("user_agent"),
    status: varchar("status", { length: 20 }).default("success").notNull(), // 'success' | 'failure'
    changes: jsonb("changes"), // { before: {...}, after: {...} } for updates
    metadata: jsonb("metadata"), // Additional context (error messages, etc.)
    // Phase 1 additions - forensic completeness fields
    sessionId: varchar("session_id"), // Express session ID for correlating actions
    requestId: varchar("request_id"), // UUID per HTTP request for distributed tracing
    durationMs: integer("duration_ms"), // Request duration for performance forensics
    source: varchar("source", { length: 20 }), // Origin: 'api' | 'mcp' | 'system' | 'event'
  },
  (table) => [
    index("idx_audit_logs_performed_at").on(table.performedAt),
    index("idx_audit_logs_entity_type").on(table.entityType),
    index("idx_audit_logs_performed_by").on(table.performedBy),
    index("idx_audit_logs_request_id").on(table.requestId),
    index("idx_audit_logs_session_id").on(table.sessionId),
  ],
);

// App feature categories for product planning
export const appFeatureCategories = pgTable("app_feature_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // hex color for badges
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feature status enum values
export const featureStatuses = [
  "proposed",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;
export type FeatureStatus = (typeof featureStatuses)[number];

// Feature priority enum values
export const featurePriorities = ["low", "medium", "high", "critical"] as const;
export type FeaturePriority = (typeof featurePriorities)[number];

// Feature type enum values (idea vs requirement)
export const featureTypes = ["idea", "requirement"] as const;
export type FeatureType = (typeof featureTypes)[number];

// App features / feature requests
export const appFeatures = pgTable(
  "app_features",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    featureType: varchar("feature_type", { length: 20 }).default("idea").notNull(),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => appFeatureCategories.id),
    status: varchar("status", { length: 20 }).default("proposed").notNull(),
    priority: varchar("priority", { length: 20 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    ownerId: varchar("owner_id").references(() => users.id),
    voteCount: integer("vote_count").default(0).notNull(),
    estimatedDelivery: timestamp("estimated_delivery"),
    completedAt: timestamp("completed_at"), // When status changed to "completed"
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_features_status").on(table.status),
    index("idx_app_features_completed_at").on(table.completedAt),
    index("idx_app_features_category").on(table.categoryId),
    index("idx_app_features_created_by").on(table.createdById),
    index("idx_app_features_vote_count").on(table.voteCount),
    index("idx_app_features_sort_order").on(table.sortOrder),
  ],
);

// App feature votes (one vote per user per feature)
export const appFeatureVotes = pgTable(
  "app_feature_votes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    featureId: varchar("feature_id")
      .notNull()
      .references(() => appFeatures.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    value: integer("value").notNull().default(1), // 1 for upvote
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("unique_app_feature_vote").on(table.featureId, table.userId),
    index("idx_app_feature_votes_feature").on(table.featureId),
    index("idx_app_feature_votes_user").on(table.userId),
  ],
);

// App feature comments for discussion
export const appFeatureComments = pgTable(
  "app_feature_comments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    featureId: varchar("feature_id")
      .notNull()
      .references(() => appFeatures.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_feature_comments_feature").on(table.featureId),
    index("idx_app_feature_comments_user").on(table.userId),
  ],
);

// Contacts directory
export const contacts = pgTable(
  "contacts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: varchar("external_id", { length: 255 }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phoneNumbers: text("phone_numbers").array(),
    emailAddresses: text("email_addresses").array(),
    jobTitle: varchar("job_title", { length: 150 }),
    dateOfBirth: timestamp("date_of_birth"),
    instagramUsername: varchar("instagram_username", { length: 100 }),
    linkedinUsername: varchar("linkedin_username", { length: 100 }),
    homeAddress: text("home_address"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_contacts_name").on(table.firstName, table.lastName),
    index("idx_contacts_external_id").on(table.externalId),
  ],
);

// Vendors directory
export const vendors = pgTable(
  "vendors",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: varchar("external_id", { length: 255 }),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    address: text("address"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    website: varchar("website", { length: 500 }),
    capabilitiesDeck: varchar("capabilities_deck", { length: 500 }),
    employeeCount: varchar("employee_count", { length: 50 }),
    diversityInfo: text("diversity_info"),
    chargesSalesTax: boolean("charges_sales_tax").default(false),
    salesTaxNotes: text("sales_tax_notes"),
    isPreferred: boolean("is_preferred").default(false),
    notes: text("notes"),
    locations: jsonb("locations").$type<Array<{
      city: string;
      region: string;
      country: string;
      placeId?: string;
      regionCode?: string;
      countryCode?: string;
      displayName?: string;
    }>>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_vendors_business_name").on(table.businessName),
    index("idx_vendors_external_id").on(table.externalId),
    index("idx_vendors_is_preferred").on(table.isPreferred),
  ],
);

// Venue type enum values
export const venueTypes = [
  "restaurant",
  "event_space",
  "gallery",
  "loft",
  "private_dining_room",
  "theater",
  "museum",
  "garden",
  "library",
  "public_property",
] as const;
export type VenueType = (typeof venueTypes)[number];

// Venue space type for JSON storage (will migrate to separate table later)
export interface VenueSpace {
  id: string;
  name: string;
  maxCapacitySeated?: number | null;
  maxCapacityStanding?: number | null;
  minCapacity?: number | null;
  sizeSqft?: number | null;
  hasSeatedFormat?: boolean | null;
  hasStandingFormat?: boolean | null;
  description?: string | null;
}

// Venues directory
export const venues = pgTable(
  "venues",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: varchar("external_id", { length: 255 }),
    venueType: varchar("venue_type", { length: 50 }),
    name: varchar("name", { length: 255 }).notNull(),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    streetAddress1: varchar("street_address_1", { length: 255 }),
    streetAddress2: varchar("street_address_2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 20 }),
    neighborhood: varchar("neighborhood", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    website: varchar("website", { length: 500 }),
    instagramAccount: varchar("instagram_account", { length: 100 }),
    googlePlaceId: varchar("google_place_id", { length: 255 }),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    venueSpaces: jsonb("venue_spaces").$type<VenueSpace[]>().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    isDraft: boolean("is_draft").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_venues_name").on(table.name),
    index("idx_venues_external_id").on(table.externalId),
    index("idx_venues_city_state").on(table.city, table.state),
    index("idx_venues_is_active").on(table.isActive),
    index("idx_venues_is_draft").on(table.isDraft),
  ],
);

// Venue photos - dedicated table for photo management with alt text and ordering
export const venuePhotos = pgTable(
  "venue_photos",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    venueId: varchar("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
    url: varchar("url", { length: 1000 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").default(0),
    isHero: boolean("is_hero").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_venue_photos_venue_id").on(table.venueId),
  ],
);

// Amenities that can be assigned to venues
export const amenities = pgTable(
  "amenities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_amenities_name").on(table.name),
  ],
);

// Join table for venues and amenities (many-to-many)
export const venueAmenities = pgTable(
  "venue_amenities",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    venueId: varchar("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
    amenityId: varchar("amenity_id").notNull().references(() => amenities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_venue_amenities_venue_id").on(table.venueId),
    index("idx_venue_amenities_amenity_id").on(table.amenityId),
  ],
);

// Industries for categorizing clients
export const industries = pgTable(
  "industries",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_industries_name").on(table.name),
  ],
);

// Tags for categorizing venues
export const tags = pgTable(
  "tags",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_tags_name").on(table.name),
    index("idx_tags_category").on(table.category),
  ],
);

// Join table for venues and tags (many-to-many)
export const venueTags = pgTable(
  "venue_tags",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    venueId: varchar("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_venue_tags_venue_id").on(table.venueId),
    index("idx_venue_tags_tag_id").on(table.tagId),
  ],
);

// Join table for deals and tags (many-to-many)
export const dealTags = pgTable(
  "deal_tags",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_deal_tags_deal_id").on(table.dealId),
    index("idx_deal_tags_tag_id").on(table.tagId),
  ],
);

// Venue files (floorplans, attachments, and other documents)
export const venueFileCategories = ["floorplan", "attachment"] as const;
export type VenueFileCategory = (typeof venueFileCategories)[number];

export const venueFiles = pgTable(
  "venue_files",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    venueId: varchar("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull().default("floorplan"), // 'floorplan' | 'attachment'
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    fileType: varchar("file_type", { length: 20 }).notNull(), // 'image' | 'pdf' | 'document' | 'archive' | 'other'
    originalFilename: varchar("original_filename", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    title: varchar("title", { length: 255 }),
    caption: text("caption"),
    sortOrder: integer("sort_order").default(0).notNull(),
    uploadedById: varchar("uploaded_by_id").references(() => users.id),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_venue_files_venue_id").on(table.venueId),
    index("idx_venue_files_category").on(table.category),
    index("idx_venue_files_uploaded_at").on(table.uploadedAt),
  ],
);

// Venue collections - allow users to organize venues into named groups
export const venueCollections = pgTable(
  "venue_collections",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdById: varchar("created_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_venue_collections_name").on(table.name),
    index("idx_venue_collections_created_by").on(table.createdById),
  ],
);

// Junction table for venues in collections (many-to-many)
export const venueCollectionVenues = pgTable(
  "venue_collection_venues",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    collectionId: varchar("collection_id").notNull().references(() => venueCollections.id, { onDelete: "cascade" }),
    venueId: varchar("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
    addedById: varchar("added_by_id").references(() => users.id),
    addedAt: timestamp("added_at").defaultNow(),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [
    unique("unique_venue_collection_venue").on(table.collectionId, table.venueId),
    index("idx_venue_collection_venues_collection").on(table.collectionId),
    index("idx_venue_collection_venues_venue").on(table.venueId),
  ],
);

// Vendor services (service categories that vendors can provide)
export const vendorServices = pgTable(
  "vendor_services",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: varchar("external_id", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_vendor_services_name").on(table.name),
    index("idx_vendor_services_external_id").on(table.externalId),
  ],
);

// Join table for vendors and vendor services (many-to-many)
export const vendorServicesVendors = pgTable(
  "vendor_services_vendors",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    vendorServiceId: varchar("vendor_service_id").notNull().references(() => vendorServices.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_vendor_services_vendors_vendor_id").on(table.vendorId),
    index("idx_vendor_services_vendors_service_id").on(table.vendorServiceId),
  ],
);

// Join table for vendors and contacts (many-to-many)
export const vendorsContacts = pgTable(
  "vendors_contacts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_vendors_contacts_vendor_id").on(table.vendorId),
    index("idx_vendors_contacts_contact_id").on(table.contactId),
  ],
);

// Vendor update tokens for self-service profile updates
export const vendorUpdateTokens = pgTable(
  "vendor_update_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_vendor_update_tokens_token").on(table.token),
    index("idx_vendor_update_tokens_vendor_id").on(table.vendorId),
    index("idx_vendor_update_tokens_created_by").on(table.createdById),
  ],
);

// Deal statuses reference table
export const dealStatuses = pgTable("deal_statuses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  colorLight: varchar("color_light", { length: 100 }).notNull().default("#888888"),
  colorDark: varchar("color_dark", { length: 100 }).notNull().default("#aaaaaa"),
  winProbability: integer("win_probability").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
});

export type DealStatusRecord = typeof dealStatuses.$inferSelect;
export type InsertDealStatus = typeof dealStatuses.$inferInsert;
export const insertDealStatusSchema = createInsertSchema(dealStatuses).omit({ id: true });

export type DealStatus = string;

// Deal location type for city or country assignments
export interface DealLocation {
  placeId: string;           // Google Place ID for deduplication
  city?: string;             // "Austin", "London" (optional for country-only)
  state?: string;            // "California", "England" (optional)
  stateCode?: string;        // "CA", "" (optional)
  country: string;           // "United States", "United Kingdom"
  countryCode: string;       // "US", "GB"
  displayName: string;       // Pre-formatted: "Austin, TX", "London, United Kingdom", or "France"
}

// Event schedule types for deals
export type ScheduleMode = "specific" | "flexible";

export interface EventScheduleItem {
  id: string;
  kind: "primary" | "alternative" | "range";
  startDate?: string;        // ISO date string for JSON serialization
  rangeStartMonth?: number;
  rangeStartYear?: number;
  rangeEndMonth?: number;
  rangeEndYear?: number;
}

export interface DealEvent {
  id: string;
  label: string;
  durationDays: number;
  scheduleMode: ScheduleMode;
  schedules: EventScheduleItem[];
}

/**
 * Computes the earliest date from an array of DealEvents.
 * Considers both specific dates (startDate) and range dates (rangeStartMonth/Year).
 * For ranges, uses the 1st of the month.
 * @returns ISO date string (YYYY-MM-DD) or null if no dates found
 */
export function computeEarliestEventDate(events: DealEvent[] | null | undefined): string | null {
  if (!events || events.length === 0) return null;
  
  let earliestDateStr: string | null = null;
  
  for (const event of events) {
    for (const schedule of event.schedules) {
      let candidateDateStr: string | null = null;
      
      // Check for specific date (startDate is ISO string like "2025-03-15")
      if (schedule.startDate) {
        // startDate is already YYYY-MM-DD format, use directly to avoid timezone issues
        candidateDateStr = schedule.startDate;
      }
      // Check for range date (use first of month)
      else if (schedule.rangeStartYear && schedule.rangeStartMonth) {
        // Format as YYYY-MM-DD (first of month)
        const month = String(schedule.rangeStartMonth).padStart(2, "0");
        candidateDateStr = `${schedule.rangeStartYear}-${month}-01`;
      }
      
      if (candidateDateStr) {
        // Compare as strings since YYYY-MM-DD format sorts lexicographically correctly
        if (!earliestDateStr || candidateDateStr < earliestDateStr) {
          earliestDateStr = candidateDateStr;
        }
      }
    }
  }
  
  return earliestDateStr;
}

// Legacy deal services list (used for migration reference)
export const legacyDealServices = [
  "Consulting",
  "Creative Direction",
  "Culinary Programming",
  "Concept Development",
  "Event Concepting",
  "Executive Production",
  "Culinary Production",
  "Liquor Cabinet Programming",
  "Marketing",
  "Production",
  "Programming",
  "RSVP Management",
  "Talent Programming",
  "Gifting",
  "Content Creation",
  "Referral Agreement",
] as const;

// Deal services table for managing available services
export const dealServices = pgTable(
  "deal_services",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deal_services_name").on(table.name),
    index("idx_deal_services_sort_order").on(table.sortOrder),
    index("idx_deal_services_is_active").on(table.isActive),
  ],
);

export type DealService = typeof dealServices.$inferSelect;
export type InsertDealService = typeof dealServices.$inferInsert;

export const insertDealServiceSchema = createInsertSchema(dealServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Deals for tracking sales pipeline
export const deals = pgTable(
  "deals",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: integer("external_id"),
    dealNumber: serial("deal_number").notNull().unique(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    status: integer("status").notNull().references(() => dealStatuses.id),
    statusLegacy: varchar("status_legacy", { length: 100 }),
    clientId: varchar("client_id").notNull(),
    brandId: varchar("brand_id").references(() => brands.id),
    locations: jsonb("locations").$type<DealLocation[]>().default([]),
    eventSchedule: jsonb("event_schedule").$type<DealEvent[]>().default([]),
    serviceIds: integer("service_ids").array().default([]),
    locationsText: text("locations_text"),
    concept: text("concept"),
    notes: text("notes"),
    nextSteps: text("next_steps"),
    primaryContactId: varchar("primary_contact_id").references(() => contacts.id),
    ownerId: varchar("owner_id").references(() => users.id),
    industryId: varchar("industry_id").references(() => industries.id),
    budgetHigh: integer("budget_high"),
    budgetLow: integer("budget_low"),
    budgetNotes: text("budget_notes"),
    startedOn: date("started_on"),
    wonOn: date("won_on"),
    proposalSentOn: date("proposal_sent_on"),
    lastContactOn: date("last_contact_on"),
    earliestEventDate: date("earliest_event_date"),
    projectDate: text("project_date"),
    sortOrder: integer("sort_order"),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deals_deal_number").on(table.dealNumber),
    index("idx_deals_external_id").on(table.externalId),
    index("idx_deals_status").on(table.status),
    index("idx_deals_client_id").on(table.clientId),
    index("idx_deals_created_by").on(table.createdById),
    index("idx_deals_owner").on(table.ownerId),
    index("idx_deals_created_at").on(table.createdAt),
    index("idx_deals_primary_contact").on(table.primaryContactId),
    index("idx_deals_earliest_event_date").on(table.earliestEventDate),
    index("idx_deals_sort_order").on(table.sortOrder),
    index("idx_deals_industry").on(table.industryId),
  ],
);

// Deal tasks table
export const dealTasks = pgTable(
  "deal_tasks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    createdById: varchar("created_by_id").notNull().references(() => users.id),
    dueDate: date("due_date"),
    assignedUserId: varchar("assigned_user_id").references(() => users.id),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deal_tasks_deal").on(table.dealId),
    index("idx_deal_tasks_created_by").on(table.createdById),
    index("idx_deal_tasks_assigned_user").on(table.assignedUserId),
    index("idx_deal_tasks_completed").on(table.completed),
    index("idx_deal_tasks_due_date").on(table.dueDate),
  ],
);

export type DealTask = typeof dealTasks.$inferSelect;
export type InsertDealTask = typeof dealTasks.$inferInsert;

// Clients table for client company directory
export const clients = pgTable(
  "clients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: varchar("external_id", { length: 50 }),
    name: varchar("name", { length: 255 }).notNull(),
    website: varchar("website", { length: 255 }),
    industryId: varchar("industry_id").references(() => industries.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_clients_name").on(table.name),
    index("idx_clients_industry_id").on(table.industryId),
    index("idx_clients_created_at").on(table.createdAt),
    index("idx_clients_external_id").on(table.externalId),
  ],
);

// Client-Contact many-to-many junction table
export const clientContacts = pgTable(
  "client_contacts",
  {
    clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.clientId, table.contactId] }),
    index("idx_client_contacts_client").on(table.clientId),
    index("idx_client_contacts_contact").on(table.contactId),
  ],
);

export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = typeof clientContacts.$inferInsert;

export const dealClients = pgTable(
  "deal_clients",
  {
    dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    label: text("label"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.dealId, table.clientId] }),
    index("idx_deal_clients_deal").on(table.dealId),
    index("idx_deal_clients_client").on(table.clientId),
  ],
);

export type DealClient = typeof dealClients.$inferSelect;
export type InsertDealClient = typeof dealClients.$inferInsert;

// Entity types that can have comments
export const commentEntityTypes = [
  "venue",
  "vendor",
  "contact",
  "venue_collection",
  "app_feature",
  "feedback",
  "deal",
  "client",
] as const;
export type CommentEntityType = (typeof commentEntityTypes)[number];

// Unified comments system
export const comments = pgTable(
  "comments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    body: text("body").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id").notNull(),
    parentId: varchar("parent_id"),
    createdById: varchar("created_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_comments_entity").on(table.entityType, table.entityId),
    index("idx_comments_parent").on(table.parentId),
    index("idx_comments_created_by").on(table.createdById),
    index("idx_comments_created_at").on(table.createdAt),
  ],
);

// Google Drive attachments - polymorphic entity attachments
export const driveAttachmentEntityTypes = [
  "deal",
  "venue",
  "client",
  "vendor",
  "contact",
] as const;
export type DriveAttachmentEntityType = (typeof driveAttachmentEntityTypes)[number];

export const googleDriveAttachments = pgTable(
  "google_drive_attachments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id").notNull(),
    driveFileId: varchar("drive_file_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }),
    iconUrl: varchar("icon_url", { length: 500 }),
    webViewLink: varchar("web_view_link", { length: 1000 }),
    attachedById: varchar("attached_by_id").notNull().references(() => users.id),
    attachedAt: timestamp("attached_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_drive_attachments_entity").on(table.entityType, table.entityId),
    index("idx_drive_attachments_attached_by").on(table.attachedById),
  ],
);

export type GoogleDriveAttachment = typeof googleDriveAttachments.$inferSelect;
export type InsertGoogleDriveAttachment = typeof googleDriveAttachments.$inferInsert;

export const insertGoogleDriveAttachmentSchema = createInsertSchema(googleDriveAttachments).omit({
  id: true,
  attachedAt: true,
});

export interface DriveAttachmentWithUser extends GoogleDriveAttachment {
  attachedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
  createdFeatures: many(appFeatures, { relationName: "createdFeatures" }),
  ownedFeatures: many(appFeatures, { relationName: "ownedFeatures" }),
  featureVotes: many(appFeatureVotes),
  featureComments: many(appFeatureComments),
  createdVendorTokens: many(vendorUpdateTokens),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  performer: one(users, {
    fields: [auditLogs.performedBy],
    references: [users.id],
  }),
}));

export const vendorUpdateTokensRelations = relations(vendorUpdateTokens, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorUpdateTokens.vendorId],
    references: [vendors.id],
  }),
  createdBy: one(users, {
    fields: [vendorUpdateTokens.createdById],
    references: [users.id],
  }),
}));

export const appFeatureCategoriesRelations = relations(appFeatureCategories, ({ many }) => ({
  features: many(appFeatures),
}));

export const appFeaturesRelations = relations(appFeatures, ({ one, many }) => ({
  category: one(appFeatureCategories, {
    fields: [appFeatures.categoryId],
    references: [appFeatureCategories.id],
  }),
  createdBy: one(users, {
    fields: [appFeatures.createdById],
    references: [users.id],
    relationName: "createdFeatures",
  }),
  owner: one(users, {
    fields: [appFeatures.ownerId],
    references: [users.id],
    relationName: "ownedFeatures",
  }),
  votes: many(appFeatureVotes),
  comments: many(appFeatureComments),
}));

export const appFeatureVotesRelations = relations(appFeatureVotes, ({ one }) => ({
  feature: one(appFeatures, {
    fields: [appFeatureVotes.featureId],
    references: [appFeatures.id],
  }),
  user: one(users, {
    fields: [appFeatureVotes.userId],
    references: [users.id],
  }),
}));

export const appFeatureCommentsRelations = relations(appFeatureComments, ({ one }) => ({
  feature: one(appFeatures, {
    fields: [appFeatureComments.featureId],
    references: [appFeatures.id],
  }),
  user: one(users, {
    fields: [appFeatureComments.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type FeatureCategory = typeof appFeatureCategories.$inferSelect;
export type InsertFeatureCategory = typeof appFeatureCategories.$inferInsert;
export type AppFeature = typeof appFeatures.$inferSelect;
export type InsertAppFeature = typeof appFeatures.$inferInsert;
export type FeatureVote = typeof appFeatureVotes.$inferSelect;
export type InsertFeatureVote = typeof appFeatureVotes.$inferInsert;
export type FeatureComment = typeof appFeatureComments.$inferSelect;
export type InsertFeatureComment = typeof appFeatureComments.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;
export type Amenity = typeof amenities.$inferSelect;
export type InsertAmenity = typeof amenities.$inferInsert;
export type VenueAmenity = typeof venueAmenities.$inferSelect;
export type InsertVenueAmenity = typeof venueAmenities.$inferInsert;
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = typeof industries.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type VenueTag = typeof venueTags.$inferSelect;
export type InsertVenueTag = typeof venueTags.$inferInsert;
export type DealTag = typeof dealTags.$inferSelect;
export type InsertDealTag = typeof dealTags.$inferInsert;
export type VenueFile = typeof venueFiles.$inferSelect;
export type InsertVenueFile = typeof venueFiles.$inferInsert;
export type VenuePhoto = typeof venuePhotos.$inferSelect;
export type InsertVenuePhoto = typeof venuePhotos.$inferInsert;

// VenueFile with uploader info
export type VenueFileWithUploader = VenueFile & {
  uploadedBy: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
};
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export type VendorService = typeof vendorServices.$inferSelect;
export type InsertVendorService = typeof vendorServices.$inferInsert;
export type VendorServiceVendor = typeof vendorServicesVendors.$inferSelect;
export type InsertVendorServiceVendor = typeof vendorServicesVendors.$inferInsert;
export type VendorContact = typeof vendorsContacts.$inferSelect;
export type InsertVendorContact = typeof vendorsContacts.$inferInsert;
export type VendorUpdateToken = typeof vendorUpdateTokens.$inferSelect;
export type InsertVendorUpdateToken = typeof vendorUpdateTokens.$inferInsert;
export type VendorUpdateTokenWithRelations = VendorUpdateToken & {
  vendor: Vendor;
  createdBy: User | null;
};

// Vendor with associated services and contacts
export type VendorWithServices = Vendor & {
  services: VendorService[];
};

export type VendorWithRelations = Vendor & {
  services: VendorService[];
  contacts: Contact[];
};

// Simplified relation types for optimized queries
export type VendorSummary = Pick<Vendor, 'id' | 'businessName'>;
export type ClientSummary = Pick<Client, 'id' | 'name'>;
export type AmenitySummary = Pick<Amenity, 'id' | 'name' | 'icon'>;
export type TagSummary = Pick<Tag, 'id' | 'name' | 'category'>;

// Renamed from ContactWithVendors - includes both vendors and clients
export type ContactWithRelations = Contact & {
  vendors: VendorSummary[];
  clients: ClientSummary[];
};

// Keep for backward compatibility
export type ContactWithVendors = ContactWithRelations;

// Venue with associated amenities, tags, floorplans, and photos (for detail view)
export type VenueWithRelations = Venue & {
  amenities: Amenity[];
  cuisineTags: Tag[];
  styleTags: Tag[];
  floorplans: VenueFileWithUploader[];
  attachments: VenueFileWithUploader[];
  photos: VenuePhoto[];
  collections?: VenueCollectionWithCreator[];
};

// Optimized venue type for grid display (excludes files/photos, uses summary types)
export type VenueGridRow = {
  id: string;
  name: string;
  venueType: string | null;
  shortDescription: string | null;
  city: string | null;
  state: string | null;
  venueSpaces: VenueSpace[] | null;
  isActive: boolean;
  isDraft: boolean;
  amenities: AmenitySummary[];
  cuisineTags: TagSummary[];
  styleTags: TagSummary[];
  createdAt: string | null;
};

// Venue collection types
export type VenueCollection = typeof venueCollections.$inferSelect;
export type InsertVenueCollection = typeof venueCollections.$inferInsert;
export type VenueCollectionVenue = typeof venueCollectionVenues.$inferSelect;
export type InsertVenueCollectionVenue = typeof venueCollectionVenues.$inferInsert;

export type VenueCollectionWithCreator = VenueCollection & {
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  venueCount: number;
};

export type VenueCollectionWithVenues = VenueCollection & {
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  venues: (Venue & { addedBy: Pick<User, "id" | "firstName" | "lastName"> | null; addedAt: Date | null })[];
};

// Keep old type aliases for backward compatibility
export type ProductFeature = AppFeature;
export type InsertProductFeature = InsertAppFeature;

// Audit log action types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'email_sent' | 'invite_used' | 'upload' | 'unknown' | 'reorder' | 'link' | 'unlink' | 'add_venues' | 'remove_venue';
export type AuditEntityType = 'user' | 'invite' | 'session' | 'feature' | 'feature_category' | 'feature_comment' | 'contact' | 'vendor' | 'venue' | 'venue_photo' | 'venue_file' | 'vendor_update_token' | 'app_setting' | 'app_issue' | 'form_template' | 'form_request' | 'outreach_token' | 'form_response' | 'app_release' | 'deal' | 'deal_task' | 'system' | 'deals' | 'client' | 'client_contact' | 'brand' | 'venue_collection' | 'floorplan' | 'drive_attachment';
export type AuditStatus = 'success' | 'failure';

// Zod schemas
export const upsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  title: true,
  department: true,
  phone: true,
  location: true,
  bio: true,
  profileImageUrl: true,
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Feature category schemas
export const insertFeatureCategorySchema = createInsertSchema(appFeatureCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateFeatureCategorySchema = createInsertSchema(appFeatureCategories).pick({
  name: true,
  description: true,
  color: true,
  isActive: true,
}).partial();

// App feature schemas
export const insertAppFeatureSchema = createInsertSchema(appFeatures).omit({
  id: true,
  createdById: true,
  voteCount: true,
  priority: true,
  ownerId: true,
  estimatedDelivery: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "Category is required"),
  featureType: z.enum(featureTypes, { required_error: "Please select Idea or Requirement" }),
  status: z.enum(featureStatuses).default("proposed"),
});

export const updateAppFeatureSchema = createInsertSchema(appFeatures).pick({
  title: true,
  description: true,
  featureType: true,
  categoryId: true,
  status: true,
  priority: true,
  ownerId: true,
  estimatedDelivery: true,
}).partial();

// Backward compatibility aliases
export const insertProductFeatureSchema = insertAppFeatureSchema;
export const updateProductFeatureSchema = updateAppFeatureSchema;

// Feature comment schemas
export const insertFeatureCommentSchema = createInsertSchema(appFeatureComments).omit({
  id: true,
  featureId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  body: z.string().min(1, "Comment cannot be empty").max(2000),
});

export type CreateFeatureCategory = z.infer<typeof insertFeatureCategorySchema>;
export type UpdateFeatureCategory = z.infer<typeof updateFeatureCategorySchema>;
export type CreateAppFeature = z.infer<typeof insertAppFeatureSchema>;
export type UpdateAppFeature = z.infer<typeof updateAppFeatureSchema>;
export type CreateFeatureComment = z.infer<typeof insertFeatureCommentSchema>;

// Backward compatibility aliases
export type CreateProductFeature = CreateAppFeature;
export type UpdateProductFeature = UpdateAppFeature;

// Extended types with relations
export type AppFeatureWithRelations = AppFeature & {
  category: FeatureCategory;
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">;
  owner?: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  hasVoted?: boolean;
};

// Backward compatibility alias
export type ProductFeatureWithRelations = AppFeatureWithRelations;

export type FeatureCommentWithUser = FeatureComment & {
  user: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">;
};

// Vendor service schemas
export const insertVendorServiceSchema = createInsertSchema(vendorServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

export const updateVendorServiceSchema = createInsertSchema(vendorServices).pick({
  name: true,
  description: true,
  icon: true,
  externalId: true,
}).partial();

export type CreateVendorService = z.infer<typeof insertVendorServiceSchema>;
export type UpdateVendorService = z.infer<typeof updateVendorServiceSchema>;

// Contact schemas
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phoneNumbers: z.array(z.string()).optional().nullable(),
  emailAddresses: z.array(z.string().email("Invalid email address")).optional().nullable(),
  jobTitle: z.string().max(150).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  instagramUsername: z.string().max(100).optional().nullable(),
  linkedinUsername: z.string().max(100).optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

export const updateContactSchema = insertContactSchema.partial();

export type CreateContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

// Venue schemas with validation
export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  externalId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required").max(255),
  shortDescription: z.string().optional().nullable(),
  longDescription: z.string().optional().nullable(),
  streetAddress1: z.string().max(255).optional().nullable(),
  streetAddress2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  website: z.string().url("Invalid URL").max(500).optional().nullable().or(z.literal("")),
  instagramAccount: z.string().max(100).optional().nullable(),
  photoUrls: z.array(z.string()).optional().nullable(),
  venueSpaces: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1, "Space name is required").max(255),
    maxCapacitySeated: z.number().int().min(1, "Maximum seated capacity must be greater than 0").optional().nullable(),
    maxCapacityStanding: z.number().int().min(1, "Maximum standing capacity must be greater than 0").optional().nullable(),
    minCapacity: z.number().int().min(1, "Minimum capacity must be greater than 0").optional().nullable(),
    sizeSqft: z.number().int().min(1, "Size must be greater than 0").optional().nullable(),
    hasSeatedFormat: z.boolean().optional().nullable(),
    hasStandingFormat: z.boolean().optional().nullable(),
    description: z.string().optional().nullable(),
  })).optional().nullable(),
  isActive: z.boolean().default(true),
  isDraft: z.boolean().default(false),
});

export const updateVenueSchema = insertVenueSchema.partial();

export type CreateVenue = z.infer<typeof insertVenueSchema>;
export type UpdateVenue = z.infer<typeof updateVenueSchema>;

// Venue collection schemas
export const insertVenueCollectionSchema = createInsertSchema(venueCollections).omit({
  id: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

export const updateVenueCollectionSchema = insertVenueCollectionSchema.partial();

export type CreateVenueCollection = z.infer<typeof insertVenueCollectionSchema>;
export type UpdateVenueCollection = z.infer<typeof updateVenueCollectionSchema>;

// Schema for adding venues to a collection
export const addVenuesToCollectionSchema = z.object({
  venueIds: z.array(z.string()).min(1, "At least one venue is required"),
});

export type AddVenuesToCollection = z.infer<typeof addVenuesToCollectionSchema>;

// Venue floorplan schemas
// New unified venue file schema
export const insertVenueFileSchema = createInsertSchema(venueFiles).omit({
  id: true,
  uploadedAt: true,
}).extend({
  venueId: z.string().min(1, "Venue ID is required"),
  category: z.enum(["floorplan", "attachment"]).default("floorplan"),
  fileUrl: z.string().min(1, "File URL is required").max(500),
  thumbnailUrl: z.string().max(500).optional().nullable(),
  fileType: z.enum(["image", "pdf", "document", "archive", "other"]),
  originalFilename: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  caption: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  uploadedById: z.string().optional().nullable(),
});

export const updateVenueFileSchema = insertVenueFileSchema.omit({
  venueId: true,
  category: true,
  fileUrl: true,
  fileType: true,
  originalFilename: true,
  mimeType: true,
  uploadedById: true,
}).partial();

export type CreateVenueFile = z.infer<typeof insertVenueFileSchema>;
export type UpdateVenueFile = z.infer<typeof updateVenueFileSchema>;

// Venue photo schemas
export const insertVenuePhotoSchema = createInsertSchema(venuePhotos).omit({
  id: true,
  createdAt: true,
}).extend({
  venueId: z.string().min(1, "Venue ID is required"),
  url: z.string().min(1, "Photo URL is required").max(1000),
  altText: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isHero: z.boolean().default(false),
});

export const updateVenuePhotoSchema = insertVenuePhotoSchema.omit({
  venueId: true,
  url: true,
}).partial();

export type CreateVenuePhoto = z.infer<typeof insertVenuePhotoSchema>;
export type UpdateVenuePhoto = z.infer<typeof updateVenuePhotoSchema>;

// Amenity schemas
export const insertAmenitySchema = createInsertSchema(amenities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  icon: z.string().min(1, "Icon is required").max(100),
});

export const updateAmenitySchema = insertAmenitySchema.partial();

export type CreateAmenity = z.infer<typeof insertAmenitySchema>;
export type UpdateAmenity = z.infer<typeof updateAmenitySchema>;

// Industry schemas
export const insertIndustrySchema = createInsertSchema(industries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

export const updateIndustrySchema = insertIndustrySchema.partial();

export type CreateIndustry = z.infer<typeof insertIndustrySchema>;
export type UpdateIndustry = z.infer<typeof updateIndustrySchema>;

// Tag insert/update schemas
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTagSchema = insertTagSchema.partial();

export type CreateTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;

// Location schema for vendors
export const locationSchema = z.object({
  city: z.string(),
  region: z.string(),
  country: z.string(),
  placeId: z.string().optional(),
  regionCode: z.string().optional(),
  countryCode: z.string().optional(),
  displayName: z.string().optional(),
});

export type VendorLocation = z.infer<typeof locationSchema>;

// Vendor schemas with validation
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  businessName: z.string().min(1, "Business name is required").max(255),
  address: z.string().optional().nullable(),
  phone: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[\d\s\-\+\(\)\.]+$/.test(val),
      "Invalid phone number format"
    ),
  email: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Invalid email format"
    ),
  website: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(val),
      "Invalid website URL format"
    ),
  capabilitiesDeck: z.string().max(500).optional().nullable(),
  employeeCount: z.string().max(50).optional().nullable(),
  diversityInfo: z.string().optional().nullable(),
  chargesSalesTax: z.boolean().optional().default(false),
  salesTaxNotes: z.string().optional().nullable(),
  isPreferred: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
  locations: z.array(locationSchema).optional().nullable(),
  externalId: z.string().optional().nullable(),
  serviceIds: z.array(z.string()).optional(),
});

export const updateVendorSchema = insertVendorSchema.partial();

// Public vendor update schema (excludes internal fields: isPreferred, notes)
export const publicVendorUpdateSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(255),
  address: z.string().optional().nullable(),
  phone: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[\d\s\-\+\(\)\.]+$/.test(val),
      "Invalid phone number format"
    ),
  email: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Invalid email format"
    ),
  website: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(val),
      "Invalid website URL format"
    ),
  capabilitiesDeck: z.string().max(500).optional().nullable(),
  employeeCount: z.string().max(50).optional().nullable(),
  diversityInfo: z.string().optional().nullable(),
  chargesSalesTax: z.boolean().optional().default(false),
  salesTaxNotes: z.string().optional().nullable(),
  locations: z.array(locationSchema).optional().nullable(),
  serviceIds: z.array(z.string()).min(1, "At least one service is required"),
});

export type CreateVendor = z.infer<typeof insertVendorSchema>;
export type UpdateVendor = z.infer<typeof updateVendorSchema>;
export type PublicVendorUpdate = z.infer<typeof publicVendorUpdateSchema>;

// App settings table for storing theme and other global configuration
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

// Theme variable schema
export const themeVariableSchema = z.object({
  // Core colors (HSL format: "H S% L%")
  background: z.string(),
  foreground: z.string(),
  border: z.string(),
  card: z.string(),
  cardForeground: z.string(),
  cardBorder: z.string(),
  sidebar: z.string(),
  sidebarForeground: z.string(),
  sidebarBorder: z.string(),
  sidebarPrimary: z.string(),
  sidebarPrimaryForeground: z.string(),
  sidebarAccent: z.string(),
  sidebarAccentForeground: z.string(),
  sidebarRing: z.string(),
  popover: z.string(),
  popoverForeground: z.string(),
  popoverBorder: z.string(),
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  muted: z.string(),
  mutedForeground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  destructive: z.string(),
  destructiveForeground: z.string(),
  input: z.string(),
  ring: z.string(),
  chart1: z.string(),
  chart2: z.string(),
  chart3: z.string(),
  chart4: z.string(),
  chart5: z.string(),
});

export const themeConfigSchema = z.object({
  light: themeVariableSchema,
  dark: themeVariableSchema,
});

export type ThemeVariables = z.infer<typeof themeVariableSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;

// App issue severity enum values
export const issueSeverities = ["high", "medium", "low"] as const;
export type IssueSeverity = (typeof issueSeverities)[number];

// App issue status enum values
export const issueStatuses = [
  "reported",
  "under_review",
  "in_progress",
  "fixed",
  "closed",
  "duplicate",
] as const;
export type IssueStatus = (typeof issueStatuses)[number];

// App issues / bug reports
export const appIssues = pgTable(
  "app_issues",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    severity: varchar("severity", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).default("reported").notNull(),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    fixedAt: timestamp("fixed_at"), // When status changed to "fixed" or "closed"
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_issues_status").on(table.status),
    index("idx_app_issues_severity").on(table.severity),
    index("idx_app_issues_created_by").on(table.createdById),
    index("idx_app_issues_fixed_at").on(table.fixedAt),
  ],
);

// App issues relations
export const appIssuesRelations = relations(appIssues, ({ one }) => ({
  createdBy: one(users, {
    fields: [appIssues.createdById],
    references: [users.id],
  }),
}));

// App issue types
export type AppIssue = typeof appIssues.$inferSelect;
export type InsertAppIssue = typeof appIssues.$inferInsert;

// App issue with relations
export type AppIssueWithRelations = AppIssue & {
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">;
};

// App issue schemas
export const insertAppIssueSchema = createInsertSchema(appIssues).omit({
  id: true,
  createdById: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().nullable().optional(),
  severity: z.enum(issueSeverities, { required_error: "Please select a severity level" }),
});

export const updateAppIssueSchema = createInsertSchema(appIssues).pick({
  title: true,
  description: true,
  severity: true,
  status: true,
}).partial();

export type CreateAppIssue = z.infer<typeof insertAppIssueSchema>;
export type UpdateAppIssue = z.infer<typeof updateAppIssueSchema>;

// ==========================================
// DEALS / SALES PIPELINE
// ==========================================

// Deals relations
export const dealsRelations = relations(deals, ({ one }) => ({
  createdBy: one(users, {
    fields: [deals.createdById],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
}));

// Deal types
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

// Deal with relations
export type DealWithRelations = Deal & {
  statusName?: string;
  createdBy?: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  client?: Pick<Client, "id" | "name"> | null;
  brand?: Pick<Brand, "id" | "name"> | null;
  owner?: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  primaryContact?: Pick<Contact, "id" | "firstName" | "lastName" | "emailAddresses" | "phoneNumbers" | "jobTitle"> | null;
};

// Deal location validation schema
export const dealLocationSchema = z.object({
  placeId: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string(),
  countryCode: z.string(),
  displayName: z.string(),
});

// Deal schemas
export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  dealNumber: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  statusLegacy: true,
}).extend({
  displayName: z.string().min(1, "Display name is required").max(255),
  status: z.number().int(),
  clientId: z.string().min(1, "Client is required"),
  locations: z.array(dealLocationSchema).default([]),
  budgetHigh: z.number().int().min(1000, "Minimum budget is $1,000").nullable().optional(),
  budgetLow: z.number().int().min(1000, "Minimum budget is $1,000").nullable().optional(),
  startedOn: z.string().nullable().optional(),
  wonOn: z.string().nullable().optional(),
  lastContactOn: z.string().nullable().optional(),
  projectDate: z.string().nullable().optional(),
});

export const updateDealSchema = createInsertSchema(deals).pick({
  displayName: true,
  status: true,
  clientId: true,
  brandId: true,
  primaryContactId: true,
  locations: true,
  locationsText: true,
  eventSchedule: true,
  concept: true,
  notes: true,
  nextSteps: true,
  ownerId: true,
  industryId: true,
  budgetHigh: true,
  budgetLow: true,
  budgetNotes: true,
  startedOn: true,
  wonOn: true,
  lastContactOn: true,
  proposalSentOn: true,
  serviceIds: true,
  projectDate: true,
}).partial();

export type CreateDeal = z.infer<typeof insertDealSchema>;
export type UpdateDeal = z.infer<typeof updateDealSchema>;

// Deal task schemas
export const insertDealTaskSchema = z.object({
  dealId: z.string().min(1, "Deal is required"),
  title: z.string().min(1, "Title is required").max(500),
  dueDate: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

export const updateDealTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

export type CreateDealTask = z.infer<typeof insertDealTaskSchema>;
export type UpdateDealTask = z.infer<typeof updateDealTaskSchema>;

// Deal task with relations type
export type DealTaskWithRelations = DealTask & {
  createdBy?: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  assignedUser?: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
};

// ==========================================
// CLIENTS
// ==========================================

// Client types
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// Client schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Client name is required").max(255),
  website: z.string().max(255).optional().nullable(),
  industryId: z.string().optional().nullable(),
});

export const updateClientSchema = createInsertSchema(clients).pick({
  name: true,
  website: true,
  industryId: true,
}).partial();

export type CreateClient = z.infer<typeof insertClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;

// ==========================================
// FORM OUTREACH / RFI SYSTEM
// ==========================================

// Form field types for dynamic forms
export const formFieldTypes = [
  "text",
  "textarea",
  "richtext",
  "number",
  "date",
  "select",
  "checkbox",
  "toggle",
  "array",
  "url",
  "email",
  "phone",
  "location",
  "eventSchedule",
  "services",
  "tags",
] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

// Form request status enum
export const formRequestStatuses = ["draft", "sent", "closed"] as const;
export type FormRequestStatus = (typeof formRequestStatuses)[number];

// Outreach recipient types (polymorphic)
export const recipientTypes = ["vendor", "contact"] as const;
export type RecipientType = (typeof recipientTypes)[number];

// Outreach token status
export const outreachTokenStatuses = ["pending", "responded", "expired"] as const;
export type OutreachTokenStatus = (typeof outreachTokenStatuses)[number];

export interface EntityMapping {
  entityType: string;
  propertyKey: string;
}

export interface MappableProperty {
  key: string;
  label: string;
  fieldType: FormFieldType;
  valueSchema: z.ZodType<unknown>;
}

const locationItemSchema = z.object({
  placeId: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string(),
  countryCode: z.string(),
  displayName: z.string(),
});

const eventScheduleItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["primary", "alternative", "range"]),
  startDate: z.string().optional(),
  rangeStartMonth: z.number().optional(),
  rangeStartYear: z.number().optional(),
  rangeEndMonth: z.number().optional(),
  rangeEndYear: z.number().optional(),
});

const eventSchema = z.object({
  id: z.string(),
  label: z.string(),
  durationDays: z.number(),
  scheduleMode: z.enum(["specific", "flexible"]),
  schedules: z.array(eventScheduleItemSchema),
});

export const mappableEntities: Record<string, { label: string; properties: MappableProperty[] }> = {
  deal: {
    label: "Deal",
    properties: [
      { key: "displayName", label: "Deal Name", fieldType: "text", valueSchema: z.string() },
      { key: "concept", label: "Concept", fieldType: "textarea", valueSchema: z.string() },
      { key: "notes", label: "Notes", fieldType: "textarea", valueSchema: z.string() },
      { key: "nextSteps", label: "Next Steps", fieldType: "textarea", valueSchema: z.string() },
      { key: "locationsText", label: "Location (Text)", fieldType: "text", valueSchema: z.string() },
      { key: "projectDate", label: "Project Date", fieldType: "text", valueSchema: z.string() },
      { key: "budgetLow", label: "Budget Low", fieldType: "number", valueSchema: z.number() },
      { key: "budgetHigh", label: "Budget High", fieldType: "number", valueSchema: z.number() },
      { key: "budgetNotes", label: "Budget Notes", fieldType: "textarea", valueSchema: z.string() },
      { key: "locations", label: "Locations (Structured)", fieldType: "location", valueSchema: z.array(locationItemSchema) },
      { key: "eventSchedule", label: "Event Schedule", fieldType: "eventSchedule", valueSchema: z.array(eventSchema) },
      { key: "serviceIds", label: "Services", fieldType: "services", valueSchema: z.array(z.number()) },
      { key: "tags", label: "Tags", fieldType: "tags", valueSchema: z.array(z.string()) },
    ],
  },
};

// Form field interface (for JSONB storage)
export interface FormField {
  id: string;
  name: string;
  type: FormFieldType;
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
  entityMapping?: EntityMapping;
}

// Form section interface (for JSONB storage)
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

// Form templates - reusable form definitions
export const formTemplates = pgTable(
  "form_templates",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 255 }),
    formSchema: jsonb("form_schema").$type<FormSection[]>().notNull().default([]),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_form_templates_name").on(table.name),
    index("idx_form_templates_created_by").on(table.createdById),
    index("idx_form_templates_category").on(table.category),
  ],
);

// Form requests - individual outreach campaigns
export const formRequests = pgTable(
  "form_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    templateId: varchar("template_id").references(() => formTemplates.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    formSchema: jsonb("form_schema").$type<FormSection[]>().notNull().default([]),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    dueDate: timestamp("due_date"),
    sentAt: timestamp("sent_at"),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_form_requests_template").on(table.templateId),
    index("idx_form_requests_status").on(table.status),
    index("idx_form_requests_created_by").on(table.createdById),
  ],
);

// Outreach tokens - polymorphic recipients (vendors or contacts)
export const outreachTokens = pgTable(
  "outreach_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    requestId: varchar("request_id").notNull().references(() => formRequests.id, { onDelete: "cascade" }),
    recipientType: varchar("recipient_type", { length: 20 }).notNull(), // 'vendor' | 'contact'
    recipientId: varchar("recipient_id").notNull(), // ID of vendor or contact
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    sentAt: timestamp("sent_at"),
    respondedAt: timestamp("responded_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_outreach_tokens_request").on(table.requestId),
    index("idx_outreach_tokens_token").on(table.token),
    index("idx_outreach_tokens_recipient").on(table.recipientType, table.recipientId),
    index("idx_outreach_tokens_status").on(table.status),
  ],
);

// Form responses - submitted form data
export const formResponses = pgTable(
  "form_responses",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tokenId: varchar("token_id").notNull().references(() => outreachTokens.id, { onDelete: "cascade" }).unique(),
    responseData: jsonb("response_data").$type<Record<string, unknown>>().notNull().default({}),
    submittedAt: timestamp("submitted_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_form_responses_token").on(table.tokenId),
  ],
);

// Form outreach relations
export const formTemplatesRelations = relations(formTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [formTemplates.createdById],
    references: [users.id],
  }),
  requests: many(formRequests),
}));

export const formRequestsRelations = relations(formRequests, ({ one, many }) => ({
  template: one(formTemplates, {
    fields: [formRequests.templateId],
    references: [formTemplates.id],
  }),
  createdBy: one(users, {
    fields: [formRequests.createdById],
    references: [users.id],
  }),
  tokens: many(outreachTokens),
}));

export const outreachTokensRelations = relations(outreachTokens, ({ one }) => ({
  request: one(formRequests, {
    fields: [outreachTokens.requestId],
    references: [formRequests.id],
  }),
  response: one(formResponses),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  token: one(outreachTokens, {
    fields: [formResponses.tokenId],
    references: [outreachTokens.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  createdBy: one(users, {
    fields: [comments.createdById],
    references: [users.id],
  }),
}));

// ==========================================
// Deal Intakes - structured intake questionnaires per deal
// ==========================================

export const dealIntakeStatuses = ["draft", "completed"] as const;
export type DealIntakeStatus = (typeof dealIntakeStatuses)[number];

export const dealIntakes = pgTable(
  "deal_intakes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }).unique(),
    templateId: varchar("template_id").references(() => formTemplates.id, { onDelete: "set null" }),
    templateName: varchar("template_name", { length: 255 }).notNull(),
    formSchema: jsonb("form_schema").$type<FormSection[]>().notNull().default([]),
    responseData: jsonb("response_data").$type<Record<string, unknown>>().notNull().default({}),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    completedAt: timestamp("completed_at"),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_deal_intakes_deal").on(table.dealId),
    index("idx_deal_intakes_template").on(table.templateId),
    index("idx_deal_intakes_status").on(table.status),
  ],
);

export const dealIntakesRelations = relations(dealIntakes, ({ one }) => ({
  deal: one(deals, {
    fields: [dealIntakes.dealId],
    references: [deals.id],
  }),
  template: one(formTemplates, {
    fields: [dealIntakes.templateId],
    references: [formTemplates.id],
  }),
  createdBy: one(users, {
    fields: [dealIntakes.createdById],
    references: [users.id],
  }),
}));

export type DealIntake = typeof dealIntakes.$inferSelect;
export type InsertDealIntake = typeof dealIntakes.$inferInsert;

export type DealIntakeWithRelations = DealIntake & {
  createdBy: Pick<User, "id" | "firstName" | "lastName"> | null;
};

export const insertDealIntakeSchema = createInsertSchema(dealIntakes).omit({
  id: true,
  createdById: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dealId: z.string().min(1),
  templateId: z.string().optional().nullable(),
  templateName: z.string().min(1),
  formSchema: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(formFieldTypes),
      placeholder: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional(),
      entityMapping: z.object({
        entityType: z.string(),
        propertyKey: z.string(),
      }).optional(),
    })),
  })).default([]),
  responseData: z.record(z.unknown()).default({}),
  status: z.enum(dealIntakeStatuses).default("draft"),
});

export const updateDealIntakeSchema = z.object({
  responseData: z.record(z.unknown()).optional(),
  status: z.enum(dealIntakeStatuses).optional(),
});

export type CreateDealIntake = z.infer<typeof insertDealIntakeSchema>;
export type UpdateDealIntake = z.infer<typeof updateDealIntakeSchema>;

// Form outreach types
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof formTemplates.$inferInsert;
export type FormRequest = typeof formRequests.$inferSelect;
export type InsertFormRequest = typeof formRequests.$inferInsert;
export type OutreachToken = typeof outreachTokens.$inferSelect;
export type InsertOutreachToken = typeof outreachTokens.$inferInsert;
export type FormResponse = typeof formResponses.$inferSelect;
export type InsertFormResponse = typeof formResponses.$inferInsert;

// Extended types with relations
export type FormTemplateWithRelations = FormTemplate & {
  createdBy: Pick<User, "id" | "firstName" | "lastName"> | null;
};

export type OutreachTokenWithRecipient = OutreachToken & {
  vendor?: Vendor | null;
  contact?: Contact | null;
  response?: FormResponse | null;
};

export type FormRequestWithRelations = FormRequest & {
  template?: FormTemplate | null;
  createdBy: Pick<User, "id" | "firstName" | "lastName"> | null;
  tokens?: OutreachTokenWithRecipient[];
  recipientCount?: number;
  respondedCount?: number;
};

// Public form response data (what vendor/contact sees)
export type PublicFormData = {
  request: {
    id: string;
    title: string;
    description: string | null;
    formSchema: FormSection[];
    dueDate: Date | null;
  };
  recipient: {
    id: string;
    type: RecipientType;
    name: string;
    email: string | null;
  };
  existingResponse: Record<string, unknown> | null;
};

// Form template schemas
export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().max(255).optional().nullable(),
  formSchema: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(formFieldTypes),
      placeholder: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional(),
      entityMapping: z.object({
        entityType: z.string(),
        propertyKey: z.string(),
      }).optional(),
    })),
  })).default([]),
});

export const updateFormTemplateSchema = insertFormTemplateSchema.partial();

export type CreateFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type UpdateFormTemplate = z.infer<typeof updateFormTemplateSchema>;

// Form request schemas
export const insertFormRequestSchema = createInsertSchema(formRequests).omit({
  id: true,
  createdById: true,
  status: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(255),
  templateId: z.string().optional().nullable(),
  formSchema: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(formFieldTypes),
      placeholder: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional(),
      entityMapping: z.object({
        entityType: z.string(),
        propertyKey: z.string(),
      }).optional(),
    })),
  })).default([]),
  dueDate: z.string().optional().nullable(),
});

export const updateFormRequestSchema = createInsertSchema(formRequests).pick({
  title: true,
  description: true,
  formSchema: true,
  status: true,
  dueDate: true,
}).extend({
  dueDate: z.union([z.string(), z.date()]).optional().nullable().transform((val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
}).partial();

export type CreateFormRequest = z.infer<typeof insertFormRequestSchema>;
export type UpdateFormRequest = z.infer<typeof updateFormRequestSchema>;

// Form response schema (for public submission)
export const insertFormResponseSchema = z.object({
  responseData: z.record(z.unknown()),
});

export type CreateFormResponse = z.infer<typeof insertFormResponseSchema>;

// Comment types
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

export type CommentWithAuthor = Comment & {
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl"> | null;
  replies?: CommentWithAuthor[];
  entityName?: string | null;
};

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  body: z.string().min(1, "Comment cannot be empty"),
  entityType: z.enum(commentEntityTypes),
  entityId: z.string().min(1),
  parentId: z.string().optional().nullable(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
});

export type CreateComment = z.infer<typeof insertCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;

// ============================================
// Analytics Tables
// ============================================

// Analytics sessions - tracks user sessions for duration and journey
export const analyticsSessions = pgTable(
  "analytics_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    sessionToken: varchar("session_token").notNull().unique(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    deviceType: varchar("device_type", { length: 20 }), // 'desktop' | 'tablet' | 'mobile'
    environment: varchar("environment", { length: 20 }).notNull().default("development"), // 'development' | 'production'
  },
  (table) => [
    index("idx_analytics_sessions_user").on(table.userId),
    index("idx_analytics_sessions_started").on(table.startedAt),
    index("idx_analytics_sessions_token").on(table.sessionToken),
    index("idx_analytics_sessions_environment").on(table.environment),
  ],
);

// Page views - tracks each page navigation
export const analyticsPageViews = pgTable(
  "analytics_page_views",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").references(() => analyticsSessions.id),
    userId: varchar("user_id").references(() => users.id),
    path: varchar("path", { length: 500 }).notNull(),
    title: varchar("title", { length: 200 }),
    referrer: varchar("referrer", { length: 500 }),
    viewedAt: timestamp("viewed_at").defaultNow().notNull(),
    durationMs: integer("duration_ms"), // Time spent on page
    environment: varchar("environment", { length: 20 }).notNull().default("development"), // 'development' | 'production'
  },
  (table) => [
    index("idx_analytics_page_views_session").on(table.sessionId),
    index("idx_analytics_page_views_user").on(table.userId),
    index("idx_analytics_page_views_path").on(table.path),
    index("idx_analytics_page_views_viewed_at").on(table.viewedAt),
    index("idx_analytics_page_views_environment").on(table.environment),
  ],
);

// Analytics events - tracks button clicks and other interactions
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").references(() => analyticsSessions.id),
    userId: varchar("user_id").references(() => users.id),
    eventType: varchar("event_type", { length: 50 }).notNull(), // 'click' | 'submit' | 'vote' | etc.
    eventName: varchar("event_name", { length: 100 }).notNull(), // e.g., 'feature_vote', 'login', 'form_submit'
    eventCategory: varchar("event_category", { length: 50 }), // e.g., 'navigation', 'engagement', 'auth'
    path: varchar("path", { length: 500 }),
    elementId: varchar("element_id", { length: 100 }), // data-testid or element identifier
    metadata: jsonb("metadata"), // Additional event data
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    environment: varchar("environment", { length: 20 }).notNull().default("development"), // 'development' | 'production'
  },
  (table) => [
    index("idx_analytics_events_session").on(table.sessionId),
    index("idx_analytics_events_user").on(table.userId),
    index("idx_analytics_events_type").on(table.eventType),
    index("idx_analytics_events_name").on(table.eventName),
    index("idx_analytics_events_occurred_at").on(table.occurredAt),
    index("idx_analytics_events_environment").on(table.environment),
  ],
);

// Types for analytics
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type InsertAnalyticsSession = typeof analyticsSessions.$inferInsert;

export type AnalyticsPageView = typeof analyticsPageViews.$inferSelect;
export type InsertAnalyticsPageView = typeof analyticsPageViews.$inferInsert;

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// Insert schemas
export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({
  id: true,
  startedAt: true,
  lastActivityAt: true,
});

export const insertAnalyticsPageViewSchema = createInsertSchema(analyticsPageViews).omit({
  id: true,
  viewedAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  occurredAt: true,
});

export type CreateAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;
export type CreateAnalyticsPageView = z.infer<typeof insertAnalyticsPageViewSchema>;
export type CreateAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;

// ==========================================
// APP RELEASES / VERSION MANAGEMENT
// ==========================================

// Release status enum
export const releaseStatuses = ["draft", "released"] as const;
export type ReleaseStatus = (typeof releaseStatuses)[number];

// Change type enum for manual changes
export const changeTypes = ["feature", "bugfix", "improvement", "task"] as const;
export type ChangeType = (typeof changeTypes)[number];

// App releases - version records
export const appReleases = pgTable(
  "app_releases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    versionLabel: varchar("version_label", { length: 50 }).notNull().unique(), // e.g., "V1.0.1"
    title: varchar("title", { length: 200 }), // Optional release title/name
    releaseNotes: text("release_notes"), // Summary of the release
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    releaseDate: timestamp("release_date"), // When released (null if draft)
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_releases_status").on(table.status),
    index("idx_app_releases_release_date").on(table.releaseDate),
    index("idx_app_releases_version").on(table.versionLabel),
  ],
);

// App release features - links releases to app_features
export const appReleaseFeatures = pgTable(
  "app_release_features",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    releaseId: varchar("release_id")
      .notNull()
      .references(() => appReleases.id, { onDelete: "cascade" }),
    featureId: varchar("feature_id")
      .notNull()
      .references(() => appFeatures.id, { onDelete: "cascade" }),
    notes: text("notes"), // Optional notes about inclusion
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("unique_release_feature").on(table.releaseId, table.featureId),
    index("idx_app_release_features_release").on(table.releaseId),
    index("idx_app_release_features_feature").on(table.featureId),
  ],
);

// App release issues - links releases to app_issues
export const appReleaseIssues = pgTable(
  "app_release_issues",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    releaseId: varchar("release_id")
      .notNull()
      .references(() => appReleases.id, { onDelete: "cascade" }),
    issueId: varchar("issue_id")
      .notNull()
      .references(() => appIssues.id, { onDelete: "cascade" }),
    notes: text("notes"), // Optional notes about fix
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique("unique_release_issue").on(table.releaseId, table.issueId),
    index("idx_app_release_issues_release").on(table.releaseId),
    index("idx_app_release_issues_issue").on(table.issueId),
  ],
);

// App release changes - manual change entries (non-feature, non-issue)
export const appReleaseChanges = pgTable(
  "app_release_changes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    releaseId: varchar("release_id")
      .notNull()
      .references(() => appReleases.id, { onDelete: "cascade" }),
    changeType: varchar("change_type", { length: 20 }).notNull(), // feature, bugfix, improvement, task
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_app_release_changes_release").on(table.releaseId),
    index("idx_app_release_changes_type").on(table.changeType),
  ],
);

// Relations for releases
export const appReleasesRelations = relations(appReleases, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [appReleases.createdById],
    references: [users.id],
  }),
  features: many(appReleaseFeatures),
  issues: many(appReleaseIssues),
  changes: many(appReleaseChanges),
}));

export const appReleaseFeaturesRelations = relations(appReleaseFeatures, ({ one }) => ({
  release: one(appReleases, {
    fields: [appReleaseFeatures.releaseId],
    references: [appReleases.id],
  }),
  feature: one(appFeatures, {
    fields: [appReleaseFeatures.featureId],
    references: [appFeatures.id],
  }),
}));

export const appReleaseIssuesRelations = relations(appReleaseIssues, ({ one }) => ({
  release: one(appReleases, {
    fields: [appReleaseIssues.releaseId],
    references: [appReleases.id],
  }),
  issue: one(appIssues, {
    fields: [appReleaseIssues.issueId],
    references: [appIssues.id],
  }),
}));

export const appReleaseChangesRelations = relations(appReleaseChanges, ({ one }) => ({
  release: one(appReleases, {
    fields: [appReleaseChanges.releaseId],
    references: [appReleases.id],
  }),
  createdBy: one(users, {
    fields: [appReleaseChanges.createdById],
    references: [users.id],
  }),
}));

// Types for releases
export type AppRelease = typeof appReleases.$inferSelect;
export type InsertAppRelease = typeof appReleases.$inferInsert;
export type AppReleaseFeature = typeof appReleaseFeatures.$inferSelect;
export type AppReleaseIssue = typeof appReleaseIssues.$inferSelect;
export type AppReleaseChange = typeof appReleaseChanges.$inferSelect;

// Release with full details
export type AppReleaseWithDetails = AppRelease & {
  createdBy: Pick<User, "id" | "firstName" | "lastName">;
  features: Array<AppReleaseFeature & { feature: Pick<AppFeature, "id" | "title" | "featureType" | "status"> }>;
  issues: Array<AppReleaseIssue & { issue: Pick<AppIssue, "id" | "title" | "severity" | "status"> }>;
  changes: Array<AppReleaseChange & { createdBy: Pick<User, "id" | "firstName" | "lastName"> }>;
};

// Insert schemas
export const insertAppReleaseSchema = createInsertSchema(appReleases).omit({
  id: true,
  createdById: true,
  status: true,
  releaseDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  versionLabel: z.string().min(1, "Version label is required").max(50).regex(/^V?\d+(\.\d+)*$/, "Version must be in format V1.0.0 or 1.0.0"),
  title: z.string().max(200).optional(),
  releaseNotes: z.string().optional(),
});

export const updateAppReleaseSchema = createInsertSchema(appReleases).pick({
  versionLabel: true,
  title: true,
  releaseNotes: true,
}).partial().extend({
  versionLabel: z.string().min(1).max(50).regex(/^V?\d+(\.\d+)*$/, "Version must be in format V1.0.0 or 1.0.0").optional(),
});

export const insertAppReleaseChangeSchema = createInsertSchema(appReleaseChanges).omit({
  id: true,
  releaseId: true,
  createdById: true,
  createdAt: true,
}).extend({
  changeType: z.enum(changeTypes, { required_error: "Change type is required" }),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional(),
});

export type CreateAppRelease = z.infer<typeof insertAppReleaseSchema>;
export type UpdateAppRelease = z.infer<typeof updateAppReleaseSchema>;
export type CreateAppReleaseChange = z.infer<typeof insertAppReleaseChangeSchema>;

// Brands table
export const brands = pgTable(
  "brands",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    externalId: integer("external_id"),
    name: varchar("name", { length: 255 }).notNull().unique(),
    industry: varchar("industry", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_brands_name").on(table.name),
    index("idx_brands_industry").on(table.industry),
    index("idx_brands_created_at").on(table.createdAt),
  ],
);

// Types for brands
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// Insert schema for brands
export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(255),
  industry: z.string().max(100).nullish(),
  notes: z.string().nullish(),
  externalId: z.number().int().optional(),
});

export const updateBrandSchema = insertBrandSchema.partial();

export type CreateBrand = z.infer<typeof insertBrandSchema>;
export type UpdateBrand = z.infer<typeof updateBrandSchema>;
