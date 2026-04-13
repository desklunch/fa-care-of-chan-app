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
import { pool } from "../../db";
import { 
  users, 
  auditLogs,
  analyticsSessions,
  analyticsPageViews,
  analyticsEvents,
  roles,
  deals,
  venues,
  vendors,
  contacts,
  clients,
  appFeatures,
  appIssues,
  comments,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count, inArray } from "drizzle-orm";
import type { 
  User, 
  InsertAnalyticsSession,
  InsertAnalyticsPageView,
  InsertAnalyticsEvent,
  AnalyticsSession,
  AnalyticsPageView,
  AnalyticsEvent,
  RoleRecord,
  InsertRole
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

  async getAuditLogsByUser(userId: string, limit: number = 25) {
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
      .where(eq(auditLogs.performedBy, userId))
      .orderBy(desc(auditLogs.performedAt))
      .limit(limit);

    const idsByType: Record<string, Set<string>> = {};
    for (const log of logs) {
      if (log.entityId) {
        const type = log.entityType;
        if (type === "comment") {
          const ch = log.changes as any;
          if (ch?.entityType && ch?.entityId) {
            if (!idsByType[ch.entityType]) idsByType[ch.entityType] = new Set();
            idsByType[ch.entityType].add(ch.entityId);
          }
        } else {
          if (!idsByType[type]) idsByType[type] = new Set();
          idsByType[type].add(log.entityId);
        }
      }
    }

    const nameMap: Record<string, string> = {};

    const resolvers: Array<() => Promise<void>> = [];
    if (idsByType["deal"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["deal"]];
        const rows = await db.select({ id: deals.id, displayName: deals.displayName }).from(deals).where(inArray(deals.id, ids));
        for (const r of rows) nameMap[`deal:${r.id}`] = r.displayName;
      });
    }
    if (idsByType["venue"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["venue"]];
        const rows = await db.select({ id: venues.id, name: venues.name }).from(venues).where(inArray(venues.id, ids));
        for (const r of rows) nameMap[`venue:${r.id}`] = r.name;
      });
    }
    if (idsByType["vendor"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["vendor"]];
        const rows = await db.select({ id: vendors.id, businessName: vendors.businessName }).from(vendors).where(inArray(vendors.id, ids));
        for (const r of rows) nameMap[`vendor:${r.id}`] = r.businessName;
      });
    }
    if (idsByType["contact"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["contact"]];
        const rows = await db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName }).from(contacts).where(inArray(contacts.id, ids));
        for (const r of rows) nameMap[`contact:${r.id}`] = [r.firstName, r.lastName].filter(Boolean).join(" ");
      });
    }
    if (idsByType["client"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["client"]];
        const rows = await db.select({ id: clients.id, name: clients.name }).from(clients).where(inArray(clients.id, ids));
        for (const r of rows) nameMap[`client:${r.id}`] = r.name;
      });
    }
    if (idsByType["app_feature"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["app_feature"]];
        const rows = await db.select({ id: appFeatures.id, title: appFeatures.title }).from(appFeatures).where(inArray(appFeatures.id, ids));
        for (const r of rows) nameMap[`app_feature:${r.id}`] = r.title;
      });
    }
    if (idsByType["app_issue"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["app_issue"]];
        const rows = await db.select({ id: appIssues.id, title: appIssues.title }).from(appIssues).where(inArray(appIssues.id, ids));
        for (const r of rows) nameMap[`app_issue:${r.id}`] = r.title;
      });
    }
    if (idsByType["user"]?.size) {
      resolvers.push(async () => {
        const ids = [...idsByType["user"]];
        const rows = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(inArray(users.id, ids));
        for (const r of rows) nameMap[`user:${r.id}`] = [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || r.id;
      });
    }

    await Promise.all(resolvers.map(r => r()));

    return logs.map((log) => {
      let entityName: string | null = null;
      let resolvedEntityType: string | null = null;
      let resolvedEntityId: string | null = null;

      if (log.entityType === "comment") {
        const ch = log.changes as any;
        if (ch?.entityType && ch?.entityId) {
          resolvedEntityType = ch.entityType;
          resolvedEntityId = ch.entityId;
          entityName = nameMap[`${ch.entityType}:${ch.entityId}`] || null;
        }
      } else if (log.entityId) {
        resolvedEntityType = log.entityType;
        resolvedEntityId = log.entityId;
        entityName = nameMap[`${log.entityType}:${log.entityId}`] || null;
      }

      return {
        ...log,
        entityName,
        resolvedEntityType,
        resolvedEntityId,
      };
    });
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

  async getAllRoles(): Promise<RoleRecord[]> {
    return db.select().from(roles).orderBy(roles.id);
  },

  async getRoleByName(name: string): Promise<RoleRecord | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  },

  async getRoleById(id: number): Promise<RoleRecord | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  },

  async createRole(data: InsertRole): Promise<RoleRecord> {
    const [role] = await db.insert(roles).values(data).returning();
    return role;
  },

  async updateRole(id: number, data: Partial<InsertRole>): Promise<RoleRecord | undefined> {
    const [role] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return role;
  },

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  },

  async getUserCountByRole(roleName: string): Promise<number> {
    const result = await db.select({ count: count() }).from(users).where(eq(users.role, roleName));
    return result[0]?.count ?? 0;
  },

  async renameUsersRole(oldName: string, newName: string): Promise<void> {
    await db.update(users).set({ role: newName }).where(eq(users.role, oldName));
  },

  async invalidatePermissionCacheForUser(userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE sessions
         SET sess = sess #- '{permissionContext}'
         WHERE sess->>'userId' = $1`,
        [userId]
      );
    } catch (error) {
      console.error("Error invalidating permission cache for user:", userId, error);
    }
  },

  async invalidatePermissionCacheForRole(roleName: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE sessions
         SET sess = sess #- '{permissionContext}'
         WHERE sess->'permissionContext'->>'role' = $1`,
        [roleName]
      );
    } catch (error) {
      console.error("Error invalidating permission cache for role:", roleName, error);
    }
  },
};
