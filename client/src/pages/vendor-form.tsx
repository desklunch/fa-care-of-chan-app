import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
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
import { ArrowLeft, Save, Trash2, Plus, X, Building2, MapPin } from "lucide-react";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { MultiSelect } from "@/components/ui/multi-select";
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

const formSchema = insertVendorSchema;

type FormData = z.infer<typeof formSchema>;

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

  const serviceItems = allServices.map((service) => ({
    id: service.id,
    label: service.name,
  }));

  const serviceLabels = allServices.reduce((acc, service) => {
    acc[service.id] = service.name;
    return acc;
  }, {} as Record<string, string>);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
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

  const addLocation = () => {
    setLocations([...locations, { city: "", region: "", country: "" }]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, location: VendorLocation | null) => {
    if (location) {
      const updated = [...locations];
      updated[index] = location;
      setLocations(updated);
    }
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
    <PageLayout 
      breadcrumbs={[
        { label: "Vendors", href: "/vendors" },
        ...(isEditMode && existingVendor ? [{ label: existingVendor.businessName, href: `/vendors/${vendorId}` }] : []),
        { label: isEditMode ? "Edit" : "New Vendor" }
      ]}
    >
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

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
                        <Textarea 
                          placeholder="123 Business Street, Suite 100, City, State 12345"
                          className="min-h-[80px]"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-address"
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
                  <MapPin className="h-5 w-5" />
                  Service Locations
                </CardTitle>
                <CardDescription>
                  Add the cities or regions where this vendor operates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {locations.map((location, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <PlaceAutocomplete
                        value={location}
                        onSelect={(loc) => updateLocation(index, loc)}
                        placeholder="Search for a city..."
                        data-testid={`input-location-${index}`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLocation(index)}
                      data-testid={`button-remove-location-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-2">
                    {locations.filter(l => l.city).map((location, index) => (
                      <Badge key={index} variant="secondary">
                        {location.displayName || `${location.city}, ${location.region}, ${location.country}`}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLocation}
                  data-testid="button-add-location"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
                <CardDescription>
                  Select the services this vendor provides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiSelect
                          triggerLabel="Select Services"
                          placeholder="No services selected"
                          items={serviceItems}
                          itemLabels={serviceLabels}
                          selectedIds={field.value || []}
                          onSelectionChange={(ids) => field.onChange(ids as string[])}
                          showSearch
                          searchPlaceholder="Search services..."
                          testIdPrefix="services"
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
                <CardTitle>Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

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
  );
}
