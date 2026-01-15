import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ArrowLeft, Save, Trash2, X, Building2, MapPin, Briefcase } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
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
import type { VendorWithRelations, VendorService, VendorLocation } from "@shared/schema";
import { insertVendorSchema } from "@shared/schema";
import { z } from "zod";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";

const formSchema = insertVendorSchema;

type FormData = z.infer<typeof formSchema>;

function getIconComponent(iconName: string | null | undefined) {
  if (!iconName) return null;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon ? <Icon className="" /> : null;
}

export default function VendorForm() {
  const [, setLocation] = useLocation();
  const [matchNew] = useRoute("/vendors/new");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/vendors/:id/edit");
  
  const isEditMode = !!matchEdit;
  const vendorId = editParams?.id;
  const { toast } = useToast();

  const [locations, setLocations] = useState<VendorLocation[]>([]);

  const { data: existingVendor, isLoading: vendorLoading } = useQuery<VendorWithRelations>({
    queryKey: ["/api/vendors", vendorId],
    enabled: isEditMode && !!vendorId,
  });

  const { data: allServices = [] } = useQuery<VendorService[]>({
    queryKey: ["/api/vendor-services"],
  });

  usePageTitle(isEditMode ? `Edit ${existingVendor?.businessName || "Vendor"}` : "New Vendor");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      businessName: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      capabilitiesDeck: "",
      employeeCount: "",
      diversityInfo: "",
      chargesSalesTax: false,
      salesTaxNotes: "",
      isPreferred: false,
      notes: "",
      locations: [],
      serviceIds: [],
    },
  });

  useEffect(() => {
    if (isEditMode && existingVendor) {
      const serviceIds = existingVendor.services?.map((s) => s.id) || [];
      form.reset({
        businessName: existingVendor.businessName,
        address: existingVendor.address || "",
        phone: existingVendor.phone || "",
        email: existingVendor.email || "",
        website: existingVendor.website || "",
        capabilitiesDeck: existingVendor.capabilitiesDeck || "",
        employeeCount: existingVendor.employeeCount || "",
        diversityInfo: existingVendor.diversityInfo || "",
        chargesSalesTax: existingVendor.chargesSalesTax || false,
        salesTaxNotes: existingVendor.salesTaxNotes || "",
        isPreferred: existingVendor.isPreferred || false,
        notes: existingVendor.notes || "",
        locations: existingVendor.locations || [],
        serviceIds,
      });
      setLocations((existingVendor.locations as VendorLocation[]) || []);
    }
  }, [isEditMode, existingVendor, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor created successfully!" });
      setLocation("/vendors");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create vendor", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("PATCH", `/api/vendors/${vendorId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", vendorId] });
      toast({ title: "Vendor updated successfully!" });
      setLocation(`/vendors/${vendorId}`);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update vendor", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted successfully!" });
      setLocation("/vendors");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete vendor", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      locations: locations.length > 0 ? locations : null,
    };
    
    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleLocationSelect = (location: VendorLocation | null) => {
    if (location && location.city) {
      const isDuplicate = locations.some(
        (l) => l.placeId === location.placeId || 
               (l.city === location.city && l.region === location.region && l.country === location.country)
      );
      if (!isDuplicate) {
        setLocations([...locations, location]);
      }
    }
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const toggleService = (serviceId: string) => {
    const currentIds = form.getValues("serviceIds") || [];
    const newIds = currentIds.includes(serviceId)
      ? currentIds.filter((id) => id !== serviceId)
      : [...currentIds, serviceId];
    form.setValue("serviceIds", newIds);
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = isEditMode && vendorLoading;

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: isEditMode ? "Edit Vendor" : "New Vendor" }
        ]}
      >
        <div className="p-6 max-w-3xl mx-auto">
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

  const backUrl = isEditMode && vendorId ? `/vendors/${vendorId}` : "/vendors";

  return (
    <PermissionGate 
      permission="vendors.write" 
      fallback={
        <PageLayout 
          breadcrumbs={[
            { label: "Vendors", href: "/vendors" },
            { label: isEditMode ? "Edit Vendor" : "New Vendor" }
          ]}
        >
          <NoPermissionMessage 
            title="Permission Required"
            message="You don't have permission to create or edit vendors. Please contact an administrator if you need access."
          />
        </PageLayout>
      }
    >
      <PageLayout 
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          ...(isEditMode && existingVendor ? [{ label: existingVendor.businessName, href: `/vendors/${vendorId}` }] : []),
          { label: isEditMode ? "Edit" : "New Vendor" }
        ]}
      >
      <div className="p-6 max-w-3xl">


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isEditMode ? "Edit Vendor" : "Add New Vendor"}
                </CardTitle>
                <CardDescription>
                  {isEditMode 
                    ? "Update the vendor's information."
                    : "Enter the details for the new vendor."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme Corporation" 
                          {...field} 
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="+1 (555) 123-4567" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="contact@acme.com" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-email"
                        />
                      </FormControl>
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
                          placeholder="https://www.acme.com" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Search for business address..."
                          data-testid="input-address"
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
                <CardTitle className="flex items-center gap-2">
                  Service Locations
                </CardTitle>
                <CardDescription>
                  Search and select the cities or regions where this vendor operates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlaceAutocomplete
                  value={null}
                  onSelect={handleLocationSelect}
                  placeholder="Search for a city..."
                  clearOnSelect
                  data-testid="input-location-search"
                />
                
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {locations.map((location, index) => (
                      <Badge 
                        key={location.placeId || index} 
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span>{location.displayName || `${location.city}, ${location.region}, ${location.country}`}</span>
                        <button
                          type="button"
                          onClick={() => removeLocation(index)}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                          data-testid={`button-remove-location-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Services
                </CardTitle>
                <CardDescription>
                  Click on services to toggle their assignment to this vendor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex flex-wrap gap-4">
                          {allServices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No services available. Create services in the admin panel.</p>
                          ) : (
                            allServices.map((service) => {
                              const isSelected = (field.value || []).includes(service.id);
                              const icon = getIconComponent(service.icon);
                              return (
                                <Badge
                                  key={service.id}
                                  variant={isSelected ? "default" : "outline"}
                                  size="lg"
                                  className="cursor-pointer select-none"
                                  onClick={() => toggleService(service.id)}
                                  data-testid={`badge-service-${service.id}`}
                                >
                                  {icon}
                                  {service.name}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="employeeCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Count</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 50-100" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-employee-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capabilitiesDeck"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capabilities Deck URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Link to capabilities deck" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-capabilities-deck"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diversityInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diversity Information</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Diversity certifications, minority-owned business status, etc."
                          className="min-h-[80px]"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-diversity-info"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name="chargesSalesTax"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-sales-tax"
                            />
                          </FormControl>
                          <Label htmlFor="chargesSalesTax">Charges Sales Tax</Label>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("chargesSalesTax") && (
                    <FormField
                      control={form.control}
                      name="salesTaxNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Tax Notes</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Notes about sales tax" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-sales-tax-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="isPreferred"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-preferred"
                          />
                        </FormControl>
                        <Label htmlFor="isPreferred">Preferred Vendor</Label>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this vendor..."
                          className="min-h-[100px]"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-between">
              <div className="flex gap-3">
                <Link href={backUrl}>
                  <Button 
                    type="button" 
                    variant="outline"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isPending 
                    ? (isEditMode ? "Saving..." : "Creating...") 
                    : (isEditMode ? "Save Changes" : "Create Vendor")
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
                      data-testid="button-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this vendor? This action cannot be undone and will remove all associations with services and contacts.
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
    </PermissionGate>
  );
}
