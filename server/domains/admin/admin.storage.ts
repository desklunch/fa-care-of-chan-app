/**
 * Admin Domain Storage
 * 
 * Storage methods for admin functionality:
 * - Team management (employees, users)
 * - Admin stats and audit logs
 * - Analytics/Activity tracking
 * 
 * Total: ~13 storage methods
 */

import { db } from "../../db";
import { 
  users, 
  auditLogs,
  analyticsSessions,
  analyticsPageViews,
  analyticsEvents
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import type { 
  User, 
  InsertAnalyticsSession,
  InsertAnalyticsPageView,
  InsertAnalyticsEvent,
  AnalyticsSession,
  AnalyticsPageView,
  AnalyticsEvent
} from "@shared/schema";

export interface AuditLogWithName {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  performedBy: string | null;
  changes: unknown;
  metadata: unknown;
  status: string;
  performedAt: Date;
  userName: string | null;
}

export const adminStorage = {
  // ==================== Team Methods ====================
  
  async getAllEmployees(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(users.firstName, users.lastName);
  },

  async getRecentEmployees(limit: number = 5): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
  },

  // ==================== Admin Stats Methods ====================

  async getStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    recentActivity: number;
  }> {
    const [employeeCount] = await db
      .select({ count: count() })
      .from(users);

    const [activeCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [activityCount] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.performedAt, oneDayAgo));

    return {
      totalEmployees: employeeCount?.count || 0,
      activeEmployees: activeCount?.count || 0,
      recentActivity: activityCount?.count || 0,
    };
  },

  async getRecentAuditLogs(limit: number = 250): Promise<AuditLogWithName[]> {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        performedBy: auditLogs.performedBy,
        changes: auditLogs.changes,
        metadata: auditLogs.metadata,
        status: auditLogs.status,
        performedAt: auditLogs.performedAt,
        performerName: sql<string | null>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('performerName'),
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.performedBy, users.id))
      .orderBy(desc(auditLogs.performedAt))
      .limit(limit);

    return logs;
  },

  // ==================== Analytics/Activity Methods ====================

  async createAnalyticsSession(data: InsertAnalyticsSession): Promise<AnalyticsSession> {
    const [session] = await db
      .insert(analyticsSessions)
      .values(data)
      .returning();
    return session;
  },

  async getAnalyticsSessionByToken(token: string): Promise<AnalyticsSession | undefined> {
    const [session] = await db
      .select()
      .from(analyticsSessions)
      .where(eq(analyticsSessions.sessionToken, token));
    return session;
  },

  async updateAnalyticsSessionActivity(sessionId: string): Promise<void> {
    await db
      .update(analyticsSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(analyticsSessions.id, sessionId));
  },

  async endAnalyticsSession(sessionId: string): Promise<void> {
    await db
      .update(analyticsSessions)
      .set({ endedAt: new Date() })
      .where(eq(analyticsSessions.id, sessionId));
  },

  async createPageView(data: InsertAnalyticsPageView): Promise<AnalyticsPageView> {
    const [pageView] = await db
      .insert(analyticsPageViews)
      .values(data)
      .returning();
    return pageView;
  },

  async updatePageViewDuration(pageViewId: string, durationMs: number): Promise<void> {
    await db
      .update(analyticsPageViews)
      .set({ durationMs })
      .where(eq(analyticsPageViews.id, pageViewId));
  },

  async createAnalyticsEvent(data: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [event] = await db
      .insert(analyticsEvents)
      .values(data)
      .returning();
    return event;
  },

  async getAnalyticsSummary(
    startDate: Date,
    endDate: Date,
    environment?: string
  ): Promise<{
    totalSessions: number;
    totalPageViews: number;
    totalEvents: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    topPages: Array<{ path: string; views: number }>;
    topEvents: Array<{ eventName: string; count: number }>;
  }> {
    const envCondition = environment 
      ? and(
          gte(analyticsSessions.startedAt, startDate),
          lte(analyticsSessions.startedAt, endDate),
          eq(analyticsSessions.environment, environment)
        )
      : and(
          gte(analyticsSessions.startedAt, startDate),
          lte(analyticsSessions.startedAt, endDate)
        );

    const pageViewEnvCondition = environment
      ? and(
          gte(analyticsPageViews.viewedAt, startDate),
          lte(analyticsPageViews.viewedAt, endDate),
          eq(analyticsPageViews.environment, environment)
        )
      : and(
          gte(analyticsPageViews.viewedAt, startDate),
          lte(analyticsPageViews.viewedAt, endDate)
        );

    const eventEnvCondition = environment
      ? and(
          gte(analyticsEvents.occurredAt, startDate),
          lte(analyticsEvents.occurredAt, endDate),
          eq(analyticsEvents.environment, environment)
        )
      : and(
          gte(analyticsEvents.occurredAt, startDate),
          lte(analyticsEvents.occurredAt, endDate)
        );

    const [sessionStats] = await db
      .select({
        totalSessions: count(),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${analyticsSessions.userId})`,
      })
      .from(analyticsSessions)
      .where(envCondition);

    const [pageViewStats] = await db
      .select({ totalPageViews: count() })
      .from(analyticsPageViews)
      .where(pageViewEnvCondition);

    const [eventStats] = await db
      .select({ totalEvents: count() })
      .from(analyticsEvents)
      .where(eventEnvCondition);

    const topPages = await db
      .select({
        path: analyticsPageViews.path,
        views: count(),
      })
      .from(analyticsPageViews)
      .where(pageViewEnvCondition)
      .groupBy(analyticsPageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    const topEvents = await db
      .select({
        eventName: analyticsEvents.eventName,
        count: count(),
      })
      .from(analyticsEvents)
      .where(eventEnvCondition)
      .groupBy(analyticsEvents.eventName)
      .orderBy(desc(count()))
      .limit(10);

    return {
      totalSessions: sessionStats?.totalSessions || 0,
      totalPageViews: pageViewStats?.totalPageViews || 0,
      totalEvents: eventStats?.totalEvents || 0,
      uniqueUsers: sessionStats?.uniqueUsers || 0,
      averageSessionDuration: 0,
      topPages: topPages.map(p => ({ path: p.path, views: Number(p.views) })),
      topEvents: topEvents.map(e => ({ eventName: e.eventName, count: Number(e.count) })),
    };
  },

  async getRecentPageViews(
    limit: number = 50,
    environment?: string
  ): Promise<Array<AnalyticsPageView & { userName?: string }>> {
    const envCondition = environment
      ? eq(analyticsPageViews.environment, environment)
      : undefined;

    const pageViews = await db
      .select({
        id: analyticsPageViews.id,
        sessionId: analyticsPageViews.sessionId,
        userId: analyticsPageViews.userId,
        path: analyticsPageViews.path,
        title: analyticsPageViews.title,
        referrer: analyticsPageViews.referrer,
        durationMs: analyticsPageViews.durationMs,
        environment: analyticsPageViews.environment,
        viewedAt: analyticsPageViews.viewedAt,
        userName: sql<string | null>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('userName'),
      })
      .from(analyticsPageViews)
      .leftJoin(users, eq(analyticsPageViews.userId, users.id))
      .where(envCondition)
      .orderBy(desc(analyticsPageViews.viewedAt))
      .limit(limit);

    return pageViews as Array<AnalyticsPageView & { userName?: string }>;
  },
};
