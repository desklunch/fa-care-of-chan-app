import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DealWithRelations, DealStatus } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus, Building2, Calendar, DollarSign, Users } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["client", "status", "primaryDate", "maxBudget", "owner"];

const dealStatusConfig: Record<DealStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  Inquiry: { label: "Inquiry", variant: "outline" },
  Discovery: { label: "Discovery", variant: "secondary" },
  "Internal Review": { label: "Internal Review", variant: "secondary" },
  Contracting: { label: "Contracting", variant: "default" },
  Won: { label: "Won", variant: "default" },
  Lost: { label: "Lost", variant: "destructive" },
  Cancelled: { label: "Cancelled", variant: "outline" },
  Declined: { label: "Declined", variant: "destructive" },
};

function StatusCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.status) return null;
  const config = dealStatusConfig[data.status as DealStatus];
  if (!config) return <Badge variant="outline">{data.status}</Badge>;
  return (
    <div className="flex items-center h-full">
      <Badge variant={config.variant} className="text-xs" data-testid={`badge-status-${data.id}`}>
        {config.label}
      </Badge>
    </div>
  );
}

function ClientCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.client) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="font-medium truncate" data-testid={`text-client-name-${data.id}`}>
        {data.client.name}
      </span>
    </div>
  );
}

function OwnerCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.owner) return null;
  const initials = `${data.owner.firstName?.[0] || ""}${data.owner.lastName?.[0] || ""}`;
  return (
    <div className="flex items-center gap-2 h-full">
      <Avatar className="h-6 w-6">
        <AvatarImage src={data.owner.profileImageUrl || undefined} alt={`${data.owner.firstName} ${data.owner.lastName}`} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="truncate">{data.owner.firstName} {data.owner.lastName}</span>
    </div>
  );
}

function BudgetCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.maxBudget) return null;
  return (
    <div className="flex items-center gap-1 h-full">
      <DollarSign className="w-3 h-3 text-muted-foreground" />
      <span>{data.maxBudget.toLocaleString()}k</span>
    </div>
  );
}

function PrimaryDateCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.primaryDate) {
    if (data?.estimatedMonths && Array.isArray(data.estimatedMonths) && data.estimatedMonths.length > 0) {
      return (
        <div className="flex items-center gap-1 h-full text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span className="truncate">{(data.estimatedMonths as string[]).join(", ")}</span>
        </div>
      );
    }
    return null;
  }
  return (
    <div className="flex items-center gap-1 h-full">
      <Calendar className="w-3 h-3 text-muted-foreground" />
      <span>{data.primaryDate}</span>
      {data.isDateFlexible && (
        <Badge variant="outline" className="text-xs">Flexible</Badge>
      )}
    </div>
  );
}

function GuestCountCellRenderer({ data }: { data: DealWithRelations }) {
  if (!data?.guestCount) return null;
  return (
    <div className="flex items-center gap-1 h-full">
      <Users className="w-3 h-3 text-muted-foreground" />
      <span>{data.guestCount}</span>
    </div>
  );
}

const dealColumns: ColumnConfig<DealWithRelations>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "Basic Info",
    colDef: {
      width: 120,
    },
  },
  {
    id: "client",
    headerName: "Client",
    field: "client",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: ClientCellRenderer,
      valueGetter: (params: { data: DealWithRelations | undefined }) => params.data?.client?.name || "",
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Basic Info",
    colDef: {
      width: 140,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "owner",
    headerName: "Owner",
    field: "owner",
    category: "Basic Info",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: OwnerCellRenderer,
      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        const owner = params.data?.owner;
        return owner ? `${owner.firstName} ${owner.lastName}` : "";
      },
    },
  },
  {
    id: "primaryDate",
    headerName: "Event Date",
    field: "primaryDate",
    category: "Event",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: PrimaryDateCellRenderer,
    },
  },
  {
    id: "dateType",
    headerName: "Date Type",
    field: "dateType",
    category: "Event",
    colDef: {
      width: 130,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <Badge variant="outline" className="text-xs">{params.value}</Badge>
          </div>
        );
      },
    },
  },
  {
    id: "maxBudget",
    headerName: "Budget",
    field: "maxBudget",
    category: "Event",
    colDef: {
      width: 120,
      cellRenderer: BudgetCellRenderer,
    },
  },
  {
    id: "guestCount",
    headerName: "Guests",
    field: "guestCount",
    category: "Event",
    colDef: {
      width: 100,
      cellRenderer: GuestCountCellRenderer,
    },
  },
  {
    id: "eventPurpose",
    headerName: "Purpose",
    field: "eventPurpose",
    category: "Event",
    colDef: {
      flex: 1,
      minWidth: 130,
    },
  },
  {
    id: "eventFormat",
    headerName: "Format",
    field: "eventFormat",
    category: "Event",
    colDef: {
      width: 130,
    },
  },
  {
    id: "services",
    headerName: "Services",
    field: "services",
    category: "Event",
    colDef: {
      width: 130,
    },
  },
  {
    id: "eventConcept",
    headerName: "Concept",
    field: "eventConcept",
    category: "Details",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Details",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Details",
    colDef: {
      width: 130,
      cellRenderer: (params: { value: string | Date | null }) => {
        if (!params.value) return null;
        const date = new Date(params.value);
        return (
          <div className="flex items-center h-full text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </div>
        );
      },
    },
  },
];

export default function Deals() {
  usePageTitle("Deals");
  const [, setLocation] = useLocation();

  return (
    <PageLayout
      breadcrumbs={[{ label: "Deals" }]}
      primaryAction={{
        label: "New Deal",
        href: "/deals/new",
        icon: CircleFadingPlus,
      }}
    >
      <DataGridPage
        queryKey="/api/deals"
        columns={dealColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          (deal) => deal.client?.name || "",
          (deal) => `${deal.owner?.firstName || ""} ${deal.owner?.lastName || ""}`,
          "eventPurpose",
          "eventFormat",
          "eventConcept",
        ]}
        searchPlaceholder="Search deals..."
        onRowClick={(deal) => setLocation(`/deals/${deal.id}`)}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals found"
        emptyDescription="Your deals pipeline is empty."
      />
    </PageLayout>
  );
}
