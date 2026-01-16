import { Link } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import type { ContactWithVendors, Vendor, Client } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { Building2, Handshake, CircleFadingPlus } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "jobTitle", "company", "emailAddresses", "phoneNumbers"];

const contactColumns: ColumnConfig<ContactWithVendors>[] = [
  {
    id: "name",
    headerName: "Name",
    field: "firstName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      sort: "asc",
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
    id: "company",
    headerName: "Company",
    field: "vendors",
    category: "Work",
    colDef: {
      flex: 3,
      minWidth: 280,
      cellRenderer: (params: { data: ContactWithVendors | undefined }) => {
        const vendors = params.data?.vendors || [];
        const clients = params.data?.clients || [];
        
        if (vendors.length === 0 && clients.length === 0) return null;
        
        const allItems: Array<{ type: 'vendor' | 'client'; id: string; name: string }> = [
          ...clients.map(c => ({ type: 'client' as const, id: c.id, name: c.name })),
          ...vendors.map(v => ({ type: 'vendor' as const, id: v.id, name: v.businessName })),
        ];
        
        const displayItems = allItems.slice(0, 3);
        const remainingCount = allItems.length - 3;
        
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {displayItems.map((item) => (
              <Link 
                key={`${item.type}-${item.id}`}
                href={item.type === 'client' ? `/clients/${item.id}` : `/vendors/${item.id}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Badge 
                  variant={item.type === 'client' ? 'secondary' : 'outline'}
                  className="text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  data-testid={`badge-${item.type}-${item.id}`}
                >
                  {item.type === 'client' ? (
                    <Building2 className="w-3 h-3" />
                  ) : (
                    <Handshake className="w-3 h-3" />
                  )}
                  {item.name}
                </Badge>
              </Link>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{remainingCount}
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
];

export default function Contacts() {
  usePageTitle("Contacts");
  const [, setLocation] = useProtectedLocation();
  const { can } = usePermissions();
  const canCreate = can('contacts.write');

  return (
    <PageLayout
      breadcrumbs={[{ label: "Contacts" }]}
      primaryAction={canCreate ? {
        label: "New Contact",
        href: "/contacts/new",
        icon: CircleFadingPlus,
      } : undefined}
    >
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
      />
    </PageLayout>
  );
}
