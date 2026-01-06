import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Industry } from "@shared/schema";
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

const DEFAULT_VISIBLE_COLUMNS = ["name", "description"];

const industryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional().nullable(),
});

type IndustryFormData = z.infer<typeof industryFormSchema>;

function NameCellRenderer({ data }: { data: Industry }) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-2 h-full">
      <span className="font-medium truncate" data-testid={`text-industry-name-${data.id}`}>
        {data.name}
      </span>
    </div>
  );
}

function DescriptionCellRenderer({ data }: { data: Industry }) {
  if (!data?.description) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {data.description}
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
                      data-testid="button-delete"
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

export default function IndustriesPage() {
  usePageTitle("Industries");
  const [, navigate] = useLocation();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  const handleRowClick = useCallback((industry: Industry) => {
    setSelectedIndustry(industry);
    setEditDialogOpen(true);
  }, []);

  const industryColumns: ColumnConfig<Industry>[] = [
    {
      id: "name",
      headerName: "Name",
      field: "name",
      colDef: {
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { data: Industry }) => <NameCellRenderer data={params.data} />,
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

  const dataGridProps = {
    queryKey: "/api/industries",
    columns: industryColumns,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    searchFields: ["name", "description"] as (keyof Industry)[],
    searchPlaceholder: "Search industries...",
    onRowClick: handleRowClick,
    getRowId: (industry: Industry) => industry.id,
    emptyMessage: "No industries yet",
    emptyDescription: "Create your first industry to get started.",
  };

  if (isAuthLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Industries" }]}>
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
      breadcrumbs={[{ label: "Industries" }]}
      primaryAction={{
        label: "New Industry",
        onClick: () => setCreateDialogOpen(true),
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage {...dataGridProps} />

      <IndustryFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {}}
      />

      <IndustryFormDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedIndustry(null);
        }}
        industry={selectedIndustry}
        onSuccess={() => {}}
      />
    </PageLayout>
  );
}
