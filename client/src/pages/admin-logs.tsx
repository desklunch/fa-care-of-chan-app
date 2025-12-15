import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Activity,
  User,
  Mail,
  FileEdit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import type { AuditLog } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

type AuditLogWithName = AuditLog & { performerName?: string };

interface PaginatedResponse {
  logs: AuditLogWithName[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const actionIcons: Record<string, typeof Activity> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  email_sent: Mail,
  invite_used: CheckCircle,
};

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 dark:text-green-400",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  login: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  logout: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  email_sent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  invite_used: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const entityLabels: Record<string, string> = {
  user: "User",
  invite: "Invite",
  session: "Session",
};

function ActionCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  const Icon = actionIcons[value] || Activity;
  const colorClass = actionColors[value] || "bg-muted text-muted-foreground";
  
  return (
    <span className={`${colorClass} capitalize font-medium text-xs`}>
      {value.replace("_", " ")}
    </span>
  );
}

function EntityTypeCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  return (
    <span  className="capitalize text-xs">
      {entityLabels[value] || value}
    </span>
  );
}

function StatusCellRenderer({ value }: ICellRendererParams<AuditLogWithName, string>) {
  if (!value) return null;
  
  const isSuccess = value === "success";
  const Icon = isSuccess ? CheckCircle : XCircle;
  
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

function ChangesCellRenderer({ value }: ICellRendererParams<AuditLogWithName, unknown>) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  
  const changes = value as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  const changedKeys = Object.keys(changes.after || changes.before || {});
  
  if (changedKeys.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  return (
    <span className="text-sm text-muted-foreground">
      {changedKeys.slice(0, 3).join(", ")}
      {changedKeys.length > 3 && ` +${changedKeys.length - 3} more`}
    </span>
  );
}

const auditLogColumns: ColumnConfig<AuditLogWithName>[] = [
  {
    id: "performedAt",
    headerName: "Timestamp",
    field: "performedAt",
    category: "Time",
    colDef: {
      flex:1,
      minWidth: 150,
      cellRenderer: DateCellRenderer,
      sort: "desc",
    },
  },
  {
    id: "performerName",
    headerName: "User",
    category: "User",
    colDef: {
      flex:1,
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
      flex:1,
      minWidth: 150,
      cellRenderer: ActionCellRenderer,
    },
  },
  {
    id: "entityType",
    headerName: "Entity",
    field: "entityType",
    category: "Activity",
    colDef: {
      flex:1,
      minWidth: 100,
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
      flex:1,
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
      flex:1,
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
      minWidth: 150,
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
      flex:1,
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

export default function AdminLogs() {
  usePageTitle("Activity Logs");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("pageSize", pageSize.toString());
  if (entityTypeFilter !== "all") {
    queryParams.set("entityType", entityTypeFilter);
  }
  if (actionFilter !== "all") {
    queryParams.set("action", actionFilter);
  }

  const { data, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ["/api/admin/logs", page, pageSize, entityTypeFilter, actionFilter],
    queryFn: async () => {
      const response = await fetch(`/api/admin/logs?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      setLocation("/");
    }
  }, [error, setLocation]);

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

  const FilterBar = (
    <div className="flex items-center gap-3">
      <Select
        value={entityTypeFilter}
        onValueChange={(value) => {
          setEntityTypeFilter(value);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[140px]" data-testid="select-entity-type">
          <SelectValue placeholder="Entity Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="invite">Invite</SelectItem>
          <SelectItem value="session">Session</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={actionFilter}
        onValueChange={(value) => {
          setActionFilter(value);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[140px]" data-testid="select-action">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
          <SelectItem value="login">Login</SelectItem>
          <SelectItem value="logout">Logout</SelectItem>
          <SelectItem value="email_sent">Email Sent</SelectItem>
          <SelectItem value="invite_used">Invite Used</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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
        externalData={data?.logs || []}
        externalLoading={isLoading}
        emptyMessage="No audit logs found"
        emptyDescription="Activity will appear here as users interact with the system"
        headerContent={FilterBar}
        getRowId={(log) => log.id}
        pagination={data ? {
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
          onPageChange: setPage,
        } : undefined}
      />
    </PageLayout>
  );
}
