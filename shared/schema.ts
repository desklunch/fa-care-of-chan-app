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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdInvites: many(invites),
  auditLogs: many(auditLogs),
  createdFeatures: many(appFeatures, { relationName: "createdFeatures" }),
  ownedFeatures: many(appFeatures, { relationName: "ownedFeatures" }),
  featureVotes: many(appFeatureVotes),
  featureComments: many(appFeatureComments),
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

// Keep old type aliases for backward compatibility
export type ProductFeature = AppFeature;
export type InsertProductFeature = InsertAppFeature;

// Audit log action types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'email_sent' | 'invite_used';
export type AuditEntityType = 'user' | 'invite' | 'session' | 'feature' | 'feature_category' | 'feature_comment';
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
