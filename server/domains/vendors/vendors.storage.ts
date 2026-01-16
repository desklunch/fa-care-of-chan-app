import { db } from "../../db";
import { eq, asc, desc, and, gt, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  vendors,
  contacts,
  vendorsContacts,
  vendorServices,
  vendorServicesVendors,
  vendorUpdateTokens,
  users,
  type Vendor,
  type Contact,
  type VendorService,
  type VendorWithRelations,
  type VendorWithServices,
  type VendorUpdateTokenWithRelations,
  type CreateVendor,
  type UpdateVendor,
  type CreateVendorService,
  type UpdateVendorService,
} from "@shared/schema";

class VendorsStorage {
  // ===== VENDOR CRUD =====

  async getVendorsWithRelations(): Promise<VendorWithRelations[]> {
    const allVendors = await db
      .select()
      .from(vendors)
      .orderBy(vendors.businessName);

    const vendorServiceMappings = await db
      .select({
        vendorId: vendorServicesVendors.vendorId,
        service: vendorServices,
      })
      .from(vendorServicesVendors)
      .innerJoin(vendorServices, eq(vendorServicesVendors.vendorServiceId, vendorServices.id));

    const servicesByVendorId = new Map<string, VendorService[]>();
    for (const mapping of vendorServiceMappings) {
      const existing = servicesByVendorId.get(mapping.vendorId) || [];
      existing.push(mapping.service);
      servicesByVendorId.set(mapping.vendorId, existing);
    }

    return allVendors.map((vendor) => ({
      ...vendor,
      services: servicesByVendorId.get(vendor.id) || [],
      contacts: [],
    }));
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  }

