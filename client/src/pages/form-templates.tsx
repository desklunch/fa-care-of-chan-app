import { useCallback } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import { Badge } from "@/components/ui/badge";
import {
  CircleFadingPlus,
  User,
} from "lucide-react";
import type { FormTemplate, FormTemplateWithRelations } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

function NameCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <span className="font-medium" data-testid={`text-template-name-${data.id}`}>
      {data.name}
    </span>
  );
}


function CreatedByCellRenderer({ data }: ICellRendererParams<FormTemplateWithRelations>) {
  if (!data?.createdBy) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1">
      <User className="h-3 w-3 text-muted-foreground" />
      {data.createdBy.firstName} {data.createdBy.lastName}
    </span>
  );
}


const categoryLabels: Record<string, string> = {
  client_intake: "Client Intake",
  vendor_inquiry: "Vendor Inquiry",
  testing: "Testing",
};

function CategoryCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <Badge variant="secondary" data-testid={`badge-category-${data.id}`}>
      {categoryLabels[data.category || ""] || data.category || "Uncategorized"}
    </Badge>
  );
}

const templateColumns: ColumnConfig<FormTemplate>[] = [
  {
    id: "name",
    headerName: "Template Name",
    field: "name",
    category: "Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: NameCellRenderer,
    },
  },
  {
    id: "category",
    headerName: "Category",
    field: "category",
    category: "Info",
    colDef: {
      flex: 1,
      minWidth: 140,
      cellRenderer: CategoryCellRenderer,
      valueGetter: (params) => params.data?.category || "",
    },
  },
  {
    id: "description",
    headerName: "Description",
    field: "description",
    category: "Info",
    colDef: {
      flex: 2,
      minWidth: 200,
      valueFormatter: (params) => params.value || "—",
    },
  },
  {
    id: "createdBy",
    headerName: "Created By",
    category: "Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: CreatedByCellRenderer,
      valueGetter: (params) => {
        const data = params.data as FormTemplateWithRelations;
        return data?.createdBy ? `${data.createdBy.firstName} ${data.createdBy.lastName}` : "";
      },
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Dates",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: DateCellRenderer,
    },
  },
];

const defaultVisibleColumns = ["name", "category", "description", "createdBy", "createdAt"];

export default function AdminFormTemplatesPage() {
  usePageTitle("Form Templates");
  const [, navigate] = useProtectedLocation();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const handleRowClick = useCallback((template: FormTemplate) => {
    navigate(`/forms/${template.id}`);
  }, [navigate]);

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Forms" }]}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "Forms" }]}
      primaryAction={{
        label: "New Template",
        href: "/forms/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage
        queryKey="/api/form-templates"
        columns={templateColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        searchFields={["name", "description"]}
        searchPlaceholder="Search templates..."
        hideColumnSelector
        onRowClick={handleRowClick}
        getRowId={(template: FormTemplate) => template.id}
        emptyMessage="No form templates yet"
        emptyDescription="Create a template to get started with custom forms."
      />
    </PageLayout>
  );
}
