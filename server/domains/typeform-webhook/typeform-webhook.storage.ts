import { db } from "../../db";
import { eq, sql, ilike } from "drizzle-orm";
import {
  deals,
  contacts,
  clients,
  clientContacts,
  users,
  dealStatuses,
  type Deal,
  type Contact,
  type Client,
  type CreateContact,
  type CreateClient,
  type DealLocation,
  type DealEvent,
} from "@shared/schema";

export interface TypeformDealInput {
  externalId: string;
  displayName: string;
  status: number;
  clientId: string;
  primaryContactId: string | null;
  ownerId: string | null;
  budgetNotes: string | null;
  projectDate: string | null;
  locationsText: string | null;
  concept: string | null;
  notes: string | null;
  startedOn: string | null;
  locations: DealLocation[];
  eventSchedule: DealEvent[];
  serviceIds: number[];
}

export const typeformWebhookStorage = {
  async findDealByExternalId(externalId: string): Promise<Deal | undefined> {
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.externalId, externalId));
    return deal;
  },

  async findContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(sql`LOWER(${email}) = ANY(SELECT LOWER(unnest(${contacts.emailAddresses})))`);
    return contact;
  },

  async createContact(data: CreateContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(data)
      .returning();
    return contact;
  },

  async findClientByName(name: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(ilike(clients.name, name));
    return client;
  },

  async findClientByEmailDomain(domain: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(sql`${clients.website} ILIKE '%' || ${domain} || '%'`);
    return client;
  },

  async createClient(data: CreateClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(data)
      .returning();
    return client;
  },

  async linkContactToClient(clientId: string, contactId: string): Promise<void> {
    await db
      .insert(clientContacts)
      .values({ clientId, contactId })
      .onConflictDoNothing();
  },

  async findUserByName(firstName: string, lastName: string): Promise<{ id: string } | undefined> {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.firstName} ILIKE ${firstName} AND ${users.lastName} ILIKE ${lastName}`);
    return user;
  },

  async getDefaultDealStatus(): Promise<{ id: number } | undefined> {
    const [status] = await db
      .select({ id: dealStatuses.id })
      .from(dealStatuses)
      .where(eq(dealStatuses.isDefault, true));
    return status;
  },

  async createDeal(data: TypeformDealInput): Promise<Deal> {
    const [maxResult] = await db
      .select({ maxSortOrder: sql<number>`COALESCE(MAX(${deals.sortOrder}), 0)` })
      .from(deals);
    const nextSortOrder = (maxResult?.maxSortOrder ?? 0) + 1;

    const [deal] = await db
      .insert(deals)
      .values({
        externalId: data.externalId,
        displayName: data.displayName,
        status: data.status,
        clientId: data.clientId,
        primaryContactId: data.primaryContactId,
        ownerId: data.ownerId,
        budgetNotes: data.budgetNotes,
        projectDate: data.projectDate,
        locationsText: data.locationsText,
        concept: data.concept,
        notes: data.notes,
        startedOn: data.startedOn,
        locations: data.locations,
        eventSchedule: data.eventSchedule,
        serviceIds: data.serviceIds,
        sortOrder: nextSortOrder,
      })
      .returning();
    return deal;
  },
};
