import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { venuesStorage } from "./venues.storage";
import { logAuditEvent, getChangedFields } from "../../audit";
import { insertVenueSchema, updateVenueSchema, insertVenueCollectionSchema, updateVenueCollectionSchema, addVenuesToCollectionSchema, insertVenuePhotoSchema, updateVenuePhotoSchema } from "@shared/schema";
import OpenAI from "openai";
import { ObjectStorageService } from "../../objectStorage";

export function registerVenuesRoutes(app: Express): void {
  // ===== PUBLIC VENUES ROUTES (no authentication required) =====

  app.get("/api/public/venues/:id", async (req, res) => {
    try {
      const venue = await venuesStorage.getVenueByIdWithRelations(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching public venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  app.get("/api/public/venue-collections/:id", async (req, res) => {
    try {
      const collection = await venuesStorage.getVenueCollectionById(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching public venue collection:", error);
      res.status(500).json({ message: "Failed to fetch venue collection" });
    }
  });

  // ===== VENUES ROUTES =====

  app.get("/api/venues", isAuthenticated, async (req, res) => {
    try {
      const venues = await venuesStorage.getVenuesWithRelations();
      res.json(venues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  app.get("/api/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const venue = await venuesStorage.getVenueById(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  app.get("/api/venues/:id/full", isAuthenticated, async (req, res) => {
    try {
      const venue = await venuesStorage.getVenueByIdWithRelations(req.params.id);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      res.json(venue);
    } catch (error) {
      console.error("Error fetching venue with relations:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  app.post("/api/venues", isAuthenticated, async (req: any, res) => {
    let venueId: string | undefined;
    try {
      const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = req.body;
      
      const parsed = insertVenueSchema.safeParse(rawVenueData);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid venue data", 
          errors: parsed.error.flatten() 
        });
      }
      
      const venue = await venuesStorage.createVenue(parsed.data);
      venueId = venue.id;
      
      if (amenityIds && amenityIds.length > 0) {
        await venuesStorage.setVenueAmenities(venue.id, amenityIds);
      }
      
      const allTagIds = [...(cuisineTagIds || []), ...(styleTagIds || [])];
      if (allTagIds.length > 0) {
        await venuesStorage.setVenueTags(venue.id, allTagIds);
      }
      
      const fullVenue = await venuesStorage.getVenueByIdWithRelations(venue.id);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue",
        entityId: venue.id,
        status: "success",
        metadata: { venueName: venue.name },
      });
      
      res.status(201).json(fullVenue);
    } catch (error) {
      console.error("Error creating venue:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue",
        entityId: venueId || "unknown",
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  app.patch("/api/venues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingVenue = await venuesStorage.getVenueById(req.params.id);
      if (!existingVenue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      const { amenityIds, cuisineTagIds, styleTagIds, ...rawVenueData } = req.body;
      
      const parsed = updateVenueSchema.safeParse(rawVenueData);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid venue data", 
          errors: parsed.error.flatten() 
        });
      }
      
      const venue = await venuesStorage.updateVenue(req.params.id, parsed.data);
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      if (amenityIds !== undefined) {
        await venuesStorage.setVenueAmenities(venue.id, amenityIds || []);
      }
      
      if (cuisineTagIds !== undefined || styleTagIds !== undefined) {
        const allTagIds = [...(cuisineTagIds || []), ...(styleTagIds || [])];
        await venuesStorage.setVenueTags(venue.id, allTagIds);
      }
      
      const fullVenue = await venuesStorage.getVenueByIdWithRelations(venue.id);
      
      const changes = getChangedFields(
        existingVenue as unknown as Record<string, unknown>,
        venue as unknown as Record<string, unknown>
      );
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue",
        entityId: req.params.id,
        changes,
        status: "success",
        metadata: { venueName: venue.name },
      });
      
      res.json(fullVenue);
    } catch (error) {
      console.error("Error updating venue:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  app.delete("/api/venues/:id", isAuthenticated, requirePermission("venues.delete"), async (req: any, res) => {
    try {
      const existingVenue = await venuesStorage.getVenueById(req.params.id);
      if (!existingVenue) {
        return res.status(404).json({ message: "Venue not found" });
      }
      
      await venuesStorage.deleteVenue(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue",
        entityId: req.params.id,
        status: "success",
        metadata: { deletedVenue: existingVenue.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to delete venue" });
    }
  });

  app.get("/api/venues/:id/amenities", isAuthenticated, async (req, res) => {
    try {
      const amenities = await venuesStorage.getVenueAmenities(req.params.id);
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching venue amenities:", error);
      res.status(500).json({ message: "Failed to fetch venue amenities" });
    }
  });

  app.get("/api/venues/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await venuesStorage.getVenueTags(req.params.id);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching venue tags:", error);
      res.status(500).json({ message: "Failed to fetch venue tags" });
    }
  });

  app.get("/api/venues/:id/collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await venuesStorage.getCollectionsForVenue(req.params.id);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching venue collections:", error);
      res.status(500).json({ message: "Failed to fetch venue collections" });
    }
  });

  // ===== VENUE COLLECTION ROUTES =====

  app.get("/api/venue-collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await venuesStorage.getVenueCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error fetching venue collections:", error);
      res.status(500).json({ message: "Failed to fetch venue collections" });
    }
  });

  app.get("/api/venue-collections/:id", isAuthenticated, async (req, res) => {
    try {
      const collection = await venuesStorage.getVenueCollectionById(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching venue collection:", error);
      res.status(500).json({ message: "Failed to fetch venue collection" });
    }
  });

  app.post("/api/venue-collections", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = insertVenueCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      const collection = await venuesStorage.createVenueCollection(
        parsed.data,
        req.user.claims.sub
      );
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_collection",
        entityId: collection.id,
        status: "success",
        metadata: { name: collection.name },
      });
      
      res.status(201).json(collection);
    } catch (error) {
      console.error("Error creating venue collection:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_collection",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create venue collection" });
    }
  });

  app.patch("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = updateVenueCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      const original = await venuesStorage.getVenueCollectionById(req.params.id);
      const collection = await venuesStorage.updateVenueCollection(
        req.params.id,
        parsed.data
      );
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        changes: original ? getChangedFields(original, collection) : undefined,
      });
      
      res.json(collection);
    } catch (error) {
      console.error("Error updating venue collection:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update venue collection" });
    }
  });

  app.delete("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const collection = await venuesStorage.getVenueCollectionById(req.params.id);
      await venuesStorage.deleteVenueCollection(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { name: collection?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue collection:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete venue collection" });
    }
  });

  app.post("/api/venue-collections/:id/venues", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = addVenuesToCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: parsed.error.flatten() 
        });
      }
      
      await venuesStorage.addVenuesToCollection(
        req.params.id,
        parsed.data.venueIds,
        req.user.claims.sub
      );
      
      await logAuditEvent(req, {
        action: "add_venues",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { venueIds: parsed.data.venueIds, count: parsed.data.venueIds.length },
      });
      
      const collection = await venuesStorage.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      console.error("Error adding venues to collection:", error);
      await logAuditEvent(req, {
        action: "add_venues",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to add venues to collection" });
    }
  });

  app.delete("/api/venue-collections/:collectionId/venues/:venueId", isAuthenticated, async (req: any, res) => {
    try {
      await venuesStorage.removeVenueFromCollection(
        req.params.collectionId,
        req.params.venueId
      );
      
      await logAuditEvent(req, {
        action: "remove_venue",
        entityType: "venue_collection",
        entityId: req.params.collectionId,
        status: "success",
        metadata: { venueId: req.params.venueId },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing venue from collection:", error);
      await logAuditEvent(req, {
        action: "remove_venue",
        entityType: "venue_collection",
        entityId: req.params.collectionId,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to remove venue from collection" });
    }
  });

  app.put("/api/venue-collections/:id/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { venueIds } = req.body;
      if (!Array.isArray(venueIds)) {
        return res.status(400).json({ message: "venueIds must be an array" });
      }
      
      await venuesStorage.reorderVenuesInCollection(req.params.id, venueIds);
      
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "success",
        metadata: { venueCount: venueIds.length },
      });
      
      const collection = await venuesStorage.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      console.error("Error reordering venues in collection:", error);
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "venue_collection",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to reorder venues in collection" });
    }
  });

  // ===== VENUE FLOORPLAN ROUTES =====

  app.get("/api/venues/:venueId/floorplans", isAuthenticated, async (req, res) => {
    try {
      const floorplans = await venuesStorage.getVenueFiles(req.params.venueId, 'floorplan');
      res.json(floorplans);
    } catch (error) {
      console.error("Error fetching venue floorplans:", error);
      res.status(500).json({ message: "Failed to fetch venue floorplans" });
    }
  });

  app.get("/api/floorplans/:id", isAuthenticated, async (req, res) => {
    try {
      const floorplan = await venuesStorage.getVenueFileById(req.params.id);
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      res.json(floorplan);
    } catch (error) {
      console.error("Error fetching floorplan:", error);
      res.status(500).json({ message: "Failed to fetch floorplan" });
    }
  });

  app.post("/api/venues/:venueId/floorplans", isAuthenticated, async (req: any, res) => {
    try {
      const { fileUrl, thumbnailUrl, fileType, title, caption, sortOrder } = req.body;
      
      if (!fileUrl || !fileType) {
        return res.status(400).json({ message: "fileUrl and fileType are required" });
      }
      
      if (!["image", "pdf"].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'image' or 'pdf'" });
      }
      
      const floorplan = await venuesStorage.createVenueFile({
        venueId: req.params.venueId,
        category: 'floorplan',
        fileUrl,
        thumbnailUrl,
        fileType,
        title,
        caption,
        sortOrder: sortOrder ?? 0,
        uploadedById: req.user?.id,
      });
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "floorplan",
        entityId: floorplan.id,
        status: "success",
        metadata: { venueId: req.params.venueId, title },
      });
      
      res.status(201).json(floorplan);
    } catch (error) {
      console.error("Error creating floorplan:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "floorplan",
        entityId: null,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create floorplan" });
    }
  });

  app.post("/api/venues/:venueId/floorplans/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { floorplans: floorplansData } = req.body;
      
      if (!Array.isArray(floorplansData) || floorplansData.length === 0) {
        return res.status(400).json({ message: "floorplans must be a non-empty array" });
      }

      const filesToCreate = floorplansData.map((f: any, index: number) => ({
        venueId: req.params.venueId,
        category: 'floorplan' as const,
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || 'image',
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: req.user?.id,
      }));

      const floorplans = await venuesStorage.createVenueFiles(filesToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, category: 'floorplan', count: floorplans.length },
      });

      res.status(201).json(floorplans);
    } catch (error) {
      console.error("Error creating floorplans:", error);
      res.status(500).json({ message: "Failed to create floorplans" });
    }
  });

  app.patch("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      
      const original = await venuesStorage.getVenueFileById(req.params.id);
      const floorplan = await venuesStorage.updateVenueFile(req.params.id, {
        title,
        caption,
        sortOrder,
        thumbnailUrl,
      });
      
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "success",
        changes: original ? getChangedFields(original, floorplan) : undefined,
      });
      
      res.json(floorplan);
    } catch (error) {
      console.error("Error updating floorplan:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update floorplan" });
    }
  });

  app.delete("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const floorplan = await venuesStorage.getVenueFileById(req.params.id);
      if (!floorplan) {
        return res.status(404).json({ message: "Floorplan not found" });
      }
      
      const storageService = new ObjectStorageService();
      
      if (floorplan.fileUrl.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(floorplan.fileUrl);
        } catch (err) {
          console.error("Failed to delete floorplan file from storage:", err);
        }
      }
      
      if (floorplan.thumbnailUrl?.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(floorplan.thumbnailUrl);
        } catch (err) {
          console.error("Failed to delete floorplan thumbnail from storage:", err);
        }
      }
      
      await venuesStorage.deleteVenueFile(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "success",
        metadata: { venueId: floorplan.venueId, title: floorplan.title },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting floorplan:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "floorplan",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete floorplan" });
    }
  });

  // ===== VENUE PHOTOS ROUTES =====

  app.get("/api/venues/:venueId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await venuesStorage.getVenuePhotos(req.params.venueId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching venue photos:", error);
      res.status(500).json({ message: "Failed to fetch venue photos" });
    }
  });

  app.post("/api/venues/:venueId/photos", isAuthenticated, async (req: any, res) => {
    try {
      const result = insertVenuePhotoSchema.safeParse({
        ...req.body,
        venueId: req.params.venueId,
      });
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const photo = await venuesStorage.createVenuePhoto(result.data);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_photo",
        entityId: photo.id,
        changes: { after: { venueId: req.params.venueId, url: result.data.url } },
      });

      res.status(201).json(photo);
    } catch (error) {
      console.error("Error creating venue photo:", error);
      res.status(500).json({ message: "Failed to create venue photo" });
    }
  });

  app.post("/api/venues/:venueId/photos/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { photos: photosData } = req.body;
      
      if (!Array.isArray(photosData) || photosData.length === 0) {
        return res.status(400).json({ message: "photos must be a non-empty array" });
      }

      const photosToCreate = photosData.map((p: any, index: number) => ({
        venueId: req.params.venueId,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        altText: p.altText,
        sortOrder: p.sortOrder ?? index,
        isHero: p.isHero ?? (index === 0),
      }));

      const photos = await venuesStorage.createVenuePhotos(photosToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_photo",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, count: photos.length },
      });

      res.status(201).json(photos);
    } catch (error) {
      console.error("Error creating venue photos:", error);
      res.status(500).json({ message: "Failed to create venue photos" });
    }
  });

  app.put("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateVenuePhotoSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid data",
          errors: result.error.flatten(),
        });
      }

      const before = await venuesStorage.getVenuePhotoById(req.params.id);
      if (!before) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const photo = await venuesStorage.updateVenuePhoto(req.params.id, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_photo",
        entityId: req.params.id,
        changes: getChangedFields(
          before as unknown as Record<string, unknown>,
          photo as unknown as Record<string, unknown>
        ),
      });

      res.json(photo);
    } catch (error) {
      console.error("Error updating venue photo:", error);
      res.status(500).json({ message: "Failed to update venue photo" });
    }
  });

  app.delete("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const photo = await venuesStorage.getVenuePhotoById(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const storageService = new ObjectStorageService();

      if (photo.url && photo.url.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(photo.url);
        } catch (err) {
          console.error("Failed to delete photo from storage:", err);
        }
      }

      await venuesStorage.deleteVenuePhoto(req.params.id);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_photo",
        entityId: req.params.id,
        changes: { before: { venueId: photo.venueId, url: photo.url } },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue photo:", error);
      res.status(500).json({ message: "Failed to delete venue photo" });
    }
  });

  app.put("/api/venues/:venueId/photos/:photoId/hero", isAuthenticated, async (req: any, res) => {
    try {
      const photo = await venuesStorage.getVenuePhotoById(req.params.photoId);
      if (!photo || photo.venueId !== req.params.venueId) {
        return res.status(404).json({ message: "Photo not found" });
      }

      await venuesStorage.setVenuePhotoHero(req.params.venueId, req.params.photoId);

      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_photo",
        entityId: req.params.photoId,
        metadata: { venueId: req.params.venueId, setAsHero: true },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting hero photo:", error);
      res.status(500).json({ message: "Failed to set hero photo" });
    }
  });

  // ===== TAG SUGGESTIONS (AI) =====

  app.post("/api/venues/tag-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const { googlePlaceData } = req.body;
      
      if (!googlePlaceData) {
        return res.status(400).json({ message: "googlePlaceData is required" });
      }

      const systemPrompt = `You are a venue categorization assistant. Analyze Google Places data and suggest tags that are EXPLICITLY confirmed by the data.

CRITICAL RULES:
1. ONLY suggest tags if the Google Places data EXPLICITLY confirms them
2. DO NOT infer, guess, or assume - if the data doesn't explicitly state it, don't suggest it
3. Be concise - just list the tag names, no explanations needed for each tag
4. If nothing is explicitly confirmed for a category, say "None confirmed"

WHAT TO LOOK FOR:
- Cuisine: The "primaryType" field (e.g., "italian_restaurant" means Italian cuisine)
- Style: The "editorialSummary" for explicit descriptions (e.g., "fine dining", "casual", "romantic", "retro")
- Amenities: Explicit boolean fields like outdoorSeating, liveMusic, servesCocktails, wheelchairAccessibleEntrance, valetParking, etc.

Format your response as plain text with three sections:
CUISINE: [list cuisine types, or "None confirmed"]
STYLE: [list style descriptors, or "None confirmed"]  
AMENITIES: [list amenities, or "None confirmed"]`;

      const userPrompt = `Analyze this venue's Google Places data and suggest appropriate tags:

${JSON.stringify(googlePlaceData, null, 2)}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return res.status(500).json({ message: "No response from AI" });
      }

      res.json({ suggestions: responseText });
    } catch (error: any) {
      console.error("Error generating tag suggestions:", error);
      res.status(500).json({ message: "Failed to generate tag suggestions", error: error.message });
    }
  });

  // ===== VENUE FILES ROUTES =====

  app.get("/api/venues/:venueId/files", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const files = await venuesStorage.getVenueFiles(req.params.venueId, category);
      res.json(files);
    } catch (error) {
      console.error("Error fetching venue files:", error);
      res.status(500).json({ message: "Failed to fetch venue files" });
    }
  });

  app.get("/api/venue-files/:id", isAuthenticated, async (req, res) => {
    try {
      const file = await venuesStorage.getVenueFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error fetching venue file:", error);
      res.status(500).json({ message: "Failed to fetch venue file" });
    }
  });

  app.post("/api/venue-files/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { venueId, category, fileData, filename, mimeType, title, caption } = req.body;
      
      if (!fileData || !filename) {
        return res.status(400).json({ message: "fileData and filename are required" });
      }
      
      if (!category || !["floorplan", "attachment"].includes(category)) {
        return res.status(400).json({ message: "category must be 'floorplan' or 'attachment'" });
      }
      
      const getFileType = (mime: string): "image" | "pdf" | "document" | "archive" | "other" => {
        if (mime.startsWith("image/")) return "image";
        if (mime === "application/pdf") return "pdf";
        if (mime.includes("word") || mime.includes("document") || mime.includes("spreadsheet") || 
            mime.includes("presentation") || mime === "text/plain" || mime === "text/csv") return "document";
        if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || 
            mime.includes("gzip") || mime.includes("7z")) return "archive";
        return "other";
      };
      
      const fileType = getFileType(mimeType || "application/octet-stream");
      
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const maxSize = 50 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return res.status(400).json({ message: "File size exceeds maximum limit of 50MB" });
      }
      
      const storageService = new ObjectStorageService();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = venueId 
        ? `venues/${venueId}/${category}s/${timestamp}-${randomId}-${sanitizedFilename}`
        : `staged/${category}s/${timestamp}-${randomId}-${sanitizedFilename}`;
      
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
          await storageService.uploadBuffer(thumbnailBuffer, thumbnailPath, "image/webp");
          thumbnailUrl = `/objects/${thumbnailPath}`;
        } catch (thumbErr) {
          console.error("Failed to generate thumbnail:", thumbErr);
        }
      }
      
      if (venueId) {
        const file = await venuesStorage.createVenueFile({
          venueId,
          category,
          fileUrl,
          thumbnailUrl,
          fileType,
          originalFilename: filename,
          mimeType,
          title,
          caption,
          sortOrder: 0,
          uploadedById: req.user?.id,
        });
        
        await logAuditEvent(req, {
          action: "upload",
          entityType: "venue_file",
          entityId: file.id,
          status: "success",
          metadata: { venueId, category, filename },
        });
        
        res.status(201).json(file);
      } else {
        await logAuditEvent(req, {
          action: "upload_staged",
          entityType: "venue_file",
          entityId: null,
          status: "success",
          metadata: { category, filename },
        });
        
        res.status(201).json({
          fileUrl,
          thumbnailUrl,
          fileType,
          originalFilename: filename,
          mimeType,
          title,
          caption,
        });
      }
    } catch (error) {
      console.error("Error uploading venue file:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "venue_file",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload venue file" });
    }
  });

  app.post("/api/venues/:venueId/files", isAuthenticated, async (req: any, res) => {
    try {
      const { category, fileUrl, thumbnailUrl, fileType, originalFilename, mimeType, title, caption, sortOrder } = req.body;
      
      if (!fileUrl || !fileType || !category) {
        return res.status(400).json({ message: "fileUrl, fileType, and category are required" });
      }
      
      if (!["floorplan", "attachment"].includes(category)) {
        return res.status(400).json({ message: "category must be 'floorplan' or 'attachment'" });
      }
      
      if (!["image", "pdf", "document", "archive", "other"].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'image', 'pdf', 'document', 'archive', or 'other'" });
      }
      
      const file = await venuesStorage.createVenueFile({
        venueId: req.params.venueId,
        category,
        fileUrl,
        thumbnailUrl,
        fileType,
        originalFilename,
        mimeType,
        title,
        caption,
        sortOrder: sortOrder ?? 0,
        uploadedById: req.user?.id,
      });
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: file.id,
        status: "success",
        metadata: { venueId: req.params.venueId, category, title },
      });
      
      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating venue file:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: null,
        status: "failure",
        metadata: { venueId: req.params.venueId, error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create venue file" });
    }
  });

  app.post("/api/venues/:venueId/files/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { files: filesData } = req.body;
      
      if (!Array.isArray(filesData) || filesData.length === 0) {
        return res.status(400).json({ message: "files must be a non-empty array" });
      }

      const filesToCreate = filesData.map((f: any, index: number) => ({
        venueId: req.params.venueId,
        category: f.category || 'attachment',
        fileUrl: f.fileUrl,
        thumbnailUrl: f.thumbnailUrl,
        fileType: f.fileType || 'other',
        originalFilename: f.originalFilename,
        mimeType: f.mimeType,
        title: f.title,
        caption: f.caption,
        sortOrder: f.sortOrder ?? index,
        uploadedById: req.user?.id,
      }));

      const files = await venuesStorage.createVenueFiles(filesToCreate);

      await logAuditEvent(req, {
        action: "create",
        entityType: "venue_file",
        entityId: "bulk",
        metadata: { venueId: req.params.venueId, count: files.length },
      });

      res.status(201).json(files);
    } catch (error) {
      console.error("Error creating venue files:", error);
      res.status(500).json({ message: "Failed to create venue files" });
    }
  });

  app.patch("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      
      const original = await venuesStorage.getVenueFileById(req.params.id);
      const file = await venuesStorage.updateVenueFile(req.params.id, {
        title,
        caption,
        sortOrder,
        thumbnailUrl,
      });
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "success",
        changes: original ? getChangedFields(original, file) : undefined,
      });
      
      res.json(file);
    } catch (error) {
      console.error("Error updating venue file:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update venue file" });
    }
  });

  app.delete("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const file = await venuesStorage.getVenueFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const storageService = new ObjectStorageService();
      
      if (file.fileUrl.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(file.fileUrl);
        } catch (err) {
          console.error("Failed to delete file from storage:", err);
        }
      }
      
      if (file.thumbnailUrl?.startsWith("/objects/")) {
        try {
          await storageService.deleteObject(file.thumbnailUrl);
        } catch (err) {
          console.error("Failed to delete thumbnail from storage:", err);
        }
      }
      
      await venuesStorage.deleteVenueFile(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "success",
        metadata: { venueId: file.venueId, category: file.category, title: file.title },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting venue file:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "venue_file",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete venue file" });
    }
  });
}
