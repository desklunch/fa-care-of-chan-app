import { useState, useCallback, useEffect } from "react";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Amenity } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleFadingPlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as LucideIcons from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["icon", "name", "description"];

const amenityFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  icon: z.string().min(1, "Icon is required").max(100),
});

type AmenityFormData = z.infer<typeof amenityFormSchema>;

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[name];
  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  return <IconComponent className={className} />;
}

function IconCellRenderer({ data }: { data: Amenity }) {
  if (!data) return null;
  return (
    <div className="flex items-center justify-start h-full">
      <DynamicIcon name={data.icon} className="w-5 h-5 [&_svg]:stroke-[1.5px]" />
    </div>
  );
}

function NameCellRenderer({ data }: { data: Amenity }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-amenity-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function DescriptionCellRenderer({ data }: { data: Amenity }) {
  if (!data?.description) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.description}
    </span>
  );
}

interface AmenityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenity?: Amenity | null;
  onSuccess: () => void;
}

function AmenityFormDialog({ open, onOpenChange, amenity, onSuccess }: AmenityFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!amenity;

  const form = useForm<AmenityFormData>({
    resolver: zodResolver(amenityFormSchema),
    defaultValues: {
      name: amenity?.name || "",
      description: amenity?.description || "",
      icon: amenity?.icon || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: amenity?.name || "",
        description: amenity?.description || "",
        icon: amenity?.icon || "",
      });
    }
  }, [open, amenity, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AmenityFormData) => {
      return apiRequest("POST", "/api/amenities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amenities"] });
      toast({ title: "Amenity created successfully" });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create amenity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AmenityFormData) => {
      return apiRequest("PATCH", `/api/amenities/${amenity!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amenities"] });
      toast({ title: "Amenity updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update amenity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/amenities/${amenity!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amenities"] });
      toast({ title: "Amenity deleted successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete amenity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AmenityFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Amenity" : "New Amenity"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the amenity details below."
              : "Add a new amenity that can be assigned to venues."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., WiFi, Parking, Pool"
                      {...field}
                      data-testid="input-amenity-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g., Wifi, Car, Waves"
                        {...field}
                        data-testid="input-amenity-icon"
                      />
                      {field.value && (
                        <div className="flex items-center justify-center w-10 h-10 border rounded-md bg-muted">
                          <DynamicIcon name={field.value} className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter a {" "}
                    <a 
                      href="https://lucide.dev/icons" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Lucide icon
                    </a>
                    {" "}name (e.g., Wifi, Car, Waves, Utensils).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of the amenity"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-amenity-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-6 gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                      data-testid="button-delete"
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Amenity</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{amenity?.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Amenity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AmenitiesPage() {
  usePageTitle("Amenities");
  const [, navigate] = useProtectedLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);

  const handleRowClick = useCallback((amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setEditDialogOpen(true);
  }, []);

  const amenityColumns: ColumnConfig<Amenity>[] = [
    {
      id: "icon",
      headerName: "Icon",
      field: "icon",
      colDef: {
        flex: 0.5,
        maxWidth: 100,
        minWidth: 100,
        cellRenderer: (params: { data: Amenity }) => <IconCellRenderer data={params.data} />,
      },
    },
    {
      id: "name",
      headerName: "Name",
      field: "name",
      colDef: {
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: { data: Amenity }) => <NameCellRenderer data={params.data} />,
      },
    },
    {
      id: "description",
      headerName: "Description",
      field: "description",
      colDef: {
        flex: 3,
        minWidth: 200,
        cellRenderer: (params: { data: Amenity }) => <DescriptionCellRenderer data={params.data} />,
      },
    },
  ];

  const dataGridProps = {
    queryKey: "/api/amenities",
    columns: amenityColumns,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    searchFields: ["name", "description"] as (keyof Amenity)[],
    searchPlaceholder: "Search amenities...",
    onRowClick: handleRowClick,
    getRowId: (amenity: Amenity) => amenity.id,
    emptyMessage: "No amenities yet",
    emptyDescription: "Create your first amenity to get started.",
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Amenities" }]}>
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
      breadcrumbs={[{ label: "Amenities" }]}
      primaryAction={{
        label: "New Amenity",
        onClick: () => setCreateDialogOpen(true),
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage {...dataGridProps} />

      <AmenityFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {}}
      />

      <AmenityFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedAmenity(null);
        }}
        amenity={selectedAmenity}
        onSuccess={() => {}}
      />
    </PageLayout>
  );
}
