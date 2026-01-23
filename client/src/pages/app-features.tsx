import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleFadingPlus, Lightbulb } from "lucide-react";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureCategory, FeatureStatus } from "@shared/schema";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: features = [], isLoading: featuresLoading } = useQuery<AppFeatureWithRelations[]>({
    queryKey: ["/api/features"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories"],
  });

  const filteredFeatures = features.filter((f) => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (categoryFilter !== "all" && f.categoryId !== categoryFilter) return false;
    return true;
  });

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
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
          ) : (
            <div className="divide-y">
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
