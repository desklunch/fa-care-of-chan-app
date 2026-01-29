import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { FieldRow } from "@/components/inline-edit";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/use-page-title";
import { ThumbsUp, Loader2, SquarePen, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureStatus, FeatureType } from "@shared/schema";
import { formatTimeAgo } from "@/lib/format-time";

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
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  planned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  in_progress: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const featureTypeLabels: Record<FeatureType, string> = {
  idea: "Idea",
  requirement: "Requirement",
};

const featureTypeColors: Record<FeatureType, string> = {
  idea: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  requirement: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

export default function AppFeatureDetail() {
  const [, params] = useRoute<{ id: string }>("/app/features/:id");
  const featureId = params?.id;
  const [, setLocation] = useProtectedLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: feature, isLoading: featureLoading } = useQuery<AppFeatureWithRelations>({
    queryKey: ["/api/features", featureId],
    enabled: !!featureId,
  });

  usePageTitle(feature?.title || "Feature");

  const voteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/features/${featureId}/vote`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/features", featureId] });
      const previousFeature = queryClient.getQueryData<AppFeatureWithRelations>(["/api/features", featureId]);
      if (previousFeature) {
        queryClient.setQueryData<AppFeatureWithRelations>(["/api/features", featureId], {
          ...previousFeature,
          voteCount: previousFeature.hasVoted ? previousFeature.voteCount - 1 : previousFeature.voteCount + 1,
          hasVoted: !previousFeature.hasVoted,
        });
      }
      return { previousFeature };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousFeature) {
        queryClient.setQueryData(["/api/features", featureId], context.previousFeature);
      }
      toast({ 
        title: "Failed to vote", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: FeatureStatus) => {
      return apiRequest("PATCH", `/api/features/${featureId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features", featureId] });
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      toast({ title: "Status updated!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update status", 
        description: error.message,
        variant: "destructive" 
      });
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
        variant: "destructive" 
      });
    },
  });

  const isAdmin = user?.role === "admin";
  const canDelete = isAdmin || user?.id === feature?.createdById;

  if (featureLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App"}, { label: "Features", href: "/app/features" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!feature) {
    return (
      <PageLayout breadcrumbs={[{ label: "App"}, { label: "Features", href: "/app/features" }, { label: "Not Found" }]}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Feature not found</p>
          <Link href="/app/features">
            <Button variant="outline">Back to Features</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[{ label: "App"}, { label: "Features", href: "/app/features" }, { label: feature.title }]}
      primaryAction={(isAdmin || user?.id === feature.createdById) ? {
        label: "Edit",
        href: `/app/features/${feature.id}/edit`,
        icon: SquarePen,
        variant: "outline",
      } : undefined}
      additionalActions={canDelete ? [
        {
          label: "Delete Feature",
          onClick: () => setShowDeleteDialog(true),
          icon: Trash2,
          variant: "destructive",
        },
      ] : []}
    >
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 bg-background z-[9999]">
          <div className="p-4 md:p-6 pb-2 md:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: feature.category.color || undefined,
                    color: feature.category.color || undefined 
                  }}
                  data-testid="badge-feature-category"
                >
                  {feature.category.name}
                </Badge>
                <h1 className="text-3xl font-bold" data-testid="text-feature-title">
                  {feature.title}
                </h1>
              </div>
            </div>
          </div>

          <TabsList data-testid="tabs-feature" className="px-4 md:px-6">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              Comments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="max-w-4xl space-y-6 p-4 md:p-6">
            <Card className="">
              <CardContent >
                <FieldRow label="Status" testId="field-feature-status">
                  {isAdmin ? (
                    <Select 
                      value={feature.status} 
                      onValueChange={(value) => statusMutation.mutate(value as FeatureStatus)}
                      disabled={statusMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px] h-9" data-testid="select-feature-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value} data-testid={`select-option-${value}`}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      className={statusColors[feature.status as FeatureStatus]}
                      data-testid="badge-feature-status"
                    >
                      {statusLabels[feature.status as FeatureStatus]}
                    </Badge>
                  )}
                </FieldRow>
                <FieldRow label="Description" testId="field-feature-description">
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-feature-description">
                    {feature.description || <span className="text-muted-foreground">No description provided.</span>}
                  </p>
                </FieldRow>
                {/* <FieldRow label="Type" testId="field-feature-type">
                  {feature.featureType ? (
                    <span  data-testid="badge-feature-type">
                      {featureTypeLabels[feature.featureType as FeatureType]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </FieldRow> */}






                <FieldRow label="Submitted" testId="field-feature-submitted-on" >
                  <span data-testid="text-created-at ">
                    {feature.createdAt ? formatTimeAgo(new Date(feature.createdAt)) : "Unknown"} 
                  </span>
                  <span className="px-1.5 text-muted-foreground">
                    by
                  </span>
                  <span data-testid="text-created-by" className="">
                    {feature.createdBy?.firstName || ""} {feature.createdBy?.lastName || ""}

                  </span>
                </FieldRow>
                <FieldRow label="Vote" testId="field-feature-status">
                  <Button
                    variant={feature.hasVoted ? "default" : "secondary"}
                    onClick={() => voteMutation.mutate()}
                    disabled={voteMutation.isPending}
                    className="gap-3 h-9 w-auto px-3 "
                    data-testid="button-vote"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span data-testid="text-vote-count">{feature.voteCount}</span>
                  </Button>
                </FieldRow>

              </CardContent>
              
            </Card>
         
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-0">
          <div className="max-w-4xl p-4 md:p-6">
            <Card>
              <CardContent className="pt-6">
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
              Are you sure you want to delete this feature request? This action cannot be undone.
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
    </PageLayout>
  );
}
