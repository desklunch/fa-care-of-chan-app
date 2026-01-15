import { useCallback, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Industry,
} from "@shared/schema";
import { dealStatuses } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { formatDateOnly } from "@/lib/date";
import {
  CircleFadingPlus,
  Flag,
  User,
  MapPin,
  Briefcase,
  SquareArrowOutUpRight,
  Calendar,
  Building2,
} from "lucide-react";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServicesCellEditor } from "@/components/ag-grid/services-cell-editor";

// Helper to get full name from user
function getUserFullName(
  user: Pick<UserType, "firstName" | "lastName"> | null | undefined,
): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "";
}

// Helper to get initials from a full name
function getInitials(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Context type for the grid - provides user list for Owner dropdown, services, and industries
interface DealsGridContext {
  users: Array<Pick<UserType, "id" | "firstName" | "lastName">>;
  services: DealService[];
  servicesMap: Map<number, DealService>;
  industries: Industry[];
  industriesMap: Map<string, Industry>;
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
  "client",
  "startedOn",
  "wonOn",
  "lastContactOn",
  "proposalSentOn",
  "concept",
  "industry",
  "primaryContact",
  "services",
  "locationsText",
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
  Feedback: 4,
  Contracting: 5,
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
      type: "deriveFromData",
      deriveOptions: (_data, context) => {
        const ctx = context as DealsGridContext | undefined;
        if (!ctx?.services) return [];
        return ctx.services
          .filter((s) => s.isActive)
          .map((service) => ({
            id: String(service.id),
            label: service.name,
          }));
      },
    },
    matchFn: (deal, selectedValues) => {
      const serviceIds = deal.serviceIds as number[] | null;
      if (!serviceIds || serviceIds.length === 0) return false;
      return serviceIds.some((id) => selectedValues.includes(String(id)));
    },
  },
  {
    id: "industry",
    label: "Industry",
    icon: Building2,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (_data, context) => {
        const ctx = context as DealsGridContext | undefined;
        if (!ctx?.industries) return [];
        return ctx.industries
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((industry) => ({ id: industry.id, label: industry.name }));
      },
    },
    matchFn: (deal, selectedValues) => {
      const industryId = deal.industryId;
      if (!industryId) return false;
      return selectedValues.includes(industryId);
    },
  },
];

