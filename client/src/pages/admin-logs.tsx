import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Activity,
  User,
  FileEdit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Layers,
  Zap,
} from "lucide-react";
import { DataGridPage } from "@/components/data-grid";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import type { AuditLog, User as UserType } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

type AuditLogWithName = AuditLog & { performerName?: string };

const actionIcons: Record<string, typeof Activity> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
};

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 dark:text-green-400",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  login: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  email_sent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  invite_used: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  link_feature: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  unlink_feature: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  link_issue: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  unlink_issue: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  add_change: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  remove_change: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  add_venue: "bg-green-500/10 text-green-600 dark:text-green-400",
  remove_venue: "bg-red-500/10 text-red-600 dark:text-red-400",
  reorder: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  upload: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function ActionCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  const colorClass = actionColors[value] || "bg-muted text-muted-foreground";
  
  return (
    <span className={`${colorClass} capitalize font-medium text-xs`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

function EntityTypeCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  return (
    <span className="capitalize text-xs">
      {value.replace(/_/g, " ")}
    </span>
  );
}

function StatusCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  const isSuccess = value === "success";
  
  return (
    <span className={`flex h-full items-center gap-1 font-medium text-xs ${isSuccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      <span className="capitalize">{value}</span>
    </span>
  );
}

function PerformerCellRenderer({ data }: ICellRendererParams<AuditLogWithName>) {
  if (!data) return null;
  
  return (
    <span className="flex items-center gap-2">
      <span>{data.performerName || "System"}</span>
    </span>
  );
}

function TimestampCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string | Date>) {
  if (!value) return null;
  
  const date = typeof value === "string" ? new Date(value) : value;
  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
  
  return (
    <span className="text-xs text-muted-foreground">
      {formatted} EST
    </span>
  );
}

function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function ChangesCellRenderer({ value }: ICellRendererParams<AuditLogWithName, unknown>) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  
  const changes = value as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  const beforeKeys = Object.keys(changes.before || {});
  const afterKeys = Object.keys(changes.after || {});
  const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));
  
  if (allKeys.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  return (
    <div className="text-xs space-y-1 py-1">
      {allKeys.slice(0, 4).map((key) => {
        const before = changes.before?.[key];
        const after = changes.after?.[key];
        const hasBefore = changes.before && key in changes.before;
        const hasAfter = changes.after && key in changes.after;
        
        return (
          <div key={key} className="flex flex-wrap gap-1">
            <span className="font-medium text-foreground">{key}:</span>
            {hasBefore && hasAfter ? (
              <>
                <span className="text-red-500 line-through truncate max-w-[100px]" title={formatJsonValue(before)}>
                  {formatJsonValue(before)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-green-600 dark:text-green-400 truncate max-w-[100px]" title={formatJsonValue(after)}>
                  {formatJsonValue(after)}
                </span>
              </>
            ) : hasAfter ? (
              <span className="text-green-600 dark:text-green-400 truncate max-w-[150px]" title={formatJsonValue(after)}>
                {formatJsonValue(after)}
              </span>
            ) : hasBefore ? (
              <span className="text-red-500 truncate max-w-[150px]" title={formatJsonValue(before)}>
                {formatJsonValue(before)}
              </span>
            ) : null}
          </div>
        );
      })}
      {allKeys.length > 4 && (
        <span className="text-muted-foreground">+{allKeys.length - 4} more fields</span>
      )}
    </div>
  );
}

const auditLogColumns: ColumnConfig<AuditLogWithName>[] = [
  {
    id: "performedAt",
    headerName: "Timestamp",
    field: "performedAt",
    category: "Time",
    colDef: {
      flex: 1,
      minWidth: 180,
      cellRenderer: TimestampCellRenderer,
      sort: "desc",
    },
  },
  {
    id: "performerName",
    headerName: "User",
    category: "User",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: PerformerCellRenderer,
    },
  },
  {
    id: "action",
    headerName: "Action",
    field: "action",
    category: "Activity",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: ActionCellRenderer,
    },
  },
  {
    id: "entityType",
    headerName: "Entity",
    field: "entityType",
    category: "Activity",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: EntityTypeCellRenderer,
    },
  },
  {
    id: "entityId",
    headerName: "Entity ID",
    field: "entityId",
    category: "Activity",
    toggleable: true,
    colDef: {
      flex: 1,
      width: 280,
      cellRenderer: ({ value }: ICellRendererParams<AuditLogWithName, string>) => (
        <span className="font-mono text-xs text-muted-foreground">
          {value || "-"}
        </span>
      ),
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Activity",
    colDef: {
      flex: 1,
      minWidth: 100,
      cellRenderer: StatusCellRenderer,
    },
  },
  {
    id: "changes",
    headerName: "Changes",
    field: "changes",
    category: "Details",
    toggleable: true,
    colDef: {
      flex: 2,
      minWidth: 250,
      autoHeight: true,
      cellRenderer: ChangesCellRenderer,
    },
  },
  {
    id: "ipAddress",
    headerName: "IP Address",
    field: "ipAddress",
    category: "Details",
    toggleable: true,
    colDef: {
      flex: 1,
      width: 140,
      cellRenderer: ({ value }: ICellRendererParams<AuditLogWithName, string>) => (
        <span className="font-mono text-xs">
          {value || "-"}
        </span>
      ),
    },
  },
];

const defaultVisibleColumns = ["performedAt", "performerName", "action", "entityType", "status", "changes"];

const ENTITY_TYPES = [
  { id: "user", label: "User" },
  { id: "invite", label: "Invite" },
  { id: "session", label: "Session" },
  { id: "venue", label: "Venue" },
  { id: "venue_collection", label: "Venue Collection" },
  { id: "venue_photo", label: "Venue Photo" },
  { id: "venue_file", label: "Venue File" },
  { id: "floorplan", label: "Floorplan" },
  { id: "contact", label: "Contact" },
  { id: "vendor", label: "Vendor" },
  { id: "vendor_service", label: "Vendor Service" },
  { id: "deal", label: "Deal" },
  { id: "deal_task", label: "Deal Task" },
  { id: "deal_service", label: "Deal Service" },
  { id: "comment", label: "Comment" },
  { id: "feature", label: "Feature" },
  { id: "release", label: "Release" },
  { id: "category", label: "Category" },
  { id: "amenity", label: "Amenity" },
  { id: "industry", label: "Industry" },
  { id: "tag", label: "Tag" },
];

const ACTIONS = [
  { id: "create", label: "Create" },
  { id: "update", label: "Update" },
  { id: "delete", label: "Delete" },
  { id: "login", label: "Login" },
  { id: "logout", label: "Logout" },
  { id: "email_sent", label: "Email Sent" },
  { id: "invite_used", label: "Invite Used" },
  { id: "upload", label: "Upload" },
  { id: "add_venue", label: "Add Venue" },
  { id: "remove_venue", label: "Remove Venue" },
  { id: "reorder", label: "Reorder" },
  { id: "link_feature", label: "Link Feature" },
  { id: "unlink_feature", label: "Unlink Feature" },
  { id: "link_issue", label: "Link Issue" },
  { id: "unlink_issue", label: "Unlink Issue" },
  { id: "add_change", label: "Add Change" },
  { id: "remove_change", label: "Remove Change" },
];

export default function AdminLogs() {
  usePageTitle("Activity Logs");
  const { user } = useAuth();
  const [, setLocation] = useProtectedLocation();

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { error } = useQuery<AuditLogWithName[]>({
    queryKey: ["/api/admin/logs"],
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      setLocation("/");
    }
  }, [error, setLocation]);

  const filters: FilterConfig<AuditLogWithName>[] = useMemo(() => [
    {
      id: "entityType",
      label: "Entity Types",
      icon: Layers,
      placeholder: "Filter by entity type",
      optionSource: {
        type: "static",
        options: ENTITY_TYPES,
      },
      matchFn: (item, selectedValues) => selectedValues.includes(item.entityType),
    },
    {
      id: "action",
      label: "Actions",
      icon: Zap,
      placeholder: "Filter by action",
      optionSource: {
        type: "static",
        options: ACTIONS,
      },
      matchFn: (item, selectedValues) => selectedValues.includes(item.action),
    },
    {
      id: "user",
      label: "Users",
      icon: User,
      placeholder: "Filter by user",
      optionSource: {
        type: "static",
        options: users.map((u) => ({ id: u.id, label: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email || "Unknown") })),
      },
      matchFn: (item, selectedValues) => item.performedBy ? selectedValues.includes(item.performedBy) : false,
    },
  ], [users]);

  const searchInChanges = (item: AuditLogWithName): string => {
    if (!item.changes) return "";
    return JSON.stringify(item.changes);
  };

  if (user?.role !== "admin") {
    return (
      <PageLayout breadcrumbs={[{ label: "Audit Logs" }]}>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Admin" },
        { label: "Audit Logs" },
      ]}
    >
      <DataGridPage
        queryKey="/api/admin/logs"
        columns={auditLogColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        emptyMessage="No audit logs found"
        emptyDescription="Activity will appear here as users interact with the system"
        getRowId={(log: AuditLogWithName) => log.id}
        filters={filters}
        collapsibleFilters={true}
        searchFields={["entityId", searchInChanges]}
        searchPlaceholder="Search entity ID or changes..."
      />
    </PageLayout>
  );
}
