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
  venues,
  amenities,
  venueAmenities,
  tags,
  venueTags,
  venueFloorplans,
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
  type CreateContact,
  type UpdateContact,
  type Vendor,
  type VendorService,
  type VendorWithServices,
  type VendorWithRelations,
  type ContactWithVendors,
  type Venue,
  type CreateVenue,
  type UpdateVenue,
  type VenueWithRelations,
  type VenueFloorplan,
  type CreateVenueFloorplan,
  type UpdateVenueFloorplan,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, isNull, gt, sql, gte, lte, inArray } from "drizzle-orm";
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
  reorderFeatures(updates: { id: string; sortOrder: number; status?: string }[]): Promise<void>;
  
  // Feature vote operations
  toggleVote(featureId: string, userId: string): Promise<{ voted: boolean; voteCount: number }>;
  getUserVotes(userId: string): Promise<string[]>;
  
  // Feature comment operations
  getComments(featureId: string): Promise<FeatureCommentWithUser[]>;
  createComment(featureId: string, userId: string, body: string): Promise<FeatureComment>;
  deleteComment(id: string): Promise<void>;
  
  // Contact operations
  getContacts(): Promise<Contact[]>;
  getContactsWithVendors(): Promise<ContactWithVendors[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  createContact(data: CreateContact): Promise<Contact>;
  updateContact(id: string, data: UpdateContact): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<void>;
  
  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendorsWithServices(): Promise<VendorWithServices[]>;
  getVendorsWithRelations(): Promise<VendorWithRelations[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  getVendorByIdWithRelations(id: string): Promise<VendorWithRelations | undefined>;
  createVendor(data: Omit<CreateVendor, 'serviceIds'>, serviceIds?: string[]): Promise<Vendor>;
  updateVendor(id: string, data: Partial<Omit<UpdateVendor, 'serviceIds'>>, serviceIds?: string[]): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;
  
  // Vendor service operations
  getVendorServices(): Promise<VendorService[]>;
  getVendorServiceById(id: string): Promise<VendorService | undefined>;
  createVendorService(data: CreateVendorService): Promise<VendorService>;
  updateVendorService(id: string, data: UpdateVendorService): Promise<VendorService | undefined>;
  deleteVendorService(id: string): Promise<void>;
  
  // Venue operations
  getVenues(): Promise<Venue[]>;
  getVenuesWithRelations(): Promise<VenueWithRelations[]>;
  getVenueById(id: string): Promise<Venue | undefined>;
  getVenueByIdWithRelations(id: string): Promise<VenueWithRelations | undefined>;
  createVenue(data: CreateVenue): Promise<Venue>;
  updateVenue(id: string, data: UpdateVenue): Promise<Venue | undefined>;
  deleteVenue(id: string): Promise<void>;
  
  // Venue-Amenity relationship operations
  getVenueAmenities(venueId: string): Promise<Amenity[]>;
  setVenueAmenities(venueId: string, amenityIds: string[]): Promise<void>;
  
  // Venue-Tag relationship operations
  getVenueTags(venueId: string): Promise<Tag[]>;
  
  // Venue Floorplan operations (deprecated - use Venue File operations)
  getVenueFloorplans(venueId: string): Promise<VenueFloorplan[]>;
  getVenueFloorplanById(id: string): Promise<VenueFloorplan | undefined>;
  createVenueFloorplan(data: CreateVenueFloorplan): Promise<VenueFloorplan>;
  updateVenueFloorplan(id: string, data: UpdateVenueFloorplan): Promise<VenueFloorplan | undefined>;
  deleteVenueFloorplan(id: string): Promise<void>;
  
  // Venue File operations (unified for floorplans and attachments)
  getVenueFiles(venueId: string, category?: string): Promise<VenueFileWithUploader[]>;
  getVenueFileById(id: string): Promise<VenueFileWithUploader | undefined>;
  createVenueFile(data: CreateVenueFile): Promise<VenueFile>;
  updateVenueFile(id: string, data: UpdateVenueFile): Promise<VenueFile | undefined>;
  deleteVenueFile(id: string): Promise<void>;
  
  // Venue Photo operations
  getVenuePhotos(venueId: string): Promise<VenuePhoto[]>;
  getVenuePhotoById(id: string): Promise<VenuePhoto | undefined>;
  createVenuePhoto(data: CreateVenuePhoto): Promise<VenuePhoto>;
  createVenuePhotos(data: CreateVenuePhoto[]): Promise<VenuePhoto[]>;
  updateVenuePhoto(id: string, data: UpdateVenuePhoto): Promise<VenuePhoto | undefined>;
  deleteVenuePhoto(id: string): Promise<void>;
  setVenuePhotoHero(venueId: string, photoId: string): Promise<void>;
  
  setVenueTags(venueId: string, tagIds: string[]): Promise<void>;
  getTagsByCategory(category: string): Promise<Tag[]>;
  
  // Venue Collection operations
  getVenueCollections(): Promise<VenueCollectionWithCreator[]>;
  getVenueCollectionById(id: string): Promise<VenueCollectionWithVenues | undefined>;
  createVenueCollection(data: CreateVenueCollection, createdById: string): Promise<VenueCollection>;
  updateVenueCollection(id: string, data: UpdateVenueCollection): Promise<VenueCollection | undefined>;
  deleteVenueCollection(id: string): Promise<void>;
  addVenuesToCollection(collectionId: string, venueIds: string[], addedById?: string): Promise<void>;
  removeVenueFromCollection(collectionId: string, venueId: string): Promise<void>;
  getCollectionsForVenue(venueId: string): Promise<VenueCollectionWithCreator[]>;
  
  // Amenity operations
  getAmenities(): Promise<Amenity[]>;
  getAmenityById(id: string): Promise<Amenity | undefined>;
  createAmenity(data: CreateAmenity): Promise<Amenity>;
  updateAmenity(id: string, data: UpdateAmenity): Promise<Amenity | undefined>;
  deleteAmenity(id: string): Promise<void>;
  
  // Tag operations
  getTags(): Promise<Tag[]>;
  getTagById(id: string): Promise<Tag | undefined>;
  createTag(data: CreateTag): Promise<Tag>;
  updateTag(id: string, data: UpdateTag): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<void>;
  
  // App settings operations
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: unknown, updatedBy?: string): Promise<AppSetting>;
  getTheme(): Promise<ThemeConfig | null>;
  setTheme(theme: ThemeConfig, updatedBy: string): Promise<AppSetting>;
  
  // Vendor update token operations
  createVendorUpdateToken(vendorId: string, createdById: string, expiresInHours?: number): Promise<{ token: string; expiresAt: Date }>;
  getVendorByToken(token: string): Promise<VendorWithServices | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  getAllVendorUpdateTokens(): Promise<VendorUpdateTokenWithRelations[]>;
  
  // App issue operations
  getIssues(options?: { status?: IssueStatus[]; severity?: string }): Promise<AppIssueWithRelations[]>;
  getIssueById(id: string): Promise<AppIssueWithRelations | undefined>;
  createIssue(data: CreateAppIssue, createdById: string): Promise<AppIssue>;
  updateIssue(id: string, data: UpdateAppIssue): Promise<AppIssue | undefined>;
  deleteIssue(id: string): Promise<void>;
  
  // Form template operations
  getFormTemplates(): Promise<FormTemplateWithRelations[]>;
  getFormTemplateById(id: string): Promise<FormTemplateWithRelations | undefined>;
  createFormTemplate(data: CreateFormTemplate, createdById: string): Promise<FormTemplate>;
  updateFormTemplate(id: string, data: UpdateFormTemplate): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string): Promise<void>;
  
  // Form request operations
  getFormRequests(): Promise<FormRequestWithRelations[]>;
  getFormRequestById(id: string): Promise<FormRequestWithRelations | undefined>;
  createFormRequest(data: CreateFormRequest, createdById: string): Promise<FormRequest>;
  updateFormRequest(id: string, data: UpdateFormRequest): Promise<FormRequest | undefined>;
  deleteFormRequest(id: string): Promise<void>;
  
  // Outreach token operations
  createOutreachTokens(
    requestId: string,
    recipients: Array<{ type: RecipientType; id: string }>,
    expiresInDays?: number
  ): Promise<OutreachToken[]>;
  getOutreachTokensByRequestId(requestId: string): Promise<OutreachTokenWithRecipient[]>;
  getOutreachTokenByToken(token: string): Promise<OutreachTokenWithRecipient | undefined>;
  markOutreachTokenSent(token: string): Promise<void>;
  markOutreachTokenResponded(token: string): Promise<void>;
  
  // Form response operations
  getFormResponseByToken(tokenId: string): Promise<FormResponse | undefined>;
  createOrUpdateFormResponse(tokenId: string, data: CreateFormResponse): Promise<FormResponse>;
  
  // Public form data (for unauthenticated access)
  getPublicFormData(token: string): Promise<PublicFormData | undefined>;
  
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
        sortOrder: appFeatures.sortOrder,
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

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return db
      .select()
      .from(contacts)
      .orderBy(contacts.lastName, contacts.firstName);
  }

  async getContactsWithVendors(): Promise<ContactWithVendors[]> {
    const allContacts = await db
      .select()
      .from(contacts)
      .orderBy(contacts.lastName, contacts.firstName);

    const contactVendorMappings = await db
      .select({
        contactId: vendorsContacts.contactId,
        vendor: vendors,
      })
      .from(vendorsContacts)
      .innerJoin(vendors, eq(vendorsContacts.vendorId, vendors.id));

    const vendorsByContactId = new Map<string, Vendor[]>();
    for (const mapping of contactVendorMappings) {
      const existing = vendorsByContactId.get(mapping.contactId) || [];
      existing.push(mapping.vendor);
      vendorsByContactId.set(mapping.contactId, existing);
    }

    return allContacts.map((contact) => ({
      ...contact,
      vendors: vendorsByContactId.get(contact.id) || [],
    }));
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async createContact(data: CreateContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(data)
      .returning();
    return contact;
  }

  async updateContact(id: string, data: UpdateContact): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(vendorsContacts).where(eq(vendorsContacts.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
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

  async getVendorsWithRelations(): Promise<VendorWithRelations[]> {
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

    const vendorContactMappings = await db
      .select({
        vendorId: vendorsContacts.vendorId,
        contact: contacts,
      })
      .from(vendorsContacts)
      .innerJoin(contacts, eq(vendorsContacts.contactId, contacts.id));

    const servicesByVendorId = new Map<string, VendorService[]>();
    for (const mapping of vendorServiceMappings) {
      const existing = servicesByVendorId.get(mapping.vendorId) || [];
      existing.push(mapping.service);
      servicesByVendorId.set(mapping.vendorId, existing);
    }

    const contactsByVendorId = new Map<string, Contact[]>();
    for (const mapping of vendorContactMappings) {
      const existing = contactsByVendorId.get(mapping.vendorId) || [];
      existing.push(mapping.contact);
      contactsByVendorId.set(mapping.vendorId, existing);
    }

    return allVendors.map((vendor) => ({
      ...vendor,
      services: servicesByVendorId.get(vendor.id) || [],
      contacts: contactsByVendorId.get(vendor.id) || [],
    }));
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  }

  async getVendorByIdWithRelations(id: string): Promise<VendorWithRelations | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    
    if (!vendor) return undefined;

    const vendorServiceMappings = await db
      .select({
        service: vendorServices,
      })
      .from(vendorServicesVendors)
      .innerJoin(vendorServices, eq(vendorServicesVendors.vendorServiceId, vendorServices.id))
      .where(eq(vendorServicesVendors.vendorId, id));

    const vendorContactMappings = await db
      .select({
        contact: contacts,
      })
      .from(vendorsContacts)
      .innerJoin(contacts, eq(vendorsContacts.contactId, contacts.id))
      .where(eq(vendorsContacts.vendorId, id));

    return {
      ...vendor,
      services: vendorServiceMappings.map((m) => m.service),
      contacts: vendorContactMappings.map((m) => m.contact),
    };
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

  async createVendorService(data: CreateVendorService): Promise<VendorService> {
    const [service] = await db
      .insert(vendorServices)
      .values(data)
      .returning();
    return service;
  }

  async updateVendorService(id: string, data: UpdateVendorService): Promise<VendorService | undefined> {
    const [service] = await db
      .update(vendorServices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorServices.id, id))
      .returning();
    return service;
  }

  async deleteVendorService(id: string): Promise<void> {
    await db.delete(vendorServices).where(eq(vendorServices.id, id));
  }

  // Vendor CRUD operations
  async createVendor(data: Omit<CreateVendor, 'serviceIds'>, serviceIds?: string[]): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(data)
      .returning();

    if (serviceIds && serviceIds.length > 0) {
      await db.insert(vendorServicesVendors).values(
        serviceIds.map((vendorServiceId) => ({
          vendorId: vendor.id,
          vendorServiceId,
        }))
      );
    }

    return vendor;
  }

  async updateVendor(id: string, data: Partial<Omit<UpdateVendor, 'serviceIds'>>, serviceIds?: string[]): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();

    if (!vendor) return undefined;

    if (serviceIds !== undefined) {
      await db.delete(vendorServicesVendors).where(eq(vendorServicesVendors.vendorId, id));
      
      if (serviceIds.length > 0) {
        await db.insert(vendorServicesVendors).values(
          serviceIds.map((vendorServiceId) => ({
            vendorId: id,
            vendorServiceId,
          }))
        );
      }
    }

    return vendor;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendorServicesVendors).where(eq(vendorServicesVendors.vendorId, id));
    await db.delete(vendorsContacts).where(eq(vendorsContacts.vendorId, id));
    await db.delete(vendors).where(eq(vendors.id, id));
  }
  
  // Venue CRUD operations
  async getVenues(): Promise<Venue[]> {
    return db.select().from(venues).orderBy(venues.name);
  }
  
  async getVenueById(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }
  
  async getVenuesWithRelations(): Promise<VenueWithRelations[]> {
    const allVenues = await db.select().from(venues).orderBy(venues.name);
    
    const allVenueAmenities = await db
      .select({
        venueId: venueAmenities.venueId,
        amenity: amenities,
      })
      .from(venueAmenities)
      .innerJoin(amenities, eq(venueAmenities.amenityId, amenities.id));
    
    const allVenueTags = await db
      .select({
        venueId: venueTags.venueId,
        tag: tags,
      })
      .from(venueTags)
      .innerJoin(tags, eq(venueTags.tagId, tags.id));
    
    // Fetch all venue files with uploader info
    const allVenueFiles = await db
      .select({
        file: venueFiles,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(venueFiles)
      .leftJoin(users, eq(venueFiles.uploadedById, users.id))
      .orderBy(venueFiles.sortOrder, venueFiles.uploadedAt);
    
    const amenitiesByVenue = new Map<string, Amenity[]>();
    for (const va of allVenueAmenities) {
      if (!amenitiesByVenue.has(va.venueId)) {
        amenitiesByVenue.set(va.venueId, []);
      }
      amenitiesByVenue.get(va.venueId)!.push(va.amenity);
    }
    
    const tagsByVenue = new Map<string, Tag[]>();
    for (const vt of allVenueTags) {
      if (!tagsByVenue.has(vt.venueId)) {
        tagsByVenue.set(vt.venueId, []);
      }
      tagsByVenue.get(vt.venueId)!.push(vt.tag);
    }
    
    const floorplansByVenue = new Map<string, VenueFileWithUploader[]>();
    const attachmentsByVenue = new Map<string, VenueFileWithUploader[]>();
    for (const vf of allVenueFiles) {
      const fileWithUploader: VenueFileWithUploader = {
        ...vf.file,
        uploadedBy: vf.uploadedBy,
      };
      if (vf.file.category === 'floorplan') {
        if (!floorplansByVenue.has(vf.file.venueId)) {
          floorplansByVenue.set(vf.file.venueId, []);
        }
        floorplansByVenue.get(vf.file.venueId)!.push(fileWithUploader);
      } else {
        if (!attachmentsByVenue.has(vf.file.venueId)) {
          attachmentsByVenue.set(vf.file.venueId, []);
        }
        attachmentsByVenue.get(vf.file.venueId)!.push(fileWithUploader);
      }
    }
    
    return allVenues.map(venue => {
      const venueAmenitiesList = amenitiesByVenue.get(venue.id) || [];
      const venueTagsList = tagsByVenue.get(venue.id) || [];
      const venueFloorplansList = floorplansByVenue.get(venue.id) || [];
      const venueAttachmentsList = attachmentsByVenue.get(venue.id) || [];
      
      return {
        ...venue,
        amenities: venueAmenitiesList,
        cuisineTags: venueTagsList.filter(t => t.category === 'Cuisine'),
        styleTags: venueTagsList.filter(t => t.category === 'Style'),
        floorplans: venueFloorplansList,
        attachments: venueAttachmentsList,
      };
    });
  }
  
  async createVenue(data: CreateVenue): Promise<Venue> {
    const [venue] = await db
      .insert(venues)
      .values(data)
      .returning();
    return venue;
  }
  
  async updateVenue(id: string, data: UpdateVenue): Promise<Venue | undefined> {
    const [venue] = await db
      .update(venues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return venue;
  }
  
  async deleteVenue(id: string): Promise<void> {
    await db.delete(venues).where(eq(venues.id, id));
  }
  
  async getVenueByIdWithRelations(id: string): Promise<VenueWithRelations | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) return undefined;
    
    const venueAmenitiesList = await this.getVenueAmenities(id);
    const venueTagsList = await this.getVenueTags(id);
    const venueFilesList = await this.getVenueFiles(id);
    
    return {
      ...venue,
      amenities: venueAmenitiesList,
      cuisineTags: venueTagsList.filter(t => t.category === 'Cuisine'),
      styleTags: venueTagsList.filter(t => t.category === 'Style'),
      floorplans: venueFilesList.filter(f => f.category === 'floorplan'),
      attachments: venueFilesList.filter(f => f.category === 'attachment'),
    };
  }
  
  // Venue-Amenity relationship operations
  async getVenueAmenities(venueId: string): Promise<Amenity[]> {
    const results = await db
      .select({ amenity: amenities })
      .from(venueAmenities)
      .innerJoin(amenities, eq(venueAmenities.amenityId, amenities.id))
      .where(eq(venueAmenities.venueId, venueId));
    return results.map(r => r.amenity);
  }
  
  async setVenueAmenities(venueId: string, amenityIds: string[]): Promise<void> {
    await db.delete(venueAmenities).where(eq(venueAmenities.venueId, venueId));
    
    if (amenityIds.length > 0) {
      await db.insert(venueAmenities).values(
        amenityIds.map(amenityId => ({
          venueId,
          amenityId,
        }))
      );
    }
  }
  
  // Venue-Tag relationship operations
  async getVenueTags(venueId: string): Promise<Tag[]> {
    const results = await db
      .select({ tag: tags })
      .from(venueTags)
      .innerJoin(tags, eq(venueTags.tagId, tags.id))
      .where(eq(venueTags.venueId, venueId));
    return results.map(r => r.tag);
  }
  
  async setVenueTags(venueId: string, tagIds: string[]): Promise<void> {
    await db.delete(venueTags).where(eq(venueTags.venueId, venueId));
    
    if (tagIds.length > 0) {
      await db.insert(venueTags).values(
        tagIds.map(tagId => ({
          venueId,
          tagId,
        }))
      );
    }
  }
  
  // Venue Floorplan operations
  async getVenueFloorplans(venueId: string): Promise<VenueFloorplan[]> {
    return db
      .select()
      .from(venueFloorplans)
      .where(eq(venueFloorplans.venueId, venueId))
      .orderBy(venueFloorplans.sortOrder, venueFloorplans.uploadedAt);
  }
  
  async getVenueFloorplanById(id: string): Promise<VenueFloorplan | undefined> {
    const [floorplan] = await db
      .select()
      .from(venueFloorplans)
      .where(eq(venueFloorplans.id, id));
    return floorplan;
  }
  
  async createVenueFloorplan(data: CreateVenueFloorplan): Promise<VenueFloorplan> {
    const [floorplan] = await db
      .insert(venueFloorplans)
      .values({
        venueId: data.venueId,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl,
        fileType: data.fileType,
        title: data.title,
        caption: data.caption,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return floorplan;
  }
  
  async updateVenueFloorplan(id: string, data: UpdateVenueFloorplan): Promise<VenueFloorplan | undefined> {
    const [floorplan] = await db
      .update(venueFloorplans)
      .set(data)
      .where(eq(venueFloorplans.id, id))
      .returning();
    return floorplan;
  }
  
  async deleteVenueFloorplan(id: string): Promise<void> {
    await db.delete(venueFloorplans).where(eq(venueFloorplans.id, id));
  }
  
  // Venue File operations (unified for floorplans and attachments)
  async getVenueFiles(venueId: string, category?: string): Promise<VenueFileWithUploader[]> {
    const whereCondition = category
      ? and(eq(venueFiles.venueId, venueId), eq(venueFiles.category, category))
      : eq(venueFiles.venueId, venueId);
    
    const results = await db
      .select({
        file: venueFiles,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(venueFiles)
      .leftJoin(users, eq(venueFiles.uploadedById, users.id))
      .where(whereCondition)
      .orderBy(venueFiles.sortOrder, venueFiles.uploadedAt);
    
    return results.map(r => ({
      ...r.file,
      uploadedBy: r.uploadedBy,
    }));
  }
  
  async getVenueFileById(id: string): Promise<VenueFileWithUploader | undefined> {
    const [result] = await db
      .select({
        file: venueFiles,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(venueFiles)
      .leftJoin(users, eq(venueFiles.uploadedById, users.id))
      .where(eq(venueFiles.id, id));
    
    if (!result) return undefined;
    return {
      ...result.file,
      uploadedBy: result.uploadedBy,
    };
  }
  
  async createVenueFile(data: CreateVenueFile): Promise<VenueFile> {
    const [file] = await db
      .insert(venueFiles)
      .values({
        venueId: data.venueId,
        category: data.category,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl,
        fileType: data.fileType,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        title: data.title,
        caption: data.caption,
        sortOrder: data.sortOrder ?? 0,
        uploadedById: data.uploadedById,
      })
      .returning();
    return file;
  }
  
  async updateVenueFile(id: string, data: UpdateVenueFile): Promise<VenueFile | undefined> {
    const [file] = await db
      .update(venueFiles)
      .set(data)
      .where(eq(venueFiles.id, id))
      .returning();
    return file;
  }
  
  async deleteVenueFile(id: string): Promise<void> {
    await db.delete(venueFiles).where(eq(venueFiles.id, id));
  }
  
  // Venue Photo operations
  async getVenuePhotos(venueId: string): Promise<VenuePhoto[]> {
    return db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.venueId, venueId))
      .orderBy(asc(venuePhotos.sortOrder));
  }
  
  async getVenuePhotoById(id: string): Promise<VenuePhoto | undefined> {
    const [photo] = await db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.id, id));
    return photo;
  }
  
  async createVenuePhoto(data: CreateVenuePhoto): Promise<VenuePhoto> {
    const [photo] = await db
      .insert(venuePhotos)
      .values({
        venueId: data.venueId,
        url: data.url,
        altText: data.altText,
        sortOrder: data.sortOrder ?? 0,
        isHero: data.isHero ?? false,
      })
      .returning();
    return photo;
  }
  
  async createVenuePhotos(data: CreateVenuePhoto[]): Promise<VenuePhoto[]> {
    if (data.length === 0) return [];
    const photos = await db
      .insert(venuePhotos)
      .values(data.map(d => ({
        venueId: d.venueId,
        url: d.url,
        altText: d.altText,
        sortOrder: d.sortOrder ?? 0,
        isHero: d.isHero ?? false,
      })))
      .returning();
    return photos;
  }
  
  async updateVenuePhoto(id: string, data: UpdateVenuePhoto): Promise<VenuePhoto | undefined> {
    const [photo] = await db
      .update(venuePhotos)
      .set(data)
      .where(eq(venuePhotos.id, id))
      .returning();
    return photo;
  }
  
  async deleteVenuePhoto(id: string): Promise<void> {
    await db.delete(venuePhotos).where(eq(venuePhotos.id, id));
  }
  
  async setVenuePhotoHero(venueId: string, photoId: string): Promise<void> {
    // First, unset all hero photos for this venue
    await db
      .update(venuePhotos)
      .set({ isHero: false })
      .where(eq(venuePhotos.venueId, venueId));
    // Then set the specified photo as hero
    await db
      .update(venuePhotos)
      .set({ isHero: true })
      .where(eq(venuePhotos.id, photoId));
  }
  
  async getTagsByCategory(category: string): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.category, category)).orderBy(tags.name);
  }
  
  // Venue Collection operations
  async getVenueCollections(): Promise<VenueCollectionWithCreator[]> {
    const collections = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollections)
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .orderBy(desc(venueCollections.createdAt));
    
    // Get venue counts for each collection
    const counts = await db
      .select({
        collectionId: venueCollectionVenues.collectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(venueCollectionVenues)
      .groupBy(venueCollectionVenues.collectionId);
    
    const countMap = new Map(counts.map(c => [c.collectionId, c.count]));
    
    return collections.map(({ collection, createdBy }) => ({
      ...collection,
      createdBy,
      venueCount: countMap.get(collection.id) || 0,
    }));
  }
  
  async getVenueCollectionById(id: string): Promise<VenueCollectionWithVenues | undefined> {
    const [result] = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollections)
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .where(eq(venueCollections.id, id));
    
    if (!result) return undefined;
    
    // Get venues in this collection
    const collectionVenues = await db
      .select({
        venue: venues,
        addedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        addedAt: venueCollectionVenues.addedAt,
      })
      .from(venueCollectionVenues)
      .innerJoin(venues, eq(venueCollectionVenues.venueId, venues.id))
      .leftJoin(users, eq(venueCollectionVenues.addedById, users.id))
      .where(eq(venueCollectionVenues.collectionId, id))
      .orderBy(asc(venueCollectionVenues.sortOrder), desc(venueCollectionVenues.addedAt));
    
    return {
      ...result.collection,
      createdBy: result.createdBy,
      venues: collectionVenues.map(cv => ({
        ...cv.venue,
        addedBy: cv.addedBy,
        addedAt: cv.addedAt,
      })),
    };
  }
  
  async createVenueCollection(data: CreateVenueCollection, createdById: string): Promise<VenueCollection> {
    const [collection] = await db
      .insert(venueCollections)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return collection;
  }
  
  async updateVenueCollection(id: string, data: UpdateVenueCollection): Promise<VenueCollection | undefined> {
    const [collection] = await db
      .update(venueCollections)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(venueCollections.id, id))
      .returning();
    return collection;
  }
  
  async deleteVenueCollection(id: string): Promise<void> {
    await db.delete(venueCollections).where(eq(venueCollections.id, id));
  }
  
  async addVenuesToCollection(collectionId: string, venueIds: string[], addedById?: string): Promise<void> {
    if (venueIds.length === 0) return;
    
    // Use upsert to avoid duplicates
    await db
      .insert(venueCollectionVenues)
      .values(
        venueIds.map(venueId => ({
          collectionId,
          venueId,
          addedById,
        }))
      )
      .onConflictDoNothing();
  }
  
  async removeVenueFromCollection(collectionId: string, venueId: string): Promise<void> {
    await db
      .delete(venueCollectionVenues)
      .where(
        and(
          eq(venueCollectionVenues.collectionId, collectionId),
          eq(venueCollectionVenues.venueId, venueId)
        )
      );
  }
  
  async reorderVenuesInCollection(collectionId: string, venueIds: string[]): Promise<void> {
    // Update sortOrder for each venue in the collection based on the provided order
    await Promise.all(
      venueIds.map((venueId, index) =>
        db
          .update(venueCollectionVenues)
          .set({ sortOrder: index })
          .where(
            and(
              eq(venueCollectionVenues.collectionId, collectionId),
              eq(venueCollectionVenues.venueId, venueId)
            )
          )
      )
    );
  }
  
  async getCollectionsForVenue(venueId: string): Promise<VenueCollectionWithCreator[]> {
    const results = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollectionVenues)
      .innerJoin(venueCollections, eq(venueCollectionVenues.collectionId, venueCollections.id))
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .where(eq(venueCollectionVenues.venueId, venueId))
      .orderBy(venueCollections.name);
    
    // Get venue counts for each collection
    const collectionIds = results.map(r => r.collection.id);
    if (collectionIds.length === 0) return [];
    
    const counts = await db
      .select({
        collectionId: venueCollectionVenues.collectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(venueCollectionVenues)
      .where(inArray(venueCollectionVenues.collectionId, collectionIds))
      .groupBy(venueCollectionVenues.collectionId);
    
    const countMap = new Map(counts.map(c => [c.collectionId, c.count]));
    
    return results.map(({ collection, createdBy }) => ({
      ...collection,
      createdBy,
      venueCount: countMap.get(collection.id) || 0,
    }));
  }
  
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
  
  // Tag operations
  async getTags(): Promise<Tag[]> {
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
  
  // Vendor update token operations
  async createVendorUpdateToken(vendorId: string, createdById: string, expiresInHours: number = 720): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    await db.insert(vendorUpdateTokens).values({
      vendorId,
      token,
      expiresAt,
      createdById,
    });
    
    return { token, expiresAt };
  }
  
  async getVendorByToken(token: string): Promise<VendorWithServices | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(vendorUpdateTokens)
      .where(
        and(
          eq(vendorUpdateTokens.token, token),
          eq(vendorUpdateTokens.used, false),
          gt(vendorUpdateTokens.expiresAt, new Date())
        )
      );
    
    if (!tokenRecord) {
      return undefined;
    }
    
    const vendor = await this.getVendorByIdWithRelations(tokenRecord.vendorId);
    if (!vendor) {
      return undefined;
    }
    
    return {
      ...vendor,
      services: vendor.services || [],
    };
  }
  
  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(vendorUpdateTokens)
      .set({ used: true })
      .where(eq(vendorUpdateTokens.token, token));
  }
  
  async getAllVendorUpdateTokens(): Promise<VendorUpdateTokenWithRelations[]> {
    const tokens = await db
      .select({
        id: vendorUpdateTokens.id,
        vendorId: vendorUpdateTokens.vendorId,
        token: vendorUpdateTokens.token,
        used: vendorUpdateTokens.used,
        expiresAt: vendorUpdateTokens.expiresAt,
        createdById: vendorUpdateTokens.createdById,
        createdAt: vendorUpdateTokens.createdAt,
        vendorBusinessName: vendors.businessName,
        vendorEmail: vendors.email,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(vendorUpdateTokens)
      .leftJoin(vendors, eq(vendorUpdateTokens.vendorId, vendors.id))
      .leftJoin(users, eq(vendorUpdateTokens.createdById, users.id))
      .orderBy(desc(vendorUpdateTokens.createdAt));
    
    return tokens.map((t) => ({
      id: t.id,
      vendorId: t.vendorId,
      token: t.token,
      used: t.used,
      expiresAt: t.expiresAt,
      createdById: t.createdById,
      createdAt: t.createdAt,
      vendor: {
        id: t.vendorId,
        businessName: t.vendorBusinessName || '',
        email: t.vendorEmail,
      } as any,
      createdBy: t.createdById ? {
        id: t.createdById,
        firstName: t.createdByFirstName,
        lastName: t.createdByLastName,
      } as any : null,
    }));
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

  // ==========================================
  // FORM OUTREACH / RFI STORAGE METHODS
  // ==========================================

  // Form template operations
  async getFormTemplates(): Promise<FormTemplateWithRelations[]> {
    const templates = await db
      .select({
        id: formTemplates.id,
        name: formTemplates.name,
        description: formTemplates.description,
        formSchema: formTemplates.formSchema,
        createdById: formTemplates.createdById,
        createdAt: formTemplates.createdAt,
        updatedAt: formTemplates.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formTemplates)
      .leftJoin(users, eq(formTemplates.createdById, users.id))
      .orderBy(desc(formTemplates.createdAt));

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      formSchema: t.formSchema as FormSection[],
      createdById: t.createdById,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdById
        ? {
            id: t.createdById,
            firstName: t.createdByFirstName,
            lastName: t.createdByLastName,
          }
        : null,
    }));
  }

  async getFormTemplateById(id: string): Promise<FormTemplateWithRelations | undefined> {
    const templates = await db
      .select({
        id: formTemplates.id,
        name: formTemplates.name,
        description: formTemplates.description,
        formSchema: formTemplates.formSchema,
        createdById: formTemplates.createdById,
        createdAt: formTemplates.createdAt,
        updatedAt: formTemplates.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formTemplates)
      .leftJoin(users, eq(formTemplates.createdById, users.id))
      .where(eq(formTemplates.id, id));

    if (templates.length === 0) return undefined;

    const t = templates[0];
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      formSchema: t.formSchema as FormSection[],
      createdById: t.createdById,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdById
        ? {
            id: t.createdById,
            firstName: t.createdByFirstName,
            lastName: t.createdByLastName,
          }
        : null,
    };
  }

  async createFormTemplate(data: CreateFormTemplate, createdById: string): Promise<FormTemplate> {
    const [template] = await db
      .insert(formTemplates)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return template;
  }

  async updateFormTemplate(id: string, data: UpdateFormTemplate): Promise<FormTemplate | undefined> {
    const [template] = await db
      .update(formTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(formTemplates.id, id))
      .returning();
    return template;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  // Form request operations
  async getFormRequests(): Promise<FormRequestWithRelations[]> {
    const requests = await db
      .select({
        id: formRequests.id,
        templateId: formRequests.templateId,
        title: formRequests.title,
        description: formRequests.description,
        formSchema: formRequests.formSchema,
        status: formRequests.status,
        dueDate: formRequests.dueDate,
        sentAt: formRequests.sentAt,
        createdById: formRequests.createdById,
        createdAt: formRequests.createdAt,
        updatedAt: formRequests.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formRequests)
      .leftJoin(users, eq(formRequests.createdById, users.id))
      .orderBy(desc(formRequests.createdAt));

    // Get token counts for each request
    const requestIds = requests.map((r) => r.id);
    const tokenCounts: Record<string, { total: number; responded: number }> = {};

    if (requestIds.length > 0) {
      const tokens = await db
        .select({
          requestId: outreachTokens.requestId,
          status: outreachTokens.status,
        })
        .from(outreachTokens)
        .where(inArray(outreachTokens.requestId, requestIds));

      tokens.forEach((t) => {
        if (!tokenCounts[t.requestId]) {
          tokenCounts[t.requestId] = { total: 0, responded: 0 };
        }
        tokenCounts[t.requestId].total++;
        if (t.status === "responded") {
          tokenCounts[t.requestId].responded++;
        }
      });
    }

    return requests.map((r) => ({
      id: r.id,
      templateId: r.templateId,
      title: r.title,
      description: r.description,
      formSchema: r.formSchema as FormSection[],
      status: r.status,
      dueDate: r.dueDate,
      sentAt: r.sentAt,
      createdById: r.createdById,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdById
        ? {
            id: r.createdById,
            firstName: r.createdByFirstName,
            lastName: r.createdByLastName,
          }
        : null,
      recipientCount: tokenCounts[r.id]?.total || 0,
      respondedCount: tokenCounts[r.id]?.responded || 0,
    }));
  }

  async getFormRequestById(id: string): Promise<FormRequestWithRelations | undefined> {
    const requests = await db
      .select({
        id: formRequests.id,
        templateId: formRequests.templateId,
        title: formRequests.title,
        description: formRequests.description,
        formSchema: formRequests.formSchema,
        status: formRequests.status,
        dueDate: formRequests.dueDate,
        sentAt: formRequests.sentAt,
        createdById: formRequests.createdById,
        createdAt: formRequests.createdAt,
        updatedAt: formRequests.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(formRequests)
      .leftJoin(users, eq(formRequests.createdById, users.id))
      .where(eq(formRequests.id, id));

    if (requests.length === 0) return undefined;

    const r = requests[0];

    // Get tokens with recipients
    const tokens = await this.getOutreachTokensByRequestId(id);

    return {
      id: r.id,
      templateId: r.templateId,
      title: r.title,
      description: r.description,
      formSchema: r.formSchema as FormSection[],
      status: r.status,
      dueDate: r.dueDate,
      sentAt: r.sentAt,
      createdById: r.createdById,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdById
        ? {
            id: r.createdById,
            firstName: r.createdByFirstName,
            lastName: r.createdByLastName,
          }
        : null,
      tokens,
      recipientCount: tokens.length,
      respondedCount: tokens.filter((t) => t.status === "responded").length,
    };
  }

  async createFormRequest(data: CreateFormRequest, createdById: string): Promise<FormRequest> {
    const [request] = await db
      .insert(formRequests)
      .values({
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById,
      })
      .returning();
    return request;
  }

  async updateFormRequest(id: string, data: UpdateFormRequest): Promise<FormRequest | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.formSchema !== undefined) updateData.formSchema = data.formSchema;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate as unknown as string) : null;
    }
    const [request] = await db
      .update(formRequests)
      .set(updateData)
      .where(eq(formRequests.id, id))
      .returning();
    return request;
  }

  async deleteFormRequest(id: string): Promise<void> {
    await db.delete(formRequests).where(eq(formRequests.id, id));
  }

  // Outreach token operations
  async createOutreachTokens(
    requestId: string,
    recipients: Array<{ type: RecipientType; id: string }>,
    expiresInDays: number = 30
  ): Promise<OutreachToken[]> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const tokensToInsert = recipients.map((r) => ({
      requestId,
      recipientType: r.type,
      recipientId: r.id,
      token: randomBytes(32).toString("hex"),
      expiresAt,
    }));

    const createdTokens = await db
      .insert(outreachTokens)
      .values(tokensToInsert)
      .returning();

    return createdTokens;
  }

  async getOutreachTokensByRequestId(requestId: string): Promise<OutreachTokenWithRecipient[]> {
    const tokens = await db
      .select()
      .from(outreachTokens)
      .where(eq(outreachTokens.requestId, requestId))
      .orderBy(desc(outreachTokens.createdAt));

    // Fetch vendor and contact info for each token
    const result: OutreachTokenWithRecipient[] = [];

    for (const token of tokens) {
      let vendor = null;
      let contact = null;
      let response = null;

      if (token.recipientType === "vendor") {
        const [v] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, token.recipientId));
        vendor = v || null;
      } else if (token.recipientType === "contact") {
        const [c] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, token.recipientId));
        contact = c || null;
      }

      // Check for response
      const [r] = await db
        .select()
        .from(formResponses)
        .where(eq(formResponses.tokenId, token.id));
      response = r || null;

      result.push({
        ...token,
        vendor,
        contact,
        response,
      });
    }

    return result;
  }

  async getOutreachTokenByToken(token: string): Promise<OutreachTokenWithRecipient | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(outreachTokens)
      .where(eq(outreachTokens.token, token));

    if (!tokenRecord) return undefined;

    let vendor = null;
    let contact = null;
    let response = null;

    if (tokenRecord.recipientType === "vendor") {
      const [v] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, tokenRecord.recipientId));
      vendor = v || null;
    } else if (tokenRecord.recipientType === "contact") {
      const [c] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, tokenRecord.recipientId));
      contact = c || null;
    }

    const [r] = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.tokenId, tokenRecord.id));
    response = r || null;

    return {
      ...tokenRecord,
      vendor,
      contact,
      response,
    };
  }

  async markOutreachTokenSent(token: string): Promise<void> {
    await db
      .update(outreachTokens)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(outreachTokens.token, token));
  }

  async markOutreachTokenResponded(token: string): Promise<void> {
    await db
      .update(outreachTokens)
      .set({ status: "responded", respondedAt: new Date() })
      .where(eq(outreachTokens.token, token));
  }

  // Form response operations
  async getFormResponseByToken(tokenId: string): Promise<FormResponse | undefined> {
    const [response] = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.tokenId, tokenId));
    return response;
  }

  async createOrUpdateFormResponse(tokenId: string, data: CreateFormResponse): Promise<FormResponse> {
    const [response] = await db
      .insert(formResponses)
      .values({
        tokenId,
        responseData: data.responseData,
      })
      .onConflictDoUpdate({
        target: formResponses.tokenId,
        set: {
          responseData: data.responseData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return response;
  }

  // Public form data
  async getPublicFormData(token: string): Promise<PublicFormData | undefined> {
    const tokenRecord = await this.getOutreachTokenByToken(token);
    if (!tokenRecord) return undefined;

    // Check if token is expired
    if (tokenRecord.expiresAt && new Date() > tokenRecord.expiresAt) {
      return undefined;
    }

    // Get the form request
    const [request] = await db
      .select()
      .from(formRequests)
      .where(eq(formRequests.id, tokenRecord.requestId));

    if (!request) return undefined;

    // Get recipient info
    let recipientName = "";
    let recipientEmail: string | null = null;

    if (tokenRecord.recipientType === "vendor" && tokenRecord.vendor) {
      recipientName = tokenRecord.vendor.businessName;
      recipientEmail = tokenRecord.vendor.email;
    } else if (tokenRecord.recipientType === "contact" && tokenRecord.contact) {
      recipientName = `${tokenRecord.contact.firstName} ${tokenRecord.contact.lastName}`;
      recipientEmail = tokenRecord.contact.emailAddresses?.[0] || null;
    }

    // Get existing response if any
    const existingResponse = tokenRecord.response?.responseData || null;

    return {
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        formSchema: request.formSchema as FormSection[],
        dueDate: request.dueDate,
      },
      recipient: {
        id: tokenRecord.recipientId,
        type: tokenRecord.recipientType as RecipientType,
        name: recipientName,
        email: recipientEmail,
      },
      existingResponse: existingResponse as Record<string, unknown> | null,
    };
  }

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
}

export const storage = new DatabaseStorage();
