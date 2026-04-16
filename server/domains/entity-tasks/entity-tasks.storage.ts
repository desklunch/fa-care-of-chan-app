import { db } from "../../db";
import { eq, and, asc, desc, sql, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  entityTasks,
  entityTaskCollaborators,
  entityTaskTemplates,
  comments,
  users,
  deals,
  proposals,
  type EntityTask,
  type EntityTaskWithRelations,
  type InsertEntityTask,
  type UpdateEntityTask,
  type EntityTaskTemplate,
  type InsertEntityTaskTemplate,
} from "@shared/schema";

async function resolveEntityNames(
  tasks: { entityType: string; entityId: string }[],
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const dealIds = [...new Set(tasks.filter((t) => t.entityType === "deal").map((t) => t.entityId))];
  const proposalIds = [...new Set(tasks.filter((t) => t.entityType === "proposal").map((t) => t.entityId))];

  if (dealIds.length > 0) {
    const dealRows = await db
      .select({ id: deals.id, displayName: deals.displayName })
      .from(deals)
      .where(inArray(deals.id, dealIds));
    for (const d of dealRows) {
      nameMap.set(`deal:${d.id}`, d.displayName);
    }
  }

  if (proposalIds.length > 0) {
    const proposalRows = await db
      .select({ id: proposals.id, title: proposals.title })
      .from(proposals)
      .where(inArray(proposals.id, proposalIds));
    for (const p of proposalRows) {
      nameMap.set(`proposal:${p.id}`, p.title);
    }
  }

  return nameMap;
}

