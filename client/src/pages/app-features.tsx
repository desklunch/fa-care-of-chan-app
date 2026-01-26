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
import { CircleFadingPlus, Lightbulb, Diamond, Tag, Layers } from "lucide-react";
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
  proposed: "border-blue-800 text-blue-800 dark:border-blue-400 dark:text-blue-400",
  under_review: "border-yellow-800 text-yellow-800 dark:border-yellow-400 dark:text-yellow-400",
  planned: "border-purple-800 text-purple-800 dark:border-purple-400 dark:text-purple-400",
  in_progress: "border-orange-800 text-orange-800 dark:border-orange-400 dark:text-orange-400",
  completed: "border-green-800 text-green-800 dark:border-green-400 dark:text-green-400",
  archived: "border-gray-800 text-gray-800 dark:border-gray-400 dark:text-gray-400",
};

function FeatureRow({ feature }: { feature: AppFeatureWithRelations }) {
  return (
      <div 
        className=" odd:bg-background even:bg-black/[3%] dark:even:bg-foreground/[2%]"
        data-testid={`row-feature-${feature.id}`}
      >
        <Link href={`/app/features/${feature.id}`} className="flex flex-wrap items-center gap-4 px-4 py-4 hover-elevate cursor-pointer">

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
          className="font-medium min-w-0 flex-1 lg:flex-none lg:w-64 truncate text-sm"
          data-testid={`text-feature-title-${feature.id}`}
        >
          {feature.title}
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

export default function AppFeatures() {
  usePageTitle("Features");
  const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<(string | number)[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

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
      <div className="overflow-hidden flex flex-col h-full p-4 md:p-6 gap-4 md:gap-6 ">
        
        <div className="">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <MultiSelect
              triggerLabel="Status"
              triggerIcon={<Diamond className="h-4 w-4" />}
              items={statusItems}
              itemLabels={statusLabels}
              selectedIds={selectedStatuses}
              onSelectionChange={setSelectedStatuses}
              showSelectAll={true}
              showSearch={true}
              testIdPrefix="status-filter"
            />
            <MultiSelect
              triggerLabel="Category"
              triggerIcon={<Tag className="h-4 w-4" />}
              items={categoryItems}
              itemLabels={categoryLabels}
              selectedIds={selectedCategories}
              onSelectionChange={setSelectedCategories}
              showSelectAll={true}
              showSearch={true}
              testIdPrefix="category-filter"
            />
            <SingleSelect
              triggerLabel="Grouping"
              triggerIcon={<Layers className="h-4 w-4" />}
              items={[
                { id: "status", label: "Status" },
                { id: "category", label: "Category" },
                { id: "none", label: "None" },
              ]}
              itemLabels={{ status: "Group by Status", category: "Group by Category", none: "Grouping" }}
              selectedId={groupBy}
              onSelectionChange={(id) => setGroupBy(id as GroupBy)}
              testIdPrefix="group-by"
              showSearch={false}
            />
          </div>
        </div>


        <div className="overflow-y-scroll border rounded-lg h-full">
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
                    className="px-4 py-3 bg-muborder-b flex items-center gap-2 sticky top-0 z-50 "
                  >
                    {color && (
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 " 
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="font-semibold text-base capitalize" data-testid={`text-group-label-${groupKey}`}>{label}</span>
                    <Badge variant="secondary" size="sm" className="px-1.5" data-testid={`badge-group-count-${groupKey}`}>{groupFeatures.length}</Badge>
                  </div>
                  {groupFeatures.map((feature) => (
                    <FeatureRow key={feature.id} feature={feature} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="">
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
