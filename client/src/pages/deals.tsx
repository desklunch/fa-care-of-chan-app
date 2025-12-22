import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { getEventsSummaryText } from "@/components/event-schedule";
import type {
  DealWithRelations,
  DealEvent,
  DealService,
  DealLocation,
} from "@shared/schema";
import { dealStatuses, dealServices } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { formatDateOnly } from "@/lib/date";
import { CircleFadingPlus, Flag, User, MapPin, Briefcase } from "lucide-react";
import { DealStatusBadge } from "@/components/deal-status-badge";

/**
 * Creates a comparator for date columns that pushes null/empty values to the bottom
 * regardless of whether sorting ascending or descending.
 *
 * AG Grid inverts comparator results for descending sorts, so we need to account for that
 * when handling nulls to ensure they always appear at the bottom.
 */
function createDateComparator(
  getValue: (data: DealWithRelations | undefined) => string | null | undefined,
) {
  return (
    valueA: unknown,
    valueB: unknown,
    nodeA: { data: DealWithRelations | undefined },
    nodeB: { data: DealWithRelations | undefined },
    isDescending: boolean,
  ): number => {
    const dateA = getValue(nodeA.data);
    const dateB = getValue(nodeB.data);

    const aIsNull = !dateA;
    const bIsNull = !dateB;

    // Both null - equal
    if (aIsNull && bIsNull) return 0;

    // Handle nulls: push to bottom regardless of sort direction
    // AG Grid inverts comparator result for descending, so we must counter that
    if (aIsNull) {
      // We want null at bottom: ascending needs +1, descending needs -1 (AG Grid will invert to +1)
      return isDescending ? -1 : 1;
    }
    if (bIsNull) {
      // We want null at bottom: ascending needs -1, descending needs +1 (AG Grid will invert to -1)
      return isDescending ? 1 : -1;
    }

    // Compare dates as strings (YYYY-MM-DD format sorts correctly lexicographically)
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  };
}

const DEFAULT_VISIBLE_COLUMNS = [
  "displayName", 
  "owner",
  "status",
  "projectDate",
  "client",
  "startedOn",
  "wonOn",
  "lastContactOn",
  "concept",
  "services",
  "locations",
  "notes",
];

/**
 * Status priority order for sorting (lower number = higher priority in ascending sort)
 */
const STATUS_SORT_ORDER: Record<string, number> = {
  Prospecting: 1,
  "Warm Lead": 2,
  Proposal: 3,
  "Waiting for Feedback": 4,
  "In Contracting": 5,
  "In Progress": 6,
  "Final Invoicing": 7,
  Complete: 8,
  "No Go": 9,
  Cancelled: 10,
};

/**
 * Creates a comparator for the status column that sorts by pipeline stage order
 */
function createStatusComparator() {
  return (
    valueA: unknown,
    valueB: unknown,
    nodeA: { data: DealWithRelations | undefined },
    nodeB: { data: DealWithRelations | undefined },
    isDescending: boolean,
  ): number => {
    const statusA = nodeA.data?.status;
    const statusB = nodeB.data?.status;

    // Get priority (unknown statuses get high number to sort to end)
    const priorityA = statusA ? (STATUS_SORT_ORDER[statusA] ?? 999) : 999;
    const priorityB = statusB ? (STATUS_SORT_ORDER[statusB] ?? 999) : 999;

    return priorityA - priorityB;
  };
}

// Filter configurations
const dealFilters: FilterConfig<DealWithRelations>[] = [
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
            const fullName =
              [deal.owner.firstName, deal.owner.lastName]
                .filter(Boolean)
                .join(" ") || "Unknown";
            if (!ownerMap.has(deal.ownerId)) {
              ownerMap.set(deal.ownerId, fullName);
            }
          }
        });
        return Array.from(ownerMap.entries()).map(([id, label]) => ({
          id,
          label,
        }));
      },
    },
    matchFn: (deal, selectedValues) => {
      if (!deal.ownerId) return false;
      return selectedValues.includes(deal.ownerId);
    },
  },
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
        return Array.from(locationSet.entries()).map(([id, label]) => ({
          id,
          label,
        }));
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
        const initials = [owner.firstName?.[0], owner.lastName?.[0]]
          .filter(Boolean)
          .join("")
          .toUpperCase();
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
      flex: 1,
      minWidth: 190,
      maxWidth: 190,
      comparator: createStatusComparator(),
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return (
          <DealStatusBadge
            status={params.value as DealWithRelations["status"]}
          />
        );
      },
    },
  },
  {
    id: "projectDate",
    headerName: "Project Date",
    field: "projectDate",
    category: "Dates",
    colDef: {
      width: 150,
      minWidth: 120,
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
      comparator: createDateComparator((data) => data?.earliestEventDate),
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
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.client?.name || "";
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
      minWidth: 130,
      maxWidth: 130,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yyyy");
      },
      comparator: createDateComparator((data) => data?.startedOn),
    },
  },
  {
    id: "wonOn",
    headerName: "Won On",
    field: "wonOn",
    category: "Dates",
    colDef: {
      minWidth: 130,
      maxWidth: 130,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yyyy");
      },
      comparator: createDateComparator((data) => data?.wonOn),
    },
  },
  {
    id: "lastContactOn",
    headerName: "Last Contact",
    field: "lastContactOn",
    category: "Dates",
    colDef: {
      minWidth: 130,
      maxWidth: 130,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yyyy");
      },
      comparator: createDateComparator((data) => data?.lastContactOn),
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
    id: "locations",
    headerName: "Locations",
    field: "locations",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 250,
      valueGetter: (params: { data: DealWithRelations }) => {
        const locations = params.data?.locations as Array<{
          displayName: string;
        }> | null;
        if (!locations || locations.length === 0) return "";
        return locations.map((loc) => loc.displayName).join(" | ");
      },
    },
  },
  {
    id: "notes",
    headerName: "NextSteps",
    field: "notes",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 200,
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
        return (
          [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") ||
          "Unknown"
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
            const locations = deal.locations as Array<{
              displayName: string;
            }> | null;
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
