import { useCallback, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { VenueCollectionWithCreator } from "@shared/schema";
import { FolderOpen, Plus, Store, ListChecks, MousePointerClick, ArrowRightLeft, Layers } from "lucide-react";

const COLLECTIONS_WELCOME_KEY = "venue_collections_welcome_seen";

export default function VenueCollectionsPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  // Welcome dialog state
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(COLLECTIONS_WELCOME_KEY);
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
    }
  }, []);

  const handleDismissWelcome = useCallback(() => {
    localStorage.setItem(COLLECTIONS_WELCOME_KEY, "true");
    setShowWelcomeDialog(false);
  }, []);

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
                className="flex flex-col cursor-pointer hover-elevate transition-all"
                onClick={() => handleCollectionClick(collection.id)}
                data-testid={`card-collection-${collection.id}`}
              >
                <CardHeader className="p-4 pb-2 flex-1">
                  <div className="space-y-2">
                    <div className="flex-1 min-w-0 flex justify-between">
                      <CardTitle className="text-lg truncate" data-testid={`text-collection-name-${collection.id}`}>
                        {collection.name}
                      </CardTitle>
                      <Badge variant="ghost" className="shrink-0 gap-1">
                        <Store className="h-3 w-3" />
                        {collection.venueCount}
                      </Badge>
        
                    </div>
                    {collection.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {collection.description}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {collection.createdBy ? (
                      <span>
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

      <Dialog open={showWelcomeDialog} onOpenChange={(open) => !open && handleDismissWelcome()}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-collections-welcome">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Layers className="h-6 w-6 text-primary" />
              Welcome to Collections
            </DialogTitle>
            <DialogDescription className="text-base">
              Organize venues into custom groups for events, proposals, and easy reference
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Add from Venues Page</h4>
                <p className="text-sm text-muted-foreground">
                  Go to the Venues page, select multiple venues using the checkboxes, then click "Add to Collection" to add them all at once.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Add from Venue Details</h4>
                <p className="text-sm text-muted-foreground">
                  Open any venue's detail page and use the "Add to Collection" button to add that venue to an existing or new collection.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Reorder Venues</h4>
                <p className="text-sm text-muted-foreground">
                  Inside a collection, drag and drop venues to arrange them in your preferred order.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Create New Collections</h4>
                <p className="text-sm text-muted-foreground">
                  Click "New Collection" to create a collection with a name and description, then add venues to it.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleDismissWelcome} data-testid="button-dismiss-collections-welcome">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
