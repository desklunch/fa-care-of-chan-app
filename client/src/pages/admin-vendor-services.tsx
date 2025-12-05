import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { VendorService, CreateVendorService, UpdateVendorService } from "@shared/schema";
import { insertVendorServiceSchema, updateVendorServiceSchema } from "@shared/schema";
import type { ColumnConfig } from "@/components/data-grid/types";
import * as LucideIcons from "lucide-react";
import { CircleFadingPlus, SquarePen, Trash2, Save } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["name", "description", "icon"];

function getIconComponent(iconName: string | null) {
  if (!iconName) return null;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon ? <Icon className="w-4 h-4 text-muted-foreground" /> : null;
}

function CreateServiceDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateVendorService>({
    resolver: zodResolver(insertVendorServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      externalId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateVendorService) => {
      return apiRequest("POST", "/api/vendor-services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-services"] });
      toast({ title: "Service created successfully!" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateVendorService) => {
    createMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-service">
          <CircleFadingPlus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vendor Service</DialogTitle>
          <DialogDescription>
            Create a new service category that vendors can provide.
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
                      placeholder="e.g., Audio/Video Production" 
                      {...field} 
                      data-testid="input-service-name"
                    />
                  </FormControl>
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
                      placeholder="Describe this service category..." 
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-service-description"
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
                  <FormLabel>Icon Name</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="e.g., Video, Music, Flower" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-service-icon"
                      />
                      {field.value && getIconComponent(field.value)}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., SVC001" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-service-external-id"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-service"
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Creating..." : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EditServiceDialogProps {
  service: VendorService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditServiceDialog({ service, open, onOpenChange }: EditServiceDialogProps) {
  const { toast } = useToast();

  const form = useForm<UpdateVendorService>({
    resolver: zodResolver(updateVendorServiceSchema),
    defaultValues: {
      name: service.name,
      description: service.description || "",
      icon: service.icon || "",
      externalId: service.externalId || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateVendorService) => {
      return apiRequest("PATCH", `/api/vendor-services/${service.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-services"] });
      toast({ title: "Service updated successfully!" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/vendor-services/${service.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Service deleted successfully!" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateVendorService) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Vendor Service</DialogTitle>
          <DialogDescription>
            Update the details of this service category.
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
                      placeholder="e.g., Audio/Video Production" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-edit-service-name"
                    />
                  </FormControl>
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
                      placeholder="Describe this service category..." 
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-edit-service-description"
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
                  <FormLabel>Icon Name</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="e.g., Video, Music, Flower" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-service-icon"
                      />
                      {field.value && getIconComponent(field.value)}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., SVC001" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-edit-service-external-id"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-between gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-service"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Service</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{service.name}"? This will also remove it from all vendors that currently have this service.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-update-service"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVendorServices() {
  const [editingService, setEditingService] = useState<VendorService | null>(null);

  const vendorServiceColumns: ColumnConfig<VendorService>[] = [
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
      id: "externalId",
      headerName: "External ID",
      field: "externalId",
      category: "System",
      colDef: {
        flex: 0.5,
        width: 80,
        minWidth: 60,
      },
    },
    {
      id: "name",
      headerName: "Service Name",
      field: "name",
      category: "Basic Info",
      colDef: {
        flex: 1.2,
        minWidth: 150,
        cellRenderer: (params: { data: VendorService }) => {
          const service = params.data;
          if (!service) return null;
          return (
            <div className="flex items-center gap-2 h-full">
              {getIconComponent(service.icon)}
              <span className="text-foreground">{service.name}</span>
            </div>
          );
        },
      },
    },
    {
      id: "description",
      headerName: "Description",
      field: "description",
      category: "Basic Info",
      colDef: {
        flex: 2,
        minWidth: 250,
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
      id: "icon",
      headerName: "Icon",
      field: "icon",
      category: "Display",
      colDef: {
        flex: 0.8,
        width: 100,
        minWidth: 80,
        cellRenderer: (params: { value: string | null }) => {
          if (!params.value) return null;
          return (
            <div className="flex items-center gap-2 h-full">
              {getIconComponent(params.value)}
              <span className="text-xs text-muted-foreground font-mono">{params.value}</span>
            </div>
          );
        },
      },
    },
    {
      id: "actions",
      headerName: "Actions",
      field: "id",
      category: "Actions",
      colDef: {
        flex: 0.5,
        width: 80,
        minWidth: 80,
        cellRenderer: (params: { data: VendorService }) => {
          const service = params.data;
          if (!service) return null;
          return (
            <div className="flex items-center h-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingService(service);
                }}
                data-testid={`button-edit-service-${service.id}`}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    },
  ];

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "Admin", href: "/admin" }, 
        { label: "Vendor Services" }
      ]}
      primaryAction={{
        label: "New Service",
        onClick: () => document.getElementById("create-service-trigger")?.click(),
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage
        queryKey="/api/vendor-services"
        columns={vendorServiceColumns}
        defaultVisibleColumns={[...DEFAULT_VISIBLE_COLUMNS, "actions"]}
        searchFields={["name", "description"]}
        searchPlaceholder="Search vendor services..."
        getRowId={(service) => service.id || ""}
        emptyMessage="No vendor services found"
        emptyDescription="Create your first vendor service category to get started."
        onRowClick={(service) => setEditingService(service)}
      />

      {editingService && (
        <EditServiceDialog
          service={editingService}
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
        />
      )}
    </PageLayout>
  );
}
