import { db } from "../../db";
import { eq, and, desc, asc, sql, gte, lte, lt, isNotNull, not, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  auditLogs,
  dealClients,
  dealTags,
  dealIntakes,
  dealServices,
  dealStatuses,
  dealTasks,
  tags,
  clients,
  deals,
  users,
  contacts,
  industries,
  computeEarliestEventDate,
  type Deal,
  type DealWithRelations,
  type CreateDeal,
  type UpdateDeal,
  type DealStatus,
  type DealStatusRecord,
  type InsertDealStatus,
  type DealService,
  type InsertDealService,
  type DealTask,
  type DealTaskWithRelations,
  type CreateDealTask,
  type DealIntake,
  type DealIntakeWithRelations,
  type CreateDealIntake,
  type UpdateDealIntake,
  type FormSection,
  type DealLocation,
  type DealEvent,
} from "@shared/schema";

export interface ForecastDealRow {
  id: string;
  displayName: string;
  status: number;
  statusName: string | null;
  clientId: string;
  clientName: string | null;
  budgetLow: number | null;
  budgetHigh: number | null;
  locations: DealLocation[];
  eventSchedule: DealEvent[];
  serviceIds: number[] | null;
  earliestEventDate: string | null;
}

export interface DealLinkedClient {
  dealId: string;
  clientId: string;
  clientName: string;
  label: string | null;
  createdAt: Date | null;
}

export interface LinkedDealForClient extends DealWithRelations {
  linkLabel: string | null;
}

export interface PipelineDealRow {
  id: string;
  displayName: string;
  status: number;
  statusName: string | null;
  clientId: string;
  clientName: string | null;
  budgetLow: number | null;
  budgetHigh: number | null;
  startedOn: string | null;
  lastContactOn: string | null;
  createdAt: Date | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
}

export interface StatusTransitionRow {
  entityId: string;
  performedAt: Date | null;
  changes: unknown;
}

