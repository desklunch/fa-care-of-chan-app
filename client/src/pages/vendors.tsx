import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import type { Vendor } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { Star, ExternalLink } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["businessName", "metroAreas", "email", "phone", "isPreferred"];

const vendorColumns: ColumnConfig<Vendor>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "System",
    colDef: {
      width: 120,
    },
  },
  {
    id: "businessName",
    headerName: "Business Name",
    field: "businessName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: Vendor }) => {
        const vendor = params.data;
        if (!vendor) return null;
        return (
          <div className="flex items-center gap-2 h-full">
            {vendor.isPreferred && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span className="text-foreground truncate">{vendor.businessName}</span>
          </div>
        );
      },
    },
  },
  {
    id: "metroAreas",
    headerName: "Metro Areas",
    field: "metroArea",
    category: "Location",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { data: Vendor | undefined }) => {
        const metroArea = params.data?.metroArea;
        if (!metroArea || !Array.isArray(metroArea) || metroArea.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            <Badge variant="secondary" className="text-xs shrink-0">
              {metroArea[0]}
            </Badge>
            {metroArea.length > 1 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{metroArea.length - 1}
              </Badge>
            )}
          </div>
        );
      },
      valueGetter: (params: { data: Vendor | undefined }) => {
        const metroArea = params.data?.metroArea;
        if (!metroArea || !Array.isArray(metroArea)) return "";
        return metroArea.join(", ");
      },
    },
  },
  {
    id: "email",
    headerName: "Email",
    field: "email",
    category: "Contact",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <a 
              href={`mailto:${params.value}`}
              className="text-primary hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {params.value}
            </a>
          </div>
        );
      },
    },
  },
  {
    id: "phone",
    headerName: "Phone",
    field: "phone",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 130,
    },
  },
  {
    id: "website",
    headerName: "Website",
    field: "website",
    category: "Contact",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        const url = params.value.startsWith("http") ? params.value : `https://${params.value}`;
        return (
          <div className="flex items-center gap-1 h-full">
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {params.value}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        );
      },
    },
  },
  {
    id: "address",
    headerName: "Address",
    field: "address",
    category: "Location",
    colDef: {
      flex: 2,
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
    id: "employeeCount",
    headerName: "Employees",
    field: "employeeCount",
    category: "Details",
    colDef: {
      width: 110,
    },
  },
  {
    id: "diversityInfo",
    headerName: "Diversity",
    field: "diversityInfo",
    category: "Details",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        const items = params.value.split(",").map(s => s.trim()).filter(Boolean);
        if (items.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            <Badge variant="outline" className="text-xs shrink-0">
              {items[0]}
            </Badge>
            {items.length > 1 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{items.length - 1}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "isPreferred",
    headerName: "Preferred",
    field: "isPreferred",
    category: "Status",
    colDef: {
      width: 100,
      cellRenderer: (params: { value: boolean | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <Badge variant="default" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              Preferred
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "chargesSalesTax",
    headerName: "Sales Tax",
    field: "chargesSalesTax",
    category: "Financial",
    colDef: {
      width: 100,
      cellRenderer: (params: { value: boolean | null }) => {
        return (
          <div className="flex items-center h-full">
            <Badge variant={params.value ? "default" : "secondary"} className="text-xs">
              {params.value ? "Yes" : "No"}
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "salesTaxNotes",
    headerName: "Tax Notes",
    field: "salesTaxNotes",
    category: "Financial",
    colDef: {
      flex: 1.5,
      minWidth: 180,
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Details",
    colDef: {
      flex: 2,
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
    id: "capabilitiesDeck",
    headerName: "Capabilities Deck",
    field: "capabilitiesDeck",
    category: "Details",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        const url = params.value.startsWith("http") ? params.value : `https://${params.value}`;
        return (
          <div className="flex items-center gap-1 h-full">
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View Deck
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        );
      },
    },
  },
];

export default function Vendors() {
  const [, setLocation] = useLocation();

  return (
    <PageLayout breadcrumbs={[{ label: "Vendors" }]}>
      <DataGridPage
        queryKey="/api/vendors"
        columns={vendorColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          "businessName",
          "email",
          "phone",
          "website",
          "address",
          "diversityInfo",
          (vendor) => {
            const areas = vendor.metroArea;
            if (!areas || !Array.isArray(areas)) return "";
            return areas.join(" ");
          },
        ]}
        searchPlaceholder="Search vendors..."
        onRowClick={(vendor) => setLocation(`/vendors/${vendor.id}`)}
        getRowId={(vendor) => vendor.id || ""}
        emptyMessage="No vendors found"
        emptyDescription="Your vendor directory is empty."
        toolbarActions={<></>}
      />
    </PageLayout>
  );
}
