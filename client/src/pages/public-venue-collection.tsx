import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  LogIn,
  FolderOpen,
  ImageOff,
} from "lucide-react";
import type { VenueCollectionWithVenues, Venue } from "@shared/schema";

type VenueInCollection = Venue & { 
  addedBy: { id: string; firstName: string | null; lastName: string | null } | null; 
  addedAt: Date | null 
};

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-md bg-primary text-primary-foreground w-9 h-9">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Care of Chan OS</span>
        </Link>
        <Link href="/">
          <Button variant="outline" className="gap-2" data-testid="button-sign-in">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    </header>
  );
}

function VenueCard({ venue }: { venue: VenueInCollection }) {
  const locationParts = [venue.city, venue.state].filter(Boolean);
  const location = locationParts.join(", ");
  const photos = (venue as any).photos as { url: string; altText?: string | null }[] | null;
  const heroPhoto = photos && photos.length > 0 ? photos[0] : null;

  return (
    <Link href={`/public/venues/${venue.id}`}>
      <Card 
        className="cursor-pointer hover-elevate transition-all overflow-hidden group"
        data-testid={`card-venue-${venue.id}`}
      >
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {heroPhoto ? (
            <img 
              src={heroPhoto.url} 
              alt={heroPhoto.altText || venue.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
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
        </CardHeader>
        
        <CardContent className="pt-0 pb-4 px-4">
          {venue.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {venue.shortDescription}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PublicVenueCollectionPage() {
  const { id } = useParams<{ id: string }>();

  const { data: collection, isLoading, error } = useQuery<VenueCollectionWithVenues>({
    queryKey: ["/api/public/venue-collections", id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-96 max-w-full" />
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
        </main>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="max-w-5xl mx-auto p-4 md:p-6">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Collection not found</p>
              <Link href="/">
                <Button variant="outline" className="mt-4" data-testid="button-go-home">
                  Go to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const venues = collection.venues || [];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
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
              {venues.length} Venue{venues.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-venues">
              No Venues in This Collection
            </h3>
            <p className="text-muted-foreground max-w-md">
              This collection doesn't have any venues yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
