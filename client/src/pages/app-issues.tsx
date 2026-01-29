import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/data-grid/filter-bar";
import type { FilterConfig } from "@/components/data-grid/types";
import { CircleFadingPlus, Bug, Diamond, AlertTriangle, Layers } from "lucide-react";
import { Link } from "wouter";
import type { AppIssueWithRelations, IssueSeverity, IssueStatus } from "@shared/schema";

type GroupBy = "none" | "status" | "severity";

const statusLabels: Record<IssueStatus, string> = {
  reported: "Reported",
  under_review: "Under Review",
  in_progress: "In Progress",
  fixed: "Fixed",
  closed: "Closed",
  duplicate: "Duplicate",
};

const statusColors: Record<IssueStatus, string> = {
  reported: "border-blue-800 text-blue-800 dark:border-blue-400 dark:text-blue-400",
  under_review: "border-yellow-800 text-yellow-800 dark:border-yellow-400 dark:text-yellow-400",
  in_progress: "border-orange-800 text-orange-800 dark:border-orange-400 dark:text-orange-400",
  fixed: "border-green-800 text-green-800 dark:border-green-400 dark:text-green-400",
  closed: "border-gray-800 text-gray-800 dark:border-gray-400 dark:text-gray-400",
  duplicate: "border-purple-800 text-purple-800 dark:border-purple-400 dark:text-purple-400",
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

function IssueRow({ issue }: { issue: AppIssueWithRelations }) {
  return (
    <div 
      className="odd:bg-background even:bg-black/[3%] dark:even:bg-foreground/[2%]"
      data-testid={`row-issue-${issue.id}`}
    >
      <Link href={`/app/issues/${issue.id}`} className="flex flex-wrap items-center gap-4 px-4 py-4 hover-elevate cursor-pointer">
        <span className="shrink-0 w-20">
          <Badge 
            variant="secondary"
            className={`justify-start border-none ${severityColors[issue.severity as IssueSeverity]}`}
            data-testid={`badge-severity-${issue.id}`}
          >
            {severityLabels[issue.severity as IssueSeverity]}
          </Badge>
        </span>
        
        <span 
          className="font-medium min-w-0 flex-1 lg:flex-none lg:w-64 truncate text-sm"
          data-testid={`text-issue-title-${issue.id}`}
        >
          {issue.title}
        </span>
        
        <span 
          className="hidden lg:block text-xs text-muted-foreground flex-1 min-w-0 truncate"
          data-testid={`text-issue-description-${issue.id}`}
        >
          {issue.description}
        </span>
        
        <Badge 
          className={`shrink-0 px-1 py-0.5 rounded-sm uppercase ml-4 font-medium bg-background border ${statusColors[issue.status as IssueStatus]}`}
          size="sm"
          data-testid={`badge-status-${issue.id}`}
        >
          {statusLabels[issue.status as IssueStatus]}
        </Badge>
      </Link>
    </div>
  );
}

const issueFilters: FilterConfig<AppIssueWithRelations>[] = [
  {
    id: "status",
    label: "Status",
    icon: Diamond,
    optionSource: {
      type: "static",
      options: Object.entries(statusLabels).map(([value, label]) => ({ id: value, label })),
    },
    matchFn: (issue, selectedValues) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(issue.status);
    },
  },
  {
    id: "severity",
    label: "Severity",
    icon: AlertTriangle,
    optionSource: {
      type: "static",
      options: Object.entries(severityLabels).map(([value, label]) => ({ id: value, label })),
    },
    matchFn: (issue, selectedValues) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(issue.severity);
    },
  },
  {
    id: "groupBy",
    label: "Grouping",
    icon: Layers,
    type: "single",
    optionSource: {
      type: "static",
      options: [
        { id: "status", label: "Group by Status" },
        { id: "severity", label: "Group by Severity" },
        { id: "none", label: "No Grouping" },
      ],
    },
    matchFn: () => true,
  },
];

export default function AppIssues() {
  usePageTitle("Issues");
  const [filterState, setFilterState] = useState<Record<string, string[]>>({
    groupBy: ["status"],
  });

  const { data: issues = [], isLoading } = useQuery<AppIssueWithRelations[]>({
    queryKey: ["/api/app-issues"],
  });

  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setFilterState(prev => ({ ...prev, [filterId]: values }));
  }, []);

  const selectedStatuses = filterState.status || [];
  const selectedSeverities = filterState.severity || [];
  const groupBy = (filterState.groupBy?.[0] || "status") as GroupBy;

  const filteredIssues = issues.filter((issue) => {
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(issue.status)) return false;
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(issue.severity)) return false;
    return true;
  });

  const groupedIssues = useMemo(() => {
    if (groupBy === "none") return null;
    
    const groups: Record<string, { label: string; issues: AppIssueWithRelations[] }> = {};
    
    filteredIssues.forEach((issue) => {
      let groupKey: string;
      let groupLabel: string;
      
      if (groupBy === "status") {
        groupKey = issue.status;
        groupLabel = statusLabels[issue.status as IssueStatus] || issue.status;
      } else {
        groupKey = issue.severity;
        groupLabel = severityLabels[issue.severity as IssueSeverity] || issue.severity;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, issues: [] };
      }
      groups[groupKey].issues.push(issue);
    });
    
    const statusOrder: IssueStatus[] = ["reported", "under_review", "in_progress", "fixed", "closed", "duplicate"];
    const severityOrder: IssueSeverity[] = ["high", "medium", "low"];
    const order = groupBy === "status" ? statusOrder : severityOrder;
    
    return order
      .filter((key) => groups[key])
      .map((key) => [key, groups[key]] as [string, { label: string; issues: AppIssueWithRelations[] }]);
  }, [filteredIssues, groupBy]);

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App" }, { label: "Issues" }]}>
        <div className="p-4 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      breadcrumbs={[{ label: "App" }, { label: "Issues" }]}
      primaryAction={{
        label: "Report Issue",
        href: "/app/issues/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <div className="overflow-hidden flex flex-col h-full p-4 md:p-6 gap-4 md:gap-6">
        
        <div className="">
          <FilterBar
            filters={issueFilters}
            data={issues}
            filterState={filterState}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="overflow-y-scroll border rounded-lg h-full">
          {filteredIssues.length === 0 ? (
            <Card className="p-12 h-full">
              <div className="flex flex-col h-full items-center justify-center text-center">
                <Bug className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No issues found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedStatuses.length > 0 || selectedSeverities.length > 0
                    ? "Try adjusting your filters to see more issues."
                    : "No issues have been reported yet."}
                </p>
                <Link href="/app/issues/new">
                  <Button data-testid="button-new-issue-empty">
                    <CircleFadingPlus className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </Link>
              </div>
            </Card>
          ) : groupedIssues ? (
            groupedIssues.map(([groupKey, group]) => (
              <div key={groupKey}>
                <div 
                  className="sticky top-0 z-10 px-4 py-2 text-sm font-medium bg-muted/80 backdrop-blur-sm border-b"
                  data-testid={`group-header-${groupKey}`}
                >
                  {group.label}
                  <span className="text-muted-foreground ml-2">({group.issues.length})</span>
                </div>
                {group.issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </div>
            ))
          ) : (
            filteredIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
