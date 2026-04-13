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
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
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
import { TagAssignment } from "@/components/ui/tag-assignment";
import { LocationSearch } from "@/components/location-search";
import { EventScheduleEditor } from "@/components/event-schedule";
import { Calendar, Loader2, Save, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DealWithRelations, DealStatus, DealLocation, Deal, DealEvent, DealService, User, Contact, DealStatusRecord } from "@shared/schema";
import { dealLocationSchema } from "@shared/schema";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import { cn } from "@/lib/utils"
import {Separator} from "@/components/ui/separator"

const dealFormSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  status: z.number().int(),
  clientId: z.string().min(1, "Client is required"),
  primaryContactId: z.string().optional().transform(val => val || undefined),
  locations: z.array(dealLocationSchema).default([]),
  eventSchedule: z.array(z.any()).default([]),
  serviceIds: z.array(z.number()).default([]),
  locationsText: z.string().optional().transform(val => val || undefined),
  concept: z.string().optional().transform(val => val || undefined),
  notes: z.string().optional().transform(val => val || undefined),
  nextSteps: z.string().optional().transform(val => val || undefined),
  ownerId: z.string().optional().transform(val => val || undefined),
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
  const [initialClientId, setInitialClientId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

  const { data: existingTagIds } = useQuery<string[]>({
    queryKey: ["/api/deals", id, "tags"],
    enabled: isEditing,
  });

  usePageTitle(isEditing ? (deal?.displayName ? `Edit ${deal.displayName}` : "Edit Deal") : "New Deal");

  const { statuses: dealStatusList, defaultStatus, isLoading: isLoadingStatuses } = useDealStatuses();

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      displayName: "",
      status: 0,
      clientId: "",
      primaryContactId: "",
      locations: [],
      eventSchedule: [],
      serviceIds: [],
      locationsText: "",
      concept: "",
      notes: "",
      nextSteps: "",
      ownerId: "",
      budgetHigh: null,
      budgetLow: null,
      budgetNotes: "",
      startedOn: format(new Date(), "yyyy-MM-dd"),
      wonOn: null,
      lastContactOn: format(new Date(), "yyyy-MM-dd"),
      projectDate: "",
    },
  });

  useEffect(() => {
    if (!isEditing && defaultStatus && form.getValues("status") === 0) {
      form.setValue("status", defaultStatus.id);
    }
  }, [defaultStatus, isEditing, form]);

  const watchedClientId = form.watch("clientId");

  const { data: linkedContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/clients', watchedClientId, 'contacts'],
    enabled: Boolean(watchedClientId),
  });

  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactErrors, setNewContactErrors] = useState<Record<string, string>>({});

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!watchedClientId) {
        throw new Error("No client selected");
      }
      const errors: Record<string, string> = {};
      if (!newContactFirstName.trim()) errors.firstName = "First name is required";
      if (!newContactLastName.trim()) errors.lastName = "Last name is required";
      if (!newContactEmail.trim()) errors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail.trim())) errors.email = "Invalid email address";
      if (Object.keys(errors).length > 0) {
        setNewContactErrors(errors);
        throw new Error("Validation failed");
      }

      const contactRes = await apiRequest("POST", "/api/contacts", {
        firstName: newContactFirstName.trim(),
        lastName: newContactLastName.trim(),
        emailAddresses: [newContactEmail.trim()],
      });
      const contact = await contactRes.json();

      await apiRequest("POST", `/api/contacts/${contact.id}/clients/${watchedClientId}`);

      return contact;
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', watchedClientId, 'contacts'] });
      form.setValue("primaryContactId", contact.id);
      setCreateContactOpen(false);
      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewContactErrors({});
      toast({ title: "Contact created", description: `${contact.firstName} ${contact.lastName} has been created and linked.` });
    },
    onError: (error) => {
      if (error.message !== "Validation failed") {
        toast({
          title: "Error",
          description: error.message === "No client selected" ? "Please select a client first." : "Failed to create contact. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    if (deal && isEditing) {
      form.reset({
        displayName: deal.displayName,
        status: deal.status,
        clientId: deal.clientId || "",
        primaryContactId: deal.primaryContactId || "",
        locations: (deal.locations as DealLocation[]) || [],
        eventSchedule: (deal.eventSchedule as DealEvent[]) || [],
        serviceIds: (deal.serviceIds as number[]) || [],
        locationsText: deal.locationsText || "",
        concept: deal.concept || "",
        notes: deal.notes || "",
        nextSteps: deal.nextSteps || "",
        ownerId: deal.ownerId || "",
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
      setInitialClientId(deal.clientId || null);
    }
  }, [deal, isEditing, form]);

  useEffect(() => {
    if (existingTagIds) {
      setSelectedTagIds(existingTagIds);
    }
  }, [existingTagIds]);

  useEffect(() => {
    if (initialClientId !== null && watchedClientId !== initialClientId) {
      form.setValue("primaryContactId", "");
      setInitialClientId(watchedClientId);
    }
  }, [watchedClientId, initialClientId, form]);

  const saveDealTags = async (dealId: string) => {
    if (selectedTagIds.length > 0 || isEditing) {
      await apiRequest("PUT", `/api/deals/${dealId}/tags`, { tagIds: selectedTagIds });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: DealFormValues) => {
      const response = await apiRequest("POST", "/api/deals", data);
      return response.json();
    },
    onSuccess: async (newDeal: Deal) => {
      await saveDealTags(newDeal.id);
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/all-deal-tags"] });
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
    onSuccess: async () => {
      await saveDealTags(id!);
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/all-deal-tags"] });
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
            {/* Card 1: Deal Info */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Info</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
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
                          placeholder="Short name that idenfies the client and project to make this deal easy to find."
                          {...field}
                          data-testid="input-deal-name"
                        />
                      </FormControl>
      
                      <FormMessage />

                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel> Deal Status</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-status" >
                              <SelectValue placeholder="Select status"  />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dealStatusList.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)} >
                                <div className="min-w-48 w-fit ">
                                <DealStatusBadge status={s.name} />
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
                            {users.filter(u => u.isActive && (u.role === "Sales" || u.role === "Sales Admin" || u.role === "Admin")).map((user) => (
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
                </div>

                <Separator className="my-2" />

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

                <Separator className="my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ">
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
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
      
     
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="w-full flex justify-between items-center">
                        <FormLabel>Company</FormLabel>
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

                {watchedClientId && (
                  <FormField
                    control={form.control}
                    name="primaryContactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            if (val === "__create_new__") {
                              setCreateContactOpen(true);
                              return;
                            }
                            field.onChange(val === "__none__" ? "" : val);
                          }} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(!field.value || field.value === "__none__" ? "text-muted-foreground" : "")}
                              data-testid="select-primary-contact">
                              <SelectValue placeholder="Select primary contact..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">{linkedContacts.length === 0 ? (<span className="text-xs">No contacts found for this client</span>) : "None"}</SelectItem>
                            {linkedContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id} data-testid={`select-contact-${contact.id}`}>
                                {contact.firstName} {contact.lastName}
                              </SelectItem>
                            ))}
                            <SelectItem value="__create_new__" data-testid="select-create-new-contact">
                              <span className="flex items-center gap-2">
                                <Plus className="h-3.5 w-3.5" />
                                Create New Contact
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Dialog open={createContactOpen} onOpenChange={(open) => {
                  setCreateContactOpen(open);
                  if (!open) {
                    setNewContactErrors({});
                    setNewContactFirstName("");
                    setNewContactLastName("");
                    setNewContactEmail("");
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Contact</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-contact-first-name">First Name</Label>
                        <Input
                          id="new-contact-first-name"
                          data-testid="input-new-contact-first-name"
                          value={newContactFirstName}
                          onChange={(e) => { setNewContactFirstName(e.target.value); setNewContactErrors((prev) => { const { firstName, ...rest } = prev; return rest; }); }}
                          placeholder="First name"
                        />
                        {newContactErrors.firstName && <p className="text-sm text-destructive">{newContactErrors.firstName}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-contact-last-name">Last Name</Label>
                        <Input
                          id="new-contact-last-name"
                          data-testid="input-new-contact-last-name"
                          value={newContactLastName}
                          onChange={(e) => { setNewContactLastName(e.target.value); setNewContactErrors((prev) => { const { lastName, ...rest } = prev; return rest; }); }}
                          placeholder="Last name"
                        />
                        {newContactErrors.lastName && <p className="text-sm text-destructive">{newContactErrors.lastName}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-contact-email">Email</Label>
                        <Input
                          id="new-contact-email"
                          data-testid="input-new-contact-email"
                          type="email"
                          value={newContactEmail}
                          onChange={(e) => { setNewContactEmail(e.target.value); setNewContactErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}
                          placeholder="Email address"
                        />
                        {newContactErrors.email && <p className="text-sm text-destructive">{newContactErrors.email}</p>}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateContactOpen(false)} data-testid="button-cancel-create-contact">Cancel</Button>
                      <Button onClick={() => createContactMutation.mutate()} disabled={createContactMutation.isPending} data-testid="button-submit-create-contact">
                        {createContactMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Contact
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>


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
                  name="concept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concept & Context</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="Describe the concept and provide some context."
                          data-testid="richtext-concept"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem className="space-y-0">
                  <FormLabel>Tags</FormLabel>
     
                  <div className="pt-2">
                    <TagAssignment
                      category="Deals"
                      selectedTagIds={selectedTagIds}
                      onTagsChange={setSelectedTagIds}
                    />
                  </div>
                </FormItem>

                <Separator className="my-2" />

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
                <Separator className="my-2" />
                {/* <FormField
                  control={form.control}
                  name="eventSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Dates</FormLabel>
                      <FormControl>
                        <EventScheduleEditor
                          value={(field.value as DealEvent[]) || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
                <FormField
                  control={form.control}
                  name="projectDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Date </FormLabel>
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
         

                <Separator className="my-2" />

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
                              <NumericInput
                                placeholder="0"
                                className="pl-7"
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
                              <NumericInput
                                placeholder="0"
                                className="pl-7"
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
                        <Separator className="my-2" />


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

                                <FormField
                                  control={form.control}
                                  name="nextSteps"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Next Steps</FormLabel>
                                      <FormControl>
                                        <RichTextEditor
                                          value={field.value || ""}
                                          onChange={field.onChange}
                                          onBlur={field.onBlur}
                                          placeholder="Enter next steps for this deal."
                                          data-testid="richtext-next-steps"
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
