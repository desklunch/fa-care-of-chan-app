import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isManagerOrAdmin } from "./googleAuth";
import { requirePermission, requireAnyPermission } from "./middleware/permissions";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import OpenAI from "openai";
import sharp from "sharp";
import { 
  updateProfileSchema,
  insertFeatureCategorySchema,
  updateFeatureCategorySchema,
  insertAppFeatureSchema,
  updateAppFeatureSchema,
  insertFeatureCommentSchema,
  insertContactSchema,
  updateContactSchema,
  insertVendorSchema,
  updateVendorSchema,
  publicVendorUpdateSchema,
  featureStatuses,
  type FeatureStatus,
  themeConfigSchema,
  insertAppIssueSchema,
  updateAppIssueSchema,
  issueStatuses,
  type IssueStatus,
  insertFormTemplateSchema,
  updateFormTemplateSchema,
  insertFormRequestSchema,
  updateFormRequestSchema,
  insertFormResponseSchema,
  type RecipientType,
  insertVenueCollectionSchema,
  updateVenueCollectionSchema,
  addVenuesToCollectionSchema,
  insertCommentSchema,
  updateCommentSchema,
  commentEntityTypes,
  insertVenuePhotoSchema,
  updateVenuePhotoSchema,
  insertAppReleaseSchema,
  updateAppReleaseSchema,
  insertAppReleaseChangeSchema,
  releaseStatuses,
  type ReleaseStatus,
  insertVenueSchema,
  updateVenueSchema,
  insertClientSchema,
  updateClientSchema,
} from "@shared/schema";
import { sendVendorUpdateEmail, sendFormRequestEmail } from "./email";
import { logAuditEvent, getChangedFields } from "./audit";
import aiRoutes from "./routes/ai.routes";
import mcpRoutes from "./mcp/transport";
import { requestContextMiddleware, updateRequestContext } from "./lib/request-context";
import { registerReferenceDataRoutes } from "./domains/reference-data";
import { registerAdminRoutes } from "./domains/admin";
import { registerSettingsCommentsRoutes } from "./domains/settings-comments";
import { registerIssuesFeaturesRoutes } from "./domains/issues-features";
import { registerReleasesRoutes } from "./domains/releases";
import { registerContactsRoutes } from "./domains/contacts";
import { registerClientsRoutes } from "./domains/clients";
import { registerVendorsRoutes } from "./domains/vendors";
import { registerDealsRoutes } from "./domains/deals";
import { registerPlacesRoutes } from "./domains/places";
import { registerVenuesRoutes } from "./domains/venues";
import { registerFormsRoutes } from "./domains/forms";
import { registerAiChatRoutes } from "./domains/ai-chat";
import { initializeAuditBridge } from "./lib/audit-bridge";
import { setupCsrf } from "./middleware/csrf";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // CSRF protection - must come after auth (uses session for token validation)
  setupCsrf(app);

  // Request context middleware - must come after auth so we have user info
  app.use(requestContextMiddleware);
  
  // Update context with user info after authentication
  app.use((req: any, res, next) => {
    if (req.user?.claims?.sub) {
      updateRequestContext({ userId: req.user.claims.sub });
    }
    next();
  });

  // Initialize audit bridge - domain events will be persisted to audit_logs
  initializeAuditBridge();

  // Register domain routes
  registerReferenceDataRoutes(app);
  registerAdminRoutes(app);
  registerSettingsCommentsRoutes(app);
  registerIssuesFeaturesRoutes(app);
  registerReleasesRoutes(app);
  registerContactsRoutes(app);
  registerClientsRoutes(app);
  registerVendorsRoutes(app);
  registerDealsRoutes(app);
  registerPlacesRoutes(app);
  registerVenuesRoutes(app);
  registerFormsRoutes(app);
  registerAiChatRoutes(app);

  // NOTE: Contacts routes moved to server/domains/contacts/
  // NOTE: Clients routes moved to server/domains/clients/
  // NOTE: Vendors routes moved to server/domains/vendors/
  // NOTE: Deals routes moved to server/domains/deals/
  // NOTE: Places/Maps routes moved to server/domains/places/
  // NOTE: Venues, Collections, Floorplans routes moved to server/domains/venues/

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Include permission context in response for frontend caching
      const { createPermissionContext, Role } = await import("../shared/permissions");
      const permissionContext = createPermissionContext(user.role as Role);
      
      res.json({
        ...user,
        permissionContext,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: result.error.flatten() 
        });
      }

      // Get user before update for change tracking
      const userBefore = await storage.getUser(userId);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, result.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the profile update
      const changes = getChangedFields(
        userBefore as unknown as Record<string, unknown>,
        updatedUser as unknown as Record<string, unknown>
      );
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: userId,
        changes,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "user",
        entityId: req.user?.claims?.sub,
        status: "failure",
        metadata: { error: String(error) },
      });
      res.status(500).json({ message: "Failed to update profile" });
    }
  });



  // Photo Upload and Object Storage Routes
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const THUMBNAIL_SIZE = 300;

  // Helper function to generate thumbnails
  async function generateThumbnail(buffer: Buffer, contentType: string): Promise<Buffer> {
    let sharpInstance = sharp(buffer);
    
    if (contentType === "image/gif") {
      // For GIFs, just resize without animation
      sharpInstance = sharpInstance.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "center",
      });
    } else {
      sharpInstance = sharpInstance.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: "cover",
        position: "center",
      });
    }
    
    // Convert to WebP for smaller thumbnails (except GIFs)
    if (contentType !== "image/gif") {
      return sharpInstance.webp({ quality: 80 }).toBuffer();
    }
    return sharpInstance.toBuffer();
  }

  // Get upload URL for client-side upload
  app.post("/api/photos/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve objects from storage (public for venues)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = `/objects/${req.params.objectPath}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      objectStorageService.downloadObject(objectFile, res, 604800); // 7 day cache
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      console.error("Error serving object:", error);
      res.status(500).json({ message: "Failed to serve object" });
    }
  });

  // Upload photo from URL (fetch and save to storage)
  app.post("/api/photos/from-url", isAuthenticated, async (req: any, res) => {
    try {
      const { url, venueId } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Fetch the image from URL
      let fetchUrl = url;
      
      // Handle internal proxy URLs (Google Places photos)
      if (url.startsWith("/api/places/photos/")) {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers.host;
        fetchUrl = `${protocol}://${host}${url}`;
      }

      const response = await fetch(fetchUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VenuePhotoFetcher/1.0)",
        },
      });

      if (!response.ok) {
        return res.status(400).json({ message: "Failed to fetch image from URL" });
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!ALLOWED_IMAGE_TYPES.some(t => contentType.startsWith(t.split("/")[0] + "/" + t.split("/")[1]))) {
        return res.status(400).json({ message: "Invalid image type. Allowed: jpg, png, webp, gif, avif" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "Image too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const photoPath = venueId 
        ? `venues/${venueId}/photos/${timestamp}-${randomId}.${ext}`
        : `photos/${timestamp}-${randomId}.${ext}`;
      const thumbPath = venueId 
        ? `venues/${venueId}/thumbnails/${timestamp}-${randomId}.webp`
        : `thumbnails/${timestamp}-${randomId}.webp`;

      const objectStorageService = new ObjectStorageService();

      // Upload original
      const photoObjectPath = await objectStorageService.uploadBuffer(buffer, photoPath, contentType);

      // Generate and upload thumbnail
      const thumbnailBuffer = await generateThumbnail(buffer, contentType);
      const thumbnailContentType = contentType === "image/gif" ? "image/gif" : "image/webp";
      const thumbObjectPath = await objectStorageService.uploadBuffer(thumbnailBuffer, thumbPath, thumbnailContentType);

      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { venueId, originalUrl: url, size: buffer.length },
      });
      
      res.json({
        photoUrl: photoObjectPath,
        thumbnailUrl: thumbObjectPath,
        originalUrl: url,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading photo from URL:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload photo from URL" });
    }
  });

  // Upload photo from base64 data
  app.post("/api/photos/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { data, filename, contentType, venueId } = req.body;
      
      if (!data || !contentType) {
        return res.status(400).json({ message: "Data and content type are required" });
      }

      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return res.status(400).json({ message: "Invalid image type. Allowed: jpg, png, webp, gif, avif" });
      }

      // Decode base64
      const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "Image too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const photoPath = venueId 
        ? `venues/${venueId}/photos/${timestamp}-${randomId}.${ext}`
        : `photos/${timestamp}-${randomId}.${ext}`;
      const thumbPath = venueId 
        ? `venues/${venueId}/thumbnails/${timestamp}-${randomId}.webp`
        : `thumbnails/${timestamp}-${randomId}.webp`;

      const objectStorageService = new ObjectStorageService();

      // Upload original
      const photoObjectPath = await objectStorageService.uploadBuffer(buffer, photoPath, contentType);

      // Generate and upload thumbnail
      const thumbnailBuffer = await generateThumbnail(buffer, contentType);
      const thumbnailContentType = contentType === "image/gif" ? "image/gif" : "image/webp";
      const thumbObjectPath = await objectStorageService.uploadBuffer(thumbnailBuffer, thumbPath, thumbnailContentType);

      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { venueId, filename, size: buffer.length },
      });
      
      res.json({
        photoUrl: photoObjectPath,
        thumbnailUrl: thumbObjectPath,
        filename,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      await logAuditEvent(req, {
        action: "upload",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Delete photo from storage
  app.delete("/api/photos", isAuthenticated, async (req: any, res) => {
    try {
      const { photoUrl, thumbnailUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ message: "Photo URL is required" });
      }

      const objectStorageService = new ObjectStorageService();

      // Delete the main photo
      if (photoUrl.startsWith("/objects/")) {
        await objectStorageService.deleteObject(photoUrl);
      }

      // Delete the thumbnail if provided
      if (thumbnailUrl && thumbnailUrl.startsWith("/objects/")) {
        await objectStorageService.deleteObject(thumbnailUrl);
      }

      await logAuditEvent(req, {
        action: "delete",
        entityType: "photo",
        entityId: null,
        status: "success",
        metadata: { photoUrl, thumbnailUrl },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "photo",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Upload PDF floorplan (no thumbnail generation)
  app.post("/api/floorplans/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { data, filename, contentType, venueId } = req.body;
      
      if (!data || !contentType) {
        return res.status(400).json({ message: "Data and content type are required" });
      }

      if (contentType !== "application/pdf") {
        return res.status(400).json({ message: "This endpoint only accepts PDF files" });
      }

      // Decode base64
      const base64Data = data.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const sanitizedFilename = filename?.replace(/[^a-zA-Z0-9.-]/g, "_") || "floorplan";
      const filePath = venueId 
        ? `venues/${venueId}/floorplans/${timestamp}-${randomId}-${sanitizedFilename}`
        : `floorplans/${timestamp}-${randomId}-${sanitizedFilename}`;

      const objectStorageService = new ObjectStorageService();

      // Upload PDF
      const fileObjectPath = await objectStorageService.uploadBuffer(buffer, filePath, contentType);

      res.json({
        fileUrl: fileObjectPath,
        filename,
        size: buffer.length,
        contentType,
      });
    } catch (error) {
      console.error("Error uploading floorplan:", error);
      res.status(500).json({ message: "Failed to upload floorplan" });
    }
  });


  // AI Context endpoints for MCP readiness
  app.use("/api/ai", aiRoutes);

  // MCP Server endpoints
  app.use("/api/mcp", mcpRoutes);

  return httpServer;
}
