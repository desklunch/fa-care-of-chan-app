import {
  users,
  auditLogs,
  appFeatureCategories,
  appFeatures,
  appFeatureVotes,
  appFeatureComments,
  contacts,
  vendors,
  venues,
  amenities,
  venueAmenities,
  industries,
  tags,
  venueTags,
  venueFiles,
  venuePhotos,
  venueCollections,
  venueCollectionVenues,
  vendorServices,
  vendorServicesVendors,
  vendorsContacts,
  vendorUpdateTokens,
  appSettings,
  appIssues,
  formTemplates,
  formRequests,
  outreachTokens,
  formResponses,
  comments,
  deals,
  dealServices,
  type DealService,
  type InsertDealService,
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
  type Contact,
  type CreateContact,
  type UpdateContact,
  type Vendor,
  type VendorService,
  type VendorWithServices,
  type VendorWithRelations,
  type ContactWithRelations,
  type Venue,
  type CreateVenue,
  type UpdateVenue,
  type VenueWithRelations,
  type VenueGridRow,
  type AmenitySummary,
  type TagSummary,
  type VenueSpace,
  type VenueFile,
  type VenueFileWithUploader,
  type CreateVenueFile,
  type UpdateVenueFile,
  type VenuePhoto,
  type CreateVenuePhoto,
  type UpdateVenuePhoto,
  type Amenity,
  type CreateAmenity,
  type UpdateAmenity,
  type Industry,
  type CreateIndustry,
  type UpdateIndustry,
  type Tag,
  type CreateTag,
  type UpdateTag,
  type CreateVendorService,
  type UpdateVendorService,
  type CreateVendor,
  type UpdateVendor,
  type VendorUpdateToken,
  type VendorUpdateTokenWithRelations,
  type AppSetting,
  type ThemeConfig,
  type AppIssue,
  type InsertAppIssue,
  type CreateAppIssue,
  type UpdateAppIssue,
  type AppIssueWithRelations,
  type IssueStatus,
  type FormTemplate,
  type InsertFormTemplate,
  type CreateFormTemplate,
  type UpdateFormTemplate,
  type FormTemplateWithRelations,
  type FormRequest,
  type InsertFormRequest,
  type CreateFormRequest,
  type UpdateFormRequest,
  type FormRequestWithRelations,
  type OutreachToken,
  type InsertOutreachToken,
  type OutreachTokenWithRecipient,
  type FormResponse,
  type InsertFormResponse,
  type CreateFormResponse,
  type RecipientType,
  type PublicFormData,
  type FormSection,
  type VenueCollection,
  type CreateVenueCollection,
  type UpdateVenueCollection,
  type VenueCollectionWithCreator,
  type VenueCollectionWithVenues,
  type Comment,
  type InsertComment,
  type CommentWithAuthor,
  type CreateComment,
  type UpdateComment,
  commentEntityTypes,
  analyticsSessions,
  analyticsPageViews,
  analyticsEvents,
  type AnalyticsSession,
  type InsertAnalyticsSession,
  type AnalyticsPageView,
  type InsertAnalyticsPageView,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  appReleases,
  appReleaseFeatures,
  appReleaseIssues,
  appReleaseChanges,
  type AppRelease,
  type AppReleaseFeature,
  type AppReleaseIssue,
  type AppReleaseChange,
  type AppReleaseWithDetails,
  type CreateAppRelease,
  type UpdateAppRelease,
  type CreateAppReleaseChange,
  type ReleaseStatus,
  type Deal,
  type DealWithRelations,
  type CreateDeal,
  type UpdateDeal,
  type DealStatus,
  type DealEvent,
  dealStatuses,
  dealTasks,
  computeEarliestEventDate,
  type DealTask,
  type DealTaskWithRelations,
  type CreateDealTask,
  clients,
  clientContacts,
  type Client,
  type CreateClient,
  type UpdateClient,
  brands,
  type Brand,
  type CreateBrand,
  type UpdateBrand,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, isNull, gt, sql, gte, lte, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
  
  // Amenity operations
  getAmenities(): Promise<Amenity[]>;
  getAmenityById(id: string): Promise<Amenity | undefined>;
  createAmenity(data: CreateAmenity): Promise<Amenity>;
  updateAmenity(id: string, data: UpdateAmenity): Promise<Amenity | undefined>;
  deleteAmenity(id: string): Promise<void>;
  
  // Industry operations
  getIndustries(): Promise<Industry[]>;
  getIndustryById(id: string): Promise<Industry | undefined>;
  createIndustry(data: CreateIndustry): Promise<Industry>;
  updateIndustry(id: string, data: UpdateIndustry): Promise<Industry | undefined>;
  deleteIndustry(id: string): Promise<void>;
  
  // Deal service operations
  getDealServices(): Promise<DealService[]>;
  getDealServiceById(id: number): Promise<DealService | undefined>;
  createDealService(data: InsertDealService): Promise<DealService>;
  updateDealService(id: number, data: Partial<InsertDealService>): Promise<DealService | undefined>;
  deleteDealService(id: number): Promise<void>;
  
  // Tag operations
  getTags(category?: string): Promise<Tag[]>;
  getTagById(id: string): Promise<Tag | undefined>;
  createTag(data: CreateTag): Promise<Tag>;
  updateTag(id: string, data: UpdateTag): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<void>;
  
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
  
  // Deal operations
  getDeals(options?: { status?: DealStatus[] }): Promise<DealWithRelations[]>;
  getDealById(id: string): Promise<DealWithRelations | undefined>;
  getDealsByClientId(clientId: string): Promise<DealWithRelations[]>;
  getDealsByPrimaryContactId(contactId: string): Promise<DealWithRelations[]>;
  createDeal(data: CreateDeal, createdById: string): Promise<Deal>;
  updateDeal(id: string, data: UpdateDeal): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<void>;
  reorderDeals(orderedDealIds: string[]): Promise<void>;
  
  // Deal task operations
  getDealTasks(dealId: string): Promise<DealTaskWithRelations[]>;
  getDealTaskById(id: string): Promise<DealTask | undefined>;
  createDealTask(data: CreateDealTask, createdById: string): Promise<DealTask>;
  updateDealTask(id: string, data: { completed?: boolean; assignedUserId?: string | null; dueDate?: string | null; title?: string }): Promise<DealTask | undefined>;
  deleteDealTask(id: string): Promise<void>;
  
  // Client operations
  getClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | undefined>;
  createClient(data: CreateClient): Promise<Client>;
  updateClient(id: string, data: UpdateClient): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  
  // Client-Contact link operations
  getContactsForClient(clientId: string): Promise<Contact[]>;
  getClientsForContact(contactId: string): Promise<Client[]>;
  linkClientContact(clientId: string, contactId: string): Promise<void>;
  unlinkClientContact(clientId: string, contactId: string): Promise<void>;
  
  // NOTE: Vendor-Contact link operations moved to server/domains/vendors/vendors.storage.ts
  
  // Brand operations
  getBrands(): Promise<Brand[]>;
  getBrandById(id: string): Promise<Brand | undefined>;
  createBrand(data: CreateBrand): Promise<Brand>;
  updateBrand(id: string, data: UpdateBrand): Promise<Brand | undefined>;
  deleteBrand(id: string): Promise<void>;
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
        featureType: appFeatures.featureType,
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
      featureType: f.featureType,
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
        featureType: appFeatures.featureType,
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
      featureType: f.featureType,
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

  // Amenity operations
  async getAmenities(): Promise<Amenity[]> {
    return db.select().from(amenities).orderBy(amenities.name);
  }
  
  async getAmenityById(id: string): Promise<Amenity | undefined> {
    const [amenity] = await db.select().from(amenities).where(eq(amenities.id, id));
    return amenity;
  }
  
  async createAmenity(data: CreateAmenity): Promise<Amenity> {
    const [amenity] = await db
      .insert(amenities)
      .values({
        name: data.name,
        description: data.description,
        icon: data.icon,
      })
      .returning();
    return amenity;
  }
  
  async updateAmenity(id: string, data: UpdateAmenity): Promise<Amenity | undefined> {
    const [amenity] = await db
      .update(amenities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(amenities.id, id))
      .returning();
    return amenity;
  }
  
  async deleteAmenity(id: string): Promise<void> {
    await db.delete(amenities).where(eq(amenities.id, id));
  }
  
  // Industry operations
  async getIndustries(): Promise<Industry[]> {
    return db.select().from(industries).orderBy(industries.name);
  }
  
  async getIndustryById(id: string): Promise<Industry | undefined> {
    const [industry] = await db.select().from(industries).where(eq(industries.id, id));
    return industry;
  }
  
  async createIndustry(data: CreateIndustry): Promise<Industry> {
    const [industry] = await db
      .insert(industries)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning();
    return industry;
  }
  
  async updateIndustry(id: string, data: UpdateIndustry): Promise<Industry | undefined> {
    const [industry] = await db
      .update(industries)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(industries.id, id))
      .returning();
    return industry;
  }
  
  async deleteIndustry(id: string): Promise<void> {
    await db.delete(industries).where(eq(industries.id, id));
  }
  
  // Deal service operations
  async getDealServices(): Promise<DealService[]> {
    return db.select().from(dealServices).orderBy(dealServices.sortOrder, dealServices.name);
  }
  
  async getDealServiceById(id: number): Promise<DealService | undefined> {
    const [service] = await db.select().from(dealServices).where(eq(dealServices.id, id));
    return service;
  }
  
  async createDealService(data: InsertDealService): Promise<DealService> {
    const [service] = await db
      .insert(dealServices)
      .values({
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return service;
  }
  
  async updateDealService(id: number, data: Partial<InsertDealService>): Promise<DealService | undefined> {
    const [service] = await db
      .update(dealServices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(dealServices.id, id))
      .returning();
    return service;
  }
  
  async deleteDealService(id: number): Promise<void> {
    await db.delete(dealServices).where(eq(dealServices.id, id));
  }
  
  // Tag operations
  async getTags(category?: string): Promise<Tag[]> {
    if (category) {
      return db.select().from(tags).where(eq(tags.category, category)).orderBy(tags.name);
    }
    return db.select().from(tags).orderBy(tags.category, tags.name);
  }
  
  async getTagById(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }
  
  async createTag(data: CreateTag): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values({
        name: data.name,
        category: data.category,
      })
      .returning();
    return tag;
  }
  
  async updateTag(id: string, data: UpdateTag): Promise<Tag | undefined> {
    const [tag] = await db
      .update(tags)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, id))
      .returning();
    return tag;
  }
  
  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }
  
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
        featureType: appFeatures.featureType,
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
          featureType: f.featureType,
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

  // Deal operations
  // Note: eventSchedule is excluded from list view as it's only needed for deal editing
  async getDeals(options?: { status?: DealStatus[] }): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    let query = db
      .select({
        id: deals.id,
        externalId: deals.externalId,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        clientId: deals.clientId,
        brandId: deals.brandId,
        budgetHigh: deals.budgetHigh,
        budgetLow: deals.budgetLow,
        budgetNotes: deals.budgetNotes,
        startedOn: deals.startedOn,
        wonOn: deals.wonOn,
        lastContactOn: deals.lastContactOn,
        proposalSentOn: deals.proposalSentOn,
        projectDate: deals.projectDate,
        locations: deals.locations,
        serviceIds: deals.serviceIds,
        locationsText: deals.locationsText,
        concept: deals.concept,
        notes: deals.notes,
        ownerId: deals.ownerId,
        industryId: deals.industryId,
        createdById: deals.createdById,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        earliestEventDate: deals.earliestEventDate,
        sortOrder: deals.sortOrder,
        primaryContactId: deals.primaryContactId,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        brand: {
          id: brands.id,
          name: brands.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
        primaryContact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          emailAddresses: contacts.emailAddresses,
          phoneNumbers: contacts.phoneNumbers,
          jobTitle: contacts.jobTitle,
        },
      })
      .from(deals)
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id));

    if (options?.status && options.status.length > 0) {
      query = query.where(inArray(deals.status, options.status)) as any;
    }

    const results = await query.orderBy(desc(deals.sortOrder), desc(deals.dealNumber));
    return results as DealWithRelations[];
  }

  async getDealById(id: string): Promise<DealWithRelations | undefined> {
    const ownerUsers = alias(users, "owner_users");
    const [result] = await db
      .select({
        id: deals.id,
        externalId: deals.externalId,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        clientId: deals.clientId,
        brandId: deals.brandId,
        primaryContactId: deals.primaryContactId,
        budgetHigh: deals.budgetHigh,
        budgetLow: deals.budgetLow,
        budgetNotes: deals.budgetNotes,
        startedOn: deals.startedOn,
        wonOn: deals.wonOn,
        lastContactOn: deals.lastContactOn,
        proposalSentOn: deals.proposalSentOn,
        projectDate: deals.projectDate,
        earliestEventDate: deals.earliestEventDate,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        locationsText: deals.locationsText,
        concept: deals.concept,
        notes: deals.notes,
        ownerId: deals.ownerId,
        industryId: deals.industryId,
        createdById: deals.createdById,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        sortOrder: deals.sortOrder,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        brand: {
          id: brands.id,
          name: brands.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
        primaryContact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          emailAddresses: contacts.emailAddresses,
          phoneNumbers: contacts.phoneNumbers,
          jobTitle: contacts.jobTitle,
        },
      })
      .from(deals)
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.id, id));
    return result as DealWithRelations | undefined;
  }

  async getDealsByClientId(clientId: string): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        externalId: deals.externalId,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        clientId: deals.clientId,
        brandId: deals.brandId,
        primaryContactId: deals.primaryContactId,
        budgetHigh: deals.budgetHigh,
        budgetLow: deals.budgetLow,
        budgetNotes: deals.budgetNotes,
        startedOn: deals.startedOn,
        wonOn: deals.wonOn,
        lastContactOn: deals.lastContactOn,
        proposalSentOn: deals.proposalSentOn,
        projectDate: deals.projectDate,
        earliestEventDate: deals.earliestEventDate,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        locationsText: deals.locationsText,
        concept: deals.concept,
        notes: deals.notes,
        ownerId: deals.ownerId,
        industryId: deals.industryId,
        createdById: deals.createdById,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        sortOrder: deals.sortOrder,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        brand: {
          id: brands.id,
          name: brands.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(deals)
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .where(eq(deals.clientId, clientId))
      .orderBy(desc(deals.createdAt));
    return results as DealWithRelations[];
  }

  async getDealsByPrimaryContactId(contactId: string): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        externalId: deals.externalId,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        clientId: deals.clientId,
        brandId: deals.brandId,
        primaryContactId: deals.primaryContactId,
        budgetHigh: deals.budgetHigh,
        budgetLow: deals.budgetLow,
        budgetNotes: deals.budgetNotes,
        startedOn: deals.startedOn,
        wonOn: deals.wonOn,
        lastContactOn: deals.lastContactOn,
        proposalSentOn: deals.proposalSentOn,
        projectDate: deals.projectDate,
        earliestEventDate: deals.earliestEventDate,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        locationsText: deals.locationsText,
        concept: deals.concept,
        notes: deals.notes,
        ownerId: deals.ownerId,
        industryId: deals.industryId,
        createdById: deals.createdById,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        sortOrder: deals.sortOrder,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        brand: {
          id: brands.id,
          name: brands.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(deals)
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .where(eq(deals.primaryContactId, contactId))
      .orderBy(desc(deals.createdAt));
    return results as DealWithRelations[];
  }

  async createDeal(data: CreateDeal, createdById: string): Promise<Deal> {
    const earliestEventDate = computeEarliestEventDate(data.eventSchedule as DealEvent[] | undefined);
    
    // Get max sortOrder to place new deal at the top
    const [maxResult] = await db
      .select({ maxSortOrder: sql<number>`COALESCE(MAX(${deals.sortOrder}), 0)` })
      .from(deals);
    const nextSortOrder = (maxResult?.maxSortOrder ?? 0) + 1;
    
    const [deal] = await db
      .insert(deals)
      .values({
        ...data,
        earliestEventDate,
        sortOrder: nextSortOrder,
        createdById,
      })
      .returning();
    return deal;
  }

  async updateDeal(id: string, data: UpdateDeal): Promise<Deal | undefined> {
    // Compute earliest event date if eventSchedule is being updated
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    
    if (data.eventSchedule !== undefined) {
      updateData.earliestEventDate = computeEarliestEventDate(data.eventSchedule as DealEvent[] | undefined);
    }
    
    const [deal] = await db
      .update(deals)
      .set(updateData)
      .where(eq(deals.id, id))
      .returning();
    return deal;
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  }

  async reorderDeals(orderedDealIds: string[]): Promise<void> {
    // Update sortOrder for each deal based on its position in the array
    // First item gets the highest sortOrder (newest), last item gets 1 (oldest)
    // Uses a single batched CASE/WHEN UPDATE for performance (vs individual updates)
    
    if (orderedDealIds.length === 0) return;
    
    const totalDeals = orderedDealIds.length;
    const now = new Date();
    
    // Build CASE/WHEN clause for sortOrder
    // Each deal gets: totalDeals - index (first item = highest number)
    const caseStatements = orderedDealIds.map((dealId, index) => {
      const newSortOrder = totalDeals - index;
      return sql`WHEN ${dealId} THEN ${newSortOrder}::integer`;
    });
    
    // Combine all CASE statements
    const caseClause = sql.join(caseStatements, sql` `);
    
    // Execute single UPDATE with CASE/WHEN
    await db.execute(sql`
      UPDATE deals 
      SET 
        sort_order = CASE id ${caseClause} END,
        updated_at = ${now}
      WHERE id IN ${orderedDealIds}
    `);
  }

  // Deal task operations
  async getDealTaskById(id: string): Promise<DealTask | undefined> {
    const [task] = await db
      .select()
      .from(dealTasks)
      .where(eq(dealTasks.id, id));
    return task;
  }

  async getDealTasks(dealId: string): Promise<DealTaskWithRelations[]> {
    const createdByUsers = alias(users, "created_by_users");
    const assignedUsers = alias(users, "assigned_users");
    
    const results = await db
      .select({
        id: dealTasks.id,
        dealId: dealTasks.dealId,
        title: dealTasks.title,
        createdById: dealTasks.createdById,
        dueDate: dealTasks.dueDate,
        assignedUserId: dealTasks.assignedUserId,
        completed: dealTasks.completed,
        completedAt: dealTasks.completedAt,
        createdAt: dealTasks.createdAt,
        updatedAt: dealTasks.updatedAt,
        createdBy: {
          id: createdByUsers.id,
          firstName: createdByUsers.firstName,
          lastName: createdByUsers.lastName,
          profileImageUrl: createdByUsers.profileImageUrl,
        },
        assignedUser: {
          id: assignedUsers.id,
          firstName: assignedUsers.firstName,
          lastName: assignedUsers.lastName,
          profileImageUrl: assignedUsers.profileImageUrl,
        },
      })
      .from(dealTasks)
      .leftJoin(createdByUsers, eq(dealTasks.createdById, createdByUsers.id))
      .leftJoin(assignedUsers, eq(dealTasks.assignedUserId, assignedUsers.id))
      .where(eq(dealTasks.dealId, dealId))
      .orderBy(asc(dealTasks.completed), asc(dealTasks.dueDate), desc(dealTasks.createdAt));

    return results.map(r => ({
      id: r.id,
      dealId: r.dealId,
      title: r.title,
      createdById: r.createdById,
      dueDate: r.dueDate,
      assignedUserId: r.assignedUserId,
      completed: r.completed,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdBy?.id ? r.createdBy : null,
      assignedUser: r.assignedUser?.id ? r.assignedUser : null,
    }));
  }

  async createDealTask(data: CreateDealTask, createdById: string): Promise<DealTask> {
    const [task] = await db
      .insert(dealTasks)
      .values({
        dealId: data.dealId,
        title: data.title,
        dueDate: data.dueDate || null,
        assignedUserId: data.assignedUserId || null,
        createdById,
      })
      .returning();
    return task;
  }

  async updateDealTask(id: string, data: { completed?: boolean; assignedUserId?: string | null; dueDate?: string | null; title?: string }): Promise<DealTask | undefined> {
    const updateData: Partial<{ completed: boolean; completedAt: Date | null; assignedUserId: string | null; dueDate: string | null; title: string; updatedAt: Date }> = {
      updatedAt: new Date(),
    };
    
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }
    if (data.assignedUserId !== undefined) {
      updateData.assignedUserId = data.assignedUserId;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    const [task] = await db
      .update(dealTasks)
      .set(updateData)
      .where(eq(dealTasks.id, id))
      .returning();
    return task;
  }

  async deleteDealTask(id: string): Promise<void> {
    await db.delete(dealTasks).where(eq(dealTasks.id, id));
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .orderBy(asc(clients.name));
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(data: CreateClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(data)
      .returning();
    return client;
  }

  async updateClient(id: string, data: UpdateClient): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }
  
  // Client-Contact link operations
  async getContactsForClient(clientId: string): Promise<Contact[]> {
    const result = await db
      .select({ contact: contacts })
      .from(clientContacts)
      .innerJoin(contacts, eq(clientContacts.contactId, contacts.id))
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName));
    return result.map(r => r.contact);
  }

  async getClientsForContact(contactId: string): Promise<Client[]> {
    const result = await db
      .select({ client: clients })
      .from(clientContacts)
      .innerJoin(clients, eq(clientContacts.clientId, clients.id))
      .where(eq(clientContacts.contactId, contactId))
      .orderBy(asc(clients.name));
    return result.map(r => r.client);
  }

  async linkClientContact(clientId: string, contactId: string): Promise<void> {
    await db
      .insert(clientContacts)
      .values({ clientId, contactId })
      .onConflictDoNothing();
  }

  async unlinkClientContact(clientId: string, contactId: string): Promise<void> {
    await db
      .delete(clientContacts)
      .where(
        and(
          eq(clientContacts.clientId, clientId),
          eq(clientContacts.contactId, contactId)
        )
      );
  }

  // Brand operations
  async getBrands(): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .orderBy(desc(brands.createdAt));
  }

  async getBrandById(id: string): Promise<Brand | undefined> {
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, id));
    return brand;
  }

  async createBrand(data: CreateBrand): Promise<Brand> {
    const [brand] = await db
      .insert(brands)
      .values(data)
      .returning();
    return brand;
  }

  async updateBrand(id: string, data: UpdateBrand): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();
    return brand;
  }

  async deleteBrand(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }
}

export const storage = new DatabaseStorage();
