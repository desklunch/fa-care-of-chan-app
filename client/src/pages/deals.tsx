import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DealWithRelations, DealStatus } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["dealNumber", "displayName", "status", "createdBy", "createdAt"];

const statusColors: Record<DealStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  "Inquiry": { variant: "outline" },
  "Discovery": { variant: "secondary" },
  "Internal Review": { variant: "secondary", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  "Contracting": { variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "Won": { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  "Lost": { variant: "destructive" },
  "Canceled": { variant: "outline", className: "opacity-50" },
  "Declined": { variant: "outline", className: "opacity-50" },
};

const dealColumns: ColumnConfig<DealWithRelations>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "Details",
    colDef: {
      width: 120,
    },
  },
  {
    id: "dealNumber",
    headerName: "#",
    field: "dealNumber",
    category: "Basic Info",
    colDef: {
      width: 80,
      cellRenderer: (params: { data: DealWithRelations }) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full">
            <span className="font-medium text-muted-foreground" data-testid={`text-deal-number-${params.data.id}`}>
              #{params.data.dealNumber}
            </span>
          </div>
        );
      },
    },
  },
  {
    id: "displayName",
    headerName: "Name",
    field: "displayName",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { data: DealWithRelations }) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center h-full">
            <span className="font-medium" data-testid={`text-deal-name-${params.data.id}`}>
              {params.data.displayName}
            </span>
          </div>
        );
      },
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Basic Info",
    colDef: {
      width: 140,
      cellRenderer: (params: { value: DealStatus }) => {
        if (!params.value) return null;
        const statusConfig = statusColors[params.value] || { variant: "outline" as const };
        return (
          <div className="flex items-center h-full">
            <Badge 
              variant={statusConfig.variant} 
              size="sm"
              className={statusConfig.className}
              data-testid={`badge-deal-status-${params.value}`}
            >
              {params.value}
            </Badge>
          </div>
        );
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
      cellRenderer: (params: { data: DealWithRelations }) => {
        const createdBy = params.data?.createdBy;
        if (!createdBy) return null;
        const fullName = [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") || "Unknown";
        const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        return (
          <div className="flex items-center gap-2 h-full">
            <Avatar className="h-6 w-6">
              <AvatarImage src={createdBy.profileImageUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-muted-foreground">{fullName}</span>
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
  {
    id: "updatedAt",
    headerName: "Updated",
    field: "updatedAt",
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
          "displayName",
          (deal) => `#${deal.dealNumber}`,
          "status",
        ]}
        searchPlaceholder="Search deals..."
        onRowClick={(deal) => setLocation(`/deals/${deal.id}`)}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals found"
        emptyDescription="Start tracking your sales pipeline by creating a deal."
      />
    </PageLayout>
  );
}
