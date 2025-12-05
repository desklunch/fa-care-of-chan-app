import { useCallback } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import type { VenueWithRelations } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { MapPin, Globe, Instagram, ExternalLink, icons, HelpCircle, type LucideIcon } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "city", "state", "cuisineTags", "styleTags", "amenities"];

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
      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
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
          variant="default"
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

export default function VenuesPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleRowClick = useCallback((venue: VenueWithRelations) => {
    navigate(`/venues/${venue.id}`);
  }, [navigate]);

  const handleCreate = useCallback(() => {
    navigate("/venues/new");
  }, [navigate]);

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
  };

  return (
    <PageLayout
      breadcrumbs={[{ label: "Venues" }]}
      primaryAction={isAdmin ? {
        label: "Add Venue",
        onClick: handleCreate,
      } : undefined}
    >
      <DataGridPage {...dataGridProps} />
    </PageLayout>
  );
}
