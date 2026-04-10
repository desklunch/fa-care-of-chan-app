import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/components/data-grid/filter-bar";
import type { FilterConfig } from "@/components/data-grid/types";
import { CircleFadingPlus, Lightbulb, Diamond, Tag, Layers, ChevronRight, Archive } from "lucide-react";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureCategory, FeatureStatus } from "@shared/schema";
import { PriorityIcon } from "@/components/priority-icon";

type GroupBy = "none" | "status" | "category";

const statusLabels: Record<FeatureStatus, string> = {
  proposed: "Proposed",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

const statusSortOrder: Record<FeatureStatus, number> = {
  planned: 0,
  under_review: 1,
  proposed: 2,
  in_progress: 3,
  completed: 4,
  archived: 5,
};

const statusColors: Record<FeatureStatus, string> = {
  proposed: "bg-blue-800 text-background dark:bg-blue-400 dark:text-background",
  under_review: "bg-yellow-800 text-background dark:bg-yellow-400 dark:text-background",
  planned: "bg-purple-800 text-background dark:bg-purple-400 dark:text-background",
  in_progress: "bg-orange-800 text-background dark:bg-orange-400 dark:text-background",
  completed: "bg-green-800 text-background dark:bg-green-400 dark:text-background",
  archived: "bg-gray-800 text-background dark:bg-gray-400 dark:text-background",
};

function FeatureRow({ feature }: { feature: AppFeatureWithRelations }) {
  return (
      <div 
        className=" odd:bg-background even:bg-black/[2%] dark:even:bg-foreground/[2%]"
        data-testid={`row-feature-${feature.id}`}
      >
        <Link href={`/app/features/${feature.id}`} className="flex flex-wrap items-center gap-2 px-4 py-4 hover-elevate cursor-pointer">

        <span  className="shrink-0 w-20 "
>
          <Badge 
            variant="secondary"
            className=" justify-start border-none"

            data-testid={`badge-category-${feature.id}`}
          >
            {feature.category?.name || "Uncategorized"}
          </Badge>
        </span>
        
        
        <span 
          className="min-w-0 flex-1 lg:flex-none lg:w-64 flex items-center gap-1.5"
          data-testid={`text-feature-title-${feature.id}`}
        >
          {feature.priority && (
            <span className="shrink-0 inline-flex items-center text-muted-foreground" data-testid={`icon-priority-${feature.id}`}>
              <PriorityIcon priority={feature.priority} />
            </span>
          )}
          <span className="font-medium truncate text-sm">{feature.title}</span>
        </span>
        
        <span 
          className="hidden lg:block text-xs text-muted-foreground flex-1 min-w-0 truncate"
          data-testid={`text-feature-description-${feature.id}`}
        >
          {feature.description}
        </span>
        
        <Badge 
          className={`shrink-0 px-1 py-0.5 rounded-sm uppercase ml-4 font-medium  bg-background border  ${statusColors[feature.status as FeatureStatus]}`}
          size="sm"
          data-testid={`badge-status-${feature.id}`}
        >
          {statusLabels[feature.status as FeatureStatus]}
        </Badge>
          </Link>
      </div>

  );
}

const featureFilters: FilterConfig<AppFeatureWithRelations>[] = [
  {
    id: "status",
    label: "Status",
    icon: Diamond,
    optionSource: {
      type: "static",
      options: Object.entries(statusLabels).map(([value, label]) => ({ id: value, label })),
    },
    matchFn: (feature, selectedValues) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(feature.status);
    },
  },
  {
    id: "category",
    label: "Category",
    icon: Tag,
    optionSource: {
      type: "query",
      queryKey: "/api/categories",
      labelField: "name",
      valueField: "id",
    },
    matchFn: (feature, selectedValues) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.includes(String(feature.categoryId));
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
        { id: "category", label: "Group by Category" },
        { id: "none", label: "No Grouping" },
      ],
    },
    matchFn: () => true,
  },
];

const CATEGORY_TABS = ["All", "Sales", "Programming", "Production", "Archived"] as const;
type TabValue = "all" | "Sales" | "Programming" | "Production" | "archived";

const initialFilterStates: Record<TabValue, Record<string, string[]>> = {
  all: { groupBy: ["category"] },
  Sales: { groupBy: ["status"] },
  Programming: { groupBy: ["status"] },
  Production: { groupBy: ["status"] },
  archived: { groupBy: ["category"] },
};

