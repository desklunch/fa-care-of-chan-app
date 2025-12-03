import {
  users,
  invites,
  auditLogs,
  featureCategories,
  productFeatures,
  featureVotes,
  featureComments,
  contacts,
  type User,
  type UpsertUser,
  type Invite,
  type InsertInvite,
  type CreateInvite,
  type AuditLog,
  type InsertAuditLog,
  type FeatureCategory,
  type InsertFeatureCategory,
  type ProductFeature,
  type InsertProductFeature,
  type CreateProductFeature,
  type FeatureVote,
  type FeatureComment,
  type InsertFeatureComment,
  type ProductFeatureWithRelations,
  type FeatureCommentWithUser,
  type FeatureStatus,
  type Contact,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, gt, sql, gte, lte, inArray } from "drizzle-orm";
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
  createInvite(data: CreateInvite, createdById: string): Promise<Invite>;
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

  // Feature category operations
  getCategories(includeInactive?: boolean): Promise<FeatureCategory[]>;
  getCategoryById(id: string): Promise<FeatureCategory | undefined>;
  createCategory(data: InsertFeatureCategory): Promise<FeatureCategory>;
  updateCategory(id: string, data: Partial<InsertFeatureCategory>): Promise<FeatureCategory | undefined>;
  updateCategoryOrder(orderedIds: string[]): Promise<void>;
  
  // Product feature operations
  getFeatures(options?: {
    status?: FeatureStatus[];
    categoryId?: string;
    userId?: string;
  }): Promise<ProductFeatureWithRelations[]>;
  getFeatureById(id: string, userId?: string): Promise<ProductFeatureWithRelations | undefined>;
  createFeature(data: CreateProductFeature, createdById: string): Promise<ProductFeature>;
  updateFeature(id: string, data: Partial<InsertProductFeature>): Promise<ProductFeature | undefined>;
  deleteFeature(id: string): Promise<void>;
  
  // Feature vote operations
  toggleVote(featureId: string, userId: string): Promise<{ voted: boolean; voteCount: number }>;
  getUserVotes(userId: string): Promise<string[]>;
  
  // Feature comment operations
  getComments(featureId: string): Promise<FeatureCommentWithUser[]>;
  createComment(featureId: string, userId: string, body: string): Promise<FeatureComment>;
  deleteComment(id: string): Promise<void>;
  
  // Contact operations
  getContacts(): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
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
  async createInvite(data: CreateInvite, createdById: string): Promise<Invite> {
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

  // Feature category operations
  async getCategories(includeInactive: boolean = false): Promise<FeatureCategory[]> {
    if (includeInactive) {
      return db.select().from(featureCategories).orderBy(featureCategories.sortOrder, featureCategories.name);
    }
    return db
      .select()
      .from(featureCategories)
      .where(eq(featureCategories.isActive, true))
      .orderBy(featureCategories.sortOrder, featureCategories.name);
  }

  async getCategoryById(id: string): Promise<FeatureCategory | undefined> {
    const [category] = await db
      .select()
      .from(featureCategories)
      .where(eq(featureCategories.id, id));
    return category;
  }

  async createCategory(data: InsertFeatureCategory): Promise<FeatureCategory> {
    const [category] = await db
      .insert(featureCategories)
      .values(data)
      .returning();
    return category;
  }

  async updateCategory(
    id: string,
    data: Partial<InsertFeatureCategory>
  ): Promise<FeatureCategory | undefined> {
    const [category] = await db
      .update(featureCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(featureCategories.id, id))
      .returning();
    return category;
  }

  async updateCategoryOrder(orderedIds: string[]): Promise<void> {
    // Update each category's sortOrder based on its position in the array
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(featureCategories)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(featureCategories.id, id))
      )
    );
  }

  // Product feature operations
  async getFeatures(options?: {
    status?: FeatureStatus[];
    categoryId?: string;
    userId?: string;
  }): Promise<ProductFeatureWithRelations[]> {
    const conditions: any[] = [];

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(productFeatures.status, options.status));
    }
    if (options?.categoryId) {
      conditions.push(eq(productFeatures.categoryId, options.categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const features = await db
      .select({
        id: productFeatures.id,
        title: productFeatures.title,
        description: productFeatures.description,
        featureType: productFeatures.featureType,
        categoryId: productFeatures.categoryId,
        status: productFeatures.status,
        priority: productFeatures.priority,
        createdById: productFeatures.createdById,
        ownerId: productFeatures.ownerId,
        voteCount: productFeatures.voteCount,
        estimatedDelivery: productFeatures.estimatedDelivery,
        createdAt: productFeatures.createdAt,
        updatedAt: productFeatures.updatedAt,
        categoryName: featureCategories.name,
        categoryColor: featureCategories.color,
        categoryDescription: featureCategories.description,
        categoryIsActive: featureCategories.isActive,
        categoryCreatedAt: featureCategories.createdAt,
        categoryUpdatedAt: featureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(productFeatures)
      .innerJoin(featureCategories, eq(productFeatures.categoryId, featureCategories.id))
      .innerJoin(users, eq(productFeatures.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(productFeatures.voteCount), desc(productFeatures.createdAt));

    // Get user votes if userId provided
    let userVotes: string[] = [];
    if (options?.userId) {
      userVotes = await this.getUserVotes(options.userId);
    }

    return features.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      featureType: f.featureType,
      categoryId: f.categoryId,
      status: f.status,
      priority: f.priority,
      createdById: f.createdById,
      ownerId: f.ownerId,
      voteCount: f.voteCount,
      estimatedDelivery: f.estimatedDelivery,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      category: {
        id: f.categoryId,
        name: f.categoryName,
        description: f.categoryDescription,
        color: f.categoryColor,
        isActive: f.categoryIsActive,
        createdAt: f.categoryCreatedAt,
        updatedAt: f.categoryUpdatedAt,
      },
      createdBy: {
        id: f.createdById,
        firstName: f.createdByFirstName,
        lastName: f.createdByLastName,
        profileImageUrl: f.createdByProfileImage,
      },
      hasVoted: userVotes.includes(f.id),
    }));
  }

  async getFeatureById(
    id: string,
    userId?: string
  ): Promise<ProductFeatureWithRelations | undefined> {
    const features = await db
      .select({
        id: productFeatures.id,
        title: productFeatures.title,
        description: productFeatures.description,
        featureType: productFeatures.featureType,
        categoryId: productFeatures.categoryId,
        status: productFeatures.status,
        priority: productFeatures.priority,
        createdById: productFeatures.createdById,
        ownerId: productFeatures.ownerId,
        voteCount: productFeatures.voteCount,
        estimatedDelivery: productFeatures.estimatedDelivery,
        createdAt: productFeatures.createdAt,
        updatedAt: productFeatures.updatedAt,
        categoryName: featureCategories.name,
        categoryColor: featureCategories.color,
        categoryDescription: featureCategories.description,
        categoryIsActive: featureCategories.isActive,
        categoryCreatedAt: featureCategories.createdAt,
        categoryUpdatedAt: featureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(productFeatures)
      .innerJoin(featureCategories, eq(productFeatures.categoryId, featureCategories.id))
      .innerJoin(users, eq(productFeatures.createdById, users.id))
      .where(eq(productFeatures.id, id));

    if (features.length === 0) return undefined;

    const f = features[0];
    let hasVoted = false;
    if (userId) {
      const [vote] = await db
        .select()
        .from(featureVotes)
        .where(and(eq(featureVotes.featureId, id), eq(featureVotes.userId, userId)));
      hasVoted = !!vote;
    }

    return {
      id: f.id,
      title: f.title,
      description: f.description,
      featureType: f.featureType,
      categoryId: f.categoryId,
      status: f.status,
      priority: f.priority,
      createdById: f.createdById,
      ownerId: f.ownerId,
      voteCount: f.voteCount,
      estimatedDelivery: f.estimatedDelivery,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      category: {
        id: f.categoryId,
        name: f.categoryName,
        description: f.categoryDescription,
        color: f.categoryColor,
        isActive: f.categoryIsActive,
        createdAt: f.categoryCreatedAt,
        updatedAt: f.categoryUpdatedAt,
      },
      createdBy: {
        id: f.createdById,
        firstName: f.createdByFirstName,
        lastName: f.createdByLastName,
        profileImageUrl: f.createdByProfileImage,
      },
      hasVoted,
    };
  }

  async createFeature(
    data: CreateProductFeature,
    createdById: string
  ): Promise<ProductFeature> {
    const [feature] = await db
      .insert(productFeatures)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return feature;
  }

  async updateFeature(
    id: string,
    data: Partial<InsertProductFeature>
  ): Promise<ProductFeature | undefined> {
    const [feature] = await db
      .update(productFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productFeatures.id, id))
      .returning();
    return feature;
  }

  async deleteFeature(id: string): Promise<void> {
    await db.delete(productFeatures).where(eq(productFeatures.id, id));
  }

  // Feature vote operations
  async toggleVote(
    featureId: string,
    userId: string
  ): Promise<{ voted: boolean; voteCount: number }> {
    // Check if vote exists
    const [existingVote] = await db
      .select()
      .from(featureVotes)
      .where(and(eq(featureVotes.featureId, featureId), eq(featureVotes.userId, userId)));

    if (existingVote) {
      // Remove vote
      await db
        .delete(featureVotes)
        .where(eq(featureVotes.id, existingVote.id));
      
      // Decrement vote count
      await db
        .update(productFeatures)
        .set({ voteCount: sql`${productFeatures.voteCount} - 1` })
        .where(eq(productFeatures.id, featureId));
      
      const [feature] = await db
        .select({ voteCount: productFeatures.voteCount })
        .from(productFeatures)
        .where(eq(productFeatures.id, featureId));
      
      return { voted: false, voteCount: feature?.voteCount || 0 };
    } else {
      // Add vote
      await db.insert(featureVotes).values({
        featureId,
        userId,
        value: 1,
      });
      
      // Increment vote count
      await db
        .update(productFeatures)
        .set({ voteCount: sql`${productFeatures.voteCount} + 1` })
        .where(eq(productFeatures.id, featureId));
      
      const [feature] = await db
        .select({ voteCount: productFeatures.voteCount })
        .from(productFeatures)
        .where(eq(productFeatures.id, featureId));
      
      return { voted: true, voteCount: feature?.voteCount || 0 };
    }
  }

  async getUserVotes(userId: string): Promise<string[]> {
    const votes = await db
      .select({ featureId: featureVotes.featureId })
      .from(featureVotes)
      .where(eq(featureVotes.userId, userId));
    return votes.map((v) => v.featureId);
  }

  // Feature comment operations
  async getComments(featureId: string): Promise<FeatureCommentWithUser[]> {
    const comments = await db
      .select({
        id: featureComments.id,
        featureId: featureComments.featureId,
        userId: featureComments.userId,
        body: featureComments.body,
        createdAt: featureComments.createdAt,
        updatedAt: featureComments.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImage: users.profileImageUrl,
      })
      .from(featureComments)
      .innerJoin(users, eq(featureComments.userId, users.id))
      .where(eq(featureComments.featureId, featureId))
      .orderBy(featureComments.createdAt);

    return comments.map((c) => ({
      id: c.id,
      featureId: c.featureId,
      userId: c.userId,
      body: c.body,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: {
        id: c.userId,
        firstName: c.userFirstName,
        lastName: c.userLastName,
        profileImageUrl: c.userProfileImage,
      },
    }));
  }

  async createComment(
    featureId: string,
    userId: string,
    body: string
  ): Promise<FeatureComment> {
    const [comment] = await db
      .insert(featureComments)
      .values({
        featureId,
        userId,
        body,
      })
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(featureComments).where(eq(featureComments.id, id));
  }

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return db
      .select()
      .from(contacts)
      .orderBy(contacts.lastName, contacts.firstName);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }
}

export const storage = new DatabaseStorage();
