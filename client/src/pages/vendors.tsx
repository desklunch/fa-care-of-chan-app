import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import type { VendorWithRelations, VendorService, Contact } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { Star, ExternalLink, User } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["businessName", "services", "contacts", "email", "phone", "website", "isPreferred"];

const vendorColumns: ColumnConfig<VendorWithRelations>[] = [
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
    id: "businessName",
    headerName: "Business Name",
    field: "businessName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: VendorWithRelations }) => {
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
    id: "services",
    headerName: "Services",
    field: "services",
    category: "Services",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: VendorService[] | undefined }) => {
        const services = params.value;
        if (!services || services.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {services.slice(0, 3).map((service) => (
              <Badge 
                key={service.id} 
                variant="secondary" 
                className="text-xs shrink-0"
              >
                {service.name}
              </Badge>
            ))}
            {services.length > 3 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{services.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "contacts",
    headerName: "Contacts",
    field: "contacts",
    category: "Contacts",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: Contact[] | undefined }) => {
        const contacts = params.value;
        if (!contacts || contacts.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {contacts.slice(0, 2).map((contact) => (
              <Badge 
                key={contact.id} 
                variant="outline" 
                className="text-xs shrink-0 flex items-center gap-1"
              >
                <User className="w-3 h-3" />
                {contact.firstName} {contact.lastName}
              </Badge>
            ))}
            {contacts.length > 2 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{contacts.length - 2}
              </Badge>
            )}
          </div>
        );
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
      flex: 1,
      width: 110,
      minWidth: 100,
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
    },
  },
  {
    id: "isPreferred",
    headerName: "Preferred",
    field: "isPreferred",
    category: "Status",
    colDef: {
      flex: 1,
      width: 100,
      minWidth: 100,
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
      flex: 1,
      width: 100,
      minWidth: 100,
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