  async getVendorByIdWithRelations(id: string): Promise<VendorWithRelations | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));

    if (!vendor) return undefined;

    const vendorServiceMappings = await db
      .select({
        service: vendorServices,
      })
      .from(vendorServicesVendors)
      .innerJoin(vendorServices, eq(vendorServicesVendors.vendorServiceId, vendorServices.id))
      .where(eq(vendorServicesVendors.vendorId, id));

    const vendorContactMappings = await db
      .select({
        contact: contacts,
      })
      .from(vendorsContacts)
      .innerJoin(contacts, eq(vendorsContacts.contactId, contacts.id))
      .where(eq(vendorsContacts.vendorId, id));

    return {
      ...vendor,
      services: vendorServiceMappings.map((m) => m.service),
      contacts: vendorContactMappings.map((m) => m.contact),
    };
  }

  async createVendor(data: Omit<CreateVendor, 'serviceIds'>, serviceIds?: string[]): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(data)
      .returning();

    if (serviceIds && serviceIds.length > 0) {
      await db.insert(vendorServicesVendors).values(
        serviceIds.map((vendorServiceId) => ({
          vendorId: vendor.id,
          vendorServiceId,
        }))
      );
    }

    return vendor;
  }

  async updateVendor(id: string, data: Partial<Omit<UpdateVendor, 'serviceIds'>>, serviceIds?: string[]): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();

    if (!vendor) return undefined;

    if (serviceIds !== undefined) {
      await db.delete(vendorServicesVendors).where(eq(vendorServicesVendors.vendorId, id));

      if (serviceIds.length > 0) {
        await db.insert(vendorServicesVendors).values(
          serviceIds.map((vendorServiceId) => ({
            vendorId: id,
            vendorServiceId,
          }))
        );
      }
    }

    return vendor;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendorServicesVendors).where(eq(vendorServicesVendors.vendorId, id));
    await db.delete(vendorsContacts).where(eq(vendorsContacts.vendorId, id));
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // ===== VENDOR SERVICES =====

  async getVendorServices(): Promise<VendorService[]> {
    return db
      .select()
      .from(vendorServices)
      .orderBy(vendorServices.name);
  }

  async getVendorServiceById(id: string): Promise<VendorService | undefined> {
    const [service] = await db
      .select()
      .from(vendorServices)
      .where(eq(vendorServices.id, id));
    return service;
  }

  async createVendorService(data: CreateVendorService): Promise<VendorService> {
    const [service] = await db
      .insert(vendorServices)
      .values(data)
      .returning();
    return service;
  }

  async updateVendorService(id: string, data: UpdateVendorService): Promise<VendorService | undefined> {
    const [service] = await db
      .update(vendorServices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendorServices.id, id))
      .returning();
    return service;
  }

  async deleteVendorService(id: string): Promise<void> {
    await db.delete(vendorServices).where(eq(vendorServices.id, id));
  }

  // ===== VENDOR-CONTACT RELATIONSHIPS =====

  async getContactsForVendor(vendorId: string): Promise<Contact[]> {
    const result = await db
      .select({ contact: contacts })
      .from(vendorsContacts)
      .innerJoin(contacts, eq(vendorsContacts.contactId, contacts.id))
      .where(eq(vendorsContacts.vendorId, vendorId))
      .orderBy(asc(contacts.lastName), asc(contacts.firstName));
    return result.map(r => r.contact);
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async linkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db
      .insert(vendorsContacts)
      .values({ vendorId, contactId })
      .onConflictDoNothing();
  }

  async unlinkVendorContact(vendorId: string, contactId: string): Promise<void> {
    await db.delete(vendorsContacts).where(
      and(
        eq(vendorsContacts.vendorId, vendorId),
        eq(vendorsContacts.contactId, contactId)
      )
    );
  }

  // ===== VENDOR UPDATE TOKENS =====

  async createVendorUpdateToken(vendorId: string, createdById: string, expiresInHours: number = 720): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await db.insert(vendorUpdateTokens).values({
      vendorId,
      token,
      expiresAt,
      createdById,
    });

    return { token, expiresAt };
  }

  async getVendorByToken(token: string): Promise<VendorWithServices | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(vendorUpdateTokens)
      .where(
        and(
          eq(vendorUpdateTokens.token, token),
          eq(vendorUpdateTokens.used, false),
          gt(vendorUpdateTokens.expiresAt, new Date())
        )
      );

    if (!tokenRecord) {
      return undefined;
    }

    const vendor = await this.getVendorByIdWithRelations(tokenRecord.vendorId);
    if (!vendor) {
      return undefined;
    }

    return {
      ...vendor,
      services: vendor.services || [],
    };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(vendorUpdateTokens)
      .set({ used: true })
      .where(eq(vendorUpdateTokens.token, token));
  }

  async getAllVendorUpdateTokens(): Promise<VendorUpdateTokenWithRelations[]> {
    const tokens = await db
      .select({
        id: vendorUpdateTokens.id,
        vendorId: vendorUpdateTokens.vendorId,
        token: vendorUpdateTokens.token,
        used: vendorUpdateTokens.used,
        expiresAt: vendorUpdateTokens.expiresAt,
        createdById: vendorUpdateTokens.createdById,
        createdAt: vendorUpdateTokens.createdAt,
        vendorBusinessName: vendors.businessName,
        vendorEmail: vendors.email,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
      })
      .from(vendorUpdateTokens)
      .leftJoin(vendors, eq(vendorUpdateTokens.vendorId, vendors.id))
      .leftJoin(users, eq(vendorUpdateTokens.createdById, users.id))
      .orderBy(desc(vendorUpdateTokens.createdAt));

    return tokens.map((t) => ({
      id: t.id,
      vendorId: t.vendorId,
      token: t.token,
      used: t.used,
      expiresAt: t.expiresAt,
      createdById: t.createdById,
      createdAt: t.createdAt,
      vendor: {
        id: t.vendorId,
        businessName: t.vendorBusinessName || '',
        email: t.vendorEmail,
      } as any,
      createdBy: t.createdById ? {
        id: t.createdById,
        firstName: t.createdByFirstName,
        lastName: t.createdByLastName,
      } as any : null,
    }));
  }
}

export const vendorsStorage = new VendorsStorage();
