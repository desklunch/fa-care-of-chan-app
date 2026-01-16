import { db } from "../../db";
import { eq, desc, and, inArray, sql, isNull } from "drizzle-orm";
import {
  appFeatures,
  appIssues,
  appFeatureCategories,
  appFeatureVotes,
  appFeatureComments,
  users,
  type AppFeature,
  type AppIssue,
  type FeatureCategory,
  type FeatureComment,
  type FeatureStatus,
  type IssueStatus,
  type InsertAppFeature,
  type InsertAppIssue,
} from "@shared/schema";

export interface FeatureWithDetails extends AppFeature {
  category: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  voteCount: number;
  hasVoted?: boolean;
}

export interface IssueWithDetails extends AppIssue {
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

export interface CommentWithUser extends FeatureComment {
  userName?: string | null;
}

export const issuesFeaturesStorage = {
  async getFeatures(filters?: {
    status?: FeatureStatus[];
    categoryId?: string;
    userId?: string;
  }): Promise<FeatureWithDetails[]> {
    let conditions = [];

    if (filters?.status && filters.status.length > 0) {
      conditions.push(inArray(appFeatures.status, filters.status));
    }

    if (filters?.categoryId) {
      conditions.push(eq(appFeatures.categoryId, filters.categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const features = await db
      .select({
        id: appFeatures.id,
        title: appFeatures.title,
        description: appFeatures.description,
        featureType: appFeatures.featureType,
        status: appFeatures.status,
        categoryId: appFeatures.categoryId,
        priority: appFeatures.priority,
        sortOrder: appFeatures.sortOrder,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        estimatedDelivery: appFeatures.estimatedDelivery,
        createdAt: appFeatures.createdAt,
        updatedAt: appFeatures.updatedAt,
        completedAt: appFeatures.completedAt,
        categoryName: appFeatureCategories.name,
        categoryDescription: appFeatureCategories.description,
        categoryColor: appFeatureCategories.color,
        categorySortOrder: appFeatureCategories.sortOrder,
        categoryIsActive: appFeatureCategories.isActive,
        categoryCreatedAt: appFeatureCategories.createdAt,
        categoryUpdatedAt: appFeatureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
        voteCount: sql<number>`(SELECT COUNT(*) FROM ${appFeatureVotes} WHERE ${appFeatureVotes.featureId} = ${appFeatures.id})`,
      })
      .from(appFeatures)
      .leftJoin(appFeatureCategories, eq(appFeatures.categoryId, appFeatureCategories.id))
      .leftJoin(users, eq(appFeatures.createdById, users.id))
      .where(whereClause)
      .orderBy(appFeatures.sortOrder, desc(appFeatures.createdAt));

    let userVotes: string[] = [];
    if (filters?.userId) {
      const votedFeatures = await db
        .select({ featureId: appFeatureVotes.featureId })
        .from(appFeatureVotes)
        .where(eq(appFeatureVotes.userId, filters.userId));
      userVotes = votedFeatures.map((v) => v.featureId);
    }

    return features.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      featureType: f.featureType,
      status: f.status,
      categoryId: f.categoryId,
      priority: f.priority,
      sortOrder: f.sortOrder,
      createdById: f.createdById,
      ownerId: f.ownerId,
      estimatedDelivery: f.estimatedDelivery,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      completedAt: f.completedAt,
      voteCount: f.voteCount || 0,
      category: {
        id: f.categoryId,
        name: f.categoryName || "",
        description: f.categoryDescription,
        color: f.categoryColor,
        sortOrder: f.categorySortOrder || 0,
        isActive: f.categoryIsActive ?? true,
        createdAt: f.categoryCreatedAt || new Date(),
        updatedAt: f.categoryUpdatedAt || new Date(),
      },
      createdBy: {
        id: f.createdById,
        firstName: f.createdByFirstName,
        lastName: f.createdByLastName,
        profileImageUrl: f.createdByProfileImage,
      },
      hasVoted: userVotes.includes(f.id),
    }));
  },

  async getFeatureById(featureId: string, userId?: string): Promise<FeatureWithDetails | null> {
    const [feature] = await db
      .select({
        id: appFeatures.id,
        title: appFeatures.title,
        description: appFeatures.description,
        featureType: appFeatures.featureType,
        status: appFeatures.status,
        categoryId: appFeatures.categoryId,
        priority: appFeatures.priority,
        sortOrder: appFeatures.sortOrder,
        createdById: appFeatures.createdById,
        ownerId: appFeatures.ownerId,
        estimatedDelivery: appFeatures.estimatedDelivery,
        createdAt: appFeatures.createdAt,
        updatedAt: appFeatures.updatedAt,
        completedAt: appFeatures.completedAt,
        categoryName: appFeatureCategories.name,
        categoryDescription: appFeatureCategories.description,
        categoryColor: appFeatureCategories.color,
        categorySortOrder: appFeatureCategories.sortOrder,
        categoryIsActive: appFeatureCategories.isActive,
        categoryCreatedAt: appFeatureCategories.createdAt,
        categoryUpdatedAt: appFeatureCategories.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
        voteCount: sql<number>`(SELECT COUNT(*) FROM ${appFeatureVotes} WHERE ${appFeatureVotes.featureId} = ${appFeatures.id})`,
      })
      .from(appFeatures)
      .leftJoin(appFeatureCategories, eq(appFeatures.categoryId, appFeatureCategories.id))
      .leftJoin(users, eq(appFeatures.createdById, users.id))
      .where(eq(appFeatures.id, featureId));

    if (!feature) return null;

    let hasVoted = false;
    if (userId) {
      const [vote] = await db
        .select()
        .from(appFeatureVotes)
        .where(and(eq(appFeatureVotes.featureId, featureId), eq(appFeatureVotes.userId, userId)));
      hasVoted = !!vote;
    }

    return {
      id: feature.id,
      title: feature.title,
      description: feature.description,
      featureType: feature.featureType,
      status: feature.status,
      categoryId: feature.categoryId,
      priority: feature.priority,
      sortOrder: feature.sortOrder,
      createdById: feature.createdById,
      ownerId: feature.ownerId,
      estimatedDelivery: feature.estimatedDelivery,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
      completedAt: feature.completedAt,
      voteCount: feature.voteCount || 0,
      category: {
        id: feature.categoryId,
        name: feature.categoryName || "",
        description: feature.categoryDescription,
        color: feature.categoryColor,
        sortOrder: feature.categorySortOrder || 0,
        isActive: feature.categoryIsActive ?? true,
        createdAt: feature.categoryCreatedAt || new Date(),
        updatedAt: feature.categoryUpdatedAt || new Date(),
      },
      createdBy: {
        id: feature.createdById,
        firstName: feature.createdByFirstName,
        lastName: feature.createdByLastName,
        profileImageUrl: feature.createdByProfileImage,
      },
      hasVoted,
    };
  },

  async createFeature(data: InsertAppFeature, userId: string): Promise<AppFeature> {
    const [feature] = await db
      .insert(appFeatures)
      .values({ ...data, createdById: userId })
      .returning();
    return feature;
  },

  async updateFeature(
    featureId: string,
    data: Partial<InsertAppFeature> & { completedAt?: Date | null }
  ): Promise<AppFeature> {
    const [updated] = await db
      .update(appFeatures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appFeatures.id, featureId))
      .returning();
    return updated;
  },

