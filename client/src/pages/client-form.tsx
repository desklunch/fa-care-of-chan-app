import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertClientSchema, type Client, type CreateClient, type Industry } from "@shared/schema";
import { z } from "zod";
import { Loader2, Save, X } from "lucide-react";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";

const clientFormSchema = insertClientSchema.extend({
  website: z.string().optional().refine(
    (val) => !val || val === "" || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(val),
    { message: "Please enter a valid URL (e.g., https://example.com)" }
  ),
});

export default function ClientForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = Boolean(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", params.id],
    enabled: isEdit,
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  usePageTitle(isEdit ? (client?.name || "Edit Client") : "New Client");

  const form = useForm<CreateClient>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      website: "",
      industryId: null,
    },
    values: client ? {
      name: client.name,
      website: client.website || "",
      industryId: client.industryId || null,
    } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateClient) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json() as Promise<Client>;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client created",
        description: `${newClient.name} has been added to your client directory.`,
      });
      setLocation(`/clients/${newClient.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CreateClient) => {
      const res = await apiRequest("PATCH", `/api/clients/${params.id}`, data);
      return res.json() as Promise<Client>;
    },
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", params.id] });
      toast({
        title: "Client updated",
        description: `${updatedClient.name} has been updated.`,
      });
      setLocation(`/clients/${params.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateClient) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && clientLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  const handleHeaderSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    setLocation(isEdit ? `/clients/${params.id}` : "/clients");
  };

  return (
    <PermissionGate 
      permission="clients.write" 
      fallback={
        <PageLayout
          breadcrumbs={[
            { label: "Clients", href: "/clients" },
            { label: isEdit ? "Edit Client" : "New Client" },
          ]}
        >
          <NoPermissionMessage 
            title="Permission Required"
            message="You don't have permission to create or edit clients. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
      <PageLayout
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          ...(isEdit && client ? [{ label: client.name, href: `/clients/${params.id}` }] : []),
          { label: isEdit ? "Edit" : "New Client" },
        ]}
        primaryAction={{
          label: isEdit ? "Save Changes" : "Create Client",
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
      <div className="max-w-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-form-title">
                  {isEdit ? "Edit Client" : "Client Info"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center">
                        <FormLabel>Name</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Company name"
                          data-testid="input-client-name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The company or organization name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? null : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-client-industry">
                            <SelectValue placeholder="Select an industry..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No industry</SelectItem>
                          {industries.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {industry.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The industry or sector the client operates in.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          data-testid="input-client-website"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        The client's website URL.
                      </FormDescription>
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
    </PermissionGate>
  );
}
