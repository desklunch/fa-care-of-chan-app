import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import type { Client, Industry } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus, Building2 } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "industry", "website"];

// Context type for the grid
interface ClientsGridContext {
  industries: Industry[];
  industriesMap: Map<string, Industry>;
}

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
    field: "industryId",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: Client; context: ClientsGridContext }) => {
        const industryId = params.data?.industryId;
        if (!industryId) return null;
        const industry = params.context?.industriesMap?.get(industryId);
        return (
            <div className="flex flex-wrap gap-1 py-2.5">
            <Badge variant="secondary" className="text-xs">
              {industry?.name || industryId}
            </Badge>
          </div>
          
        );
      },
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
];

const clientFilters: FilterConfig<Client>[] = [
  {
    id: "industry",
    label: "Industry",
    icon: Building2,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (_data, context) => {
        const ctx = context as ClientsGridContext | undefined;
        if (!ctx?.industries) return [];
        return ctx.industries
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((industry) => ({ id: industry.id, label: industry.name }));
      },
    },
    matchFn: (client, selectedValues) => {
      if (!client.industryId) return false;
      return selectedValues.includes(client.industryId);
    },
  },
];

export default function Clients() {
  usePageTitle("Clients");
  const [, setLocation] = useProtectedLocation();
  const { can } = usePermissions();
  const canCreate = can('clients.write');

  // Fetch industries for lookup
  const { data: industries = [], isLoading: industriesLoading } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  // Create industries lookup map
  const industriesMap = new Map(industries.map(i => [i.id, i]));

  // Grid context
  const gridContext: ClientsGridContext = {
    industries,
    industriesMap,
  };

  return (
    <PageLayout
      breadcrumbs={[{ label: "Clients" }]}
      primaryAction={canCreate ? {
        label: "New Client",
        href: "/clients/new",
        icon: CircleFadingPlus,
      } : undefined}
    >
      <DataGridPage
        queryKey="/api/clients"
        columns={clientColumns}
        filters={clientFilters}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={["name", "website"]}
        searchPlaceholder="Search clients..."
        onRowClick={(client) => setLocation(`/clients/${client.id}`)}
        getRowId={(client) => client.id || ""}
        emptyMessage="No clients found"
        emptyDescription="Start building your client directory by adding a client."
        context={gridContext}
        isExternalDataLoading={industriesLoading}
      />
    </PageLayout>
  );
}
