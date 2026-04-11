import { useCallback, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { NewDealDialog } from "@/components/new-deal-dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CellValueChangedEvent } from "ag-grid-community";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import type {
  DealWithRelations,
  DealService,
  DealLocation,
  DealEvent,
  User as UserType,
} from "@shared/schema";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { formatDateOnly, parseDateOnly } from "@/lib/date";
import { getEventSummary } from "@/components/event-schedule";
import {
  CircleFadingPlus,
  Flag,
  User,
  MapPin,
  MapPinned as MapIcon,
  MapPinned,
  Briefcase,
  SquareArrowOutUpRight,
  Calendar,
  Tag,
  Zap,
} from "lucide-react";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServicesCellEditor } from "@/components/ag-grid/services-cell-editor";
import { LocationsCellEditor } from "@/components/ag-grid/locations-cell-editor";
import StatusCellEditor from "@/components/ag-grid/status-cell-editor";
import RichTextCellEditor from "@/components/ag-grid/richtext-cell-editor";
import EventScheduleCellEditor from "@/components/ag-grid/event-schedule-cell-editor";
import { normalizeToMarkdown } from "@/lib/markdown-utils";
import { MarkdownDisplay } from "@/components/markdown-display";
import type { DealStatusRecord } from "@shared/schema";

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
export interface DealLinkedClientEntry {
  dealId: string;
  clientId: string;
  clientName: string;
  label: string | null;
}

export interface DealTagEntry {
  dealId: string;
  tagId: string;
  tagName: string;
}

export interface DealsGridContext {
  users: Array<
    Pick<UserType, "id" | "firstName" | "lastName" | "role" | "isActive">
  >;
  services: DealService[];
  servicesMap: Map<number, DealService>;
  linkedClientsMap: Map<string, DealLinkedClientEntry[]>;
  dealTagsMap: Map<string, DealTagEntry[]>;
  dealStatuses: DealStatusRecord[];
  onUpdateDeal?: (dealId: string, updates: Record<string, unknown>) => void;
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

export const DEFAULT_VISIBLE_COLUMNS = [
  "displayName",
  "owner",
  "status",
  "projectDate",
  "client",

  "lastContactOn",
  "dealAge",
  "concept",
  "primaryContact",
  "services",
  "locations",
  "locationsText",

  "nextSteps",
  "budgetLow",
  "budgetHigh",
  "budgetNotes",
];

function createStatusComparator(sortOrderByName: Map<string, number>) {
  return (
    valueA: unknown,
    valueB: unknown,
    nodeA: { data: DealWithRelations | undefined },
    nodeB: { data: DealWithRelations | undefined },
    isDescending: boolean,
  ): number => {
    const statusA = nodeA.data?.statusName;
    const statusB = nodeB.data?.statusName;

    const priorityA = statusA ? (sortOrderByName.get(statusA) ?? 999) : 999;
    const priorityB = statusB ? (sortOrderByName.get(statusB) ?? 999) : 999;

    return priorityA - priorityB;
  };
}

export { createStatusComparator };

export const dealFilters: FilterConfig<DealWithRelations>[] = [
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
      type: "deriveFromData",
      deriveOptions: (data) => {
        const seen = new Map<string, string>();
        data.forEach((deal) => {
          const name = deal.statusName || String(deal.status);
          if (!seen.has(name)) {
            seen.set(name, name);
          }
        });
        return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
      },
    },
    matchFn: (deal, selectedValues) =>
      selectedValues.includes(deal.statusName || String(deal.status)),
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
    id: "tags",
    label: "Tags",
    icon: Tag,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (_data, context) => {
        const ctx = context as DealsGridContext | undefined;
        if (!ctx?.dealTagsMap) return [];
        const tagMap = new Map<string, string>();
        ctx.dealTagsMap.forEach((entries) => {
          entries.forEach((entry) => {
            if (!tagMap.has(entry.tagId)) {
              tagMap.set(entry.tagId, entry.tagName);
            }
          });
        });
        return Array.from(tagMap.entries())
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
      },
    },
    matchFn: (deal, selectedValues, context) => {
      const ctx = context as DealsGridContext | undefined;
      if (!ctx?.dealTagsMap || !deal.id) return false;
      const dealTags = ctx.dealTagsMap.get(deal.id);
      if (!dealTags || dealTags.length === 0) return false;
      return dealTags.some((t) => selectedValues.includes(t.tagId));
    },
  },
];

