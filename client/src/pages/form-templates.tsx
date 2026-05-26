import { useCallback, useMemo, useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { PageLayout } from "@/framework";
import { useAuth } from "@/hooks/useAuth";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircleFadingPlus, Copy, Tag, User } from "lucide-react";
import type { FormTemplate, FormTemplateWithRelations } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";
import { DuplicateTemplateDialog } from "@/components/form-builder/DuplicateTemplateDialog";

function NameCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <span className="font-medium" data-testid={`text-template-name-${data.id}`}>
      {data.name}
    </span>
  );
}

function NamespaceCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <span className="font-mono text-xs" data-testid={`text-template-namespace-${data.id}`}>
      {data.namespace}
    </span>
  );
}

interface TemplateGridContext {
  onDuplicate: (template: FormTemplate) => void;
}

function ActionsCellRenderer(
  params: ICellRendererParams<FormTemplate, unknown, TemplateGridContext>,
) {
  const { data, context } = params;
  if (!data || !context) return null;
  return (
    <div className="flex items-center justify-end pr-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          context.onDuplicate(data);
        }}
        data-testid={`button-duplicate-template-${data.id}`}
        title="Duplicate"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CreatedByCellRenderer({
  data,
}: ICellRendererParams<FormTemplateWithRelations>) {
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
  deal_discovery: "Deal Discovery",
  testing: "Testing",
};

function CategoryCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <div className="pt-[14px]">
      <Badge variant="secondary" data-testid={`badge-category-${data.id}`}>
        {categoryLabels[data.category || ""] ||
          data.category ||
          "Uncategorized"}
      </Badge>
    </div>
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
    id: "namespace",
    headerName: "Namespace",
    field: "namespace",
    category: "Info",
    colDef: {
      flex: 1,
      minWidth: 160,
      cellRenderer: NamespaceCellRenderer,
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
        return data?.createdBy
          ? `${data.createdBy.firstName} ${data.createdBy.lastName}`
          : "";
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
  {
    id: "actions",
    headerName: "",
    category: "Info",
    colDef: {
      width: 64,
      minWidth: 64,
      maxWidth: 64,
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false,
      resizable: false,
    },
  },
];

const templateFilters: FilterConfig<FormTemplate>[] = [
  {
    id: "category",
    label: "Category",
    icon: Tag,
    type: "single",
    optionSource: {
      type: "static",
      options: Object.entries(categoryLabels).map(([value, label]) => ({ id: value, label })),
    },
    matchFn: (template, selectedValues) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(template.category || "");
    },
  },
];

const defaultVisibleColumns = [
  "name",
  "namespace",
  "category",
  "description",
  "createdBy",
  "createdAt",
  "actions",
];

export default function AdminFormTemplatesPage() {
  usePageTitle("Form Templates");
  const [, navigate] = useProtectedLocation();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [duplicateTarget, setDuplicateTarget] = useState<FormTemplate | null>(null);

  const handleRowClick = useCallback(
    (template: FormTemplate) => {
      navigate(`/forms/${template.id}`);
    },
    [navigate],
  );

  const gridContext = useMemo<TemplateGridContext>(
    () => ({ onDuplicate: (template) => setDuplicateTarget(template) }),
    [],
  );

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
        filters={templateFilters}
        searchFields={["name", "description"]}
        searchPlaceholder="Search templates..."
        hideColumnSelector
        onRowClick={handleRowClick}
        getRowId={(template: FormTemplate) => template.id}
        emptyMessage="No form templates yet"
        emptyDescription="Create a template to get started with custom forms."
        context={gridContext}
      />
      <DuplicateTemplateDialog
        template={duplicateTarget}
        open={!!duplicateTarget}
        onOpenChange={(open) => {
          if (!open) setDuplicateTarget(null);
        }}
      />
    </PageLayout>
  );
}
