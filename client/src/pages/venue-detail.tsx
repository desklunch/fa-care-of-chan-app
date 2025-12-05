import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AmenityDisplay } from "@/components/ui/amenity-toggle";
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
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  ExternalLink,
  Image,
  Check,
  X,
} from "lucide-react";
import type { VenueWithRelations } from "@shared/schema";

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: venue, isLoading, error } = useQuery<VenueWithRelations>({
    queryKey: ["/api/venues", id, "full"],
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
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[300px] w-full" />
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
      customHeaderAction={
        isAdmin ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/venues/${id}/edit`)}
              data-testid="button-edit-venue"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-venue">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
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
          </div>
        ) : null
      }
    >
      <div className="max-w-4xl p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              data-testid="text-venue-name"
            >
              {venue.name}
            </h1>
            {venue.shortDescription && (
              <p
                className="text-muted-foreground mt-1"
                data-testid="text-venue-short-description"
              >
                {venue.shortDescription}
              </p>
            )}
          </div>
 
        </div>

        {venue.primaryPhotoUrl && (
          <Card>
            <CardContent className="p-0">
              <img
                src={venue.primaryPhotoUrl}
                alt={venue.name}
                className="w-full h-64 object-cover rounded-lg"
                data-testid="img-venue-photo"
              />
            </CardContent>
          </Card>
        )}

        {venue.photoUrls && venue.photoUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="h-5 w-5" />
                Photo Gallery
              </CardTitle>
              <CardDescription>
                {venue.photoUrls.length} additional photo{venue.photoUrls.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {venue.photoUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden rounded-lg group"
                    data-testid={`link-gallery-photo-${index}`}
                  >
                    <img
                      src={url}
                      alt={`${venue.name} photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      data-testid={`img-gallery-photo-${index}`}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(venue.streetAddress1 || venue.city || venue.state) ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
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
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    data-testid="link-venue-google-maps"
                  >
                    <MapPin className="h-4 w-4" />
                    View on Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {venue.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${venue.phone}`}
                    className="text-primary hover:underline"
                    data-testid="link-venue-phone"
                  >
                    {venue.phone}
                  </a>
                </div>
              )}

              {venue.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
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
            <CardContent className="space-y-3">
              {venue.website ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                    data-testid="link-venue-website"
                  >
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No website</p>
              )}

              {venue.instagramAccount && (
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <a
                    href={`https://instagram.com/${venue.instagramAccount.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:underline flex items-center gap-1"
                    data-testid="link-venue-instagram"
                  >
                    @{venue.instagramAccount.replace(/^@/, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {venue.longDescription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
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
                <div className="flex flex-wrap gap-2">
                  {venue.cuisineTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      data-testid={`badge-cuisine-tag-${tag.id}`}
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
                <div className="flex flex-wrap gap-2">
                  {venue.styleTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      data-testid={`badge-style-tag-${tag.id}`}
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
      </div>
    </PageLayout>
  );
}
