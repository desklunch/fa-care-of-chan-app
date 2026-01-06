import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";
import type { FilterConfig } from "./types";

interface FilterBarProps<T, C = unknown> {
  filters: FilterConfig<T>[];
  data: T[];
  filterState: Record<string, string[]>;
  onFilterChange: (filterId: string, values: string[]) => void;
  context?: C;
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

  return (
    <MultiSelect
      items={options}
      selectedIds={selectedValues}
      onSelectionChange={onSelectionChange}
      itemLabels={labels}
      triggerLabel={filter.label}
      triggerIcon={<Icon className="h-4 w-4" />}
      placeholder={filter.placeholder || filter.label}
      showSelectAll={false}
      testIdPrefix={`filter-${filter.id}`}
      searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
    />
  );
}

export function FilterBar<T, C = unknown>({
  filters,
  data,
  filterState,
  onFilterChange,
  context,
}: FilterBarProps<T, C>) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
    </div>
  );
}
