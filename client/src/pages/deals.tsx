import { useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CellValueChangedEvent } from "ag-grid-community";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import type {
  DealWithRelations,
  DealService,
  DealLocation,
  User as UserType,
} from "@shared/schema";
import { dealStatuses, dealServices } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { formatDateOnly } from "@/lib/date";
import { CircleFadingPlus, Flag, User, MapPin, Briefcase, SquareArrowOutUpRight } from "lucide-react";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper to get full name from user
function getUserFullName(user: Pick<UserType, "firstName" | "lastName"> | null | undefined): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "";
}

// Context type for the grid - provides user list for Owner dropdown
interface DealsGridContext {
  users: Array<Pick<UserType, "id" | "firstName" | "lastName">>;
}

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

  "concept",
  "services",
  "locations",
  "notes",
  "budgetNotes",
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
      minWidth: 280,
      maxWidth: 360,
      sortable: false,
      editable: true,
      cellRenderer: (params: { data: DealWithRelations; value: string }) => {
        if (!params.data) return null;
        return (
          <span className="flex items-a  gap-3 w-full">
            <span className="flex-1 truncate">{params.value}</span>
            <Link href={`/deals/${params.data.id}`} className="flex-shrink-0">
              <Button size="sm" variant="ghost" className="bg-foreground/5 h-7 px-2">
                <SquareArrowOutUpRight className="h-3 w-3 " />
              </Button>
            </Link>
          </span>
        );
      },
    },
  },
  {
    id: "owner",
    headerName: "Owner",
    field: "ownerId",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      maxWidth: 180,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params: { context: DealsGridContext }) => {
        const users = params.context?.users || [];
        return {
          values: ["", ...users.map((u) => getUserFullName(u))],
        };
      },
      valueGetter: (params: { data: DealWithRelations | undefined; context: DealsGridContext }) => {
        const ownerId = params.data?.ownerId;
        if (!ownerId) return "";
        const users = params.context?.users || [];
        const user = users.find((u) => u.id === ownerId);
        return getUserFullName(user);
      },
      valueSetter: (params: { data: DealWithRelations; newValue: string; context: DealsGridContext }) => {
        if (params.newValue === "") {
          params.data.ownerId = null;
          params.data.owner = null;
          return true;
        }
        const users = params.context?.users || [];
        const user = users.find((u) => getUserFullName(u) === params.newValue);
        if (user) {
          params.data.ownerId = user.id;
          params.data.owner = { ...user } as typeof params.data.owner;
          return true;
        }
        return false;
      },
      cellEditorPopup: false,
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
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: dealStatuses,
      },
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
      editable: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 500,
        rows: 3,
        cols: 30,
      },
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
      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        return params.data?.client?.name || "";
      },
    },
  },

  {
    id: "startedOn",
    headerName: "Started On",
    field: "startedOn",
    category: "Dates",
    colDef: {
      minWidth: 150,
      maxWidth: 150,
      editable: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
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
      editable: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
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
      minWidth: 160,
      maxWidth: 160,
      editable: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      comparator: createDateComparator((data) => data?.lastContactOn),
    },
  },
  {
    id: "proposalSentOn",
    headerName: "Proposal Sent",
    field: "proposalSentOn",
    category: "Dates",
    colDef: {
      minWidth: 150,
      maxWidth: 150,
      editable: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      comparator: createDateComparator((data) => data?.proposalSentOn),
    },
  },
  {
    id: "concept",
    headerName: "Concept",
    field: "concept",
    category: "Basic Info",
    colDef: {
      flex: 3,
      minWidth: 300,
      editable: true,
      sortable: false,
      cellEditor: "agLargeTextCellEditor",
        cellEditorPopup: true,
        cellEditorParams: {
          maxLength: 10000,
          rows: 10,
          cols: 60,
        },
        wrapText: true,
        autoHeight: true,
      cellStyle: {
        whiteSpace: "pre-wrap",
        lineHeight: "1.4",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        paddingTop: "8px",
        paddingBottom: "8px",
      },
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
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { data: DealWithRelations }) => {
        const services = params.data?.services as DealService[] | null;
        if (!services || services.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 py-1">
            {services.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        );
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
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { data: DealWithRelations }) => {
        const locations = params.data?.locations as Array<{
          displayName: string;
        }> | null;
        if (!locations || locations.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 py-1">
            {locations.map((loc, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {loc.displayName}
              </Badge>
            ))}
          </div>
        );
      },
    },
  },
  {
    id: "notes",
    headerName: "Next Steps",
    field: "notes",
    category: "Basic Info",
    colDef: {
      flex: 3,
      minWidth: 300,
      sortable: false,
      editable: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 10000,
        rows: 10,
        cols: 60,
      },
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-2 [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1 ">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {params.value}
            </ReactMarkdown>
          </div>
        );
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
      editable: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 5000,
        rows: 8,
        cols: 50,
      },
    },
  },
];

