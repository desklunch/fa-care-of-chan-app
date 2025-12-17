import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import type { DealWithRelations } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["dealNumber", "displayName", "client", "status", "createdBy", "createdAt"];

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
      valueFormatter: (params: { value: number }) => {
        return params.value ? `#${params.value}` : "";
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
    },
  },
  {
    id: "client",
    headerName: "Client",
    field: "client",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      valueGetter: (params: { data: DealWithRelations }) => {
        return params.data?.client?.name || "";
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
