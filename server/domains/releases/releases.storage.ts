import { db } from "../../db";
import { eq, desc, and, gte, isNull, not, inArray, sql } from "drizzle-orm";
import {
  appReleases,
  appReleaseFeatures,
  appReleaseIssues,
  appReleaseChanges,
  appFeatures,
  appIssues,
  users,
  type AppRelease,
  type AppReleaseFeature,
  type AppReleaseIssue,
  type AppReleaseChange,
  type InsertAppRelease,
  type InsertAppReleaseChange,
  type ReleaseStatus,
} from "@shared/schema";

export interface ReleaseWithDetails extends AppRelease {
  createdByName?: string | null;
  features?: Array<{
    id: string;
    featureId: string;
    featureTitle: string;
    notes: string | null;
  }>;
  issues?: Array<{
    id: string;
    issueId: string;
    issueTitle: string;
    notes: string | null;
  }>;
  changes?: AppReleaseChange[];
}

export const releasesStorage = {
  async getReleases(status?: ReleaseStatus): Promise<ReleaseWithDetails[]> {
    let query = db
      .select({
        id: appReleases.id,
        versionLabel: appReleases.versionLabel,
        title: appReleases.title,
        description: appReleases.description,
        status: appReleases.status,
        releaseDate: appReleases.releaseDate,
        createdById: appReleases.createdById,
        createdAt: appReleases.createdAt,
        updatedAt: appReleases.updatedAt,
        createdByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(appReleases)
      .leftJoin(users, eq(appReleases.createdById, users.id))
      .orderBy(desc(appReleases.createdAt))
      .$dynamic();

    if (status) {
      query = query.where(eq(appReleases.status, status));
    }

    return await query;
  },

  async getReleaseById(releaseId: string): Promise<ReleaseWithDetails | null> {
    const [release] = await db
      .select({
        id: appReleases.id,
        versionLabel: appReleases.versionLabel,
        title: appReleases.title,
        description: appReleases.description,
        status: appReleases.status,
        releaseDate: appReleases.releaseDate,
        createdById: appReleases.createdById,
        createdAt: appReleases.createdAt,
        updatedAt: appReleases.updatedAt,
        createdByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      })
      .from(appReleases)
      .leftJoin(users, eq(appReleases.createdById, users.id))
      .where(eq(appReleases.id, releaseId));

    if (!release) return null;

    const features = await db
      .select({
        id: appReleaseFeatures.id,
        featureId: appReleaseFeatures.featureId,
        featureTitle: appFeatures.title,
        notes: appReleaseFeatures.notes,
      })
      .from(appReleaseFeatures)
      .leftJoin(appFeatures, eq(appReleaseFeatures.featureId, appFeatures.id))
      .where(eq(appReleaseFeatures.releaseId, releaseId));

    const issues = await db
      .select({
        id: appReleaseIssues.id,
        issueId: appReleaseIssues.issueId,
        issueTitle: appIssues.title,
        notes: appReleaseIssues.notes,
      })
      .from(appReleaseIssues)
      .leftJoin(appIssues, eq(appReleaseIssues.issueId, appIssues.id))
      .where(eq(appReleaseIssues.releaseId, releaseId));

    const changes = await db
      .select()
      .from(appReleaseChanges)
      .where(eq(appReleaseChanges.releaseId, releaseId))
      .orderBy(desc(appReleaseChanges.createdAt));

    return {
      ...release,
      features: features as any[],
      issues: issues as any[],
      changes,
    };
  },

  async createRelease(data: InsertAppRelease, userId: string): Promise<AppRelease> {
    const [release] = await db
      .insert(appReleases)
      .values({ ...data, createdById: userId })
      .returning();
    return release;
  },

  async updateRelease(
    releaseId: string,
    data: Partial<InsertAppRelease>
  ): Promise<AppRelease> {
    const [updated] = await db
      .update(appReleases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appReleases.id, releaseId))
      .returning();
    return updated;
  },

  async publishRelease(releaseId: string): Promise<AppRelease> {
    const [updated] = await db
      .update(appReleases)
      .set({ status: "released", releaseDate: new Date(), updatedAt: new Date() })
      .where(eq(appReleases.id, releaseId))
      .returning();
    return updated;
  },

  async deleteRelease(releaseId: string): Promise<void> {
    await db.delete(appReleaseFeatures).where(eq(appReleaseFeatures.releaseId, releaseId));
    await db.delete(appReleaseIssues).where(eq(appReleaseIssues.releaseId, releaseId));
    await db.delete(appReleaseChanges).where(eq(appReleaseChanges.releaseId, releaseId));
    await db.delete(appReleases).where(eq(appReleases.id, releaseId));
  },

  async addFeatureToRelease(
    releaseId: string,
    featureId: string,
    notes?: string
  ): Promise<AppReleaseFeature> {
    const [releaseFeature] = await db
      .insert(appReleaseFeatures)
      .values({ releaseId, featureId, notes: notes || null })
      .returning();
    return releaseFeature;
  },

  async removeFeatureFromRelease(releaseId: string, featureId: string): Promise<void> {
    await db
      .delete(appReleaseFeatures)
      .where(
        and(
          eq(appReleaseFeatures.releaseId, releaseId),
          eq(appReleaseFeatures.featureId, featureId)
        )
      );
  },

  async addIssueToRelease(
    releaseId: string,
    issueId: string,
    notes?: string
  ): Promise<AppReleaseIssue> {
    const [releaseIssue] = await db
      .insert(appReleaseIssues)
      .values({ releaseId, issueId, notes: notes || null })
      .returning();
    return releaseIssue;
  },

  async removeIssueFromRelease(releaseId: string, issueId: string): Promise<void> {
    await db
      .delete(appReleaseIssues)
      .where(
        and(
          eq(appReleaseIssues.releaseId, releaseId),
          eq(appReleaseIssues.issueId, issueId)
        )
      );
  },

  async addChangeToRelease(
    releaseId: string,
    data: InsertAppReleaseChange,
    userId: string
  ): Promise<AppReleaseChange> {
    const [change] = await db
      .insert(appReleaseChanges)
      .values({ ...data, releaseId, createdById: userId })
      .returning();
    return change;
  },

  async removeChangeFromRelease(changeId: string): Promise<void> {
    await db.delete(appReleaseChanges).where(eq(appReleaseChanges.id, changeId));
  },

  async getLatestReleasedVersion(): Promise<AppRelease | null> {
    const [release] = await db
      .select()
      .from(appReleases)
      .where(eq(appReleases.status, "released"))
      .orderBy(desc(appReleases.releaseDate))
      .limit(1);
    return release || null;
  },

  async getCompletedFeaturesNotInRelease(sinceDate?: Date): Promise<Array<{
    id: string;
    title: string;
    completedAt: Date | null;
  }>> {
    const releasedFeatureIds = db
      .select({ featureId: appReleaseFeatures.featureId })
      .from(appReleaseFeatures);

    let conditions = [
      eq(appFeatures.status, "completed"),
      not(inArray(appFeatures.id, releasedFeatureIds)),
    ];

    if (sinceDate) {
      conditions.push(gte(appFeatures.completedAt, sinceDate));
    }

    const features = await db
      .select({
        id: appFeatures.id,
        title: appFeatures.title,
        completedAt: appFeatures.completedAt,
      })
      .from(appFeatures)
      .where(and(...conditions))
      .orderBy(desc(appFeatures.completedAt));

    return features;
  },

  async getFixedIssuesNotInRelease(sinceDate?: Date): Promise<Array<{
    id: string;
    title: string;
    resolvedAt: Date | null;
  }>> {
    const releasedIssueIds = db
      .select({ issueId: appReleaseIssues.issueId })
      .from(appReleaseIssues);

    let conditions = [
      eq(appIssues.status, "fixed"),
      not(inArray(appIssues.id, releasedIssueIds)),
    ];

    if (sinceDate) {
      conditions.push(gte(appIssues.resolvedAt, sinceDate));
    }

    const issues = await db
      .select({
        id: appIssues.id,
        title: appIssues.title,
        resolvedAt: appIssues.resolvedAt,
      })
      .from(appIssues)
      .where(and(...conditions))
      .orderBy(desc(appIssues.resolvedAt));

    return issues;
  },
};
