import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";
import { SingleSelect } from "@/components/ui/single-select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListFilter } from "lucide-react";
import type { FilterConfig } from "./types";

interface FilterBarProps<T, C = unknown> {
  filters: FilterConfig<T>[];
  data: T[];
  filterState: Record<string, string[]>;
  onFilterChange: (filterId: string, values: string[]) => void;
  context?: C;
  defaultExpanded?: boolean;
  /** Render mobile button + sheet. Default: true */
  renderMobile?: boolean;
  /** Render desktop inline filters. Default: true */
  renderDesktop?: boolean;
}

interface FilterOption {
  id: string;
  label: string;
}

function FilterControl<T, C = unknown>({
  filter,
  data,
  selectedValues,
  onSelectionChange,
  context,
}: {
  filter: FilterConfig<T>;
  data: T[];
  selectedValues: string[];
  onSelectionChange: (values: (string | number)[]) => void;
  context?: C;
}) {
  const { optionSource } = filter;
  const filterType = filter.type || "multi";

  const { data: queryData = [] } = useQuery<unknown[]>({
    queryKey: [optionSource.queryKey],
    enabled: optionSource.type === "query" && !!optionSource.queryKey,
  });

  const options = useMemo((): FilterOption[] => {
    if (optionSource.type === "static" && optionSource.options) {
      return optionSource.options;
    }

    if (optionSource.type === "deriveFromData" && optionSource.deriveOptions) {
      return optionSource.deriveOptions(data, context);
    }

    if (optionSource.type === "query" && queryData.length > 0) {
      let filteredData = queryData;
      if (optionSource.filterFn) {
        filteredData = queryData.filter(optionSource.filterFn);
      }

      const labelField = optionSource.labelField || "name";
      const valueField = optionSource.valueField || "id";

      return filteredData.map((item) => ({
        id: String((item as Record<string, unknown>)[valueField]),
        label: String((item as Record<string, unknown>)[labelField]),
      }));
    }

    return [];
  }, [optionSource, data, queryData, context]);

  const labels = useMemo(() => {
    const labelMap: Record<string, string> = {};
    options.forEach((opt) => {
      labelMap[opt.id] = opt.label;
    });
    return labelMap;
  }, [options]);

  const Icon = filter.icon;

  if (filterType === "single") {
    return (
      <SingleSelect
        items={options}
        selectedId={selectedValues[0] || null}
        onSelectionChange={(id) => onSelectionChange(id ? [id] : [])}
        itemLabels={labels}
        triggerLabel={filter.label}
        triggerIcon={<Icon className="h-4 w-4" />}
        placeholder={filter.placeholder || filter.label}
        testIdPrefix={`filter-${filter.id}`}
        showSearch={options.length > 6}
      />
    );
  }

  return (
    <MultiSelect
      items={options}
      selectedIds={selectedValues}
      onSelectionChange={onSelectionChange}
      itemLabels={labels}
      triggerLabel={filter.label}
      triggerIcon={<Icon className="h-4 w-4" />}
      placeholder={filter.placeholder || filter.label}
      showSelectAll={true}
      testIdPrefix={`filter-${filter.id}`}
      searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
    />
  );
}

function FilterControls<T, C = unknown>({
  filters,
  data,
  filterState,
  onFilterChange,
  context,
}: Omit<FilterBarProps<T, C>, "defaultExpanded" | "renderMobile" | "renderDesktop">) {
  return (
    <>
      {filters.map((filter) => (
        <FilterControl
          key={filter.id}
          filter={filter}
          data={data}
          selectedValues={filterState[filter.id] || []}
          onSelectionChange={(values) => onFilterChange(filter.id, values.map(String))}
          context={context}
        />
      ))}
    </>
  );
}

export function FilterBar<T, C = unknown>({
  filters,
  data,
  filterState,
  onFilterChange,
  context,
  defaultExpanded = false,
  renderMobile = true,
  renderDesktop = true,
}: FilterBarProps<T, C>) {
  const [showFilters, setShowFilters] = useState(defaultExpanded);
  
  const hasActiveFilters = Object.values(filterState).some((v) => v.length > 0);

  if (filters.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Filter button that opens sheet */}
      {renderMobile && (
        <div className="md:hidden">
          <Button
            variant={showFilters ? "outline" : "ghost"}
            size="md"
            onClick={() => setShowFilters(true)}
            data-testid="button-open-mobile-filters"
            className={showFilters ? "rounded-full" : "bg-foreground/10 rounded-full"}
          >
            <ListFilter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-primary text-primary-foreground h-2 w-2" />
            )}
          </Button>

          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetContent side="bottom" className="h-full max-h-[100dvh] flex flex-col p-0">
              <SheetHeader className="flex flex-row items-center justify-between p-4 border-b">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-0 p-5">
                <div className="flex flex-col gap-3">
                  <FilterControls
                    filters={filters}
                    data={data}
                    filterState={filterState}
                    onFilterChange={onFilterChange}
                    context={context}
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowFilters(false)}
                data-testid="button-close-mobile-filters"
                className="h-12"
              >
                Close
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Desktop: Inline filters */}
      {renderDesktop && (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <FilterControls
            filters={filters}
            data={data}
            filterState={filterState}
            onFilterChange={onFilterChange}
            context={context}
          />
        </div>
      )}
    </>
  );
}
