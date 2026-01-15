/**
 * Reference Data Routes
 * 
 * Routes for managing reference/lookup data:
 * - Tags (6 routes)
 * - Amenities (5 routes)
 * - Industries (5 routes)
 * - Deal Services (5 routes)
 * - Brands (5 routes)
 * 
 * Total: 26 routes
 */

import type { Express } from "express";
import { isAuthenticated, isManagerOrAdmin } from "../../googleAuth";
import { logAuditEvent, getChangedFields } from "../../audit";
import { referenceDataStorage } from "./reference-data.storage";
import {
  insertTagSchema,
  updateTagSchema,
  insertIndustrySchema,
  updateIndustrySchema,
  insertDealServiceSchema,
  insertBrandSchema,
  updateBrandSchema,
} from "@shared/schema";

export function registerReferenceDataRoutes(app: Express): void {
  // ===== TAG ROUTES (6) =====

  // GET /api/tags - Get all tags (optionally filtered by category)
  app.get("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const tags = await referenceDataStorage.getTags(category);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // GET /api/tags/category/:category - Get tags by category
  app.get("/api/tags/category/:category", isAuthenticated, async (req, res) => {
    try {
      const tags = await referenceDataStorage.getTagsByCategory(req.params.category);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags by category:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // GET /api/tags/:id - Get single tag
  app.get("/api/tags/:id", isAuthenticated, async (req, res) => {
    try {
      const tag = await referenceDataStorage.getTagById(req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      console.error("Error fetching tag:", error);
      res.status(500).json({ message: "Failed to fetch tag" });
    }
  });

  // POST /api/tags - Create new tag
  app.post("/api/tags", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTagSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const tag = await referenceDataStorage.createTag(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "tag",
        entityId: tag.id,
        status: "success",
        metadata: { name: tag.name, category: tag.category },
      });
      
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating tag:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "tag",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  // PATCH /api/tags/:id - Update tag
  app.patch("/api/tags/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = updateTagSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await referenceDataStorage.getTagById(req.params.id);
      const tag = await referenceDataStorage.updateTag(req.params.id, validatedData.data);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "tag",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, tag),
      });
      
      res.json(tag);
    } catch (error) {
      console.error("Error updating tag:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "tag",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update tag" });
    }
  });

  // DELETE /api/tags/:id - Delete tag
  app.delete("/api/tags/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tag = await referenceDataStorage.getTagById(req.params.id);
      await referenceDataStorage.deleteTag(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "tag",
        entityId: req.params.id,
        status: "success",
        metadata: { name: tag?.name, category: tag?.category },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tag:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "tag",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // ===== AMENITY ROUTES (5) =====

  // GET /api/amenities - Get all amenities
  app.get("/api/amenities", isAuthenticated, async (req, res) => {
    try {
      const amenities = await referenceDataStorage.getAmenities();
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching amenities:", error);
      res.status(500).json({ message: "Failed to fetch amenities" });
    }
  });

  // GET /api/amenities/:id - Get single amenity
  app.get("/api/amenities/:id", isAuthenticated, async (req, res) => {
    try {
      const amenity = await referenceDataStorage.getAmenityById(req.params.id);
      if (!amenity) {
        return res.status(404).json({ message: "Amenity not found" });
      }
      res.json(amenity);
    } catch (error) {
      console.error("Error fetching amenity:", error);
      res.status(500).json({ message: "Failed to fetch amenity" });
    }
  });

  // POST /api/amenities - Create new amenity
  app.post("/api/amenities", isAuthenticated, async (req: any, res) => {
    try {
      const amenity = await referenceDataStorage.createAmenity(req.body);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "amenity",
        entityId: amenity.id,
        status: "success",
        metadata: { name: amenity.name },
      });
      
      res.status(201).json(amenity);
    } catch (error) {
      console.error("Error creating amenity:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "amenity",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create amenity" });
    }
  });

  // PATCH /api/amenities/:id - Update amenity
  app.patch("/api/amenities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const original = await referenceDataStorage.getAmenityById(req.params.id);
      const amenity = await referenceDataStorage.updateAmenity(req.params.id, req.body);
      if (!amenity) {
        return res.status(404).json({ message: "Amenity not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "amenity",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, amenity),
      });
      
      res.json(amenity);
    } catch (error) {
      console.error("Error updating amenity:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "amenity",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update amenity" });
    }
  });

  // DELETE /api/amenities/:id - Delete amenity
  app.delete("/api/amenities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const amenity = await referenceDataStorage.getAmenityById(req.params.id);
      await referenceDataStorage.deleteAmenity(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "amenity",
        entityId: req.params.id,
        status: "success",
        metadata: { name: amenity?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting amenity:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "amenity",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete amenity" });
    }
  });

  // ===== INDUSTRY ROUTES (5) =====

  // GET /api/industries - Get all industries
  app.get("/api/industries", isAuthenticated, async (req, res) => {
    try {
      const industries = await referenceDataStorage.getIndustries();
      res.json(industries);
    } catch (error) {
      console.error("Error fetching industries:", error);
      res.status(500).json({ message: "Failed to fetch industries" });
    }
  });

  // GET /api/industries/:id - Get single industry
  app.get("/api/industries/:id", isAuthenticated, async (req, res) => {
    try {
      const industry = await referenceDataStorage.getIndustryById(req.params.id);
      if (!industry) {
        return res.status(404).json({ message: "Industry not found" });
      }
      res.json(industry);
    } catch (error) {
      console.error("Error fetching industry:", error);
      res.status(500).json({ message: "Failed to fetch industry" });
    }
  });

  // POST /api/industries - Create new industry
  app.post("/api/industries", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertIndustrySchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const industry = await referenceDataStorage.createIndustry(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "industry",
        entityId: industry.id,
        status: "success",
        metadata: { name: industry.name },
      });
      
      res.status(201).json(industry);
    } catch (error) {
      console.error("Error creating industry:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "industry",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create industry" });
    }
  });

  // PATCH /api/industries/:id - Update industry
  app.patch("/api/industries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = updateIndustrySchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await referenceDataStorage.getIndustryById(req.params.id);
      const industry = await referenceDataStorage.updateIndustry(req.params.id, validatedData.data);
      if (!industry) {
        return res.status(404).json({ message: "Industry not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "industry",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, industry),
      });
      
      res.json(industry);
    } catch (error) {
      console.error("Error updating industry:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "industry",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update industry" });
    }
  });

  // DELETE /api/industries/:id - Delete industry
  app.delete("/api/industries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const industry = await referenceDataStorage.getIndustryById(req.params.id);
      await referenceDataStorage.deleteIndustry(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "industry",
        entityId: req.params.id,
        status: "success",
        metadata: { name: industry?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting industry:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "industry",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete industry" });
    }
  });

  // ===== DEAL SERVICE ROUTES (5) =====

  // GET /api/deal-services - Get all deal services
  app.get("/api/deal-services", isAuthenticated, async (req, res) => {
    try {
      const services = await referenceDataStorage.getDealServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching deal services:", error);
      res.status(500).json({ message: "Failed to fetch deal services" });
    }
  });

  // GET /api/deal-services/:id - Get single deal service
  app.get("/api/deal-services/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await referenceDataStorage.getDealServiceById(parseInt(req.params.id));
      if (!service) {
        return res.status(404).json({ message: "Deal service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching deal service:", error);
      res.status(500).json({ message: "Failed to fetch deal service" });
    }
  });

  // POST /api/deal-services - Create new deal service
  app.post("/api/deal-services", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDealServiceSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const service = await referenceDataStorage.createDealService(validatedData.data);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_service",
        entityId: String(service.id),
        status: "success",
        metadata: { name: service.name },
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating deal service:", error);
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_service",
        entityId: null,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to create deal service" });
    }
  });

  // PATCH /api/deal-services/:id - Update deal service
  app.patch("/api/deal-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDealServiceSchema.partial().safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validatedData.error.errors 
        });
      }
      const original = await referenceDataStorage.getDealServiceById(parseInt(req.params.id));
      const service = await referenceDataStorage.updateDealService(parseInt(req.params.id), validatedData.data);
      if (!service) {
        return res.status(404).json({ message: "Deal service not found" });
      }
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, service),
      });
      
      res.json(service);
    } catch (error) {
      console.error("Error updating deal service:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update deal service" });
    }
  });

  // DELETE /api/deal-services/:id - Delete deal service
  app.delete("/api/deal-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const service = await referenceDataStorage.getDealServiceById(parseInt(req.params.id));
      await referenceDataStorage.deleteDealService(parseInt(req.params.id));
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "success",
        metadata: { name: service?.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting deal service:", error);
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_service",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to delete deal service" });
    }
  });

  // ===== BRAND ROUTES (5) =====

  // GET /api/brands - Get all brands
  app.get("/api/brands", isAuthenticated, async (req, res) => {
    try {
      const brands = await referenceDataStorage.getBrands();
      res.json(brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  // GET /api/brands/:id - Get a single brand
  app.get("/api/brands/:id", isAuthenticated, async (req, res) => {
    try {
      const brand = await referenceDataStorage.getBrandById(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  // POST /api/brands - Create a new brand
  app.post("/api/brands", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await referenceDataStorage.createBrand(validatedData);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "brand",
        entityId: brand.id,
        metadata: { name: brand.name },
      });
      
      res.status(201).json(brand);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  // PATCH /api/brands/:id - Update a brand
  app.patch("/api/brands/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingBrand = await referenceDataStorage.getBrandById(req.params.id);
      if (!existingBrand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      const validatedData = updateBrandSchema.parse(req.body);
      const brand = await referenceDataStorage.updateBrand(req.params.id, validatedData);
      
      const changes = getChangedFields(existingBrand, brand);
      await logAuditEvent(req, {
        action: "update",
        entityType: "brand",
        entityId: req.params.id,
        changes,
      });
      
      res.json(brand);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  // DELETE /api/brands/:id - Delete a brand
  app.delete("/api/brands/:id", isAuthenticated, isManagerOrAdmin, async (req: any, res) => {
    try {
      const brand = await referenceDataStorage.getBrandById(req.params.id);
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      
      await referenceDataStorage.deleteBrand(req.params.id);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "brand",
        entityId: req.params.id,
        metadata: { name: brand.name },
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });
}
