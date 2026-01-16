import { useState } from "react";
import { useParams, Link } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Trash2, PenBox } from "lucide-react";
import { CommentList } from "@/components/ui/comments";
import { parseDateOnly } from "@/lib/date";
import { DealStatusBadge } from "@/components/deal-status-badge";
import type {
  DealWithRelations,
  DealStatus,
  User,
  Client,
  Brand,
  Industry,
} from "@shared/schema";
import { dealStatuses } from "@shared/schema";
import type { DealService as DealServiceType } from "@shared/schema";
import {
  EditableField,
  EditableTitle,
  FieldRow,
  useFieldMutation,
} from "@/components/inline-edit";

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

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: Boolean(id),
  });

  const { data: users = [] } = useQuery<Pick<User, "id" | "firstName" | "lastName">[]>({
    queryKey: ["/api/users"],
  });

  const { data: clients = [] } = useQuery<Pick<Client, "id" | "name" | "industryId">[]>({
    queryKey: ["/api/clients"],
  });

  const { data: dealServices = [] } = useQuery<DealServiceType[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = new Map(dealServices.map(s => [s.id, s]));

  const { data: brands = [] } = useQuery<Pick<Brand, "id" | "name" | "industry">[]>({
    queryKey: ["/api/brands"],
  });

  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
  });

  const industriesMap = new Map(industries.map(i => [i.id, i]));

  usePageTitle(deal?.displayName || "Deal");

  const {
    saveField,
    isFieldLoading,
    getFieldError,
  } = useFieldMutation({
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
    if (value === "" && (field === "ownerId" || field === "clientId" || field === "brandId" || field === "primaryContactId" || field === "industryId")) {
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
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Deal" },
        ]}
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
      primaryAction={canWrite ? {
        label: "Edit",
        href: `/deals/${id}/edit`,
        icon: PenBox,
      } : undefined}
      additionalActions={
        canDelete
          ? [
              {
                label: "Delete",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive",
              },
            ]
          : undefined
      }
    >
      <div className="">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="p-4 md:p-6 pb-2 md:pb-2">
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
              <TabsTrigger value="comments" data-testid="tab-comments">
                Comments
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="max-w-4xl space-y-4 p-4 md:p-6 pt-4"
          >
            <Card>
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
                    ...users.map((u) => ({
                      value: u.id,
                      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown",
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
                  value={deal.status}
                  field="status"
                  testId="field-status"
                  type="select"
                  disabled={!canWrite}
                  options={dealStatuses.map((s) => ({ value: s, label: s }))}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("status")}
                  error={getFieldError("status")}
                  displayValue={
                  <div className="@container w-full flex">
                    <DealStatusBadge status={deal.status as DealStatus} />
                  </div>
                  }
                  placeholder="Select status"
                />

                <EditableField
                  label="Client"
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
                      <span className="text-muted-foreground">No client assigned</span>
                    )
                  }
                  placeholder="Select client"
                />

                <EditableField
                  label="Industry"
                  value={deal.industryId || ""}
                  field="industryId"
                  testId="field-industry"
                  type="select"
                  disabled={!canWrite}
                  options={industries.map((i) => ({ value: i.id, label: i.name }))}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("industryId")}
                  error={getFieldError("industryId")}
                  displayValue={
                    deal.industryId ? (
                      <span data-testid="text-industry">
                        {industriesMap.get(deal.industryId)?.name || deal.industryId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No industry</span>
                    )
                  }
                  placeholder="Select industry"
                />

                <FieldRow label="Primary Contact" testId="field-primary-contact">
                  {deal.primaryContact ? (
                    <Link href={`/contacts/${deal.primaryContact.id}`}>
                      <p
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="link-deal-primary-contact"
                      >
                        {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No primary contact</span>
                  )}
                </FieldRow>

                <EditableField
                  label="Project Date"
                  value={deal.projectDate || ""}
                  field="projectDate"
                  testId="field-project-date"
                  type="text"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("projectDate")}
                  error={getFieldError("projectDate")}
                  placeholder="e.g., Q1 2025, March 15-17"
                />

                <EditableField
                  label="Locations"
                  value={deal.locationsText || ""}
                  field="locationsText"
                  testId="field-locations-text"
                  type="textarea"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("locationsText")}
                  error={getFieldError("locationsText")}
                  placeholder="Enter locations"
                />

                <EditableField
                  label="Concept"
                  value={deal.concept || ""}
                  field="concept"
                  testId="field-concept"
                  type="textarea"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("concept")}
                  error={getFieldError("concept")}
                  placeholder="Enter concept description"
                  valueClassName="text-base prose dark:prose-invert "
                />

                <EditableField
                  label="Services"
                  value=""
                  field="serviceIds"
                  testId="field-services"
                  type="multiselect"
                  disabled={!canWrite}
                  options={dealServices.filter(s => s.isActive).map((s) => ({ value: String(s.id), label: s.name }))}
                  multiSelectValues={serviceIds.map(String)}
                  onSave={handleServicesSave}
                  isLoading={isFieldLoading("serviceIds")}
                  error={getFieldError("serviceIds")}
                  displayValue={
                    serviceIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2" data-testid="deal-services">
                        {serviceIds.map((serviceId) => {
                          const service = servicesMap.get(serviceId);
                          const serviceName = service?.name || `Service ${serviceId}`;
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
                  placeholder="Select services"
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

                <EditableField
                  label="Started"
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
                      <span className="font-medium">{format(parseDateOnly(deal.startedOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Last Contact"
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
                      <span className="font-medium">{format(parseDateOnly(deal.lastContactOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Won"
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
                      <span className="font-medium">{format(parseDateOnly(deal.wonOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Proposal Sent"
                  value={deal.proposalSentOn || ""}
                  field="proposalSentOn"
                  testId="field-proposal-sent-on"
                  type="date"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("proposalSentOn")}
                  error={getFieldError("proposalSentOn")}
                  displayValue={
                    deal.proposalSentOn && parseDateOnly(deal.proposalSentOn) ? (
                      <span className="font-medium">{format(parseDateOnly(deal.proposalSentOn)!, "MMM d, yyyy")}</span>
                    ) : undefined
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Next Steps"
                  value={deal.notes || ""}
                  field="notes"
                  testId="field-notes"
                  type="textarea"
                  disabled={!canWrite}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("notes")}
                  error={getFieldError("notes")}
                  placeholder="Enter next steps"
                  valueClassName="text-base prose dark:prose-invert "
                />
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="comments" className="p-4 md:p-6 pt-4 max-w-4xl">
            <CommentList
              entityType="deal"
              entityId={id}
              currentUser={user || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

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
