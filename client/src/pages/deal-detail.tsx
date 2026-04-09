import { useState } from "react";
import { useParams, Link } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { TagAssignment } from "@/components/ui/tag-assignment";
import {
  Loader2,
  Trash2,
  PenBox,
  MapPin,
  MapPinned,
  Calendar,
  Plus,
  X,
  Building2,
  Search,
  Pencil,
  FileText,
} from "lucide-react";
import { CommentList } from "@/components/ui/comments";
import { GoogleDriveAttachments } from "@/components/google-drive-attachments";
import { GenerateDealDocDialog } from "@/components/generate-deal-doc-dialog";
import { DealIntakeTab } from "@/components/deal-intake-tab";
import { parseDateOnly } from "@/lib/date";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import type {
  DealWithRelations,
  DealStatus,
  DealLocation,
  DealEvent,
  User,
  Client,
} from "@shared/schema";
import type { DealService as DealServiceType } from "@shared/schema";
import {
  getEventSummary,
  EventScheduleEditor,
} from "@/components/event-schedule";
import { LocationSearch } from "@/components/location-search";
import {
  EditableField,
  EditableTitle,
  FieldRow,
  useFieldMutation,
} from "@/components/inline-edit";
import { DealTasksTab } from "@/components/deal-tasks-tab";
import { DealLinksTab } from "@/components/deal-links-tab";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canRead = can("deals.read");
  const canWrite = can("deals.write");
  const canDelete = can("deals.delete");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLinkClient, setShowLinkClient] = useState(false);
  const [linkClientSearch, setLinkClientSearch] = useState("");
  const [linkClientLabel, setLinkClientLabel] = useState("");
  const [isEditingEventSchedule, setIsEditingEventSchedule] = useState(false);
  const [editingEventSchedule, setEditingEventSchedule] = useState<DealEvent[]>(
    [],
  );
  const [isEditingLocations, setIsEditingLocations] = useState(false);
  const [editingLocations, setEditingLocations] = useState<DealLocation[]>([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [showGenerateDoc, setShowGenerateDoc] = useState(false);
  const { statuses: dealStatusList, statusById } = useDealStatuses();

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: Boolean(id),
  });

  const { data: users = [] } = useQuery<
    Pick<User, "id" | "firstName" | "lastName" | "role" | "isActive">[]
  >({
    queryKey: ["/api/users"],
  });

  const { data: clients = [] } = useQuery<
    Pick<Client, "id" | "name" | "industryId">[]
  >({
    queryKey: ["/api/clients"],
  });

  const { data: dealServices = [] } = useQuery<DealServiceType[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = new Map(dealServices.map((s) => [s.id, s]));

  interface DealLinkedClient {
    dealId: string;
    clientId: string;
    clientName: string;
    label: string | null;
    createdAt: string | null;
  }

  const { data: linkedClients = [] } = useQuery<DealLinkedClient[]>({
    queryKey: ["/api/deals", id, "linked-clients"],
    enabled: Boolean(id),
  });

  const linkClientMutation = useMutation({
    mutationFn: async ({
      clientId,
      label,
    }: {
      clientId: string;
      label?: string;
    }) => {
      await apiRequest("POST", `/api/deals/${id}/linked-clients`, {
        clientId,
        label,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", id, "linked-clients"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/deals/all-linked-clients"],
      });
      setShowLinkClient(false);
      setLinkClientSearch("");
      setLinkClientLabel("");
      toast({ title: "Client linked to deal" });
    },
  });

  const unlinkClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/deals/${id}/linked-clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/deals", id, "linked-clients"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/deals/all-linked-clients"],
      });
      toast({ title: "Client unlinked from deal" });
    },
  });

  const { data: dealTagIds = [] } = useQuery<string[]>({
    queryKey: ["/api/deals", id, "tags"],
    enabled: Boolean(id),
  });

  const { data: allDealsTags = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/tags/category/Deals"],
    enabled: Boolean(id),
  });

  const dealTagsMap = new Map(allDealsTags.map((t) => [t.id, t]));

  const saveTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      await apiRequest("PUT", `/api/deals/${id}/tags`, { tagIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/all-deal-tags"] });
      toast({ title: "Deal tags updated" });
    },
  });

  usePageTitle(deal?.displayName || "Deal");

  const { saveField, isFieldLoading, getFieldError } = useFieldMutation({
    entityType: "deals",
    entityId: id || "",
    queryKey: ["/api/deals", id],
    additionalQueryKeys: [["/api/deals"]],
    onSuccess: () => {
      toast({ title: "Deal updated" });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    let processedValue = value;
    if (
      value === "" &&
      (field === "ownerId" ||
        field === "clientId" ||
        field === "primaryContactId")
    ) {
      processedValue = null;
    }
    saveField(field, processedValue);
  };

  const handleServicesSave = (field: string, value: unknown) => {
    const ids = (value as string[]).map(Number);
    saveField(field, ids);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal deleted successfully" });
      setLocation("/deals");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!deal) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Not Found" },
        ]}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The deal you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={() => setLocation("/deals")}
            data-testid="button-back-to-deals"
          >
            Back to Deals
          </Button>
        </div>
      </PageLayout>
    );
  }

  const ownerName = deal.owner
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ") ||
      "Unassigned"
    : null;
  const ownerInitials = ownerName
    ? ownerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const serviceIds = (deal.serviceIds as number[]) || [];

  if (!canRead) {
    return (
      <PageLayout
        breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Deal" }]}
      >
        <NoPermissionMessage
          title="Access Denied"
          message="You don't have permission to view deals. Please contact an administrator if you need access."
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        { label: deal.displayName },
      ]}
      additionalActions={[
        ...(user?.role === "admin"
          ? [
              {
                label: "Generate Doc",
                onClick: () => setShowGenerateDoc(true),
                icon: FileText,
              },
            ]
          : []),
        ...(canWrite
          ? [
              {
                label: "Edit Deal",
                href: `/deals/${id}/edit`,
                icon: PenBox,
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete Deal",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive" as const,
              },
            ]
          : []),
      ]}
    >
      <div className="">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="max-w-4xl p-4 md:px-6 pb-2 md:pb-2">
              <div className="flex flex-col gap-2 ">
                <span className="text-sm font-semibold">
                  {deal.client?.name}
                </span>

                <EditableTitle
                  value={deal.displayName}
                  onSave={(value) => handleFieldSave("displayName", value)}
                  testId="text-deal-name"
                  disabled={!canWrite}
                  isLoading={isFieldLoading("displayName")}
                  error={getFieldError("displayName")}
                  validation={{ required: true }}
                />
              </div>
            </div>

            <TabsList data-testid="tabs-deal" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="intake" data-testid="tab-intake">
                Intake
              </TabsTrigger>
              <TabsTrigger value="links" data-testid="tab-links">
                Links
              </TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">
                Comments{" "}
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  BETA
                </Badge>
              </TabsTrigger>
              {/* <TabsTrigger value="files" data-testid="tab-files" className="hidden">
                Files
              </TabsTrigger> */}

              <TabsTrigger value="tasks" data-testid="tab-tasks">
                Tasks
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] px-1.5 py-0"
                >
                  BETA
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="max-w-4xl space-y-4 p-4 md:p-6 pt-4"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-base"
                  data-testid="heading-deal-overview"
                >
                  Deal Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <EditableField
                  label="Owner"
                  value={deal.ownerId || ""}
                  field="ownerId"
                  testId="field-owner"
                  type="select"
                  disabled={!canWrite}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...users
                      .filter(
                        (u) =>
                          u.isActive &&
                          (u.role === "Sales" || u.role === "Sales Admin"),
                      )
                      .map((u) => ({
                        value: u.id,
                        label:
                          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                          "Unknown",
                      })),
                  ]}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("ownerId")}
                  error={getFieldError("ownerId")}
                  displayValue={
                    ownerName ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarImage
                            src={deal.owner?.profileImageUrl || undefined}
                            alt={ownerName}
                          />
                          <AvatarFallback className="text-xs">
                            {ownerInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{ownerName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )
                  }
                  placeholder="Select owner"
                />

                <EditableField
                  label="Status"
                  value={String(deal.status)}
                  field="status"
                  testId="field-status"
                  type="select"
                  disabled={!canWrite}
                  options={dealStatusList.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  }))}
                  onSave={(field, value) =>
                    handleFieldSave(field, Number(value))
                  }
                  isLoading={isFieldLoading("status")}
                  error={getFieldError("status")}
                  displayValue={
                    <DealStatusBadge status={deal.statusName || "Unknown"} />
                  }
                  placeholder="Select status"
                />

                <EditableField
                  label="Primary Client"
                  value={deal.clientId || ""}
                  field="clientId"
                  testId="field-client"
                  type="select"
                  disabled={!canWrite}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("clientId")}
                  error={getFieldError("clientId")}
                  displayValue={
                    deal.client ? (
                      <Link href={`/clients/${deal.client.id}`}>
                        <span
                          className="text-primary hover:underline cursor-pointer"
                          data-testid="link-deal-client"
                        >
                          {deal.client.name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        No client assigned
                      </span>
                    )
                  }
                  placeholder="Select client"
                />

                <FieldRow label="Client Partners" testId="field-linked-clients">
                  <div className="flex flex-col gap-2">
                    {linkedClients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedClients.map((lc) => (
                          <Badge
                            key={lc.clientId}
                            variant="secondary"
                            className="gap-1 pr-1"
                            data-testid={`badge-linked-client-${lc.clientId}`}
                          >
                            <Building2 className="h-3 w-3" />
                            <Link href={`/clients/${lc.clientId}`}>
                              <span className="hover:underline cursor-pointer">
                                {lc.clientName}
                              </span>
                            </Link>
                            {lc.label && (
                              <span className="text-muted-foreground ml-0.5">
                                ({lc.label})
                              </span>
                            )}
                            {canWrite && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 ml-0.5"
                                onClick={() =>
                                  unlinkClientMutation.mutate(lc.clientId)
                                }
                                disabled={unlinkClientMutation.isPending}
                                data-testid={`button-unlink-client-${lc.clientId}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {canWrite && !showLinkClient && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-fit gap-1 text-muted-foreground"
                        onClick={() => setShowLinkClient(true)}
                        data-testid="button-link-client"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Link related companies or brands
                      </Button>
                    )}

                    {canWrite && showLinkClient && (
                      <div
                        className="flex flex-col gap-2 p-2 border rounded-md"
                        data-testid="form-link-client"
                      >
                        <Input
                          placeholder="Label (optional)"
                          value={linkClientLabel}
                          onChange={(e) => setLinkClientLabel(e.target.value)}
                          data-testid="input-link-client-label"
                        />
                        <div className="relative">
                          <div className="flex items-center gap-1.5 border rounded-md px-2">
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <Input
                              placeholder="Search clients..."
                              value={linkClientSearch}
                              onChange={(e) =>
                                setLinkClientSearch(e.target.value)
                              }
                              className="border-0 px-0 focus-visible:ring-0"
                              data-testid="input-link-client-search"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                setShowLinkClient(false);
                                setLinkClientSearch("");
                                setLinkClientLabel("");
                              }}
                              data-testid="button-cancel-link-client"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {linkClientSearch.length > 0 && (
                            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                              {(() => {
                                const linkedIds = new Set(
                                  linkedClients.map((lc) => lc.clientId),
                                );
                                const filtered = clients.filter(
                                  (c) =>
                                    c.id !== deal.clientId &&
                                    !linkedIds.has(c.id) &&
                                    c.name
                                      .toLowerCase()
                                      .includes(linkClientSearch.toLowerCase()),
                                );
                                if (filtered.length === 0) {
                                  return (
                                    <div className="p-2 text-sm text-muted-foreground">
                                      No matching clients
                                    </div>
                                  );
                                }
                                return filtered.slice(0, 10).map((c) => (
                                  <button
                                    key={c.id}
                                    className="w-full text-left px-3 py-2 text-sm hover-elevate flex items-center gap-2"
                                    onClick={() =>
                                      linkClientMutation.mutate({
                                        clientId: c.id,
                                        label: linkClientLabel || undefined,
                                      })
                                    }
                                    disabled={linkClientMutation.isPending}
                                    data-testid={`option-link-client-${c.id}`}
                                  >
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    {c.name}
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </FieldRow>

                <FieldRow
                  label="Primary Contact"
                  testId="field-primary-contact"
                >
                  {deal.primaryContact ? (
                    <Link href={`/contacts/${deal.primaryContact.id}`}>
                      <p
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="link-deal-primary-contact"
                      >
                        {deal.primaryContact.firstName}{" "}
                        {deal.primaryContact.lastName}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      No primary contact
                    </span>
                  )}
                </FieldRow>

                <EditableField
                  label="Services"
                  value=""
                  field="serviceIds"
                  testId="field-services"
                  type="multiselect"
                  disabled={!canWrite}
                  options={dealServices
                    .filter((s) => s.isActive)
                    .map((s) => ({ value: String(s.id), label: s.name }))}
                  multiSelectValues={serviceIds.map(String)}
                  onSave={handleServicesSave}
                  isLoading={isFieldLoading("serviceIds")}
                  error={getFieldError("serviceIds")}
                  displayValue={
                    serviceIds.length > 0 ? (
                      <div
                        className="flex flex-wrap gap-2"
                        data-testid="deal-services"
                      >
                        {serviceIds.map((serviceId) => {
                          const service = servicesMap.get(serviceId);
                          const serviceName =
                            service?.name || `Service ${serviceId}`;
                          return (
                            <Badge
                              key={serviceId}
                              variant="secondary"
                              data-testid={`badge-service-${serviceId}`}
                              size="lg"
                              className="py-1 px-2 text-xs"
                            >
                              {serviceName}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : undefined
                  }
                  placeholder="What services are we providing?"
                />

                <EditableField
                  label="Concept & Context"
                  value={deal.concept || ""}
                  field="concept"
                  testId="field-concept"
                  type="richtext"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("concept")}
                  error={getFieldError("concept")}
                  placeholder="Describe the project"
                  valueClassName="text-base"
                />
                <EditableField
                  label="Next Steps"
                  value={deal.nextSteps || ""}
                  field="nextSteps"
                  testId="field-next-steps"
                  type="richtext"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("nextSteps")}
                  error={getFieldError("nextSteps")}
                  placeholder="Enter next steps"
                  valueClassName="text-base prose dark:prose-invert"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-base"
                  data-testid="heading-project-info"
                >
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <FieldRow label="Locations" testId="field-locations-json">
                  {isEditingLocations ? (
                    <div className="space-y-3">
                      <LocationSearch
                        value={editingLocations}
                        onChange={setEditingLocations}
                        testId="inline-edit-locations"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            saveField("locations", editingLocations);
                            setIsEditingLocations(false);
                          }}
                          disabled={isFieldLoading("locations")}
                          data-testid="button-save-locations"
                        >
                          {isFieldLoading("locations") ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingLocations(false)}
                          disabled={isFieldLoading("locations")}
                          data-testid="button-cancel-locations"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 group">
                      <div className="flex-1">
                        {(() => {
                          const locations = deal.locations as
                            | DealLocation[]
                            | null;
                          if (!locations || locations.length === 0) {
                            return (
                              <span className="text-muted-foreground">
                                None
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-2">
                              {locations.map((loc) => {
                                const isCity = Boolean(loc.city);
                                const Icon = isCity ? MapPin : MapPinned;
                                return (
                                  <Badge
                                    key={loc.placeId}
                                    variant="secondary"
                                    className="text-xs gap-1"
                                    data-testid={`badge-location-${loc.placeId}`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {loc.displayName}
                                  </Badge>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      {canWrite && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => {
                            setEditingLocations(
                              (deal.locations as DealLocation[] | null) || [],
                            );
                            setIsEditingLocations(true);
                          }}
                          data-testid="button-edit-locations"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </FieldRow>
                <EditableField
                  label="Location Notes"
                  value={deal.locationsText || ""}
                  field="locationsText"
                  testId="field-locations-text"
                  type="textarea"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("locationsText")}
                  error={getFieldError("locationsText")}
                  placeholder="Provide additional details and context."
                />
                <FieldRow label="Project Dates" testId="field-event-schedule">
                  {isEditingEventSchedule ? (
                    <div className="space-y-3">
                      <EventScheduleEditor
                        value={editingEventSchedule}
                        onChange={setEditingEventSchedule}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            saveField("eventSchedule", editingEventSchedule);
                            setIsEditingEventSchedule(false);
                          }}
                          disabled={isFieldLoading("eventSchedule")}
                          data-testid="button-save-event-schedule"
                        >
                          {isFieldLoading("eventSchedule") ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingEventSchedule(false)}
                          disabled={isFieldLoading("eventSchedule")}
                          data-testid="button-cancel-event-schedule"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 group">
                      <div className="flex-1">
                        {(() => {
                          const events = deal.eventSchedule as
                            | DealEvent[]
                            | null;
                          if (!events || events.length === 0) {
                            return (
                              <span className="text-muted-foreground">
                                None
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-col gap-1">
                              {events.map((event, idx) => {
                                const summary = getEventSummary(event);
                                if (!summary)
                                  return (
                                    <span className="text-muted-foreground text-sm">
                                      List specific dates or general timeframes
                                    </span>
                                  );
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                    data-testid={`row-event-schedule-${idx}`}
                                  >
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>{summary.text}</span>
                                    {summary.altCount > 0 && (
                                      <span className="text-muted-foreground text-xs">
                                        +{summary.altCount} alt
                                        {summary.altCount > 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      {canWrite && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => {
                            setEditingEventSchedule(
                              (deal.eventSchedule as DealEvent[] | null) || [],
                            );
                            setIsEditingEventSchedule(true);
                          }}
                          data-testid="button-edit-event-schedule"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </FieldRow>

                <EditableField
                  label="Project Date Notes"
                  value={deal.projectDate || ""}
                  field="projectDate"
                  testId="field-project-date"
                  type="text"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("projectDate")}
                  error={getFieldError("projectDate")}
                  placeholder="Provide additional details and context"
                />

                <EditableField
                  label="Budget Low"
                  value={deal.budgetLow != null ? String(deal.budgetLow) : ""}
                  field="budgetLow"
                  testId="field-budget-low"
                  type="number"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("budgetLow")}
                  error={getFieldError("budgetLow")}
                  displayValue={
                    deal.budgetLow != null ? (
                      <span className="font-medium">
                        ${deal.budgetLow.toLocaleString()}
                      </span>
                    ) : undefined
                  }
                  placeholder="Not set"
                  validation={{
                    customValidator: (val) => {
                      if (val === null || val === undefined) return null;
                      const num = Number(val);
                      if (isNaN(num) || num <= 0)
                        return "Must be greater than 0";
                      return null;
                    },
                  }}
                />

                <EditableField
                  label="Budget High"
                  value={deal.budgetHigh != null ? String(deal.budgetHigh) : ""}
                  field="budgetHigh"
                  testId="field-budget-high"
                  type="number"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("budgetHigh")}
                  error={getFieldError("budgetHigh")}
                  displayValue={
                    deal.budgetHigh != null ? (
                      <span className="font-medium">
                        ${deal.budgetHigh.toLocaleString()}
                      </span>
                    ) : undefined
                  }
                  placeholder="Not set"
                  validation={{
                    customValidator: (val) => {
                      if (val === null || val === undefined) return null;
                      const num = Number(val);
                      if (isNaN(num) || num <= 0)
                        return "Must be greater than 0";
                      return null;
                    },
                  }}
                />

                <EditableField
                  label="Budget Notes"
                  value={deal.budgetNotes || ""}
                  field="budgetNotes"
                  testId="field-budget-notes"
                  type="textarea"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("budgetNotes")}
                  error={getFieldError("budgetNotes")}
                  placeholder="Enter budget notes"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-base"
                  data-testid="heading-deal-details"
                >
                  Deal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <FieldRow label="Tags" testId="field-tags">
                  {isEditingTags ? (
                    <div className="space-y-2">
                      <TagAssignment
                        category="Deals"
                        selectedTagIds={dealTagIds}
                        onTagsChange={(tagIds) =>
                          saveTagsMutation.mutate(tagIds)
                        }
                      />
                      <div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingTags(false)}
                          data-testid="button-done-tags"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 group">
                      <div className="flex-1">
                        {dealTagIds.length > 0 ? (
                          <div
                            className="flex flex-wrap gap-2"
                            data-testid="deal-tags"
                          >
                            {dealTagIds.map((tagId) => {
                              const tag = dealTagsMap.get(tagId);
                              return (
                                <Badge
                                  key={tagId}
                                  variant="secondary"
                                  size="lg"
                                  className="py-1 px-2 text-xs no-default-hover-elevate no-default-active-elevate"
                                  data-testid={`badge-tag-${tagId}`}
                                >
                                  {tag?.name || tagId}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Group this deal with similar ones
                          </span>
                        )}
                      </div>
                      {canWrite && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => setIsEditingTags(true)}
                          data-testid="button-edit-tags"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </FieldRow>
                <EditableField
                  label="Deal Start Date"
                  value={deal.startedOn || ""}
                  field="startedOn"
                  testId="field-started-on"
                  type="date"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("startedOn")}
                  error={getFieldError("startedOn")}
                  displayValue={
                    deal.startedOn && parseDateOnly(deal.startedOn) ? (
                      <span className="font-medium">
                        {format(parseDateOnly(deal.startedOn)!, "MMM d, yyyy")}
                      </span>
                    ) : undefined
                  }
                  placeholder="Select date "
                />

                <EditableField
                  label="Last Client Contact"
                  value={deal.lastContactOn || ""}
                  field="lastContactOn"
                  testId="field-last-contact"
                  type="date"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("lastContactOn")}
                  error={getFieldError("lastContactOn")}
                  displayValue={
                    deal.lastContactOn && parseDateOnly(deal.lastContactOn) ? (
                      <span className="font-medium">
                        {format(
                          parseDateOnly(deal.lastContactOn)!,
                          "MMM d, yyyy",
                        )}
                      </span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Deal Won On"
                  value={deal.wonOn || ""}
                  field="wonOn"
                  testId="field-won-on"
                  type="date"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("wonOn")}
                  error={getFieldError("wonOn")}
                  displayValue={
                    deal.wonOn && parseDateOnly(deal.wonOn) ? (
                      <span className="font-medium">
                        {format(parseDateOnly(deal.wonOn)!, "MMM d, yyyy")}
                      </span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Proposal Sent On"
                  value={deal.proposalSentOn || ""}
                  field="proposalSentOn"
                  testId="field-proposal-sent-on"
                  type="date"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("proposalSentOn")}
                  error={getFieldError("proposalSentOn")}
                  displayValue={
                    deal.proposalSentOn &&
                    parseDateOnly(deal.proposalSentOn) ? (
                      <span className="font-medium">
                        {format(
                          parseDateOnly(deal.proposalSentOn)!,
                          "MMM d, yyyy",
                        )}
                      </span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="intake" className="p-4 md:p-6 pt-4 max-w-6xl">
            <DealIntakeTab dealId={id!} canWrite={canWrite} />
          </TabsContent>

          <TabsContent value="comments" className="p-4 md:p-6 pt-4 max-w-4xl">
            <CommentList
              entityType="deal"
              entityId={id}
              currentUser={user || undefined}
            />
          </TabsContent>

          <TabsContent value="files" className="p-4 md:p-6 pt-4 max-w-4xl">
            <GoogleDriveAttachments entityType="deal" entityId={id!} />
          </TabsContent>

          <TabsContent value="links" className="p-4 md:p-6 pt-4 max-w-4xl">
            <DealLinksTab dealId={id!} canWrite={canWrite} />
          </TabsContent>

          <TabsContent value="tasks" className="p-4 md:p-6 pt-4 max-w-4xl">
            <DealTasksTab dealId={id!} canWrite={canWrite} users={users} />
          </TabsContent>
        </Tabs>
      </div>

      <GenerateDealDocDialog
        deal={deal}
        servicesMap={servicesMap}
        open={showGenerateDoc}
        onOpenChange={setShowGenerateDoc}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.displayName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
