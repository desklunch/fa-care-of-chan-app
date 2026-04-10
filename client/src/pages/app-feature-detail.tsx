import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CommentList } from "@/components/ui/comments";
import {
  EditableField,
  EditableTitle,
  FieldRow,
  useFieldMutation,
} from "@/components/inline-edit";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/use-page-title";
import { ThumbsUp, Loader2, SquarePen, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type {
  AppFeatureWithRelations,
  FeatureStatus,
  FeaturePriority,
  FeatureCategory,
  User,
} from "@shared/schema";
import { featureStatuses, featurePriorities } from "@shared/schema";
import { formatTimeAgo } from "@/lib/format-time";
import { PriorityIcon, priorityLabels } from "@/components/priority-icon";
import { format } from "date-fns";

const statusLabels: Record<FeatureStatus, string> = {
  proposed: "Proposed",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const statusColors: Record<FeatureStatus, string> = {
  proposed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  under_review:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function AppFeatureDetail() {
  const [, params] = useRoute<{ id: string }>("/app/features/:id");
  const featureId = params?.id;
  const [, setLocation] = useProtectedLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: feature, isLoading: featureLoading } =
    useQuery<AppFeatureWithRelations>({
      queryKey: ["/api/features", featureId],
      enabled: !!featureId,
    });

  const { data: categories = [] } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  usePageTitle(feature?.title || "Feature");

  const { saveField, isFieldLoading, getFieldError } = useFieldMutation({
    entityType: "features",
    entityId: featureId || "",
    queryKey: ["/api/features", featureId],
    additionalQueryKeys: [["/api/features"]],
    onSuccess: () => {
      toast({ title: "Feature updated" });
    },
  });

  const handleFieldSave = (field: string, value: unknown) => {
    let processedValue = value;
    if (value === "" && (field === "ownerId" || field === "priority")) {
      processedValue = null;
    }
    saveField(field, processedValue);
  };

  const voteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/features/${featureId}/vote`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["/api/features", featureId],
      });
      const previousFeature = queryClient.getQueryData<AppFeatureWithRelations>(
        ["/api/features", featureId],
      );
      if (previousFeature) {
        queryClient.setQueryData<AppFeatureWithRelations>(
          ["/api/features", featureId],
          {
            ...previousFeature,
            voteCount: previousFeature.hasVoted
              ? previousFeature.voteCount - 1
              : previousFeature.voteCount + 1,
            hasVoted: !previousFeature.hasVoted,
          },
        );
      }
      return { previousFeature };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousFeature) {
        queryClient.setQueryData(
          ["/api/features", featureId],
          context.previousFeature,
        );
      }
      toast({
        title: "Failed to vote",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/features/${featureId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Feature deleted successfully!" });
      setLocation("/app/features");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAdmin = user?.role === "admin";
  const isCreator = user?.id === feature?.createdById;
  const canEdit = isAdmin || isCreator;
  const canDelete = isAdmin || isCreator;
  const canEditAllFields = isAdmin;

  if (featureLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "App" },
          { label: "Features", href: "/app/features" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!feature) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "App" },
          { label: "Features", href: "/app/features" },
          { label: "Not Found" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Feature not found</p>
          <Link href="/app/features">
            <Button variant="outline">Back to Features</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const ownerUser = feature.ownerId
    ? users.find((u) => u.id === feature.ownerId)
    : null;
  const ownerName = ownerUser
    ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(" ") ||
      "Unknown"
    : null;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "App" },
        { label: "Features", href: "/app/features" },
        { label: feature.title },
      ]}
      primaryAction={
        canEdit
          ? {
              label: "Edit",
              href: `/app/features/${feature.id}/edit`,
              icon: SquarePen,
              variant: "outline",
            }
          : undefined
      }
      additionalActions={
        canDelete
          ? [
              {
                label: "Delete Feature",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive",
              },
            ]
          : []
      }
    >
      <Tabs defaultValue="overview" className="w-full">
        <div className="p-4 md:p-6 pb-0">
          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              style={{
                backgroundColor: feature.category.color || undefined,
              }}
              data-testid="badge-feature-category"
            >
              {feature.category.name}
            </Badge>
            <EditableTitle
              value={feature.title}
              onSave={(value) => handleFieldSave("title", value)}
              testId="text-feature-title"
              disabled={!canEdit}
              isLoading={isFieldLoading("title")}
              error={getFieldError("title")}
              validation={{ required: true, minLength: 3, maxLength: 200 }}
            />
          </div>

          {/* <TabsList data-testid="tabs-feature" className="px-4 md:px-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              Comments
            </TabsTrigger>
          </TabsList> */}
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="max-w-4xl space-y-4 p-2 ">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <EditableField
                  label="Status"
                  value={feature.status}
                  field="status"
                  testId="field-feature-status"
                  type="select"
                  disabled={!canEditAllFields}
                  options={featureStatuses.map((s) => ({
                    value: s,
                    label: statusLabels[s],
                  }))}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("status")}
                  error={getFieldError("status")}
                  displayValue={
                    <Badge
                      className={statusColors[feature.status as FeatureStatus]}
                      data-testid="badge-feature-status"
                    >
                      {statusLabels[feature.status as FeatureStatus]}
                    </Badge>
                  }
                  placeholder="Select status"
                />

                <EditableField
                  label="Priority"
                  value={feature.priority || ""}
                  field="priority"
                  testId="field-feature-priority"
                  type="select"
                  disabled={!canEditAllFields}
                  options={[
                    { value: "", label: "None" },
                    ...featurePriorities.map((p) => ({
                      value: p,
                      label: priorityLabels[p],
                      renderLabel: (
                        <span className="flex items-center gap-2">
                          <PriorityIcon priority={p} />
                          {priorityLabels[p]}
                        </span>
                      ),
                    })),
                  ]}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("priority")}
                  error={getFieldError("priority")}
                  displayValue={
                    feature.priority ? (
                      <span className="flex items-center gap-2 text-sm">
                        <PriorityIcon priority={feature.priority} />
                        {priorityLabels[feature.priority]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )
                  }
                  placeholder="Select priority"
                />

                <EditableField
                  label="Category"
                  value={feature.categoryId}
                  field="categoryId"
                  testId="field-feature-category"
                  type="select"
                  disabled={!canEdit}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("categoryId")}
                  error={getFieldError("categoryId")}
                  displayValue={
                    <span className="text-sm">
                      {feature.category?.name || "Unknown"}
                    </span>
                  }
                  placeholder="Select category"
                />

                <EditableField
                  label="Description"
                  value={feature.description || ""}
                  field="description"
                  testId="field-feature-description"
                  type="textarea"
                  disabled={!canEdit}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("description")}
                  error={getFieldError("description")}
                  displayValue={
                    feature.description ? (
                      <p
                        className="text-sm whitespace-pre-wrap"
                        data-testid="text-feature-description"
                      >
                        {feature.description}
                      </p>
                    ) : (
                      <span className="text-muted-foreground">
                        No description provided.
                      </span>
                    )
                  }
                  placeholder="Add a description..."
                />

                <EditableField
                  label="Estimated Delivery"
                  value={
                    feature.estimatedDelivery
                      ? format(
                          new Date(feature.estimatedDelivery),
                          "yyyy-MM-dd",
                        )
                      : ""
                  }
                  field="estimatedDelivery"
                  testId="field-feature-estimated-delivery"
                  type="date"
                  disabled={!canEditAllFields}
                  onSave={handleFieldSave}
                  isLoading={isFieldLoading("estimatedDelivery")}
                  error={getFieldError("estimatedDelivery")}
                  displayValue={
                    feature.estimatedDelivery ? (
                      <span className="text-sm">
                        {format(new Date(feature.estimatedDelivery), "PPP")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )
                  }
                  placeholder="Select date"
                />

                <EditableField
                  label="Owner"
                  value={feature.ownerId || ""}
                  field="ownerId"
                  testId="field-feature-owner"
                  type="select"
                  disabled={!canEditAllFields}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...users
                      .filter((u) => u.isActive)
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
                      <span className="text-sm font-medium">{ownerName}</span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )
                  }
                  placeholder="Select owner"
                />

                <FieldRow label="Submitted" testId="field-feature-submitted-on">
                  <span data-testid="text-created-at">
                    {feature.createdAt
                      ? formatTimeAgo(new Date(feature.createdAt))
                      : "Unknown"}
                  </span>
                  <span className="px-1.5 text-muted-foreground">by</span>
                  <span data-testid="text-created-by">
                    {feature.createdBy?.firstName || ""}{" "}
                    {feature.createdBy?.lastName || ""}
                  </span>
                </FieldRow>

                <FieldRow label="Vote" testId="field-feature-vote">
                  <Button
                    variant={feature.hasVoted ? "default" : "secondary"}
                    onClick={() => voteMutation.mutate()}
                    disabled={voteMutation.isPending}
                    className="gap-3 h-9 w-auto px-3"
                    data-testid="button-vote"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span data-testid="text-vote-count">
                      {feature.voteCount}
                    </span>
                  </Button>
                </FieldRow>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="">
                <CommentList
                  entityType="app_feature"
                  entityId={featureId!}
                  currentUser={user || undefined}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature request? This action
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
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
