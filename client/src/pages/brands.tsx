import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertBrandSchema, type Brand, type CreateBrand } from "@shared/schema";
import { CircleFadingPlus, MoreHorizontal, Pencil, Trash2, Loader2, Factory } from "lucide-react";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { z } from "zod";

const brandFormSchema = insertBrandSchema.extend({
  name: z.string().min(1, "Brand name is required").max(255),
  industry: z.string().max(100).optional(),
  notes: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

const DEFAULT_VISIBLE_COLUMNS = ["name", "industry", "notes", "createdAt", "actions"];

interface BrandActionsContext {
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

const brandColumns: ColumnConfig<Brand>[] = [
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "Details",
    colDef: {
      width: 120,
    },
  },
  {
    id: "externalId",
    headerName: "External ID",
    field: "externalId",
    category: "Details",
    colDef: {
      width: 100,
    },
  },
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
    field: "industry",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 200,
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Details",
    colDef: {
      width: 130,
      valueFormatter: (params: { value: string | Date | null }) => {
        if (!params.value) return "";
        return format(new Date(params.value), "MMM d, yyyy");
      },
    },
  },
  {
    id: "updatedAt",
    headerName: "Updated",
    field: "updatedAt",
    category: "Details",
    colDef: {
      width: 130,
      valueFormatter: (params: { value: string | Date | null }) => {
        if (!params.value) return "";
        return format(new Date(params.value), "MMM d, yyyy");
      },
    },
  },
  {
    id: "actions",
    headerName: "",
    category: "Actions",
    toggleable: false,
    colDef: {
      width: 60,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data: Brand; context: BrandActionsContext }) => {
        const brand = params.data;
        const context = params.context;
        if (!brand || !context) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-brand-actions-${brand.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => context.onEdit(brand)}
                data-testid={`button-edit-brand-${brand.id}`}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => context.onDelete(brand)}
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-brand-${brand.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  },
];

const brandFilters: FilterConfig<Brand>[] = [
  {
    id: "industry",
    label: "Industry",
    icon: Factory,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const industrySet = new Map<string, string>();
        data.forEach((brand) => {
          if (brand.industry) {
            if (!industrySet.has(brand.industry)) {
              industrySet.set(brand.industry, brand.industry);
            }
          }
        });
        return Array.from(industrySet.entries())
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
      },
    },
    matchFn: (brand, selectedValues) => {
      if (!brand.industry) return false;
      return selectedValues.includes(brand.industry);
    },
  },
];

function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(brand);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: brand?.name || "",
      industry: brand?.industry || "",
      notes: brand?.notes || "",
    },
    values: brand ? {
      name: brand.name,
      industry: brand.industry || "",
      notes: brand.notes || "",
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateBrand) => {
      const res = await apiRequest("POST", "/api/brands", data);
      return res.json() as Promise<Brand>;
    },
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({
        title: "Brand created",
        description: `${newBrand.name} has been added.`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brand",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateBrand) => {
      const res = await apiRequest("PATCH", `/api/brands/${brand?.id}`, data);
      return res.json() as Promise<Brand>;
    },
    onSuccess: (updatedBrand) => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({
        title: "Brand updated",
        description: `${updatedBrand.name} has been updated.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BrandFormValues) => {
    const trimmedIndustry = data.industry?.trim();
    const trimmedNotes = data.notes?.trim();
    const submitData: CreateBrand = {
      name: data.name,
      industry: trimmedIndustry || null,
      notes: trimmedNotes || null,
    };
    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-brand-dialog-title">
            {isEdit ? "Edit Brand" : "New Brand"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brand name"
                      data-testid="input-brand-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Technology, Hospitality, Retail"
                      data-testid="input-brand-industry"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this brand..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-brand-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-brand"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Brand"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-brand"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Brands() {
  usePageTitle("Brands");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | undefined>();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({
        title: "Brand deleted",
        description: "The brand has been removed.",
      });
      setDeleteDialogOpen(false);
      setBrandToDelete(undefined);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete brand",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setDialogOpen(true);
  };

  const handleDelete = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingBrand(undefined);
    }
  };

  const gridContext: BrandActionsContext = {
    onEdit: handleEdit,
    onDelete: handleDelete,
  };

  return (
    <PageLayout
      breadcrumbs={[{ label: "Brands" }]}
      primaryAction={{
        label: "New Brand",
        onClick: () => {
          setEditingBrand(undefined);
          setDialogOpen(true);
        },
        icon: CircleFadingPlus,
      }}
    >
      <DataGridPage<Brand, BrandActionsContext>
        queryKey="/api/brands"
        columns={brandColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={["name", "industry", "notes"]}
        searchPlaceholder="Search brands..."
        filters={brandFilters}
        getRowId={(brand) => brand.id}
        emptyMessage="No brands found"
        emptyDescription="Start building your brand directory by adding a brand."
        context={gridContext}
      />

      <BrandFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        brand={editingBrand}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{brandToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => brandToDelete && deleteMutation.mutate(brandToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
