import { useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { VenueCollectionWithCreator } from "@shared/schema";
import { FolderOpen, Plus, MapPin } from "lucide-react";

export default function VenueCollectionsPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const { data: collections = [], isLoading: isCollectionsLoading } = useQuery<VenueCollectionWithCreator[]>({
    queryKey: ["/api/venue-collections"],
  });

  const handleCollectionClick = useCallback((collectionId: string) => {
    navigate(`/venues/collections/${collectionId}`);
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/venues/collections/new");
  }, [navigate]);

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Venues", href: "/venues" }, { label: "Collections" }]}>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
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

  return (
    <PageLayout
      breadcrumbs={[{ label: "Venues", href: "/venues" }, { label: "Collections" }]}
      primaryAction={{
        label: "New Collection",
        icon: Plus,
        onClick: handleCreate,
      }}
    >
      <div className="p-6">
        {isCollectionsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-collections">
              No Collections Yet
            </h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Create collections to organize venues into groups. You can add venues from the Venues page or individual venue pages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => handleCollectionClick(collection.id)}
                data-testid={`card-collection-${collection.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`text-collection-name-${collection.id}`}>
                        {collection.name}
                      </CardTitle>
                      {collection.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {collection.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <MapPin className="h-3 w-3" />
                      {collection.venueCount}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {collection.createdBy ? (
                      <span>
                        Created by{" "}
                        <Link 
                          href={`/team/${collection.createdBy.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline text-foreground"
                          data-testid={`link-creator-${collection.createdBy.id}`}
                        >
                          {collection.createdBy.firstName}
                        </Link>
                      </span>
                    ) : (
                      <span>Created by unknown user</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
