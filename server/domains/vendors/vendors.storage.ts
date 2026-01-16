import { db } from "../../db";
import { eq, asc, sql } from "drizzle-orm";
import {
  vendors,
  contacts,
  vendorsContacts,
  type Vendor,
  type Contact,
} from "@shared/schema";

export const vendorsStorage = {
  async getVendorById(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  },

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendorsContacts).where(eq(vendorsContacts.vendorId, id));
    await db.delete(vendors).where(eq(vendors.id, id));
  },

  async getContactsForVendor(vendorId: string): Promise<Contact[]> {
    const result = await db
      .select({ contact: contacts })
      .from(vendorsContacts)
      .innerJoin(contacts, eq(vendorsContacts.contactId, contacts.id))
      .where(eq(vendorsContacts.vendorId, vendorId))
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

  async linkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db
      .insert(vendorsContacts)
      .values({ vendorId, contactId })
      .onConflictDoNothing();
  },

  async unlinkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db.delete(vendorsContacts).where(
      sql`${vendorsContacts.vendorId} = ${vendorId} AND ${vendorsContacts.contactId} = ${contactId}`
    );
  },
};
