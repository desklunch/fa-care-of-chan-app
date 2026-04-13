import { db } from "../../db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  contacts,
  clients,
  vendors,
  deals,
  users,
  clientContacts,
  vendorsContacts,
  type Contact,
  type Client,
  type Vendor,
  type ContactWithRelations,
  type CreateContact,
  type UpdateContact,
  type DealWithRelations,
} from "@shared/schema";

export interface ContactWithFullRelations extends Contact {
  linkedClients: Client[];
  linkedVendors: Vendor[];
  deals: DealWithRelations[];
}

export class ContactsStorage {
  async getContactsWithRelations(): Promise<ContactWithRelations[]> {
    const result = await db.execute(sql`
      SELECT 
        c.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', v.id, 'businessName', v.business_name))
           FROM vendors_contacts vc
           JOIN vendors v ON vc.vendor_id = v.id
           WHERE vc.contact_id = c.id),
          '[]'::json
        ) AS vendors,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cl.id, 'name', cl.name))
           FROM client_contacts cc
           JOIN clients cl ON cc.client_id = cl.id
           WHERE cc.contact_id = c.id),
          '[]'::json
        ) AS clients
      FROM contacts c
      ORDER BY c.last_name, c.first_name
    `);

    return (result.rows as any[]).map(row => ({
      id: row.id,
      externalId: row.external_id,
      firstName: row.first_name,
      lastName: row.last_name,
      jobTitle: row.job_title,
      emailAddresses: row.email_addresses || [],
      phoneNumbers: row.phone_numbers || [],
      instagramUsername: row.instagram_username,
      linkedinUsername: row.linkedin_username,
      homeAddress: row.home_address,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      vendors: row.vendors || [],
      clients: row.clients || [],
    }));
  }

  async getClientLinkedContacts(): Promise<ContactWithRelations[]> {
    const linkedContactIds = await db
      .selectDistinct({ contactId: clientContacts.contactId })
      .from(clientContacts);
    
    const linkedIds = new Set(linkedContactIds.map(r => r.contactId));
    const allContactsWithRelations = await this.getContactsWithRelations();
    return allContactsWithRelations.filter(contact => linkedIds.has(contact.id));
  }

  async getVendorLinkedContacts(): Promise<ContactWithRelations[]> {
    const linkedContactIds = await db
      .selectDistinct({ contactId: vendorsContacts.contactId })
      .from(vendorsContacts);
    
    const linkedIds = new Set(linkedContactIds.map(r => r.contactId));
    const allContactsWithRelations = await this.getContactsWithRelations();
    return allContactsWithRelations.filter(contact => linkedIds.has(contact.id));
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async createContact(data: CreateContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(data)
      .returning();
    return contact;
  }

  async updateContact(id: string, data: UpdateContact): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.update(deals).set({ primaryContactId: null }).where(eq(deals.primaryContactId, id));
    await db.delete(vendorsContacts).where(eq(vendorsContacts.contactId, id));
    await db.delete(clientContacts).where(eq(clientContacts.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async getClientsForContact(contactId: string): Promise<Client[]> {
    const result = await db
      .select({ client: clients })
      .from(clientContacts)
      .innerJoin(clients, eq(clientContacts.clientId, clients.id))
      .where(eq(clientContacts.contactId, contactId))
      .orderBy(asc(clients.name));
    return result.map(r => r.client);
  }

  async getVendorsForContact(contactId: string): Promise<Vendor[]> {
    const result = await db
      .select({ vendor: vendors })
      .from(vendorsContacts)
      .innerJoin(vendors, eq(vendorsContacts.vendorId, vendors.id))
      .where(eq(vendorsContacts.contactId, contactId))
      .orderBy(asc(vendors.businessName));
    return result.map(r => r.vendor);
  }

  async linkClientContact(clientId: string, contactId: string): Promise<void> {
    await db
      .insert(clientContacts)
      .values({ clientId, contactId })
      .onConflictDoNothing();
  }

  async unlinkClientContact(clientId: string, contactId: string): Promise<void> {
    await db
      .delete(clientContacts)
      .where(
        and(
          eq(clientContacts.clientId, clientId),
          eq(clientContacts.contactId, contactId)
        )
      );
  }

  async linkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db
      .insert(vendorsContacts)
      .values({ vendorId, contactId })
      .onConflictDoNothing();
  }

  async unlinkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db
      .delete(vendorsContacts)
      .where(
        and(
          eq(vendorsContacts.vendorId, vendorId),
          eq(vendorsContacts.contactId, contactId)
        )
      );
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  }

  async getDealsByPrimaryContactId(contactId: string): Promise<DealWithRelations[]> {
    const ownerUsers = alias(users, "owner_users");
    
    const contactDeals = await db
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
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.primaryContactId, contactId))
      .orderBy(desc(deals.createdAt));

    return contactDeals as DealWithRelations[];
  }

  async getContactByIdWithRelations(id: string): Promise<ContactWithFullRelations | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));

    if (!contact) return undefined;

    const linkedClientsResult = await db
      .select({ client: clients })
      .from(clientContacts)
      .innerJoin(clients, eq(clientContacts.clientId, clients.id))
      .where(eq(clientContacts.contactId, id))
      .orderBy(asc(clients.name));

    const linkedVendorsResult = await db
      .select({ vendor: vendors })
      .from(vendorsContacts)
      .innerJoin(vendors, eq(vendorsContacts.vendorId, vendors.id))
      .where(eq(vendorsContacts.contactId, id))
      .orderBy(asc(vendors.businessName));

    const ownerUsers = alias(users, "owner_users");
    
    const contactDeals = await db
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
      .leftJoin(users, eq(deals.createdById, users.id))
      .leftJoin(clients, eq(deals.clientId, clients.id))
      .leftJoin(ownerUsers, eq(deals.ownerId, ownerUsers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.primaryContactId, id))
      .orderBy(desc(deals.createdAt));

    return {
      ...contact,
      linkedClients: linkedClientsResult.map(r => r.client),
      linkedVendors: linkedVendorsResult.map(r => r.vendor),
      deals: contactDeals as DealWithRelations[],
    };
  }
}

export const contactsStorage = new ContactsStorage();
