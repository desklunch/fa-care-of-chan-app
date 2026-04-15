import { db } from "../../db";
import { eq, and, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  proposals,
  proposalStatusRecords,
  proposalTasks,
  proposalTaskCollaborators,
  proposalTaskTemplates,
  proposalStakeholders,
  entityTeamMembers,
  comments,
  deals,
  clients,
  contacts,
  users,
  type Proposal,
  type ProposalWithRelations,
  type InsertProposal,
  type UpdateProposal,
  type ProposalStatusRecord,
  type ProposalTask,
  type ProposalTaskWithRelations,
  type InsertProposalTask,
  type UpdateProposalTask,
  type ProposalTaskTemplate,
  type InsertProposalTaskTemplate,
  type ProposalStakeholder,
  type EntityTeamMember,
  type EntityTeamMemberWithUser,
} from "@shared/schema";

export const proposalsStorage = {
  async getProposalStatuses(): Promise<ProposalStatusRecord[]> {
    return db
      .select()
      .from(proposalStatusRecords)
      .orderBy(asc(proposalStatusRecords.sortOrder));
  },

  async getDefaultStatus(): Promise<ProposalStatusRecord | null> {
    const [status] = await db
      .select()
      .from(proposalStatusRecords)
      .where(eq(proposalStatusRecords.isDefault, true))
      .limit(1);
    return status ?? null;
  },

  async getProposals(): Promise<ProposalWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    const createdByUsers = alias(users, "created_by_users");

    const rows = await db
      .select({
        proposal: proposals,
        statusName: proposalStatusRecords.label,
        statusColor: proposalStatusRecords.color,
        deal: {
          id: deals.id,
          displayName: deals.displayName,
          dealNumber: deals.dealNumber,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
        createdBy: {
          id: createdByUsers.id,
          firstName: createdByUsers.firstName,
          lastName: createdByUsers.lastName,
          profileImageUrl: createdByUsers.profileImageUrl,
        },
      })
      .from(proposals)
      .leftJoin(proposalStatusRecords, eq(proposals.status, proposalStatusRecords.id))
      .leftJoin(deals, eq(proposals.dealId, deals.id))
      .leftJoin(clients, eq(proposals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(proposals.ownerId, ownerUsers.id))
      .leftJoin(createdByUsers, eq(proposals.createdById, createdByUsers.id))
      .orderBy(desc(proposals.createdAt));

    return rows.map((r) => ({
      ...r.proposal,
      statusName: r.statusName ?? undefined,
      statusColor: r.statusColor,
      deal: r.deal?.id ? r.deal : null,
      client: r.client?.id ? r.client : null,
      owner: r.owner?.id ? r.owner : null,
      createdBy: r.createdBy?.id ? r.createdBy : null,
    }));
  },

  async getProposalById(id: string): Promise<ProposalWithRelations | null> {
    const ownerUsers = alias(users, "owner_users");
    const createdByUsers = alias(users, "created_by_users");

    const [row] = await db
      .select({
        proposal: proposals,
        statusName: proposalStatusRecords.label,
        statusColor: proposalStatusRecords.color,
        deal: {
          id: deals.id,
          displayName: deals.displayName,
          dealNumber: deals.dealNumber,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
        createdBy: {
          id: createdByUsers.id,
          firstName: createdByUsers.firstName,
          lastName: createdByUsers.lastName,
          profileImageUrl: createdByUsers.profileImageUrl,
        },
      })
      .from(proposals)
      .leftJoin(proposalStatusRecords, eq(proposals.status, proposalStatusRecords.id))
      .leftJoin(deals, eq(proposals.dealId, deals.id))
      .leftJoin(clients, eq(proposals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(proposals.ownerId, ownerUsers.id))
      .leftJoin(createdByUsers, eq(proposals.createdById, createdByUsers.id))
      .where(eq(proposals.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row.proposal,
      statusName: row.statusName ?? undefined,
      statusColor: row.statusColor,
      deal: row.deal?.id ? row.deal : null,
      client: row.client?.id ? row.client : null,
      owner: row.owner?.id ? row.owner : null,
      createdBy: row.createdBy?.id ? row.createdBy : null,
    };
  },

  async getProposalByDealId(dealId: string): Promise<Proposal | null> {
    const [row] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.dealId, dealId))
      .limit(1);
    return row ?? null;
  },

  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values(data).returning();
    return proposal;
  },

  async updateProposal(id: string, data: Partial<UpdateProposal>): Promise<Proposal> {
    const fields: Record<string, unknown> = { ...data, updatedAt: new Date() };
    const [proposal] = await db
      .update(proposals)
      .set(fields as Partial<typeof proposals.$inferInsert>)
      .where(eq(proposals.id, id))
      .returning();
    return proposal;
  },

  async deleteProposal(id: string): Promise<void> {
    await db.delete(proposals).where(eq(proposals.id, id));
  },

  // Tasks
  async getTasks(proposalId: string): Promise<ProposalTaskWithRelations[]> {
    const rows = await db
      .select({
        task: proposalTasks,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(proposalTasks)
      .leftJoin(users, eq(proposalTasks.ownerId, users.id))
      .where(eq(proposalTasks.proposalId, proposalId))
      .orderBy(asc(proposalTasks.sortOrder), asc(proposalTasks.createdAt));

    const taskIds = rows.map((r) => r.task.id);
    if (taskIds.length === 0) return [];

    const collabRows = await db
      .select({
        taskId: proposalTaskCollaborators.taskId,
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(proposalTaskCollaborators)
      .innerJoin(users, eq(proposalTaskCollaborators.userId, users.id))
      .where(inArray(proposalTaskCollaborators.taskId, taskIds));

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
          eq(comments.entityType, "proposal_task"),
          inArray(comments.entityId, taskIds),
          isNull(comments.deletedAt),
        ),
      )
      .groupBy(comments.entityId);

    const commentCountMap = new Map<string, number>();
    for (const r of commentCountRows) {
      commentCountMap.set(r.entityId, r.count);
    }

    return rows.map((r) => ({
      ...r.task,
      owner: r.owner?.id ? r.owner : null,
      collaborators: collabMap.get(r.task.id) || [],
      subTasks: [],
      commentCount: commentCountMap.get(r.task.id) || 0,
    }));
  },

  async getTaskById(taskId: string): Promise<ProposalTask | null> {
    const [task] = await db
      .select()
      .from(proposalTasks)
      .where(eq(proposalTasks.id, taskId))
      .limit(1);
    return task ?? null;
  },

  async createTask(data: InsertProposalTask): Promise<ProposalTask> {
    const [task] = await db.insert(proposalTasks).values(data).returning();
    return task;
  },

  async updateTask(taskId: string, data: Partial<InsertProposalTask>): Promise<ProposalTask> {
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.status === "done") {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== "done") {
      updateData.completedAt = null;
    }
    const [task] = await db
      .update(proposalTasks)
      .set(updateData)
      .where(eq(proposalTasks.id, taskId))
      .returning();
    return task;
  },

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(proposalTasks).where(eq(proposalTasks.id, taskId));
  },

  // Task collaborators
  async getTaskCollaborators(taskId: string) {
    return db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(proposalTaskCollaborators)
      .innerJoin(users, eq(proposalTaskCollaborators.userId, users.id))
      .where(eq(proposalTaskCollaborators.taskId, taskId));
  },

  async addTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db
      .insert(proposalTaskCollaborators)
      .values({ taskId, userId })
      .onConflictDoNothing();
  },

  async removeTaskCollaborator(taskId: string, userId: string): Promise<void> {
    await db
      .delete(proposalTaskCollaborators)
      .where(
        and(
          eq(proposalTaskCollaborators.taskId, taskId),
          eq(proposalTaskCollaborators.userId, userId),
        ),
      );
  },

  // Task templates
  async getTaskTemplates(): Promise<ProposalTaskTemplate[]> {
    return db
      .select()
      .from(proposalTaskTemplates)
      .orderBy(asc(proposalTaskTemplates.sortOrder));
  },

  async createTaskTemplate(data: InsertProposalTaskTemplate): Promise<ProposalTaskTemplate> {
    const [template] = await db.insert(proposalTaskTemplates).values(data).returning();
    return template;
  },

  async updateTaskTemplate(
    id: string,
    data: Partial<InsertProposalTaskTemplate>,
  ): Promise<ProposalTaskTemplate> {
    const [template] = await db
      .update(proposalTaskTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(proposalTaskTemplates.id, id))
      .returning();
    return template;
  },

  async deleteTaskTemplate(id: string): Promise<void> {
    await db.delete(proposalTaskTemplates).where(eq(proposalTaskTemplates.id, id));
  },

  // Stakeholders
  async getStakeholders(proposalId: string) {
    const rows = await db
      .select({
        stakeholder: proposalStakeholders,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          email: users.email,
        },
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          emailAddresses: contacts.emailAddresses,
          jobTitle: contacts.jobTitle,
        },
      })
      .from(proposalStakeholders)
      .leftJoin(users, eq(proposalStakeholders.userId, users.id))
      .leftJoin(contacts, eq(proposalStakeholders.contactId, contacts.id))
      .where(eq(proposalStakeholders.proposalId, proposalId))
      .orderBy(asc(proposalStakeholders.createdAt));

    return rows.map((r) => ({
      ...r.stakeholder,
      user: r.user?.id ? r.user : null,
      contact: r.contact?.id ? r.contact : null,
    }));
  },

  async addStakeholder(data: {
    proposalId: string;
    userId?: string;
    contactId?: string;
  }): Promise<ProposalStakeholder> {
    const [stakeholder] = await db
      .insert(proposalStakeholders)
      .values(data)
      .returning();
    return stakeholder;
  },

  async getStakeholderById(id: string): Promise<ProposalStakeholder | null> {
    const [stakeholder] = await db
      .select()
      .from(proposalStakeholders)
      .where(eq(proposalStakeholders.id, id))
      .limit(1);
    return stakeholder ?? null;
  },

  async removeStakeholder(id: string): Promise<void> {
    await db
      .delete(proposalStakeholders)
      .where(eq(proposalStakeholders.id, id));
  },

  // Entity team members
  async getTeamMembers(
    entityType: string,
    entityId: string,
  ): Promise<EntityTeamMemberWithUser[]> {
    const rows = await db
      .select({
        member: entityTeamMembers,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(entityTeamMembers)
      .innerJoin(users, eq(entityTeamMembers.userId, users.id))
      .where(
        and(
          eq(entityTeamMembers.entityType, entityType),
          eq(entityTeamMembers.entityId, entityId),
        ),
      )
      .orderBy(asc(entityTeamMembers.sortOrder));

    return rows.map((r) => ({
      ...r.member,
      user: r.user,
    }));
  },

  async getTeamMemberById(id: string): Promise<EntityTeamMember | null> {
    const [member] = await db
      .select()
      .from(entityTeamMembers)
      .where(eq(entityTeamMembers.id, id))
      .limit(1);
    return member ?? null;
  },

  async addTeamMember(data: {
    entityType: string;
    entityId: string;
    userId: string;
    role?: string;
    sortOrder?: number;
  }): Promise<EntityTeamMember> {
    const existing = await db
      .select()
      .from(entityTeamMembers)
      .where(
        and(
          eq(entityTeamMembers.entityType, data.entityType),
          eq(entityTeamMembers.entityId, data.entityId),
          eq(entityTeamMembers.userId, data.userId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const [member] = await db
      .insert(entityTeamMembers)
      .values(data)
      .returning();
    return member;
  },

  async updateTeamMember(
    id: string,
    data: { role?: string; sortOrder?: number },
  ): Promise<EntityTeamMember> {
    const [member] = await db
      .update(entityTeamMembers)
      .set(data)
      .where(eq(entityTeamMembers.id, id))
      .returning();
    return member;
  },

  async removeTeamMember(id: string): Promise<void> {
    await db.delete(entityTeamMembers).where(eq(entityTeamMembers.id, id));
  },

  // Seed proposal status records
  async seedProposalStatuses(): Promise<void> {
    const existing = await db.select().from(proposalStatusRecords).limit(1);
    if (existing.length > 0) return;

    await db.insert(proposalStatusRecords).values([
      { name: "draft", label: "Draft", color: "#6B7280", sortOrder: 0, isActive: true, isDefault: true },
      { name: "in_review", label: "In Review", color: "#F59E0B", sortOrder: 1, isActive: true, isDefault: false },
      { name: "revised", label: "Revised", color: "#8B5CF6", sortOrder: 2, isActive: true, isDefault: false },
      { name: "approved", label: "Approved", color: "#10B981", sortOrder: 3, isActive: true, isDefault: false },
      { name: "rejected", label: "Rejected", color: "#EF4444", sortOrder: 4, isActive: true, isDefault: false },
    ]);
  },
};
