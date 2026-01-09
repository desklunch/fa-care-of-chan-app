import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Loader2,
  UserPlus,
  Trash2,
  Handshake,
  Pencil,
} from "lucide-react";
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
import { SiInstagram, SiLinkedin } from "react-icons/si";
import type { Contact, Client, Vendor, DealWithRelations, DealStatus } from "@shared/schema";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";
import { ClientLinkSearch, VendorLinkSearch } from "@/components/client-link-search";
import { PermissionGate } from "@/components/permission-gate";
import {
  EditableField,
  FieldRow,
  useFieldMutation,
} from "@/components/inline-edit";

const statusColors: Record<
  DealStatus,
  {
    variant: "default" | "secondary" | "outline" | "destructive";
    className?: string;
  }
> = {
  Prospecting: { variant: "outline" },
  "Warm Lead": { variant: "secondary" },
  Proposal: {
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  Feedback: { variant: "secondary" },
  Contracting: {
    variant: "secondary",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  "In Progress": {
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  "Final Invoicing": { variant: "default" },
  Complete: {
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  "No-Go": { variant: "destructive" },
  Canceled: { variant: "outline", className: "opacity-50" },
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showVendorSearch, setShowVendorSearch] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const {
    data: contact,
    isLoading,
    error,
  } = useQuery<Contact>({
    queryKey: ["/api/contacts", id],
    enabled: !!id,
  });

  const { data: linkedClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/contacts", id, "clients"],
    enabled: !!id,
  });

  const { data: linkedVendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/contacts", id, "vendors"],
    enabled: !!id,
  });

  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/contacts", id, "deals"],
    enabled: !!id,
  });

  const [localLinkedClients, setLocalLinkedClients] = useState<Client[]>([]);
  const [localLinkedVendors, setLocalLinkedVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    setLocalLinkedClients(linkedClients);
  }, [linkedClients]);

  useEffect(() => {
    setLocalLinkedVendors(linkedVendors);
  }, [linkedVendors]);

  const {
    saveField,
    isFieldLoading,
    getFieldError,
  } = useFieldMutation({
    entityType: "contacts",
    entityId: id || "",
    queryKey: ["/api/contacts", id],
    additionalQueryKeys: [["/api/contacts"]],
    onSuccess: () => {
      toast({ title: "Contact updated" });
    },
  });

  const unlinkClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id, "clients"] });
    },
  });

  const unlinkVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", id, "vendors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "The contact has been removed.",
      });
      setLocation("/contacts");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    saveField(field, value);
  };

  const handleLinkClient = (client: Client) => {
    setLocalLinkedClients((prev) => [...prev, client]);
    setShowClientSearch(false);
  };

  const handleUnlinkClient = (clientId: string) => {
    setLocalLinkedClients((prev) => prev.filter((c) => c.id !== clientId));
    unlinkClientMutation.mutate(clientId);
  };

  const handleLinkVendor = (vendor: Vendor) => {
    setLocalLinkedVendors((prev) => [...prev, vendor]);
    setShowVendorSearch(false);
  };

  const handleUnlinkVendor = (vendorId: string) => {
    setLocalLinkedVendors((prev) => prev.filter((v) => v.id !== vendorId));
    unlinkVendorMutation.mutate(vendorId);
  };

  usePageTitle(
    contact ? `${contact.firstName} ${contact.lastName}` : "Contact",
  );

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (error || !contact) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: "Not Found" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Contact not found</p>
          <Button variant="outline" onClick={() => setLocation("/contacts")}>
            Back to Contacts
          </Button>
        </div>
      </PageLayout>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: fullName },
      ]}
      primaryAction={{
        label: "Edit Contact",
        href: `/contacts/${id}/edit`,
        icon: Pencil,
      }}
      additionalActions={[
        {
          label: "Delete Contact",
          onClick: () => setShowDeleteDialog(true),
          icon: Trash2,
          variant: "destructive",
        },
      ]}
    >
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold" data-testid="text-contact-name">
          {fullName}
        </h1>

        <Card>
          <CardContent className="py-2">
            <EditableField
              label="First Name"
              value={contact.firstName}
              field="firstName"
              testId="field-contact-first-name"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("firstName")}
              error={getFieldError("firstName")}
              placeholder="Enter first name"
              validation={{ required: true }}
            />
            <EditableField
              label="Last Name"
              value={contact.lastName}
              field="lastName"
              testId="field-contact-last-name"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("lastName")}
              error={getFieldError("lastName")}
              placeholder="Enter last name"
              validation={{ required: true }}
            />
            {localLinkedClients.length > 0 ? (
              <>
                {localLinkedClients.map((client, index) => (
                  <FieldRow
                    key={client.id}
                    label={index === 0 ? "Client" : ""}
                    testId={`field-linked-client-${client.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-primary font-medium hover:underline"
                        data-testid={`link-client-${client.id}`}
                      >
                        {client.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkClient(client.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        data-testid={`button-unlink-client-${client.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </FieldRow>
                ))}
                {showClientSearch ? (
                  <FieldRow label="" testId="field-client-search">
                    <ClientLinkSearch
                      contactId={id!}
                      linkedClients={localLinkedClients}
                      onLink={handleLinkClient}
                      onUnlink={handleUnlinkClient}
                      showLinkedClients={false}
                      autoFocus
                      onClose={() => setShowClientSearch(false)}
                    />
                  </FieldRow>
                ) : (
                  <FieldRow label="" testId="field-add-another-client">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClientSearch(true)}
                      className="h-auto px-2 text-muted-foreground hover:text-primary"
                      data-testid="button-add-another-client"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add another client
                    </Button>
                  </FieldRow>
                )}
              </>
            ) : showClientSearch ? (
              <FieldRow label="Client" testId="field-client-search">
                <ClientLinkSearch
                  contactId={id!}
                  linkedClients={localLinkedClients}
                  onLink={handleLinkClient}
                  onUnlink={handleUnlinkClient}
                  showLinkedClients={false}
                  autoFocus
                  onClose={() => setShowClientSearch(false)}
                />
              </FieldRow>
            ) : (
              <FieldRow label="Client" testId="field-linked-client-empty">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClientSearch(true)}
                  className="h-auto px-2 text-muted-foreground hover:text-primary"
                  data-testid="button-link-client-inline"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Client Company
                </Button>
              </FieldRow>
            )}

            {localLinkedVendors.length > 0 ? (
              <>
                {localLinkedVendors.map((vendor, index) => (
                  <FieldRow
                    key={vendor.id}
                    label={index === 0 ? "Vendor" : ""}
                    testId={`field-linked-vendor-${vendor.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="text-primary font-medium hover:underline"
                        data-testid={`link-vendor-${vendor.id}`}
                      >
                        {vendor.businessName}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkVendor(vendor.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        data-testid={`button-unlink-vendor-${vendor.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </FieldRow>
                ))}
                {showVendorSearch ? (
                  <FieldRow label="" testId="field-vendor-search">
                    <VendorLinkSearch
                      contactId={id!}
                      linkedVendors={localLinkedVendors}
                      onLink={handleLinkVendor}
                      onUnlink={handleUnlinkVendor}
                      showLinkedVendors={false}
                      autoFocus
                      onClose={() => setShowVendorSearch(false)}
                    />
                  </FieldRow>
                ) : (
                  <FieldRow label="" testId="field-add-another-vendor">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVendorSearch(true)}
                      className="h-auto px-2 text-muted-foreground hover:text-primary"
                      data-testid="button-add-another-vendor"
                    >
                      <Handshake className="h-4 w-4" />
                      Add another vendor
                    </Button>
                  </FieldRow>
                )}
              </>
            ) : showVendorSearch ? (
              <FieldRow label="Vendor" testId="field-vendor-search">
                <VendorLinkSearch
                  contactId={id!}
                  linkedVendors={localLinkedVendors}
                  onLink={handleLinkVendor}
                  onUnlink={handleUnlinkVendor}
                  showLinkedVendors={false}
                  autoFocus
                  onClose={() => setShowVendorSearch(false)}
                />
              </FieldRow>
            ) : (
              <FieldRow label="Vendor" testId="field-linked-vendor-empty">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVendorSearch(true)}
                  className="h-auto px-2 text-muted-foreground hover:text-primary"
                  data-testid="button-link-vendor-inline"
                >
                  <Handshake className="h-4 w-4" />
                  Add Vendor
                </Button>
              </FieldRow>
            )}

            <EditableField
              label="Job Title"
              value={contact.jobTitle}
              field="jobTitle"
              testId="field-contact-job-title"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("jobTitle")}
              error={getFieldError("jobTitle")}
            />

            <EditableField
              label="Email"
              value={null}
              field="emailAddresses"
              testId="field-contact-email"
              type="array"
              arrayValue={contact.emailAddresses || []}
              onSave={handleFieldSave}
              isLoading={isFieldLoading("emailAddresses")}
              error={getFieldError("emailAddresses")}
              displayValue={
                contact.emailAddresses && contact.emailAddresses.length > 0 ? (
                  <div className="space-y-1">
                    {contact.emailAddresses.map((email, index) => (
                      <span key={index}>{email}</span>
                    ))}
                  </div>
                ) : undefined
              }
            />

            <EditableField
              label="Phone"
              value={null}
              field="phoneNumbers"
              testId="field-contact-phone"
              type="array"
              arrayValue={contact.phoneNumbers || []}
              onSave={handleFieldSave}
              isLoading={isFieldLoading("phoneNumbers")}
              error={getFieldError("phoneNumbers")}
              displayValue={
                contact.phoneNumbers && contact.phoneNumbers.length > 0 ? (
                  <div className="space-y-1">
                    {contact.phoneNumbers.map((phone, index) => (
                      <a
                        key={index}
                        href={`tel:${phone}`}
                        className="flex items-center gap-2 text-primary hover:underline"
                        data-testid={`link-phone-${index}`}
                      >
                        <span>{phone}</span>
                      </a>
                    ))}
                  </div>
                ) : undefined
              }
            />

            <EditableField
              label="Instagram"
              value={contact.instagramUsername}
              field="instagramUsername"
              testId="field-contact-instagram"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("instagramUsername")}
              error={getFieldError("instagramUsername")}
              displayValue={
                contact.instagramUsername ? (
                  <a
                    href={`https://instagram.com/${contact.instagramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="h-4 w-4 text-muted-foreground" />
                    <span>@{contact.instagramUsername}</span>
                  </a>
                ) : undefined
              }
            />

            <EditableField
              label="LinkedIn"
              value={contact.linkedinUsername}
              field="linkedinUsername"
              testId="field-contact-linkedin"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("linkedinUsername")}
              error={getFieldError("linkedinUsername")}
              displayValue={
                contact.linkedinUsername ? (
                  <a
                    href={`https://linkedin.com/in/${contact.linkedinUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                    data-testid="link-linkedin"
                  >
                    <SiLinkedin className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.linkedinUsername}</span>
                  </a>
                ) : undefined
              }
            />

            <EditableField
              label="Address"
              value={contact.homeAddress}
              field="homeAddress"
              testId="field-contact-address"
              type="textarea"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("homeAddress")}
              error={getFieldError("homeAddress")}
            />

            <EditableField
              label="Date of Birth"
              value={contact.dateOfBirth ? format(new Date(contact.dateOfBirth), "yyyy-MM-dd") : null}
              field="dateOfBirth"
              testId="field-contact-dob"
              type="date"
              onSave={handleFieldSave}
              isLoading={isFieldLoading("dateOfBirth")}
              error={getFieldError("dateOfBirth")}
              displayValue={
                contact.dateOfBirth ? (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(contact.dateOfBirth), "MMMM d, yyyy")}
                    </span>
                  </div>
                ) : undefined
              }
            />
          </CardContent>
        </Card>

        <PermissionGate permission="deals.read">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  Deals
                  <span className="text-muted-foreground text-sm font-medium">{deals.length}</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingDeals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deals.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">

                  <p className="text-sm">
                    {fullName} is not assigned as the primary contact on any deals.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {deals.map((deal) => {
                    const statusConfig = statusColors[
                      deal.status as DealStatus
                    ] || { variant: "outline" as const };
                    return (
                      <Link href={`/deals/${deal.id}`} key={deal.id}>
                        <div
                          className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer  bg-background/[50%] dark:bg-foreground/[4%]"
                          data-testid={`link-deal-${deal.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {deal.displayName}
                            </span>
                          </div>
                          <Badge
                            variant={statusConfig.variant}
                            className={statusConfig.className}
                          >
                            {deal.status}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </PermissionGate>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fullName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
