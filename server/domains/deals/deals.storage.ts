import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  dealClients,
  clients,
  deals,
  users,
  brands,
  contacts,
  type DealClient,
  type DealWithRelations,
} from "@shared/schema";

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
};