export const dealColumns: ColumnConfig<DealWithRelations>[] = [
  {
    id: "displayName",
    headerName: "Deal",
    field: "displayName",
    category: "Basic Info",
    toggleable: false,
    colDef: {
      flex: 2,
      minWidth: 260,
      width: 260,
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
            <Link
              href={`/deals/${params.data.id}`}
              className="hidden md:block flex-shrink-0"
            >
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
        const users = (params.context?.users || []).filter(
          (u) => u.isActive && (u.role === "Sales" || u.role === "Sales Admin"),
        );
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
        // Find user by matching initials (only from Sales/Sales Admin roles)
        const users = (params.context?.users || []).filter(
          (u) => u.isActive && (u.role === "Sales" || u.role === "Sales Admin"),
        );
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
    field: "statusName",
    category: "Basic Info",
    colDef: {
      width: 160,
      resizable: false,
      cellDataType: false,

      editable: true,
      cellEditor: StatusCellEditor,
      cellEditorPopup: true,

      valueSetter: (params: {
        data: DealWithRelations;
        newValue: number | null;
        context: DealsGridContext;
      }) => {
        if (params.newValue == null) return false;
        const statusRecord = params.context?.dealStatuses?.find(
          (s) => s.id === params.newValue,
        );
        if (!statusRecord) return false;
        params.data.status = params.newValue;
        params.data.statusName = statusRecord.name;
        return true;
      },

      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return (
          <div className="w-full h-full flex items-start pt-[14px]">
            <DealStatusBadge status={params.value} />
          </div>
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
      cellDataType: false,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.startedOn
          ? parseDateOnly(params.data.startedOn)
          : null;
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: Date | null;
      }) => {
        if (
          params.newValue instanceof Date &&
          !isNaN(params.newValue.getTime())
        ) {
          const y = params.newValue.getFullYear();
          const m = String(params.newValue.getMonth() + 1).padStart(2, "0");
          const d = String(params.newValue.getDate()).padStart(2, "0");
          params.data.startedOn = `${y}-${m}-${d}`;
        } else {
          params.data.startedOn = null as any;
        }
        return true;
      },
      valueFormatter: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return "";
        return format(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{format(params.value, "MM/dd/yy")}</span>
          </span>
        );
      },
      comparator: createDateComparator((data) => data?.startedOn),
    },
  },
  {
    id: "dealAge",
    headerName: "Deal Age",
    field: "dealAge",
    category: "Dates",
    colDef: {
      width: 100,
      editable: false,
      valueGetter: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        const deal = params.data;
        if (!deal || !deal.startedOn) return null;

        const toStartOfDay = (dateStr: string) => {
          const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
          return new Date(y, m - 1, d);
        };

        const startDate = toStartOfDay(deal.startedOn);
        let endDate: Date | null = null;

        const statusRecord = params.context?.dealStatuses?.find(
          (s) => s.name === deal.statusName,
        );

        if (statusRecord?.isActive) {
          const now = new Date();
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (statusRecord?.name === "Closed Won") {
          if (deal.wonOn) {
            endDate = toStartOfDay(deal.wonOn);
          } else if (deal.lastContactOn) {
            endDate = toStartOfDay(deal.lastContactOn);
          }
        } else {
          if (deal.lastContactOn) {
            endDate = toStartOfDay(deal.lastContactOn);
          }
        }

        if (!endDate) return null;

        const diffMs = endDate.getTime() - startDate.getTime();
        return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      },
      valueFormatter: (params: { value: number | null }) => {
        if (params.value == null) return "";
        return `${params.value}d`;
      },
      cellRenderer: (params: { value: number | null }) => {
        if (params.value == null) return null;
        return (
          <div className="bg-primary text-primary-foreground rounded-full p-2 size-8    flex items-center justify-center text-[11px] font-semibold my-[10px] ">
            {params.value}d
          </div>
        );
      },
      comparator: (
        valueA: number | null,
        valueB: number | null,
        _nodeA: unknown,
        _nodeB: unknown,
        isDescending: boolean,
      ): number => {
        const aIsNull = valueA == null;
        const bIsNull = valueB == null;
        if (aIsNull && bIsNull) return 0;
        if (aIsNull) return isDescending ? -1 : 1;
        if (bIsNull) return isDescending ? 1 : -1;
        return valueA - valueB;
      },
    },
  },
  {
    id: "lastContactOn",
    headerName: "Last Contact",
    field: "lastContactOn",
    category: "Dates",
    colDef: {
      minWidth: 170,
      maxWidth: 200,
      cellDataType: false,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.lastContactOn
          ? parseDateOnly(params.data.lastContactOn)
          : null;
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: Date | null;
      }) => {
        if (
          params.newValue instanceof Date &&
          !isNaN(params.newValue.getTime())
        ) {
          const y = params.newValue.getFullYear();
          const m = String(params.newValue.getMonth() + 1).padStart(2, "0");
          const d = String(params.newValue.getDate()).padStart(2, "0");
          params.data.lastContactOn = `${y}-${m}-${d}`;
        } else {
          params.data.lastContactOn = null as any;
        }
        return true;
      },
      valueFormatter: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return "";
        return format(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: {
        value: Date | null;
        data: DealWithRelations;
        context: DealsGridContext;
      }) => {
        if (!params.value || !(params.value instanceof Date)) return null;
        const formattedDate = format(params.value, "MM/dd/yy");
        const statusRecord = params.context?.dealStatuses?.find(
          (s) => s.id === params.data?.status,
        );
        const isActive = statusRecord?.isActive ?? false;
        if (isActive) {
          const now = new Date();
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const diffMs = today.getTime() - params.value.getTime();
          const diffDays = Math.max(
            0,
            Math.floor(diffMs / (1000 * 60 * 60 * 24)),
          );
          const daysLabel = `${diffDays}d ago`;
          return (
            <span className="flex items-center gap-1.5 text-xs py-[16px] tracking-wide">
              <span
                className="font-semibold text-muted-foreground"
                data-testid="text-last-contact-days"
              >
                {daysLabel}
              </span>
              <span
                className="font-normal opacity-50 text-muted-foreground"
                data-testid="text-last-contact-date"
              >
                {formattedDate}
              </span>
            </span>
          );
        }
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span data-testid="text-last-contact-date">{formattedDate}</span>
          </span>
        );
      },
      comparator: createDateComparator((data) => data?.lastContactOn),
    },
  },
  {
    id: "projectDate",
    headerName: "Project Date",
    field: "projectDate",
    category: "Dates",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      editable: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorPopup: true,
      cellEditorParams: {
        maxLength: 500,
        rows: 3,
        cols: 30,
      },
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div
            className=" text-xs text-muted-foreground text-wrap py-[16px]
"
          >
            <span className="leading-[18px]">{params.value}</span>
          </div>
        );
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
          <div className="flex flex-col justify-center min-w-0 py-[16px]">
            <Link
              href={`/clients/${client.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="text-foreground hover:underline truncate p-0 h-auto leading-normal"
              data-testid={`link-client-${client.id}`}
            >
              {client.name}
            </Link>
            {client.industryName && (
              <span
                className="text-xs text-muted-foreground truncate"
                data-testid={`text-client-industry-${client.id}`}
              >
                {client.industryName}
              </span>
            )}
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
    id: "proposalSentOn",
    headerName: "Proposal Sent",
    field: "proposalSentOn",
    category: "Dates",
    colDef: {
      minWidth: 130,
      maxWidth: 130,
      cellDataType: false,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.proposalSentOn
          ? parseDateOnly(params.data.proposalSentOn)
          : null;
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: Date | null;
      }) => {
        if (
          params.newValue instanceof Date &&
          !isNaN(params.newValue.getTime())
        ) {
          const y = params.newValue.getFullYear();
          const m = String(params.newValue.getMonth() + 1).padStart(2, "0");
          const d = String(params.newValue.getDate()).padStart(2, "0");
          params.data.proposalSentOn = `${y}-${m}-${d}`;
        } else {
          params.data.proposalSentOn = null as any;
        }
        return true;
      },
      valueFormatter: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return "";
        return format(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{format(params.value, "MM/dd/yy")}</span>
          </span>
        );
      },
      comparator: createDateComparator((data) => data?.proposalSentOn),
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
      cellDataType: false,
      editable: true,
      cellEditor: "agDateCellEditor",
      cellEditorPopup: true,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.wonOn ? parseDateOnly(params.data.wonOn) : null;
      },
      valueSetter: (params: {
        data: DealWithRelations;
        newValue: Date | null;
      }) => {
        if (
          params.newValue instanceof Date &&
          !isNaN(params.newValue.getTime())
        ) {
          const y = params.newValue.getFullYear();
          const m = String(params.newValue.getMonth() + 1).padStart(2, "0");
          const d = String(params.newValue.getDate()).padStart(2, "0");
          params.data.wonOn = `${y}-${m}-${d}`;
        } else {
          params.data.wonOn = null as any;
        }
        return true;
      },
      valueFormatter: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return "";
        return format(params.value, "MM/dd/yy");
      },
      cellRenderer: (params: { value: Date | null }) => {
        if (!params.value || !(params.value instanceof Date)) return null;
        return (
          <span className="flex items-center gap-1.5 text-xs py-[16px] text-muted-foreground tracking-wide">
            <span>{format(params.value, "MM/dd/yy")}</span>
          </span>
        );
      },
      comparator: createDateComparator((data) => data?.wonOn),
    },
  },

  {
    id: "concept",
    headerName: "Concept & Context",
    field: "concept",
    category: "Basic Info",
    colDef: {
      flex: 3,
      minWidth: 300,
      cellDataType: false,
      editable: true,
      sortable: false,
      cellEditor: RichTextCellEditor,
      cellEditorPopup: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="richtext-cell-content max-h-[105px] overflow-hidden">
            <MarkdownDisplay className="prose dark:prose-invert text-sm/6  font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-[0.5em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {normalizeToMarkdown(params.value)}
            </MarkdownDisplay>
          </div>
        );
      },
    },
  },

  {
    id: "services",
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
    id: "locations",
    headerName: "Locations",
    field: "locations",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      wrapText: true,
      autoHeight: true,
      editable: true,
      cellEditor: LocationsCellEditor,
      cellEditorPopup: true,
      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        return (params.data?.locations as DealLocation[] | null) || [];
      },
      valueSetter: (params: { data: DealWithRelations; newValue: DealLocation[] }) => {
        params.data.locations = params.newValue;
        return true;
      },
      getQuickFilterText: (params: { data: DealWithRelations | undefined }) => {
        const locations = params.data?.locations as DealLocation[] | null;
        if (!locations || locations.length === 0) return "";
        return locations.map((l) => l.displayName).join(", ");
      },
      cellRenderer: (params: { value: DealLocation[] | null; data: DealWithRelations | undefined }) => {
        const locations = params.value as DealLocation[] | null;
        if (!locations || locations.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 py-2.5">
            {locations.map((loc) => {
              const isCity = Boolean(loc.city);
              const isState = !loc.city && Boolean(loc.state);
              const Icon = isCity ? MapPin : isState ? MapIcon : MapPinned;
              return (
                <Badge
                  key={loc.placeId}
                  variant="secondary"
                  className="text-xs px-1 gap-1"
                >
                  {loc.displayName}
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
    headerName: "Location Notes",
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
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[14px] [&>*]:my-[0.625em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
    id: "nextSteps",
    headerName: "Next Steps",
    field: "nextSteps",
    category: "Basic Info",
    colDef: {
      flex: 3,
      minWidth: 300,
      cellDataType: false,
      sortable: false,
      editable: true,
      cellEditor: RichTextCellEditor,
      cellEditorPopup: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="richtext-cell-content max-h-[120px] overflow-hidden">
            <MarkdownDisplay className="prose dark:prose-invert text-sm/6 tracking-wide font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-[0.625em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {normalizeToMarkdown(params.value)}
            </MarkdownDisplay>
          </div>
        );
      },
    },
  },
  {
    id: "budgetLow",
    headerName: "Budget Low",
    field: "budgetLow",
    category: "Budget",
    colDef: {
      width: 140,
      editable: true,
      cellDataType: "number",
      cellEditor: "agNumberCellEditor",
      cellEditorParams: {
        min: 0,
        precision: 0,
      },
      valueFormatter: (params: { value: number | null }) => {
        if (params.value == null) return "";
        return `$${params.value.toLocaleString()}`;
      },
    },
  },
  {
    id: "budgetHigh",
    headerName: "Budget High",
    field: "budgetHigh",
    category: "Budget",
    colDef: {
      width: 140,
      editable: true,
      cellDataType: "number",
      cellEditor: "agNumberCellEditor",
      cellEditorParams: {
        min: 0,
        precision: 0,
      },
      valueFormatter: (params: { value: number | null }) => {
        if (params.value == null) return "";
        return `$${params.value.toLocaleString()}`;
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
          <div className="prose dark:prose-invert text-sm/6 tracking-wide font-light text-foreground/80 max-w-none py-3 pt-[14px] [&>*]:my-[0.625em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
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
    id: "linkedClients",
    headerName: "Linked Clients",
    field: "id",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      sortable: false,
      valueGetter: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        if (!params.data?.id) return "";
        const linked =
          params.context?.linkedClientsMap?.get(params.data.id) || [];
        return linked
          .map((lc) =>
            lc.label ? `${lc.clientName} (${lc.label})` : lc.clientName,
          )
          .join(", ");
      },
      cellRenderer: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        if (!params.data?.id) return null;
        const linked =
          params.context?.linkedClientsMap?.get(params.data.id) || [];
        if (linked.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 py-1">
            {linked.map((lc) => (
              <Badge
                key={lc.clientId}
                variant="secondary"
                className="text-xs gap-1 no-default-hover-elevate no-default-active-elevate"
                data-testid={`badge-linked-client-${lc.clientId}`}
              >
                {lc.clientName}
                {lc.label && (
                  <span className="text-muted-foreground">({lc.label})</span>
                )}
              </Badge>
            ))}
          </div>
        );
      },
    },
  },
  {
    id: "tags",
    headerName: "Tags",
    field: "id",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 180,
      sortable: false,
      valueGetter: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        if (!params.data?.id) return "";
        const tags = params.context?.dealTagsMap?.get(params.data.id) || [];
        return tags.map((t) => t.tagName).join(", ");
      },
      cellRenderer: (params: {
        data: DealWithRelations | undefined;
        context: DealsGridContext;
      }) => {
        if (!params.data?.id) return null;
        const tags = params.context?.dealTagsMap?.get(params.data.id) || [];
        if (tags.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1 py-1">
            {tags.map((t) => (
              <Badge
                key={t.tagId}
                variant="secondary"
                className="text-xs no-default-hover-elevate no-default-active-elevate"
                data-testid={`badge-tag-${t.tagId}`}
              >
                {t.tagName}
              </Badge>
            ))}
          </div>
        );
      },
    },
  },
];

export default function DealsPage() {
  usePageTitle("Deals");
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canRead = can("deals.read");
  const canWrite = can("deals.write");

  const [newDealDialogOpen, setNewDealDialogOpen] = useState(false);
  const { statuses: dealStatusList } = useDealStatuses();
  const statusSortOrderByName = useMemo(() => {
    return new Map(dealStatusList.map((s) => [s.name, s.sortOrder]));
  }, [dealStatusList]);

  // Fetch users for the Owner dropdown
  const { data: users = [] } = useQuery<
    Array<Pick<UserType, "id" | "firstName" | "lastName" | "role" | "isActive">>
  >({
    queryKey: ["/api/users"],
  });

  // Fetch deal services for the Services column and filter
  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  // Create a services lookup map
  const servicesMap = new Map(dealServices.map((s) => [s.id, s]));

  const { data: allLinkedClients = [] } = useQuery<DealLinkedClientEntry[]>({
    queryKey: ["/api/deals/all-linked-clients"],
  });

  const linkedClientsMap = useMemo(() => {
    const map = new Map<string, DealLinkedClientEntry[]>();
    for (const entry of allLinkedClients) {
      const existing = map.get(entry.dealId) || [];
      existing.push(entry);
      map.set(entry.dealId, existing);
    }
    return map;
  }, [allLinkedClients]);

  const { data: allDealTags = [] } = useQuery<DealTagEntry[]>({
    queryKey: ["/api/deals/all-deal-tags"],
  });

  const dealTagsMap = useMemo(() => {
    const map = new Map<string, DealTagEntry[]>();
    for (const entry of allDealTags) {
      const existing = map.get(entry.dealId) || [];
      existing.push(entry);
      map.set(entry.dealId, existing);
    }
    return map;
  }, [allDealTags]);

  // Mobile column configuration: explicit ColDef overrides per column
  const mobileColumnConfig: Record<
    string,
    {
      pinned?: "left" | "right" | boolean;
      lockPinned?: boolean;
      width?: number;
      minWidth?: number;
      maxWidth?: number;
      resizable?: boolean;
      flex?: number;
      headerName?: string;
      editable?: boolean;
    }
  > = {
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

  const columnsWithStatusSort = useMemo(() => {
    const comparator = createStatusComparator(statusSortOrderByName);
    return dealColumns.map((col) =>
      col.id === "status"
        ? { ...col, colDef: { ...col.colDef, comparator } }
        : col,
    );
  }, [statusSortOrderByName]);

  const responsiveColumns = useMemo(() => {
    if (!isMobile) return columnsWithStatusSort;

    const mobileColumnIds = Object.keys(mobileColumnConfig);

    return columnsWithStatusSort
      .filter((col) => mobileColumnIds.includes(col.id))
      .map((col) => {
        const {
          pinned,
          lockPinned,
          width,
          minWidth,
          maxWidth,
          resizable,
          flex,
          ...restColDef
        } = col.colDef || {};
        const mobileConfig = mobileColumnConfig[col.id] || {};
        return {
          ...col,
          colDef: {
            ...restColDef,
            ...mobileConfig,
          },
        };
      });
  }, [isMobile, columnsWithStatusSort]);

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

  const handleDirectDealUpdate = useCallback(
    (dealId: string, updates: Record<string, unknown>) => {
      updateDealMutation.mutate({ dealId, updates });
    },
    [updateDealMutation],
  );

  const gridContext: DealsGridContext = {
    users,
    services: dealServices,
    servicesMap,
    linkedClientsMap,
    dealTagsMap,
    dealStatuses: dealStatusList,
    onUpdateDeal: handleDirectDealUpdate,
  };

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
        if (
          oldIds.length === newIds.length &&
          oldIds.every((id, i) => id === newIds[i])
        ) {
          return;
        }
        processedValue = newIds;
      } else if (field === "locations") {
        const oldLocs = (oldValue as DealLocation[] | null) || [];
        const newLocs = (newValue as DealLocation[] | null) || [];
        if (
          oldLocs.length === newLocs.length &&
          oldLocs.every((loc, i) => loc.placeId === newLocs[i]?.placeId)
        ) {
          return;
        }
        processedValue = newLocs;
      } else if (field === "eventSchedule") {
        return;
      } else {
        if (newValue === oldValue) return;
      }

      if (field === "statusName") {
        const statusId =
          typeof data.status === "number"
            ? data.status
            : parseInt(String(data.status), 10);
        if (!isNaN(statusId)) {
          const updates: Record<string, unknown> = { status: statusId };
          updateDealMutation.mutate({ dealId: data.id, updates });
        }
        return;
      }

      // Handle owner field - valueSetter already updated data.ownerId, so use that
      if (field === "ownerId") {
        processedValue = data.ownerId;
        if (processedValue === "") {
          processedValue = null;
        }
      }

      const dateFields = [
        "startedOn",
        "wonOn",
        "lastContactOn",
        "proposalSentOn",
        "projectDate",
      ];
      if (dateFields.includes(field)) {
        processedValue = (data as any)[field] || null;
      }

      // Handle empty strings as null for nullable ID fields (foreign keys)
      const nullableIdFields = ["clientId"];
      if (nullableIdFields.includes(field) && newValue === "") {
        processedValue = null;
      }

      // Handle empty strings as null for nullable text fields
      const nullableTextFields = [
        "concept",
        "notes",
        "nextSteps",
        "budgetNotes",
      ];
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

  if (!canRead) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals" }]}>
        <NoPermissionMessage title="Permission Required" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "Deals" }]}
      primaryAction={canWrite ? {
        label: "New Deal",
        icon: CircleFadingPlus,
        href: "/deals/new",
      } : undefined}
      additionalActions={canWrite ? [
        {
          label: "Quick Create",
          icon: Zap,
          variant: "outline",
          onClick: () => setNewDealDialogOpen(true),
        },
      ] : undefined}
    >
      <NewDealDialog
        open={newDealDialogOpen}
        onOpenChange={setNewDealDialogOpen}
        onCreatedAndEdit={(dealId) => setLocation(`/deals/${dealId}/edit`)}
      />
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
          (deal) => {
            const contact = deal.primaryContact;
            if (!contact) return "";
            return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          },
          (deal) => (deal.concept as string) || "",
          (deal) => (deal.nextSteps as string) || "",
          (deal) => {
            const ids = deal.serviceIds as number[] | null;
            if (!ids || ids.length === 0) return "";
            return ids.map((id) => servicesMap.get(id)?.name || "").filter(Boolean).join(" ");
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
        onRowClick={
          isMobile ? (deal) => setLocation(`/deals/${deal.id}`) : undefined
        }
        headerContent={undefined}
      />
    </PageLayout>
  );
}
