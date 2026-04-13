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
import { SquarePen, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { AppIssueWithRelations, IssueSeverity, IssueStatus } from "@shared/schema";
import { formatTimeAgo } from "@/lib/format-time";

const statusLabels: Record<IssueStatus, string> = {
  reported: "Reported",
  under_review: "Under Review",
  in_progress: "In Progress",
  fixed: "Fixed",
  closed: "Closed",
  duplicate: "Duplicate",
};

const statusColors: Record<IssueStatus, string> = {
  reported: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fixed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  duplicate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const severityLabels: Record<IssueSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const severityColors: Record<IssueSeverity, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const statusOrder: IssueStatus[] = ["reported", "under_review", "in_progress", "fixed", "closed", "duplicate"];

export default function AppIssueDetail() {
  const [, params] = useRoute<{ id: string }>("/app/issues/:id");
  const issueId = params?.id;
  const [, setLocation] = useProtectedLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: issue, isLoading: issueLoading } = useQuery<AppIssueWithRelations>({
    queryKey: ["/api/app-issues", issueId],
    enabled: !!issueId,
  });

  usePageTitle(issue?.title || "Issue");

  const statusMutation = useMutation({
    mutationFn: async (status: IssueStatus) => {
      return apiRequest("PATCH", `/api/app-issues/${issueId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues", issueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
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
      return apiRequest("DELETE", `/api/app-issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue deleted successfully!" });
      setShowDeleteDialog(false);
      setLocation("/app/issues");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const isAdmin = user?.role === "admin";
  const canEdit = isAdmin || user?.id === issue?.createdById;
  const canDelete = isAdmin || user?.id === issue?.createdById;

  if (issueLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App" }, { label: "Issues", href: "/app/issues" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!issue) {
    return (
      <PageLayout breadcrumbs={[{ label: "App" }, { label: "Issues", href: "/app/issues" }, { label: "Not Found" }]}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Issue not found</p>
          <Link href="/app/issues">
            <Button variant="outline" data-testid="button-back-to-issues">Back to Issues</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[{ label: "App" }, { label: "Issues", href: "/app/issues" }, { label: issue.title }]}
      primaryAction={canEdit ? {
        label: "Edit",
        href: `/app/issues/${issue.id}/edit`,
        icon: SquarePen,
        variant: "outline",
      } : undefined}
      additionalActions={canDelete ? [
        {
          label: "Delete Issue",
          onClick: () => setShowDeleteDialog(true),
          icon: Trash2,
          variant: "destructive",
        },
      ] : []}
    >
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 bg-background z-[10]">
          <div className=" px-4 md:px-6 pb-2 md:pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold" data-testid="text-issue-title">
                  {issue.title}
                </h1>
              </div>
            </div>
          </div>

          <div className="">
            <TabsList className="px-4 md:px-6 w-full sm:w-auto">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="max-w-4xl p-4 md:p-6 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-1">
                <FieldRow label="Status" testId="field-issue-status">
                  {isAdmin ? (
                    <Select 
                      value={issue.status}
                      onValueChange={(value) => statusMutation.mutate(value as IssueStatus)}
                      disabled={statusMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOrder.map((status) => (
                          <SelectItem key={status} value={status} data-testid={`select-option-status-${status}`}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      className={statusColors[issue.status as IssueStatus]}
                      data-testid="badge-issue-status"
                    >
                      {statusLabels[issue.status as IssueStatus]}
                    </Badge>
                  )}
                </FieldRow>

                <FieldRow label="Severity" testId="field-issue-severity">
                  <Badge 
                    className={severityColors[issue.severity as IssueSeverity]}
                    data-testid="badge-issue-severity"
                  >
                    {severityLabels[issue.severity as IssueSeverity]}
                  </Badge>
                </FieldRow>

                <FieldRow label="Description" testId="field-issue-description">
                  <p className="whitespace-pre-wrap text-muted-foreground" data-testid="text-issue-description">
                    {issue.description || "No description provided"}
                  </p>
                </FieldRow>

                <FieldRow label="Reported By" testId="field-issue-reported-by">
                  <span data-testid="text-created-by">
                    {issue.createdBy?.firstName || ""} {issue.createdBy?.lastName || ""}
                  </span>
                </FieldRow>

                <FieldRow label="Reported On" testId="field-issue-reported-on">
                  <span data-testid="text-created-at">
                    {issue.createdAt ? formatTimeAgo(new Date(issue.createdAt)) : "Unknown"}
                  </span>
                </FieldRow>

                {issue.updatedAt && issue.updatedAt !== issue.createdAt && (
                  <FieldRow label="Last Updated" testId="field-issue-updated">
                    <span data-testid="text-updated-at">
                      {formatTimeAgo(new Date(issue.updatedAt))}
                    </span>
                  </FieldRow>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-0">
          <div className="max-w-4xl p-4 md:p-6">
            <Card>
              <CardContent className="pt-6">
                <CommentList 
                  entityType="app_issue" 
                  entityId={issueId!} 
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
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this issue? This action cannot be undone.
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
