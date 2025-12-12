import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { SquarePen, Trash2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { AppIssueWithRelations, IssueSeverity, IssueStatus } from "@shared/schema";

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

const severityIcons: Record<IssueSeverity, typeof AlertTriangle> = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: Info,
};

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

const statusOrder: IssueStatus[] = ["reported", "under_review", "in_progress", "fixed", "closed", "duplicate"];

export default function AppIssueDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: issue, isLoading } = useQuery<AppIssueWithRelations>({
    queryKey: ["/api/app-issues", id],
  });

  const isAdmin = user?.role === "admin";
  const isOwner = issue?.createdById === user?.id;
  const canEdit = isOwner || isAdmin;

  const updateStatusMutation = useMutation({
    mutationFn: async (status: IssueStatus) => {
      return apiRequest("PATCH", `/api/app-issues/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues", id] });
      toast({ title: "Status updated successfully" });
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
      return apiRequest("DELETE", `/api/app-issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-issues"] });
      toast({ title: "Issue deleted successfully" });
      navigate("/app/issues");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete issue", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[
                    { label: "App" },
          { label: "Issues", href: "/app/issues" },
          { label: "Loading..." },
        ]}
      >
        <div className="p-6 space-y-6 max-w-3xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!issue) {
    return (
      <PageLayout 
        breadcrumbs={[
                    { label: "App" },
          { label: "Issues", href: "/app/issues" },
          { label: "Not Found" },
        ]}
      >
        <div className="p-6 flex flex-col items-center justify-center h-64">
          <h3 className="text-lg font-medium mb-2">Issue Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The issue you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/app/issues")}>
            Back to Issues
          </Button>
        </div>
      </PageLayout>
    );
  }

  const SeverityIcon = severityIcons[issue.severity as IssueSeverity];
  const createdByName = [issue.createdBy.firstName, issue.createdBy.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return (
    <>
      <PageLayout 
        breadcrumbs={[
                    { label: "App" },
          { label: "Issues", href: "/app/issues" },
          { label: issue.title },
        ]}
        primaryAction={canEdit ? {
          label: "Edit",
          icon: SquarePen,
          href: `/app/issues/${id}/edit`,
        } : undefined}
        additionalActions={isAdmin ? [
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive",
            onClick: () => setDeleteDialogOpen(true),
          },
        ] : undefined}
      >
        <div className="p-6 max-w-3xl space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-3" data-testid="text-issue-title">
                {issue.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge 
                  className={statusColors[issue.status as IssueStatus]}
                  data-testid="badge-issue-status"
                >
                  {statusLabels[issue.status as IssueStatus]}
                </Badge>
                <Badge 
                  variant="outline"
                  className={severityColors[issue.severity as IssueSeverity]}
                  data-testid="badge-issue-severity"
                >
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityLabels[issue.severity as IssueSeverity]}
                </Badge>
              </div>
            </div>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap" data-testid="text-issue-description">
              {issue.description}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Reported by</span>
                <p className="font-medium" data-testid="text-reporter">{createdByName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reported on</span>
                <p className="font-medium" data-testid="text-created-date">
                  {issue.createdAt && format(new Date(issue.createdAt), "PPP")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last updated</span>
                <p className="font-medium" data-testid="text-updated-date">
                  {issue.updatedAt && format(new Date(issue.updatedAt), "PPP")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>Update the status of this issue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select 
                  value={issue.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value as IssueStatus)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-[200px]" data-testid="select-admin-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOrder.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateStatusMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Issue</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this issue? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
