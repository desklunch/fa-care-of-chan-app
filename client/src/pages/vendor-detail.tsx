import { useState, useRef, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  Contact,
  LinkIcon,
  Copy,
  Check,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import type { VendorWithRelations, VendorService } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";

type EditableFieldType = "text" | "textarea" | "switch";

interface EditableFieldRowProps {
  label: string;
  value: string | null | undefined;
  field: string;
  testId?: string;
  type?: EditableFieldType;
  onSave: (field: string, value: unknown) => void;
  displayValue?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  valueClassName?: string;
  booleanValue?: boolean;
}

function EditableFieldRow({
  label,
  value,
  field,
  testId,
  type = "text",
  onSave,
  displayValue,
  placeholder = "Not set",
  disabled = false,
  valueClassName,
  booleanValue = false,
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [editBoolean, setEditBoolean] = useState(booleanValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "");
      setEditBoolean(booleanValue);
    }
  }, [value, booleanValue, isEditing]);

  const handleSave = () => {
    if (type === "switch") {
      onSave(field, editBoolean);
    } else {
      onSave(field, editValue || null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setEditBoolean(booleanValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleDoubleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const renderEditor = () => {
    switch (type) {
      case "textarea":
        return (
          <div className="flex flex-col gap-2 w-full">
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="min-h-[100px] text-base"
              data-testid={`input-${field}`}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case "switch":
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-3">
              <Switch
                checked={editBoolean}
                onCheckedChange={setEditBoolean}
                data-testid={`switch-${field}`}
              />
              <span className="text-sm">{editBoolean ? "Yes" : "No"}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col gap-2 w-full">
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-sm"
              data-testid={`input-${field}`}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancel} data-testid={`button-cancel-${field}`}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} data-testid={`button-save-${field}`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="group flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          renderEditor()
        ) : (
          <div className="flex items-start gap-2 group">
            <div className="flex-1">
              {displayValue !== undefined ? displayValue : (
                value ? (
                  <span className={cn("whitespace-pre-wrap", valueClassName)}>{value}</span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              )}
            </div>
            {!disabled && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => setIsEditing(true)}
                data-testid={`button-edit-${field}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

function EditableTitle({
  value,
  onSave,
  testId,
  disabled = false,
}: {
  value: string;
  onSave: (value: string) => void;
  testId?: string;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xl font-semibold flex-1 bg-transparent border-b-2 border-primary outline-none"
          data-testid={`input-${testId}`}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditValue(value);
            setIsEditing(false);
          }}
          data-testid={`button-cancel-${testId}`}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSave}
          data-testid={`button-save-${testId}`}
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2"
      onDoubleClick={() => !disabled && setIsEditing(true)}
    >
      <h1
        className="text-xl font-semibold"
        data-testid={testId}
      >
        {value}
      </h1>
      {!disabled && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => setIsEditing(true)}
          data-testid={`button-edit-${testId}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface ServicesEditorProps {
  vendorServices: VendorService[];
  allServices: VendorService[];
  onSave: (serviceIds: string[]) => void;
  disabled?: boolean;
}

function ServicesEditor({ vendorServices, allServices, onSave, disabled = false }: ServicesEditorProps) {
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
          <Button size="sm" variant="ghost" onClick={handleCancel} data-testid="button-cancel-services">
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} data-testid="button-save-services">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="group flex items-start gap-2"
      onDoubleClick={() => !disabled && setIsEditing(true)}
    >
      <div className="flex flex-wrap gap-2 flex-1">
        {vendorServices.length > 0 ? (
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
      {!disabled && (
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
    updateMutation.mutate({ [field]: value });
  };

  const handleServicesSave = (serviceIds: string[]) => {
    updateMutation.mutate({ serviceIds });
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
            label: "Generate Update Link",
            icon: LinkIcon,
            onClick: () => generateLinkMutation.mutate(),
          },
        ] : undefined}
      >
        <div className="p-4 md:p-6 max-w-4xl space-y-6">
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-3">
                <PermissionGate resource="vendors" action="write" fallback={
                  <h1 className="text-xl font-semibold" data-testid="text-vendor-name">
                    {vendor.businessName}
                  </h1>
                }>
                  <EditableTitle
                    value={vendor.businessName}
                    onSave={(val) => handleFieldSave("businessName", val)}
                    testId="text-vendor-name"
                    disabled={!canEdit}
                  />
                </PermissionGate>
                {vendor.isPreferred && (
                  <Badge variant="secondary" data-testid="badge-preferred">
                    Preferred
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <PermissionGate resource="vendors" action="write" fallback={
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
                  <EditableFieldRow
                    label="Email"
                    value={vendor.email}
                    field="email"
                    testId="row-email"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    displayValue={vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                        {vendor.email}
                      </a>
                    ) : undefined}
                  />
                  <EditableFieldRow
                    label="Phone"
                    value={vendor.phone}
                    field="phone"
                    testId="row-phone"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    displayValue={vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="hover:underline">
                        {vendor.phone}
                      </a>
                    ) : undefined}
                  />
                  <EditableFieldRow
                    label="Website"
                    value={vendor.website}
                    field="website"
                    testId="row-website"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
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
                  <EditableFieldRow
                    label="Address"
                    value={vendor.address}
                    field="address"
                    testId="row-address"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                  />
                  <EditableFieldRow
                    label="Capabilities Deck"
                    value={vendor.capabilitiesDeck}
                    field="capabilitiesDeck"
                    testId="row-capabilities"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
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
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate resource="vendors" action="write" fallback={
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
                />
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate resource="vendors" action="write" fallback={
                <div className="space-y-0 divide-y divide-border/50">
                  <FieldRow label="Employee Count" testId="row-employee-count">
                    {vendor.employeeCount || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                  <FieldRow label="Preferred Vendor" testId="row-preferred">
                    <Badge variant={vendor.isPreferred ? "default" : "outline"}>
                      {vendor.isPreferred ? "Yes" : "No"}
                    </Badge>
                  </FieldRow>
                  <FieldRow label="Charges Sales Tax" testId="row-sales-tax">
                    <Badge variant={vendor.chargesSalesTax ? "default" : "outline"}>
                      {vendor.chargesSalesTax ? "Yes" : "No"}
                    </Badge>
                  </FieldRow>
                  <FieldRow label="Sales Tax Notes" testId="row-tax-notes">
                    {vendor.salesTaxNotes || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                  <FieldRow label="Diversity Information" testId="row-diversity">
                    {vendor.diversityInfo || <span className="text-muted-foreground">Not set</span>}
                  </FieldRow>
                </div>
              }>
                <div className="space-y-0 divide-y divide-border/50">
                  <EditableFieldRow
                    label="Employee Count"
                    value={vendor.employeeCount?.toString() || null}
                    field="employeeCount"
                    testId="row-employee-count"
                    onSave={(field, val) => handleFieldSave(field, val ? parseInt(val as string, 10) : null)}
                    disabled={!canEdit}
                  />
                  <EditableFieldRow
                    label="Preferred Vendor"
                    value={null}
                    field="isPreferred"
                    testId="row-preferred"
                    type="switch"
                    booleanValue={vendor.isPreferred || false}
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    displayValue={
                      <Badge variant={vendor.isPreferred ? "default" : "outline"}>
                        {vendor.isPreferred ? "Yes" : "No"}
                      </Badge>
                    }
                  />
                  <EditableFieldRow
                    label="Charges Sales Tax"
                    value={null}
                    field="chargesSalesTax"
                    testId="row-sales-tax"
                    type="switch"
                    booleanValue={vendor.chargesSalesTax || false}
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                    displayValue={
                      <Badge variant={vendor.chargesSalesTax ? "default" : "outline"}>
                        {vendor.chargesSalesTax ? "Yes" : "No"}
                      </Badge>
                    }
                  />
                  <EditableFieldRow
                    label="Sales Tax Notes"
                    value={vendor.salesTaxNotes}
                    field="salesTaxNotes"
                    testId="row-tax-notes"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                  />
                  <EditableFieldRow
                    label="Diversity Information"
                    value={vendor.diversityInfo}
                    field="diversityInfo"
                    testId="row-diversity"
                    type="textarea"
                    onSave={handleFieldSave}
                    disabled={!canEdit}
                  />
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate resource="vendors" action="write" fallback={
                <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                  {vendor.notes || <span className="text-muted-foreground">No notes</span>}
                </p>
              }>
                <EditableFieldRow
                  label=""
                  value={vendor.notes}
                  field="notes"
                  testId="row-notes"
                  type="textarea"
                  onSave={handleFieldSave}
                  disabled={!canEdit}
                  placeholder="Add notes about this vendor..."
                />
              </PermissionGate>
            </CardContent>
          </Card>

          {vendor.locations && vendor.locations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {vendor.locations.map((location, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm p-2 rounded-md bg-accent/30"
                      data-testid={`location-${index}`}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>
                        {location.displayName || `${location.city}, ${location.region}, ${location.country}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
    </>
  );
}
