import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type { Client } from "@shared/schema";
import { insertClientSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertClientSchema;

type FormData = z.infer<typeof formSchema>;

export default function ClientForm() {
  const [, setLocation] = useLocation();
  const [matchNew] = useRoute("/clients/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/clients/:id/edit");
  
  const isEditMode = !!matchEdit;
  const clientId = editParams?.id;
  const { toast } = useToast();

  const { data: existingClient, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: isEditMode && !!clientId,
  });

  usePageTitle(isEditMode ? "Edit Client" : "New Client");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      industry: "",
      domain: "",
      about: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isEditMode && existingClient) {
      form.reset({
        name: existingClient.name,
        industry: existingClient.industry || "",
        domain: existingClient.domain || "",
        about: existingClient.about || "",
        notes: existingClient.notes || "",
      });
    }
  }, [isEditMode, existingClient, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: async (response) => {
      const newClient = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client created successfully!" });
      setLocation(`/clients/${newClient.id}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create client", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/clients/${clientId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Client updated successfully!" });
      setLocation(`/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update client", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client deleted successfully!" });
      setLocation("/clients");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete client", 
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
  const isLoading = isEditMode && clientLoading;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: isEditMode ? "Edit Client" : "New Client" }
        ]}
      >
        <div className="p-6 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const backUrl = isEditMode && clientId ? `/clients/${clientId}` : "/clients";

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        ...(isEditMode && existingClient ? [{ label: existingClient.name, href: `/clients/${clientId}` }] : []),
        { label: isEditMode ? "Edit" : "New Client" }
      ]}
    >
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation(backUrl)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" data-testid="button-delete">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this client? This action cannot be undone.
                      All associated deals will also be affected.
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
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending}
              size="sm"
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter client name"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Technology, Finance, Healthcare"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-industry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website Domain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., example.com"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-domain"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the client..."
                        className="min-h-24"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-about"
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
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Internal notes about the client..."
                        className="min-h-24"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
      </div>
    </PageLayout>
  );
}
