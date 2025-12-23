import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
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
import { format } from "date-fns";
import { Loader2, Trash2, PenBox } from "lucide-react";
import { CommentList } from "@/components/ui/comments";
import { parseDateOnly } from "@/lib/date";
import { DealStatusBadge } from "@/components/deal-status-badge";
import type {
  DealWithRelations,
  DealStatus,
  DealLocation,
  DealService,
} from "@shared/schema";

function FieldRow({
  label,
  children,
  testId,
  colSpan = 1,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
  colSpan?: number;
}) {
  return (
    <div
      className={`flex py-4 border-b border-border/50 last:border-b-0 col-span-${colSpan}`}
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: Boolean(id),
  });

  usePageTitle(deal?.displayName || "Deal");

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

  const createdByName = deal.createdBy
    ? [deal.createdBy.firstName, deal.createdBy.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";
  const createdByInitials = createdByName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

  const locations = (deal.locations as DealLocation[]) || [];
  const services = (deal.services as DealService[]) || [];

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        { label: deal.displayName },
      ]}
      primaryAction={{
        label: "Edit",
        href: `/deals/${id}/edit`,
        icon: PenBox,
      }}
      additionalActions={
        isManagerOrAdmin
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

                <div>
                  <span className="text-sm font-semibold">
                    {deal.client?.name}
                  </span>
                  <h1
                    className="text-2xl font-bold"
                    data-testid="text-deal-name"
                  >
                    {deal.displayName}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <DealStatusBadge status={deal.status as DealStatus} />
                  {ownerName ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 rounded-full">
                        <AvatarImage
                          src={deal.owner?.profileImageUrl || undefined}
                          alt={ownerName}
                        />
                        <AvatarFallback className="text-xs">
                          {ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium  ">{ownerName}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium">Unassigned</span>
                  )}
                </div>

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
            {/* Deal Information Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Deal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldRow label="Client" testId="field-client">
                  {deal.client ? (
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
                  )}
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
                {locations.length > 0 && (
                  <FieldRow
                    label="Locations"
                    testId="field-locations"
                    colSpan={2}
                  >
                    <div
                      className="flex flex-wrap gap-3"
                      data-testid="deal-locations"
                    >
                      {locations.map((location) => (
                        <Badge
                          key={location.placeId}
                          variant="default"
                          data-testid={`badge-location-${location.placeId}`}
                          size="lg"
                          className="py-1 px-2 text-xs text-background"
                        >
                          {location.displayName}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                {services.length > 0 && (
                  <FieldRow
                    label="Services"
                    testId="field-services"
                    colSpan={2}
                  >
                    <div
                      className="flex flex-wrap gap-2"
                      data-testid="deal-services"
                    >
                      {services.map((service) => (
                        <Badge
                          key={service}
                          variant="secondary"
                          data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                          size="lg"
                          className="py-1 px-2 text-xs"
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                {deal.budgetNotes && (
                  <FieldRow label="Budget Notes" testId="field-budget-notes">
                    <span className="">{deal.budgetNotes}</span>
                  </FieldRow>
                )}
                {(deal.startedOn || deal.wonOn || deal.lastContactOn || deal.projectDate) && (
                  <FieldRow label="Key Dates" testId="field-key-dates">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {deal.projectDate && (
                        <div>
                          <span className="text-muted-foreground mr-1">Project Date:</span>
                          <span className="font-medium">{deal.projectDate}</span>
                        </div>
                      )}
                      {deal.startedOn && (
                        <div>
                          <span className="text-muted-foreground mr-1">Started:</span>
                          <span className="font-medium">{format(parseDateOnly(deal.startedOn), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {deal.wonOn && (
                        <div>
                          <span className="text-muted-foreground mr-1">Won:</span>
                          <span className="font-medium">{format(parseDateOnly(deal.wonOn), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {deal.lastContactOn && (
                        <div>
                          <span className="text-muted-foreground mr-1">Last Contact:</span>
                          <span className="font-medium">{format(parseDateOnly(deal.lastContactOn), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                  </FieldRow>
                )}

                {deal.concept && (
                  <FieldRow label="Concept" testId="field-concept">
                    <span className="">{deal.concept}</span>
                  </FieldRow>
                )}

                {deal.notes && (
                  <FieldRow label="Notes" testId="field-notes">
                    <span className="">{deal.notes}</span>
                  </FieldRow>
                )}
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
