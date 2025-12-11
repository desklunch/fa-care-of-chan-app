import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AmenityDisplay } from "@/components/ui/amenity-toggle";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { CommentList } from "@/components/ui/comments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SquarePen,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  ExternalLink,
  Image,
  Check,
  X as XIcon,
  FileText,
  Layout,
  Download,
  Copy,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  FolderPlus,
  Map,
  Share2,
} from "lucide-react";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { VenueMap } from "@/components/ui/venue-map";
import { formatTimeAgo } from "@/lib/format-time";
import { Link } from "wouter";
import type { VenueWithRelations, VenueCollectionWithCreator } from "@shared/schema";

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

  const { data: venue, isLoading, error } = useQuery<VenueWithRelations>({
    queryKey: ["/api/venues", id, "full"],
  });

  const { data: venueCollections = [] } = useQuery<VenueCollectionWithCreator[]>({
    queryKey: ["/api/venues", id, "collections"],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/venues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({
        title: "Venue deleted",
        description: "The venue has been deleted successfully.",
      });
      setLocation("/venues");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete venue",
        variant: "destructive",
      });
    },
  });

  const breadcrumbs = [
    { label: "Venues", href: "/venues" },
    { label: venue?.name || "Loading..." },
  ];

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="p-4 md:p-6 space-y-6">
          {/* Title and subtitle */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b pb-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>

          {/* Hero image */}
          <Skeleton className="h-[280px] w-full rounded-lg" />

          {/* About card */}
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-16" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          {/* Location and Online cards - two column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-16" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Photos section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-hidden">
                <Skeleton className="h-24 w-32 rounded-md flex-shrink-0" />
                <Skeleton className="h-24 w-32 rounded-md flex-shrink-0" />
                <Skeleton className="h-24 w-32 rounded-md flex-shrink-0" />
                <Skeleton className="h-24 w-32 rounded-md flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (error || !venue) {
    return (
      <PageLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Venue not found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/venues")}
                data-testid="button-back-to-venues"
              >
                Back to Venues
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      primaryAction={
        {
          label: "Edit",
          icon: SquarePen,
          variant: "outline",
          onClick: () => setLocation(`/venues/${id}/edit`),
        }
      }
      additionalActions={[
        {
          label: "Copy Public Link",
          icon: Share2,
          onClick: () => {
            const publicUrl = `${window.location.origin}/public/venues/${id}`;
            navigator.clipboard.writeText(publicUrl);
            toast({ title: "Public link copied", description: "Share this link with anyone to view this venue" });
          },
        },
        {
          label: "Add to Collection",
          icon: FolderPlus,
          onClick: () => setCollectionDialogOpen(true),
        },
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive" as const,
          onClick: () => setDeleteDialogOpen(true),
        },
      ]}
    >
      <div className=" ">

        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-[0px] bg-background z-10">
            <div className="p-4 md:p-6 pb-2 md:pb-2 ">
              <h1
                className="text-2xl font-bold"
                data-testid="text-venue-name"
              >
                {venue.name}
              </h1>
              {venue.shortDescription && (
                <p
                  className="text-muted-foreground mt-2"
                  data-testid="text-venue-short-description"
                >
                  {venue.shortDescription}
                </p>
              )}
            </div>

            <TabsList data-testid="tabs-venue" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
            </TabsList>
          </div>


          <TabsContent value="overview" className="max-w-4xl space-y-4">

        {venue.photoUrls && venue.photoUrls.length > 0 && (
          <> 
            <Card>
              <CardContent className="p-0 space-y-0 h-64">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                  className="w-full relative group cursor-pointer"
                  data-testid="button-hero-photo"
                >
                  <img
                    src={venue.photoUrls[0]}
                    alt={venue.name}
                    className="w-full h-64 object-cover rounded-lg"
                    data-testid="img-venue-photo"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </button>
              </CardContent>
            </Card>



            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent 
                className="w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none p-0 border-0 bg-black/95 overflow-hidden flex flex-col cursor-pointer"
                onClick={() => setLightboxOpen(false)}
              >
                <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                  <img
                    src={venue.photoUrls[lightboxIndex]}
                    alt={`${venue.name} photo ${lightboxIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                    data-testid="img-lightbox-photo"
                  />
                </div>
                
                <div 
                  className="shrink-0 flex items-center justify-center gap-4 py-4 px-6 bg-black/80 border-t border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setLightboxIndex((prev) => (prev === 0 ? venue.photoUrls!.length - 1 : prev - 1))}
                    disabled={venue.photoUrls.length <= 1}
                    data-testid="button-lightbox-prev"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  
                  <span className="text-white text-sm min-w-[60px] text-center">
                    {lightboxIndex + 1} / {venue.photoUrls.length}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => setLightboxIndex((prev) => (prev === venue.photoUrls!.length - 1 ? 0 : prev + 1))}
                    disabled={venue.photoUrls.length <= 1}
                    data-testid="button-lightbox-next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

            {venue.longDescription && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">About</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(venue.longDescription || "");
                        toast({ title: "Copied to clipboard" });
                      }}
                      data-testid="button-copy-description"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p
                    className="whitespace-pre-wrap"
                    data-testid="text-venue-long-description"
                  >
                    {venue.longDescription}
                  </p>
                </CardContent>
              </Card>
            )}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(venue.streetAddress1 || venue.city || venue.state) ? (
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 mt-1" />
                  <div data-testid="text-venue-address">
                    {venue.streetAddress1 && <div>{venue.streetAddress1}</div>}
                    {venue.streetAddress2 && <div>{venue.streetAddress2}</div>}
                    {(venue.city || venue.state || venue.zipCode) && (
                      <div>
                        {[venue.city, venue.state, venue.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No address provided</p>
              )}

              {venue.googlePlaceId && (
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${venue.googlePlaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-4 hover:underline"
                    data-testid="link-venue-google-maps"
                  >
                    <Map className="h-5 w-5" />
                    View on Google Maps
                  </a>
                </div>
              )}

              {venue.phone && (
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5" />
                  <a
                    href={`tel:${venue.phone}`}
                    className=" hover:underline"
                    data-testid="link-venue-phone"
                  >
                    {venue.phone}
                  </a>
                </div>
              )}

              {venue.email && (
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`mailto:${venue.email}`}
                    className="text-primary hover:underline"
                    data-testid="link-venue-email"
                  >
                    {venue.email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Online</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {venue.website ? (
                <div className="flex items-center gap-4">
                  <Globe className="h-5 w-5" />
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                    data-testid="link-venue-website"
                  >
                    Website
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No website</p>
              )}

              {venue.instagramAccount && (
                <div className="flex items-center gap-4">
                  <Instagram className="h-5 w-5" />
                  <a
                    href={`https://instagram.com/${venue.instagramAccount.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                    data-testid="link-venue-instagram"
                  >
                    {venue.instagramAccount.replace(/^@/, "")}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
            {venue.photoUrls && venue.photoUrls.length > 1 && (
              <> 
             

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Photos
                    </CardTitle>

                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {venue.photoUrls.slice(1).map((url, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setLightboxIndex(index + 1);
                            setLightboxOpen(true);
                          }}
                          className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
                          data-testid={`button-gallery-photo-${index}`}
                        >
                          <img
                            src={url}
                            alt={`${venue.name} photo ${index + 2}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            data-testid={`img-gallery-photo-${index}`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>


              </>
            )}
        

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <AmenityDisplay amenities={venue.amenities || []} />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cuisine</CardTitle>
            </CardHeader>
            <CardContent>
              {venue.cuisineTags && venue.cuisineTags.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {venue.cuisineTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      data-testid={`badge-cuisine-tag-${tag.id}`}
                      className="text-sm gap-2 px-3 py-2 border-input rounded-md"

                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No cuisine tags</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Style</CardTitle>
            </CardHeader>
            <CardContent>
              {venue.styleTags && venue.styleTags.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {venue.styleTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      data-testid={`badge-style-tag-${tag.id}`}
                      className="text-sm gap-2 px-3 py-2 border-input rounded-md"

                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No style tags</p>
              )}
            </CardContent>
          </Card>
        </div>

        {venue.floorplans && venue.floorplans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Floorplans
              </CardTitle>

            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {venue.floorplans
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((floorplan) => (
                    <a
                      key={floorplan.id}
                      href={floorplan.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-lg border overflow-hidden hover-elevate"
                      data-testid={`link-floorplan-${floorplan.id}`}
                    >
                      <div className="aspect-[4/3] bg-muted relative">
                        {floorplan.fileType === "pdf" ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">PDF Document</span>
                          </div>
                        ) : (
                          <img
                            src={floorplan.thumbnailUrl || floorplan.fileUrl}
                            alt={floorplan.title || "Floorplan"}
                            className="w-full h-full object-cover"
                            data-testid={`img-floorplan-${floorplan.id}`}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        {floorplan.title && (
                          <p className="font-medium text-sm truncate" data-testid={`text-floorplan-title-${floorplan.id}`}>
                            {floorplan.title}
                          </p>
                        )}
                        {floorplan.caption && (
                          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-floorplan-caption-${floorplan.id}`}>
                            {floorplan.caption}
                          </p>
                        )}
                        {floorplan.uploadedAt && (
                          <p className="text-xs text-muted-foreground" data-testid={`text-floorplan-date-${floorplan.id}`}>
                            Uploaded {formatTimeAgo(new Date(floorplan.uploadedAt))}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {venue.attachments && venue.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
 
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {venue.attachments
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map((attachment) => {
                    const uploadedAgo = attachment.uploadedAt 
                      ? formatTimeAgo(new Date(attachment.uploadedAt))
                      : "";
                    const uploaderName = attachment.uploadedBy 
                      ? `${attachment.uploadedBy.firstName || ""} ${attachment.uploadedBy.lastName || ""}`.trim() || "Unknown"
                      : null;
                    
                    const handleDownload = async () => {
                      try {
                        const response = await fetch(attachment.fileUrl);
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = attachment.originalFilename || attachment.title || "download";
                        link.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        window.open(attachment.fileUrl, "_blank");
                      }
                    };

                    const handleCopyLink = async () => {
                      const fullUrl = `${window.location.origin}${attachment.fileUrl}`;
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

                    return (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-4 rounded-lg border p-3 hover-elevate"
                        data-testid={`attachment-item-${attachment.id}`}
                      >
                        <div className="shrink-0 w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                          {attachment.fileType === "image" && attachment.thumbnailUrl ? (
                            <a 
                              href={attachment.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full h-full"
                            >
                              <img 
                                src={attachment.thumbnailUrl} 
                                alt={attachment.title || attachment.originalFilename || "Attachment"} 
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <FileTypeIcon 
                              filename={attachment.originalFilename || ""} 
                              mimeType={attachment.mimeType || undefined}
                              size="md"
                              showExtension={true}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-attachment-title-${attachment.id}`}>
                            {attachment.title || attachment.originalFilename || "Untitled Attachment"}
                          </p>
                          {attachment.caption && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {attachment.caption}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                            {uploadedAgo && <span>{uploadedAgo}</span>}
                            {uploaderName && (
                              <>
                                <span>by {uploaderName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDownload}
                            title="Download file"
                            data-testid={`button-download-attachment-${attachment.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyLink}
                            title="Copy download link"
                            data-testid={`button-copy-link-attachment-${attachment.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a 
                              href={attachment.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title="Open in new tab"
                              data-testid={`link-view-attachment-${attachment.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {venueCollections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Collections
              </CardTitle>

            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {venueCollections.map((collection) => (
                  <Link 
                    key={collection.id} 
                    href={`/venues/collections/${collection.id}`}
                  >
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer text-sm py-1.5 px-3"
                      data-testid={`badge-collection-${collection.id}`}
                    >
                      {collection.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

          </TabsContent>

          <TabsContent value="comments" className="">
            <CommentList
              entityType="venue"
              entityId={id!}
              currentUser={user || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{venue.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        venueIds={id ? [id] : []}
      />
    </PageLayout>
  );
}
