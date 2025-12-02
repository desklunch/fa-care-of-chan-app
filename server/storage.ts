import {
  users,
  invites,
  auditLogs,
  type User,
  type UpsertUser,
  type Invite,
  type InsertInvite,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, gt, sql, asc, gte, lte } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedAuditLogs {
  logs: (AuditLog & { performerName?: string })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  getAllEmployees(): Promise<User[]>;
  getRecentEmployees(limit?: number): Promise<User[]>;
  
  // Invite operations
  createInvite(data: InsertInvite, createdById: string): Promise<Invite>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  getInviteById(id: string): Promise<Invite | undefined>;
  markInviteUsed(id: string): Promise<void>;
  deleteInvite(id: string): Promise<void>;
  getAllInvites(): Promise<Invite[]>;
  getPendingInvites(): Promise<Invite[]>;
  
  // Audit log operations
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(
    page: number,
    pageSize: number,
    filters?: AuditLogFilters
  ): Promise<PaginatedAuditLogs>;
  
  // Stats
  getStats(): Promise<{
    totalEmployees: number;
    activeInvites: number;
    recentSignups: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          title: userData.title,
          department: userData.department,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllEmployees(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.firstName, users.lastName);
  }

  async getRecentEmployees(limit: number = 5): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(desc(users.createdAt))
      .limit(limit);
  }

  // Invite operations
  async createInvite(data: InsertInvite, createdById: string): Promise<Invite> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const [invite] = await db
      .insert(invites)
      .values({
        ...data,
        token,
        createdById,
        expiresAt,
      })
      .returning();
    return invite;
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.token, token));
    return invite;
  }

  async getInviteById(id: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.id, id));
    return invite;
  }

  async markInviteUsed(id: string): Promise<void> {
    await db
      .update(invites)
      .set({ usedAt: new Date() })
      .where(eq(invites.id, id));
  }

  async deleteInvite(id: string): Promise<void> {
    await db.delete(invites).where(eq(invites.id, id));
  }

  async getAllInvites(): Promise<Invite[]> {
    return db.select().from(invites).orderBy(desc(invites.createdAt));
  }

  async getPendingInvites(): Promise<Invite[]> {
    const now = new Date();
    return db
      .select()
      .from(invites)
      .where(and(isNull(invites.usedAt), gt(invites.expiresAt, now)))
      .orderBy(desc(invites.createdAt));
  }

  // Stats
  async getStats(): Promise<{
    totalEmployees: number;
    activeInvites: number;
    recentSignups: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    const [inviteCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invites)
      .where(and(isNull(invites.usedAt), gt(invites.expiresAt, now)));

    const [recentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isActive, true), gt(users.createdAt, sevenDaysAgo)));

    return {
      totalEmployees: Number(employeeCount?.count) || 0,
      activeInvites: Number(inviteCount?.count) || 0,
      recentSignups: Number(recentCount?.count) || 0,
    };
  }

  // Audit log operations
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(
    page: number = 1,
    pageSize: number = 50,
    filters?: AuditLogFilters
  ): Promise<PaginatedAuditLogs> {
    const offset = (page - 1) * pageSize;
    
    // Build filter conditions
    const conditions: any[] = [];
    
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.performedBy) {
      conditions.push(eq(auditLogs.performedBy, filters.performedBy));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.performedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.performedAt, filters.endDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);
    
    const total = Number(countResult?.count) || 0;
    
    // Get paginated logs with performer info
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        performedBy: auditLogs.performedBy,
        performedAt: auditLogs.performedAt,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        status: auditLogs.status,
        changes: auditLogs.changes,
        metadata: auditLogs.metadata,
        performerFirstName: users.firstName,
        performerLastName: users.lastName,
        performerEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.performedAt))
      .limit(pageSize)
      .offset(offset);
    
    // Transform to include performerName
    const logsWithNames = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      performedBy: log.performedBy,
      performedAt: log.performedAt,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      status: log.status,
      changes: log.changes,
      metadata: log.metadata,
      performerName: [log.performerFirstName, log.performerLastName]
        .filter(Boolean)
        .join(" ") || log.performerEmail || "System",
    }));
    
    return {
      logs: logsWithNames,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

export const storage = new DatabaseStorage();