export default function AppFeatures() {
  usePageTitle("Features");
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [perTabFilters, setPerTabFilters] = useState<Record<TabValue, Record<string, string[]>>>(
    () => ({ ...initialFilterStates })
  );

  const { data: features = [], isLoading: featuresLoading } = useQuery<AppFeatureWithRelations[]>({
    queryKey: ["/api/features"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    setPerTabFilters(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [filterId]: values },
    }));
  }, [activeTab]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const isAllTab = activeTab === "all";
  const isArchivedTab = activeTab === "archived";
  const isCategoryTab = !isAllTab && !isArchivedTab;
  const filterState = perTabFilters[activeTab];

  const selectedStatuses = filterState.status || [];
  const selectedCategories = filterState.category || [];
  const groupBy = isAllTab || isArchivedTab
    ? ((filterState.groupBy?.[0] || "category") as GroupBy)
    : "status";

  const activeFilters = useMemo(() => {
    if (isAllTab || isArchivedTab) return featureFilters;
    return featureFilters.filter((f) => f.id !== "groupBy" && f.id !== "category");
  }, [isAllTab, isArchivedTab]);

  const tabFilteredFeatures = useMemo(() => {
    if (isArchivedTab) {
      return features.filter((f) => f.status === "archived");
    }
    const nonArchived = features.filter((f) => f.status !== "archived");
    if (isAllTab) return nonArchived;
    const matchingCategory = categories.find(
      (c) => c.name.toLowerCase() === activeTab.toLowerCase()
    );
    if (!matchingCategory) return [];
    return nonArchived.filter((f) => f.categoryId === matchingCategory.id);
  }, [features, categories, activeTab, isAllTab, isArchivedTab]);

  const filteredFeatures = useMemo(() => {
    return tabFilteredFeatures.filter((f) => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(f.status)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(String(f.categoryId))) return false;
      return true;
    }).sort((a, b) => {
      const aOrder = statusSortOrder[a.status as FeatureStatus] ?? 99;
      const bOrder = statusSortOrder[b.status as FeatureStatus] ?? 99;
      return aOrder - bOrder;
    });
  }, [tabFilteredFeatures, selectedStatuses, selectedCategories]);

  const groupedFeatures = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: Record<string, { label: string; color?: string; features: AppFeatureWithRelations[] }> = {};

    filteredFeatures.forEach((feature) => {
      let groupKey: string;
      let groupLabel: string;
      let groupColor: string | undefined;

      if (groupBy === "status") {
        groupKey = feature.status;
        groupLabel = statusLabels[feature.status as FeatureStatus] || feature.status;
      } else {
        groupKey = String(feature.categoryId);
        groupLabel = feature.category?.name || "Uncategorized";
        groupColor = feature.category?.color || undefined;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, color: groupColor, features: [] };
      }
      groups[groupKey].features.push(feature);
    });

    return Object.entries(groups);
  }, [filteredFeatures, groupBy]);

  const hasActiveFilters = selectedStatuses.length > 0 || selectedCategories.length > 0;

  const emptyTitle = useMemo(() => {
    if (hasActiveFilters) return "No feature requests yet";
    if (isArchivedTab) return "No archived features";
    if (isCategoryTab) return `No features in ${activeTab}`;
    return "No feature requests yet";
  }, [hasActiveFilters, isArchivedTab, isCategoryTab, activeTab]);

  const emptyDescription = useMemo(() => {
    if (hasActiveFilters) return "Try adjusting your filters to see more features.";
    if (isArchivedTab) return "Archived features will appear here.";
    if (isCategoryTab) return `There are no features assigned to the ${activeTab} category.`;
    return "Be the first to suggest a new feature or improvement.";
  }, [hasActiveFilters, isArchivedTab, isCategoryTab, activeTab]);

  const isLoading = featuresLoading || categoriesLoading;

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "App" }, { label: "Features" }]}>
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
      breadcrumbs={[{ label: "App" }, { label: "Features" }]}
      primaryAction={{
        label: "New Feature",
        href: "/app/features/new",
        icon: CircleFadingPlus,
        variant: "default",
      }}
    >
      <div className="overflow-hidden max-w-7xl flex flex-col h-full p-4 md:p-6 gap-4 md:gap-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList data-testid="tabs-category">
            {CATEGORY_TABS.map((tab) => {
              const value = tab === "All" ? "all" : tab === "Archived" ? "archived" : tab;
              return (
                <TabsTrigger
                  key={tab}
                  value={value}
                  data-testid={`tab-${tab.toLowerCase()}`}
                >
                  {tab === "Archived" && <Archive className="h-3.5 w-3.5 mr-1.5" />}
                  {tab}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div>
          <FilterBar
            filters={activeFilters}
            data={tabFilteredFeatures}
            filterState={filterState}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="overflow-y-scroll border rounded-lg h-full">
          {filteredFeatures.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                {isArchivedTab
                  ? <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                  : <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />}
                <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
                  {emptyTitle}
                </h3>
                <p className="text-muted-foreground mb-4" data-testid="text-empty-description">
                  {emptyDescription}
                </p>
                {!isArchivedTab && (
                  <Link href="/app/features/new">
                    <Button data-testid="button-new-feature-empty">
                      <CircleFadingPlus className="h-4 w-4 mr-2" />
                      New Feature
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ) : groupedFeatures ? (
            groupedFeatures.map(([groupKey, group]) => (
              <div key={groupKey}>
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full sticky top-0 z-10 px-4 py-2 text-sm font-medium bg-muted/80 backdrop-blur-sm border-b flex items-center gap-2 cursor-pointer select-none hover-elevate"
                  data-testid={`group-header-${groupKey}`}
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      collapsedGroups[groupKey] ? "" : "rotate-90"
                    }`}
                  />
                  {group.color && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {group.label}
                  <span className="text-muted-foreground">({group.features.length})</span>
                </button>
                {!collapsedGroups[groupKey] && group.features.map((feature) => (
                  <FeatureRow key={feature.id} feature={feature} />
                ))}
              </div>
            ))
          ) : (
            filteredFeatures.map((feature) => (
              <FeatureRow key={feature.id} feature={feature} />
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
