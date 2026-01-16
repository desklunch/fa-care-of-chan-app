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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
import type { VenueCollectionWithVenues } from "@shared/schema";
import { insertVenueCollectionSchema } from "@shared/schema";
import { z } from "zod";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";

const formSchema = insertVenueCollectionSchema;
type FormData = z.infer<typeof formSchema>;

export default function VenueCollectionForm() {
  const [, setLocation] = useProtectedLocation();
  const [matchNew] = useRoute("/venues/collections/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/venues/collections/:id/edit");
  
  const isEditMode = !!matchEdit;
  const collectionId = editParams?.id;
  const { toast } = useToast();

  const { data: existingCollection, isLoading: collectionLoading } = useQuery<VenueCollectionWithVenues>({
    queryKey: ["/api/venue-collections", collectionId],
    enabled: isEditMode && !!collectionId,
  });

  usePageTitle(isEditMode ? "Edit Collection" : "New Collection");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isEditMode && existingCollection) {
      form.reset({
        name: existingCollection.name,
        description: existingCollection.description || "",
      });
    }
  }, [isEditMode, existingCollection, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/venue-collections", data);
    },
    onSuccess: async (response) => {
      const collection = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      toast({ title: "Collection created successfully!" });
      setLocation(`/venues/collections/${collection.id}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create collection", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/venue-collections/${collectionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections", collectionId] });
      toast({ title: "Collection updated successfully!" });
      setLocation(`/venues/collections/${collectionId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update collection", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/venue-collections/${collectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-collections"] });
      toast({ title: "Collection deleted successfully!" });
      setLocation("/venues/collections");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete collection", 
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
  const isLoading = isEditMode && collectionLoading;

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Venues", href: "/venues" },
          { label: "Collections", href: "/venues/collections" },
          { label: "Edit Collection" }
        ]}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const backUrl = isEditMode && collectionId ? `/venues/collections/${collectionId}` : "/venues/collections";

  return (
    <PermissionGate
      permission="venues.write"
      behavior="fallback"
      fallback={
        <PageLayout
          breadcrumbs={[
            { label: "Venues", href: "/venues" },
            { label: "Collections", href: "/venues/collections" },
            { label: isEditMode ? "Edit Collection" : "New Collection" }
          ]}
        >
          <NoPermissionMessage
            title="Permission Required"
            message="You don't have permission to create or edit collections. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
    <PageLayout 
      breadcrumbs={[
        { label: "Venues", href: "/venues" },
        { label: "Collections", href: "/venues/collections" },
        ...(isEditMode && existingCollection ? [{ label: existingCollection.name, href: `/venues/collections/${collectionId}` }] : []),
        { label: isEditMode ? "Edit" : "New Collection" }
      ]}
      primaryAction={{
        label: "Save",
        icon: Save,
        onClick: form.handleSubmit(onSubmit),
      }}
    >
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Collection" : "New Collection"}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? "Update the collection details below." 
                : "Create a new collection to organize your venues."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Wedding Venues, Corporate Events" 
                          {...field} 
                          data-testid="input-collection-name"
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
                          placeholder="Optional description for this collection..."
                          className="min-h-24 resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-collection-description"
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description to help others understand the purpose of this collection.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between gap-3 pt-4 border-t">
                  <div>
                    {isEditMode && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            type="button"
                            variant="outline" 
                            className="text-destructive hover:text-destructive"
                            disabled={isPending}
                            data-testid="button-delete-collection"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this collection? This will not delete the venues themselves, only the collection.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation(backUrl)}
                      disabled={isPending}
                      data-testid="button-cancel"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      data-testid="button-save-collection"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isPending ? "Saving..." : "Save Collection"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  </PermissionGate>
  );
}
