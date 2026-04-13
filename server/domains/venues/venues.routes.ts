import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { VenuesService } from "./venues.service";
import { ServiceError } from "../../services/base.service";
import { storage } from "../../storage";
import OpenAI from "openai";

const venuesService = new VenuesService(storage);

function handleServiceError(error: unknown, res: any, fallbackMessage: string) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.details || {}),
    });
  }
  console.error(fallbackMessage, error);
  res.status(500).json({ message: fallbackMessage });
}

function getActorId(req: any): string {
  return req.user?.claims?.sub || req.user?.id || "unknown";
}

export function registerVenuesRoutes(app: Express): void {
  app.get("/api/public/venues/:id", async (req, res) => {
    try {
      const venue = await venuesService.getVenueByIdWithRelations(req.params.id);
      res.json(venue);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return res.status(404).json({ message: "Venue not found" });
      }
      console.error("Error fetching public venue:", error);
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  app.get("/api/public/venue-collections/:id", async (req, res) => {
    try {
      const collection = await venuesService.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      if (error instanceof ServiceError && error.statusCode === 404) {
        return res.status(404).json({ message: "Collection not found" });
      }
      console.error("Error fetching public venue collection:", error);
      res.status(500).json({ message: "Failed to fetch venue collection" });
    }
  });

  app.get("/api/venues", isAuthenticated, async (req, res) => {
    try {
      const venues = await venuesService.getVenues();
      res.json(venues);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venues");
    }
  });

  app.get("/api/venues/:id", isAuthenticated, async (req, res) => {
    try {
      const venue = await venuesService.getVenueById(req.params.id);
      res.json(venue);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue");
    }
  });

  app.get("/api/venues/:id/full", isAuthenticated, async (req, res) => {
    try {
      const venue = await venuesService.getVenueByIdWithRelations(req.params.id);
      res.json(venue);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue");
    }
  });

  app.post("/api/venues", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const fullVenue = await venuesService.createVenue(req.body, actorId);
      res.status(201).json(fullVenue);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue");
    }
  });

  app.patch("/api/venues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const fullVenue = await venuesService.updateVenue(req.params.id, req.body, actorId);
      res.json(fullVenue);
    } catch (error) {
      handleServiceError(error, res, "Failed to update venue");
    }
  });

  app.delete("/api/venues/:id", isAuthenticated, requirePermission("venues.delete"), async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.deleteVenue(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to delete venue");
    }
  });

  app.get("/api/venues/:id/amenities", isAuthenticated, async (req, res) => {
    try {
      const amenities = await venuesService.getVenueAmenities(req.params.id);
      res.json(amenities);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue amenities");
    }
  });

  app.get("/api/venues/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const tags = await venuesService.getVenueTags(req.params.id);
      res.json(tags);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue tags");
    }
  });

  app.get("/api/venues/:id/collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await venuesService.getCollectionsForVenue(req.params.id);
      res.json(collections);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue collections");
    }
  });

  app.get("/api/venue-collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await venuesService.getVenueCollections();
      res.json(collections);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue collections");
    }
  });

  app.get("/api/venue-collections/:id", isAuthenticated, async (req, res) => {
    try {
      const collection = await venuesService.getVenueCollectionById(req.params.id);
      res.json(collection);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue collection");
    }
  });

  app.post("/api/venue-collections", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const collection = await venuesService.createCollection(
        req.body,
        req.user.claims.sub,
        actorId
      );
      res.status(201).json(collection);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue collection");
    }
  });

  app.patch("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const collection = await venuesService.updateCollection(req.params.id, req.body, actorId);
      res.json(collection);
    } catch (error) {
      handleServiceError(error, res, "Failed to update venue collection");
    }
  });

  app.delete("/api/venue-collections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.deleteCollection(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to delete venue collection");
    }
  });

  app.post("/api/venue-collections/:id/venues", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const collection = await venuesService.addVenuesToCollection(
        req.params.id,
        req.body,
        req.user.claims.sub,
        actorId
      );
      res.json(collection);
    } catch (error) {
      handleServiceError(error, res, "Failed to add venues to collection");
    }
  });

  app.delete("/api/venue-collections/:collectionId/venues/:venueId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.removeVenueFromCollection(
        req.params.collectionId,
        req.params.venueId,
        actorId
      );
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to remove venue from collection");
    }
  });

  app.put("/api/venue-collections/:id/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { venueIds } = req.body;
      if (!Array.isArray(venueIds)) {
        return res.status(400).json({ message: "venueIds must be an array" });
      }
      const actorId = getActorId(req);
      const collection = await venuesService.reorderVenuesInCollection(
        req.params.id,
        venueIds,
        actorId
      );
      res.json(collection);
    } catch (error) {
      handleServiceError(error, res, "Failed to reorder venues in collection");
    }
  });

  app.get("/api/venues/:venueId/floorplans", isAuthenticated, async (req, res) => {
    try {
      const floorplans = await venuesService.getVenueFloorplans(req.params.venueId);
      res.json(floorplans);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue floorplans");
    }
  });

  app.get("/api/floorplans/:id", isAuthenticated, async (req, res) => {
    try {
      const floorplan = await venuesService.getFloorplanById(req.params.id);
      res.json(floorplan);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch floorplan");
    }
  });

  app.post("/api/venues/:venueId/floorplans", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const { fileUrl, thumbnailUrl, fileType, title, caption, sortOrder } = req.body;
      const floorplan = await venuesService.createFloorplan(
        req.params.venueId,
        { fileUrl, thumbnailUrl, fileType, title, caption, sortOrder },
        actorId,
        req.user?.id
      );
      res.status(201).json(floorplan);
    } catch (error) {
      handleServiceError(error, res, "Failed to create floorplan");
    }
  });

  app.post("/api/venues/:venueId/floorplans/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { floorplans: floorplansData } = req.body;
      if (!Array.isArray(floorplansData) || floorplansData.length === 0) {
        return res.status(400).json({ message: "floorplans must be a non-empty array" });
      }
      const actorId = getActorId(req);
      const floorplans = await venuesService.createFloorplansBulk(
        req.params.venueId,
        floorplansData,
        actorId,
        req.user?.id
      );
      res.status(201).json(floorplans);
    } catch (error) {
      handleServiceError(error, res, "Failed to create floorplans");
    }
  });

  app.patch("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      const floorplan = await venuesService.updateFloorplan(
        req.params.id,
        { title, caption, sortOrder, thumbnailUrl },
        actorId
      );
      res.json(floorplan);
    } catch (error) {
      handleServiceError(error, res, "Failed to update floorplan");
    }
  });

  app.delete("/api/floorplans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.deleteFloorplan(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to delete floorplan");
    }
  });

  app.get("/api/venues/:venueId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await venuesService.getVenuePhotos(req.params.venueId);
      res.json(photos);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue photos");
    }
  });

  app.post("/api/venues/:venueId/photos", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const photo = await venuesService.createPhoto(req.params.venueId, req.body, actorId);
      res.status(201).json(photo);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue photo");
    }
  });

  app.post("/api/venues/:venueId/photos/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { photos: photosData } = req.body;
      if (!Array.isArray(photosData) || photosData.length === 0) {
        return res.status(400).json({ message: "photos must be a non-empty array" });
      }
      const actorId = getActorId(req);
      const photos = await venuesService.createPhotosBulk(req.params.venueId, photosData, actorId);
      res.status(201).json(photos);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue photos");
    }
  });

  app.put("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const photo = await venuesService.updatePhoto(req.params.id, req.body, actorId);
      res.json(photo);
    } catch (error) {
      handleServiceError(error, res, "Failed to update venue photo");
    }
  });

  app.delete("/api/venue-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.deletePhoto(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to delete venue photo");
    }
  });

  app.put("/api/venues/:venueId/photos/:photoId/hero", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.setPhotoHero(req.params.venueId, req.params.photoId, actorId);
      res.json({ success: true });
    } catch (error) {
      handleServiceError(error, res, "Failed to set hero photo");
    }
  });

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

  app.get("/api/venues/:venueId/files", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const files = await venuesService.getVenueFiles(req.params.venueId, category);
      res.json(files);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue files");
    }
  });

  app.get("/api/venue-files/:id", isAuthenticated, async (req, res) => {
    try {
      const file = await venuesService.getVenueFileById(req.params.id);
      res.json(file);
    } catch (error) {
      handleServiceError(error, res, "Failed to fetch venue file");
    }
  });

  app.post("/api/venue-files/upload", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const { venueId, category, fileData, filename, mimeType, title, caption } = req.body;
      const result = await venuesService.uploadFile(
        { venueId, category, fileData, filename, mimeType, title, caption },
        actorId,
        req.user?.id
      );
      res.status(201).json(result);
    } catch (error) {
      handleServiceError(error, res, "Failed to upload venue file");
    }
  });

  app.post("/api/venues/:venueId/files", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const { category, fileUrl, thumbnailUrl, fileType, originalFilename, mimeType, title, caption, sortOrder } = req.body;
      const file = await venuesService.createFile(
        req.params.venueId,
        { category, fileUrl, thumbnailUrl, fileType, originalFilename, mimeType, title, caption, sortOrder },
        actorId,
        req.user?.id
      );
      res.status(201).json(file);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue file");
    }
  });

  app.post("/api/venues/:venueId/files/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { files: filesData } = req.body;
      if (!Array.isArray(filesData) || filesData.length === 0) {
        return res.status(400).json({ message: "files must be a non-empty array" });
      }
      const actorId = getActorId(req);
      const files = await venuesService.createFilesBulk(
        req.params.venueId,
        filesData,
        actorId,
        req.user?.id
      );
      res.status(201).json(files);
    } catch (error) {
      handleServiceError(error, res, "Failed to create venue files");
    }
  });

  app.patch("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      const { title, caption, sortOrder, thumbnailUrl } = req.body;
      const file = await venuesService.updateFile(
        req.params.id,
        { title, caption, sortOrder, thumbnailUrl },
        actorId
      );
      res.json(file);
    } catch (error) {
      handleServiceError(error, res, "Failed to update venue file");
    }
  });

  app.delete("/api/venue-files/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = getActorId(req);
      await venuesService.deleteFile(req.params.id, actorId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res, "Failed to delete venue file");
    }
  });
}
