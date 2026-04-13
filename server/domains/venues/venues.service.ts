import { BaseService, ServiceError } from "../../services/base.service";
import { domainEvents } from "../../lib/events";
import { venuesStorage } from "./venues.storage";
import { ObjectStorageService } from "../../objectStorage";
import { getChangedFields } from "../../audit";
import {
  insertVenueSchema,
  updateVenueSchema,
  insertVenueCollectionSchema,
  updateVenueCollectionSchema,
  addVenuesToCollectionSchema,
  insertVenuePhotoSchema,
  updateVenuePhotoSchema,
} from "@shared/schema";
import type {
  Venue,
  VenueWithRelations,
  VenueGridRow,
  VenueFile,
  VenueFileWithUploader,
  CreateVenueFile,
  UpdateVenueFile,
  VenuePhoto,
  CreateVenuePhoto,
  VenueCollection,
  VenueCollectionWithCreator,
  VenueCollectionWithVenues,
  CreateVenueCollection,
  Amenity,
  Tag,
} from "@shared/schema";
import type { IStorage } from "../../storage";

export class VenuesService extends BaseService {
  constructor(storage: IStorage) {
    super(storage);
  }

  async getVenues(): Promise<VenueGridRow[]> {
    return venuesStorage.getVenuesWithRelations();
  }

  async getVenueById(id: string): Promise<Venue> {
    const venue = await venuesStorage.getVenueById(id);
    return this.ensureExists(venue, "Venue", id);
  }

  async getVenueByIdWithRelations(id: string): Promise<VenueWithRelations> {
    const venue = await venuesStorage.getVenueByIdWithRelations(id);
    return this.ensureExists(venue, "Venue", id);
  }

