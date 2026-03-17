import { db } from "../../db";
import { eq, and, desc, sql, gte, lte, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  dealClients,
  dealTags,
  dealIntakes,
  dealServices,
  tags,
  clients,
  deals,
  users,
  brands,
  contacts,
  industries,
  type DealWithRelations,
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
  status: string;
  clientId: string;
  clientName: string | null;
  budgetLow: number | null;
  budgetHigh: number | null;
  locations: DealLocation[];
  eventSchedule: DealEvent[];
  serviceIds: number[] | null;
  earliestEventDate: string | null;
  industryName: string | null;
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
        nextSteps: deals.nextSteps,
        ownerId: deals.ownerId,
        industryId: deals.industryId,
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
      .from(dealClients)
      .innerJoin(deals, eq(dealClients.dealId, deals.id))
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
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
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.responseData !== undefined) updateData.responseData = data.responseData;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "completed") {
        updateData.completedAt = new Date();
      }
    }

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
        clientId: deals.clientId,
        clientName: clients.name,
        budgetLow: deals.budgetLow,
        budgetHigh: deals.budgetHigh,
        locations: deals.locations,
        eventSchedule: deals.eventSchedule,
        serviceIds: deals.serviceIds,
        earliestEventDate: deals.earliestEventDate,
        industryName: industries.name,
      })
      .from(deals)
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(industries, eq(deals.industryId, industries.id))
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
};