  async deleteFeature(featureId: string): Promise<void> {
    await db.delete(appFeatureVotes).where(eq(appFeatureVotes.featureId, featureId));
    await db.delete(appFeatureComments).where(eq(appFeatureComments.featureId, featureId));
    await db.delete(appFeatures).where(eq(appFeatures.id, featureId));
  },

  async reorderFeatures(
    updates: Array<{ id: string; sortOrder: number; status?: FeatureStatus }>
  ): Promise<void> {
    for (const update of updates) {
      const setData: { sortOrder: number; status?: FeatureStatus } = {
        sortOrder: update.sortOrder,
      };
      if (update.status !== undefined) {
        setData.status = update.status;
      }
      await db.update(appFeatures).set(setData).where(eq(appFeatures.id, update.id));
    }
  },

  async toggleVote(
    featureId: string,
    userId: string
  ): Promise<{ voted: boolean; voteCount: number }> {
    const [existingVote] = await db
      .select()
      .from(appFeatureVotes)
      .where(and(eq(appFeatureVotes.featureId, featureId), eq(appFeatureVotes.userId, userId)));

    if (existingVote) {
      await db
        .delete(appFeatureVotes)
        .where(and(eq(appFeatureVotes.featureId, featureId), eq(appFeatureVotes.userId, userId)));
    } else {
      await db.insert(appFeatureVotes).values({ featureId, userId });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appFeatureVotes)
      .where(eq(appFeatureVotes.featureId, featureId));

    return { voted: !existingVote, voteCount: Number(count) };
  },

