import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceError } from "../services/base.service";
import { EventCapture } from "./events-helper";
import type { IStorage } from "../storage";
import { createMockStorage } from "./mock-storage";

const { mockVenuesStorage, mockObjectStorageService } = vi.hoisted(() => ({
  mockVenuesStorage: {
    getVenuesWithRelations: vi.fn(),
    getVenueById: vi.fn(),
    getVenueByIdWithRelations: vi.fn(),
    createVenue: vi.fn(),
    updateVenue: vi.fn(),
    deleteVenue: vi.fn(),
    setVenueAmenities: vi.fn(),
    setVenueTags: vi.fn(),
    getVenueAmenities: vi.fn(),
    getVenueTags: vi.fn(),
    getCollectionsForVenue: vi.fn(),
    createVenuePhoto: vi.fn(),
    createVenuePhotos: vi.fn(),
    getVenuePhotoById: vi.fn(),
    updateVenuePhoto: vi.fn(),
    deleteVenuePhoto: vi.fn(),
    setVenuePhotoHero: vi.fn(),
    getVenuePhotos: vi.fn(),
    createVenueFile: vi.fn(),
    createVenueFiles: vi.fn(),
    getVenueFileById: vi.fn(),
    updateVenueFile: vi.fn(),
    deleteVenueFile: vi.fn(),
    getVenueFiles: vi.fn(),
    getVenueCollections: vi.fn(),
    getVenueCollectionById: vi.fn(),
    createVenueCollection: vi.fn(),
    updateVenueCollection: vi.fn(),
    deleteVenueCollection: vi.fn(),
    addVenuesToCollection: vi.fn(),
    removeVenueFromCollection: vi.fn(),
    reorderVenuesInCollection: vi.fn(),
  },
  mockObjectStorageService: {
    deleteObject: vi.fn(),
    uploadBuffer: vi.fn(),
  },
}));

vi.mock("../domains/venues/venues.storage", () => ({
  venuesStorage: mockVenuesStorage,
}));

vi.mock("../objectStorage", () => {
  return {
    ObjectStorageService: class {
      deleteObject = mockObjectStorageService.deleteObject;
      uploadBuffer = mockObjectStorageService.uploadBuffer;
    },
  };
});

vi.mock("../audit", () => ({
  getChangedFields: vi.fn().mockReturnValue({ before: {}, after: {} }),
}));

import { VenuesService } from "../domains/venues/venues.service";

