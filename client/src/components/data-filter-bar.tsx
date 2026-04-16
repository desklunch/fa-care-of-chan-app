import { useState, useMemo, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { ExpandableSearch } from "@/components/data-grid/expandable-search";
import { FilterBar } from "@/components/data-grid/filter-bar";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterConfig } from "@/components/data-grid/types";

const FILTER_VALUE_SEPARATOR = "|||";

function getFiltersFromParams(params: URLSearchParams): Record<string, string[]> {
  const filters: Record<string, string[]> = {};
  params.forEach((value, key) => {
    if (key.startsWith("f_")) {
      const filterId = key.replace("f_", "");
      if (value.includes(FILTER_VALUE_SEPARATOR)) {
        filters[filterId] = value.split(FILTER_VALUE_SEPARATOR).filter(Boolean);
      } else {
        filters[filterId] = [value];
      }
    }
  });
  return filters;
}

function getSearchFromParams(params: URLSearchParams): string {
  return params.get("q") || "";
}

export function useDataFilterBarState(basePath: string) {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const isInitializedRef = useRef(false);

  const initialParams = useMemo(() => new URLSearchParams(searchString), []);

  const [filterState, setFilterState] = useState<Record<string, string[]>>(
    () => getFiltersFromParams(initialParams)
  );
  const [searchText, setSearchText] = useState(
    () => getSearchFromParams(initialParams)
  );
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchText]);

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filterState).some((v) => v.length > 0) ||
      searchText.trim().length > 0,
    [filterState, searchText]
  );

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    const params = new URLSearchParams();

    Array.from(new URLSearchParams(window.location.search).entries()).forEach(
      ([key, value]) => {
        if (!key.startsWith("f_") && key !== "q") {
          params.set(key, value);
        }
      }
    );

    Object.entries(filterState).forEach(([filterId, values]) => {
      if (values.length > 0) {
        params.set(`f_${filterId}`, values.join(FILTER_VALUE_SEPARATOR));
      }
    });

    if (debouncedSearchText.trim()) {
      params.set("q", debouncedSearchText.trim());
    }

    const qs = params.toString();
    navigate(qs ? `${basePath}?${qs}` : basePath, { replace: true });
  }, [filterState, debouncedSearchText, basePath, navigate]);

  return { filterState, searchText, setFilterState, setSearchText, hasActiveFilters };
}

interface DataFilterBarProps<T, C = unknown> {
  filters: FilterConfig<T>[];
  data: T[];
  filterState: Record<string, string[]>;
  searchText: string;
  onFilterChange: (filterId: string, values: string[]) => void;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
  collapsibleFilters?: boolean;
  context?: C;
  toolbarActions?: React.ReactNode;
  headerContent?: React.ReactNode;
  resultCount?: { filtered: number; total: number };
}

export function DataFilterBar<T, C = unknown>({
  filters,
  data,
  filterState,
  searchText,
  onFilterChange,
  onSearchChange,
  searchPlaceholder = "Search...",
  collapsibleFilters = false,
  context,
  toolbarActions,
  headerContent,
  resultCount,
}: DataFilterBarProps<T, C>) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground">
          {headerContent}

          <ExpandableSearch
            value={searchText}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />

          {filters.length > 0 && (
            <>
              {collapsibleFilters && (
                <Button
                  variant={showFilters ? "outline" : "ghost"}
                  size="md"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                  className={cn(
                    "hidden md:flex",
                    showFilters ? "rounded-full" : "bg-foreground/10 rounded-full"
                  )}
                >
                  <ListFilter className="h-4 w-4" />
                  Filters
                  {Object.values(filterState).some((v) => v.length > 0) && (
                    <span className="rounded-full bg-primary text-primary-foreground h-2 w-2" />
                  )}
                </Button>
              )}
              <FilterBar
                filters={filters}
                data={data}
                filterState={filterState}
                onFilterChange={onFilterChange}
                context={context}
                defaultExpanded={showFilters}
                renderMobile={true}
                renderDesktop={!collapsibleFilters}
              />
            </>
          )}
        </div>

        <div className="flex h-9 items-center gap-4">
          {toolbarActions}
          {resultCount && (
            <div
              className="text-sm text-muted-foreground whitespace-nowrap"
              data-testid="text-row-count"
            >
              {`${resultCount.filtered} of ${resultCount.total}`}
            </div>
          )}
        </div>
      </div>

      {filters.length > 0 && collapsibleFilters && showFilters && (
        <div
          className="hidden md:flex pt-3 items-center gap-2 flex-wrap"
          data-testid="collapsible-filter-row"
        >
          <FilterBar
            filters={filters}
            data={data}
            filterState={filterState}
            onFilterChange={onFilterChange}
            context={context}
            renderMobile={false}
            renderDesktop={true}
          />
        </div>
      )}
    </div>
  );
}
