import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VendorWithRelations, VendorService, Contact, FormRequest } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnConfig } from "@/components/data-grid/types";
import { Star, ExternalLink, User, MapPin, Briefcase, CircleFadingPlus, Mail, X, Loader2, CheckCircle, FileText } from "lucide-react";

const DEFAULT_VISIBLE_COLUMNS = ["checkbox", "businessName", "services", "contacts", "locations"];

const vendorColumns: ColumnConfig<VendorWithRelations>[] = [
  {
    id: "checkbox",
    headerName: "",
    category: "Selection",
    toggleable: false,
    colDef: {
      width: 50,
      maxWidth: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressHeaderFilterButton: true,
    },
  },
  {
    id: "id",
    headerName: "ID",
    field: "id",
    category: "System",
    colDef: {
      flex: 1,
      width: 120,
      minWidth: 100,
    },
  },
  {
    id: "businessName",
    headerName: "Business Name",
    field: "businessName",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { data: VendorWithRelations }) => {
        const vendor = params.data;
        if (!vendor) return null;
        return (
          <div className="flex items-center gap-2 h-full">
            {vendor.isPreferred && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span className="text-foreground truncate">{vendor.businessName}</span>
          </div>
        );
      },
    },
  },
  {
    id: "services",
    headerName: "Services",
    field: "services",
    category: "Services",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: VendorService[] | undefined }) => {
        const services = params.value;
        if (!services || services.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {services.slice(0, 3).map((service) => (
              <Badge 
                key={service.id} 
                variant="secondary" 
                className="text-xs shrink-0"
              >
                {service.name}
              </Badge>
            ))}
            {services.length > 3 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{services.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "contacts",
    headerName: "Contacts",
    field: "contacts",
    category: "Contacts",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: Contact[] | undefined }) => {
        const contacts = params.value;
        if (!contacts || contacts.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {contacts.slice(0, 2).map((contact) => (
              <Link 
                key={contact.id} 
                href={`/contacts/${contact.id}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Badge 
                  variant="outline" 
                  className="text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  data-testid={`badge-contact-${contact.id}`}
                >
                  <User className="w-3 h-3" />
                  {contact.firstName} {contact.lastName}
                </Badge>
              </Link>
            ))}
            {contacts.length > 2 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{contacts.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "locations",
    headerName: "Locations",
    field: "locations",
    category: "Location",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: VendorWithRelations["locations"] }) => {
        const locations = params.value;
        if (!locations || locations.length === 0) return null;
        return (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            {locations.slice(0, 2).map((loc, idx) => (
              <Badge 
                key={idx} 
                variant="outline" 
                className="text-xs shrink-0 flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                {loc.displayName || `${loc.city}, ${loc.region}`}
              </Badge>
            ))}
            {locations.length > 2 && (
              <Badge variant="outline" className="text-xs shrink-0">
                +{locations.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
  },
  {
    id: "email",
    headerName: "Email",
    field: "email",
    category: "Contact",
    colDef: {
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <a 
              href={`mailto:${params.value}`}
              className="text-primary hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {params.value}
            </a>
          </div>
        );
      },
    },
  },
  {
    id: "phone",
    headerName: "Phone",
    field: "phone",
    category: "Contact",
    colDef: {
      flex: 1,
      minWidth: 130,
    },
  },
  {
    id: "website",
    headerName: "Website",
    field: "website",
    category: "Contact",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        const url = params.value.startsWith("http") ? params.value : `https://${params.value}`;
        return (
          <div className="flex items-center gap-1 h-full">
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {params.value}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        );
      },
    },
  },
  {
    id: "address",
    headerName: "Address",
    field: "address",
    category: "Location",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "employeeCount",
    headerName: "Employees",
    field: "employeeCount",
    category: "Details",
    colDef: {
      flex: 1,
      width: 110,
      minWidth: 100,
    },
  },
  {
    id: "diversityInfo",
    headerName: "Diversity",
    field: "diversityInfo",
    category: "Details",
    colDef: {
      flex: 1.5,
      minWidth: 180,
    },
  },
  {
    id: "isPreferred",
    headerName: "Preferred",
    field: "isPreferred",
    category: "Status",
    colDef: {
      flex: 1,
      width: 100,
      minWidth: 100,
      cellRenderer: (params: { value: boolean | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <Badge variant="default" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              Preferred
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "chargesSalesTax",
    headerName: "Sales Tax",
    field: "chargesSalesTax",
    category: "Financial",
    colDef: {
      flex: 1,
      width: 100,
      minWidth: 100,
      cellRenderer: (params: { value: boolean | null }) => {
        return (
          <div className="flex items-center h-full">
            <Badge variant={params.value ? "default" : "secondary"} className="text-xs">
              {params.value ? "Yes" : "No"}
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "salesTaxNotes",
    headerName: "Tax Notes",
    field: "salesTaxNotes",
    category: "Financial",
    colDef: {
      flex: 1.5,
      minWidth: 180,
    },
  },
  {
    id: "notes",
    headerName: "Notes",
    field: "notes",
    category: "Details",
    colDef: {
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="flex items-center h-full">
            <span className="truncate text-muted-foreground">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
    id: "capabilitiesDeck",
    headerName: "Capabilities Deck",
    field: "capabilitiesDeck",
    category: "Details",
    colDef: {
      flex: 1.2,
      minWidth: 150,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        const url = params.value.startsWith("http") ? params.value : `https://${params.value}`;
        return (
          <div className="flex items-center gap-1 h-full">
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              View Deck
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        );
      },
    },
  },
];

interface BatchResult {
  vendorId: string;
  vendorName: string;
  success: boolean;
  error?: string;
  updateUrl?: string;
}

export default function Vendors() {
  const [, setLocation] = useLocation();
  const [selectedLocations, setSelectedLocations] = useState<(string | number)[]>([]);
  const [selectedServices, setSelectedServices] = useState<(string | number)[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [assignFormDialogOpen, setAssignFormDialogOpen] = useState(false);
  const [selectedFormRequestId, setSelectedFormRequestId] = useState<string>("");
  const [vendorsToAssign, setVendorsToAssign] = useState<VendorWithRelations[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAuthenticated = !!user;

  const { data: vendors = [], isLoading } = useQuery<VendorWithRelations[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: formRequests = [] } = useQuery<FormRequest[]>({
    queryKey: ["/api/form-requests"],
    enabled: isAuthenticated,
  });

  const batchMutation = useMutation({
    mutationFn: async (vendorIds: string[]) => {
      const results: BatchResult[] = [];
      
      for (const vendorId of vendorIds) {
        const vendor = vendors.find(v => v.id === vendorId);
        try {
          const response = await apiRequest("POST", `/api/vendors/batch-update-links`, {
            vendorIds: [vendorId],
            sendEmail: true,
          });
          const data = response as { results: Array<{ vendorId: string; success: boolean; error?: string; updateUrl?: string }> };
          const result = data.results[0];
          results.push({
            vendorId,
            vendorName: vendor?.businessName || "Unknown",
            success: result.success,
            error: result.error,
            updateUrl: result.updateUrl,
          });
        } catch (error) {
          results.push({
            vendorId,
            vendorName: vendor?.businessName || "Unknown",
            success: false,
            error: String(error),
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      setBatchResults(results);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-update-tokens"] });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast({
          title: "Update links sent",
          description: `Successfully sent ${successCount} update link${successCount !== 1 ? "s" : ""} via email.`,
        });
      } else {
        toast({
          title: "Partial success",
          description: `Sent ${successCount} emails, ${failCount} failed.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const assignToFormMutation = useMutation({
    mutationFn: async ({ formRequestId, vendorIds }: { formRequestId: string; vendorIds: string[] }) => {
      const recipients = vendorIds.map(id => ({ type: "vendor" as const, id }));
      const res = await apiRequest("POST", `/api/form-requests/${formRequestId}/recipients`, { recipients });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-requests", selectedFormRequestId] });
      setAssignFormDialogOpen(false);
      setSelectedFormRequestId("");
      setVendorsToAssign([]);
      toast({
        title: "Vendors assigned",
        description: `Successfully added ${data.count} vendor${data.count !== 1 ? "s" : ""} to the form request.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleAssignToFormRequest = (selectedVendors: VendorWithRelations[]) => {
    setVendorsToAssign(selectedVendors);
    setAssignFormDialogOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedFormRequestId || vendorsToAssign.length === 0) return;
    const vendorIds = vendorsToAssign.map(v => v.id);
    assignToFormMutation.mutate({ formRequestId: selectedFormRequestId, vendorIds });
  };

  const { locationItems, locationLabels, serviceItems, serviceLabels } = useMemo(() => {
    const locationMap = new Map<string, string>();
    const serviceMap = new Map<string, string>();

    vendors.forEach((vendor) => {
      if (vendor.locations) {
        vendor.locations.forEach((loc) => {
          const key = `${loc.city}|${loc.region}|${loc.country}`;
          const label = loc.displayName || `${loc.city}, ${loc.region}`;
          locationMap.set(key, label);
        });
      }

      if (vendor.services) {
        vendor.services.forEach((service) => {
          serviceMap.set(service.id, service.name);
        });
      }
    });

    const sortedLocations = Array.from(locationMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
    
    const sortedServices = Array.from(serviceMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));

    return {
      locationItems: sortedLocations.map(([id, label]) => ({ id, label })),
      locationLabels: Object.fromEntries(sortedLocations),
      serviceItems: sortedServices.map(([id, label]) => ({ id, label })),
      serviceLabels: Object.fromEntries(sortedServices),
    };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    let result = vendors;

    if (selectedLocations.length > 0) {
      result = result.filter((vendor) => {
        if (!vendor.locations || vendor.locations.length === 0) return false;
        return vendor.locations.some((loc) => {
          const key = `${loc.city}|${loc.region}|${loc.country}`;
          return selectedLocations.includes(key);
        });
      });
    }

    if (selectedServices.length > 0) {
      result = result.filter((vendor) => {
        if (!vendor.services || vendor.services.length === 0) return false;
        return vendor.services.some((service) => 
          selectedServices.includes(service.id)
        );
      });
    }

    return result;
  }, [vendors, selectedLocations, selectedServices]);

  const filterControls = (
    <>
      <MultiSelect
        triggerLabel="Locations"
        triggerIcon={<MapPin className="w-4 h-4 mr-1" />}
        items={locationItems}
        itemLabels={locationLabels}
        selectedIds={selectedLocations}
        onSelectionChange={setSelectedLocations}
        showSelectAll={true}
        showReset={true}
        defaultSelectedIds={[]}
        testIdPrefix="filter-locations"
        searchPlaceholder="Search locations..."
        align="start"
      />
      <MultiSelect
        triggerLabel="Services"
        triggerIcon={<Briefcase className="w-4 h-4 mr-1" />}
        items={serviceItems}
        itemLabels={serviceLabels}
        selectedIds={selectedServices}
        onSelectionChange={setSelectedServices}
        showSelectAll={true}
        showReset={true}
        defaultSelectedIds={[]}
        testIdPrefix="filter-services"
        searchPlaceholder="Search services..."
        align="start"
      />
    </>
  );

  const selectionToolbar = (selectedVendors: VendorWithRelations[], clearSelection: () => void) => {
    const vendorsWithEmail = selectedVendors.filter(v => v.email);
    const vendorsWithoutEmail = selectedVendors.filter(v => !v.email);
    
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" data-testid="text-selection-count">
            {selectedVendors.length} vendor{selectedVendors.length !== 1 ? "s" : ""} selected
          </span>
          {vendorsWithoutEmail.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({vendorsWithoutEmail.length} without email)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && formRequests.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAssignToFormRequest(selectedVendors)}
              data-testid="button-assign-to-form"
            >
              <FileText className="w-4 h-4 mr-2" />
              Assign to Form Request
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                const vendorIds = vendorsWithEmail.map(v => v.id);
                if (vendorIds.length === 0) {
                  toast({
                    title: "No valid vendors",
                    description: "Selected vendors don't have email addresses.",
                    variant: "destructive",
                  });
                  return;
                }
                batchMutation.mutate(vendorIds);
              }}
              disabled={batchMutation.isPending || vendorsWithEmail.length === 0}
              data-testid="button-send-update-links"
            >
              {batchMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Update Links ({vendorsWithEmail.length})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            data-testid="button-clear-selection"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  };

  const draftFormRequests = formRequests.filter(fr => fr.status === "draft");

  return (
    <PageLayout 
      breadcrumbs={[{ label: "Vendors" }]}
      primaryAction={{
        label: "New Vendor",
        href: "/vendors/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <DataGridPage
        queryKey="/api/vendors"
        columns={vendorColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          "businessName",
          "email",
          "phone",
          "website",
          "address",
          "diversityInfo",
        ]}
        searchPlaceholder="Search vendors..."
        onRowClick={(vendor) => setLocation(`/vendors/${vendor.id}`)}
        getRowId={(vendor) => vendor.id || ""}
        emptyMessage="No vendors found"
        emptyDescription="Your vendor directory is empty."
        headerContent={filterControls}
        externalData={filteredVendors}
        externalLoading={isLoading}
        toolbarActions={<></>}
        enableRowSelection={isAdmin}
        selectionToolbar={selectionToolbar}
      />

      <Dialog open={assignFormDialogOpen} onOpenChange={setAssignFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vendors to Form Request</DialogTitle>
            <DialogDescription>
              Select a form request to add {vendorsToAssign.length} vendor{vendorsToAssign.length !== 1 ? "s" : ""} as recipients.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedFormRequestId} onValueChange={setSelectedFormRequestId}>
              <SelectTrigger data-testid="select-form-request">
                <SelectValue placeholder="Select a form request" />
              </SelectTrigger>
              <SelectContent>
                {draftFormRequests.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No draft form requests available
                  </div>
                ) : (
                  draftFormRequests.map((fr) => (
                    <SelectItem key={fr.id} value={fr.id} data-testid={`select-form-request-${fr.id}`}>
                      {fr.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignFormDialogOpen(false);
                setSelectedFormRequestId("");
                setVendorsToAssign([]);
              }}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssign}
              disabled={!selectedFormRequestId || assignToFormMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignToFormMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Assign Vendors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
