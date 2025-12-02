import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdInvites: many(invites),
  auditLogs: many(auditLogs),
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

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Audit log action types
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'email_sent' | 'invite_used';
export type AuditEntityType = 'user' | 'invite' | 'session';
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