  async getComments(featureId: string): Promise<CommentWithUser[]> {
    const comments = await db
      .select({
        id: appFeatureComments.id,
        featureId: appFeatureComments.featureId,
        userId: appFeatureComments.userId,
        body: appFeatureComments.body,
        createdAt: appFeatureComments.createdAt,
        userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(appFeatureComments)
      .leftJoin(users, eq(appFeatureComments.userId, users.id))
      .where(eq(appFeatureComments.featureId, featureId))
      .orderBy(desc(appFeatureComments.createdAt));

    return comments;
  },

  async createComment(
    featureId: string,
    userId: string,
    body: string
  ): Promise<FeatureComment> {
    const [comment] = await db
      .insert(appFeatureComments)
      .values({ featureId, userId, body })
      .returning();
    return comment;
  },

  async deleteComment(commentId: string): Promise<void> {
    await db.delete(appFeatureComments).where(eq(appFeatureComments.id, commentId));
  },

  async getCategoryById(categoryId: string): Promise<FeatureCategory | null> {
    const [category] = await db
      .select()
      .from(appFeatureCategories)
      .where(eq(appFeatureCategories.id, categoryId));
    return category || null;
  },

  async getIssues(filters?: {
    status?: IssueStatus[];
    severity?: string;
  }): Promise<IssueWithDetails[]> {
    let conditions = [];

    if (filters?.status && filters.status.length > 0) {
      conditions.push(inArray(appIssues.status, filters.status));
    }

    if (filters?.severity) {
      conditions.push(eq(appIssues.severity, filters.severity));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const issues = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        description: appIssues.description,
        status: appIssues.status,
        severity: appIssues.severity,
        createdById: appIssues.createdById,
        fixedAt: appIssues.fixedAt,
        createdAt: appIssues.createdAt,
        updatedAt: appIssues.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appIssues)
      .leftJoin(users, eq(appIssues.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(appIssues.createdAt));

    return issues.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      status: i.status,
      severity: i.severity,
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
  },

  async getIssueById(issueId: string): Promise<IssueWithDetails | null> {
    const [issue] = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        description: appIssues.description,
        status: appIssues.status,
        severity: appIssues.severity,
        createdById: appIssues.createdById,
        fixedAt: appIssues.fixedAt,
        createdAt: appIssues.createdAt,
        updatedAt: appIssues.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByProfileImage: users.profileImageUrl,
      })
      .from(appIssues)
      .leftJoin(users, eq(appIssues.createdById, users.id))
      .where(eq(appIssues.id, issueId));

    if (!issue) return null;

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      severity: issue.severity,
      createdById: issue.createdById,
      fixedAt: issue.fixedAt,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      createdBy: {
        id: issue.createdById,
        firstName: issue.createdByFirstName,
        lastName: issue.createdByLastName,
        profileImageUrl: issue.createdByProfileImage,
      },
    };
  },

  async createIssue(data: InsertAppIssue, userId: string): Promise<AppIssue> {
    const [issue] = await db
      .insert(appIssues)
      .values({ ...data, createdById: userId })
      .returning();
    return issue;
  },

  async updateIssue(
    issueId: string,
    data: Partial<InsertAppIssue>
  ): Promise<AppIssue> {
    const [updated] = await db
      .update(appIssues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appIssues.id, issueId))
      .returning();
    return updated;
  },

  async deleteIssue(issueId: string): Promise<void> {
    await db.delete(appIssues).where(eq(appIssues.id, issueId));
  },

  async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  },
};
