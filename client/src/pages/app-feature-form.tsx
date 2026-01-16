import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
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
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureCategory, FeatureType } from "@shared/schema";
import { insertAppFeatureSchema, featureTypes } from "@shared/schema";
import { z } from "zod";

const featureTypeLabels: Record<FeatureType, string> = {
  idea: "Idea",
  requirement: "Requirement",
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
      featureType: undefined,
    },
  });

  useEffect(() => {
    if (isEditMode && existingFeature) {
      form.reset({
        title: existingFeature.title,
        description: existingFeature.description,
        categoryId: existingFeature.categoryId,
        featureType: existingFeature.featureType as FeatureType,
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

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "App"}, { label: "Features", href: "/app/features" },
          { label: isEditMode ? "Edit " : "New " }
        ]}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const backUrl = isEditMode && featureId ? `/app/features/${featureId}` : "/app/features";

  return (
    <PageLayout 
      breadcrumbs={[
        { label: "App"}, { label: "Features", href: "/app/features" },
        ...(isEditMode && existingFeature ? [{ label: existingFeature.title, href: `/app/features/${featureId}` }] : []),
        { label: isEditMode ? "Edit" : "New" }
      ]}
    >
      <div className="p-0 md:p-6 max-w-2xl mx-auto">
  

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Feature Request" : "New Feature Request"}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? "Update the details of this feature request."
                : "Share your idea for improving the application. Others can vote and comment on it."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Brief summary of your idea" 
                          {...field} 
                          data-testid="input-feature-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feature-type">
                            <SelectValue placeholder="Is this an Idea or a Requirement?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {featureTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {featureTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feature-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          placeholder="Describe your feature request in detail..."
                          className="min-h-[150px]"
                          {...field} 
                          data-testid="textarea-feature-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4 justify-between">
                  <div className="flex gap-3">
                    <Link href={backUrl}>
                      <Button 
                        type="button" 
                        variant="outline"
                        data-testid="button-cancel-feature"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-submit-feature"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isPending 
                        ? (isEditMode ? "Saving..." : "Submitting...") 
                        : (isEditMode ? "Save" : "Submit")
                      }
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
                          <Trash2 className="h-4 w-4 mr-2" />
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
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