interface VenueFixture {
  id: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  streetAddress1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

const makeVenue = (overrides: Partial<VenueFixture> = {}): VenueFixture => ({
  id: "venue-1",
  name: "Grand Hall",
  shortDescription: null,
  longDescription: null,
  streetAddress1: null,
  city: null,
  state: null,
  zip: null,
  country: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

interface VenueWithRelationsFixture extends VenueFixture {
  amenities: unknown[];
  tags: unknown[];
  photos: unknown[];
  files: unknown[];
}

const makeVenueWithRelations = (
  overrides: Partial<VenueWithRelationsFixture> = {},
): VenueWithRelationsFixture => ({
  ...makeVenue(),
  amenities: [],
  tags: [],
  photos: [],
  files: [],
  ...overrides,
});

interface PhotoFixture {
  id: string;
  venueId: string;
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isHero: boolean;
  createdAt: Date;
}

const makePhoto = (overrides: Partial<PhotoFixture> = {}): PhotoFixture => ({
  id: "photo-1",
  venueId: "venue-1",
  url: "https://example.com/photo.jpg",
  thumbnailUrl: null,
  altText: null,
  sortOrder: 0,
  isHero: false,
  createdAt: new Date(),
  ...overrides,
});

interface FileFixture {
  id: string;
  venueId: string;
  category: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileType: string;
  title: string | null;
  caption: string | null;
  sortOrder: number;
  uploadedById: string | null;
  uploadedAt: Date;
}

const makeFile = (overrides: Partial<FileFixture> = {}): FileFixture => ({
  id: "file-1",
  venueId: "venue-1",
  category: "floorplan",
  fileUrl: "https://example.com/file.pdf",
  thumbnailUrl: null,
  fileType: "pdf",
  title: null,
  caption: null,
  sortOrder: 0,
  uploadedById: null,
  uploadedAt: new Date(),
  ...overrides,
});

interface CollectionFixture {
  id: string;
  name: string;
  description: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const makeCollection = (overrides: Partial<CollectionFixture> = {}): CollectionFixture => ({
  id: "coll-1",
  name: "My Collection",
  description: null,
  createdById: "actor-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("VenuesService", () => {
  let storage: IStorage;
  let service: VenuesService;
  let events: EventCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createMockStorage();
    service = new VenuesService(storage);
    events = new EventCapture();
  });

  afterEach(() => {
    events.dispose();
  });

  describe("getVenues", () => {
    it("delegates to venuesStorage", async () => {
      mockVenuesStorage.getVenuesWithRelations.mockResolvedValue([]);
      const result = await service.getVenues();
      expect(result).toEqual([]);
      expect(mockVenuesStorage.getVenuesWithRelations).toHaveBeenCalled();
    });
  });

  describe("getVenueById", () => {
    it("returns a venue when found", async () => {
      const venue = makeVenue();
      mockVenuesStorage.getVenueById.mockResolvedValue(venue);

      const result = await service.getVenueById("venue-1");
      expect(result).toEqual(venue);
    });

    it("throws NOT_FOUND when venue is missing", async () => {
      mockVenuesStorage.getVenueById.mockResolvedValue(undefined);

      await expect(service.getVenueById("missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("createVenue", () => {
    it("creates a venue and emits venue:created", async () => {
      const venue = makeVenue();
      const venueWithRelations = makeVenueWithRelations();
      mockVenuesStorage.createVenue.mockResolvedValue(venue);
      mockVenuesStorage.getVenueByIdWithRelations.mockResolvedValue(venueWithRelations);

      const result = await service.createVenue(
        { name: "Grand Hall" },
        "actor-1",
      );

      expect(result).toEqual(venueWithRelations);
      expect(mockVenuesStorage.createVenue).toHaveBeenCalled();

      const emitted = events.ofType("venue:created");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].venueName).toBe("Grand Hall");
    });

    it("sets amenities and tags when provided", async () => {
      const venue = makeVenue();
      mockVenuesStorage.createVenue.mockResolvedValue(venue);
      mockVenuesStorage.getVenueByIdWithRelations.mockResolvedValue(makeVenueWithRelations());

      await service.createVenue(
        {
          name: "Hall",
          amenityIds: ["a1", "a2"],
          cuisineTagIds: ["t1"],
          styleTagIds: ["t2"],
        },
        "actor-1",
      );

      expect(mockVenuesStorage.setVenueAmenities).toHaveBeenCalledWith("venue-1", ["a1", "a2"]);
      expect(mockVenuesStorage.setVenueTags).toHaveBeenCalledWith("venue-1", ["t1", "t2"]);
    });

    it("throws validation error for empty name", async () => {
      await expect(
        service.createVenue({ name: "" }, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("updateVenue", () => {
    it("updates a venue and emits venue:updated", async () => {
      const existing = makeVenue();
      const updated = makeVenue({ name: "Updated Hall" });
      const updatedWithRelations = makeVenueWithRelations({ name: "Updated Hall" });
      mockVenuesStorage.getVenueById.mockResolvedValue(existing);
      mockVenuesStorage.updateVenue.mockResolvedValue(updated);
      mockVenuesStorage.getVenueByIdWithRelations.mockResolvedValue(updatedWithRelations);

      const result = await service.updateVenue(
        "venue-1",
        { name: "Updated Hall" },
        "actor-1",
      );

      expect(result).toEqual(updatedWithRelations);
      const emitted = events.ofType("venue:updated");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when venue is missing", async () => {
      mockVenuesStorage.getVenueById.mockResolvedValue(undefined);

      await expect(
        service.updateVenue("missing", { name: "X" }, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteVenue", () => {
    it("deletes a venue and emits venue:deleted", async () => {
      const venue = makeVenue();
      mockVenuesStorage.getVenueById.mockResolvedValue(venue);
      mockVenuesStorage.deleteVenue.mockResolvedValue(undefined);

      await service.deleteVenue("venue-1", "actor-1");

      expect(mockVenuesStorage.deleteVenue).toHaveBeenCalledWith("venue-1");
      const emitted = events.ofType("venue:deleted");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].venueName).toBe("Grand Hall");
    });

    it("throws NOT_FOUND when venue is missing", async () => {
      mockVenuesStorage.getVenueById.mockResolvedValue(undefined);

      await expect(
        service.deleteVenue("missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createPhoto", () => {
    it("creates a photo and emits venue:photo_uploaded", async () => {
      const photo = makePhoto();
      mockVenuesStorage.createVenuePhoto.mockResolvedValue(photo);

      const result = await service.createPhoto(
        "venue-1",
        { url: "https://example.com/photo.jpg" },
        "actor-1",
      );

      expect(result).toEqual(photo);
      const emitted = events.ofType("venue:photo_uploaded");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].photoId).toBe("photo-1");
    });

    it("throws validation error for missing url", async () => {
      await expect(
        service.createPhoto("venue-1", { url: "" }, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("deletePhoto", () => {
    it("deletes a photo and emits venue:photo_deleted", async () => {
      const photo = makePhoto({ url: "/objects/venues/photo.jpg" });
      mockVenuesStorage.getVenuePhotoById.mockResolvedValue(photo);
      mockVenuesStorage.deleteVenuePhoto.mockResolvedValue(undefined);
      mockObjectStorageService.deleteObject.mockResolvedValue(undefined);

      await service.deletePhoto("photo-1", "actor-1");

      expect(mockVenuesStorage.deleteVenuePhoto).toHaveBeenCalledWith("photo-1");
      expect(mockObjectStorageService.deleteObject).toHaveBeenCalled();
      const emitted = events.ofType("venue:photo_deleted");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when photo is missing", async () => {
      mockVenuesStorage.getVenuePhotoById.mockResolvedValue(undefined);

      await expect(
        service.deletePhoto("missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("setPhotoHero", () => {
    it("sets photo as hero", async () => {
      const photo = makePhoto();
      mockVenuesStorage.getVenuePhotoById.mockResolvedValue(photo);
      mockVenuesStorage.setVenuePhotoHero.mockResolvedValue(undefined);

      await service.setPhotoHero("venue-1", "photo-1", "actor-1");

      expect(mockVenuesStorage.setVenuePhotoHero).toHaveBeenCalledWith("venue-1", "photo-1");
    });

    it("throws NOT_FOUND when photo does not belong to venue", async () => {
      const photo = makePhoto({ venueId: "other-venue" });
      mockVenuesStorage.getVenuePhotoById.mockResolvedValue(photo);

      await expect(
        service.setPhotoHero("venue-1", "photo-1", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createFloorplan", () => {
    it("creates a floorplan and emits venue:file_uploaded", async () => {
      const file = makeFile();
      mockVenuesStorage.createVenueFile.mockResolvedValue(file);

      const result = await service.createFloorplan(
        "venue-1",
        { fileUrl: "https://example.com/plan.pdf", fileType: "pdf" },
        "actor-1",
      );

      expect(result).toEqual(file);
      const emitted = events.ofType("venue:file_uploaded");
      expect(emitted).toHaveLength(1);
      expect(emitted[0].fileId).toBe("file-1");
    });

    it("throws validation for missing fileUrl", async () => {
      await expect(
        service.createFloorplan("venue-1", { fileUrl: "", fileType: "pdf" }, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("throws validation for invalid fileType", async () => {
      await expect(
        service.createFloorplan(
          "venue-1",
          { fileUrl: "https://x.com/f.txt", fileType: "text" },
          "actor-1",
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("deleteFloorplan", () => {
    it("deletes a floorplan and emits venue:file_deleted", async () => {
      const file = makeFile({ fileUrl: "/objects/venues/plan.pdf" });
      mockVenuesStorage.getVenueFileById.mockResolvedValue(file);
      mockVenuesStorage.deleteVenueFile.mockResolvedValue(undefined);
      mockObjectStorageService.deleteObject.mockResolvedValue(undefined);

      await service.deleteFloorplan("file-1", "actor-1");

      expect(mockVenuesStorage.deleteVenueFile).toHaveBeenCalledWith("file-1");
      const emitted = events.ofType("venue:file_deleted");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when file is missing", async () => {
      mockVenuesStorage.getVenueFileById.mockResolvedValue(undefined);

      await expect(
        service.deleteFloorplan("missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createFile", () => {
    it("creates a file and emits venue:file_uploaded", async () => {
      const file = makeFile({ category: "attachment" });
      mockVenuesStorage.createVenueFile.mockResolvedValue(file);

      const result = await service.createFile(
        "venue-1",
        { category: "attachment", fileUrl: "https://x.com/f.pdf", fileType: "pdf" },
        "actor-1",
      );

      expect(result).toEqual(file);
      const emitted = events.ofType("venue:file_uploaded");
      expect(emitted).toHaveLength(1);
    });

    it("throws validation for missing fields", async () => {
      await expect(
        service.createFile("venue-1", { category: "", fileUrl: "", fileType: "" }, "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("throws validation for invalid category", async () => {
      await expect(
        service.createFile(
          "venue-1",
          { category: "invalid", fileUrl: "https://x.com/f.pdf", fileType: "pdf" },
          "actor-1",
        ),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("deleteFile", () => {
    it("deletes a file and emits venue:file_deleted", async () => {
      const file = makeFile({ fileUrl: "/objects/venues/doc.pdf" });
      mockVenuesStorage.getVenueFileById.mockResolvedValue(file);
      mockVenuesStorage.deleteVenueFile.mockResolvedValue(undefined);
      mockObjectStorageService.deleteObject.mockResolvedValue(undefined);

      await service.deleteFile("file-1", "actor-1");

      expect(mockVenuesStorage.deleteVenueFile).toHaveBeenCalledWith("file-1");
      const emitted = events.ofType("venue:file_deleted");
      expect(emitted).toHaveLength(1);
    });

    it("throws NOT_FOUND when file is missing", async () => {
      mockVenuesStorage.getVenueFileById.mockResolvedValue(undefined);

      await expect(
        service.deleteFile("missing", "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createCollection", () => {
    it("creates a collection and emits event", async () => {
      const collection = makeCollection();
      mockVenuesStorage.createVenueCollection.mockResolvedValue(collection);

      const result = await service.createCollection(
        { name: "My Collection" },
        "actor-1",
        "actor-1",
      );

      expect(result).toEqual(collection);
      expect(mockVenuesStorage.createVenueCollection).toHaveBeenCalled();
    });

    it("throws validation for empty name", async () => {
      await expect(
        service.createCollection({ name: "" }, "actor-1", "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("updateCollection", () => {
    it("updates a collection and emits event", async () => {
      const original = makeCollection();
      const updated = makeCollection({ name: "Updated" });
      mockVenuesStorage.getVenueCollectionById.mockResolvedValue(original);
      mockVenuesStorage.updateVenueCollection.mockResolvedValue(updated);

      const result = await service.updateCollection(
        "coll-1",
        { name: "Updated" },
        "actor-1",
      );

      expect(result).toEqual(updated);
    });

    it("throws NOT_FOUND when collection is missing", async () => {
      mockVenuesStorage.getVenueCollectionById.mockResolvedValue(null);
      mockVenuesStorage.updateVenueCollection.mockResolvedValue(undefined);

      await expect(
        service.updateCollection("missing", { name: "X" }, "actor-1"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteCollection", () => {
    it("deletes a collection and emits event", async () => {
      const collection = makeCollection();
      mockVenuesStorage.getVenueCollectionById.mockResolvedValue(collection);
      mockVenuesStorage.deleteVenueCollection.mockResolvedValue(undefined);

      await service.deleteCollection("coll-1", "actor-1");

      expect(mockVenuesStorage.deleteVenueCollection).toHaveBeenCalledWith("coll-1");
    });
  });

  describe("addVenuesToCollection", () => {
    it("adds venues and returns updated collection", async () => {
      const collectionWithVenues = { ...makeCollection(), venues: [] };
      mockVenuesStorage.addVenuesToCollection.mockResolvedValue(undefined);
      mockVenuesStorage.getVenueCollectionById.mockResolvedValue(collectionWithVenues);

      const result = await service.addVenuesToCollection(
        "coll-1",
        { venueIds: ["venue-1", "venue-2"] },
        "actor-1",
        "actor-1",
      );

      expect(result).toEqual(collectionWithVenues);
      expect(mockVenuesStorage.addVenuesToCollection).toHaveBeenCalledWith(
        "coll-1",
        ["venue-1", "venue-2"],
        "actor-1",
      );
    });

    it("throws validation for empty venueIds", async () => {
      await expect(
        service.addVenuesToCollection("coll-1", { venueIds: [] }, "actor-1", "actor-1"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("removeVenueFromCollection", () => {
    it("removes a venue from collection", async () => {
      mockVenuesStorage.removeVenueFromCollection.mockResolvedValue(undefined);

      await service.removeVenueFromCollection("coll-1", "venue-1", "actor-1");

      expect(mockVenuesStorage.removeVenueFromCollection).toHaveBeenCalledWith(
        "coll-1",
        "venue-1",
      );
    });
  });

  describe("reorderVenuesInCollection", () => {
    it("reorders venues and returns updated collection", async () => {
      const collectionWithVenues = { ...makeCollection(), venues: [] };
      mockVenuesStorage.reorderVenuesInCollection.mockResolvedValue(undefined);
      mockVenuesStorage.getVenueCollectionById.mockResolvedValue(collectionWithVenues);

      const result = await service.reorderVenuesInCollection(
        "coll-1",
        ["venue-2", "venue-1"],
        "actor-1",
      );

      expect(result).toEqual(collectionWithVenues);
      expect(mockVenuesStorage.reorderVenuesInCollection).toHaveBeenCalledWith(
        "coll-1",
        ["venue-2", "venue-1"],
      );
    });
  });
});
