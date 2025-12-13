import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export interface StagedPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  isHero?: boolean;
}

export interface StagedFloorplan {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: "image" | "pdf";
  title?: string;
  caption?: string;
  sortOrder: number;
}

export interface StagedAttachment {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: string;
  mimeType?: string;
  originalFilename?: string;
  title?: string;
  caption?: string;
  sortOrder: number;
}

interface StagedAssets {
  photos: StagedPhoto[];
  floorplans: StagedFloorplan[];
  attachments: StagedAttachment[];
}

interface UseStagedAssetsReturn {
  stagedAssets: StagedAssets;
  addStagedPhoto: (photo: Omit<StagedPhoto, "id">) => string;
  addStagedFloorplan: (floorplan: Omit<StagedFloorplan, "id">) => string;
  addStagedAttachment: (attachment: Omit<StagedAttachment, "id">) => string;
  removeStagedPhoto: (id: string) => void;
  removeStagedFloorplan: (id: string) => void;
  removeStagedAttachment: (id: string) => void;
  updateStagedPhotoOrder: (photos: StagedPhoto[]) => void;
  syncStagedAssets: (venueId: string) => Promise<{ success: boolean; errors: string[] }>;
  clearStagedAssets: () => void;
  cleanupStagedFiles: () => Promise<void>;
  hasStagedAssets: boolean;
}

function generateId(): string {
  return `staged-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useStagedAssets(): UseStagedAssetsReturn {
  const [stagedAssets, setStagedAssets] = useState<StagedAssets>({
    photos: [],
    floorplans: [],
    attachments: [],
  });

  const addStagedPhoto = useCallback((photo: Omit<StagedPhoto, "id">): string => {
    const id = generateId();
    setStagedAssets((prev) => ({
      ...prev,
      photos: [...prev.photos, { ...photo, id }],
    }));
    return id;
  }, []);

  const addStagedFloorplan = useCallback((floorplan: Omit<StagedFloorplan, "id">): string => {
    const id = generateId();
    setStagedAssets((prev) => ({
      ...prev,
      floorplans: [...prev.floorplans, { ...floorplan, id }],
    }));
    return id;
  }, []);

  const addStagedAttachment = useCallback((attachment: Omit<StagedAttachment, "id">): string => {
    const id = generateId();
    setStagedAssets((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { ...attachment, id }],
    }));
    return id;
  }, []);

  const removeStagedPhoto = useCallback((id: string) => {
    setStagedAssets((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
  }, []);

  const removeStagedFloorplan = useCallback((id: string) => {
    setStagedAssets((prev) => ({
      ...prev,
      floorplans: prev.floorplans.filter((f) => f.id !== id),
    }));
  }, []);

  const removeStagedAttachment = useCallback((id: string) => {
    setStagedAssets((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  }, []);

  const updateStagedPhotoOrder = useCallback((photos: StagedPhoto[]) => {
    setStagedAssets((prev) => ({
      ...prev,
      photos,
    }));
  }, []);

  const syncStagedAssets = useCallback(async (venueId: string): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];

    try {
      if (stagedAssets.photos.length > 0) {
        const photosToCreate = stagedAssets.photos.map((p, index) => ({
          url: p.url,
          altText: p.altText,
          sortOrder: index,
          isHero: index === 0,
        }));

        const response = await apiRequest("POST", `/api/venues/${venueId}/photos/bulk`, {
          photos: photosToCreate,
        });

        if (!response.ok) {
          errors.push("Failed to save photos");
        }
      }

      if (stagedAssets.floorplans.length > 0) {
        const floorplansToCreate = stagedAssets.floorplans.map((f, index) => ({
          fileUrl: f.fileUrl,
          thumbnailUrl: f.thumbnailUrl,
          fileType: f.fileType,
          title: f.title,
          caption: f.caption,
          sortOrder: index,
        }));

        const response = await apiRequest("POST", `/api/venues/${venueId}/floorplans/bulk`, {
          floorplans: floorplansToCreate,
        });

        if (!response.ok) {
          errors.push("Failed to save floorplans");
        }
      }

      if (stagedAssets.attachments.length > 0) {
        const attachmentsToCreate = stagedAssets.attachments.map((a, index) => ({
          fileUrl: a.fileUrl,
          thumbnailUrl: a.thumbnailUrl,
          fileType: a.fileType,
          mimeType: a.mimeType,
          originalFilename: a.originalFilename,
          title: a.title,
          caption: a.caption,
          sortOrder: index,
          category: "attachment",
        }));

        const response = await apiRequest("POST", `/api/venues/${venueId}/files/bulk`, {
          files: attachmentsToCreate,
        });

        if (!response.ok) {
          errors.push("Failed to save attachments");
        }
      }

      if (errors.length === 0) {
        setStagedAssets({ photos: [], floorplans: [], attachments: [] });
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Failed to sync assets");
      return { success: false, errors };
    }
  }, [stagedAssets]);

  const clearStagedAssets = useCallback(() => {
    setStagedAssets({ photos: [], floorplans: [], attachments: [] });
  }, []);

  const cleanupStagedFiles = useCallback(async () => {
    const allUrls = [
      ...stagedAssets.photos.map((p) => p.url),
      ...stagedAssets.floorplans.map((f) => f.fileUrl),
      ...stagedAssets.attachments.map((a) => a.fileUrl),
    ];

    for (const url of allUrls) {
      try {
        await apiRequest("DELETE", "/api/photos", { photoUrl: url });
      } catch (err) {
        console.error("Failed to cleanup staged file:", url, err);
      }
    }

    clearStagedAssets();
  }, [stagedAssets, clearStagedAssets]);

  const hasStagedAssets =
    stagedAssets.photos.length > 0 ||
    stagedAssets.floorplans.length > 0 ||
    stagedAssets.attachments.length > 0;

  return {
    stagedAssets,
    addStagedPhoto,
    addStagedFloorplan,
    addStagedAttachment,
    removeStagedPhoto,
    removeStagedFloorplan,
    removeStagedAttachment,
    updateStagedPhotoOrder,
    syncStagedAssets,
    clearStagedAssets,
    cleanupStagedFiles,
    hasStagedAssets,
  };
}
