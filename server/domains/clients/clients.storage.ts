import { db } from "../../db";
import { eq, asc, desc, sql } from "drizzle-orm";
import {
  clients,
  contacts,
  clientContacts,
  type Client,
  type Contact,
  type CreateClient,
  type UpdateClient,
} from "@shared/schema";

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
};
