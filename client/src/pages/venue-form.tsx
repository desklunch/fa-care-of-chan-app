import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AmenityToggle } from "@/components/ui/amenity-toggle";
import { TagAssignment } from "@/components/ui/tag-assignment";
import { GooglePlaceSearch, PlaceResult } from "@/components/ui/google-place-search";
import { GooglePlacePhotoPicker } from "@/components/ui/google-place-photo-picker";
import { PhotoUploader } from "@/components/ui/photo-uploader";
import { FloorplanUploader } from "@/components/ui/floorplan-uploader";
import { VenueFileUploader, FileType } from "@/components/ui/venue-file-uploader";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { useStagedAssets, StagedPhoto, StagedFloorplan, StagedAttachment } from "@/hooks/use-staged-assets";
import { Save, Loader2, Plus, Trash2, Image, ImagePlus, ExternalLink, GripVertical, FileText, FileImage, Pencil, X, Check, Download, Copy, File, FileArchive, Sparkles, RefreshCw, Unlink, MapPin } from "lucide-react";
import type { VenueWithRelations, VenueFloorplan, VenueFile, VenueFileWithUploader, VenuePhoto, VenueSpace } from "@shared/schema";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import { formatTimeAgo } from "@/lib/format-time";
import { insertVenueSchema, venueTypes } from "@shared/schema";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const venueTypeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  event_space: "Event Space",
};
const venueFormSchema = insertVenueSchema.extend({
  amenityIds: z.array(z.string()).default([]),
  cuisineTagIds: z.array(z.string()).default([]),
  styleTagIds: z.array(z.string()).default([]),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

interface SortablePhotoItemProps {
  id: string;
  index: number;
  photoUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  onView: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

function SortablePhotoItem({ id, index, photoUrl, thumbnailUrl, altText, onView, onDelete, isDeleting }: SortablePhotoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square bg-muted rounded-lg overflow-visible border ${isDragging ? "ring-2 ring-primary shadow-lg" : ""}`}
      data-testid={`photo-item-${index}`}
    >
      <div className="w-full h-full overflow-hidden rounded-lg">
        {photoUrl ? (
          <img
            src={thumbnailUrl || photoUrl}
            alt={altText || `Gallery photo ${index + 1}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        className="absolute top-1 right-1 h-7 w-7 bg-black/70 hover:bg-black/90 rounded flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        title="Drag to reorder"
        data-testid={`button-drag-photo-${index}`}
      >
        <GripVertical className="h-4 w-4 text-white" />
      </button>

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={onView}
            title="View full size"
            data-testid={`button-view-photo-${index}`}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={onDelete}
            disabled={isDeleting}
            title="Delete photo"
            data-testid={`button-remove-photo-${index}`}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
}

interface FloorplanItemProps {
  floorplan: VenueFloorplan;
  onEdit: (id: string, updates: { title?: string; caption?: string }) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function FloorplanItem({ floorplan, onEdit, onDelete, isDeleting }: FloorplanItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(floorplan.title || "");
  const [editCaption, setEditCaption] = useState(floorplan.caption || "");

  const handleSave = () => {
    onEdit(floorplan.id, { 
      title: editTitle.trim() || undefined, 
      caption: editCaption.trim() || undefined 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(floorplan.title || "");
    setEditCaption(floorplan.caption || "");
    setIsEditing(false);
  };

  const isPdf = floorplan.fileType === "pdf";
  const displayUrl = floorplan.thumbnailUrl || floorplan.fileUrl;
  const uploadedAgo = floorplan.uploadedAt 
    ? formatTimeAgo(new Date(floorplan.uploadedAt))
    : "";

  return (
    <div 
      className="border rounded-lg p-4 space-y-3"
      data-testid={`floorplan-item-${floorplan.id}`}
    >
      <div className="flex gap-4">
        <div className="shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isPdf ? (
            <FileText className="h-12 w-12 text-red-500" />
          ) : displayUrl ? (
            <img 
              src={displayUrl} 
              alt={floorplan.title || "Floorplan"} 
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => window.open(floorplan.fileUrl, "_blank")}
            />
          ) : (
            <FileImage className="h-12 w-12 text-blue-500" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title (optional)"
                className="h-8"
                data-testid={`input-floorplan-title-${floorplan.id}`}
              />
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="resize-none text-sm"
                rows={2}
                data-testid={`input-floorplan-caption-${floorplan.id}`}
              />
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleSave}
                  data-testid={`button-save-floorplan-${floorplan.id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel}
                  data-testid={`button-cancel-floorplan-${floorplan.id}`}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {floorplan.title || "Untitled Floorplan"}
                  </p>
                  {floorplan.caption && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {floorplan.caption}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(floorplan.fileUrl, "_blank")}
                    title="View full size"
                    data-testid={`button-view-floorplan-${floorplan.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    title="Edit details"
                    data-testid={`button-edit-floorplan-${floorplan.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(floorplan.id)}
                    disabled={isDeleting}
                    title="Delete floorplan"
                    data-testid={`button-delete-floorplan-${floorplan.id}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{isPdf ? "PDF" : "Image"}</span>
                {uploadedAgo && (
                  <>
                    <span>•</span>
                    <span>Uploaded {uploadedAgo}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AttachmentItemProps {
  file: VenueFileWithUploader;
  onEdit: (id: string, updates: { title?: string; caption?: string }) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function AttachmentItem({ file, onEdit, onDelete, isDeleting }: AttachmentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(file.title || "");
  const [editCaption, setEditCaption] = useState(file.caption || "");
  const { toast } = useToast();

  const handleSave = () => {
    onEdit(file.id, { 
      title: editTitle.trim() || undefined, 
      caption: editCaption.trim() || undefined 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(file.title || "");
    setEditCaption(file.caption || "");
    setIsEditing(false);
  };

  const handleCopyLink = async () => {
    const fullUrl = `${window.location.origin}${file.fileUrl}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        toast({
          title: "Link copied",
          description: "Download link copied to clipboard",
        });
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fullUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        toast({
          title: "Link copied",
          description: "Download link copied to clipboard",
        });
      }
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalFilename || file.title || "download";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(file.fileUrl, "_blank");
    }
  };

  const uploadedAgo = file.uploadedAt 
    ? formatTimeAgo(new Date(file.uploadedAt))
    : "";
  
  const uploaderName = file.uploadedBy 
    ? `${file.uploadedBy.firstName || ""} ${file.uploadedBy.lastName || ""}`.trim() || "Unknown"
    : null;

  return (
    <div 
      className="border rounded-lg p-4 space-y-3"
      data-testid={`attachment-item-${file.id}`}
    >
      <div className="flex gap-4">
        <div className="shrink-0 w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {file.fileType === "image" && file.thumbnailUrl ? (
            <img 
              src={file.thumbnailUrl} 
              alt={file.title || file.originalFilename || "Attachment"} 
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => window.open(file.fileUrl, "_blank")}
            />
          ) : (
            <FileTypeIcon 
              filename={file.originalFilename || ""} 
              mimeType={file.mimeType || undefined}
              size="lg"
              showExtension={true}
            />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title (optional)"
                className="h-8"
                data-testid={`input-attachment-title-${file.id}`}
              />
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Description (optional)"
                className="resize-none text-sm"
                rows={2}
                data-testid={`input-attachment-caption-${file.id}`}
              />
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleSave}
                  data-testid={`button-save-attachment-${file.id}`}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel}
                  data-testid={`button-cancel-attachment-${file.id}`}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {file.title || file.originalFilename || "Untitled Attachment"}
                  </p>
                  {file.caption && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {file.caption}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    title="Download file"
                    data-testid={`button-download-attachment-${file.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyLink}
                    title="Copy download link"
                    data-testid={`button-copy-link-attachment-${file.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    title="Edit details"
                    data-testid={`button-edit-attachment-${file.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(file.id)}
                    disabled={isDeleting}
                    title="Delete attachment"
                    data-testid={`button-delete-attachment-${file.id}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {file.originalFilename && (
                  <span className="truncate max-w-[200px]">{file.originalFilename}</span>
                )}
                {uploadedAgo && (
                  <>
                    <span>•</span>
                    <span>{uploadedAgo}</span>
                  </>
                )}
                {uploaderName && (
                  <>
                    <span>•</span>
                    <span>by {uploaderName}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VenueFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const isEditingVenue = !!id;

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>("");
  const [currentGooglePlaceData, setCurrentGooglePlaceData] = useState<PlaceResult | null>(null);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [deletingFloorplanId, setDeletingFloorplanId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [venuePhotos, setVenuePhotos] = useState<VenuePhoto[]>([]);
  
  const {
    stagedAssets,
    addStagedPhoto,
    addStagedFloorplan,
    addStagedAttachment,
    removeStagedPhoto,
    removeStagedFloorplan,
    removeStagedAttachment,
    updateStagedPhotoOrder,
    syncStagedAssets,
    cleanupStagedFiles,
    hasStagedAssets,
  } = useStagedAssets();

  const { data: venue, isLoading: isLoadingVenue } = useQuery<VenueWithRelations>({
    queryKey: ["/api/venues", id, "full"],
    enabled: isEditingVenue,
  });

  usePageTitle(isEditingVenue ? `Edit ${venue?.name || "Venue"}` : "New Venue");

  const { data: fetchedPhotos } = useQuery<VenuePhoto[]>({
    queryKey: ["/api/venues", id, "photos"],
    enabled: isEditingVenue,
  });

  useEffect(() => {
    if (fetchedPhotos) {
      setVenuePhotos(fetchedPhotos.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    }
  }, [fetchedPhotos]);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: "",
      shortDescription: "",
      longDescription: "",
      streetAddress1: "",
      streetAddress2: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      website: "",
      instagramAccount: "",
      googlePlaceId: "",
      isActive: true,
      isDraft: false,
      amenityIds: [],
      cuisineTagIds: [],
      styleTagIds: [],
      venueSpaces: [],
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = venuePhotos.findIndex((photo) => photo.id === active.id);
      const newIndex = venuePhotos.findIndex((photo) => photo.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newPhotos = arrayMove(venuePhotos, oldIndex, newIndex);
        setVenuePhotos(newPhotos);
        
        // Update sortOrder for all affected photos
        const updates = newPhotos.map((photo, index) => ({
          id: photo.id,
          sortOrder: index,
        }));
        
        // Update each photo's sortOrder
        for (const update of updates) {
          try {
            await apiRequest("PUT", `/api/venue-photos/${update.id}`, { sortOrder: update.sortOrder });
          } catch (err) {
            console.error("Failed to update photo order:", err);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "photos"] });
      }
    }
  }, [venuePhotos, id]);

  useEffect(() => {
    if (venue) {
      form.reset({
        name: venue.name || "",
        shortDescription: venue.shortDescription || "",
        longDescription: venue.longDescription || "",
        streetAddress1: venue.streetAddress1 || "",
        streetAddress2: venue.streetAddress2 || "",
        city: venue.city || "",
        state: venue.state || "",
        zipCode: venue.zipCode || "",
        phone: venue.phone || "",
        email: venue.email || "",
        website: venue.website || "",
        instagramAccount: venue.instagramAccount || "",
        googlePlaceId: venue.googlePlaceId || "",
        isActive: venue.isActive ?? true,
        isDraft: venue.isDraft ?? false,
        amenityIds: venue.amenities?.map((a) => a.id) || [],
        cuisineTagIds: venue.cuisineTags?.map((t) => t.id) || [],
        styleTagIds: venue.styleTags?.map((t) => t.id) || [],
        venueSpaces: venue.venueSpaces || [],
      });
      
      // If venue has a googlePlaceId, enable photo import
      if (venue.googlePlaceId) {
        setSelectedPlaceId(venue.googlePlaceId);
        setSelectedPlaceName(venue.name || "");
      }
    }
  }, [venue, form]);

  // Photo mutations
  const createPhotoMutation = useMutation({
    mutationFn: async (data: { url: string; altText?: string; sortOrder?: number }) => {
      const response = await apiRequest("POST", `/api/venues/${id}/photos`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "photos"] });
      toast({
        title: "Photo added",
        description: "The photo has been added to the gallery.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add photo",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/venue-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "photos"] });
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from the gallery.",
      });
      setDeletingPhotoId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
      setDeletingPhotoId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      const response = await apiRequest("POST", "/api/venues", data);
      return response.json();
    },
    onSuccess: async (newVenue) => {
      if (hasStagedAssets) {
        const syncResult = await syncStagedAssets(newVenue.id.toString());
        if (!syncResult.success) {
          toast({
            title: "Warning",
            description: `Venue created but some assets failed to save: ${syncResult.errors.join(", ")}`,
            variant: "destructive",
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({
        title: "Venue created",
        description: "The venue has been created successfully.",
      });
      setLocation(`/venues/${newVenue.id}`);
    },
    onError: async (error: Error) => {
      if (hasStagedAssets) {
        await cleanupStagedFiles();
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create venue",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      const response = await apiRequest("PATCH", `/api/venues/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Venue updated",
        description: "The venue has been updated successfully.",
      });
      setLocation(`/venues/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update venue",
        variant: "destructive",
      });
    },
  });

  // Floorplan mutations
  const createFloorplanMutation = useMutation({
    mutationFn: async (data: { 
      fileUrl: string; 
      thumbnailUrl?: string; 
      fileType: "image" | "pdf"; 
      title?: string; 
      caption?: string; 
    }) => {
      const response = await apiRequest("POST", `/api/venues/${id}/floorplans`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Floorplan uploaded",
        description: "The floorplan has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload floorplan",
        variant: "destructive",
      });
    },
  });

  const updateFloorplanMutation = useMutation({
    mutationFn: async ({ floorplanId, ...data }: { 
      floorplanId: string; 
      title?: string; 
      caption?: string; 
    }) => {
      const response = await apiRequest("PATCH", `/api/floorplans/${floorplanId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Floorplan updated",
        description: "The floorplan details have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update floorplan",
        variant: "destructive",
      });
    },
  });

  const deleteFloorplanMutation = useMutation({
    mutationFn: async (floorplanId: string) => {
      await apiRequest("DELETE", `/api/floorplans/${floorplanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Floorplan deleted",
        description: "The floorplan has been removed.",
      });
      setDeletingFloorplanId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete floorplan",
        variant: "destructive",
      });
      setDeletingFloorplanId(null);
    },
  });

  const handleFloorplanUploaded = (
    result: { fileUrl: string; thumbnailUrl?: string; fileType: "image" | "pdf" },
    metadata: { title?: string; caption?: string }
  ) => {
    createFloorplanMutation.mutate({
      fileUrl: result.fileUrl,
      thumbnailUrl: result.thumbnailUrl,
      fileType: result.fileType,
      title: metadata.title,
      caption: metadata.caption,
    });
  };

  const handleFloorplanEdit = (floorplanId: string, updates: { title?: string; caption?: string }) => {
    updateFloorplanMutation.mutate({ floorplanId, ...updates });
  };

  const handleFloorplanDelete = (floorplanId: string) => {
    setDeletingFloorplanId(floorplanId);
    deleteFloorplanMutation.mutate(floorplanId);
  };

  // Attachment mutations
  const createAttachmentMutation = useMutation({
    mutationFn: async (data: { 
      fileUrl: string; 
      thumbnailUrl?: string; 
      fileType: string; 
      originalFilename?: string;
      mimeType?: string;
      title?: string; 
      caption?: string; 
    }) => {
      const response = await apiRequest("POST", `/api/venues/${id}/files`, {
        category: "attachment",
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Attachment uploaded",
        description: "The file has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload attachment",
        variant: "destructive",
      });
    },
  });

  const updateAttachmentMutation = useMutation({
    mutationFn: async ({ attachmentId, ...data }: { 
      attachmentId: string; 
      title?: string; 
      caption?: string; 
    }) => {
      const response = await apiRequest("PATCH", `/api/venue-files/${attachmentId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Attachment updated",
        description: "The attachment details have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attachment",
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await apiRequest("DELETE", `/api/venue-files/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
      toast({
        title: "Attachment deleted",
        description: "The attachment has been removed.",
      });
      setDeletingAttachmentId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
      setDeletingAttachmentId(null);
    },
  });

  const handleAttachmentUploaded = (
    result: { fileUrl: string; thumbnailUrl?: string; fileType: FileType; filename: string; contentType: string },
    metadata: { title?: string; caption?: string }
  ) => {
    createAttachmentMutation.mutate({
      fileUrl: result.fileUrl,
      thumbnailUrl: result.thumbnailUrl,
      fileType: result.fileType,
      originalFilename: result.filename,
      mimeType: result.contentType,
      title: metadata.title,
      caption: metadata.caption,
    });
  };

  const handleAttachmentEdit = (attachmentId: string, updates: { title?: string; caption?: string }) => {
    updateAttachmentMutation.mutate({ attachmentId, ...updates });
  };

  const handleAttachmentDelete = (attachmentId: string) => {
    setDeletingAttachmentId(attachmentId);
    deleteAttachmentMutation.mutate(attachmentId);
  };

  const onSubmit = (data: VenueFormValues) => {
    if (isEditingVenue) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const parseInstagramUsername = (input: string): string => {
    if (!input) return "";
    let value = input.trim();
    
    // Remove @ prefix if present
    if (value.startsWith("@")) {
      value = value.substring(1);
    }
    
    // Handle full URLs like https://www.instagram.com/username/?hl=en
    // or instagram.com/username
    const urlPatterns = [
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/i,
    ];
    
    for (const pattern of urlPatterns) {
      const match = value.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return value;
  };

  const handleInstagramBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseInstagramUsername(e.target.value);
    if (parsed !== e.target.value) {
      form.setValue("instagramAccount", parsed);
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    form.setValue("name", place.name);
    form.setValue("streetAddress1", place.streetAddress1);
    form.setValue("streetAddress2", "");
    form.setValue("city", place.city);
    // Use state code (abbreviation) instead of full state name
    form.setValue("state", place.stateCode || place.state);
    form.setValue("zipCode", place.zipCode);
    form.setValue("phone", place.phone);
    form.setValue("website", place.website);
    form.setValue("googlePlaceId", place.placeId);
    
    // Populate short description from Google Places editorial summary
    if (place.editorialSummary) {
      form.setValue("shortDescription", place.editorialSummary);
    }
    
    // Store place info for photo picker and AI tag suggestions
    setSelectedPlaceId(place.placeId);
    setSelectedPlaceName(place.name);
    setCurrentGooglePlaceData(place);
    
    toast({
      title: "Place imported",
      description: `Filled in details for "${place.name}". You can now import photos from Google.`,
    });
  };

  const handleUnlinkGooglePlace = () => {
    form.setValue("googlePlaceId", "");
    setSelectedPlaceId(null);
    setSelectedPlaceName("");
    setCurrentGooglePlaceData(null);
    toast({
      title: "Google Place unlinked",
      description: "This venue is no longer linked to a Google Place.",
    });
  };

  const refreshGooglePlaceData = async (placeId: string) => {
    try {
      const response = await apiRequest("POST", "/api/places/refresh", { placeId });
      if (!response.ok) {
        throw new Error("Failed to fetch place details");
      }
      const place = await response.json();
      handlePlaceSelect(place);
      toast({
        title: "Data refreshed",
        description: "Venue data has been updated from Google Places.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not fetch updated data from Google Places.",
        variant: "destructive",
      });
    }
  };

  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  
  const tagSuggestionMutation = useMutation({
    mutationFn: async (googlePlaceData: PlaceResult) => {
      const response = await apiRequest("POST", "/api/venues/tag-suggestions", { googlePlaceData });
      if (!response.ok) {
        throw new Error("Failed to get tag suggestions");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get tag suggestions",
        variant: "destructive",
      });
    },
  });

  const handlePhotosSelected = async (result: { 
    galleryPhotos: Array<{ photoUrl: string; thumbnailUrl: string; originalUrl: string }>; 
    primaryPhoto: { photoUrl: string; thumbnailUrl: string; originalUrl: string } | null 
  }) => {
    if (!isEditingVenue) {
      const existingUrls = new Set(stagedAssets.photos.map(p => p.url));
      let nextSortOrder = stagedAssets.photos.length;
      let addedCount = 0;
      
      if (result.primaryPhoto && !existingUrls.has(result.primaryPhoto.photoUrl)) {
        addStagedPhoto({
          url: result.primaryPhoto.photoUrl,
          thumbnailUrl: result.primaryPhoto.thumbnailUrl,
          sortOrder: 0,
          isHero: true,
        });
        existingUrls.add(result.primaryPhoto.photoUrl);
        nextSortOrder++;
        addedCount++;
      }
      
      for (const photo of result.galleryPhotos) {
        if (!existingUrls.has(photo.photoUrl) && photo.photoUrl !== result.primaryPhoto?.photoUrl) {
          addStagedPhoto({
            url: photo.photoUrl,
            thumbnailUrl: photo.thumbnailUrl,
            sortOrder: nextSortOrder++,
          });
          existingUrls.add(photo.photoUrl);
          addedCount++;
        }
      }
      
      toast({
        title: "Photos staged",
        description: addedCount > 0 
          ? `Added ${addedCount} photo${addedCount !== 1 ? "s" : ""} to the gallery. Save the venue to finalize.`
          : "No new photos added.",
      });
      return;
    }
    
    const existingUrls = new Set(venuePhotos.map(p => p.url));
    let nextSortOrder = venuePhotos.length;
    let addedCount = 0;
    
    if (result.primaryPhoto && !existingUrls.has(result.primaryPhoto.photoUrl)) {
      for (const photo of venuePhotos) {
        await apiRequest("PUT", `/api/venue-photos/${photo.id}`, { sortOrder: (photo.sortOrder ?? 0) + 1 });
      }
      await apiRequest("POST", `/api/venues/${id}/photos`, { url: result.primaryPhoto.photoUrl, thumbnailUrl: result.primaryPhoto.thumbnailUrl, sortOrder: 0 });
      existingUrls.add(result.primaryPhoto.photoUrl);
      nextSortOrder++;
      addedCount++;
    }
    
    for (const photo of result.galleryPhotos) {
      if (!existingUrls.has(photo.photoUrl) && photo.photoUrl !== result.primaryPhoto?.photoUrl) {
        await apiRequest("POST", `/api/venues/${id}/photos`, { url: photo.photoUrl, thumbnailUrl: photo.thumbnailUrl, sortOrder: nextSortOrder++ });
        existingUrls.add(photo.photoUrl);
        addedCount++;
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "photos"] });
    
    toast({
      title: "Photos imported",
      description: addedCount > 0 
        ? `Imported ${addedCount} photo${addedCount !== 1 ? "s" : ""} to the gallery${result.primaryPhoto ? " (hero photo set)" : ""}.`
        : result.primaryPhoto 
          ? "Hero photo set (moved to first position)."
          : "No new photos added (already in gallery).",
    });
  };

  const breadcrumbs = isEditingVenue && venue
    ? [
        { label: "Venues", href: "/venues" },
        { label: venue.name, href: `/venues/${id}` },
        { label: "Edit" },
      ]
    : [
        { label: "Venues", href: "/venues" },
        { label: "New Venue" },
      ];

  if (isEditingVenue && isLoadingVenue) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PermissionGate
      permission="venues.write"
      behavior="fallback"
      fallback={
        <PageLayout breadcrumbs={breadcrumbs}>
          <NoPermissionMessage
            title="Permission Required"
            message="You don't have permission to create or edit venues. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
    <PageLayout 
      breadcrumbs={breadcrumbs}
      primaryAction={{
        label: isEditingVenue ? "Update Venue" : "Create Venue",
        icon: Save,
        variant: "default",
        onClick: () => document.getElementById("venue-form-submit")?.click(),
      }}
      additionalActions={[
        {
          label: "Cancel",
          icon: X,
          variant: "outline",
          onClick: () => setLocation("/venues"),
        },
      ]}
    >
      <div className="max-w-4xl p-4 md:p-6">
        <Form {...form}>
          <form id="venue-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <button type="submit" id="venue-form-submit" className="hidden" />

              <Card className="border-primary border-2">
              <CardHeader className="gap-2 pb-4">
                <Badge variant="default" className="flex-0 w-fit">
                  {selectedPlaceId ? "Linked" : "Start Here"}
                </Badge>
                <CardTitle>
                  {selectedPlaceId ? "Google Place" : "Find on Google"}
                </CardTitle>
                <CardDescription>
                  {selectedPlaceId
                    ? "This venue is linked to a Google Place. You can refresh the data or unlink it."
                    : "Save time by pulling venue information and content from Google."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {selectedPlaceId ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedPlaceName}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {selectedPlaceId}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refreshGooglePlaceData(selectedPlaceId)}
                        data-testid="button-refresh-google-place"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUnlinkGooglePlace}
                        data-testid="button-unlink-google-place"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Unlink
                      </Button>
                      {currentGooglePlaceData && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => tagSuggestionMutation.mutate(currentGooglePlaceData)}
                          disabled={tagSuggestionMutation.isPending}
                          data-testid="button-suggest-tags-ai"
                        >
                          {tagSuggestionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Suggest Tags with AI
                        </Button>
                      )}
                    </div>
                    
                    {aiSuggestions && (
                      <div className="p-3 bg-muted/50 rounded-lg border" data-testid="ai-suggestions-display">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI Tag Suggestions
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiSuggestions(null)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-sans">{aiSuggestions}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <GooglePlaceSearch
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Search for venue by name (e.g., 'Albadawi NYC')"
                    data-testid="input-venue-google-search"
                  />
                )}
              </CardContent>
            </Card>

            <GooglePlacePhotoPicker
              placeId={selectedPlaceId}
              placeName={selectedPlaceName}
              venueId={isEditingVenue ? parseInt(id!) : undefined}
              open={photoPickerOpen}
              onOpenChange={setPhotoPickerOpen}
              onPhotosSelected={handlePhotosSelected}
            />

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the venue name and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Venue Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter venue name"
                          data-testid="input-venue-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-venue-type">
                            <SelectValue placeholder="Select venue type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {venueTypes.map((type) => (
                            <SelectItem key={type} value={type} data-testid={`option-venue-type-${type}`}>
                              {venueTypeLabels[type] || type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Brief description for listings"
                          data-testid="input-venue-short-description"
                        />
                      </FormControl>
                      <FormDescription>
                        A brief one-line description shown in venue listings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Detailed venue description..."
                          rows={4}
                          data-testid="input-venue-long-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>
                  Enter the venue's address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="streetAddress1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="123 Main Street"
                          data-testid="input-venue-street-address1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="streetAddress2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address 2</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Suite 100"
                          data-testid="input-venue-street-address2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="City"
                            data-testid="input-venue-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="State"
                            data-testid="input-venue-state"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="12345"
                            data-testid="input-venue-zip-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="(555) 123-4567"
                            data-testid="input-venue-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="email"
                            placeholder="venue@example.com"
                            data-testid="input-venue-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Online Presence</CardTitle>
                <CardDescription>
                  Website and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="url"
                          placeholder="https://www.venue.com"
                          data-testid="input-venue-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instagramAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="@venuehandle or paste profile URL"
                          onBlur={(e) => {
                            field.onBlur();
                            handleInstagramBlur(e);
                          }}
                          data-testid="input-venue-instagram"
                        />
                      </FormControl>
                      <FormDescription>
                        Paste a profile URL or @handle - it will be converted automatically
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery</CardTitle>
                <CardDescription>
                  Upload photos or import from URLs. Drag to reorder. The first photo will be used as the hero image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3">
                  {selectedPlaceId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPhotoPickerOpen(true)}
                      className="w-full whitespace-nowrap"
                      data-testid="button-import-google-photos"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                      Import from Google
                    </Button>
                  )}
                  <div className="flex-1">
        
                    <PhotoUploader
                      venueId={isEditingVenue ? parseInt(id!) : undefined}
                      onPhotoUploaded={(result) => {
                        if (isEditingVenue) {
                          createPhotoMutation.mutate({ 
                            url: result.photoUrl, 
                            sortOrder: venuePhotos.length 
                          });
                        } else {
                          addStagedPhoto({
                            url: result.photoUrl,
                            thumbnailUrl: result.thumbnailUrl,
                            sortOrder: stagedAssets.photos.length,
                          });
                          toast({
                            title: "Photo staged",
                            description: "Photo added. Save the venue to finalize.",
                          });
                        }
                      }}
                      onError={(error) => {
                        toast({
                          title: "Upload failed",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                      data-testid="photo-uploader"
                    />
                  </div>
        
                </div>

                {isEditingVenue && venuePhotos.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Gallery Photos ({venuePhotos.length})</Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={venuePhotos.map(p => p.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {venuePhotos.map((photo, index) => (
                            <SortablePhotoItem
                              key={photo.id}
                              id={photo.id}
                              index={index}
                              photoUrl={photo.url}
                              thumbnailUrl={photo.thumbnailUrl || undefined}
                              altText={photo.altText || undefined}
                              onView={() => {
                                if (photo.url) {
                                  window.open(photo.url, "_blank");
                                }
                              }}
                              onDelete={() => {
                                setDeletingPhotoId(photo.id);
                                deletePhotoMutation.mutate(photo.id);
                              }}
                              isDeleting={deletingPhotoId === photo.id}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {!isEditingVenue && stagedAssets.photos.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Staged Photos ({stagedAssets.photos.length})</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {stagedAssets.photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative group aspect-square bg-muted rounded-lg overflow-visible border"
                          data-testid={`staged-photo-item-${index}`}
                        >
                          <div className="w-full h-full overflow-hidden rounded-lg">
                            <img
                              src={photo.thumbnailUrl || photo.url}
                              alt={photo.altText || `Gallery photo ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none">
                            <div className="pointer-events-auto flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(photo.url, "_blank")}
                                title="View full size"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeStagedPhoto(photo.id)}
                                title="Remove photo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(isEditingVenue ? venuePhotos.length === 0 : stagedAssets.photos.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No photos added yet. Use the uploader above to add gallery images.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Floorplans</CardTitle>
                <CardDescription>
                  Upload floorplan images with optional titles and captions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FloorplanUploader
                  venueId={isEditingVenue ? id! : undefined}
                  onFloorplanUploaded={(result, metadata) => {
                    if (isEditingVenue) {
                      // Create the database record after file upload
                      createFloorplanMutation.mutate({
                        fileUrl: result.fileUrl,
                        thumbnailUrl: result.thumbnailUrl,
                        fileType: result.fileType,
                        title: metadata.title,
                        caption: metadata.caption,
                      });
                    } else {
                      addStagedFloorplan({
                        fileUrl: result.fileUrl,
                        thumbnailUrl: result.thumbnailUrl,
                        fileType: result.fileType,
                        title: metadata.title,
                        caption: metadata.caption,
                        sortOrder: stagedAssets.floorplans.length,
                      });
                      toast({
                        title: "Floorplan staged",
                        description: "Floorplan added. Save the venue to finalize.",
                      });
                    }
                  }}
                  onError={(error) => {
                    toast({
                      title: "Upload failed",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                  disabled={createFloorplanMutation.isPending}
                  data-testid="floorplan-uploader"
                />

                {isEditingVenue && venue?.floorplans && venue.floorplans.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Uploaded Floorplans ({venue.floorplans.length})
                    </Label>
                    <div className="space-y-3">
                      {venue.floorplans
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map((floorplan) => (
                          <FloorplanItem
                            key={floorplan.id}
                            floorplan={floorplan}
                            onEdit={handleFloorplanEdit}
                            onDelete={handleFloorplanDelete}
                            isDeleting={deletingFloorplanId === floorplan.id}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {!isEditingVenue && stagedAssets.floorplans.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Staged Floorplans ({stagedAssets.floorplans.length})
                    </Label>
                    <div className="space-y-3">
                      {stagedAssets.floorplans.map((floorplan) => (
                        <div key={floorplan.id} className="border rounded-lg p-4 flex gap-4">
                          <div className="shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                            {floorplan.fileType === "pdf" ? (
                              <FileText className="h-12 w-12 text-red-500" />
                            ) : floorplan.thumbnailUrl ? (
                              <img src={floorplan.thumbnailUrl} alt={floorplan.title || "Floorplan"} className="w-full h-full object-cover" />
                            ) : (
                              <FileImage className="h-12 w-12 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{floorplan.title || "Untitled Floorplan"}</p>
                                {floorplan.caption && <p className="text-sm text-muted-foreground">{floorplan.caption}</p>}
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeStagedFloorplan(floorplan.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(isEditingVenue ? (!venue?.floorplans || venue.floorplans.length === 0) : stagedAssets.floorplans.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No floorplans added yet. Upload images or PDFs using the uploader above.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>
                  Upload documents, contracts, or other files related to this venue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <VenueFileUploader
                  venueId={isEditingVenue ? id! : undefined}
                  category="attachment"
                  onFileUploaded={(result, metadata) => {
                    if (isEditingVenue) {
                      // Record already created by upload endpoint, just refresh and notify
                      queryClient.invalidateQueries({ queryKey: ["/api/venues", id, "full"] });
                      toast({
                        title: "Attachment uploaded",
                        description: "The file has been added successfully.",
                      });
                    } else {
                      addStagedAttachment({
                        fileUrl: result.fileUrl,
                        thumbnailUrl: result.thumbnailUrl,
                        fileType: result.fileType,
                        mimeType: result.contentType,
                        originalFilename: result.filename,
                        title: metadata.title,
                        caption: metadata.caption,
                        sortOrder: stagedAssets.attachments.length,
                      });
                      toast({
                        title: "Attachment staged",
                        description: "Attachment added. Save the venue to finalize.",
                      });
                    }
                  }}
                  onError={(error) => {
                    toast({
                      title: "Upload failed",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                  disabled={createAttachmentMutation.isPending}
                  data-testid="attachment-uploader"
                />

                {isEditingVenue && venue?.attachments && venue.attachments.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Uploaded Attachments ({venue.attachments.length})
                    </Label>
                    <div className="space-y-3">
                      {venue.attachments
                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                        .map((attachment) => (
                          <AttachmentItem
                            key={attachment.id}
                            file={attachment}
                            onEdit={handleAttachmentEdit}
                            onDelete={handleAttachmentDelete}
                            isDeleting={deletingAttachmentId === attachment.id}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {!isEditingVenue && stagedAssets.attachments.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Staged Attachments ({stagedAssets.attachments.length})
                    </Label>
                    <div className="space-y-3">
                      {stagedAssets.attachments.map((attachment) => (
                        <div key={attachment.id} className="border rounded-lg p-4 flex gap-4">
                          <div className="shrink-0 w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                            <FileTypeIcon 
                              filename={attachment.originalFilename || ""} 
                              mimeType={attachment.mimeType}
                              size="lg"
                              showExtension={true}
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{attachment.title || attachment.originalFilename || "Untitled"}</p>
                                {attachment.caption && <p className="text-sm text-muted-foreground">{attachment.caption}</p>}
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeStagedAttachment(attachment.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(isEditingVenue ? (!venue?.attachments || venue.attachments.length === 0) : stagedAssets.attachments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attachments added yet. Upload PDFs, documents, or other files using the uploader above.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
                <CardDescription>
                  Select the amenities available at this venue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="amenityIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AmenityToggle
                          selectedAmenityIds={field.value}
                          onAmenitiesChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cuisine Tags</CardTitle>
                <CardDescription>
                  Select or create cuisine type tags for this venue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="cuisineTagIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TagAssignment
                          category="Cuisine"
                          selectedTagIds={field.value}
                          onTagsChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Style Tags</CardTitle>
                <CardDescription>
                  Select or create style/ambiance tags for this venue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="styleTagIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TagAssignment
                          category="Style"
                          selectedTagIds={field.value}
                          onTagsChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-2">
                <CardTitle>Event Spaces</CardTitle>
                <CardDescription>
                  Define bookable or rentable spaces within this venue (e.g., private rooms, patios, main dining)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="venueSpaces"
                  render={({ field }) => {
                    const spaces = field.value || [];
                    
                    const addSpace = () => {
                      const newSpace: VenueSpace = {
                        id: crypto.randomUUID(),
                        name: "",
                        maxCapacitySeated: null,
                        maxCapacityStanding: null,
                        minCapacity: null,
                        sizeSqft: null,
                        hasSeatedFormat: null,
                        hasStandingFormat: null,
                        description: "",
                      };
                      field.onChange([...spaces, newSpace]);
                    };
                    
                    const removeSpace = (id: string) => {
                      field.onChange(spaces.filter((s: VenueSpace) => s.id !== id));
                    };
                    
                    const updateSpace = (id: string, updates: Partial<VenueSpace>) => {
                      field.onChange(
                        spaces.map((s: VenueSpace) => 
                          s.id === id ? { ...s, ...updates } : s
                        )
                      );
                    };
                    
                    return (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-4">
                            {spaces.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No event spaces defined yet. Add spaces to specify capacity for different areas.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {spaces.map((space: VenueSpace, index: number) => (
                                  <div 
                                    key={space.id} 
                                    className="border rounded-lg p-4 space-y-3"
                                    data-testid={`venue-space-${index}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-2">
                                          <Label htmlFor={`space-name-${space.id}`} className="text-xs text-muted-foreground">
                                            Space Name
                                          </Label>
                                          <Input
                                            id={`space-name-${space.id}`}
                                            value={space.name}
                                            onChange={(e) => updateSpace(space.id, { name: e.target.value })}
                                            placeholder="e.g., Private Dining Room"
                                            data-testid={`input-space-name-${index}`}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor={`space-max-seated-${space.id}`} className="text-xs text-muted-foreground">
                                            Maximum Seated Capacity
                                          </Label>
                                          <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                              id={`space-max-seated-${space.id}`}
                                              type="number"
                                              min={1}
                                              value={space.maxCapacitySeated ?? ""}
                                              onChange={(e) => updateSpace(space.id, { maxCapacitySeated: e.target.value ? parseInt(e.target.value) : null })}
                                              placeholder="—"
                                              className="pl-9"
                                              data-testid={`input-space-max-seated-${index}`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSpace(space.id)}
                                        className="shrink-0"
                                        data-testid={`button-remove-space-${index}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <Label htmlFor={`space-max-standing-${space.id}`} className="text-xs text-muted-foreground">
                                          Maximum Standing Capacity
                                        </Label>
                                        <Input
                                          id={`space-max-standing-${space.id}`}
                                          type="number"
                                          min={1}
                                          value={space.maxCapacityStanding || ""}
                                          onChange={(e) => updateSpace(space.id, { maxCapacityStanding: e.target.value ? parseInt(e.target.value) : null })}
                                          placeholder="—"
                                          data-testid={`input-space-max-standing-${index}`}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`space-min-capacity-${space.id}`} className="text-xs text-muted-foreground">
                                          Min Capacity (optional)
                                        </Label>
                                        <Input
                                          id={`space-min-capacity-${space.id}`}
                                          type="number"
                                          min={1}
                                          value={space.minCapacity || ""}
                                          onChange={(e) => updateSpace(space.id, { minCapacity: e.target.value ? parseInt(e.target.value) : null })}
                                          placeholder="—"
                                          data-testid={`input-space-min-capacity-${index}`}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`space-size-${space.id}`} className="text-xs text-muted-foreground">
                                          Size (sq ft, optional)
                                        </Label>
                                        <Input
                                          id={`space-size-${space.id}`}
                                          type="number"
                                          min={1}
                                          value={space.sizeSqft || ""}
                                          onChange={(e) => updateSpace(space.id, { sizeSqft: e.target.value ? parseInt(e.target.value) : null })}
                                          placeholder="—"
                                          data-testid={`input-space-size-${index}`}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">
                                          Format Options
                                        </Label>
                                        <div className="flex items-center gap-4 mt-2">
                                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={space.hasSeatedFormat || false}
                                              onChange={(e) => updateSpace(space.id, { hasSeatedFormat: e.target.checked ? true : null })}
                                              className="rounded border-input"
                                              data-testid={`checkbox-seated-${index}`}
                                            />
                                            Seated
                                          </label>
                                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={space.hasStandingFormat || false}
                                              onChange={(e) => updateSpace(space.id, { hasStandingFormat: e.target.checked ? true : null })}
                                              className="rounded border-input"
                                              data-testid={`checkbox-standing-${index}`}
                                            />
                                            Standing
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <Label htmlFor={`space-description-${space.id}`} className="text-xs text-muted-foreground">
                                        Description (optional)
                                      </Label>
                                      <Textarea
                                        id={`space-description-${space.id}`}
                                        value={space.description || ""}
                                        onChange={(e) => updateSpace(space.id, { description: e.target.value })}
                                        placeholder="Describe the space, setup options, included amenities..."
                                        rows={2}
                                        data-testid={`input-space-description-${index}`}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addSpace}
                              className="w-full"
                              data-testid="button-add-space"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Space
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>
                  Control visibility and publishing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  <FormField
                    control={form.control}
                    name="isDraft"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-venue-draft"
                          />
                        </FormControl>
                        <div className="space-y-0.5">
                          <FormLabel className="text-base cursor-pointer">Draft</FormLabel>
                          <FormDescription className="text-xs">
                            Draft venues are hidden from regular listings
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-venue-active"
                          />
                        </FormControl>
                        <div className="space-y-0.5">
                          <FormLabel className="text-base cursor-pointer">Active</FormLabel>
                          <FormDescription className="text-xs">
                            Inactive venues are archived
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bottom action buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/venues")}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-venue"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEditingVenue ? "Update Venue" : "Create Venue"}
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </PageLayout>
  </PermissionGate>
  );
}
