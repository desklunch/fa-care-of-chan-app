import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Deal, Client, User, Contact, ClientContact } from "@shared/schema";
import { insertDealSchema, dealStatuses, dealDateTypes } from "@shared/schema";
import { z } from "zod";

const formSchema = insertDealSchema;

type FormData = z.infer<typeof formSchema>;

export default function DealForm() {
  const [, setLocation] = useLocation();
  const [matchNew] = useRoute("/deals/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/deals/:id/edit");
  
  const isEditMode = !!matchEdit;
  const dealId = editParams?.id;
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("clientId");

  const { data: existingDeal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ["/api/deals", dealId],
    enabled: isEditMode && !!dealId,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: clientContacts } = useQuery<(ClientContact & { contact: Contact })[]>({
    queryKey: ["/api/clients", selectedClientId, "contacts"],
    enabled: !!selectedClientId,
  });

  usePageTitle(isEditMode ? "Edit Deal" : "New Deal");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Inquiry",
      ownerId: null,
      clientId: preselectedClientId || "",
      primaryContactId: null,
      maxBudget: null,
      dateType: null,
      primaryDate: null,
      isDateFlexible: false,
      alternativeDates: [],
      numberOfDays: null,
      estimatedMonths: [],
      eventPurpose: "",
      eventFormat: "",
      services: "",
      guestCount: null,
      locations: [],
      eventConcept: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (preselectedClientId && !isEditMode) {
      setSelectedClientId(preselectedClientId);
      form.setValue("clientId", preselectedClientId);
    }
  }, [preselectedClientId, isEditMode, form]);

  useEffect(() => {
    if (isEditMode && existingDeal) {
      form.reset({
        status: existingDeal.status as any,
        ownerId: existingDeal.ownerId,
        clientId: existingDeal.clientId,
        primaryContactId: existingDeal.primaryContactId,
        maxBudget: existingDeal.maxBudget,
        dateType: existingDeal.dateType as any,
        primaryDate: existingDeal.primaryDate,
        isDateFlexible: existingDeal.isDateFlexible || false,
        alternativeDates: existingDeal.alternativeDates || [],
        numberOfDays: existingDeal.numberOfDays,
        estimatedMonths: existingDeal.estimatedMonths || [],
        eventPurpose: existingDeal.eventPurpose || "",
        eventFormat: existingDeal.eventFormat || "",
        services: existingDeal.services || "",
        guestCount: existingDeal.guestCount,
        locations: existingDeal.locations || [],
        eventConcept: existingDeal.eventConcept || "",
        notes: existingDeal.notes || "",
      });
      setSelectedClientId(existingDeal.clientId);
    }
  }, [isEditMode, existingDeal, form]);

  const watchDateType = form.watch("dateType");
  const watchClientId = form.watch("clientId");

  useEffect(() => {
    if (watchClientId && watchClientId !== selectedClientId) {
      setSelectedClientId(watchClientId);
      form.setValue("primaryContactId", null);
    }
  }, [watchClientId, selectedClientId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/deals", data);
    },
    onSuccess: async (response) => {
      const newDeal = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal created successfully!" });
      setLocation(`/deals/${newDeal.id}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      toast({ title: "Deal updated successfully!" });
      setLocation(`/deals/${dealId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal deleted successfully!" });
      setLocation("/deals");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete deal", 
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
  const isLoading = isEditMode && dealLoading;

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: isEditMode ? "Edit Deal" : "New Deal" }
        ]}
      >
        <div className="p-6 max-w-3xl mx-auto">
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

  const backUrl = isEditMode && dealId ? `/deals/${dealId}` : "/deals";

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        ...(isEditMode && existingDeal ? [{ label: existingDeal.eventPurpose || "Deal", href: `/deals/${dealId}` }] : []),
        { label: isEditMode ? "Edit" : "New Deal" }
      ]}
    >
      <div className="p-6 max-w-3xl mx-auto">
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
                    <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this deal? This action cannot be undone.
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
                <CardTitle>Deal Information</CardTitle>
                <CardDescription>Basic details about the deal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
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
                    name="primaryContactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                          disabled={!selectedClientId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-contact">
                              <SelectValue placeholder={selectedClientId ? "Select a contact" : "Select a client first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientContacts?.filter(cc => cc.isActive).map((cc) => (
                              <SelectItem key={cc.contact.id} value={cc.contact.id}>
                                {cc.contact.firstName} {cc.contact.lastName}
                                {cc.contact.jobTitle && ` - ${cc.contact.jobTitle}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Only contacts linked to the selected client are shown
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
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
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-owner">
                              <SelectValue placeholder="Select an owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user) => (
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Information about the event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="eventPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Purpose</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Wedding, Corporate, Birthday"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-event-purpose"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eventFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Format</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Seated Dinner, Cocktail"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-event-format"
                          />
                        </FormControl>
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
                          <Input
                            placeholder="e.g., Full Service, Venue Only"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-services"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Expected number of guests"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-guest-count"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Budget (in thousands)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 50 = $50,000"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-max-budget"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter budget in thousands (e.g., 50 = $50,000)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="eventConcept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Concept</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the event concept..."
                          className="min-h-24"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-event-concept"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Dates</CardTitle>
                <CardDescription>When is the event happening?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="dateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-date-type">
                            <SelectValue placeholder="Select date type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dealDateTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchDateType === "Single Day" || watchDateType === "Multi Day") && (
                  <>
                    <FormField
                      control={form.control}
                      name="primaryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-primary-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isDateFlexible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Date is Flexible</FormLabel>
                            <FormDescription>
                              Is the client open to alternative dates?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-date-flexible"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {watchDateType === "Multi Day" && (
                  <FormField
                    control={form.control}
                    name="numberOfDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            placeholder="Minimum 2 days"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-number-of-days"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes about this deal..."
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
