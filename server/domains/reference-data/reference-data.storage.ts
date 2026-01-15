/**
 * Reference Data Storage
 * 
 * Storage interface and implementation for reference/lookup data:
 * - Tags (venue categorization)
 * - Amenities (venue features)
 * - Industries (client classification)
 * - Deal Services (service offerings)
 * - Brands (client brands)
 */

import { eq, desc, asc } from "drizzle-orm";
import { db } from "../../db";
import {
  tags,
  amenities,
  industries,
  dealServices,
  brands,
  vendorServices,
  type Tag,
  type CreateTag,
  type UpdateTag,
  type Amenity,
  type CreateAmenity,
  type UpdateAmenity,
  type Industry,
  type CreateIndustry,
  type UpdateIndustry,
  type DealService,
  type InsertDealService,
  type Brand,
  type CreateBrand,
  type UpdateBrand,
  type VendorService,
  type CreateVendorService,
  type UpdateVendorService,
} from "@shared/schema";

export interface IReferenceDataStorage {
  // Tag operations
  getTags(category?: string): Promise<Tag[]>;
  getTagById(id: string): Promise<Tag | undefined>;
  getTagsByCategory(category: string): Promise<Tag[]>;
  createTag(data: CreateTag): Promise<Tag>;
  updateTag(id: string, data: UpdateTag): Promise<Tag | undefined>;
  deleteTag(id: string): Promise<void>;

  // Amenity operations
  getAmenities(): Promise<Amenity[]>;
  getAmenityById(id: string): Promise<Amenity | undefined>;
  createAmenity(data: CreateAmenity): Promise<Amenity>;
  updateAmenity(id: string, data: UpdateAmenity): Promise<Amenity | undefined>;
  deleteAmenity(id: string): Promise<void>;

  // Industry operations
  getIndustries(): Promise<Industry[]>;
  getIndustryById(id: string): Promise<Industry | undefined>;
  createIndustry(data: CreateIndustry): Promise<Industry>;
  updateIndustry(id: string, data: UpdateIndustry): Promise<Industry | undefined>;
  deleteIndustry(id: string): Promise<void>;

  // Deal Service operations
  getDealServices(): Promise<DealService[]>;
  getDealServiceById(id: number): Promise<DealService | undefined>;
  createDealService(data: InsertDealService): Promise<DealService>;
  updateDealService(id: number, data: Partial<InsertDealService>): Promise<DealService | undefined>;
  deleteDealService(id: number): Promise<void>;

  // Brand operations
  getBrands(): Promise<Brand[]>;
  getBrandById(id: string): Promise<Brand | undefined>;
  createBrand(data: CreateBrand): Promise<Brand>;
  updateBrand(id: string, data: UpdateBrand): Promise<Brand | undefined>;
  deleteBrand(id: string): Promise<void>;

  // Vendor Service operations
  getVendorServices(): Promise<VendorService[]>;
  getVendorServiceById(id: string): Promise<VendorService | undefined>;
  createVendorService(data: CreateVendorService): Promise<VendorService>;
  updateVendorService(id: string, data: UpdateVendorService): Promise<VendorService | undefined>;
  deleteVendorService(id: string): Promise<void>;
}

export class ReferenceDataStorage implements IReferenceDataStorage {
  // Tag operations
  async getTags(category?: string): Promise<Tag[]> {
    if (category) {
      return db.select().from(tags).where(eq(tags.category, category)).orderBy(tags.name);
    }
    return db.select().from(tags).orderBy(tags.category, tags.name);
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagsByCategory(category: string): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.category, category)).orderBy(tags.name);
  }

  async createTag(data: CreateTag): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values({
        name: data.name,
        category: data.category,
      })
      .returning();
    return tag;
  }

  async updateTag(id: string, data: UpdateTag): Promise<Tag | undefined> {
    const [tag] = await db
      .update(tags)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, id))
      .returning();
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  // Amenity operations
  async getAmenities(): Promise<Amenity[]> {
    return db.select().from(amenities).orderBy(amenities.name);
  }

  async getAmenityById(id: string): Promise<Amenity | undefined> {
    const [amenity] = await db.select().from(amenities).where(eq(amenities.id, id));
    return amenity;
  }

  async createAmenity(data: CreateAmenity): Promise<Amenity> {
    const [amenity] = await db
      .insert(amenities)
      .values({
        name: data.name,
        description: data.description,
        icon: data.icon,
      })
      .returning();
    return amenity;
  }

  async updateAmenity(id: string, data: UpdateAmenity): Promise<Amenity | undefined> {
    const [amenity] = await db
      .update(amenities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(amenities.id, id))
      .returning();
    return amenity;
  }

  async deleteAmenity(id: string): Promise<void> {
    await db.delete(amenities).where(eq(amenities.id, id));
  }

  // Industry operations
  async getIndustries(): Promise<Industry[]> {
    return db.select().from(industries).orderBy(industries.name);
  }

  async getIndustryById(id: string): Promise<Industry | undefined> {
    const [industry] = await db.select().from(industries).where(eq(industries.id, id));
    return industry;
  }

  async createIndustry(data: CreateIndustry): Promise<Industry> {
    const [industry] = await db
      .insert(industries)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning();
    return industry;
  }

  async updateIndustry(id: string, data: UpdateIndustry): Promise<Industry | undefined> {
    const [industry] = await db
      .update(industries)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(industries.id, id))
      .returning();
    return industry;
  }

  async deleteIndustry(id: string): Promise<void> {
    await db.delete(industries).where(eq(industries.id, id));
  }

  // Deal Service operations
  async getDealServices(): Promise<DealService[]> {
    return db.select().from(dealServices).orderBy(dealServices.sortOrder, dealServices.name);
  }

  async getDealServiceById(id: number): Promise<DealService | undefined> {
    const [service] = await db.select().from(dealServices).where(eq(dealServices.id, id));
    return service;
  }

  async createDealService(data: InsertDealService): Promise<DealService> {
    const [service] = await db
      .insert(dealServices)
      .values({
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return service;
  }

  async updateDealService(id: number, data: Partial<InsertDealService>): Promise<DealService | undefined> {
    const [service] = await db
      .update(dealServices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(dealServices.id, id))
      .returning();
    return service;
  }

  async deleteDealService(id: number): Promise<void> {
    await db.delete(dealServices).where(eq(dealServices.id, id));
  }

  // Brand operations
  async getBrands(): Promise<Brand[]> {
    return await db
      .select()
      .from(brands)
      .orderBy(desc(brands.createdAt));
  }

  async getBrandById(id: string): Promise<Brand | undefined> {
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, id));
    return brand;
  }

  async createBrand(data: CreateBrand): Promise<Brand> {
    const [brand] = await db
      .insert(brands)
      .values(data)
      .returning();
    return brand;
  }

  async updateBrand(id: string, data: UpdateBrand): Promise<Brand | undefined> {
    const [brand] = await db
      .update(brands)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, id))
      .returning();
    return brand;
  }

  async deleteBrand(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  // Vendor Service operations
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
}

export const referenceDataStorage = new ReferenceDataStorage();
