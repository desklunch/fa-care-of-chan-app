import { db } from "../../db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import {
  venues,
  venueAmenities,
  venueTags,
  venueFiles,
  venuePhotos,
  venueCollections,
  venueCollectionVenues,
  amenities,
  tags,
  users,
  type Venue,
  type CreateVenue,
  type UpdateVenue,
  type VenueWithRelations,
  type VenueGridRow,
  type AmenitySummary,
  type TagSummary,
  type VenueSpace,
  type Amenity,
  type Tag,
  type VenueFile,
  type VenueFileWithUploader,
  type CreateVenueFile,
  type UpdateVenueFile,
  type VenuePhoto,
  type CreateVenuePhoto,
  type UpdateVenuePhoto,
  type VenueCollection,
  type VenueCollectionWithCreator,
  type VenueCollectionWithVenues,
  type CreateVenueCollection,
  type UpdateVenueCollection,
} from "@shared/schema";

class VenuesStorage {
  // ===== VENUE CRUD =====

  async getVenueById(id: string): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }

  async getVenuesWithRelations(): Promise<VenueGridRow[]> {
    const result = await db.execute(sql`
      SELECT 
        v.id,
        v.name,
        v.venue_type,
        v.short_description,
        v.city,
        v.state,
        v.venue_spaces,
        v.is_active,
        v.is_draft,
        v.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
           FROM venue_amenities va
           JOIN amenities a ON va.amenity_id = a.id
           WHERE va.venue_id = v.id),
          '[]'::json
        ) AS amenities,
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'category', t.category))
           FROM venue_tags vt
           JOIN tags t ON vt.tag_id = t.id
           WHERE vt.venue_id = v.id AND t.category = 'Cuisine'),
          '[]'::json
        ) AS cuisine_tags,
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'category', t.category))
           FROM venue_tags vt
           JOIN tags t ON vt.tag_id = t.id
           WHERE vt.venue_id = v.id AND t.category = 'Style'),
          '[]'::json
        ) AS style_tags
      FROM venues v
      ORDER BY v.name
    `);

    return (result.rows as any[]).map(row => ({
      id: row.id as string,
      name: row.name as string,
      venueType: row.venue_type as string | null,
      shortDescription: row.short_description as string | null,
      city: row.city as string | null,
      state: row.state as string | null,
      venueSpaces: row.venue_spaces as VenueSpace[] | null,
      isActive: row.is_active as boolean,
      isDraft: row.is_draft as boolean,
      amenities: row.amenities as AmenitySummary[],
      cuisineTags: row.cuisine_tags as TagSummary[],
      styleTags: row.style_tags as TagSummary[],
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }));
  }

  async createVenue(data: CreateVenue): Promise<Venue> {
    const [venue] = await db
      .insert(venues)
      .values(data)
      .returning();
    return venue;
  }

  async updateVenue(id: string, data: UpdateVenue): Promise<Venue | undefined> {
    const [venue] = await db
      .update(venues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return venue;
  }

  async deleteVenue(id: string): Promise<void> {
    await db.delete(venues).where(eq(venues.id, id));
  }

  async getVenueByIdWithRelations(id: string): Promise<VenueWithRelations | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) return undefined;

    const [venueAmenitiesResult, venueTagsResult, venueFilesResult, venuePhotosResult, venueCollectionsResult] = await Promise.all([
      db
        .select({ amenity: amenities })
        .from(venueAmenities)
        .innerJoin(amenities, eq(venueAmenities.amenityId, amenities.id))
        .where(eq(venueAmenities.venueId, id)),
      db
        .select({ tag: tags })
        .from(venueTags)
        .innerJoin(tags, eq(venueTags.tagId, tags.id))
        .where(eq(venueTags.venueId, id)),
      db
        .select({
          file: venueFiles,
          uploadedBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(venueFiles)
        .leftJoin(users, eq(venueFiles.uploadedById, users.id))
        .where(eq(venueFiles.venueId, id))
        .orderBy(venueFiles.sortOrder, venueFiles.uploadedAt),
      db
        .select()
        .from(venuePhotos)
        .where(eq(venuePhotos.venueId, id))
        .orderBy(asc(venuePhotos.sortOrder)),
      this.getCollectionsForVenue(id),
    ]);

    const venueAmenitiesList = venueAmenitiesResult.map(r => r.amenity);
    const venueTagsList = venueTagsResult.map(r => r.tag);
    const venueFilesList: VenueFileWithUploader[] = venueFilesResult.map(vf => ({
      ...vf.file,
      uploadedBy: vf.uploadedBy,
    }));
    const venuePhotosList = venuePhotosResult;

    return {
      ...venue,
      amenities: venueAmenitiesList,
      cuisineTags: venueTagsList.filter(t => t.category === 'Cuisine'),
      styleTags: venueTagsList.filter(t => t.category === 'Style'),
      floorplans: venueFilesList.filter(f => f.category === 'floorplan'),
      attachments: venueFilesList.filter(f => f.category === 'attachment'),
      photos: venuePhotosList,
      collections: venueCollectionsResult,
    };
  }

  // ===== VENUE-AMENITY RELATIONSHIPS =====

  async getVenueAmenities(venueId: string): Promise<Amenity[]> {
    const results = await db
      .select({ amenity: amenities })
      .from(venueAmenities)
      .innerJoin(amenities, eq(venueAmenities.amenityId, amenities.id))
      .where(eq(venueAmenities.venueId, venueId));
    return results.map(r => r.amenity);
  }

  async setVenueAmenities(venueId: string, amenityIds: string[]): Promise<void> {
    await db.delete(venueAmenities).where(eq(venueAmenities.venueId, venueId));

    if (amenityIds.length > 0) {
      await db.insert(venueAmenities).values(
        amenityIds.map(amenityId => ({
          venueId,
          amenityId,
        }))
      );
    }
  }

  // ===== VENUE-TAG RELATIONSHIPS =====

  async getVenueTags(venueId: string): Promise<Tag[]> {
    const results = await db
      .select({ tag: tags })
      .from(venueTags)
      .innerJoin(tags, eq(venueTags.tagId, tags.id))
      .where(eq(venueTags.venueId, venueId));
    return results.map(r => r.tag);
  }

  async setVenueTags(venueId: string, tagIds: string[]): Promise<void> {
    await db.delete(venueTags).where(eq(venueTags.venueId, venueId));

    if (tagIds.length > 0) {
      await db.insert(venueTags).values(
        tagIds.map(tagId => ({
          venueId,
          tagId,
        }))
      );
    }
  }

  // ===== VENUE FILES =====

  async getVenueFiles(venueId: string, category?: string): Promise<VenueFileWithUploader[]> {
    const whereCondition = category
      ? and(eq(venueFiles.venueId, venueId), eq(venueFiles.category, category))
      : eq(venueFiles.venueId, venueId);

    const results = await db
      .select({
        file: venueFiles,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(venueFiles)
      .leftJoin(users, eq(venueFiles.uploadedById, users.id))
      .where(whereCondition)
      .orderBy(venueFiles.sortOrder, venueFiles.uploadedAt);

    return results.map(r => ({
      ...r.file,
      uploadedBy: r.uploadedBy,
    }));
  }

  async getVenueFileById(id: string): Promise<VenueFileWithUploader | undefined> {
    const [result] = await db
      .select({
        file: venueFiles,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(venueFiles)
      .leftJoin(users, eq(venueFiles.uploadedById, users.id))
      .where(eq(venueFiles.id, id));

    if (!result) return undefined;
    return {
      ...result.file,
      uploadedBy: result.uploadedBy,
    };
  }

  async createVenueFile(data: CreateVenueFile): Promise<VenueFile> {
    const [file] = await db
      .insert(venueFiles)
      .values({
        venueId: data.venueId,
        category: data.category,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl,
        fileType: data.fileType,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        title: data.title,
        caption: data.caption,
        sortOrder: data.sortOrder ?? 0,
        uploadedById: data.uploadedById,
      })
      .returning();
    return file;
  }

  async createVenueFiles(data: CreateVenueFile[]): Promise<VenueFile[]> {
    if (data.length === 0) return [];
    const files = await db
      .insert(venueFiles)
      .values(data.map(d => ({
        venueId: d.venueId,
        category: d.category,
        fileUrl: d.fileUrl,
        thumbnailUrl: d.thumbnailUrl,
        fileType: d.fileType,
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        title: d.title,
        caption: d.caption,
        sortOrder: d.sortOrder ?? 0,
        uploadedById: d.uploadedById,
      })))
      .returning();
    return files;
  }

  async updateVenueFile(id: string, data: UpdateVenueFile): Promise<VenueFile | undefined> {
    const [file] = await db
      .update(venueFiles)
      .set(data)
      .where(eq(venueFiles.id, id))
      .returning();
    return file;
  }

  async deleteVenueFile(id: string): Promise<void> {
    await db.delete(venueFiles).where(eq(venueFiles.id, id));
  }

  // ===== VENUE PHOTOS =====

  async getVenuePhotos(venueId: string): Promise<VenuePhoto[]> {
    return db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.venueId, venueId))
      .orderBy(asc(venuePhotos.sortOrder));
  }

  async getVenuePhotoById(id: string): Promise<VenuePhoto | undefined> {
    const [photo] = await db
      .select()
      .from(venuePhotos)
      .where(eq(venuePhotos.id, id));
    return photo;
  }

  async createVenuePhoto(data: CreateVenuePhoto): Promise<VenuePhoto> {
    const [photo] = await db
      .insert(venuePhotos)
      .values({
        venueId: data.venueId,
        url: data.url,
        altText: data.altText,
        sortOrder: data.sortOrder ?? 0,
        isHero: data.isHero ?? false,
      })
      .returning();
    return photo;
  }

  async createVenuePhotos(data: CreateVenuePhoto[]): Promise<VenuePhoto[]> {
    if (data.length === 0) return [];
    const photos = await db
      .insert(venuePhotos)
      .values(data.map(d => ({
        venueId: d.venueId,
        url: d.url,
        altText: d.altText,
        sortOrder: d.sortOrder ?? 0,
        isHero: d.isHero ?? false,
      })))
      .returning();
    return photos;
  }

  async updateVenuePhoto(id: string, data: UpdateVenuePhoto): Promise<VenuePhoto | undefined> {
    const [photo] = await db
      .update(venuePhotos)
      .set(data)
      .where(eq(venuePhotos.id, id))
      .returning();
    return photo;
  }

  async deleteVenuePhoto(id: string): Promise<void> {
    await db.delete(venuePhotos).where(eq(venuePhotos.id, id));
  }

  async setVenuePhotoHero(venueId: string, photoId: string): Promise<void> {
    await db
      .update(venuePhotos)
      .set({ isHero: false })
      .where(eq(venuePhotos.venueId, venueId));
    await db
      .update(venuePhotos)
      .set({ isHero: true })
      .where(eq(venuePhotos.id, photoId));
  }

  // ===== VENUE COLLECTIONS =====

  async getVenueCollections(): Promise<VenueCollectionWithCreator[]> {
    const collections = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollections)
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .orderBy(desc(venueCollections.createdAt));

    const counts = await db
      .select({
        collectionId: venueCollectionVenues.collectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(venueCollectionVenues)
      .groupBy(venueCollectionVenues.collectionId);

    const countMap = new Map(counts.map(c => [c.collectionId, c.count]));

    return collections.map(({ collection, createdBy }) => ({
      ...collection,
      createdBy,
      venueCount: countMap.get(collection.id) || 0,
    }));
  }

  async getVenueCollectionById(id: string): Promise<VenueCollectionWithVenues | undefined> {
    const [result] = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollections)
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .where(eq(venueCollections.id, id));

    if (!result) return undefined;

    const collectionVenues = await db
      .select({
        venue: venues,
        addedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        addedAt: venueCollectionVenues.addedAt,
      })
      .from(venueCollectionVenues)
      .innerJoin(venues, eq(venueCollectionVenues.venueId, venues.id))
      .leftJoin(users, eq(venueCollectionVenues.addedById, users.id))
      .where(eq(venueCollectionVenues.collectionId, id))
      .orderBy(asc(venueCollectionVenues.sortOrder), desc(venueCollectionVenues.addedAt));

    const venueIds = collectionVenues.map(cv => cv.venue.id);
    const allPhotos = venueIds.length > 0
      ? await db
          .select()
          .from(venuePhotos)
          .where(inArray(venuePhotos.venueId, venueIds))
          .orderBy(asc(venuePhotos.sortOrder))
      : [];

    const photosByVenue = new Map<string, typeof allPhotos>();
    for (const photo of allPhotos) {
      const existing = photosByVenue.get(photo.venueId) || [];
      existing.push(photo);
      photosByVenue.set(photo.venueId, existing);
    }

    return {
      ...result.collection,
      createdBy: result.createdBy,
      venues: collectionVenues.map(cv => ({
        ...cv.venue,
        addedBy: cv.addedBy,
        addedAt: cv.addedAt,
        photos: photosByVenue.get(cv.venue.id) || [],
      })),
    };
  }

  async createVenueCollection(data: CreateVenueCollection, createdById: string): Promise<VenueCollection> {
    const [collection] = await db
      .insert(venueCollections)
      .values({
        ...data,
        createdById,
      })
      .returning();
    return collection;
  }

  async updateVenueCollection(id: string, data: UpdateVenueCollection): Promise<VenueCollection | undefined> {
    const [collection] = await db
      .update(venueCollections)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(venueCollections.id, id))
      .returning();
    return collection;
  }

  async deleteVenueCollection(id: string): Promise<void> {
    await db.delete(venueCollections).where(eq(venueCollections.id, id));
  }

  async addVenuesToCollection(collectionId: string, venueIds: string[], addedById?: string): Promise<void> {
    if (venueIds.length === 0) return;

    await db
      .insert(venueCollectionVenues)
      .values(
        venueIds.map(venueId => ({
          collectionId,
          venueId,
          addedById,
        }))
      )
      .onConflictDoNothing();
  }

  async removeVenueFromCollection(collectionId: string, venueId: string): Promise<void> {
    await db
      .delete(venueCollectionVenues)
      .where(
        and(
          eq(venueCollectionVenues.collectionId, collectionId),
          eq(venueCollectionVenues.venueId, venueId)
        )
      );
  }

  async reorderVenuesInCollection(collectionId: string, venueIds: string[]): Promise<void> {
    await Promise.all(
      venueIds.map((venueId, index) =>
        db
          .update(venueCollectionVenues)
          .set({ sortOrder: index })
          .where(
            and(
              eq(venueCollectionVenues.collectionId, collectionId),
              eq(venueCollectionVenues.venueId, venueId)
            )
          )
      )
    );
  }

  async getCollectionsForVenue(venueId: string): Promise<VenueCollectionWithCreator[]> {
    const results = await db
      .select({
        collection: venueCollections,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(venueCollectionVenues)
      .innerJoin(venueCollections, eq(venueCollectionVenues.collectionId, venueCollections.id))
      .leftJoin(users, eq(venueCollections.createdById, users.id))
      .where(eq(venueCollectionVenues.venueId, venueId))
      .orderBy(venueCollections.name);

    const collectionIds = results.map(r => r.collection.id);
    if (collectionIds.length === 0) return [];

    const counts = await db
      .select({
        collectionId: venueCollectionVenues.collectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(venueCollectionVenues)
      .where(inArray(venueCollectionVenues.collectionId, collectionIds))
      .groupBy(venueCollectionVenues.collectionId);

    const countMap = new Map(counts.map(c => [c.collectionId, c.count]));

    return results.map(({ collection, createdBy }) => ({
      ...collection,
      createdBy,
      venueCount: countMap.get(collection.id) || 0,
    }));
  }
}

export const venuesStorage = new VenuesStorage();