export const entityTasksStorage = {
  async getTasks(entityType: string, entityId: string): Promise<EntityTaskWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");

    const rows = await db
      .select({
        task: entityTasks,
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(entityTasks)
      .leftJoin(ownerUsers, eq(entityTasks.ownerId, ownerUsers.id))
      .where(
        and(
          eq(entityTasks.entityType, entityType),
          eq(entityTasks.entityId, entityId),
        ),
      )
      .orderBy(asc(entityTasks.sortOrder), asc(entityTasks.createdAt));

    const taskIds = rows.map((r) => r.task.id);
    if (taskIds.length === 0) return [];

    const collabRows = await db
      .select({
        taskId: entityTaskCollaborators.taskId,
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(entityTaskCollaborators)
      .innerJoin(users, eq(entityTaskCollaborators.userId, users.id))
      .where(inArray(entityTaskCollaborators.taskId, taskIds));

    const collabMap = new Map<string, Pick<typeof users.$inferSelect, "id" | "firstName" | "lastName" | "profileImageUrl">[]>();
    for (const c of collabRows) {
      const list = collabMap.get(c.taskId) || [];
      list.push({ id: c.id, firstName: c.firstName, lastName: c.lastName, profileImageUrl: c.profileImageUrl });
      collabMap.set(c.taskId, list);
    }

    const commentCountRows = await db
      .select({
        entityId: comments.entityId,
        count: sql<number>`count(*)::int`,
      })
      .from(comments)
      .where(
        and(
          eq(comments.entityType, "entity_task"),
          inArray(comments.entityId, taskIds),
          isNull(comments.deletedAt),
        ),
      )
      .groupBy(comments.entityId);

    const commentCountMap = new Map<string, number>();
    for (const r of commentCountRows) {
      commentCountMap.set(r.entityId, r.count);
    }

    const entityNameMap = await resolveEntityNames([{ entityType, entityId }]);
    const entityName = entityNameMap.get(`${entityType}:${entityId}`) ?? null;

    return rows.map((r) => ({
      ...r.task,
      owner: r.owner?.id ? r.owner : null,
      collaborators: collabMap.get(r.task.id) || [],
      subTasks: [],
      commentCount: commentCountMap.get(r.task.id) || 0,
      entityName,
    }));
  },

  async getAllTasks(): Promise<EntityTaskWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");

    const rows = await db
      .select({
        task: entityTasks,
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(entityTasks)
      .leftJoin(ownerUsers, eq(entityTasks.ownerId, ownerUsers.id))
      .where(isNull(entityTasks.parentTaskId))
      .orderBy(sql`${entityTasks.createdAt} DESC`);

    const taskIds = rows.map((r) => r.task.id);
    if (taskIds.length === 0) return [];

    const childRows = await db
      .select({
        task: entityTasks,
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(entityTasks)
      .leftJoin(ownerUsers, eq(entityTasks.ownerId, ownerUsers.id))
      .where(inArray(entityTasks.parentTaskId, taskIds));

    const allTaskIds = [...taskIds, ...childRows.map((r) => r.task.id)];

    const collabRows = await db
      .select({
        taskId: entityTaskCollaborators.taskId,
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(entityTaskCollaborators)
      .innerJoin(users, eq(entityTaskCollaborators.userId, users.id))
      .where(inArray(entityTaskCollaborators.taskId, allTaskIds));

    const collabMap = new Map<string, Pick<typeof users.$inferSelect, "id" | "firstName" | "lastName" | "profileImageUrl">[]>();
    for (const c of collabRows) {
      const list = collabMap.get(c.taskId) || [];
      list.push({ id: c.id, firstName: c.firstName, lastName: c.lastName, profileImageUrl: c.profileImageUrl });
      collabMap.set(c.taskId, list);
    }

    const commentCountRows = await db
      .select({
        entityId: comments.entityId,
        count: sql<number>`count(*)::int`,
      })
      .from(comments)
      .where(
        and(
          eq(comments.entityType, "entity_task"),
          inArray(comments.entityId, allTaskIds),
          isNull(comments.deletedAt),
        ),
      )
      .groupBy(comments.entityId);

    const commentCountMap = new Map<string, number>();
    for (const r of commentCountRows) {
      commentCountMap.set(r.entityId, r.count);
    }

    const childMap = new Map<string, EntityTaskWithRelations[]>();
    for (const r of childRows) {
      const list = childMap.get(r.task.parentTaskId!) || [];
      list.push({
        ...r.task,
        owner: r.owner?.id ? r.owner : null,
        collaborators: collabMap.get(r.task.id) || [],
        subTasks: [],
        commentCount: commentCountMap.get(r.task.id) || 0,
      });
      childMap.set(r.task.parentTaskId!, list);
    }

    const allTasks = [...rows.map((r) => r.task), ...childRows.map((r) => r.task)];
    const entityNameMap = await resolveEntityNames(allTasks);

    return rows.map((r) => ({
      ...r.task,
      owner: r.owner?.id ? r.owner : null,
      collaborators: collabMap.get(r.task.id) || [],
      subTasks: (childMap.get(r.task.id) || []).map((sub) => ({
        ...sub,
        entityName: entityNameMap.get(`${sub.entityType}:${sub.entityId}`) ?? null,
      })),
      commentCount: commentCountMap.get(r.task.id) || 0,
      entityName: entityNameMap.get(`${r.task.entityType}:${r.task.entityId}`) ?? null,
    }));
  },

  async getMyTasks(userId: string): Promise<EntityTaskWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");

    const collabTaskIds = await db
      .select({ taskId: entityTaskCollaborators.taskId })
      .from(entityTaskCollaborators)
      .where(eq(entityTaskCollaborators.userId, userId));

    const collabIds = collabTaskIds.map((c) => c.taskId);

    const rows = await db
      .select({
        task: entityTasks,
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(entityTasks)
      .leftJoin(ownerUsers, eq(entityTasks.ownerId, ownerUsers.id))
      .where(
        and(
          isNull(entityTasks.parentTaskId),
          collabIds.length > 0
            ? sql`(${entityTasks.ownerId} = ${userId} OR ${entityTasks.id} IN (${sql.join(collabIds.map(id => sql`${id}`), sql`, `)}))`
            : eq(entityTasks.ownerId, userId),
        ),
      )
      .orderBy(
        sql`${entityTasks.dueDate} ASC NULLS LAST`,
        desc(entityTasks.createdAt),
      );

    if (rows.length === 0) return [];

    const entityNameMap = await resolveEntityNames(rows.map((r) => r.task));

    return rows.map((r) => ({
      ...r.task,
      owner: r.owner?.id ? r.owner : null,
      collaborators: [],
      subTasks: [],
      commentCount: 0,
      entityName: entityNameMap.get(`${r.task.entityType}:${r.task.entityId}`) ?? null,
    }));
  },

  async getTaskById(taskId: string): Promise<EntityTask | null> {
    const [task] = await db
      .select()
      .from(entityTasks)
      .where(eq(entityTasks.id, taskId))
      .limit(1);
    return task ?? null;
  },

  async createTask(data: InsertEntityTask): Promise<EntityTask> {
    const [task] = await db.insert(entityTasks).values(data).returning();
    return task;
  },

  async updateTask(taskId: string, data: Partial<InsertEntityTask>): Promise<EntityTask> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.status === "done") {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== "done") {
      updateData.completedAt = null;
    }
    const [task] = await db
      .update(entityTasks)
      .set(updateData)
      .where(eq(entityTasks.id, taskId))
      .returning();
    return task;
  },

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(entityTasks).where(eq(entityTasks.id, taskId));
  },

  async getTaskCollaborators(taskId: string) {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(entityTaskCollaborators)
      .innerJoin(users, eq(entityTaskCollaborators.userId, users.id))
      .where(eq(entityTaskCollaborators.taskId, taskId));
  },

  async addTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db
      .insert(entityTaskCollaborators)
      .values({ taskId, userId })
      .onConflictDoNothing();
  },

  async removeTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db
      .delete(entityTaskCollaborators)
      .where(
        and(
          eq(entityTaskCollaborators.taskId, taskId),
          eq(entityTaskCollaborators.userId, userId),
        ),
      );
  },

  async getTaskTemplates(entityType?: string): Promise<EntityTaskTemplate[]> {
    let query = db.select().from(entityTaskTemplates);
    if (entityType) {
      query = query.where(eq(entityTaskTemplates.entityType, entityType)) as typeof query;
    }
    return query.orderBy(asc(entityTaskTemplates.sortOrder));
  },

  async createTaskTemplate(data: InsertEntityTaskTemplate): Promise<EntityTaskTemplate> {
    const [template] = await db.insert(entityTaskTemplates).values(data).returning();
    return template;
  },

  async updateTaskTemplate(id: string, data: Partial<InsertEntityTaskTemplate>): Promise<EntityTaskTemplate> {
    const [template] = await db
      .update(entityTaskTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(entityTaskTemplates.id, id))
      .returning();
    return template;
  },

  async deleteTaskTemplate(id: string): Promise<void> {
    await db.delete(entityTaskTemplates).where(eq(entityTaskTemplates.id, id));
  },
};
