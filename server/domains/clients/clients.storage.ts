import { db } from "../../db";
import { eq, asc, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  clients,
  contacts,
  clientContacts,
  dealClients,
  deals,
  users,
  brands,
  type Client,
  type Contact,
  type CreateClient,
  type UpdateClient,
  type DealWithRelations,
} from "@shared/schema";

export interface LinkedDealForClient extends DealWithRelations {
  linkLabel: string | null;
}

export interface ClientWithFullRelations extends Client {
  contacts: Contact[];
  deals: DealWithRelations[];
  linkedDeals: LinkedDealForClient[];
}

export const clientsStorage = {
  async getClients(): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt));
  },

  async getClientById(id: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  },

  async createClient(data: CreateClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(data)
      .returning();
    return client;
  },

  async updateClient(id: string, data: UpdateClient): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();
    return client;
  },

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  },

  async getContactsForClient(clientId: string): Promise<Contact[]> {
    const result = await db
      .select({ contact: contacts })
      .from(clientContacts)
      .innerJoin(contacts, eq(clientContacts.contactId, contacts.id))
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName));
    return result.map(r => r.contact);
  },

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  },

  async linkClientContact(clientId: string, contactId: string): Promise<void> {
    await db
      .insert(clientContacts)
      .values({ clientId, contactId })
      .onConflictDoNothing();
  },

  async unlinkClientContact(clientId: string, contactId: string): Promise<void> {
    await db.delete(clientContacts).where(
      sql`${clientContacts.clientId} = ${clientId} AND ${clientContacts.contactId} = ${contactId}`
    );
  },

  async getClientByIdWithRelations(id: string): Promise<ClientWithFullRelations | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));

    if (!client) return undefined;

    const linkedContacts = await db
      .select({ contact: contacts })
      .from(clientContacts)
      .innerJoin(contacts, eq(clientContacts.contactId, contacts.id))
      .where(eq(clientContacts.clientId, id))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName));

    const ownerUsers = alias(users, "owner_users");
    
    const clientDeals = await db
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
      .from(deals)
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(brands, eq(deals.brandId, brands.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.clientId, id))
      .orderBy(desc(deals.createdAt));

    const ownerUsers2 = alias(users, "owner_users2");
    const linkedDealResults = await db
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
          id: ownerUsers2.id,
          firstName: ownerUsers2.firstName,
          lastName: ownerUsers2.lastName,
          profileImageUrl: ownerUsers2.profileImageUrl,
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
      .leftJoin(ownerUsers2, eq(deals.ownerId, ownerUsers2.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(dealClients.clientId, id))
      .orderBy(desc(deals.createdAt));

    return {
      ...client,
      contacts: linkedContacts.map(r => r.contact),
      deals: clientDeals as DealWithRelations[],
      linkedDeals: linkedDealResults as LinkedDealForClient[],
    };
  },
};