  async createVenue(
    data: Record<string, unknown>,
    actorId: string
  ): Promise<VenueWithRelations> {
    const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = data;

    const parsed = insertVenueSchema.safeParse(rawVenueData);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid venue data", {
        errors: parsed.error.flatten(),
      });
    }

    const venue = await venuesStorage.createVenue(parsed.data);

    if (Array.isArray(amenityIds) && amenityIds.length > 0) {
      await venuesStorage.setVenueAmenities(venue.id, amenityIds as string[]);
    }

    const allTagIds = [
      ...((cuisineTagIds as string[]) || []),
      ...((styleTagIds as string[]) || []),
    ];
    if (allTagIds.length > 0) {
      await venuesStorage.setVenueTags(venue.id, allTagIds);
    }

    const fullVenue = await venuesStorage.getVenueByIdWithRelations(venue.id);

    domainEvents.emit({
      type: "venue:created",
      venueId: venue.id,
      venueName: venue.name,
      actorId,
      timestamp: new Date(),
    });

    return fullVenue!;
  }

  async updateVenue(
    id: string,
    data: Record<string, unknown>,
    actorId: string
  ): Promise<VenueWithRelations> {
    const existingVenue = await venuesStorage.getVenueById(id);
    this.ensureExists(existingVenue, "Venue", id);

    const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = data;

    const parsed = updateVenueSchema.safeParse(rawVenueData);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid venue data", {
        errors: parsed.error.flatten(),
      });
    }

    const venue = await venuesStorage.updateVenue(id, parsed.data);
    this.ensureExists(venue, "Venue", id);

    if (amenityIds !== undefined) {
      await venuesStorage.setVenueAmenities(
        venue!.id,
        (amenityIds as string[]) || []
      );
    }

    if (cuisineTagIds !== undefined || styleTagIds !== undefined) {
      const allTagIds = [
        ...((cuisineTagIds as string[]) || []),
        ...((styleTagIds as string[]) || []),
      ];
      await venuesStorage.setVenueTags(venue!.id, allTagIds);
    }

    const fullVenue = await venuesStorage.getVenueByIdWithRelations(venue!.id);

    const changes = getChangedFields(
      existingVenue as unknown as Record<string, unknown>,
      venue as unknown as Record<string, unknown>
    );

    domainEvents.emit({
      type: "venue:updated",
      venueId: id,
      venueName: venue!.name,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return fullVenue!;
  }

  async deleteVenue(id: string, actorId: string): Promise<void> {
    const existingVenue = await venuesStorage.getVenueById(id);
    this.ensureExists(existingVenue, "Venue", id);

    await venuesStorage.deleteVenue(id);

    domainEvents.emit({
      type: "venue:deleted",
      venueId: id,
      venueName: existingVenue!.name,
      actorId,
      timestamp: new Date(),
    });
  }

  async getVenueAmenities(venueId: string): Promise<Amenity[]> {
    return venuesStorage.getVenueAmenities(venueId);
  }

  async getVenueTags(venueId: string): Promise<Tag[]> {
    return venuesStorage.getVenueTags(venueId);
  }

  async getCollectionsForVenue(
    venueId: string
  ): Promise<VenueCollectionWithCreator[]> {
    return venuesStorage.getCollectionsForVenue(venueId);
  }

  async createPhoto(
    venueId: string,
    data: Record<string, unknown>,
    actorId: string
  ): Promise<VenuePhoto> {
    const result = insertVenuePhotoSchema.safeParse({ ...data, venueId });
    if (!result.success) {
      throw ServiceError.validation("Invalid data", {
        errors: result.error.flatten(),
      });
    }

    const photo = await venuesStorage.createVenuePhoto(result.data);

    domainEvents.emit({
      type: "venue:photo_uploaded",
      venueId,
      photoId: photo.id,
      actorId,
      timestamp: new Date(),
    });

    return photo;
  }

  async createPhotosBulk(
    venueId: string,
    photosData: any[],
    actorId: string
  ): Promise<VenuePhoto[]> {
    const photosToCreate: CreateVenuePhoto[] = photosData.map(
      (p: any, index: number) => ({
        venueId,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        altText: p.altText,
        sortOrder: p.sortOrder ?? index,
        isHero: p.isHero ?? index === 0,
      })
    );

    const photos = await venuesStorage.createVenuePhotos(photosToCreate);

    for (const photo of photos) {
      domainEvents.emit({
        type: "venue:photo_uploaded",
        venueId,
        photoId: photo.id,
        actorId,
        timestamp: new Date(),
      });
    }

    return photos;
  }

  async updatePhoto(
    photoId: string,
    data: Record<string, unknown>,
    actorId: string
  ): Promise<VenuePhoto> {
    const result = updateVenuePhotoSchema.safeParse(data);
    if (!result.success) {
      throw ServiceError.validation("Invalid data", {
        errors: result.error.flatten(),
      });
    }

    const before = await venuesStorage.getVenuePhotoById(photoId);
    this.ensureExists(before, "Photo", photoId);

    const photo = await venuesStorage.updateVenuePhoto(photoId, result.data);

    const changes = getChangedFields(
      before as unknown as Record<string, unknown>,
      photo as unknown as Record<string, unknown>
    );

    domainEvents.emit({
      type: "venue:photo_updated",
      venueId: before!.venueId,
      photoId,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return photo!;
  }

  async deletePhoto(photoId: string, actorId: string): Promise<void> {
    const photo = await venuesStorage.getVenuePhotoById(photoId);
    this.ensureExists(photo, "Photo", photoId);

    const storageService = new ObjectStorageService();

    if (photo!.url && photo!.url.startsWith("/objects/")) {
      try {
        await storageService.deleteObject(photo!.url);
      } catch (err) {
        console.error("Failed to delete photo from storage:", err);
      }
    }

    await venuesStorage.deleteVenuePhoto(photoId);

    domainEvents.emit({
      type: "venue:photo_deleted",
      venueId: photo!.venueId,
      photoId,
      actorId,
      timestamp: new Date(),
    });
  }

  async setPhotoHero(
    venueId: string,
    photoId: string,
    actorId: string
  ): Promise<void> {
    const photo = await venuesStorage.getVenuePhotoById(photoId);
    if (!photo || photo.venueId !== venueId) {
      throw ServiceError.notFound("Photo", photoId);
    }

    await venuesStorage.setVenuePhotoHero(venueId, photoId);

    domainEvents.emit({
      type: "venue:photo_updated",
      venueId,
      photoId,
      changes: { after: { isHero: true } },
      actorId,
      timestamp: new Date(),
    });
  }

  async getVenuePhotos(venueId: string): Promise<VenuePhoto[]> {
    return venuesStorage.getVenuePhotos(venueId);
  }

  async createFloorplan(
    venueId: string,
    data: {
      fileUrl: string;
      thumbnailUrl?: string;
      fileType: string;
      title?: string;
      caption?: string;
      sortOrder?: number;
    },
    actorId: string,
    uploaderId?: string
  ): Promise<VenueFile> {
    if (!data.fileUrl || !data.fileType) {
      throw ServiceError.validation("fileUrl and fileType are required");
    }
    if (!["image", "pdf"].includes(data.fileType)) {
      throw ServiceError.validation("fileType must be 'image' or 'pdf'");
    }

    const floorplan = await venuesStorage.createVenueFile({
      venueId,
      category: "floorplan",
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl,
      fileType: data.fileType as any,
      title: data.title,
      caption: data.caption,
      sortOrder: data.sortOrder ?? 0,
      uploadedById: uploaderId,
    });

    domainEvents.emit({
      type: "venue:file_uploaded",
      venueId,
      fileId: floorplan.id,
      actorId,
      timestamp: new Date(),
    });

    return floorplan;
  }

  async createFloorplansBulk(
    venueId: string,
    floorplansData: any[],
    actorId: string,
    uploaderId?: string
  ): Promise<VenueFile[]> {
    const filesToCreate: CreateVenueFile[] = floorplansData.map(
      (f: any, index: number) => ({
        venueId,
        category: "floorplan" as const,
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || "image",
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: uploaderId,
      })
    );

    const floorplans = await venuesStorage.createVenueFiles(filesToCreate);

    for (const fp of floorplans) {
      domainEvents.emit({
        type: "venue:file_uploaded",
        venueId,
        fileId: fp.id,
        actorId,
        timestamp: new Date(),
      });
    }

    return floorplans;
  }

  async updateFloorplan(
    id: string,
    data: UpdateVenueFile,
    actorId: string
  ): Promise<VenueFile> {
    const original = await venuesStorage.getVenueFileById(id);
    const floorplan = await venuesStorage.updateVenueFile(id, data);
    this.ensureExists(floorplan, "Floorplan", id);

    const changes = original
      ? getChangedFields(
          original as unknown as Record<string, unknown>,
          floorplan as unknown as Record<string, unknown>
        )
      : {};

    domainEvents.emit({
      type: "venue:file_updated",
      venueId: floorplan!.venueId,
      fileId: id,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return floorplan!;
  }

  async deleteFloorplan(id: string, actorId: string): Promise<void> {
    const floorplan = await venuesStorage.getVenueFileById(id);
    this.ensureExists(floorplan, "Floorplan", id);

    const storageService = new ObjectStorageService();

    if (floorplan!.fileUrl.startsWith("/objects/")) {
      try {
        await storageService.deleteObject(floorplan!.fileUrl);
      } catch (err) {
        console.error("Failed to delete floorplan file from storage:", err);
      }
    }

    if (floorplan!.thumbnailUrl?.startsWith("/objects/")) {
      try {
        await storageService.deleteObject(floorplan!.thumbnailUrl);
      } catch (err) {
        console.error(
          "Failed to delete floorplan thumbnail from storage:",
          err
        );
      }
    }

    await venuesStorage.deleteVenueFile(id);

    domainEvents.emit({
      type: "venue:file_deleted",
      venueId: floorplan!.venueId,
      fileId: id,
      actorId,
      timestamp: new Date(),
    });
  }

  async getVenueFloorplans(venueId: string): Promise<VenueFileWithUploader[]> {
    return venuesStorage.getVenueFiles(venueId, "floorplan");
  }

  async getFloorplanById(id: string): Promise<VenueFileWithUploader> {
    const floorplan = await venuesStorage.getVenueFileById(id);
    return this.ensureExists(floorplan, "Floorplan", id);
  }

  async getVenueFiles(
    venueId: string,
    category?: string
  ): Promise<VenueFileWithUploader[]> {
    return venuesStorage.getVenueFiles(venueId, category);
  }

  async getVenueFileById(id: string): Promise<VenueFileWithUploader> {
    const file = await venuesStorage.getVenueFileById(id);
    return this.ensureExists(file, "File", id);
  }

  async uploadFile(
    data: {
      venueId?: string;
      category: string;
      fileData: string;
      filename: string;
      mimeType?: string;
      title?: string;
      caption?: string;
    },
    actorId: string,
    uploaderId?: string
  ): Promise<VenueFile | Record<string, unknown>> {
    if (!data.fileData || !data.filename) {
      throw ServiceError.validation("fileData and filename are required");
    }
    if (
      !data.category ||
      !["floorplan", "attachment"].includes(data.category)
    ) {
      throw ServiceError.validation(
        "category must be 'floorplan' or 'attachment'"
      );
    }

    const getFileType = (
      mime: string
    ): "image" | "pdf" | "document" | "archive" | "other" => {
      if (mime.startsWith("image/")) return "image";
      if (mime === "application/pdf") return "pdf";
      if (
        mime.includes("word") ||
        mime.includes("document") ||
        mime.includes("spreadsheet") ||
        mime.includes("presentation") ||
        mime === "text/plain" ||
        mime === "text/csv"
      )
        return "document";
      if (
        mime.includes("zip") ||
        mime.includes("rar") ||
        mime.includes("tar") ||
        mime.includes("gzip") ||
        mime.includes("7z")
      )
        return "archive";
      return "other";
    };

    const mimeType = data.mimeType || "application/octet-stream";
    const fileType = getFileType(mimeType);

    const base64Data = data.fileData.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const maxSize = 50 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw ServiceError.validation(
        "File size exceeds maximum limit of 50MB"
      );
    }

    const storageService = new ObjectStorageService();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = data.filename.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const objectPath = data.venueId
      ? `venues/${data.venueId}/${data.category}s/${timestamp}-${randomId}-${sanitizedFilename}`
      : `staged/${data.category}s/${timestamp}-${randomId}-${sanitizedFilename}`;

    await storageService.uploadBuffer(buffer, objectPath, mimeType);
    const fileUrl = `/objects/${objectPath}`;

    let thumbnailUrl: string | undefined;
    if (fileType === "image") {
      try {
        const sharp = (await import("sharp")).default;
        const thumbnailBuffer = await sharp(buffer)
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        const thumbnailPath = objectPath.replace(/\.[^.]+$/, "_thumb.webp");
        await storageService.uploadBuffer(
          thumbnailBuffer,
          thumbnailPath,
          "image/webp"
        );
        thumbnailUrl = `/objects/${thumbnailPath}`;
      } catch (thumbErr) {
        console.error("Failed to generate thumbnail:", thumbErr);
      }
    }

    if (data.venueId) {
      const file = await venuesStorage.createVenueFile({
        venueId: data.venueId,
        category: data.category as "floorplan" | "attachment",
        fileUrl,
        thumbnailUrl,
        fileType,
        originalFilename: data.filename,
        mimeType,
        title: data.title,
        caption: data.caption,
        sortOrder: 0,
        uploadedById: uploaderId,
      });

      domainEvents.emit({
        type: "venue:file_uploaded",
        venueId: data.venueId,
        fileId: file.id,
        actorId,
        timestamp: new Date(),
      });

      return file;
    } else {
      domainEvents.emit({
        type: "venue:file_uploaded",
        venueId: "staged",
        fileId: "staged",
        actorId,
        timestamp: new Date(),
      });

      return {
        fileUrl,
        thumbnailUrl,
        fileType,
        originalFilename: data.filename,
        mimeType,
        title: data.title,
        caption: data.caption,
      };
    }
  }

  async createFile(
    venueId: string,
    data: {
      category: string;
      fileUrl: string;
      thumbnailUrl?: string;
      fileType: string;
      originalFilename?: string;
      mimeType?: string;
      title?: string;
      caption?: string;
      sortOrder?: number;
    },
    actorId: string,
    uploaderId?: string
  ): Promise<VenueFile> {
    if (!data.fileUrl || !data.fileType || !data.category) {
      throw ServiceError.validation(
        "fileUrl, fileType, and category are required"
      );
    }
    if (!["floorplan", "attachment"].includes(data.category)) {
      throw ServiceError.validation(
        "category must be 'floorplan' or 'attachment'"
      );
    }
    if (
      !["image", "pdf", "document", "archive", "other"].includes(
        data.fileType
      )
    ) {
      throw ServiceError.validation(
        "fileType must be 'image', 'pdf', 'document', 'archive', or 'other'"
      );
    }

    const file = await venuesStorage.createVenueFile({
      venueId,
      category: data.category as "floorplan" | "attachment",
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl,
      fileType: data.fileType as any,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      title: data.title,
      caption: data.caption,
      sortOrder: data.sortOrder ?? 0,
      uploadedById: uploaderId,
    });

    domainEvents.emit({
      type: "venue:file_uploaded",
      venueId,
      fileId: file.id,
      actorId,
      timestamp: new Date(),
    });

    return file;
  }

  async createFilesBulk(
    venueId: string,
    filesData: any[],
    actorId: string,
    uploaderId?: string
  ): Promise<VenueFile[]> {
    const filesToCreate: CreateVenueFile[] = filesData.map(
      (f: any, index: number) => ({
        venueId,
        category: f.category || "attachment",
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || "other",
        originalFilename: f.originalFilename,
        mimeType: f.mimeType,
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: uploaderId,
      })
    );

    const files = await venuesStorage.createVenueFiles(filesToCreate);

    for (const file of files) {
      domainEvents.emit({
        type: "venue:file_uploaded",
        venueId,
        fileId: file.id,
        actorId,
        timestamp: new Date(),
      });
    }

    return files;
  }

  async updateFile(
    id: string,
    data: UpdateVenueFile,
    actorId: string
  ): Promise<VenueFile> {
    const original = await venuesStorage.getVenueFileById(id);
    const file = await venuesStorage.updateVenueFile(id, data);
    this.ensureExists(file, "File", id);

    const changes = original
      ? getChangedFields(
          original as unknown as Record<string, unknown>,
          file as unknown as Record<string, unknown>
        )
      : {};

    domainEvents.emit({
      type: "venue:file_updated",
      venueId: file!.venueId,
      fileId: id,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return file!;
  }

  async deleteFile(id: string, actorId: string): Promise<void> {
    const file = await venuesStorage.getVenueFileById(id);
    this.ensureExists(file, "File", id);

    const storageService = new ObjectStorageService();

    if (file!.fileUrl.startsWith("/objects/")) {
      try {
        await storageService.deleteObject(file!.fileUrl);
      } catch (err) {
        console.error("Failed to delete file from storage:", err);
      }
    }

    if (file!.thumbnailUrl?.startsWith("/objects/")) {
      try {
        await storageService.deleteObject(file!.thumbnailUrl);
      } catch (err) {
        console.error("Failed to delete thumbnail from storage:", err);
      }
    }

    await venuesStorage.deleteVenueFile(id);

    domainEvents.emit({
      type: "venue:file_deleted",
      venueId: file!.venueId,
      fileId: id,
      actorId,
      timestamp: new Date(),
    });
  }

  async getVenueCollections(): Promise<VenueCollectionWithCreator[]> {
    return venuesStorage.getVenueCollections();
  }

  async getVenueCollectionById(
    id: string
  ): Promise<VenueCollectionWithVenues> {
    const collection = await venuesStorage.getVenueCollectionById(id);
    return this.ensureExists(collection, "Collection", id);
  }

  async createCollection(
    data: Record<string, unknown>,
    createdById: string,
    actorId: string
  ): Promise<VenueCollection> {
    const parsed = insertVenueCollectionSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid request body", {
        errors: parsed.error.flatten(),
      });
    }

    const collection = await venuesStorage.createVenueCollection(
      parsed.data,
      createdById
    );

    domainEvents.emit({
      type: "venue:collection_created",
      collectionId: collection.id,
      collectionName: collection.name,
      actorId,
      timestamp: new Date(),
    });

    return collection;
  }

  async updateCollection(
    id: string,
    data: Record<string, unknown>,
    actorId: string
  ): Promise<VenueCollection> {
    const parsed = updateVenueCollectionSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid request body", {
        errors: parsed.error.flatten(),
      });
    }

    const original = await venuesStorage.getVenueCollectionById(id);
    const collection = await venuesStorage.updateVenueCollection(
      id,
      parsed.data
    );
    this.ensureExists(collection, "Collection", id);

    const changes = original
      ? getChangedFields(
          original as unknown as Record<string, unknown>,
          collection as unknown as Record<string, unknown>
        )
      : {};

    domainEvents.emit({
      type: "venue:collection_updated",
      collectionId: id,
      collectionName: collection!.name,
      changes,
      actorId,
      timestamp: new Date(),
    });

    return collection!;
  }

  async deleteCollection(id: string, actorId: string): Promise<void> {
    const collection = await venuesStorage.getVenueCollectionById(id);

    await venuesStorage.deleteVenueCollection(id);

    domainEvents.emit({
      type: "venue:collection_deleted",
      collectionId: id,
      collectionName: collection?.name || "unknown",
      actorId,
      timestamp: new Date(),
    });
  }

  async addVenuesToCollection(
    collectionId: string,
    data: Record<string, unknown>,
    addedById: string,
    actorId: string
  ): Promise<VenueCollectionWithVenues> {
    const parsed = addVenuesToCollectionSchema.safeParse(data);
    if (!parsed.success) {
      throw ServiceError.validation("Invalid request body", {
        errors: parsed.error.flatten(),
      });
    }

    const venueIds = parsed.data.venueIds;
    await venuesStorage.addVenuesToCollection(
      collectionId,
      venueIds,
      addedById
    );

    domainEvents.emit({
      type: "venue:collection_venues_added",
      collectionId,
      venueIds,
      actorId,
      timestamp: new Date(),
    });

    const collection = await venuesStorage.getVenueCollectionById(collectionId);
    return collection!;
  }

  async removeVenueFromCollection(
    collectionId: string,
    venueId: string,
    actorId: string
  ): Promise<void> {
    await venuesStorage.removeVenueFromCollection(collectionId, venueId);

    domainEvents.emit({
      type: "venue:collection_venue_removed",
      collectionId,
      venueId,
      actorId,
      timestamp: new Date(),
    });
  }

  async reorderVenuesInCollection(
    collectionId: string,
    venueIds: string[],
    actorId: string
  ): Promise<VenueCollectionWithVenues> {
    await venuesStorage.reorderVenuesInCollection(collectionId, venueIds);

    domainEvents.emit({
      type: "venue:collection_reordered",
      collectionId,
      venueIds,
      actorId,
      timestamp: new Date(),
    });

    const collection = await venuesStorage.getVenueCollectionById(collectionId);
    return collection!;
  }
}
