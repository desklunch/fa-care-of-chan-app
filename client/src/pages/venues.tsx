import { useCallback, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { useAuth } from "@/hooks/useAuth";
import type { VenueWithRelations } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { MapPin, Globe, Instagram, ExternalLink, icons, HelpCircle, CircleFadingPlus, Utensils, Sparkles, Building2, FolderPlus, Search, Filter, MousePointerClick, type LucideIcon } from "lucide-react";
import { InfoBanner } from "@/components/ui/info-banner";

const VENUES_WELCOME_KEY = "venues_welcome_seen";

const DEFAULT_VISIBLE_COLUMNS = ["name", "cuisineTags", "styleTags", "location"];

function getIconComponent(iconName: string): LucideIcon {
  const icon = icons[iconName as keyof typeof icons];
  return (icon || HelpCircle) as LucideIcon;
}

function NameCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-venue-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function LocationCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data) return null;
  const parts = [data.city, data.state].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-1 h-full">
      {/* <MapPin className="w-3 h-3 text-muted-foreground shrink-0" /> */}
      <span className="truncate">{parts.join(", ")}</span>
    </div>
  );
}

function AddressCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data) return null;
  const parts = [data.streetAddress1, data.city, data.state, data.zipCode].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-1 h-full">
      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="truncate">{parts.join(", ")}</span>
    </div>
  );
}

function WebsiteCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.website) return null;
  return (
    <a
      href={data.website}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-primary hover:underline h-full"
      onClick={(e) => e.stopPropagation()}
      data-testid={`link-venue-website-${data.id}`}
    >
      <Globe className="w-3 h-3 shrink-0" />
      <span className="truncate">Website</span>
      <ExternalLink className="w-3 h-3 shrink-0" />
    </a>
  );
}

function InstagramCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.instagramAccount) return null;
  const handle = data.instagramAccount.replace(/^@/, "");
  return (
    <a
      href={`https://instagram.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-pink-600 hover:underline h-full"
      onClick={(e) => e.stopPropagation()}
      data-testid={`link-venue-instagram-${data.id}`}
    >
      <Instagram className="w-3 h-3 shrink-0" />
      <span className="truncate">@{handle}</span>
    </a>
  );
}

function StatusCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data) return null;
  return data.isActive ? (
    <span>Active</span>
  ) : (
    <span>Inactive</span>
  );
}

function DescriptionCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.shortDescription) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.shortDescription}
    </span>
  );
}

function AmenitiesCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.amenities || data.amenities.length === 0) return null;
  return (
    <div className="flex items-center gap-1 h-full overflow-hidden">
      {data.amenities.slice(0, 4).map((amenity) => {
        const IconComponent = getIconComponent(amenity.icon);
        return (
          <Badge
            key={amenity.id}
            variant="secondary"
            className="gap-1 px-1.5 py-0.5 text-xs shrink-0"
            data-testid={`badge-amenity-${amenity.id}`}
          >
            <IconComponent className="h-3 w-3" />
            <span className="hidden xl:inline">{amenity.name}</span>
          </Badge>
        );
      })}
      {data.amenities.length > 4 && (
        <Badge variant="outline" className="px-1.5 py-0.5 text-xs shrink-0">
          +{data.amenities.length - 4}
        </Badge>
      )}
    </div>
  );
}

function CuisineTagsCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.cuisineTags || data.cuisineTags.length === 0) return null;
  return (
    <div className="flex items-center gap-1 h-full overflow-hidden">
      {data.cuisineTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="px-2 py-0.5 text-xs shrink-0"
          data-testid={`badge-cuisine-${tag.id}`}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

function StyleTagsCellRenderer({ data }: { data: VenueWithRelations }) {
  if (!data?.styleTags || data.styleTags.length === 0) return null;
  return (
    <div className="flex items-center gap-1 h-full overflow-hidden">
      {data.styleTags.slice(0, 3).map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="px-2 py-0.5 text-xs shrink-0"
          data-testid={`badge-style-${tag.id}`}
        >
          {tag.name}
        </Badge>
      ))}
      {data.styleTags.length > 3 && (
        <Badge variant="outline" className="px-1.5 py-0.5 text-xs shrink-0">
          +{data.styleTags.length - 3}
        </Badge>
      )}
    </div>
  );
}

const venueColumns: ColumnConfig<VenueWithRelations>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "System",
    colDef: {
      flex: 1,
      minWidth: 100,
    },
  },
  {
    id: "externalId",
    headerName: "External ID",
    field: "externalId",
    category: "System",
    colDef: {
      flex: 0.5,
      minWidth: 80,
    },
  },
  {
    id: "name",
    headerName: "Name",
    field: "name",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: VenueWithRelations }) => <NameCellRenderer data={params.data} />,
    },
  },
  {
    id: "shortDescription",
    headerName: "Description",
    field: "shortDescription",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { data: VenueWithRelations }) => <DescriptionCellRenderer data={params.data} />,
    },
  },
  {
    id: "cuisineTags",
    headerName: "Cuisine",
    category: "Tags",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: { data: VenueWithRelations }) => <CuisineTagsCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as VenueWithRelations;
        return data?.cuisineTags?.map(t => t.name).join(", ") || "";
      },
    },
  },
  {
    id: "styleTags",
    headerName: "Style",
    category: "Tags",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { data: VenueWithRelations }) => <StyleTagsCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as VenueWithRelations;
        return data?.styleTags?.map(t => t.name).join(", ") || "";
      },
    },
  },
  {
    id: "amenities",
    headerName: "Amenities",
    category: "Features",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { data: VenueWithRelations }) => <AmenitiesCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as VenueWithRelations;
        return data?.amenities?.map(a => a.name).join(", ") || "";
      },
    },
  },
  {
    id: "city",
    headerName: "City",
    field: "city",
    category: "Location",
    colDef: {
      flex: 1,
      minWidth: 120,
    },
  },
  {
    id: "state",
    headerName: "State",
    field: "state",
    category: "Location",
    colDef: {
      flex: 0.5,
      minWidth: 80,
    },
  },
  {
    id: "location",
    headerName: "Location",
    category: "Location",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: VenueWithRelations }) => <LocationCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as VenueWithRelations;
        return [data?.city, data?.state].filter(Boolean).join(", ");
      },
    },
  },
  {
    id: "fullAddress",
    headerName: "Full Address",
    category: "Location",
    colDef: {
      flex: 2,
      minWidth: 250,
      cellRenderer: (params: { data: VenueWithRelations }) => <AddressCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as VenueWithRelations;
        return [data?.streetAddress1, data?.city, data?.state, data?.zipCode].filter(Boolean).join(", ");
      },
    },
  },
  {
    id: "zipCode",
    headerName: "ZIP Code",
    field: "zipCode",
    category: "Location",
    colDef: {
      flex: 0.5,
      minWidth: 80,
    },
  },
  {
    id: "phone",
    headerName: "Phone",
    field: "phone",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 120,
    },
  },
  {
    id: "email",
    headerName: "Email",
    field: "email",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "website",
    headerName: "Website",
    field: "website",
    category: "Links",
    colDef: {
      flex: 0.8,
      minWidth: 100,
      cellRenderer: (params: { data: VenueWithRelations }) => <WebsiteCellRenderer data={params.data} />,
    },
  },
  {
    id: "instagram",
    headerName: "Instagram",
    field: "instagramAccount",
    category: "Links",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: { data: VenueWithRelations }) => <InstagramCellRenderer data={params.data} />,
    },
  },
  {
    id: "isActive",
    headerName: "Status",
    field: "isActive",
    category: "Status",
    colDef: {
      flex: 0.8,
      minWidth: 100,
      cellRenderer: (params: { data: VenueWithRelations }) => <StatusCellRenderer data={params.data} />,
    },
  },
];

const venueFilters: FilterConfig<VenueWithRelations>[] = [
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const locations = new Set<string>();
        data.forEach(venue => {
          if (venue.city && venue.state) {
            locations.add(`${venue.city}, ${venue.state}`);
          } else if (venue.city) {
            locations.add(venue.city);
          } else if (venue.state) {
            locations.add(venue.state);
          }
        });
        return Array.from(locations).sort().map(loc => ({ id: loc, label: loc }));
      },
    },
    matchFn: (venue, selectedValues) => {
      const venueLocation = venue.city && venue.state 
        ? `${venue.city}, ${venue.state}`
        : venue.city || venue.state || "";
      return selectedValues.includes(venueLocation);
    },
  },
  {
    id: "amenities",
    label: "Amenities",
    icon: Building2,
    optionSource: {
      type: "query",
      queryKey: "/api/amenities",
      labelField: "name",
      valueField: "id",
    },
    matchFn: (venue, selectedValues) => {
      const venueAmenityIds = venue.amenities?.map(a => String(a.id)) || [];
      return selectedValues.some(id => venueAmenityIds.includes(id));
    },
  },
  {
    id: "cuisine",
    label: "Cuisine",
    icon: Utensils,
    optionSource: {
      type: "query",
      queryKey: "/api/tags",
      labelField: "name",
      valueField: "id",
      filterFn: (item) => (item as { category?: string }).category === "Cuisine",
    },
    matchFn: (venue, selectedValues) => {
      const venueCuisineIds = venue.cuisineTags?.map(t => String(t.id)) || [];
      return selectedValues.some(id => venueCuisineIds.includes(id));
    },
  },
  {
    id: "style",
    label: "Style",
    icon: Sparkles,
    optionSource: {
      type: "query",
      queryKey: "/api/tags",
      labelField: "name",
      valueField: "id",
      filterFn: (item) => (item as { category?: string }).category === "Style",
    },
    matchFn: (venue, selectedValues) => {
      const venueStyleIds = venue.styleTags?.map(t => String(t.id)) || [];
      return selectedValues.some(id => venueStyleIds.includes(id));
    },
  },
];

export default function VenuesPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Welcome dialog state
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // Check if user has seen welcome dialog
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(VENUES_WELCOME_KEY);
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
    }
  }, []);

  const handleDismissWelcome = useCallback(() => {
    localStorage.setItem(VENUES_WELCOME_KEY, "true");
    setShowWelcomeDialog(false);
  }, []);

  // Collection dialog state
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [clearSelectionFn, setClearSelectionFn] = useState<(() => void) | null>(null);

  // Fetch venues data
  const { data: venues = [], isLoading: isVenuesLoading } = useQuery<VenueWithRelations[]>({
    queryKey: ["/api/venues"],
  });

  const handleRowClick = useCallback((venue: VenueWithRelations) => {
    navigate(`/venues/${venue.id}`);
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/venues/new");
  }, [navigate]);

  const handleAddToCollection = useCallback((venues: VenueWithRelations[], clearSelection: () => void) => {
    setSelectedVenueIds(venues.map(v => v.id));
    setClearSelectionFn(() => clearSelection);
    setCollectionDialogOpen(true);
  }, []);

  const handleCollectionSuccess = useCallback(() => {
    clearSelectionFn?.();
    setSelectedVenueIds([]);
  }, [clearSelectionFn]);

  const selectionToolbar = useCallback((selectedRows: VenueWithRelations[], clearSelection: () => void) => {
    if (selectedRows.length === 0) return null;
    
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-primary ml-2">
          {selectedRows.length} venue{selectedRows.length !== 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddToCollection(selectedRows, clearSelection)}
            data-testid="button-add-selected-to-collection"
          >
            <FolderPlus className="h-4 w-4" />
            Add to Collection
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            data-testid="button-clear-selection"
          >
            Clear
          </Button>
        </div>
 
      </div>
    );
  }, [handleAddToCollection]);

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Venues" }]}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const dataGridProps = {
    queryKey: "/api/venues",
    columns: venueColumns,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    searchFields: ["name", "city", "state", "shortDescription"] as (keyof VenueWithRelations)[],
    searchPlaceholder: "Search venues...",
    onRowClick: handleRowClick,
    getRowId: (venue: VenueWithRelations) => venue.id,
    emptyMessage: "No venues yet",
    emptyDescription: "Venues will appear here once they are added.",
    externalData: venues,
    externalLoading: isVenuesLoading,
    filters: venueFilters,
    collapsibleFilters: true,
    enableRowSelection: true,
    selectionToolbar: selectionToolbar,
  };

  return (
    <>
      <PageLayout
        breadcrumbs={[{ label: "Venues" }]}
        primaryAction={isAdmin ? {
          label: "Add Venue",
          icon: CircleFadingPlus,
          onClick: handleCreate,
        } : undefined}
      >
        <div className="flex flex-col gap-4 h-full">
          <InfoBanner
            id="venue-features-tip"
            title="Need a new feature?"
            description="Request new functionality in the App Features section."
            ctaLabel="App Features"
            ctaUrl="/app/features"
            userId={user?.id}
          />
          <div className="flex-1 min-h-0">
            <DataGridPage {...dataGridProps} />
          </div>
        </div>
      </PageLayout>
      
      <AddToCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        venueIds={selectedVenueIds}
        onSuccess={handleCollectionSuccess}
      />

      <Dialog open={showWelcomeDialog} onOpenChange={(open) => !open && handleDismissWelcome()}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-venues-welcome">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-primary" />
              Welcome to Venues
            </DialogTitle>
            <DialogDescription className="text-base">
              Your central hub for discovering and managing event venues
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Search & Browse</h4>
                <p className="text-sm text-muted-foreground">
                  Quickly find venues by name, location, or description using the search bar.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Filter by Tags</h4>
                <p className="text-sm text-muted-foreground">
                  Narrow down venues by location, amenities, cuisine type, or style using the filter options.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">View Details</h4>
                <p className="text-sm text-muted-foreground">
                  Click any venue row to see full details including photos, capacity, and contact information.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Create Collections</h4>
                <p className="text-sm text-muted-foreground">
                  Select multiple venues and organize them into collections for easy reference.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleDismissWelcome} data-testid="button-dismiss-welcome">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
