import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Contact,
  LinkIcon,
  Copy,
  Check,
  Loader2,
  Pencil,
  X,
  PenBox,
  Trash2,
} from "lucide-react";
import type { VendorWithRelations, VendorService } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { PermissionGate } from "@/components/permission-gate";
import {
  EditableField,
  EditableTitle,
  FieldRow,
  useFieldMutation,
} from "@/components/inline-edit";

interface ServicesEditorProps {
  vendorServices: VendorService[];
  allServices: VendorService[];
  onSave: (serviceIds: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function ServicesEditor({ vendorServices, allServices, onSave, disabled = false, isLoading = false }: ServicesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(vendorServices.map(s => s.id));

  useEffect(() => {
    if (!isEditing) {
      setSelectedIds(vendorServices.map(s => s.id));
    }
  }, [vendorServices, isEditing]);

  const toggleService = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(selectedIds);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedIds(vendorServices.map(s => s.id));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {allServices.map((service) => (
            <Badge
              key={service.id}
              variant={selectedIds.includes(service.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleService(service.id)}
              data-testid={`badge-toggle-service-${service.id}`}
            >
              {service.name}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isLoading} data-testid="button-cancel-services">
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading} data-testid="button-save-services">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group flex items-start gap-2"
      onDoubleClick={() => !disabled && !isLoading && setIsEditing(true)}
    >
      <div className="flex flex-wrap gap-2 flex-1">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Saving...</span>
          </div>
        ) : vendorServices.length > 0 ? (
          vendorServices.map((service) => (
            <Badge
              key={service.id}
              variant="outline"
              data-testid={`badge-service-${service.id}`}
            >
              {service.name}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">No services assigned</span>
        )}
      </div>
      {!disabled && !isLoading && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => setIsEditing(true)}
          data-testid="button-edit-services"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "manager";
  
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: vendor, isLoading, error } = useQuery<VendorWithRelations>({
    queryKey: ["/api/vendors", id],
    enabled: !!id,
  });

  const { data: allServices = [] } = useQuery<VendorService[]>({
    queryKey: ["/api/vendor-services"],
  });

  usePageTitle(vendor?.businessName || "Vendor");

  const {
    saveField,
    isFieldLoading,
    getFieldError,
  } = useFieldMutation({
    entityType: "vendors",
    entityId: id || "",
    queryKey: ["/api/vendors", id],
    additionalQueryKeys: [["/api/vendors"]],
    onSuccess: () => {
      toast({ title: "Vendor updated" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      return apiRequest("PATCH", `/api/vendors/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Vendor updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    saveField(field, value);
  };

  const handleServicesSave = (serviceIds: string[]) => {
    updateMutation.mutate({ serviceIds });
  };

  const handleEmployeeCountSave = (field: string, value: unknown) => {
    saveField(field, value ? parseInt(value as string, 10) : null);
  };
  
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/vendors/${id}/generate-update-link`);
      return response.json();
    },
    onSuccess: (data: { url: string; expiresAt: string }) => {
      setGeneratedUrl(data.url);
      setExpiresAt(data.expiresAt);
      setShowLinkDialog(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate update link",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor deleted" });
      setLocation("/vendors");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCopyLink = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleCloseDialog = () => {
    setShowLinkDialog(false);
    setGeneratedUrl(null);
    setExpiresAt(null);
    setCopied(false);
  };

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !vendor) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Vendor Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The vendor you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation("/vendors")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        breadcrumbs={[
          { label: "Vendors", href: "/vendors" },
          { label: vendor.businessName },
        ]}
        additionalActions={canEdit ? [
          {
            label: "Edit Vendor",
            icon: PenBox,
            onClick: () => setLocation(`/vendors/${id}/edit`),
          },
          {
            label: "Generate Update Link",
            icon: LinkIcon,
            onClick: () => generateLinkMutation.mutate(),
          },
          {
            label: "Delete Vendor",
            icon: Trash2,
            onClick: () => setShowDeleteDialog(true),
            variant: "destructive" as const,
          },
        ] : undefined}
      >
        <div className="p-4 md:p-6 max-w-4xl space-y-6">
          <div className="space-y-1">
            {vendor.isPreferred && (
              <Badge variant="secondary" data-testid="badge-preferred">
                Preferred
              </Badge>
            )}
            <PermissionGate permission="vendors.write" fallback={
              <h1 className="text-2xl font-bold" data-testid="text-vendor-name">
                {vendor.businessName}
              </h1>
            }>
              <EditableTitle
                value={vendor.businessName}
                onSave={(val) => handleFieldSave("businessName", val)}
                testId="text-vendor-name"
                disabled={!canEdit}
                isLoading={isFieldLoading("businessName")}
                error={getFieldError("businessName")}
                validation={{ required: true }}
              />
            </PermissionGate>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-0 divide-y divide-border/50">
                <FieldRow label="Services" testId="row-services">
                  <PermissionGate permission="vendors.write" fallback={
                    <div className="flex flex-wrap gap-2">
                      {vendor.services && vendor.services.length > 0 ? (
                        vendor.services.map((service) => (
                          <Badge
                            key={service.id}
                            variant="outline"
                            data-testid={`badge-service-${service.id}`}
                          >
                            {service.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No services assigned</span>
                      )}
                    </div>
                  }>
                    <ServicesEditor
                      vendorServices={vendor.services || []}
                      allServices={allServices}
                      onSave={handleServicesSave}
                      disabled={!canEdit}
                      isLoading={updateMutation.isPending}
                    />
                  </PermissionGate>
                </FieldRow>
                {vendor.locations && vendor.locations.length > 0 && (
                  <FieldRow label="Service Locations" testId="row-locations">
                    <div className="flex flex-wrap gap-2">
                      {vendor.locations.map((location, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          data-testid={`badge-location-${index}`}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {location.displayName || `${location.city}, ${location.region}, ${location.country}`}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
              </div>
              <PermissionGate permission="vendors.write" fallback={
                <div className="space-y-0 divide-y divide-border/50">
                  <FieldRow label="Email" testId="row-email">
                    {vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                        {vendor.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Phone" testId="row-phone">
                    {vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="hover:underline">
                        {vendor.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Website" testId="row-website">
                    {vendor.website ? (
                      <a 
                        href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {vendor.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Address" testId="row-address">
                    {vendor.address || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                </div>
              }>
                <div className="space-y-0 divide-y divide-border/50">
                  <EditableField
                    label="Email"
                    value={vendor.email}
                    field="email"
                    testId="row-email"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("email")}
                    error={getFieldError("email")}
                    displayValue={vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                        {vendor.email}
                      </a>
                    ) : undefined}
                  />
                  <EditableField
                    label="Phone"
                    value={vendor.phone}
                    field="phone"
                    testId="row-phone"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("phone")}
                    error={getFieldError("phone")}
                    displayValue={vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="hover:underline">
                        {vendor.phone}
                      </a>
                    ) : undefined}
                  />
                  <EditableField
                    label="Website"
                    value={vendor.website}
                    field="website"
                    testId="row-website"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("website")}
                    error={getFieldError("website")}
                    displayValue={vendor.website ? (
                      <a 
                        href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {vendor.website}
                      </a>
                    ) : undefined}
                  />
                  <EditableField
                    label="Address"
                    value={vendor.address}
                    field="address"
                    testId="row-address"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("address")}
                    error={getFieldError("address")}
                  />
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate permission="vendors.write" fallback={
                <div className="space-y-0 divide-y divide-border/50">
                  <FieldRow label="Deck" testId="row-capabilities">
                    {vendor.capabilitiesDeck ? (
                      <a 
                        href={vendor.capabilitiesDeck.startsWith("http") ? vendor.capabilitiesDeck : `https://${vendor.capabilitiesDeck}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Deck
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </FieldRow>
                  <FieldRow label="Employees" testId="row-employee-count">
                    {vendor.employeeCount || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                  <FieldRow label="Sales Tax" testId="row-sales-tax">
                    <Badge variant={vendor.chargesSalesTax ? "default" : "outline"}>
                      {vendor.chargesSalesTax ? "Yes" : "No"}
                    </Badge>
                  </FieldRow>
                  <FieldRow label="Tax Notes" testId="row-tax-notes">
                    {vendor.salesTaxNotes || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                  <FieldRow label="Diversity" testId="row-diversity">
                    {vendor.diversityInfo || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                </div>
              }>
                <div className="space-y-0 divide-y divide-border/50">
                  <EditableField
                    label="Deck"
                    value={vendor.capabilitiesDeck}
                    field="capabilitiesDeck"
                    testId="row-capabilities"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("capabilitiesDeck")}
                    error={getFieldError("capabilitiesDeck")}
                    displayValue={vendor.capabilitiesDeck ? (
                      <a 
                        href={vendor.capabilitiesDeck.startsWith("http") ? vendor.capabilitiesDeck : `https://${vendor.capabilitiesDeck}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Deck
                      </a>
                    ) : undefined}
                  />
                  <EditableField
                    label="Employees"
                    value={vendor.employeeCount?.toString() || null}
                    field="employeeCount"
                    testId="row-employee-count"
                    onSave={handleEmployeeCountSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("employeeCount")}
                    error={getFieldError("employeeCount")}
                  />
                  <EditableField
                    label="Sales Tax"
                    value={null}
                    field="chargesSalesTax"
                    testId="row-sales-tax"
                    type="switch"
                    booleanValue={vendor.chargesSalesTax || false}
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("chargesSalesTax")}
                    error={getFieldError("chargesSalesTax")}
                    displayValue={
                      <Badge variant={vendor.chargesSalesTax ? "default" : "outline"}>
                        {vendor.chargesSalesTax ? "Yes" : "No"}
                      </Badge>
                    }
                  />
                  <EditableField
                    label="Tax Notes"
                    value={vendor.salesTaxNotes}
                    field="salesTaxNotes"
                    testId="row-tax-notes"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("salesTaxNotes")}
                    error={getFieldError("salesTaxNotes")}
                  />
                  <EditableField
                    label="Diversity"
                    value={vendor.diversityInfo}
                    field="diversityInfo"
                    testId="row-diversity"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("diversityInfo")}
                    error={getFieldError("diversityInfo")}
                  />
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate permission="vendors.write" fallback={
                <div className="space-y-0 divide-y divide-border/50">
                  <FieldRow label="Preferred" testId="row-preferred">
                    <Badge variant={vendor.isPreferred ? "default" : "outline"}>
                      {vendor.isPreferred ? "Yes" : "No"}
                    </Badge>
                  </FieldRow>
                  <FieldRow label="Notes" testId="row-notes">
                    {vendor.notes ? (
                      <span className="whitespace-pre-wrap">{vendor.notes}</span>
                    ) : (
                      <span className="text-muted-foreground">No notes</span>
                    )}
                  </FieldRow>
                </div>
              }>
                <div className="space-y-0 divide-y divide-border/50">
                  <EditableField
                    label="Preferred"
                    value={null}
                    field="isPreferred"
                    testId="row-preferred"
                    type="switch"
                    booleanValue={vendor.isPreferred || false}
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("isPreferred")}
                    error={getFieldError("isPreferred")}
                    displayValue={
                      <Badge variant={vendor.isPreferred ? "default" : "outline"}>
                        {vendor.isPreferred ? "Yes" : "No"}
                      </Badge>
                    }
                  />
                  <EditableField
                    label="Notes"
                    value={vendor.notes}
                    field="notes"
                    testId="row-notes"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    isLoading={isFieldLoading("notes")}
                    error={getFieldError("notes")}
                    placeholder="Add notes about this vendor..."
                  />
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          {vendor.contacts && vendor.contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Contact className="h-5 w-5" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendor.contacts.map((contact) => {
                    const contactName = `${contact.firstName} ${contact.lastName}`;
                    const contactInitials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
                    return (
                      <Link
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover-elevate border border-border"
                        data-testid={`link-contact-${contact.id}`}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-sm font-medium">
                            {contactInitials}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{contactName}</p>
                          {contact.jobTitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.jobTitle}
                            </p>
                          )}
                        </div>
                        {contact.emailAddresses && contact.emailAddresses.length > 0 && (
                          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-32">
                            {contact.emailAddresses[0]}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageLayout>

      <Dialog open={showLinkDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Update Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with the vendor so they can update their information. 
              The link is single-use and will expire in 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={generatedUrl || ""}
                readOnly
                className="font-mono text-sm"
                data-testid="input-update-link"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {expiresAt && (
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(expiresAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{vendor.businessName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
