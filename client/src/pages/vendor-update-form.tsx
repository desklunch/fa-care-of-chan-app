import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, MapPin, Briefcase, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { PlaceAutocomplete } from "@/components/ui/place-autocomplete";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { VendorWithServices, VendorService, VendorLocation } from "@shared/schema";
import { publicVendorUpdateSchema } from "@shared/schema";
import { z } from "zod";

type FormData = z.infer<typeof publicVendorUpdateSchema>;

function getIconComponent(iconName: string | null | undefined) {
  if (!iconName) return null;
  const Icon = (LucideIcons as Record<string, any>)[iconName];
  return Icon ? <Icon className="" /> : null;
}

export default function VendorUpdateForm() {
  const [match, params] = useRoute<{ token: string }>("/vendor-update/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [locations, setLocations] = useState<VendorLocation[]>([]);

  const { data: vendor, isLoading, error } = useQuery<VendorWithServices>({
    queryKey: ["/api/vendor-update", token],
    enabled: !!token,
  });

  const { data: allServices = [] } = useQuery<VendorService[]>({
    queryKey: ["/api/vendor-services"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(publicVendorUpdateSchema),
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
      locations: [],
      serviceIds: [],
    },
  });

  useEffect(() => {
    if (vendor) {
      const serviceIds = vendor.services?.map((s) => s.id) || [];
      form.reset({
        businessName: vendor.businessName,
        address: vendor.address || "",
        phone: vendor.phone || "",
        email: vendor.email || "",
        website: vendor.website || "",
        capabilitiesDeck: vendor.capabilitiesDeck || "",
        employeeCount: vendor.employeeCount || "",
        diversityInfo: vendor.diversityInfo || "",
        chargesSalesTax: vendor.chargesSalesTax || false,
        salesTaxNotes: vendor.salesTaxNotes || "",
        locations: vendor.locations || [],
        serviceIds,
      });
      setLocations((vendor.locations as VendorLocation[]) || []);
    }
  }, [vendor, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", `/api/vendor-update/${token}`, data);
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({ title: "Information updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update information", 
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
    updateMutation.mutate(submitData as FormData);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading your information...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Invalid or Expired</h2>
            <p className="text-muted-foreground mb-4">
              This update link is no longer valid. It may have expired or already been used.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the team to request a new update link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Information Updated</h2>
            <p className="text-muted-foreground">
              Thank you! Your vendor information has been successfully updated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Update Your Vendor Information</h1>
          <p className="text-muted-foreground">
            Please review and update your business details below.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Your primary business contact details.
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
                          placeholder="Your Business Name" 
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
                          placeholder="contact@yourbusiness.com" 
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
                          placeholder="https://www.yourbusiness.com" 
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
                  <MapPin className="h-5 w-5" />
                  Service Locations
                </CardTitle>
                <CardDescription>
                  Search and select the cities or regions where you provide services.
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
                  <Briefcase className="h-5 w-5" />
                  Services *
                </CardTitle>
                <CardDescription>
                  Select all services you provide. At least one is required.
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
                            <p className="text-sm text-muted-foreground">Loading services...</p>
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
                <CardDescription>
                  Additional information about your business.
                </CardDescription>
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
                          placeholder="Link to your capabilities presentation" 
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
                          <Label>Charges Sales Tax</Label>
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
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={updateMutation.isPending}
                data-testid="button-submit"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
