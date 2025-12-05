import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { VenueAddressAutocomplete, ParsedAddress } from "@/components/ui/venue-address-autocomplete";
import { GooglePlaceSearch, PlaceResult } from "@/components/ui/google-place-search";
import { GooglePlacePhotoPicker } from "@/components/ui/google-place-photo-picker";
import { PhotoUploader } from "@/components/ui/photo-uploader";
import { Save, Loader2, Plus, Trash2, Image, ImagePlus, ExternalLink, GripVertical } from "lucide-react";
import type { VenueWithRelations } from "@shared/schema";
import { insertVenueSchema } from "@shared/schema";

const venueFormSchema = insertVenueSchema.extend({
  amenityIds: z.array(z.string()).default([]),
  cuisineTagIds: z.array(z.string()).default([]),
  styleTagIds: z.array(z.string()).default([]),
  photoUrlItems: z.array(z.object({
    url: z.string().refine(
      (val) => val === "" || val.startsWith("/objects/") || val.startsWith("/api/") || val.startsWith("http://") || val.startsWith("https://"),
      "Please enter a valid URL or leave empty"
    ),
    thumbnailUrl: z.string().optional(),
  })).default([]),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

interface SortablePhotoItemProps {
  id: string;
  index: number;
  photoUrl: string;
  thumbnailUrl?: string;
  onView: () => void;
  onDelete: () => void;
}

function SortablePhotoItem({ id, index, photoUrl, thumbnailUrl, onView, onDelete }: SortablePhotoItemProps) {
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

  const displayUrl = thumbnailUrl || photoUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square bg-muted rounded-lg overflow-visible border ${isDragging ? "ring-2 ring-primary shadow-lg" : ""}`}
      data-testid={`photo-item-${index}`}
    >
      <div className="w-full h-full overflow-hidden rounded-lg">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`Gallery photo ${index + 1}`}
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
            title="Delete photo"
            data-testid={`button-remove-photo-${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
}

export default function VenueFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>("");
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);

  const { data: venue, isLoading: isLoadingVenue } = useQuery<VenueWithRelations>({
    queryKey: ["/api/venues", id, "full"],
    enabled: isEditing,
  });

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
      amenityIds: [],
      cuisineTagIds: [],
      styleTagIds: [],
      photoUrlItems: [],
    },
  });

  const { fields: photoUrlFields, append: appendPhotoUrl, remove: removePhotoUrl, replace: replacePhotoUrls } = useFieldArray({
    control: form.control,
    name: "photoUrlItems",
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = photoUrlFields.findIndex((field) => field.id === active.id);
      const newIndex = photoUrlFields.findIndex((field) => field.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const currentItems = form.getValues("photoUrlItems");
        const newItems = arrayMove(currentItems, oldIndex, newIndex);
        replacePhotoUrls(newItems);
      }
    }
  }, [photoUrlFields, form, replacePhotoUrls]);

  useEffect(() => {
    if (venue) {
      const photoUrlItems = (venue.photoUrls || []).map(url => ({ url }));
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
        amenityIds: venue.amenities?.map((a) => a.id) || [],
        cuisineTagIds: venue.cuisineTags?.map((t) => t.id) || [],
        styleTagIds: venue.styleTags?.map((t) => t.id) || [],
        photoUrlItems,
      });
      
      // If venue has a googlePlaceId, enable photo import
      if (venue.googlePlaceId) {
        setSelectedPlaceId(venue.googlePlaceId);
        setSelectedPlaceName(venue.name || "");
      }
    }
  }, [venue, form]);

  const createMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      const { photoUrlItems, ...rest } = data;
      const photoUrls = photoUrlItems
        .map(item => item.url)
        .filter(url => url && url.trim() !== "");
      const response = await apiRequest("POST", "/api/venues", { ...rest, photoUrls });
      return response.json();
    },
    onSuccess: (newVenue) => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({
        title: "Venue created",
        description: "The venue has been created successfully.",
      });
      setLocation(`/venues/${newVenue.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create venue",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      const { photoUrlItems, ...rest } = data;
      const photoUrls = photoUrlItems
        .map(item => item.url)
        .filter(url => url && url.trim() !== "");
      const response = await apiRequest("PATCH", `/api/venues/${id}`, { ...rest, photoUrls });
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

  const onSubmit = (data: VenueFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleAddressSelect = (address: ParsedAddress) => {
    form.setValue("streetAddress1", address.streetAddress1);
    form.setValue("streetAddress2", address.streetAddress2);
    form.setValue("city", address.city);
    form.setValue("state", address.state);
    form.setValue("zipCode", address.zipCode);
  };

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
    
    // Store place info for photo picker
    setSelectedPlaceId(place.placeId);
    setSelectedPlaceName(place.name);
    
    toast({
      title: "Place imported",
      description: `Filled in details for "${place.name}". You can now import photos from Google.`,
    });
  };

  const handlePhotosSelected = (result: { 
    galleryPhotos: Array<{ photoUrl: string; thumbnailUrl: string; originalUrl: string }>; 
    primaryPhoto: { photoUrl: string; thumbnailUrl: string; originalUrl: string } | null 
  }) => {
    const currentItems = form.getValues("photoUrlItems");
    const existingUrls = new Set(currentItems.map(item => item.url));
    
    const newPhotos: Array<{ url: string; thumbnailUrl?: string }> = [];
    
    // Add non-primary photos first
    for (const photo of result.galleryPhotos) {
      if (!existingUrls.has(photo.photoUrl) && photo.photoUrl !== result.primaryPhoto?.photoUrl) {
        newPhotos.push({ 
          url: photo.photoUrl, 
          thumbnailUrl: photo.thumbnailUrl 
        });
        existingUrls.add(photo.photoUrl);
      }
    }
    
    // If a primary photo is selected, put it first
    if (result.primaryPhoto && !existingUrls.has(result.primaryPhoto.photoUrl)) {
      const primaryItem = { 
        url: result.primaryPhoto.photoUrl, 
        thumbnailUrl: result.primaryPhoto.thumbnailUrl 
      };
      // Prepend primary photo to the beginning
      replacePhotoUrls([primaryItem, ...currentItems, ...newPhotos]);
    } else if (result.primaryPhoto) {
      // Primary photo already exists, move it to the front
      const filteredItems = currentItems.filter(item => item.url !== result.primaryPhoto!.photoUrl);
      const primaryItem = currentItems.find(item => item.url === result.primaryPhoto!.photoUrl) || 
        { url: result.primaryPhoto.photoUrl, thumbnailUrl: result.primaryPhoto.thumbnailUrl };
      replacePhotoUrls([primaryItem, ...filteredItems, ...newPhotos]);
    } else {
      // No primary photo, just append new photos
      for (const photo of newPhotos) {
        appendPhotoUrl(photo);
      }
    }
    
    const addedCount = newPhotos.length + (result.primaryPhoto && !currentItems.some(i => i.url === result.primaryPhoto?.photoUrl) ? 1 : 0);
    
    toast({
      title: "Photos imported",
      description: addedCount > 0 
        ? `Imported ${addedCount} photo${addedCount !== 1 ? "s" : ""} to App Storage${result.primaryPhoto ? " (hero photo set)" : ""}.`
        : result.primaryPhoto 
          ? "Hero photo set (moved to first position)."
          : "No new photos added (already in gallery).",
    });
  };

  const breadcrumbs = [
    { label: "Venues", href: "/venues" },
    { label: isEditing ? "Edit Venue" : "New Venue" },
  ];

  if (isEditing && isLoadingVenue) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Find on Google</CardTitle>
                <CardDescription>
                  Search for a venue to auto-fill details from Google Places
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <GooglePlaceSearch
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Search for venue by name (e.g., 'Albadawi NYC')"
                  data-testid="input-venue-google-search"
                />
              </CardContent>
            </Card>

            <GooglePlacePhotoPicker
              placeId={selectedPlaceId}
              placeName={selectedPlaceName}
              venueId={isEditing ? parseInt(id!) : undefined}
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

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Show this venue in the directory
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-venue-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>
                  Search for an address or enter manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Search Address</FormLabel>
                  <VenueAddressAutocomplete
                    onAddressSelect={handleAddressSelect}
                    placeholder="Search for venue address..."
                    data-testid="input-venue-address-search"
                  />
                  <FormDescription>
                    Start typing to search, or enter address manually below
                  </FormDescription>
                </div>

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
                      venueId={isEditing ? parseInt(id!) : undefined}
                      onPhotoUploaded={(result) => {
                        appendPhotoUrl({ 
                          url: result.photoUrl, 
                          thumbnailUrl: result.thumbnailUrl 
                        });
                        toast({
                          title: "Photo uploaded",
                          description: "The photo has been added to the gallery.",
                        });
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

                {photoUrlFields.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Gallery Photos ({photoUrlFields.length})</Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={photoUrlFields.map(f => f.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {photoUrlFields.map((field, index) => {
                            const photoUrl = form.watch(`photoUrlItems.${index}.url`);
                            const thumbnailUrl = form.watch(`photoUrlItems.${index}.thumbnailUrl`);
                            
                            return (
                              <SortablePhotoItem
                                key={field.id}
                                id={field.id}
                                index={index}
                                photoUrl={photoUrl}
                                thumbnailUrl={thumbnailUrl}
                                onView={() => {
                                  if (photoUrl) {
                                    window.open(photoUrl, "_blank");
                                  }
                                }}
                                onDelete={async () => {
                                  const photoData = form.getValues(`photoUrlItems.${index}`);
                                  if (photoData.url.startsWith("/objects/")) {
                                    try {
                                      await apiRequest("DELETE", "/api/photos", {
                                        photoUrl: photoData.url,
                                        thumbnailUrl: photoData.thumbnailUrl,
                                      });
                                    } catch (err) {
                                      console.error("Failed to delete from storage:", err);
                                    }
                                  }
                                  removePhotoUrl(index);
                                }}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}

                {photoUrlFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No photos added yet. Use the uploader above to add gallery images.
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

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/venues")}
                data-testid="button-cancel-venue"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-venue"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Save Changes" : "Create Venue"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
