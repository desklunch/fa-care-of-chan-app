import {
  users,
  auditLogs,
  appFeatureCategories,
  appFeatures,
  appFeatureVotes,
  appFeatureComments,
  appSettings,
  appIssues,
  comments,
  commentEntityTypes,
  analyticsSessions,
  analyticsPageViews,
  analyticsEvents,
  appReleases,
  appReleaseFeatures,
  appReleaseIssues,
  appReleaseChanges,
  type User,
  type UpsertUser,
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
  type AppSetting,
  type ThemeConfig,
  type AppIssue,
  type InsertAppIssue,
  type CreateAppIssue,
  type UpdateAppIssue,
  type AppIssueWithRelations,
  type IssueStatus,
  type Comment,
  type InsertComment,
  type CommentWithAuthor,
  type CreateComment,
  type UpdateComment,
  type AnalyticsSession,
  type InsertAnalyticsSession,
  type AnalyticsPageView,
  type InsertAnalyticsPageView,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type AppRelease,
  type AppReleaseFeature,
  type AppReleaseIssue,
  type AppReleaseChange,
  type AppReleaseWithDetails,
  type CreateAppRelease,
  type UpdateAppRelease,
  type CreateAppReleaseChange,
  type ReleaseStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, isNull, gt, sql, gte, lte, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

export type AuditLogWithName = AuditLog & { performerName?: string };

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  getAllEmployees(): Promise<User[]>;
  getRecentEmployees(limit?: number): Promise<User[]>;
  
  // Audit log operations
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  getRecentAuditLogs(limit?: number): Promise<AuditLogWithName[]>;
  
  // Stats
  getStats(): Promise<{
    totalEmployees: number;
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
  reorderFeatures(updates: { id: string; sortOrder: number; status?: string }[]): Promise<void>;
  
  // Feature vote operations
  toggleVote(featureId: string, userId: string): Promise<{ voted: boolean; voteCount: number }>;
  getUserVotes(userId: string): Promise<string[]>;
  
  // Feature comment operations
  getComments(featureId: string): Promise<FeatureCommentWithUser[]>;
  createComment(featureId: string, userId: string, body: string): Promise<FeatureComment>;
  deleteComment(id: string): Promise<void>;
  
  // NOTE: Contact, Vendor, Venue operations moved to domain storage files
  // See: server/domains/contacts/contacts.storage.ts
  // See: server/domains/vendors/vendors.storage.ts  
  // See: server/domains/venues/venues.storage.ts
  
  // NOTE: Amenity, Industry, Deal Service, Tag, and Brand operations moved to server/domains/reference-data/reference-data.storage.ts
  
  // App settings operations
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: unknown, updatedBy?: string): Promise<AppSetting>;
  getTheme(): Promise<ThemeConfig | null>;
  setTheme(theme: ThemeConfig, updatedBy: string): Promise<AppSetting>;
  
  // NOTE: Vendor update token operations moved to server/domains/vendors/vendors.storage.ts
  
  // App issue operations
  getIssues(options?: { status?: IssueStatus[]; severity?: string }): Promise<AppIssueWithRelations[]>;
  getIssueById(id: string): Promise<AppIssueWithRelations | undefined>;
  createIssue(data: CreateAppIssue, createdById: string): Promise<AppIssue>;
  updateIssue(id: string, data: UpdateAppIssue): Promise<AppIssue | undefined>;
  deleteIssue(id: string): Promise<void>;
  
  // NOTE: Form template, request, token, and response operations moved to server/domains/forms/forms.storage.ts
  
  // Entity comment operations (for venues, vendors, contacts, venue_collections)
  getCommentsByEntity(entityType: string, entityId: string): Promise<CommentWithAuthor[]>;
  getAllComments(options?: { entityType?: string; limit?: number }): Promise<CommentWithAuthor[]>;
  getEntityCommentById(id: string): Promise<CommentWithAuthor | undefined>;
  createEntityComment(data: CreateComment, createdById: string): Promise<Comment>;
  updateEntityComment(id: string, body: string): Promise<Comment | undefined>;
  softDeleteEntityComment(id: string): Promise<void>;
  
  // Analytics operations
  createAnalyticsSession(data: InsertAnalyticsSession): Promise<AnalyticsSession>;
  getAnalyticsSessionByToken(token: string): Promise<AnalyticsSession | undefined>;
  updateAnalyticsSessionActivity(sessionId: string): Promise<void>;
  endAnalyticsSession(sessionId: string): Promise<void>;
  createPageView(data: InsertAnalyticsPageView): Promise<AnalyticsPageView>;
  updatePageViewDuration(pageViewId: string, durationMs: number): Promise<void>;
  createAnalyticsEvent(data: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsSummary(startDate: Date, endDate: Date, environment?: string): Promise<{
    totalPageViews: number;
    uniqueUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topPages: { path: string; views: number }[];
    topEvents: { name: string; count: number }[];
    pageViewsByDay: { date: string; views: number }[];
    userJourneys: { userId: string; userName: string; paths: string[] }[];
  }>;
  getRecentPageViews(limit?: number, environment?: string): Promise<{
    id: string;
    path: string;
    title: string | null;
    viewedAt: Date;
    durationMs: number | null;
    userName: string | null;
    environment: string;
  }[]>;
  
  // App release operations
  getReleases(status?: ReleaseStatus): Promise<AppRelease[]>;
  getReleaseById(id: string): Promise<AppReleaseWithDetails | undefined>;
  createRelease(data: CreateAppRelease, createdById: string): Promise<AppRelease>;
  updateRelease(id: string, data: UpdateAppRelease): Promise<AppRelease | undefined>;
  publishRelease(id: string): Promise<AppRelease | undefined>;
  deleteRelease(id: string): Promise<void>;
  
  // Release associations
  addFeatureToRelease(releaseId: string, featureId: string, notes?: string): Promise<AppReleaseFeature>;
  removeFeatureFromRelease(releaseId: string, featureId: string): Promise<void>;
  addIssueToRelease(releaseId: string, issueId: string, notes?: string): Promise<AppReleaseIssue>;
  removeIssueFromRelease(releaseId: string, issueId: string): Promise<void>;
  addChangeToRelease(releaseId: string, data: CreateAppReleaseChange, createdById: string): Promise<AppReleaseChange>;
  removeChangeFromRelease(changeId: string): Promise<void>;
  
  // Helpers for auto-suggest
  getCompletedFeaturesNotInRelease(sinceDate?: Date): Promise<{ id: string; title: string; completedAt: Date | null }[]>;
  getFixedIssuesNotInRelease(sinceDate?: Date): Promise<{ id: string; title: string; fixedAt: Date | null }[]>;
  getLatestReleasedVersion(): Promise<AppRelease | undefined>;
  
  // NOTE: Deal status, Deal CRUD, Deal task, Client, Client-Contact link operations moved to domain storage files
  // See: server/domains/deals/deals.storage.ts
  // See: server/domains/clients/clients.storage.ts
  // See: server/domains/contacts/contacts.storage.ts
  
  // NOTE: Brand operations moved to server/domains/reference-data/reference-data.storage.ts
  // NOTE: Vendor-Contact link operations moved to server/domains/vendors/vendors.storage.ts
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

  // Stats
  async getStats(): Promise<{
    totalEmployees: number;
    recentSignups: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    const [recentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isActive, true), gt(users.createdAt, sevenDaysAgo)));

    return {
      totalEmployees: Number(employeeCount?.count) || 0,
      recentSignups: Number(recentCount?.count) || 0,
    };
  }

  // Audit log operations
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getRecentAuditLogs(limit: number = 250): Promise<AuditLogWithName[]> {
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
      .orderBy(desc(auditLogs.performedAt))
      .limit(limit);
    
    return logs.map((log) => ({
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
        categoryId: appFeatures.categoryId,
        status: appFeatures.status,
        priority: appFeatures.priority,
        sortOrder: appFeatures.sortOrder,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        voteCount: appFeatures.voteCount,
        estimatedDelivery: appFeatures.estimatedDelivery,
        completedAt: appFeatures.completedAt,
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
      .orderBy(appFeatures.sortOrder, desc(appFeatures.voteCount), desc(appFeatures.createdAt));

    // Get user votes if userId provided
    let userVotes: string[] = [];
    if (options?.userId) {
      userVotes = await this.getUserVotes(options.userId);
    }

    return features.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      categoryId: f.categoryId,
      status: f.status,
      priority: f.priority,
      sortOrder: f.sortOrder,
      createdById: f.createdById,
      ownerId: f.ownerId,
      voteCount: f.voteCount,
      estimatedDelivery: f.estimatedDelivery,
      completedAt: f.completedAt,
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
        categoryId: appFeatures.categoryId,
        status: appFeatures.status,
        priority: appFeatures.priority,
        sortOrder: appFeatures.sortOrder,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        voteCount: appFeatures.voteCount,
        estimatedDelivery: appFeatures.estimatedDelivery,
        completedAt: appFeatures.completedAt,
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
      categoryId: f.categoryId,
      status: f.status,
      priority: f.priority,
      sortOrder: f.sortOrder,
      createdById: f.createdById,
      ownerId: f.ownerId,
      voteCount: f.voteCount,
      estimatedDelivery: f.estimatedDelivery,
      completedAt: f.completedAt,
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

  async reorderFeatures(updates: { id: string; sortOrder: number; status?: string }[]): Promise<void> {
    await Promise.all(
      updates.map((update) =>
        db
          .update(appFeatures)
          .set({ 
            sortOrder: update.sortOrder, 
            ...(update.status && { status: update.status }),
            updatedAt: new Date() 
          })
          .where(eq(appFeatures.id, update.id))
      )
    );
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


  // NOTE: Contact operations moved to server/domains/contacts/contacts.storage.ts
  // NOTE: Vendor operations moved to server/domains/vendors/vendors.storage.ts
  // NOTE: Venue operations moved to server/domains/venues/venues.storage.ts
  // NOTE: Amenity, Industry, Deal Service, Tag operations moved to server/domains/reference-data/reference-data.storage.ts
  
  // App settings operations
  async getSetting(key: string): Promise<AppSetting | undefined> {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));
    return setting;
  }
  
  async setSetting(key: string, value: unknown, updatedBy?: string): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(appSettings)
        .set({
          value,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(appSettings)
        .values({
          key,
          value,
          updatedBy,
        })
        .returning();
      return created;
    }
  }
  
  async getTheme(): Promise<ThemeConfig | null> {
    const setting = await this.getSetting("theme");
    if (!setting) return null;
    return setting.value as ThemeConfig;
  }
  
  async setTheme(theme: ThemeConfig, updatedBy: string): Promise<AppSetting> {
    return this.setSetting("theme", theme, updatedBy);
  }
  
  // App issue operations
  async getIssues(options?: { status?: IssueStatus[]; severity?: string }): Promise<AppIssueWithRelations[]> {
    const conditions: any[] = [];

    if (options?.status && options.status.length > 0) {
      conditions.push(inArray(appIssues.status, options.status));
    }
    if (options?.severity) {
      conditions.push(eq(appIssues.severity, options.severity));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const issues = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        description: appIssues.description,
        severity: appIssues.severity,
        status: appIssues.status,
        createdById: appIssues.createdById,
        fixedAt: appIssues.fixedAt,
        createdAt: appIssues.createdAt,
        updatedAt: appIssues.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appIssues)
      .innerJoin(users, eq(appIssues.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(appIssues.createdAt));

    return issues.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      createdById: i.createdById,
      fixedAt: i.fixedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      createdBy: {
        id: i.createdById,
        firstName: i.createdByFirstName,
        lastName: i.createdByLastName,
        profileImageUrl: i.createdByProfileImage,
      },
    }));
  }

  async getIssueById(id: string): Promise<AppIssueWithRelations | undefined> {
    const issues = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        description: appIssues.description,
        severity: appIssues.severity,
        status: appIssues.status,
        createdById: appIssues.createdById,
        fixedAt: appIssues.fixedAt,
        createdAt: appIssues.createdAt,
        updatedAt: appIssues.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appIssues)
      .innerJoin(users, eq(appIssues.createdById, users.id))
      .where(eq(appIssues.id, id));

    if (issues.length === 0) return undefined;

    const i = issues[0];
    return {
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      createdById: i.createdById,
      fixedAt: i.fixedAt,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      createdBy: {
        id: i.createdById,
        firstName: i.createdByFirstName,
        lastName: i.createdByLastName,
        profileImageUrl: i.createdByProfileImage,
      },
    };
  }

  async createIssue(data: CreateAppIssue, createdById: string): Promise<AppIssue> {
    const [issue] = await db
      .insert(appIssues)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return issue;
  }

  async updateIssue(id: string, data: UpdateAppIssue): Promise<AppIssue | undefined> {
    const [issue] = await db
      .update(appIssues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appIssues.id, id))
      .returning();
    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    await db.delete(appIssues).where(eq(appIssues.id, id));
  }

  // NOTE: Form operations moved to server/domains/forms/forms.storage.ts
  // NOTE: Vendor update token operations moved to server/domains/vendors/vendors.storage.ts

  // Comment operations
  async getCommentsByEntity(entityType: string, entityId: string): Promise<CommentWithAuthor[]> {
    const allComments = await db
      .select({
        id: comments.id,
        body: comments.body,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .where(
        and(
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      )
      .orderBy(desc(comments.createdAt));

    // Group comments with replies (single level only)
    const topLevelComments = allComments.filter(c => !c.parentId);
    const replies = allComments.filter(c => c.parentId);

    return topLevelComments.map(comment => ({
      ...comment,
      replies: replies
        .filter(r => r.parentId === comment.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }

  async getAllComments(options?: { entityType?: string; limit?: number }): Promise<CommentWithAuthor[]> {
    let query = db
      .select({
        id: comments.id,
        body: comments.body,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .orderBy(desc(comments.createdAt));

    if (options?.entityType) {
      query = query.where(eq(comments.entityType, options.entityType)) as typeof query;
    }

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const results = await query;

    // Fetch entity names for each comment
    const commentsWithNames = await Promise.all(
      results.map(async (comment) => {
        let entityName: string | null = null;
        
        try {
          switch (comment.entityType) {
            case "venue": {
              const [venue] = await db.select({ name: venues.name }).from(venues).where(eq(venues.id, comment.entityId));
              entityName = venue?.name || null;
              break;
            }
            case "vendor": {
              const [vendor] = await db.select({ name: vendors.businessName }).from(vendors).where(eq(vendors.id, comment.entityId));
              entityName = vendor?.name || null;
              break;
            }
            case "contact": {
              const [contact] = await db.select({ firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(eq(contacts.id, comment.entityId));
              entityName = contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() : null;
              break;
            }
            case "venue_collection": {
              const [collection] = await db.select({ name: venueCollections.name }).from(venueCollections).where(eq(venueCollections.id, comment.entityId));
              entityName = collection?.name || null;
              break;
            }
          }
        } catch (e) {
          // Entity may have been deleted
          entityName = null;
        }
        
        return { ...comment, entityName };
      })
    );

    return commentsWithNames;
  }

  async getEntityCommentById(id: string): Promise<CommentWithAuthor | undefined> {
    const [comment] = await db
      .select({
        id: comments.id,
        body: comments.body,
        entityType: comments.entityType,
        entityId: comments.entityId,
        parentId: comments.parentId,
        createdById: comments.createdById,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdById, users.id))
      .where(eq(comments.id, id));

    return comment || undefined;
  }

  async createEntityComment(data: CreateComment, createdById: string): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return comment;
  }

  async updateEntityComment(id: string, body: string): Promise<Comment | undefined> {
    const [comment] = await db
      .update(comments)
      .set({ body, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment || undefined;
  }

  async softDeleteEntityComment(id: string): Promise<void> {
    await db
      .update(comments)
      .set({ deletedAt: new Date(), body: "" })
      .where(eq(comments.id, id));
  }

  // Analytics operations
  async createAnalyticsSession(data: InsertAnalyticsSession): Promise<AnalyticsSession> {
    const [session] = await db
      .insert(analyticsSessions)
      .values(data)
      .returning();
    return session;
  }

  async getAnalyticsSessionByToken(token: string): Promise<AnalyticsSession | undefined> {
    const [session] = await db
      .select()
      .from(analyticsSessions)
      .where(eq(analyticsSessions.sessionToken, token));
    return session;
  }

  async updateAnalyticsSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(analyticsSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(analyticsSessions.id, sessionId));
  }

  async endAnalyticsSession(sessionId: string): Promise<void> {
    await db
      .update(analyticsSessions)
      .set({ endedAt: new Date() })
      .where(eq(analyticsSessions.id, sessionId));
  }

  async createPageView(data: InsertAnalyticsPageView): Promise<AnalyticsPageView> {
    const [pageView] = await db
      .insert(analyticsPageViews)
      .values(data)
      .returning();
    return pageView;
  }

  async updatePageViewDuration(pageViewId: string, durationMs: number): Promise<void> {
    await db
      .update(analyticsPageViews)
      .set({ durationMs })
      .where(eq(analyticsPageViews.id, pageViewId));
  }

  async createAnalyticsEvent(data: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [event] = await db
      .insert(analyticsEvents)
      .values(data)
      .returning();
    return event;
  }

  async getAnalyticsSummary(startDate: Date, endDate: Date, environment?: string): Promise<{
    totalPageViews: number;
    uniqueUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    topPages: { path: string; views: number }[];
    topEvents: { name: string; count: number }[];
    pageViewsByDay: { date: string; views: number }[];
    userJourneys: { userId: string; userName: string; paths: string[] }[];
  }> {
    // Build environment filter conditions
    const pageViewEnvFilter = environment 
      ? eq(analyticsPageViews.environment, environment)
      : undefined;
    const sessionEnvFilter = environment
      ? eq(analyticsSessions.environment, environment)
      : undefined;
    const eventEnvFilter = environment
      ? eq(analyticsEvents.environment, environment)
      : undefined;

    // Total page views
    const pageViewsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyticsPageViews)
      .where(and(
        gte(analyticsPageViews.viewedAt, startDate),
        lte(analyticsPageViews.viewedAt, endDate),
        pageViewEnvFilter
      ));
    const totalPageViews = pageViewsResult[0]?.count || 0;

    // Unique users (from page views)
    const uniqueUsersResult = await db
      .select({ count: sql<number>`count(distinct user_id)::int` })
      .from(analyticsPageViews)
      .where(and(
        gte(analyticsPageViews.viewedAt, startDate),
        lte(analyticsPageViews.viewedAt, endDate),
        pageViewEnvFilter
      ));
    const uniqueUsers = uniqueUsersResult[0]?.count || 0;

    // Total sessions
    const sessionsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analyticsSessions)
      .where(and(
        gte(analyticsSessions.startedAt, startDate),
        lte(analyticsSessions.startedAt, endDate),
        sessionEnvFilter
      ));
    const totalSessions = sessionsResult[0]?.count || 0;

    // Average session duration (in minutes)
    const avgDurationResult = await db
      .select({ 
        avgDuration: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ended_at, last_activity_at) - started_at)) / 60), 0)::float` 
      })
      .from(analyticsSessions)
      .where(and(
        gte(analyticsSessions.startedAt, startDate),
        lte(analyticsSessions.startedAt, endDate),
        sessionEnvFilter
      ));
    const avgSessionDuration = Math.round((avgDurationResult[0]?.avgDuration || 0) * 10) / 10;

    // Top pages
    const topPagesResult = await db
      .select({
        path: analyticsPageViews.path,
        views: sql<number>`count(*)::int`,
      })
      .from(analyticsPageViews)
      .where(and(
        gte(analyticsPageViews.viewedAt, startDate),
        lte(analyticsPageViews.viewedAt, endDate),
        pageViewEnvFilter
      ))
      .groupBy(analyticsPageViews.path)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Top events
    const topEventsResult = await db
      .select({
        name: analyticsEvents.eventName,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(and(
        gte(analyticsEvents.occurredAt, startDate),
        lte(analyticsEvents.occurredAt, endDate),
        eventEnvFilter
      ))
      .groupBy(analyticsEvents.eventName)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Page views by day
    const pageViewsByDayResult = await db
      .select({
        date: sql<string>`TO_CHAR(viewed_at, 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
      })
      .from(analyticsPageViews)
      .where(and(
        gte(analyticsPageViews.viewedAt, startDate),
        lte(analyticsPageViews.viewedAt, endDate),
        pageViewEnvFilter
      ))
      .groupBy(sql`TO_CHAR(viewed_at, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(viewed_at, 'YYYY-MM-DD')`);

    // User journeys (recent page sequences per user)
    const journeysResult = await db
      .select({
        userId: analyticsPageViews.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        paths: sql<string[]>`array_agg(path ORDER BY viewed_at)`,
      })
      .from(analyticsPageViews)
      .leftJoin(users, eq(analyticsPageViews.userId, users.id))
      .where(and(
        gte(analyticsPageViews.viewedAt, startDate),
        lte(analyticsPageViews.viewedAt, endDate),
        pageViewEnvFilter,
        sql`${analyticsPageViews.userId} IS NOT NULL`
      ))
      .groupBy(analyticsPageViews.userId, users.firstName, users.lastName)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalPageViews,
      uniqueUsers,
      totalSessions,
      avgSessionDuration,
      topPages: topPagesResult.map(r => ({ path: r.path, views: r.views })),
      topEvents: topEventsResult.map(r => ({ name: r.name, count: r.count })),
      pageViewsByDay: pageViewsByDayResult.map(r => ({ date: r.date, views: r.views })),
      userJourneys: journeysResult
        .filter(r => r.userId)
        .map(r => ({
          userId: r.userId!,
          userName: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Unknown",
          paths: r.paths || [],
        })),
    };
  }

  async getRecentPageViews(limit: number = 50, environment?: string): Promise<{
    id: string;
    path: string;
    title: string | null;
    viewedAt: Date;
    durationMs: number | null;
    userName: string | null;
    environment: string;
  }[]> {
    const envCondition = environment && environment !== "all"
      ? eq(analyticsPageViews.environment, environment)
      : undefined;
    
    const results = await db
      .select({
        id: analyticsPageViews.id,
        path: analyticsPageViews.path,
        title: analyticsPageViews.title,
        viewedAt: analyticsPageViews.viewedAt,
        durationMs: analyticsPageViews.durationMs,
        firstName: users.firstName,
        lastName: users.lastName,
        environment: analyticsPageViews.environment,
      })
      .from(analyticsPageViews)
      .leftJoin(users, eq(analyticsPageViews.userId, users.id))
      .where(envCondition)
      .orderBy(desc(analyticsPageViews.viewedAt))
      .limit(limit);
    
    return results.map(r => ({
      id: r.id,
      path: r.path,
      title: r.title,
      viewedAt: r.viewedAt,
      durationMs: r.durationMs,
      userName: r.firstName ? `${r.firstName} ${r.lastName ? r.lastName.charAt(0) + '.' : ''}`.trim() : null,
      environment: r.environment,
    }));
  }

  // ==========================================
  // APP RELEASE STORAGE METHODS
  // ==========================================

  async getReleases(status?: ReleaseStatus): Promise<AppRelease[]> {
    const condition = status ? eq(appReleases.status, status) : undefined;
    return await db
      .select()
      .from(appReleases)
      .where(condition)
      .orderBy(desc(appReleases.releaseDate), desc(appReleases.createdAt));
  }

  async getReleaseById(id: string): Promise<AppReleaseWithDetails | undefined> {
    const [release] = await db
      .select()
      .from(appReleases)
      .where(eq(appReleases.id, id));

    if (!release) return undefined;

    // Get creator
    const [creator] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, release.createdById));

    // Get features
    const featuresResult = await db
      .select({
        id: appReleaseFeatures.id,
        releaseId: appReleaseFeatures.releaseId,
        featureId: appReleaseFeatures.featureId,
        notes: appReleaseFeatures.notes,
        createdAt: appReleaseFeatures.createdAt,
        featureTitle: appFeatures.title,
        featureStatus: appFeatures.status,
      })
      .from(appReleaseFeatures)
      .innerJoin(appFeatures, eq(appReleaseFeatures.featureId, appFeatures.id))
      .where(eq(appReleaseFeatures.releaseId, id));

    // Get issues
    const issuesResult = await db
      .select({
        id: appReleaseIssues.id,
        releaseId: appReleaseIssues.releaseId,
        issueId: appReleaseIssues.issueId,
        notes: appReleaseIssues.notes,
        createdAt: appReleaseIssues.createdAt,
        issueTitle: appIssues.title,
        issueSeverity: appIssues.severity,
        issueStatus: appIssues.status,
      })
      .from(appReleaseIssues)
      .innerJoin(appIssues, eq(appReleaseIssues.issueId, appIssues.id))
      .where(eq(appReleaseIssues.releaseId, id));

    // Get changes
    const changesResult = await db
      .select({
        id: appReleaseChanges.id,
        releaseId: appReleaseChanges.releaseId,
        changeType: appReleaseChanges.changeType,
        title: appReleaseChanges.title,
        description: appReleaseChanges.description,
        createdById: appReleaseChanges.createdById,
        createdAt: appReleaseChanges.createdAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(appReleaseChanges)
      .innerJoin(users, eq(appReleaseChanges.createdById, users.id))
      .where(eq(appReleaseChanges.releaseId, id));

    return {
      ...release,
      createdBy: {
        id: creator.id,
        firstName: creator.firstName,
        lastName: creator.lastName,
      },
      features: featuresResult.map(f => ({
        id: f.id,
        releaseId: f.releaseId,
        featureId: f.featureId,
        notes: f.notes,
        createdAt: f.createdAt,
        feature: {
          id: f.featureId,
          title: f.featureTitle,
          status: f.featureStatus,
        },
      })),
      issues: issuesResult.map(i => ({
        id: i.id,
        releaseId: i.releaseId,
        issueId: i.issueId,
        notes: i.notes,
        createdAt: i.createdAt,
        issue: {
          id: i.issueId,
          title: i.issueTitle,
          severity: i.issueSeverity,
          status: i.issueStatus,
        },
      })),
      changes: changesResult.map(c => ({
        id: c.id,
        releaseId: c.releaseId,
        changeType: c.changeType,
        title: c.title,
        description: c.description,
        createdById: c.createdById,
        createdAt: c.createdAt,
        createdBy: {
          id: c.createdById,
          firstName: c.createdByFirstName,
          lastName: c.createdByLastName,
        },
      })),
    };
  }

  async createRelease(data: CreateAppRelease, createdById: string): Promise<AppRelease> {
    const [release] = await db
      .insert(appReleases)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return release;
  }

  async updateRelease(id: string, data: UpdateAppRelease): Promise<AppRelease | undefined> {
    const [release] = await db
      .update(appReleases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appReleases.id, id))
      .returning();
    return release;
  }

  async publishRelease(id: string): Promise<AppRelease | undefined> {
    const [release] = await db
      .update(appReleases)
      .set({
        status: "released",
        releaseDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appReleases.id, id))
      .returning();
    return release;
  }

  async deleteRelease(id: string): Promise<void> {
    await db.delete(appReleases).where(eq(appReleases.id, id));
  }

  // Release associations
  async addFeatureToRelease(releaseId: string, featureId: string, notes?: string): Promise<AppReleaseFeature> {
    const [feature] = await db
      .insert(appReleaseFeatures)
      .values({ releaseId, featureId, notes })
      .returning();
    return feature;
  }

  async removeFeatureFromRelease(releaseId: string, featureId: string): Promise<void> {
    await db
      .delete(appReleaseFeatures)
      .where(and(
        eq(appReleaseFeatures.releaseId, releaseId),
        eq(appReleaseFeatures.featureId, featureId)
      ));
  }

  async addIssueToRelease(releaseId: string, issueId: string, notes?: string): Promise<AppReleaseIssue> {
    const [issue] = await db
      .insert(appReleaseIssues)
      .values({ releaseId, issueId, notes })
      .returning();
    return issue;
  }

  async removeIssueFromRelease(releaseId: string, issueId: string): Promise<void> {
    await db
      .delete(appReleaseIssues)
      .where(and(
        eq(appReleaseIssues.releaseId, releaseId),
        eq(appReleaseIssues.issueId, issueId)
      ));
  }

  async addChangeToRelease(releaseId: string, data: CreateAppReleaseChange, createdById: string): Promise<AppReleaseChange> {
    const [change] = await db
      .insert(appReleaseChanges)
      .values({
        ...data,
        releaseId,
        createdById,
      })
      .returning();
    return change;
  }

  async removeChangeFromRelease(changeId: string): Promise<void> {
    await db.delete(appReleaseChanges).where(eq(appReleaseChanges.id, changeId));
  }

  // Helpers for auto-suggest
  async getCompletedFeaturesNotInRelease(sinceDate?: Date): Promise<{ id: string; title: string; completedAt: Date | null }[]> {
    // Get all feature IDs already in any release
    const releasedFeatureIds = await db
      .select({ featureId: appReleaseFeatures.featureId })
      .from(appReleaseFeatures);
    
    const excludeIds = releasedFeatureIds.map(r => r.featureId);
    
    let condition = eq(appFeatures.status, "completed");
    if (sinceDate) {
      condition = and(condition, gte(appFeatures.completedAt, sinceDate)) as any;
    }
    
    const features = await db
      .select({
        id: appFeatures.id,
        title: appFeatures.title,
        completedAt: appFeatures.completedAt,
      })
      .from(appFeatures)
      .where(condition)
      .orderBy(desc(appFeatures.completedAt));
    
    return features.filter(f => !excludeIds.includes(f.id));
  }

  async getFixedIssuesNotInRelease(sinceDate?: Date): Promise<{ id: string; title: string; fixedAt: Date | null }[]> {
    // Get all issue IDs already in any release
    const releasedIssueIds = await db
      .select({ issueId: appReleaseIssues.issueId })
      .from(appReleaseIssues);
    
    const excludeIds = releasedIssueIds.map(r => r.issueId);
    
    let condition = inArray(appIssues.status, ["fixed", "closed"]);
    if (sinceDate) {
      condition = and(condition, gte(appIssues.fixedAt, sinceDate)) as any;
    }
    
    const issues = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        fixedAt: appIssues.fixedAt,
      })
      .from(appIssues)
      .where(condition)
      .orderBy(desc(appIssues.fixedAt));
    
    return issues.filter(i => !excludeIds.includes(i.id));
  }

  async getLatestReleasedVersion(): Promise<AppRelease | undefined> {
    const [release] = await db
      .select()
      .from(appReleases)
      .where(eq(appReleases.status, "released"))
      .orderBy(desc(appReleases.releaseDate))
      .limit(1);
    return release;
  }

  // NOTE: Deal status, Deal CRUD, Deal task, Client, Client-Contact link, and Brand operations
  // have been moved to their respective domain storage files.
  // See: server/domains/deals/deals.storage.ts
  // See: server/domains/clients/clients.storage.ts
  // See: server/domains/contacts/contacts.storage.ts
  // See: server/domains/reference-data/reference-data.storage.ts

  // ---- REMOVED METHODS (kept as reference comments) ----
  // getDealStatuses, getDealStatusByName, getDealStatusById, updateDealStatus → dealsStorage
  // getDeals, getDealById, getDealsByClientId, getDealsByPrimaryContactId → dealsStorage
  // createDeal, updateDeal, deleteDeal, reorderDeals → dealsStorage
  // getDealTaskById, getDealTasks, createDealTask, updateDealTask, deleteDealTask → dealsStorage
  // getClients, getClientById, createClient, updateClient, deleteClient → clientsStorage
  // getContactsForClient, getClientsForContact, linkClientContact, unlinkClientContact → contactsStorage
  // getBrands, getBrandById, createBrand, updateBrand, deleteBrand → referenceDataStorage
}

export const storage = new DatabaseStorage();
