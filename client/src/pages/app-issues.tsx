import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { SingleSelect } from "@/components/ui/single-select";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleFadingPlus, Bug, ListFilter, AlertTriangle, Layers } from "lucide-react";
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

export default function AppIssues() {
  usePageTitle("Issues");
  const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<(string | number)[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  const { data: issues = [], isLoading } = useQuery<AppIssueWithRelations[]>({
    queryKey: ["/api/app-issues"],
  });

  const statusItems = useMemo(() => 
    Object.entries(statusLabels).map(([value, label]) => ({ id: value, label })),
    []
  );

  const severityItems = useMemo(() => 
    Object.entries(severityLabels).map(([value, label]) => ({ id: value, label })),
    []
  );

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <MultiSelect
              triggerLabel="Status"
              triggerIcon={<ListFilter className="h-4 w-4" />}
              items={statusItems}
              itemLabels={statusLabels}
              selectedIds={selectedStatuses}
              onSelectionChange={setSelectedStatuses}
              showSelectAll={true}
              showSearch={true}
              testIdPrefix="status-filter"
            />
            <MultiSelect
              triggerLabel="Severity"
              triggerIcon={<AlertTriangle className="h-4 w-4" />}
              items={severityItems}
              itemLabels={severityLabels}
              selectedIds={selectedSeverities}
              onSelectionChange={setSelectedSeverities}
              showSelectAll={true}
              showSearch={true}
              testIdPrefix="severity-filter"
            />
            <SingleSelect
              triggerLabel="Grouping"
              triggerIcon={<Layers className="h-4 w-4" />}
              items={[
                { id: "status", label: "By Status" },
                { id: "severity", label: "By Severity" },
                { id: "none", label: "None" },
              ]}
              itemLabels={{ status: "By Status", severity: "By Severity", none: "None" }}
              selectedId={groupBy}
              onSelectionChange={(id) => setGroupBy(id as GroupBy)}
              testIdPrefix="group-by"
              showSearch={false}
            />
          </div>
        </div>

        <div className="overflow-y-scroll border rounded-lg h-full">
          {filteredIssues.length === 0 ? (
            <Card className="p-12 h-full">
              <div className="flex flex-col h-full items-center justify-center text-center">
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
            <div className="flex flex-col">
              {groupedIssues.map(([groupKey, { label, issues: groupIssues }]) => (
                <div key={groupKey} data-testid={`group-${groupKey}`}>
                  <div 
                    className="px-4 py-3 bg-muted/50 border-b flex items-center gap-2 sticky top-0 z-[10]"
                  >
                    <span className="font-semibold text-sm" data-testid={`text-group-label-${groupKey}`}>{label}</span>
                    <Badge variant="secondary" size="sm" className="px-1.5" data-testid={`badge-group-count-${groupKey}`}>{groupIssues.length}</Badge>
                  </div>
                  {groupIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="">
              {filteredIssues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
