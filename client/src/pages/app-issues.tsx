import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CircleFadingPlus, Bug, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
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

function IssueCard({ issue }: { issue: AppIssueWithRelations }) {
  const createdByName = [issue.createdBy.firstName, issue.createdBy.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";
  const SeverityIcon = severityIcons[issue.severity as IssueSeverity];

  return (
    <Link href={`/app/issues/${issue.id}`}>
      <Card className="py-3 space-y-3 hover-elevate cursor-pointer" data-testid={`card-issue-${issue.id}`}>
        <CardHeader className="px-3 py-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                <Badge 
                  className={statusColors[issue.status as IssueStatus]}
                  data-testid={`badge-status-${issue.id}`}
                >
                  {statusLabels[issue.status as IssueStatus]}
                </Badge>
                <Badge 
                  variant="outline"
                  className={severityColors[issue.severity as IssueSeverity]}
                  data-testid={`badge-severity-${issue.id}`}
                >
                  <SeverityIcon className="h-3 w-3 mr-1" />
                  {severityLabels[issue.severity as IssueSeverity]}
                </Badge>
              </div>

              <CardTitle className="text-lg line-clamp-2" data-testid={`text-issue-title-${issue.id}`}>
                {issue.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 py-0">
          <CardDescription className="line-clamp-3" data-testid={`text-issue-description-${issue.id}`}>
            {issue.description}
          </CardDescription>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-2 px-3 py-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate max-w-[100px]">{createdByName}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {issue.createdAt && format(new Date(issue.createdAt), "MMM d, yyyy")}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default function AppIssues() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: issues = [], isLoading } = useQuery<AppIssueWithRelations[]>({
    queryKey: ["/api/app-issues"],
  });

  const filteredIssues = issues.filter((issue) => {
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;
    if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
    return true;
  });

  const groupedByStatus = filteredIssues.reduce((acc, issue) => {
    const status = issue.status as IssueStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(issue);
    return acc;
  }, {} as Record<IssueStatus, AppIssueWithRelations[]>);

  const statusOrder: IssueStatus[] = ["reported", "under_review", "in_progress", "fixed", "closed", "duplicate"];

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App" }, { label: "Issues" }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[{ label: "App" }, { label: "Issues" }]}
      actionButton={{
        label: "Report Issue",
        href: "/app/issues/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <div className="overflow-hidden flex flex-col h-full">
        <div className="border-b p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOrder.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-severity-filter">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bug className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== "all" || severityFilter !== "all"
                  ? "Try adjusting your filters to see more issues."
                  : "No issues have been reported yet."}
              </p>
              <Button asChild>
                <Link href="/app/issues/new">Report an Issue</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {statusOrder
                .filter((status) => groupedByStatus[status]?.length > 0)
                .map((status) => (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-lg font-semibold">{statusLabels[status]}</h2>
                      <Badge variant="secondary">{groupedByStatus[status].length}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedByStatus[status].map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
