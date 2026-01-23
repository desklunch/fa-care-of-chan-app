import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleFadingPlus, Lightbulb, ListFilter, Tag, Layers } from "lucide-react";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureCategory, FeatureStatus } from "@shared/schema";

type GroupBy = "none" | "status" | "category";

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

function FeatureRow({ feature }: { feature: AppFeatureWithRelations }) {
  return (
    <Link href={`/app/features/${feature.id}`}>
      <div 
        className="flex flex-wrap items-center gap-4 px-4 py-3 border-b hover-elevate cursor-pointer"
        data-testid={`row-feature-${feature.id}`}
      >
        <Badge 
          variant="outline"
          className="shrink-0 w-24 justify-center"
          style={{ 
            borderColor: feature.category?.color || undefined,
            color: feature.category?.color || undefined 
          }}
          data-testid={`badge-category-${feature.id}`}
        >
          {feature.category?.name || "Uncategorized"}
        </Badge>
        
        <span 
          className="font-medium min-w-0 flex-1 lg:flex-none lg:w-64 truncate"
          data-testid={`text-feature-title-${feature.id}`}
        >
          {feature.title}
        </span>
        
        <span 
          className="hidden lg:block text-sm text-muted-foreground flex-1 min-w-0 truncate"
          data-testid={`text-feature-description-${feature.id}`}
        >
          {feature.description}
        </span>
        
        <Badge 
          className={`shrink-0 uppercase ${statusColors[feature.status as FeatureStatus]}`}
          size="sm"
          data-testid={`badge-status-${feature.id}`}
        >
          {statusLabels[feature.status as FeatureStatus]}
        </Badge>
      </div>
    </Link>
  );
}

export default function AppFeatures() {
  usePageTitle("Features");
  const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<(string | number)[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const { data: features = [], isLoading: featuresLoading } = useQuery<AppFeatureWithRelations[]>({
    queryKey: ["/api/features"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const statusItems = useMemo(() => 
    Object.entries(statusLabels).map(([value, label]) => ({ id: value, label })),
    []
  );

  const categoryItems = useMemo(() => 
    categories.map((cat) => ({ id: cat.id, label: cat.name })),
    [categories]
  );

  const categoryLabels = useMemo(() => 
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.name }), {} as Record<string, string>),
    [categories]
  );

  const filteredFeatures = features.filter((f) => {
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(f.status)) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(f.categoryId)) return false;
    return true;
  });

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
        groupKey = feature.categoryId;
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
      <div className="overflow-hidden flex flex-col h-full ">
        
        <div className="border-b p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <MultiSelect
              triggerLabel="Status"
              triggerIcon={<ListFilter className="h-4 w-4" />}
              items={statusItems}
              itemLabels={statusLabels}
              selectedIds={selectedStatuses}
              onSelectionChange={setSelectedStatuses}
              showSelectAll={false}
              showSearch={false}
              testIdPrefix="status-filter"
            />
            <MultiSelect
              triggerLabel="Category"
              triggerIcon={<Tag className="h-4 w-4" />}
              items={categoryItems}
              itemLabels={categoryLabels}
              selectedIds={selectedCategories}
              onSelectionChange={setSelectedCategories}
              showSelectAll={false}
              showSearch={false}
              testIdPrefix="category-filter"
            />
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                <SelectTrigger className="w-[140px]" data-testid="select-group-by">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>


        <div className="overflow-y-scroll">
          {filteredFeatures.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No feature requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to submit an idea for improving the application!
                </p>
                <Link href="/app/features/new">
                  <Button data-testid="button-new-feature-empty">
                    <CircleFadingPlus className="h-4 w-4 mr-2" />
                    New Feature
                  </Button>
                </Link>
              </div>
            </Card>
          ) : groupedFeatures ? (
            <div className="flex flex-col">
              {groupedFeatures.map(([groupKey, { label, color, features: groupFeatures }]) => (
                <div key={groupKey} data-testid={`group-${groupKey}`}>
                  <div 
                    className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 sticky top-0 z-50"
                  >
                    {color && (
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="font-semibold text-sm" data-testid={`text-group-label-${groupKey}`}>{label}</span>
                    <Badge variant="outline" size="sm" data-testid={`badge-group-count-${groupKey}`}>{groupFeatures.length}</Badge>
                  </div>
                  {groupFeatures.map((feature) => (
                    <FeatureRow key={feature.id} feature={feature} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredFeatures.map((feature) => (
                <FeatureRow key={feature.id} feature={feature} />
              ))}
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}
