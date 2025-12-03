import { useLocation, Link } from "wouter";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ContactWithVendors, Vendor } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { Building2, Plus } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "jobTitle", "vendors", "emailAddresses", "phoneNumbers"];

const contactColumns: ColumnConfig<ContactWithVendors>[] = [
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
    field: "firstName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { data: ContactWithVendors }) => {
        const contact = params.data;
        if (!contact) return null;
        const fullName = `${contact.firstName} ${contact.lastName}`;
        return (
          <div className="flex items-center h-full">
            <span className="text-foreground">{fullName}</span>
          </div>
        );
      },
      valueGetter: (params: { data: ContactWithVendors | undefined }) => {
        const contact = params.data;
        return `${contact?.firstName || ""} ${contact?.lastName || ""}`.trim();
      },
    },
  },
  {
    id: "firstName",
    headerName: "First Name",
    field: "firstName",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "lastName",
    headerName: "Last Name",
    field: "lastName",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "jobTitle",
    headerName: "Job Title",
    field: "jobTitle",
    category: "Work",
    colDef: {
      flex: 1.2,
      minWidth: 150,
    },
  },
  {
    id: "vendors",
    headerName: "Vendors",
    field: "vendors",
    category: "Work",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: Vendor[] | undefined }) => {
        const vendors = params.value;
        if (!vendors || vendors.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {vendors.slice(0, 2).map((vendor) => (
              <Link 
                key={vendor.id} 
                href={`/vendors/${vendor.id}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Badge 
                  variant="outline" 
                  className="text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  data-testid={`badge-vendor-${vendor.id}`}
                >
                  <Building2 className="w-3 h-3" />
                  {vendor.businessName}
                </Badge>
              </Link>
            ))}
            {vendors.length > 2 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{vendors.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "emailAddresses",
    headerName: "Email",
    field: "emailAddresses",
    category: "Contact",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: ContactWithVendors | undefined }) => {
        const emails = params.data?.emailAddresses;
        if (!emails || !Array.isArray(emails) || emails.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            <span className="truncate">{emails[0]}</span>
            {emails.length > 1 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                +{emails.length - 1}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "phoneNumbers",
    headerName: "Phone",
    field: "phoneNumbers",
    category: "Contact",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { data: ContactWithVendors | undefined }) => {
        const phones = params.data?.phoneNumbers;
        if (!phones || !Array.isArray(phones) || phones.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            <span className="truncate">{phones[0]}</span>
            {phones.length > 1 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                +{phones.length - 1}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "dateOfBirth",
    headerName: "Date of Birth",
    field: "dateOfBirth",
    category: "Personal",
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
    id: "instagramUsername",
    headerName: "Instagram",
    field: "instagramUsername",
    category: "Social",
    colDef: {
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="text-muted-foreground">@{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "linkedinUsername",
    headerName: "LinkedIn",
    field: "linkedinUsername",
    category: "Social",
    colDef: {
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "homeAddress",
    headerName: "Address",
    field: "homeAddress",
    category: "Contact",
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
    id: "createdAt",
    headerName: "Created At",
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

export default function Contacts() {
  const [, setLocation] = useLocation();

  return (
    <PageLayout breadcrumbs={[{ label: "Contacts" }]}>
      <DataGridPage
        queryKey="/api/contacts"
        columns={contactColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          (contact) => `${contact.firstName} ${contact.lastName}`,
          "jobTitle",
          (contact) => contact.emailAddresses?.join(" ") || "",
          (contact) => contact.phoneNumbers?.join(" ") || "",
          "instagramUsername",
          "linkedinUsername",
        ]}
        searchPlaceholder="Search contacts..."
        onRowClick={(contact) => setLocation(`/contacts/${contact.id}`)}
        getRowId={(contact) => contact.id || ""}
        emptyMessage="No contacts found"
        emptyDescription="Your contacts directory is empty."
        toolbarActions={
          <Link href="/contacts/new">
            <Button data-testid="button-new-contact">
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </Link>
        }
      />
    </PageLayout>
  );
}
