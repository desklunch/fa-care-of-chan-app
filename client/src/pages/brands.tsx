import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageLayout } from "@/framework";
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
import { CircleFadingPlus, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { z } from "zod";

const brandFormSchema = insertBrandSchema.extend({
  name: z.string().min(1, "Brand name is required").max(255),
  industry: z.string().max(100).optional(),
  notes: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

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

function ActionsCell({
  data,
  onEdit,
  onDelete,
}: ICellRendererParams<Brand> & {
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}) {
  if (!data) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`button-brand-actions-${data.id}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onEdit(data)}
          data-testid={`button-edit-brand-${data.id}`}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(data)}
          className="text-destructive focus:text-destructive"
          data-testid={`button-delete-brand-${data.id}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Brands() {
  usePageTitle("Brands");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | undefined>();

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

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

  const columnDefs: ColDef<Brand>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 2,
      minWidth: 200,
      filter: "agTextColumnFilter",
    },
    {
      field: "industry",
      headerName: "Industry",
      flex: 1,
      minWidth: 150,
      filter: "agTextColumnFilter",
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 130,
      valueFormatter: (params) => {
        if (!params.value) return "";
        return format(new Date(params.value), "MMM d, yyyy");
      },
      sort: "desc",
    },
    {
      headerName: "",
      width: 60,
      cellRenderer: (params: ICellRendererParams<Brand>) => (
        <ActionsCell {...params} onEdit={handleEdit} onDelete={handleDelete} />
      ),
      sortable: false,
      filter: false,
    },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
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
      <div className="h-[calc(100vh-180px)] w-full ag-theme-alpine">
        <AgGridReact<Brand>
          rowData={brands}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          loading={isLoading}
          getRowId={(params) => params.data.id}
          animateRows
          suppressRowClickSelection
          domLayout="normal"
        />
      </div>

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
