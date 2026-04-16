import { useCallback, useMemo } from "react";
import { EntityTaskGrid } from "@/components/entity-task-grid";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import {
  DataFilterBar,
  useDataFilterBarState,
} from "@/components/data-filter-bar";
import type { FilterConfig } from "@/components/data-grid/types";
import type { EntityTaskWithRelations, User } from "@shared/schema";
import { CheckCircle2, Layers, User as UserIcon } from "lucide-react";

const taskFilterConfigs: FilterConfig<EntityTaskWithRelations>[] = [
  {
    id: "status",
    label: "Status",
    icon: CheckCircle2,
    type: "multi",
    optionSource: {
      type: "static",
      options: [
        { id: "todo", label: "To Do" },
        { id: "in_progress", label: "In Progress" },
        { id: "done", label: "Done" },
      ],
    },
    matchFn: (task, selectedValues) => selectedValues.includes(task.status),
  },
  {
    id: "entityType",
    label: "Entity Type",
    icon: Layers,
    type: "multi",
    optionSource: {
      type: "static",
      options: [
        { id: "deal", label: "Deal" },
        { id: "proposal", label: "Proposal" },
      ],
    },
    matchFn: (task, selectedValues) => selectedValues.includes(task.entityType),
  },
  {
    id: "owner",
    label: "Owner",
    icon: UserIcon,
    type: "multi",
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const ownerMap = new Map<string, string>();
        data.forEach((task) => {
          if (task.owner && task.ownerId) {
            const fullName =
              [task.owner.firstName, task.owner.lastName]
                .filter(Boolean)
                .join(" ") || "Unknown";
            if (!ownerMap.has(task.ownerId)) {
              ownerMap.set(task.ownerId, fullName);
            }
          }
          task.subTasks?.forEach((sub) => {
            if (sub.owner && sub.ownerId) {
              const fullName =
                [sub.owner.firstName, sub.owner.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unknown";
              if (!ownerMap.has(sub.ownerId)) {
                ownerMap.set(sub.ownerId, fullName);
              }
            }
          });
        });
        return Array.from(ownerMap.entries()).map(([id, label]) => ({
          id,
          label,
        }));
      },
    },
    matchFn: (task, selectedValues) => {
      if (!task.ownerId) return false;
      return selectedValues.includes(task.ownerId);
    },
  },
];

export default function TasksPage() {
  const { can } = usePermissions();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!can("admin.settings")) {
      navigate("/");
    }
  }, [can, navigate]);

  const {
    filterState,
    searchText,
    setFilterState,
    setSearchText,
    hasActiveFilters,
  } = useDataFilterBarState("/tasks");

  const handleFilterChange = useCallback(
    (filterId: string, values: string[]) => {
      setFilterState((prev) => ({
        ...prev,
        [filterId]: values,
      }));
    },
    [setFilterState]
  );

  const { data: allTasks = [] } = useQuery<EntityTaskWithRelations[]>({
    queryKey: ["/api/entity-tasks/all"],
    queryFn: async () => {
      const res = await fetch("/api/entity-tasks/all", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    staleTime: 0,
  });

  const { data: users = [] } = useQuery<
    Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">[]
  >({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const gridFilters = useMemo(
    () => ({
      filterState,
      searchText,
    }),
    [filterState, searchText]
  );

  const totalTasks = allTasks.reduce(
    (sum, t) => sum + 1 + (t.subTasks?.length ?? 0),
    0
  );

  const filteredCount = useMemo(() => {
    if (!hasActiveFilters) return totalTasks;

    const hasActiveSearch = searchText.trim().length > 0;
    const hasActiveFilterState = Object.values(filterState).some(
      (v) => v.length > 0
    );

    if (!hasActiveSearch && !hasActiveFilterState) return totalTasks;

    const matchesTask = (t: EntityTaskWithRelations) => {
      if (hasActiveFilterState) {
        const passes = taskFilterConfigs.every((fc) => {
          const selectedValues = filterState[fc.id] || [];
          if (selectedValues.length === 0) return true;
          return fc.matchFn(t, selectedValues);
        });
        if (!passes) return false;
      }
      if (hasActiveSearch) {
        if (!t.name.toLowerCase().includes(searchText.toLowerCase()))
          return false;
      }
      return true;
    };

    let count = 0;
    allTasks.forEach((task) => {
      const parentMatch = matchesTask(task);
      const subMatch =
        task.subTasks?.some((s) =>
          matchesTask(s as EntityTaskWithRelations)
        ) ?? false;
      if (parentMatch || subMatch) {
        count += 1 + (task.subTasks?.length ?? 0);
      }
    });
    return count;
  }, [allTasks, filterState, searchText, hasActiveFilters, totalTasks]);

  if (!can("admin.settings")) {
    return null;
  }

  return (
    <PageLayout breadcrumbs={[{ label: "Tasks" }]}>
      <div className="p-6" data-testid="page-tasks">
        <div className="mb-4" data-testid="tasks-filter-bar">
          <DataFilterBar
            filters={taskFilterConfigs}
            data={allTasks}
            searchPlaceholder="Search tasks..."
            filterState={filterState}
            searchText={searchText}
            onFilterChange={handleFilterChange}
            onSearchChange={setSearchText}
            resultCount={
              hasActiveFilters
                ? { filtered: filteredCount, total: totalTasks }
                : undefined
            }
          />
        </div>

        <EntityTaskGrid
          showEntityType
          filters={gridFilters}
          filterConfigs={taskFilterConfigs}
          allUsers={users}
        />
      </div>
    </PageLayout>
  );
}
