import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/framework";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, GripVertical } from "lucide-react";
import { Link } from "wouter";
import type { AppFeatureWithRelations, FeatureStatus, FeaturePriority } from "@shared/schema";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const priorityColors: Record<FeaturePriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-800 dark:text-sky-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
};

const priorityLabels: Record<FeaturePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const roadmapStatuses: FeatureStatus[] = ["proposed", "under_review", "planned", "in_progress", "completed"];

interface SortableFeatureCardProps {
  feature: AppFeatureWithRelations;
  isDragging?: boolean;
}

function SortableFeatureCard({ feature, isDragging }: SortableFeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`sortable-feature-${feature.id}`}>
      <FeatureCard 
        feature={feature} 
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

interface FeatureCardProps {
  feature: AppFeatureWithRelations;
  dragHandleProps?: Record<string, any>;
  isOverlay?: boolean;
}

function FeatureCard({ feature, dragHandleProps, isOverlay }: FeatureCardProps) {
  const createdByName = [feature.createdBy.firstName, feature.createdBy.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  return (
    <Card 
      className={`mb-2 ${isOverlay ? 'shadow-xl ring-2 ring-primary rotate-2' : 'hover-elevate'}`}
      data-testid={`card-roadmap-feature-${feature.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing touch-none p-0.5 hover:bg-muted rounded mt-0.5 shrink-0"
              data-testid={`drag-handle-feature-${feature.id}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <Link href={`/app/features/${feature.id}`}>
              <h4 className="font-medium text-sm line-clamp-2 cursor-pointer hover:text-primary" data-testid={`text-roadmap-feature-title-${feature.id}`}>
                {feature.title}
              </h4>
            </Link>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {feature.description}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {feature.priority && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${priorityColors[feature.priority as FeaturePriority]}`}
                  data-testid={`badge-priority-${feature.id}`}
                >
                  {priorityLabels[feature.priority as FeaturePriority]}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                <span data-testid={`text-roadmap-votes-${feature.id}`}>{feature.voteCount}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {createdByName}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusColumnProps {
  status: FeatureStatus;
  features: AppFeatureWithRelations[];
  activeId: string | null;
}

function StatusColumn({ status, features, activeId }: StatusColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[350px] flex flex-col rounded-lg transition-colors ${
        isOver ? 'bg-muted/50' : ''
      }`}
      data-testid={`column-status-${status}`}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Badge className={statusColors[status]} data-testid={`badge-column-status-${status}`}>
          {statusLabels[status]}
        </Badge>
        <span className="text-sm text-muted-foreground" data-testid={`text-column-count-${status}`}>
          ({features.length})
        </span>
      </div>
      <div className="flex-1 min-h-[200px] p-1 border border-dashed rounded-lg border-muted-foreground/20">
        <SortableContext 
          items={features.map(f => f.id)} 
          strategy={verticalListSortingStrategy}
        >
          {features.map((feature) => (
            <SortableFeatureCard 
              key={feature.id} 
              feature={feature}
              isDragging={activeId === feature.id}
            />
          ))}
        </SortableContext>
        {features.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8">
            No features
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppFeatureRoadmap() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localFeatures, setLocalFeatures] = useState<AppFeatureWithRelations[] | null>(null);

  const { data: features, isLoading } = useQuery<AppFeatureWithRelations[]>({
    queryKey: ["/api/features"],
  });

  const displayFeatures = localFeatures ?? features ?? [];

  const activeFeature = useMemo(() => {
    if (!activeId) return null;
    return displayFeatures.find(f => f.id === activeId);
  }, [activeId, displayFeatures]);

  const featuresByStatus = useMemo(() => {
    const grouped: Record<FeatureStatus, AppFeatureWithRelations[]> = {
      proposed: [],
      under_review: [],
      planned: [],
      in_progress: [],
      completed: [],
      archived: [],
    };
    
    displayFeatures
      .filter(f => roadmapStatuses.includes(f.status as FeatureStatus))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(feature => {
        const status = feature.status as FeatureStatus;
        if (grouped[status]) {
          grouped[status].push(feature);
        }
      });
    
    return grouped;
  }, [displayFeatures]);

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sortOrder: number; status?: string }[]) => {
      return apiRequest("PATCH", "/api/features/reorder", { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/features"] });
      setLocalFeatures(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reorder features",
        description: error.message,
        variant: "destructive",
      });
      setLocalFeatures(null);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (!localFeatures && features) {
      setLocalFeatures([...features]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localFeatures) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeFeature = localFeatures.find(f => f.id === activeId);
    if (!activeFeature) return;

    const isOverColumn = roadmapStatuses.includes(overId as FeatureStatus);
    
    if (isOverColumn) {
      const newStatus = overId as FeatureStatus;
      if (activeFeature.status !== newStatus) {
        setLocalFeatures(prev => {
          if (!prev) return prev;
          return prev.map(f => 
            f.id === activeId 
              ? { ...f, status: newStatus }
              : f
          );
        });
      }
    } else {
      const overFeature = localFeatures.find(f => f.id === overId);
      if (overFeature && overFeature.status !== activeFeature.status) {
        setLocalFeatures(prev => {
          if (!prev) return prev;
          return prev.map(f => 
            f.id === activeId 
              ? { ...f, status: overFeature.status }
              : f
          );
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !localFeatures) {
      setLocalFeatures(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeFeature = localFeatures.find(f => f.id === activeId);
    if (!activeFeature) {
      setLocalFeatures(null);
      return;
    }

    const targetStatus = activeFeature.status as FeatureStatus;
    const statusFeatures = localFeatures
      .filter(f => f.status === targetStatus)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const isOverColumn = roadmapStatuses.includes(overId as FeatureStatus);
    
    let newOrder: AppFeatureWithRelations[];
    
    if (isOverColumn) {
      newOrder = statusFeatures;
    } else {
      const overIndex = statusFeatures.findIndex(f => f.id === overId);
      const activeIndex = statusFeatures.findIndex(f => f.id === activeId);
      
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        newOrder = arrayMove(statusFeatures, activeIndex, overIndex);
      } else {
        newOrder = statusFeatures;
      }
    }

    const updates: { id: string; sortOrder: number; status?: string }[] = [];
    const originalFeatures = features ?? [];
    
    newOrder.forEach((feature, index) => {
      const originalFeature = originalFeatures.find(f => f.id === feature.id);
      if (
        feature.sortOrder !== index || 
        (originalFeature && originalFeature.status !== feature.status)
      ) {
        updates.push({
          id: feature.id,
          sortOrder: index,
          ...(originalFeature && originalFeature.status !== feature.status 
            ? { status: feature.status } 
            : {}
          ),
        });
      }
    });

    localFeatures
      .filter(f => f.status !== targetStatus)
      .forEach(feature => {
        const originalFeature = originalFeatures.find(f => f.id === feature.id);
        if (originalFeature && originalFeature.status !== feature.status) {
          if (!updates.find(u => u.id === feature.id)) {
            updates.push({
              id: feature.id,
              sortOrder: feature.sortOrder,
              status: feature.status,
            });
          }
        }
      });

    if (updates.length > 0) {
      const updatedFeatures = localFeatures.map(f => {
        const update = updates.find(u => u.id === f.id);
        if (update) {
          return { ...f, sortOrder: update.sortOrder };
        }
        return f;
      });
      setLocalFeatures(updatedFeatures);
      reorderMutation.mutate(updates);
    } else {
      setLocalFeatures(null);
    }
  };

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Feature Roadmap" }]}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {roadmapStatuses.map((status) => (
            <div key={status} className="flex-1 min-w-[280px] max-w-[350px]">
              <Skeleton className="h-6 w-24 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Feature Roadmap" }]}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4" data-testid="roadmap-columns">
          {roadmapStatuses.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              features={featuresByStatus[status]}
              activeId={activeId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeFeature ? (
            <FeatureCard feature={activeFeature} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </PageLayout>
  );
}