export default function Deals() {
  usePageTitle("Deals");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch users for the Owner dropdown
  const { data: users = [] } = useQuery<Array<Pick<UserType, "id" | "firstName" | "lastName">>>({
    queryKey: ["/api/users"],
  });

  // Context for the grid - provides user list for Owner dropdown
  const gridContext: DealsGridContext = {
    users,
  };

  // Mutation to update a single deal field with optimistic updates
  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: string; updates: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, updates);
    },
    onMutate: async ({ dealId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/deals"] });
      
      // Snapshot the previous value
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>(["/api/deals"]);
      
      // Optimistically update the cache
      if (previousDeals) {
        queryClient.setQueryData<DealWithRelations[]>(["/api/deals"], (old) => {
          if (!old) return old;
          return old.map((deal) => {
            if (deal.id === dealId) {
              const updatedDeal = { ...deal, ...updates };
              // For owner changes, also update the owner object for display
              if (updates.ownerId !== undefined) {
                const user = users.find((u) => u.id === updates.ownerId);
                if (user) {
                  updatedDeal.owner = { ...user } as typeof deal.owner;
                } else if (updates.ownerId === "" || updates.ownerId === null) {
                  updatedDeal.owner = null;
                }
              }
              return updatedDeal as DealWithRelations;
            }
            return deal;
          });
        });
      }
      
      return { previousDeals };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousDeals) {
        queryClient.setQueryData(["/api/deals"], context.previousDeals);
      }
      toast({
        title: "Failed to save changes",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating deal:", error);
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  // Handle cell value changes - persist to server
  const handleCellValueChanged = useCallback((event: CellValueChangedEvent<DealWithRelations>) => {
    const { data, colDef, newValue, oldValue } = event;
    if (!data?.id || !colDef.field) return;
    if (newValue === oldValue) return;

    const field = colDef.field as string;
    let processedValue: unknown = newValue;

    // Handle owner field - valueSetter already updated data.ownerId, so use that
    if (field === "ownerId") {
      processedValue = data.ownerId;
      if (processedValue === "") {
        processedValue = null;
      }
    }

    // Handle empty strings as null for date fields
    const dateFields = ["startedOn", "wonOn", "lastContactOn", "proposalSentOn", "projectDate"];
    if (dateFields.includes(field)) {
      processedValue = newValue === "" ? null : newValue;
    }

    // Handle empty strings as null for nullable ID fields (foreign keys)
    const nullableIdFields = ["clientId"];
    if (nullableIdFields.includes(field) && newValue === "") {
      processedValue = null;
    }

    // Handle empty strings as null for nullable text fields
    const nullableTextFields = ["concept", "notes", "budgetNotes"];
    if (nullableTextFields.includes(field) && newValue === "") {
      processedValue = null;
    }

    const updates: Record<string, unknown> = { [field]: processedValue };
    updateDealMutation.mutate({ dealId: data.id, updates });
  }, [updateDealMutation]);

  // Mutation to reorder deals with optimistic cache updates
  // rowDragManaged=true handles instant visual feedback; we just sync cache & persist
  const reorderMutation = useMutation({
    mutationFn: async (dealIds: string[]) => {
      return apiRequest("POST", "/api/deals/reorder", { dealIds });
    },
    onMutate: async (dealIds: string[]) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/deals"] });
      
      // Snapshot current cache for rollback
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>(["/api/deals"]);
      
      // Optimistically update cache to match the new order
      if (previousDeals) {
        const dealMap = new Map(previousDeals.map(d => [d.id, d]));
        const reorderedDeals = dealIds
          .map(id => dealMap.get(id))
          .filter((d): d is DealWithRelations => d !== undefined);
        queryClient.setQueryData(["/api/deals"], reorderedDeals);
      }
      
      return { previousDeals };
    },
    onError: (error, _dealIds, context) => {
      // Rollback to previous order on error
      if (context?.previousDeals) {
        queryClient.setQueryData(["/api/deals"], context.previousDeals);
      }
      toast({
        title: "Failed to save order",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      });
      console.error("Error reordering deals:", error);
    },
    onSettled: () => {
      // Refetch in background to ensure server/client sync (silent, no UI disruption)
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  // Handle row drag end - save the new order
  const handleRowDragEnd = (reorderedData: DealWithRelations[]) => {
    const dealIds = reorderedData.map((deal) => deal.id);
    reorderMutation.mutate(dealIds);
  };

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
        context={gridContext}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals found"
        emptyDescription="Start tracking your sales pipeline by creating a deal."
        enableRowDrag={true}
        onRowDragEnd={handleRowDragEnd}
        onCellValueChanged={handleCellValueChanged}
      />
    </PageLayout>
  );
}
// onRowClick={(deal) => setLocation(`/deals/${deal.id}`)}