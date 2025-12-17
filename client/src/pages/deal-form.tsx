import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
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
import { ClientSearch } from "@/components/client-search";
import { CitySearch } from "@/components/city-search";
import { EventScheduleEditor } from "@/components/event-schedule";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DealWithRelations, DealStatus, DealLocation, Deal, DealEvent, DealService, User, Contact } from "@shared/schema";
import { dealStatuses, dealLocationSchema, dealServices } from "@shared/schema";

const dealFormSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  status: z.enum(dealStatuses).default("Inquiry"),
  clientId: z.string().min(1, "Client is required"),
  primaryContactId: z.string().optional().transform(val => val || undefined),
  locations: z.array(dealLocationSchema).default([]),
  eventSchedule: z.array(z.any()).default([]),
  services: z.array(z.enum(dealServices)).default([]),
  concept: z.string().optional().transform(val => val || undefined),
  ownerId: z.string().optional().transform(val => val || undefined),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealForm() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = Boolean(id);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [initialClientId, setInitialClientId] = useState<string | null>(null);

  const { data: deal, isLoading: isLoadingDeal } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: isEditing,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  usePageTitle(isEditing ? (deal?.displayName ? `Edit ${deal.displayName}` : "Edit Deal") : "New Deal");

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      displayName: "",
      status: "Inquiry",
      clientId: "",
      primaryContactId: "",
      locations: [],
      eventSchedule: [],
      services: [],
      concept: "",
      ownerId: "",
    },
  });

  const watchedClientId = form.watch("clientId");

  const { data: linkedContacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/clients/${watchedClientId}/contacts`],
    enabled: Boolean(watchedClientId),
  });

  useEffect(() => {
    if (deal && isEditing) {
      form.reset({
        displayName: deal.displayName,
        status: deal.status as DealStatus,
        clientId: deal.clientId || "",
        primaryContactId: deal.primaryContactId || "",
        locations: (deal.locations as DealLocation[]) || [],
        eventSchedule: (deal.eventSchedule as DealEvent[]) || [],
        services: (deal.services as DealService[]) || [],
        concept: deal.concept || "",
        ownerId: deal.ownerId || "",
      });
      if (deal.client) {
        setSelectedClient({ id: deal.client.id, name: deal.client.name });
      }
      setInitialClientId(deal.clientId || null);
    }
  }, [deal, isEditing, form]);

  useEffect(() => {
    if (initialClientId !== null && watchedClientId !== initialClientId) {
      form.setValue("primaryContactId", "");
      setInitialClientId(watchedClientId);
    }
  }, [watchedClientId, initialClientId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response.json();
    },
    onSuccess: (newDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal created successfully" });
      setLocation(`/deals/${newDeal.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create deal", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const response = await apiRequest("PATCH", `/api/deals/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id] });
      toast({ title: "Deal updated successfully" });
      setLocation(`/deals/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update deal", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: DealFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoadingDeal) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        ...(isEditing && deal ? [{ label: deal.displayName, href: `/deals/${id}` }] : []),
        { label: isEditing ? "Edit" : "New Deal" },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Deal" : "Create New Deal"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter deal name..."
                          {...field}
                          data-testid="input-deal-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this deal or opportunity.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <FormControl>
                        <ClientSearch
                          selectedClientId={field.value || null}
                          selectedClientName={selectedClient?.name || null}
                          onSelect={(client) => {
                            if (client) {
                              field.onChange(client.id);
                              setSelectedClient(client);
                            } else {
                              field.onChange("");
                              setSelectedClient(null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The client company associated with this deal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedClientId && (
                  <FormField
                    control={form.control}
                    name="primaryContactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-contact">
                              <SelectValue placeholder="Select primary contact..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No primary contact</SelectItem>
                            {linkedContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.firstName} {contact.lastName}
                                {contact.jobTitle && ` - ${contact.jobTitle}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select a contact linked to this client as the primary contact.
                          {linkedContacts.length === 0 && " No contacts linked to this client yet."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dealStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The current stage of this deal in your pipeline.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locations</FormLabel>
                      <FormControl>
                        <CitySearch
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Search for a city..."
                          data-testid="city-search"
                        />
                      </FormControl>
                      <FormDescription>
                        The cities where this deal will take place.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Schedule</FormLabel>
                      <FormControl>
                        <EventScheduleEditor
                          value={field.value as DealEvent[]}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional. Add event dates and schedules for this deal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Services</FormLabel>
                      <FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="px-3 w-full justify-start font-normal h-12 min-h-9 bg-background border-input"
                              data-testid="button-services-select"
                            >
                              {field.value.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {field.value.map((service) => (
                                    <Badge
                                      key={service}
                                      variant="default"
                                      className="text-xs py-1 text-background"
                                    >
                                      {service}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Select services...</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="max-h-64  overflow-y-auto p-2">
                              {dealServices.map((service) => {
                                const isSelected = field.value.includes(service);
                                return (
                                  <div
                                    key={service}
                                    className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                                    onClick={() => {
                                      if (isSelected) {
                                        field.onChange(field.value.filter((s) => s !== service));
                                      } else {
                                        field.onChange([...field.value, service]);
                                      }
                                    }}
                                    data-testid={`checkbox-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                                  >
                                    <Checkbox checked={isSelected} />
                                    <span className="text-sm">{service}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormDescription>
                        Select the services included in this deal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concept</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter concept details..."
                          className="min-h-[120px] resize-y"
                          {...field}
                          data-testid="textarea-concept"
                        />
                      </FormControl>
                      <FormDescription>
                        Describe the concept or vision for this deal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-owner">
                            <SelectValue placeholder="Select owner..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No owner</SelectItem>
                          {users.filter(u => u.isActive).map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The team member responsible for this deal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isPending}
                    data-testid="button-submit-deal"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Update Deal" : "Create Deal"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(isEditing ? `/deals/${id}` : "/deals")}
                    disabled={isPending}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
