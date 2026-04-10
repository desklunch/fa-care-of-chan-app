import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, X, Trash2 } from "lucide-react";
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
import type { AppFeatureWithRelations, FeatureCategory, FeatureStatus, FeaturePriority } from "@shared/schema";
import { insertAppFeatureSchema, featureStatuses, featurePriorities } from "@shared/schema";
import { PriorityIcon, priorityLabels } from "@/components/priority-icon";
import { z } from "zod";

const featureStatusLabels: Record<FeatureStatus, string> = {
  proposed: "Proposed",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const formSchema = insertAppFeatureSchema;
type FormData = z.infer<typeof formSchema>;

export default function AppFeatureForm() {
  const [, setLocation] = useProtectedLocation();
  const [matchNew] = useRoute("/app/features/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/app/features/:id/edit");
  
  const isEditMode = !!matchEdit;
  const featureId = editParams?.id;
  const { toast } = useToast();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: existingFeature, isLoading: featureLoading } = useQuery<AppFeatureWithRelations>({
    queryKey: ["/api/features", featureId],
    enabled: isEditMode && !!featureId,
  });

  usePageTitle(isEditMode ? "Edit Feature" : "New Feature");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      status: "proposed",
      priority: null,
    },
  });

  useEffect(() => {
    if (isEditMode && existingFeature) {
      form.reset({
        title: existingFeature.title,
        description: existingFeature.description,
        categoryId: existingFeature.categoryId,
        status: existingFeature.status as FeatureStatus,
        priority: (existingFeature.priority as FeaturePriority) || null,
      });
    }
  }, [isEditMode, existingFeature, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/features", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature request submitted!" });
      setLocation("/app/features");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit feature", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/features/${featureId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      toast({ title: "Feature updated successfully!" });
      setLocation(`/app/features/${featureId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update feature", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/features/${featureId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature deleted successfully!" });
      setLocation("/app/features");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete feature", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = categoriesLoading || (isEditMode && featureLoading);

  const handleHeaderSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    setLocation(isEditMode && featureId ? `/app/features/${featureId}` : "/app/features");
  };

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "App"}, 
          { label: "Features", href: "/app/features" },
          { label: isEditMode ? "Edit" : "New" }
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "App"}, 
        { label: "Features", href: "/app/features" },
        ...(isEditMode && existingFeature ? [{ label: existingFeature.title, href: `/app/features/${featureId}` }] : []),
        { label: isEditMode ? "Edit" : "New" }
      ]}
      primaryAction={{
        label: isEditMode ? "Update Feature" : "Create Feature",
        icon: Save,
        onClick: handleHeaderSubmit,
      }}
      additionalActions={[
        {
          label: "Cancel",
          icon: X,
          onClick: handleCancel,
        },
      ]}
    >
      <div className="max-w-2xl p-4 md:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-form-title">
                  {isEditMode ? "Edit Feature Request" : "Feature Info"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Title</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="Brief summary of your idea" 
                          {...field} 
                          data-testid="input-feature-title"
                        />
                      </FormControl>
                      <FormDescription>
                        A short, descriptive title for your feature request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feature-status">
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {featureStatuses.map((status) => (
                            <SelectItem key={status} value={status} data-testid={`select-option-status-${status}`}>
                              {featureStatusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The current status of this feature request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Priority</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Optional</span>
                      </div>
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-feature-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__" data-testid="select-option-priority-none">
                            None
                          </SelectItem>
                          {featurePriorities.map((p) => (
                            <SelectItem key={p} value={p} data-testid={`select-option-priority-${p}`}>
                              <span className="flex items-center gap-2">
                                <PriorityIcon priority={p} />
                                {priorityLabels[p]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set the priority level for this feature request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Category</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feature-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} data-testid={`select-option-category-${cat.id}`}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The area of the application this feature relates to.
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
                      <div className="w-full flex justify-between items-center gap-2">
                        <FormLabel>Description</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Optional</span>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your feature request in detail..."
                          className="min-h-[150px]"
                          {...field} 
                          data-testid="textarea-feature-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Provide as much detail as possible about what you'd like to see.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3 flex-wrap">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-submit-feature"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditMode ? "Update Feature" : "Create Feature"}
                </Button>
              </div>
              {isEditMode && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive"
                      disabled={isPending}
                      data-testid="button-delete-feature"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Feature Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this feature request? This action cannot be undone.
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
              )}
            </div>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
