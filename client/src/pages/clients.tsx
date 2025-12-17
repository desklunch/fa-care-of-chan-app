import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Client } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "industry", "website", "createdAt"];

const clientColumns: ColumnConfig<Client>[] = [
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
    id: "name",
    headerName: "Name",
    field: "name",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
    },
  },
  {
    id: "industry",
    headerName: "Industry",
    field: "industry",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "website",
    headerName: "Website",
    field: "website",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 180,
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

export default function Clients() {
  usePageTitle("Clients");
  const [, setLocation] = useLocation();

  return (
    <PageLayout
      breadcrumbs={[{ label: "Clients" }]}
      primaryAction={{
        label: "New Client",
        href: "/clients/new",
        icon: CircleFadingPlus,
      }}
    >
      <DataGridPage
        queryKey="/api/clients"
        columns={clientColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={["name", "industry", "website"]}
        searchPlaceholder="Search clients..."
        onRowClick={(client) => setLocation(`/clients/${client.id}`)}
        getRowId={(client) => client.id || ""}
        emptyMessage="No clients found"
        emptyDescription="Start building your client directory by adding a client."
      />
    </PageLayout>
  );
}
