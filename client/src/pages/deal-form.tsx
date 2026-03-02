import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
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
import { BrandSearch } from "@/components/brand-search";
import { LocationSearch } from "@/components/location-search";
import { EventScheduleEditor } from "@/components/event-schedule";
import { Calendar, Loader2, Save, X } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DealWithRelations, DealStatus, DealLocation, Deal, DealEvent, DealService, User, Contact, Industry } from "@shared/schema";
import { dealStatuses, dealLocationSchema } from "@shared/schema";
import { cn } from "@/lib/utils"
import {Separator} from "@/components/ui/separator"

const dealFormSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  status: z.enum(dealStatuses).default("Prospecting"),
  clientId: z.string().min(1, "Client is required"),
  brandId: z.string().optional().nullable().transform(val => val || null),
  primaryContactId: z.string().optional().transform(val => val || undefined),
  locations: z.array(dealLocationSchema).default([]),
  eventSchedule: z.array(z.any()).default([]),
  serviceIds: z.array(z.number()).default([]),
  locationsText: z.string().optional().transform(val => val || undefined),
  concept: z.string().optional().transform(val => val || undefined),
  notes: z.string().optional().transform(val => val || undefined),
  ownerId: z.string().optional().transform(val => val || undefined),
  industryId: z.string().optional().transform(val => val || undefined),
  budgetHigh: z.number().int().min(1000, "Minimum budget is $1,000").nullable().optional(),
  budgetLow: z.number().int().min(1000, "Minimum budget is $1,000").nullable().optional(),
  budgetNotes: z.string().optional().transform(val => val || undefined),
  startedOn: z.string().nullable().optional(),
  wonOn: z.string().nullable().optional(),
  lastContactOn: z.string().nullable().optional(),
  projectDate: z.string().optional().transform(val => val || undefined),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function DealForm() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const isEditing = Boolean(id);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string } | null>(null);
  const [initialClientId, setInitialClientId] = useState<string | null>(null);

  const { data: deal, isLoading: isLoadingDeal } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: isEditing,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  usePageTitle(isEditing ? (deal?.displayName ? `Edit ${deal.displayName}` : "Edit Deal") : "New Deal");

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      displayName: "",
      status: "Prospecting",
      clientId: "",
      brandId: null,
      primaryContactId: "",
      locations: [],
      eventSchedule: [],
      serviceIds: [],
      locationsText: "",
      concept: "",
      notes: "",
      ownerId: "",
      industryId: "",
      budgetHigh: null,
      budgetLow: null,
      budgetNotes: "",
      startedOn: format(new Date(), "yyyy-MM-dd"),
      wonOn: null,
      lastContactOn: format(new Date(), "yyyy-MM-dd"),
      projectDate: "",
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
        brandId: deal.brandId || null,
        primaryContactId: deal.primaryContactId || "",
        locations: (deal.locations as DealLocation[]) || [],
        eventSchedule: (deal.eventSchedule as DealEvent[]) || [],
        serviceIds: (deal.serviceIds as number[]) || [],
        locationsText: deal.locationsText || "",
        concept: deal.concept || "",
        notes: deal.notes || "",
        ownerId: deal.ownerId || "",
        industryId: deal.industryId || "",
        budgetHigh: deal.budgetHigh ?? null,
        budgetLow: deal.budgetLow ?? null,
        budgetNotes: deal.budgetNotes || "",
        startedOn: deal.startedOn ?? null,
        wonOn: deal.wonOn ?? null,
        lastContactOn: deal.lastContactOn ?? null,
        projectDate: deal.projectDate || "",
      });
      if (deal.client) {
        setSelectedClient({ id: deal.client.id, name: deal.client.name });
      }
      if (deal.brand) {
        setSelectedBrand({ id: deal.brand.id, name: deal.brand.name });
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

  const [formMode, setFormMode] = useState<"classic" | "enhanced">("classic");
  const isEnhanced = formMode === "enhanced";

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

  const handleHeaderSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    setLocation(isEditing ? `/deals/${id}` : "/deals");
  };

  return (
    <PermissionGate
      permission="deals.write"
      behavior="fallback"
      fallback={
        <PageLayout
          breadcrumbs={[
            { label: "Deals", href: "/deals" },
            { label: isEditing ? "Edit" : "New Deal" },
          ]}
        >
          <NoPermissionMessage
            title="Permission Required"
            message="You don't have permission to create or edit deals. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        ...(isEditing && deal ? [{ label: deal.displayName, href: `/deals/${id}` }] : []),
        { label: isEditing ? "Edit" : "New Deal" },
      ]}
      primaryAction={{
        label: isEditing ? "Update Deal" : "Create Deal",
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
      <div className="p-4 md:p-6 max-w-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-2" data-testid="toggle-form-mode">
              <div className="inline-flex rounded-md border p-0.5 bg-muted/50">
                <button
                  type="button"
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-sm transition-colors",
                    formMode === "classic"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setFormMode("classic")}
                  data-testid="button-mode-classic"
                >
                  Classic
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-sm transition-colors",
                    formMode === "enhanced"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setFormMode("enhanced")}
                  data-testid="button-mode-enhanced"
                >
                  Enhanced
                </button>
              </div>
            </div>

            {/* Card 1: Deal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Info</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center">
                        <FormLabel>Deal Name</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Short name to help identify this deal"
                          {...field}
                          data-testid="input-deal-name"
                        />
                      </FormControl>
      
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center">
                        <FormLabel>Client</FormLabel>
                        <span className="text-xs font-medium text-muted-foreground">Required</span>
                      </div>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <BrandSearch
                          selectedBrandId={field.value || null}
                          selectedBrandName={selectedBrand?.name || null}
                          onSelect={(brand) => {
                            if (brand) {
                              field.onChange(brand.id);
                              setSelectedBrand(brand);
                            } else {
                              field.onChange(null);
                              setSelectedBrand(null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The brand associated with this deal (optional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

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
                          disabled={linkedContacts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(!field.value || field.value === "__none__" ? "text-muted-foreground" : "")}
                              data-testid="select-primary-contact">
                              <SelectValue placeholder="Select primary contact..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">{linkedContacts.length === 0 ? (<span className="text-xs">No contacts found for this client. </span>) : "None"}</SelectItem>
                            {linkedContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.firstName} {contact.lastName}
                              
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
           
 
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="industryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(!field.value ? "text-muted-foreground" : "")}
                            data-testid="select-deal-industry"
                          >
                            <SelectValue placeholder="Select industry..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No industry</SelectItem>
                          {industries
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((industry) => (
                              <SelectItem key={industry.id} value={industry.id}>
                                {industry.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-4" />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-status" >
                            <SelectValue placeholder="Select status"  />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dealStatuses.map((status) => (
                            <SelectItem key={status} value={status} >
                              <div className="min-w-48 w-fit ">
                              <DealStatusBadge status={status} />
                              </div>
                              
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
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Owner</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} 
                        value={field.value || ""}
                        
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(!field.value || field.value === "__none__" ? "text-muted-foreground" : "")}
                            data-testid="select-deal-owner"
                          >
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
                      <FormMessage />
                    </FormItem>
                  )}
                />



                <Separator className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startedOn"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Started On</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="bg-background border-input w-full h-12 px-3 pr-2 font-normal items-center justify-between"
                                data-testid="button-started-on"
                              >
                                <div className="flex ">
                                <Calendar className="mr-2 h-4 w-4" />
                                {field.value ? format(parseISO(field.value), "MMM d, yyyy") : "Select date"}
                                </div>
                                {field.value && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-auto h-full px-2"
                                    onClick={() => field.onChange(null)}
                                  >
                                    Clear
                                  </Button>
                                  )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                              initialFocus
                            />
                            {field.value && (
                              <div className="p-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => field.onChange(null)}
                                >
                                  Clear
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastContactOn"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Last Contact</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="bg-background border-input w-full h-12 px-3 pr-2 font-normal items-center justify-between"
                                data-testid="button-last-contact"
                              >
                                <div className="flex ">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {field.value ? format(parseISO(field.value), "MMM d, yyyy") : "Select date"}

                                </div>
                                {field.value && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-auto h-full px-2"
                                  onClick={() => field.onChange(null)}
                                >
                                  Clear
                                </Button>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                              initialFocus
                            />
                            {field.value && (
                              <div className="p-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => field.onChange(null)}
                                >
                                  Clear
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* Hidden - Locations field temporarily disabled */}
     
                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Services</FormLabel>
                      <FormDescription>
                        Select one or more services for this deal.
                      </FormDescription>
                      <FormControl className="pt-4">
                        <div className="grid grid-cols-3 gap-3">
                          {dealServices.filter(s => s.isActive).map((service) => {
                            const isSelected = field.value.includes(service.id);
                            return (
                              <Badge
                                key={service.id}
                                variant={isSelected ? "default" : "outline"}
                                
                                className={cn(
                                  "cursor-pointer select-none toggle-elevate",
                                  isSelected && "toggle-elevated"
                                )}
                                onClick={() => {
                                  if (isSelected) {
                                    field.onChange(field.value.filter((id: number) => id !== service.id));
                                  } else {
                                    field.onChange([...field.value, service.id]);
                                  }
                                }}
                                data-testid={`badge-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {service.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </FormControl>
     
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
                          placeholder="Describe the concept and provide some context.
                "
                          className="min-h-[120px] resize-y"
                          {...field}
                          data-testid="textarea-concept"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-4" />

                {isEnhanced && (
                  <>

                    <FormField
                      control={form.control}
                      name="locations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locations</FormLabel>
                          <FormControl>
                            <LocationSearch
                              value={(field.value as DealLocation[]) || []}
                              onChange={field.onChange}
                              testId="location-search"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

   
                  </>
                )}
                <FormField
                  control={form.control}
                  name="locationsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide any additional details about the locations."
                          className="min-h-[80px] resize-y"
                          {...field}
                          data-testid="textarea-locations-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator className="my-4" />

                <FormField
                  control={form.control}
                  name="projectDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Date</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Q2 2025, Summer 2025, TBD..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-project-date"
                        />
                      </FormControl>
 
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isEnhanced && (
                  <>

                    <FormField
                      control={form.control}
                      name="eventSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Schedule</FormLabel>
                          <FormControl>
                            <EventScheduleEditor
                              value={(field.value as DealEvent[]) || []}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </>
                )}
                <Separator className="my-4" />

                {isEnhanced && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budgetLow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Low</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                placeholder="0"
                                className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                data-testid="input-budget-low"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetHigh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget High</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                placeholder="0"
                                className="pl-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                data-testid="input-budget-high"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="budgetNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter budget details..."
                          className="min-h-[80px] resize-y"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-budget-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                        <Separator className="my-4" />


                                <FormField
                                  control={form.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Share any critical notes about this deal."
                                          className="min-h-[120px] resize-y"
                                          {...field}
                                          data-testid="textarea-notes"
                                        />
                                      </FormControl>

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(isEditing ? `/deals/${id}` : "/deals")}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-deal"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />
}
                {isEditing ? "Update Deal" : "Create Deal"}
              </Button>
    
            </div>
          </form>
        </Form>
      </div>
    </PageLayout>
    </PermissionGate>
  );
}
