import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataGridPage } from "@/components/data-grid";
import { DateCellRenderer } from "@/components/data-grid/cell-renderers";
import type { ColumnConfig } from "@/components/data-grid/types";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Layers,
} from "lucide-react";
import type { FormTemplate, FormSection, InsertFormTemplate } from "@shared/schema";
import type { ICellRendererParams } from "ag-grid-community";

interface GridContext {
  onEdit: (template: FormTemplate) => void;
  onDuplicate: (template: FormTemplate) => void;
  onDelete: (template: FormTemplate) => void;
}

function NameCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  return (
    <span className="font-medium" data-testid={`text-template-name-${data.id}`}>
      {data.name}
    </span>
  );
}

function SectionCountCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  const sectionCount = (data.formSchema as FormSection[])?.length || 0;
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Layers className="h-3 w-3" />
      {sectionCount}
    </span>
  );
}

function FieldCountCellRenderer({ data }: ICellRendererParams<FormTemplate>) {
  if (!data) return null;
  const fieldCount = (data.formSchema as FormSection[])?.reduce(
    (acc, section) => acc + section.fields.length,
    0
  ) || 0;
  return <span className="text-muted-foreground">{fieldCount}</span>;
}

function ActionsCellRenderer({ data, context }: ICellRendererParams<FormTemplate, unknown, GridContext>) {
  if (!data || !context) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" data-testid={`button-template-menu-${data.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); context.onEdit(data); }}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); context.onDuplicate(data); }}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); context.onDelete(data); }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    id: "sections",
    headerName: "Sections",
    category: "Structure",
    colDef: {
      flex: 1,
      minWidth: 100,
      cellRenderer: SectionCountCellRenderer,
      valueGetter: (params) => (params.data?.formSchema as FormSection[])?.length || 0,
    },
  },
  {
    id: "fields",
    headerName: "Fields",
    category: "Structure",
    colDef: {
      flex: 1,
      minWidth: 80,
      cellRenderer: FieldCountCellRenderer,
      valueGetter: (params) => 
        (params.data?.formSchema as FormSection[])?.reduce(
          (acc, section) => acc + section.fields.length, 0
        ) || 0,
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
    category: "Actions",
    toggleable: false,
    colDef: {
      flex: 1,
      minWidth: 60,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCellRenderer,
    },
  },
];

const defaultVisibleColumns = ["name", "description", "sections", "fields", "createdAt", "actions"];

export default function AdminFormTemplatesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();

  const [deleteTemplate, setDeleteTemplate] = useState<FormTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Template duplicated", description: "Form template has been duplicated successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to duplicate template." });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setDeleteTemplate(null);
      toast({ title: "Template deleted", description: "Form template has been deleted." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ variant: "destructive", title: "Session expired", description: "Please log in again." });
        navigate("/");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete template." });
      }
    },
  });

  const handleDuplicate = useCallback((template: FormTemplate) => {
    createMutation.mutate({
      name: `${template.name} (Copy)`,
      description: template.description,
      formSchema: template.formSchema,
    } as InsertFormTemplate);
  }, [createMutation]);

  const handleEdit = useCallback((template: FormTemplate) => {
    navigate(`/forms/templates/${template.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((template: FormTemplate) => {
    setDeleteTemplate(template);
  }, []);

  const handleRowClick = useCallback((template: FormTemplate) => {
    navigate(`/forms/templates/${template.id}/edit`);
  }, [navigate]);

  const gridContext: GridContext = {
    onEdit: handleEdit,
    onDuplicate: handleDuplicate,
    onDelete: handleDelete,
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Forms" }, { label: "Templates" }]}>
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
      breadcrumbs={[{ label: "Forms" }, { label: "Templates" }]}
      actionButton={{
        label: "Create Template",
        href: "/forms/templates/new",
        icon: Plus,
        variant: "default",
      }}
    >
      <DataGridPage
        queryKey="/api/form-templates"
        columns={templateColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        searchFields={["name", "description"]}
        searchPlaceholder="Search templates..."
        onRowClick={handleRowClick}
        getRowId={(template: FormTemplate) => template.id}
        context={gridContext}
        emptyMessage="No form templates yet"
        emptyDescription="Create a template to get started with custom forms."
      />

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
