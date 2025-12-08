import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { VenueCollectionWithVenues, Venue } from "@shared/schema";
import { 
  Store, 
  Phone, 
  Globe, 
  Instagram, 
  Edit, 
  MoreVertical, 
  Trash2, 
  ExternalLink,
  FolderOpen,
  ImageOff
} from "lucide-react";
import { formatTimeAgo } from "@/lib/format-time";

type VenueInCollection = Venue & { 
  addedBy: { id: string; firstName: string | null; lastName: string | null } | null; 
  addedAt: Date | null 
};

function VenueCard({ 
  venue, 
  collectionId,
  onRemove 
}: { 
  venue: VenueInCollection; 
  collectionId: string;
  onRemove: (venueId: string) => void;
}) {
  const [, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    navigate(`/venues/${venue.id}`);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(venue.id);
  };

  const locationParts = [venue.city, venue.state].filter(Boolean);
  const location = locationParts.join(", ");

  const photoUrls = venue.photoUrls as string[] | null;
  const primaryPhoto = photoUrls && photoUrls.length > 0 ? photoUrls[0] : null;

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all overflow-hidden group"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-venue-${venue.id}`}
    >
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {primaryPhoto ? (
          <img 
            src={primaryPhoto} 
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        
        <div 
          className={`absolute top-2 right-2 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
        </div>
      </div>
      
      <CardHeader className="pb-2 space-y-0 px-4 pt-4">
        <CardTitle className="text-base line-clamp-1" data-testid={`text-venue-name-${venue.id}`}>
          {venue.name}
        </CardTitle>
        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate">{location}</span>
          </div>
        )}
        {venue.shortDescription && (
          <CardDescription className="line-clamp-2">
            {venue.shortDescription}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 pb-2 px-4 space-y-2">

        

        <div className="flex w-full justify-between items-center">
          {venue.addedBy && venue.addedAt && (
            <div className="text-xs text-muted-foreground font-medium">
              <Link 
                href={`/team/${venue.addedBy.id}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline "
                data-testid={`link-added-by-${venue.addedBy.id}`}
              >
                {venue.addedBy.firstName}
              </Link>{" "}
              {formatTimeAgo(new Date(venue.addedAt))}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className=""
                data-testid={`button-venue-menu-${venue.id}`}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/venues/${venue.id}`} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleRemoveClick}
                data-testid={`button-remove-venue-${venue.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from Collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </CardContent>
    </Card>
  );
}

export default function VenueCollectionDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute<{ id: string }>("/venues/collections/:id");
  const collectionId = params?.id;
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const { data: collection, isLoading: isCollectionLoading } = useQuery<VenueCollectionWithVenues>({
    queryKey: ["/api/venue-collections", collectionId],
    enabled: !!collectionId,
  });

  const removeMutation = useMutation({
    mutationFn: async (venueId: string) => {
      return apiRequest("DELETE", `/api/venue-collections/${collectionId}/venues/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      toast({ title: "Venue removed from collection" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to remove venue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleRemoveVenue = useCallback((venueId: string) => {
    removeMutation.mutate(venueId);
  }, [removeMutation]);

  const handleEdit = useCallback(() => {
    navigate(`/venues/collections/${collectionId}/edit`);
  }, [navigate, collectionId]);

  if (isAuthLoading || isCollectionLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Venues", href: "/venues" }, 
          { label: "Collections", href: "/venues/collections" },
          { label: "Loading..." }
        ]}
      >
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="aspect-[16/9] rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  if (!collection) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Venues", href: "/venues" }, 
          { label: "Collections", href: "/venues/collections" },
          { label: "Not Found" }
        ]}
      >
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold">Collection not found</h2>
          <p className="text-muted-foreground">The collection you're looking for doesn't exist.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "Venues", href: "/venues" }, 
        { label: "Collections", href: "/venues/collections" },
        { label: collection.name }
      ]}
      primaryAction={{
        label: "Edit",
        icon: Edit,
        onClick: handleEdit,
      }}
    >
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-collection-title">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">
                  {collection.description}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1">
              {/* <Store className="h-3 w-3" /> */}
              {collection.venues.length} Venue{collection.venues.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          
          {collection.createdBy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Created by{" "}
                <Link 
                  href={`/team/${collection.createdBy.id}`}
                  className="hover:underline text-foreground"
                  data-testid={`link-creator-${collection.createdBy.id}`}
                >
                  {collection.createdBy.firstName}
                </Link>
                {collection.createdAt && (
                  <> {formatTimeAgo(new Date(collection.createdAt))}</>
                )}
              </span>
            </div>
          )}
        </div>

        {collection.venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-venues">
              No Venues in This Collection
            </h3>
            <p className="text-muted-foreground max-w-md">
              Add venues to this collection from the Venues page or from individual venue pages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collection.venues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                collectionId={collection.id}
                onRemove={handleRemoveVenue}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
