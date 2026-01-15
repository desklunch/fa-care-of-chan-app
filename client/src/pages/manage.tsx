import { useState, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Industry, DealService } from "@shared/schema";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CircleFadingPlus, Trash2, Building2, Briefcase } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "industries" | "services";

const industryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

const serviceFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

type IndustryFormData = z.infer<typeof industryFormSchema>;
type ServiceFormData = z.infer<typeof serviceFormSchema>;

function IndustryNameCellRenderer({ data }: { data: Industry }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-industry-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function ServiceNameCellRenderer({ data }: { data: DealService }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-service-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function DescriptionCellRenderer({ data }: { data: Industry | DealService }) {
  if (!data?.description) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.description}
    </span>
  );
}

function ActiveCellRenderer({ data }: { data: DealService }) {
  if (!data) return null;
  return (
    <span className={`text-sm ${data.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {data.isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

interface IndustryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industry?: Industry | null;
  onSuccess: () => void;
}

function IndustryFormDialog({ open, onOpenChange, industry, onSuccess }: IndustryFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!industry;

  const form = useForm<IndustryFormData>({
    resolver: zodResolver(industryFormSchema),
    defaultValues: {
      name: industry?.name || "",
      description: industry?.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: industry?.name || "",
        description: industry?.description || "",
      });
    }
  }, [open, industry, form]);

  const createMutation = useMutation({
    mutationFn: async (data: IndustryFormData) => {
      return apiRequest("POST", "/api/industries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({ title: "Industry created successfully" });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create industry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IndustryFormData) => {
      return apiRequest("PATCH", `/api/industries/${industry!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({ title: "Industry updated successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update industry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/industries/${industry!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industries"] });
      toast({ title: "Industry deleted successfully" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete industry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IndustryFormData) => {
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
          <DialogTitle>{isEditing ? "Edit Industry" : "New Industry"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the industry details below."
              : "Add a new industry that can be assigned to clients."}
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
                      placeholder="e.g., Technology, Healthcare, Finance"
                      {...field}
                      data-testid="input-industry-name"
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
                      placeholder="Optional description of the industry"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-industry-description"
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
                      data-testid="button-delete-industry"
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Industry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{industry?.name}"? This action cannot be undone.
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
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Industry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: DealService | null;
  onSuccess: () => void;
}

function ServiceFormDialog({ open, onOpenChange, service, onSuccess }: ServiceFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!service;

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      isActive: service?.isActive ?? true,
      sortOrder: service?.sortOrder ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: service?.name || "",
        description: service?.description || "",
        isActive: service?.isActive ?? true,
        sortOrder: service?.sortOrder ?? 0,
      });
    }
  }, [open, service, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      return apiRequest("POST", "/api/deal-services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-services"] });
      toast({ title: "Service created successfully" });
      onSuccess();
      onOpenChange(false);
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

  const updateMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      return apiRequest("PATCH", `/api/deal-services/${service!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-services"] });
      toast({ title: "Service updated successfully" });
      onSuccess();
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
      return apiRequest("DELETE", `/api/deal-services/${service!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-services"] });
      toast({ title: "Service deleted successfully" });
      onSuccess();
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

  const onSubmit = (data: ServiceFormData) => {
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
          <DialogTitle>{isEditing ? "Edit Service" : "New Service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service details below."
              : "Add a new service that can be assigned to deals."}
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
                      placeholder="e.g., Catering, Production, Event Planning"
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
                      placeholder="Optional description of the service"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-service-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-row gap-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-service-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-service-sort-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-6 gap-2">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                      data-testid="button-delete-service"
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Service</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{service?.name}"? This action cannot be undone.
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
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ManagePage() {
  usePageTitle("Manage");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { can } = usePermissions();
  const canReadSales = can("sales.read");
  const canManageSales = can("sales.manage");
  
  const searchParams = new URLSearchParams(searchString);
  const tabParam = searchParams.get("tab");
  const initialTab: TabType = tabParam === "services" ? "services" : "industries";
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [industryCreateDialogOpen, setIndustryCreateDialogOpen] = useState(false);
  const [industryEditDialogOpen, setIndustryEditDialogOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [serviceCreateDialogOpen, setServiceCreateDialogOpen] = useState(false);
  const [serviceEditDialogOpen, setServiceEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<DealService | null>(null);

  const handleTabChange = useCallback((value: string) => {
    const newTab = value as TabType;
    setActiveTab(newTab);
    const params = new URLSearchParams(searchString);
    params.set("tab", newTab);
    navigate(`/sales/manage?${params.toString()}`, { replace: true });
  }, [navigate, searchString]);

  useEffect(() => {
    if (tabParam && (tabParam === "industries" || tabParam === "services")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleIndustryRowClick = useCallback((industry: Industry) => {
    setSelectedIndustry(industry);
    setIndustryEditDialogOpen(true);
  }, []);

  const handleServiceRowClick = useCallback((service: DealService) => {
    setSelectedService(service);
    setServiceEditDialogOpen(true);
  }, []);

  const industryColumns: ColumnConfig<Industry>[] = [
    {
      id: "name",
      headerName: "Name",
      field: "name",
      colDef: {
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { data: Industry }) => <IndustryNameCellRenderer data={params.data} />,
      },
    },
    {
      id: "description",
      headerName: "Description",
      field: "description",
      colDef: {
        flex: 3,
        minWidth: 300,
        cellRenderer: (params: { data: Industry }) => <DescriptionCellRenderer data={params.data} />,
      },
    },
  ];

  const serviceColumns: ColumnConfig<DealService>[] = [
    {
      id: "name",
      headerName: "Name",
      field: "name",
      colDef: {
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { data: DealService }) => <ServiceNameCellRenderer data={params.data} />,
      },
    },
    {
      id: "description",
      headerName: "Description",
      field: "description",
      colDef: {
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: { data: DealService }) => <DescriptionCellRenderer data={params.data} />,
      },
    },
    {
      id: "isActive",
      headerName: "Status",
      field: "isActive",
      colDef: {
        width: 100,
        cellRenderer: (params: { data: DealService }) => <ActiveCellRenderer data={params.data} />,
      },
    },
    {
      id: "sortOrder",
      headerName: "Sort Order",
      field: "sortOrder",
      colDef: {
        width: 100,
      },
    },
  ];

  const industryDataGridProps = {
    queryKey: "/api/industries",
    columns: industryColumns,
    defaultVisibleColumns: ["name", "description"],
    searchFields: ["name", "description"] as (keyof Industry)[],
    searchPlaceholder: "Search industries...",
    onRowClick: handleIndustryRowClick,
    getRowId: (industry: Industry) => industry.id,
    emptyMessage: "No industries yet",
    emptyDescription: "Create your first industry to get started.",
  };

  const serviceDataGridProps = {
    queryKey: "/api/deal-services",
    columns: serviceColumns,
    defaultVisibleColumns: ["name", "description", "isActive", "sortOrder"],
    searchFields: ["name", "description"] as (keyof DealService)[],
    searchPlaceholder: "Search services...",
    onRowClick: handleServiceRowClick,
    getRowId: (service: DealService) => String(service.id),
    emptyMessage: "No services yet",
    emptyDescription: "Create your first service to get started.",
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Sales", href: "/deals" }, { label: "Manage" }]}>
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

  if (!canReadSales) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Manage" }]}>
        <NoPermissionMessage
          title="Access Denied"
          message="You don't have permission to view sales management. Please contact an administrator if you need access."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Manage" }]}
      primaryAction={canManageSales ? {
        label: activeTab === "industries" ? "New Industry" : "New Service",
        onClick: () => activeTab === "industries" ? setIndustryCreateDialogOpen(true) : setServiceCreateDialogOpen(true),
        icon: CircleFadingPlus,
        variant: "default",
      } : undefined}
    >
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 pt-2 border-b">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="industries" className="gap-2" data-testid="tab-industries">
                <Building2 className="h-4 w-4" />
                Industries
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-2" data-testid="tab-services">
                <Briefcase className="h-4 w-4" />
                Services
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {activeTab === "industries" && (
            <DataGridPage {...industryDataGridProps} />
          )}
          {activeTab === "services" && (
            <DataGridPage {...serviceDataGridProps} />
          )}
        </div>
      </div>

      <IndustryFormDialog
        open={industryCreateDialogOpen}
        onOpenChange={setIndustryCreateDialogOpen}
        onSuccess={() => {}}
      />

      <IndustryFormDialog
        open={industryEditDialogOpen}
        onOpenChange={(open) => {
          setIndustryEditDialogOpen(open);
          if (!open) setSelectedIndustry(null);
        }}
        industry={selectedIndustry}
        onSuccess={() => {}}
      />

      <ServiceFormDialog
        open={serviceCreateDialogOpen}
        onOpenChange={setServiceCreateDialogOpen}
        onSuccess={() => {}}
      />

      <ServiceFormDialog
        open={serviceEditDialogOpen}
        onOpenChange={(open) => {
          setServiceEditDialogOpen(open);
          if (!open) setSelectedService(null);
        }}
        service={selectedService}
        onSuccess={() => {}}
      />
    </PageLayout>
  );
}