export const dealsStorage = {
  async linkDealClient(dealId: string, clientId: string, label?: string | null): Promise<void> {
    await db
      .insert(dealClients)
      .values({ dealId, clientId, label: label || null })
      .onConflictDoNothing();
  },

  async unlinkDealClient(dealId: string, clientId: string): Promise<void> {
    await db.delete(dealClients).where(
      and(
        eq(dealClients.dealId, dealId),
        eq(dealClients.clientId, clientId)
      )
    );
  },

  async getLinkedClientsByDealId(dealId: string): Promise<DealLinkedClient[]> {
    const results = await db
      .select({
        dealId: dealClients.dealId,
        clientId: dealClients.clientId,
        clientName: clients.name,
        label: dealClients.label,
        createdAt: dealClients.createdAt,
      })
      .from(dealClients)
      .innerJoin(clients, eq(dealClients.clientId, clients.id))
      .where(eq(dealClients.dealId, dealId))
      .orderBy(dealClients.createdAt);
    return results;
  },

  async getLinkedDealsByClientId(clientId: string): Promise<LinkedDealForClient[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        clientId: deals.clientId,
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
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
        createdById: deals.createdById,
        createdAt: deals.createdAt,
        updatedAt: deals.updatedAt,
        sortOrder: deals.sortOrder,
        linkLabel: dealClients.label,
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
      .from(dealClients)
      .innerJoin(deals, eq(dealClients.dealId, deals.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(dealClients.clientId, clientId))
      .orderBy(desc(deals.createdAt));
    return results as LinkedDealForClient[];
  },

  async getDealTagIds(dealId: string): Promise<string[]> {
    const results = await db
      .select({ tagId: dealTags.tagId })
      .from(dealTags)
      .where(eq(dealTags.dealId, dealId));
    return results.map(r => r.tagId);
  },

  async setDealTags(dealId: string, tagIds: string[]): Promise<void> {
    await db.delete(dealTags).where(eq(dealTags.dealId, dealId));
    if (tagIds.length > 0) {
      await db.insert(dealTags).values(
        tagIds.map(tagId => ({ dealId, tagId }))
      );
    }
  },

  async getAllDealTags(): Promise<{ dealId: string; tagId: string; tagName: string }[]> {
    const results = await db
      .select({
        dealId: dealTags.dealId,
        tagId: dealTags.tagId,
        tagName: tags.name,
      })
      .from(dealTags)
      .innerJoin(tags, eq(dealTags.tagId, tags.id));
    return results;
  },

  async getDealIntake(dealId: string): Promise<DealIntakeWithRelations | null> {
    const results = await db
      .select({
        id: dealIntakes.id,
        dealId: dealIntakes.dealId,
        templateId: dealIntakes.templateId,
        templateName: dealIntakes.templateName,
        formSchema: dealIntakes.formSchema,
        responseData: dealIntakes.responseData,
        status: dealIntakes.status,
        completedAt: dealIntakes.completedAt,
        createdById: dealIntakes.createdById,
        createdAt: dealIntakes.createdAt,
        updatedAt: dealIntakes.updatedAt,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(dealIntakes)
      .leftJoin(users, eq(dealIntakes.createdById, users.id))
      .where(eq(dealIntakes.dealId, dealId));

    if (results.length === 0) return null;

    const r = results[0];
    return {
      id: r.id,
      dealId: r.dealId,
      templateId: r.templateId,
      templateName: r.templateName,
      formSchema: r.formSchema as FormSection[],
      responseData: r.responseData as Record<string, unknown>,
      status: r.status,
      completedAt: r.completedAt,
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
    };
  },

  async createDealIntake(data: CreateDealIntake, createdById: string): Promise<DealIntake> {
    const [intake] = await db
      .insert(dealIntakes)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return intake;
  },

  async updateDealIntake(dealId: string, data: UpdateDealIntake): Promise<DealIntake | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      status: "draft",
      completedAt: null,
    };
    if (data.responseData !== undefined) updateData.responseData = data.responseData;
    if (data.formSchema !== undefined) updateData.formSchema = data.formSchema;

    const [intake] = await db
      .update(dealIntakes)
      .set(updateData)
      .where(eq(dealIntakes.dealId, dealId))
      .returning();
    return intake || null;
  },

  async deleteDealIntake(dealId: string): Promise<void> {
    await db.delete(dealIntakes).where(eq(dealIntakes.dealId, dealId));
  },

  async getDealsForForecast(startDate: string, endDate: string): Promise<ForecastDealRow[]> {
    const results = await db
      .select({
        id: deals.id,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
        clientName: clients.name,
        budgetLow: deals.budgetLow,
        budgetHigh: deals.budgetHigh,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        earliestEventDate: deals.earliestEventDate,
      })
      .from(deals)
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .where(
        and(
          isNotNull(deals.earliestEventDate),
          gte(deals.earliestEventDate, startDate),
          lte(deals.earliestEventDate, endDate)
        )
      )
      .orderBy(deals.earliestEventDate);
    return results as ForecastDealRow[];
  },

  async getAllDealServices(): Promise<{ id: number; name: string }[]> {
    const results = await db
      .select({
        id: dealServices.id,
        name: dealServices.name,
      })
      .from(dealServices);
    return results;
  },

  async getPipelineDeals(activeStatuses: string[]): Promise<PipelineDealRow[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
        clientName: clients.name,
        budgetLow: deals.budgetLow,
        budgetHigh: deals.budgetHigh,
        startedOn: deals.startedOn,
        lastContactOn: deals.lastContactOn,
        createdAt: deals.createdAt,
        ownerFirstName: ownerUsers.firstName,
        ownerLastName: ownerUsers.lastName,
      })
      .from(deals)
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .where(inArray(dealStatuses.name, activeStatuses))
      .orderBy(deals.createdAt);
    return results as PipelineDealRow[];
  },

  async getStatusTransitions(): Promise<StatusTransitionRow[]> {
    const results = await db
      .select({
        entityId: auditLogs.entityId,
        performedAt: auditLogs.performedAt,
        changes: auditLogs.changes,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "deal"),
          eq(auditLogs.action, "update"),
          eq(auditLogs.status, "success"),
          sql`${auditLogs.changes}::jsonb->>'status' IS NOT NULL`
        )
      )
      .orderBy(auditLogs.performedAt);
    return results as StatusTransitionRow[];
  },

  async getDealStatuses(): Promise<DealStatusRecord[]> {
    return db.select().from(dealStatuses).orderBy(asc(dealStatuses.sortOrder));
  },

  async getDealStatusByName(name: string): Promise<DealStatusRecord | undefined> {
    const [result] = await db.select().from(dealStatuses).where(eq(dealStatuses.name, name));
    return result;
  },

  async getDealStatusById(id: number): Promise<DealStatusRecord | undefined> {
    const [result] = await db.select().from(dealStatuses).where(eq(dealStatuses.id, id));
    return result;
  },

  async updateDealStatus(id: number, data: Partial<InsertDealStatus>): Promise<DealStatusRecord | undefined> {
    const [result] = await db
      .update(dealStatuses)
      .set(data)
      .where(eq(dealStatuses.id, id))
      .returning();
    return result;
  },

  async getDeals(options?: { status?: DealStatus[] }): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    let query = db
      .select({
        id: deals.id,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
        budgetHigh: deals.budgetHigh,
        budgetLow: deals.budgetLow,
        budgetNotes: deals.budgetNotes,
        startedOn: deals.startedOn,
        wonOn: deals.wonOn,
        lastContactOn: deals.lastContactOn,
        proposalSentOn: deals.proposalSentOn,
        projectDate: deals.projectDate,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        locationsText: deals.locationsText,
        concept: deals.concept,
        notes: deals.notes,
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
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
          industryId: clients.industryId,
          industryName: industries.name,
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
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(industries, eq(clients.industryId, industries.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id));

    if (options?.status && options.status.length > 0) {
      query = query.where(inArray(dealStatuses.name, options.status)) as any;
    }

    const results = await query.orderBy(desc(deals.sortOrder), desc(deals.dealNumber));
    return results as DealWithRelations[];
  },

  async getDealById(id: string): Promise<DealWithRelations | undefined> {
    const ownerUsers = alias(users, "owner_users");
    const [result] = await db
      .select({
        id: deals.id,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
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
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
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
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.id, id));
    return result as DealWithRelations | undefined;
  },

  async getDealsByClientId(clientId: string): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
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
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
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
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(deals)
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .where(eq(deals.clientId, clientId))
      .orderBy(desc(deals.createdAt));
    return results as DealWithRelations[];
  },

  async getDealsByPrimaryContactId(contactId: string): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    const results = await db
      .select({
        id: deals.id,
        dealNumber: deals.dealNumber,
        displayName: deals.displayName,
        status: deals.status,
        statusName: dealStatuses.name,
        clientId: deals.clientId,
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
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
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
        owner: {
          id: ownerUsers.id,
          firstName: ownerUsers.firstName,
          lastName: ownerUsers.lastName,
          profileImageUrl: ownerUsers.profileImageUrl,
        },
      })
      .from(deals)
      .leftJoin(dealStatuses, eq(deals.status, dealStatuses.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .where(eq(deals.primaryContactId, contactId))
      .orderBy(desc(deals.createdAt));
    return results as DealWithRelations[];
  },

  async createDeal(data: CreateDeal, createdById: string): Promise<Deal> {
    const earliestEventDate = computeEarliestEventDate(data.eventSchedule as DealEvent[] | undefined);
    
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
  },

  async updateDeal(id: string, data: UpdateDeal): Promise<Deal | undefined> {
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
  },

  async deleteDeal(id: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, id));
  },

  async reorderDeals(orderedDealIds: string[]): Promise<void> {
    if (orderedDealIds.length === 0) return;
    
    const totalDeals = orderedDealIds.length;
    const now = new Date();
    
    const caseStatements = orderedDealIds.map((dealId, index) => {
      const newSortOrder = totalDeals - index;
      return sql`WHEN ${dealId} THEN ${newSortOrder}::integer`;
    });
    
    const caseClause = sql.join(caseStatements, sql` `);
    
    await db.execute(sql`
      UPDATE deals 
      SET 
        sort_order = CASE id ${caseClause} END,
        updated_at = ${now}
      WHERE id IN ${orderedDealIds}
    `);
  },

  async getDealTaskById(id: string): Promise<DealTask | undefined> {
    const [task] = await db
      .select()
      .from(dealTasks)
      .where(eq(dealTasks.id, id));
    return task;
  },

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
  },

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
  },

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
  },

  async deleteDealTask(id: string): Promise<void> {
    await db.delete(dealTasks).where(eq(dealTasks.id, id));
  },
};
