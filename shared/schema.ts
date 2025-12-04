import { sql, relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
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
  role: varchar("role").default("employee").notNull(), // 'admin' | 'employee'
  title: varchar("title"),
  department: varchar("department"),
  phone: varchar("phone"),
  location: varchar("location"),
  bio: text("bio"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invite tokens for employee registration
export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdById: varchar("created_by_id").references(() => users.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  },
  (table) => [
    index("idx_audit_logs_performed_at").on(table.performedAt),
    index("idx_audit_logs_entity_type").on(table.entityType),
    index("idx_audit_logs_performed_by").on(table.performedBy),
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
    description: text("description").notNull(),
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
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_features_status").on(table.status),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdInvites: many(invites),
  auditLogs: many(auditLogs),
  createdFeatures: many(appFeatures, { relationName: "createdFeatures" }),
  ownedFeatures: many(appFeatures, { relationName: "ownedFeatures" }),
  featureVotes: many(appFeatureVotes),
  featureComments: many(appFeatureComments),
  createdVendorTokens: many(vendorUpdateTokens),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  createdBy: one(users, {
    fields: [invites.createdById],
    references: [users.id],
  }),
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
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
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

export type ContactWithVendors = Contact & {
  vendors: Vendor[];
};

// Keep old type aliases for backward compatibility
export type ProductFeature = AppFeature;
export type InsertProductFeature = InsertAppFeature;

// Audit log action types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'email_sent' | 'invite_used';
export type AuditEntityType = 'user' | 'invite' | 'session' | 'feature' | 'feature_category' | 'feature_comment' | 'contact' | 'vendor' | 'vendor_update_token' | 'app_setting' | 'app_issue' | 'form_template' | 'form_request' | 'outreach_token' | 'form_response';
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

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  token: true,
  createdAt: true,
  usedAt: true,
  expiresAt: true,
  createdById: true,
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type CreateInvite = z.infer<typeof insertInviteSchema>;

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
  status: true,
  priority: true,
  ownerId: true,
  estimatedDelivery: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryId: z.string().min(1, "Category is required"),
  featureType: z.enum(featureTypes, { required_error: "Please select Idea or Requirement" }),
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
    description: text("description").notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).default("reported").notNull(),
    createdById: varchar("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_app_issues_status").on(table.status),
    index("idx_app_issues_severity").on(table.severity),
    index("idx_app_issues_created_by").on(table.createdById),
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
  description: z.string().min(10, "Description must be at least 10 characters"),
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
// FORM OUTREACH / RFI SYSTEM
// ==========================================

// Form field types for dynamic forms
export const formFieldTypes = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "toggle",
  "array",
  "url",
  "email",
  "phone",
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

// Form field interface (for JSONB storage)
export interface FormField {
  id: string;
  name: string;
  type: FormFieldType;
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
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
    formSchema: jsonb("form_schema").$type<FormSection[]>().notNull().default([]),
    createdById: varchar("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_form_templates_name").on(table.name),
    index("idx_form_templates_created_by").on(table.createdById),
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
    })),
  })).default([]),
  dueDate: z.string().optional().nullable(),
});

export const updateFormRequestSchema = createInsertSchema(formRequests).pick({
  title: true,
  description: true,
  formSchema: true,
  dueDate: true,
}).partial();

export type CreateFormRequest = z.infer<typeof insertFormRequestSchema>;
export type UpdateFormRequest = z.infer<typeof updateFormRequestSchema>;

// Form response schema (for public submission)
export const insertFormResponseSchema = z.object({
  responseData: z.record(z.unknown()),
});

export type CreateFormResponse = z.infer<typeof insertFormResponseSchema>;
