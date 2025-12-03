import {
  users,
  invites,
  auditLogs,
  appFeatureCategories,
  appFeatures,
  appFeatureVotes,
  appFeatureComments,
  contacts,
  vendors,
  vendorServices,
  vendorServicesVendors,
  type User,
  type UpsertUser,
  type Invite,
  type InsertInvite,
  type CreateInvite,
  type AuditLog,
  type InsertAuditLog,
  type FeatureCategory,
  type InsertFeatureCategory,
  type AppFeature,
  type InsertAppFeature,
  type CreateProductFeature,
  type FeatureVote,
  type FeatureComment,
  type InsertFeatureComment,
  type ProductFeatureWithRelations,
  type FeatureCommentWithUser,
  type FeatureStatus,
  type Contact,
  type Vendor,
  type VendorService,
  type VendorWithServices,
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
  createFeature(data: CreateProductFeature, createdById: string): Promise<AppFeature>;
  updateFeature(id: string, data: Partial<InsertAppFeature>): Promise<AppFeature | undefined>;
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
  
  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendorsWithServices(): Promise<VendorWithServices[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  
  // Vendor service operations
  getVendorServices(): Promise<VendorService[]>;
  getVendorServiceById(id: string): Promise<VendorService | undefined>;
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
      return db.select().from(appFeatureCategories).orderBy(appFeatureCategories.sortOrder, appFeatureCategories.name);
    }
    return db
      .select()
      .from(appFeatureCategories)
      .where(eq(appFeatureCategories.isActive, true))
      .orderBy(appFeatureCategories.sortOrder, appFeatureCategories.name);
  }

  async getCategoryById(id: string): Promise<FeatureCategory | undefined> {
    const [category] = await db
      .select()
      .from(appFeatureCategories)
      .where(eq(appFeatureCategories.id, id));
    return category;
  }

  async createCategory(data: InsertFeatureCategory): Promise<FeatureCategory> {
    const [category] = await db
      .insert(appFeatureCategories)
      .values(data)
      .returning();
    return category;
  }

  async updateCategory(
    id: string,
    data: Partial<InsertFeatureCategory>
  ): Promise<FeatureCategory | undefined> {
    const [category] = await db
      .update(appFeatureCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appFeatureCategories.id, id))
      .returning();
    return category;
  }

  async updateCategoryOrder(orderedIds: string[]): Promise<void> {
    // Update each category's sortOrder based on its position in the array
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(appFeatureCategories)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(appFeatureCategories.id, id))
      )
    );
  }

  // App feature operations
  async getFeatures(options?: {
    status?: FeatureStatus[];
    categoryId?: string;
    userId?: string;
  }): Promise<ProductFeatureWithRelations[]> {
    const conditions: any[] = [];

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(appFeatures.status, options.status));
    }
    if (options?.categoryId) {
      conditions.push(eq(appFeatures.categoryId, options.categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const features = await db
      .select({
        id: appFeatures.id,
        title: appFeatures.title,
        description: appFeatures.description,
        featureType: appFeatures.featureType,
        categoryId: appFeatures.categoryId,
        status: appFeatures.status,
        priority: appFeatures.priority,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        voteCount: appFeatures.voteCount,
        estimatedDelivery: appFeatures.estimatedDelivery,
        createdAt: appFeatures.createdAt,
        updatedAt: appFeatures.updatedAt,
        categoryName: appFeatureCategories.name,
        categoryColor: appFeatureCategories.color,
        categoryDescription: appFeatureCategories.description,
        categorySortOrder: appFeatureCategories.sortOrder,
        categoryIsActive: appFeatureCategories.isActive,
        categoryCreatedAt: appFeatureCategories.createdAt,
        categoryUpdatedAt: appFeatureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appFeatures)
      .innerJoin(appFeatureCategories, eq(appFeatures.categoryId, appFeatureCategories.id))
      .innerJoin(users, eq(appFeatures.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(appFeatures.voteCount), desc(appFeatures.createdAt));

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
        sortOrder: f.categorySortOrder,
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
        id: appFeatures.id,
        title: appFeatures.title,
        description: appFeatures.description,
        featureType: appFeatures.featureType,
        categoryId: appFeatures.categoryId,
        status: appFeatures.status,
        priority: appFeatures.priority,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        voteCount: appFeatures.voteCount,
        estimatedDelivery: appFeatures.estimatedDelivery,
        createdAt: appFeatures.createdAt,
        updatedAt: appFeatures.updatedAt,
        categoryName: appFeatureCategories.name,
        categoryColor: appFeatureCategories.color,
        categoryDescription: appFeatureCategories.description,
        categorySortOrder: appFeatureCategories.sortOrder,
        categoryIsActive: appFeatureCategories.isActive,
        categoryCreatedAt: appFeatureCategories.createdAt,
        categoryUpdatedAt: appFeatureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appFeatures)
      .innerJoin(appFeatureCategories, eq(appFeatures.categoryId, appFeatureCategories.id))
      .innerJoin(users, eq(appFeatures.createdById, users.id))
      .where(eq(appFeatures.id, id));

    if (features.length === 0) return undefined;

    const f = features[0];
    let hasVoted = false;
    if (userId) {
      const [vote] = await db
        .select()
        .from(appFeatureVotes)
        .where(and(eq(appFeatureVotes.featureId, id), eq(appFeatureVotes.userId, userId)));
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
        sortOrder: f.categorySortOrder,
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
  ): Promise<AppFeature> {
    const [feature] = await db
      .insert(appFeatures)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return feature;
  }

  async updateFeature(
    id: string,
    data: Partial<InsertAppFeature>
  ): Promise<AppFeature | undefined> {
    const [feature] = await db
      .update(appFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appFeatures.id, id))
      .returning();
    return feature;
  }

  async deleteFeature(id: string): Promise<void> {
    await db.delete(appFeatures).where(eq(appFeatures.id, id));
  }

  // Feature vote operations
  async toggleVote(
    featureId: string,
    userId: string
  ): Promise<{ voted: boolean; voteCount: number }> {
    // Check if vote exists
    const [existingVote] = await db
      .select()
      .from(appFeatureVotes)
      .where(and(eq(appFeatureVotes.featureId, featureId), eq(appFeatureVotes.userId, userId)));

    if (existingVote) {
      // Remove vote
      await db
        .delete(appFeatureVotes)
        .where(eq(appFeatureVotes.id, existingVote.id));
      
      // Decrement vote count
      await db
        .update(appFeatures)
        .set({ voteCount: sql`${appFeatures.voteCount} - 1` })
        .where(eq(appFeatures.id, featureId));
      
      const [feature] = await db
        .select({ voteCount: appFeatures.voteCount })
        .from(appFeatures)
        .where(eq(appFeatures.id, featureId));
      
      return { voted: false, voteCount: feature?.voteCount || 0 };
    } else {
      // Add vote
      await db.insert(appFeatureVotes).values({
        featureId,
        userId,
        value: 1,
      });
      
      // Increment vote count
      await db
        .update(appFeatures)
        .set({ voteCount: sql`${appFeatures.voteCount} + 1` })
        .where(eq(appFeatures.id, featureId));
      
      const [feature] = await db
        .select({ voteCount: appFeatures.voteCount })
        .from(appFeatures)
        .where(eq(appFeatures.id, featureId));
      
      return { voted: true, voteCount: feature?.voteCount || 0 };
    }
  }

  async getUserVotes(userId: string): Promise<string[]> {
    const votes = await db
      .select({ featureId: appFeatureVotes.featureId })
      .from(appFeatureVotes)
      .where(eq(appFeatureVotes.userId, userId));
    return votes.map((v) => v.featureId);
  }

  // Feature comment operations
  async getComments(featureId: string): Promise<FeatureCommentWithUser[]> {
    const comments = await db
      .select({
        id: appFeatureComments.id,
        featureId: appFeatureComments.featureId,
        userId: appFeatureComments.userId,
        body: appFeatureComments.body,
        createdAt: appFeatureComments.createdAt,
        updatedAt: appFeatureComments.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userProfileImage: users.profileImageUrl,
      })
      .from(appFeatureComments)
      .innerJoin(users, eq(appFeatureComments.userId, users.id))
      .where(eq(appFeatureComments.featureId, featureId))
      .orderBy(appFeatureComments.createdAt);

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
      .insert(appFeatureComments)
      .values({
        featureId,
        userId,
        body,
      })
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(appFeatureComments).where(eq(appFeatureComments.id, id));
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

  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return db
      .select()
      .from(vendors)
      .orderBy(vendors.businessName);
  }

  async getVendorsWithServices(): Promise<VendorWithServices[]> {
    const allVendors = await db
      .select()
      .from(vendors)
      .orderBy(vendors.businessName);

    const vendorServiceMappings = await db
      .select({
        vendorId: vendorServicesVendors.vendorId,
        service: vendorServices,
      })
      .from(vendorServicesVendors)
      .innerJoin(vendorServices, eq(vendorServicesVendors.vendorServiceId, vendorServices.id));

    const servicesByVendorId = new Map<string, VendorService[]>();
    for (const mapping of vendorServiceMappings) {
      const existing = servicesByVendorId.get(mapping.vendorId) || [];
      existing.push(mapping.service);
      servicesByVendorId.set(mapping.vendorId, existing);
    }

    return allVendors.map((vendor) => ({
      ...vendor,
      services: servicesByVendorId.get(vendor.id) || [],
    }));
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  }

  // Vendor service operations
  async getVendorServices(): Promise<VendorService[]> {
    return db
      .select()
      .from(vendorServices)
      .orderBy(vendorServices.name);
  }

  async getVendorServiceById(id: string): Promise<VendorService | undefined> {
    const [service] = await db
      .select()
      .from(vendorServices)
      .where(eq(vendorServices.id, id));
    return service;
  }
}

export const storage = new DatabaseStorage();
