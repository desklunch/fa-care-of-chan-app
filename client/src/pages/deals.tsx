import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { getEventsSummaryText } from "@/components/event-schedule";
import type { DealWithRelations, DealEvent, DealService, DealLocation } from "@shared/schema";
import { dealStatuses, dealServices } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date";
import { CircleFadingPlus, Flag, User, MapPin, Briefcase } from "lucide-react";
import { DealStatusBadge } from "@/components/deal-status-badge";

const DEFAULT_VISIBLE_COLUMNS = [ "displayName", "client", "budget", "status", "owner", "eventSchedule", "locations"];

// Filter configurations
const dealFilters: FilterConfig<DealWithRelations>[] = [
  {
    id: "status",
    label: "Status",
    icon: Flag,
    optionSource: {
      type: "static",
      options: dealStatuses.map((status) => ({ id: status, label: status })),
    },
    matchFn: (deal, selectedValues) => selectedValues.includes(deal.status),
  },
  {
    id: "owner",
    label: "Owner",
    icon: User,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const ownerMap = new Map<string, string>();
        data.forEach((deal) => {
          if (deal.owner && deal.ownerId) {
            const fullName = [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ") || "Unknown";
            if (!ownerMap.has(deal.ownerId)) {
              ownerMap.set(deal.ownerId, fullName);
            }
          }
        });
        return Array.from(ownerMap.entries()).map(([id, label]) => ({ id, label }));
      },
    },
    matchFn: (deal, selectedValues) => {
      if (!deal.ownerId) return false;
      return selectedValues.includes(deal.ownerId);
    },
  },
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const locationSet = new Map<string, string>();
        data.forEach((deal) => {
          const locations = deal.locations as DealLocation[] | null;
          if (locations) {
            locations.forEach((loc) => {
              if (!locationSet.has(loc.displayName)) {
                locationSet.set(loc.displayName, loc.displayName);
              }
            });
          }
        });
        return Array.from(locationSet.entries()).map(([id, label]) => ({ id, label }));
      },
    },
    matchFn: (deal, selectedValues) => {
      const locations = deal.locations as DealLocation[] | null;
      if (!locations || locations.length === 0) return false;
      return locations.some((loc) => selectedValues.includes(loc.displayName));
    },
  },
  {
    id: "services",
    label: "Services",
    icon: Briefcase,
    optionSource: {
      type: "static",
      options: dealServices.map((service) => ({ id: service, label: service })),
    },
    matchFn: (deal, selectedValues) => {
      const services = deal.services as DealService[] | null;
      if (!services || services.length === 0) return false;
      return services.some((service) => selectedValues.includes(service));
    },
  },
];

const dealColumns: ColumnConfig<DealWithRelations>[] = [
  {
    id: "owner",
    headerName: "Owner",
    field: "owner",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 100,
      maxWidth: 100,
      valueGetter: (params: { data: DealWithRelations }) => {
        const owner = params.data?.owner;
        if (!owner) return "";
        const initials = [owner.firstName?.[0], owner.lastName?.[0]].filter(Boolean).join("").toUpperCase();
        return initials || "?";
      },
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Basic Info",
    colDef: {
      flex:1,
      minWidth: 190,
      maxWidth: 190,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return <DealStatusBadge status={params.value as DealWithRelations["status"]} />;
      },
    },
  },
  {
    id: "eventSchedule",
    headerName: "Event Schedule",
    field: "eventSchedule",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 180,
      valueGetter: (params: { data: DealWithRelations }) => {
        const events = params.data?.eventSchedule as DealEvent[] | null;
        if (!events || events.length === 0) return "";
        return getEventsSummaryText(events);
      },
    },
  },

  {
    id: "displayName",
    headerName: "Deal",
    field: "displayName",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
    },
  },
  {
    id: "client",
    headerName: "Client",
    field: "client",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 150,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.client?.name || "";
      },
    },
  },
  {
    id: "locations",
    headerName: "Locations",
    field: "locations",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 250,
      valueGetter: (params: { data: DealWithRelations }) => {
        const locations = params.data?.locations as Array<{ displayName: string }> | null;
        if (!locations || locations.length === 0) return "";
        return locations.map((loc) => loc.displayName).join(" | ");
      },
    },
  },
  {
    id: "budget",
    headerName: "Budget",
    field: "budgetHigh",
    category: "Basic Info",
    colDef: {
      flex: 1,
      width: 150,
      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        const deal = params.data;
        if (!deal) return "";
        if (!deal.budgetHigh && !deal.budgetLow) return "";
        if (deal.budgetLow && deal.budgetHigh) {
          return `$${deal.budgetLow.toLocaleString("en-US")} - $${deal.budgetHigh.toLocaleString("en-US")}`;
        }
        if (deal.budgetHigh) {
          return `$${deal.budgetHigh.toLocaleString("en-US")}`;
        }
        if (deal.budgetLow) {
          return `$${deal.budgetLow.toLocaleString("en-US")}+`;
        }
        return "Unconfirmed";
      },
    },
  },
  {
    id: "startedOn",
    headerName: "Started On",
    field: "startedOn",
    category: "Dates",
    colDef: {
      width: 120,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value);
      },
    },
  },
  {
    id: "wonOn",
    headerName: "Won On",
    field: "wonOn",
    category: "Dates",
    colDef: {
      width: 120,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value);
      },
    },
  },
  {
    id: "lastContactOn",
    headerName: "Last Contact",
    field: "lastContactOn",
    category: "Dates",
    colDef: {
      width: 120,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value);
      },
    },
  },
  {
    id: "externalId",
    headerName: "External ID",
    field: "externalId",
    category: "Details",
    colDef: {
      width: 100,
    },
  },

  {
    id: "budgetNotes",
    headerName: "Budget Notes",
    field: "budgetNotes",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 200,
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 200,
    },
  },


  {
    id: "services",
    headerName: "Services",
    field: "services",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 180,
      valueGetter: (params: { data: DealWithRelations }) => {
        const services = params.data?.services as DealService[] | null;
        if (!services || services.length === 0) return "";
        return services.join(", ");
      },
    },
  },


  {
    id: "createdBy",
    headerName: "Created By",
    field: "createdBy",
    category: "Details",
    colDef: {
      flex: 1,
      minWidth: 150,
      valueGetter: (params: { data: DealWithRelations }) => {
        const createdBy = params.data?.createdBy;
        if (!createdBy) return "";
        return [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") || "Unknown";
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
      valueFormatter: (params: { value: string | Date | null }) => {
        if (!params.value) return "";
        return format(new Date(params.value), "MMM d, yyyy");
      },
    },
  },
  {
    id: "updatedAt",
    headerName: "Updated",
    field: "updatedAt",
    category: "Details",
    colDef: {
      width: 130,
      valueFormatter: (params: { value: string | Date | null }) => {
        if (!params.value) return "";
        return format(new Date(params.value), "MMM d, yyyy");
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
          "displayName",
          (deal) => `#${deal.dealNumber}`,
          "status",
          (deal) => deal.client?.name || "",
          (deal) => {
            const locations = deal.locations as Array<{ displayName: string }> | null;
            return locations?.map((loc) => loc.displayName).join(" ") || "";
          },
        ]}
        searchPlaceholder="Search deals..."
        filters={dealFilters}
        collapsibleFilters={true}
        onRowClick={(deal) => setLocation(`/deals/${deal.id}`)}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals found"
        emptyDescription="Start tracking your sales pipeline by creating a deal."
      />
    </PageLayout>
  );
}