const dealColumns: ColumnConfig<DealWithRelations>[] = [
  {
    id: "displayName",
    headerName: "Deal",
    field: "displayName",
    category: "Basic Info",
    toggleable: false,
    colDef: {
      flex: 2,
      minWidth: 240,
      width:240,
      maxWidth: 320,
      pinned: "left",
      lockPinned: true,
      sortable: false,
      editable: true,
 
      cellRenderer: (params: { data: DealWithRelations; value: string }) => {
        if (!params.data) return null;
        return (
          <span className="flex items-start  gap-3 w-full flex-row-reverse md:flex-row">
            <span className="flex-1 truncate">{params.value}</span>
            <Link href={`/deals/${params.data.id}`} className="hidden md:block flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="  bg-foreground/5 text-muted-foreground p-2"
              >
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
      flex: 0,
      width: 76,
      editable: true,
      cellEditor: "agSelectCellEditor",
      resizable: false,

      autoHeight: true,
      sortable: false,

      cellEditorParams: (params: { context: DealsGridContext }) => {
        const users = params.context?.users || [];
        return {
          values: [
            "none",
            ...users.map((u) => getInitials(getUserFullName(u))),
          ],
        };
      },
      valueGetter: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        const ownerId = params.data?.ownerId;
        if (!ownerId) return "none";
        const users = params.context?.users || [];
        const user = users.find((u) => u.id === ownerId);
        if (!user) return "none";
        return getInitials(getUserFullName(user));
      },
      cellRenderer: (params: { value: string }) => {
        if (!params.value || params.value === "none")
          return <div className="">-</div>;
        return <div className="">{params.value}</div>;
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: string | null;
        context: DealsGridContext;
      }) => {
        // Handle empty/none selection
        if (
          params.newValue === null ||
          params.newValue === "" ||
          params.newValue === "none"
        ) {
          params.data.ownerId = null;
          params.data.owner = null;
          return true;
        }
        // Find user by matching initials
        const users = params.context?.users || [];
        const user = users.find(
          (u) => getInitials(getUserFullName(u)) === params.newValue,
        );
        if (user) {
          params.data.ownerId = user.id;
          params.data.owner = { ...user } as typeof params.data.owner;
          return true;
        }
        return false;
      },
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Basic Info",
    colDef: {
      width: 150,
      resizable: false,

      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: dealStatuses,
      },
      comparator: createStatusComparator(),

      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return (
          <div className="@container w-full h-full flex items-start pt-[14px]">
            <DealStatusBadge
              status={params.value as DealWithRelations["status"]}
            />
          </div>
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
      flex: 1.5,
      minWidth: 150,
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
      cellRenderer: (params: { data: DealWithRelations | undefined }) => {
        const client = params.data?.client;
        if (!client) return null;
        return (
          <Link
            href={`/clients/${client.id}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="text-foreground hover:underline truncate"
            data-testid={`link-client-${client.id}`}
          >
            {client.name}
          </Link>
        );
      },
    },
  },

  {
    id: "startedOn",
    headerName: "Started On",
    field: "startedOn",
    category: "Dates",
    colDef: {
      width: 130,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{formatDateOnly(params.value, "MM/dd/yy")}</span>
          </span>
        );
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
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{formatDateOnly(params.value, "MM/dd/yy")}</span>
          </span>
        );
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
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{formatDateOnly(params.value, "MM/dd/yy")}</span>
          </span>
        );
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
      minWidth: 130,
      maxWidth: 130,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueFormatter: (params: { value: string | null }) => {
        if (!params.value) return "";
        return formatDateOnly(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{formatDateOnly(params.value, "MM/dd/yy")}</span>
          </span>
        );
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
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="text-sm/6 tracking-wide font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1 ">
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
    id: "industry",
    headerName: "Industry",
    field: "industryId",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 140,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params: { context: DealsGridContext }) => {
        const industries = params.context?.industries || [];
        return {
          values: [
            "(None)",
            ...industries
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((industry) => industry.name),
          ],
        };
      },
      valueGetter: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        const industryId = params.data?.industryId;
        if (!industryId) return "(None)";
        const industry = params.context?.industriesMap?.get(industryId);
        return industry?.name || "(None)";
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: string | null;
        context: DealsGridContext;
      }) => {
        // Handle empty/none selection
        if (
          params.newValue === null ||
          params.newValue === "" ||
          params.newValue === "(None)"
        ) {
          params.data.industryId = null;
          return true;
        }
        // Look up the industry by name to get the ID
        const industries = params.context?.industries || [];
        const industry = industries.find((i) => i.name === params.newValue);
        if (industry) {
          params.data.industryId = industry.id;
          return true;
        }
        return false;
      },
      cellRenderer: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        const industryId = params.data?.industryId;
        if (!industryId) return null;
        const industry = params.context?.industriesMap?.get(industryId);
        return (
          <div className="flex flex-wrap gap-1 pt-2.5">
            <Badge variant="secondary" className="text-xs">
              {industry?.name || industryId}
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "primaryContact",
    headerName: "Primary Contact",
    field: "primaryContact",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      autoHeight: true,

      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        const contact = params.data?.primaryContact;
        if (!contact) return "";
        return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      },
      cellRenderer: (params: { data: DealWithRelations | undefined }) => {
        const contact = params.data?.primaryContact;
        if (!contact) return null;
        const fullName = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          <span className="flex flex-col py-[16px] gap-0.5">
            <Link
              href={`/contacts/${contact.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="text-foreground hover:underline  text-sm"
              data-testid={`link-contact-${contact.id}`}
            >
              {fullName}
            </Link>
            {contact.jobTitle && (
              <span className="text-xs text-muted-foreground truncate">
                {contact.jobTitle}
              </span>
            )}
          </span>
        );
      },
    },
  },
  {
    id: "z",
    headerName: "Services",
    field: "serviceIds",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 180,
      wrapText: true,
      autoHeight: true,
      editable: true,
      cellEditor: ServicesCellEditor,
      cellEditorPopup: true,
      cellRenderer: (params: {
        data: DealWithRelations;
        context: DealsGridContext;
      }) => {
        const serviceIds = params.data?.serviceIds as number[] | null;
        if (!serviceIds || serviceIds.length === 0) return null;
        const servicesMap = params.context?.servicesMap;
        return (
          <div className="flex flex-wrap gap-1 py-2.5">
            {serviceIds.map((serviceId) => {
              const service = servicesMap?.get(serviceId);
              return (
                <Badge key={serviceId} variant="secondary" className="text-xs">
                  {service?.name || `Service ${serviceId}`}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
  },
  {
    id: "locationsText",
    headerName: "Locations",
    field: "locationsText",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 220,
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
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1 ">
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
          <div className="text-sm/6 tracking-wide font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1 ">
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
      flex: 3,
      minWidth: 200,
      editable: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 5000,
        rows: 8,
        cols: 50,
      },
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="text-sm/6 tracking-wide font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1 ">
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
];

export default function Deals() {
  usePageTitle("Deals");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch users for the Owner dropdown
  const { data: users = [] } = useQuery<
    Array<Pick<UserType, "id" | "firstName" | "lastName">>
  >({
    queryKey: ["/api/users"],
  });

  // Fetch deal services for the Services column and filter
  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  // Create a services lookup map
  const servicesMap = new Map(dealServices.map((s) => [s.id, s]));

  // Fetch industries for the Industry column and filter
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Create industries lookup map
  const industriesMap = new Map(industries.map((i) => [i.id, i]));

  // Context for the grid - provides user list for Owner dropdown, services, and industries
  const gridContext: DealsGridContext = {
    users,
    services: dealServices,
    servicesMap,
    industries,
    industriesMap,
  };

  // Mobile column configuration: explicit ColDef overrides per column
  const mobileColumnConfig: Record<string, {
    pinned?: "left" | "right" | boolean;
    lockPinned?: boolean;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    flex?: number;
    headerName?: string;
    editable?: boolean;
  }> = {
    displayName: {
      flex: 1,
      resizable: false,
      editable: false,
      minWidth: 180,
      pinned: false,
      lockPinned: false,
    },
    owner: {
      flex: 0,
      width: 60,
      resizable: false,
      headerName: "",
      editable: false,
    },
    status: {
      flex: 0,
      width: 50,
      resizable: false,
      headerName: "",
      editable: false,
    },
  };

  // On mobile, show only essential columns with explicit config
  const responsiveColumns = useMemo(() => {
    if (!isMobile) return dealColumns;
    
    const mobileColumnIds = Object.keys(mobileColumnConfig);
    
    return dealColumns
      .filter((col) => mobileColumnIds.includes(col.id))
      .map((col) => {
        const { pinned, lockPinned, width, minWidth, maxWidth, resizable, flex, ...restColDef } = col.colDef || {};
        const mobileConfig = mobileColumnConfig[col.id] || {};
        return {
          ...col,
          colDef: {
            ...restColDef,
            ...mobileConfig,
          },
        };
      });
  }, [isMobile]);

  // Mutation to update a single deal field with optimistic updates
  const updateDealMutation = useMutation({
    mutationFn: async ({
      dealId,
      updates,
    }: {
      dealId: string;
      updates: Record<string, unknown>;
    }) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, updates);
    },
    onMutate: async ({ dealId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/deals"] });

      // Snapshot the previous value
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>([
        "/api/deals",
      ]);

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
  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<DealWithRelations>) => {
      const { data, colDef, newValue, oldValue } = event;
      console.log("[DealsGrid] onCellValueChanged:", {
        field: colDef.field,
        newValue,
        oldValue,
        dataId: data?.id,
      });
      if (!data?.id || !colDef.field) return;

      const field = colDef.field as string;
      let processedValue: unknown = newValue;

      // For serviceIds (array), check if values actually changed
      if (field === "serviceIds") {
        const oldIds = (oldValue as number[] | null) || [];
        const newIds = (newValue as number[] | null) || [];
        // Check if arrays are equal
        if (
          oldIds.length === newIds.length &&
          oldIds.every((id, i) => id === newIds[i])
        ) {
          return; // No change
        }
        processedValue = newIds;
      } else {
        // For non-array fields, check equality normally
        if (newValue === oldValue) return;
      }

      // Handle owner field - valueSetter already updated data.ownerId, so use that
      if (field === "ownerId") {
        processedValue = data.ownerId;
        if (processedValue === "") {
          processedValue = null;
        }
      }

      // Handle industry field - valueSetter already updated data.industryId, so use that
      if (field === "industryId") {
        processedValue = data.industryId;
        if (processedValue === "") {
          processedValue = null;
        }
      }

      // Handle empty strings as null for date fields
      const dateFields = [
        "startedOn",
        "wonOn",
        "lastContactOn",
        "proposalSentOn",
        "projectDate",
      ];
      if (dateFields.includes(field)) {
        processedValue = newValue === "" ? null : newValue;
      }

      // Handle empty strings as null for nullable ID fields (foreign keys)
      const nullableIdFields = ["clientId", "industryId"];
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
    },
    [updateDealMutation],
  );

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
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>([
        "/api/deals",
      ]);

      // Optimistically update cache to match the new order
      if (previousDeals) {
        const dealMap = new Map(previousDeals.map((d) => [d.id, d]));
        const reorderedDeals = dealIds
          .map((id) => dealMap.get(id))
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
        columns={responsiveColumns}
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
        enableRowDrag={!isMobile}
        onRowDragEnd={handleRowDragEnd}
        onCellValueChanged={handleCellValueChanged}
        hideColumnSelector={isMobile}
        enableCellSelection={!isMobile}
        onRowClick={isMobile ? (deal) => setLocation(`/deals/${deal.id}`) : undefined}
      />
    </PageLayout>
  );
}
