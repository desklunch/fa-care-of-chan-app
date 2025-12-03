import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import type { VendorService } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import * as LucideIcons from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "description", "icon"];

function getIconComponent(iconName: string | null) {
  if (!iconName) return null;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon ? <Icon className="w-4 h-4 text-muted-foreground" /> : null;
}

const vendorServiceColumns: ColumnConfig<VendorService>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "System",
    colDef: {
      flex: 1,
      width: 120,
      minWidth: 100,
    },
  },
  {
    id: "externalId",
    headerName: "External ID",
    field: "externalId",
    category: "System",
    colDef: {
      flex: 0.5,
      width: 80,
      minWidth: 60,
    },
  },
  {
    id: "name",
    headerName: "Service Name",
    field: "name",
    category: "Basic Info",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { data: VendorService }) => {
        const service = params.data;
        if (!service) return null;
        return (
          <div className="flex items-center gap-2 h-full">
            {getIconComponent(service.icon)}
            <span className="text-foreground">{service.name}</span>
          </div>
        );
      },
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    category: "Basic Info",
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
    id: "icon",
    headerName: "Icon",
    field: "icon",
    category: "Display",
    colDef: {
      flex: 0.8,
      width: 100,
      minWidth: 80,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center gap-2 h-full">
            {getIconComponent(params.value)}
            <span className="text-xs text-muted-foreground font-mono">{params.value}</span>
          </div>
        );
      },
    },
  },
];

export default function VendorServicesAdmin() {
  return (
    <PageLayout breadcrumbs={[{ label: "Admin" }, { label: "Vendor Services" }]}>
      <DataGridPage
        queryKey="/api/vendor-services"
        columns={vendorServiceColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={["name", "description"]}
        searchPlaceholder="Search vendor services..."
        getRowId={(service) => service.id || ""}
        emptyMessage="No vendor services found"
        emptyDescription="Your vendor services catalog is empty."
        toolbarActions={<></>}
      />
    </PageLayout>
  );
}
