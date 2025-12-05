import { useEffect, useState } from "react";
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
import { Save, Loader2, Plus, Trash2, Image, ImagePlus } from "lucide-react";
import type { VenueWithRelations } from "@shared/schema";
import { insertVenueSchema } from "@shared/schema";

const venueFormSchema = insertVenueSchema.extend({
  amenityIds: z.array(z.string()).default([]),
  cuisineTagIds: z.array(z.string()).default([]),
  styleTagIds: z.array(z.string()).default([]),
  photoUrlItems: z.array(z.object({
    url: z.string().refine(
      (val) => val === "" || val.startsWith("/api/") || val.startsWith("http://") || val.startsWith("https://"),
      "Please enter a valid URL or leave empty"
    ),
  })).default([]),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

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
      primaryPhotoUrl: "",
      isActive: true,
      amenityIds: [],
      cuisineTagIds: [],
      styleTagIds: [],
      photoUrlItems: [],
    },
  });

  const { fields: photoUrlFields, append: appendPhotoUrl, remove: removePhotoUrl } = useFieldArray({
    control: form.control,
    name: "photoUrlItems",
  });

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
        primaryPhotoUrl: venue.primaryPhotoUrl || "",
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

  const handlePhotosSelected = (result: { galleryPhotos: string[]; primaryPhoto: string | null }) => {
    // Get existing photo URLs to prevent duplicates
    const existingUrls = new Set(
      form.getValues("photoUrlItems").map(item => item.url.split("?")[0])
    );
    
    // Sanitize URLs by removing query parameters (the proxy will add them back)
    const sanitizeUrl = (url: string) => url.split("?")[0];
    
    // Add selected photos to the gallery (deduplicated)
    let addedCount = 0;
    for (const photoUrl of result.galleryPhotos) {
      const cleanUrl = sanitizeUrl(photoUrl);
      if (!existingUrls.has(cleanUrl)) {
        appendPhotoUrl({ url: cleanUrl });
        existingUrls.add(cleanUrl);
        addedCount++;
      }
    }
    
    // Set primary photo if selected (also sanitized)
    if (result.primaryPhoto) {
      form.setValue("primaryPhotoUrl", sanitizeUrl(result.primaryPhoto));
    }
    
    toast({
      title: "Photos added",
      description: addedCount > 0 
        ? `Added ${addedCount} photo${addedCount !== 1 ? "s" : ""} to the gallery${result.primaryPhoto ? " and set primary photo" : ""}.`
        : result.primaryPhoto 
          ? "Set primary photo."
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
                
                {selectedPlaceId && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedPlaceName}</p>
                      <p className="text-xs text-muted-foreground">Import photos from Google Places</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPhotoPickerOpen(true)}
                      data-testid="button-import-google-photos"
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Import Photos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <GooglePlacePhotoPicker
              placeId={selectedPlaceId}
              placeName={selectedPlaceName}
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

                <FormField
                  control={form.control}
                  name="primaryPhotoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Photo URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          type="text"
                          placeholder="https://example.com/image.jpg or import from Google"
                          data-testid="input-venue-photo-url"
                        />
                      </FormControl>
                      <FormDescription>
                        URL to the venue's main/hero photo
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
                  Add additional photos for this venue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {photoUrlFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`photoUrlItems.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex gap-2 items-center">
                                <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="https://example.com/photo.jpg"
                                  data-testid={`input-photo-url-${index}`}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhotoUrl(index)}
                      data-testid={`button-remove-photo-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPhotoUrl({ url: "" })}
                  data-testid="button-add-photo-url"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Photo URL
                </Button>
                {photoUrlFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No additional photos added yet. Click "Add Photo URL" to add gallery images.
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
