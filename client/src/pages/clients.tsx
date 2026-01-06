import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import type { Client } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus, Building2 } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "industry", "website"];

const clientColumns: ColumnConfig<Client>[] = [
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

const clientFilters: FilterConfig<Client>[] = [
  {
    id: "industry",
    label: "Industry",
    icon: Building2,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const industrySet = new Set<string>();
        data.forEach((client) => {
          if (client.industry) {
            industrySet.add(client.industry);
          }
        });
        return Array.from(industrySet)
          .sort()
          .map((industry) => ({ id: industry, label: industry }));
      },
    },
    matchFn: (client, selectedValues) => {
      if (!client.industry) return false;
      return selectedValues.includes(client.industry);
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
        filters={clientFilters}
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
