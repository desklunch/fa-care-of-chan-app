import { useCallback } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import type { Venue } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { MapPin, Globe, Instagram, Check, X, ExternalLink, Image } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "city", "state", "website", "isActive"];

function NameCellRenderer({ data }: { data: Venue }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      {data.primaryPhotoUrl ? (
        <img 
          src={data.primaryPhotoUrl} 
          alt={data.name}
          className="w-8 h-8 rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
          <Image className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <span className="font-medium truncate" data-testid={`text-venue-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function LocationCellRenderer({ data }: { data: Venue }) {
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

function AddressCellRenderer({ data }: { data: Venue }) {
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

function WebsiteCellRenderer({ data }: { data: Venue }) {
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

function InstagramCellRenderer({ data }: { data: Venue }) {
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

function StatusCellRenderer({ data }: { data: Venue }) {
  if (!data) return null;
  return data.isActive ? (
    <Badge variant="default" className="text-xs" data-testid={`badge-venue-active-${data.id}`}>
      <Check className="w-3 h-3 mr-1" />
      Active
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs" data-testid={`badge-venue-inactive-${data.id}`}>
      <X className="w-3 h-3 mr-1" />
      Inactive
    </Badge>
  );
}

function DescriptionCellRenderer({ data }: { data: Venue }) {
  if (!data?.shortDescription) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.shortDescription}
    </span>
  );
}

const venueColumns: ColumnConfig<Venue>[] = [
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
      cellRenderer: (params: { data: Venue }) => <NameCellRenderer data={params.data} />,
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
      cellRenderer: (params: { data: Venue }) => <DescriptionCellRenderer data={params.data} />,
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
      cellRenderer: (params: { data: Venue }) => <LocationCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as Venue;
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
      cellRenderer: (params: { data: Venue }) => <AddressCellRenderer data={params.data} />,
      valueGetter: (params) => {
        const data = params.data as Venue;
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
      cellRenderer: (params: { data: Venue }) => <WebsiteCellRenderer data={params.data} />,
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
      cellRenderer: (params: { data: Venue }) => <InstagramCellRenderer data={params.data} />,
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
      cellRenderer: (params: { data: Venue }) => <StatusCellRenderer data={params.data} />,
    },
  },
];

export default function VenuesPage() {
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const handleRowClick = useCallback((venue: Venue) => {
    navigate(`/venues/${venue.id}`);
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
    queryKey: ["/api/venues"],
    columns: venueColumns,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    searchFields: ["name", "city", "state", "shortDescription"] as const,
    searchPlaceholder: "Search venues...",
    onRowClick: handleRowClick,
    getRowId: (venue: Venue) => venue.id,
    emptyMessage: "No venues yet",
    emptyDescription: "Venues will appear here once they are added.",
  };

  return (
    <PageLayout breadcrumbs={[{ label: "Venues" }]}>
      <DataGridPage {...dataGridProps} />
    </PageLayout>
  );
}
