import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus, Globe } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "industry", "domain", "about"];

const clientColumns: ColumnConfig<Client>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "Basic Info",
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
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: Client }) => {
        const client = params.data;
        if (!client) return null;
        return (
          <div className="flex items-center h-full">
            <span className="font-medium text-foreground" data-testid={`text-client-name-${client.id}`}>
              {client.name}
            </span>
          </div>
        );
      },
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
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <Badge variant="outline" className="text-xs" data-testid={`badge-industry-${params.value}`}>
              {params.value}
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "domain",
    headerName: "Website",
    field: "domain",
    category: "Basic Info",
    colDef: {
      flex: 1.2,
      minWidth: 180,
      cellRenderer: (params: { data: Client }) => {
        const domain = params.data?.domain;
        if (!domain) return null;
        return (
          <a
            href={domain.startsWith("http") ? domain : `https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline h-full"
            onClick={(e) => e.stopPropagation()}
            data-testid={`link-client-domain-${params.data?.id}`}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{domain}</span>
          </a>
        );
      },
    },
  },
  {
    id: "about",
    headerName: "About",
    field: "about",
    category: "Details",
    colDef: {
      flex: 2,
      minWidth: 250,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Details",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
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
        searchFields={["name", "industry", "domain", "about"]}
        searchPlaceholder="Search clients..."
        onRowClick={(client) => setLocation(`/clients/${client.id}`)}
        getRowId={(client) => client.id || ""}
        emptyMessage="No clients found"
        emptyDescription="Your client directory is empty."
      />
    </PageLayout>
  );
}
