import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridReadyEvent, ModuleRegistry, AllCommunityModule, SelectionChangedEvent, RowClickedEvent, SortChangedEvent, ColumnMovedEvent, RowDragEndEvent } from "ag-grid-community";
import { gridTheme } from "@/lib/ag-grid-theme";
import { ColumnSelector } from "./column-selector";
import { ExpandableSearch } from "./expandable-search";
import { FilterBar } from "./filter-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import type { ColumnConfig, DataGridPageProps, FilterConfig } from "./types";

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================
// URL PARAM HELPERS
// ============================================

function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function updateUrlParams(updates: Record<string, string | null>) {
  const params = getUrlParams();
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}

// ============================================
// FILTER HELPERS
// ============================================

function getFiltersFromUrl(): Record<string, string[]> {
  const params = getUrlParams();
  const filters: Record<string, string[]> = {};
  params.forEach((value, key) => {
    if (key.startsWith("f_")) {
      const filterId = key.replace("f_", "");
      filters[filterId] = value.split(",").filter(Boolean);
    }
  });
  return filters;
}

function getSearchFromUrl(): string {
  return getUrlParams().get("q") || "";
}

function setFiltersToUrl(filterState: Record<string, string[]>, searchText?: string) {
  const params = getUrlParams();
  
  // Remove existing filter params
  Array.from(params.keys()).forEach((key) => {
    if (key.startsWith("f_")) {
      params.delete(key);
    }
  });
  
  // Add current filter params
  Object.entries(filterState).forEach(([filterId, values]) => {
    if (values.length > 0) {
      params.set(`f_${filterId}`, values.join(","));
    }
  });
  
  // Handle search param
  if (searchText !== undefined) {
    if (searchText.trim()) {
      params.set("q", searchText.trim());
    } else {
      params.delete("q");
    }
  }
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
}

function getSessionStorageKey(pathname: string): string {
  return `datagrid_filters_${pathname}`;
}

function getFiltersFromSession(pathname: string): Record<string, string[]> | null {
  try {
    const stored = sessionStorage.getItem(getSessionStorageKey(pathname));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse session storage filters:", e);
  }
  return null;
}

function saveFiltersToSession(pathname: string, filterState: Record<string, string[]>) {
  try {
    sessionStorage.setItem(getSessionStorageKey(pathname), JSON.stringify(filterState));
  } catch (e) {
    console.error("Failed to save filters to session storage:", e);
  }
}

// ============================================
// COLUMN VISIBILITY HELPERS (using numeric indices)
// ============================================

function indicesToColumnIds(indices: number[], allColumnIds: string[]): string[] {
  return indices
    .filter(i => i >= 0 && i < allColumnIds.length)
    .map(i => allColumnIds[i]);
}

function columnIdsToIndices(columnIds: string[], allColumnIds: string[]): number[] {
  return columnIds
    .map(id => allColumnIds.indexOf(id))
    .filter(i => i !== -1);
}

function getColumnsFromUrl(allColumnIds: string[]): string[] | null {
  const params = getUrlParams();
  const cols = params.get("c");
  if (cols) {
    const indices = cols.split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (indices.length > 0) {
      return indicesToColumnIds(indices, allColumnIds);
    }
  }
  return null;
}

function setColumnsToUrl(visibleColumns: string[], allColumnIds: string[]) {
  const indices = columnIdsToIndices(visibleColumns, allColumnIds);
  updateUrlParams({ c: indices.length > 0 ? indices.join(",") : null });
}

function getColumnSessionStorageKey(pathname: string): string {
  return `datagrid_columns_${pathname}`;
}

function getColumnsFromSession(pathname: string): string[] | null {
  try {
    const stored = sessionStorage.getItem(getColumnSessionStorageKey(pathname));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse session storage columns:", e);
  }
  return null;
}

function saveColumnsToSession(pathname: string, visibleColumns: string[]) {
  try {
    sessionStorage.setItem(getColumnSessionStorageKey(pathname), JSON.stringify(visibleColumns));
  } catch (e) {
    console.error("Failed to save columns to session storage:", e);
  }
}

// ============================================
// SORT ORDER HELPERS
// ============================================

interface SortState {
  colIndex: number;
  dir: "asc" | "desc";
}

function getSortFromUrl(): SortState | null {
  const params = getUrlParams();
  const sort = params.get("s");
  if (sort) {
    const match = sort.match(/^(\d+)(a|d)$/);
    if (match) {
      return {
        colIndex: parseInt(match[1], 10),
        dir: match[2] === "a" ? "asc" : "desc",
      };
    }
  }
  return null;
}

function setSortToUrl(sort: SortState | null) {
  if (sort) {
    const dir = sort.dir === "asc" ? "a" : "d";
    updateUrlParams({ s: `${sort.colIndex}${dir}` });
  } else {
    updateUrlParams({ s: null });
  }
}

function getSortSessionStorageKey(pathname: string): string {
  return `datagrid_sort_${pathname}`;
}

function getSortFromSession(pathname: string): SortState | null {
  try {
    const stored = sessionStorage.getItem(getSortSessionStorageKey(pathname));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse session storage sort:", e);
  }
  return null;
}

function saveSortToSession(pathname: string, sort: SortState | null) {
  try {
    if (sort) {
      sessionStorage.setItem(getSortSessionStorageKey(pathname), JSON.stringify(sort));
    } else {
      sessionStorage.removeItem(getSortSessionStorageKey(pathname));
    }
  } catch (e) {
    console.error("Failed to save sort to session storage:", e);
  }
}

// ============================================
// SCROLL POSITION HELPERS (session storage only)
// ============================================

function getScrollSessionStorageKey(pathname: string): string {
  return `datagrid_scroll_${pathname}`;
}

function getScrollFromSession(pathname: string): number | null {
  try {
    const stored = sessionStorage.getItem(getScrollSessionStorageKey(pathname));
    if (stored) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    console.error("Failed to parse session storage scroll:", e);
  }
  return null;
}

function saveScrollToSession(pathname: string, scrollTop: number) {
  try {
    sessionStorage.setItem(getScrollSessionStorageKey(pathname), String(Math.round(scrollTop)));
  } catch (e) {
    console.error("Failed to save scroll to session storage:", e);
  }
}

// ============================================
// COLUMN ORDER HELPERS
// ============================================

function getColumnOrderFromUrl(): number[] | null {
  const params = getUrlParams();
  const order = params.get("o");
  if (order) {
    const indices = order.split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (indices.length > 0) {
      return indices;
    }
  }
  return null;
}

function setColumnOrderToUrl(orderIndices: number[] | null) {
  updateUrlParams({ o: orderIndices && orderIndices.length > 0 ? orderIndices.join(",") : null });
}

function getColumnOrderSessionStorageKey(pathname: string): string {
  return `datagrid_order_${pathname}`;
}

function getColumnOrderFromSession(pathname: string): number[] | null {
  try {
    const stored = sessionStorage.getItem(getColumnOrderSessionStorageKey(pathname));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse session storage column order:", e);
  }
  return null;
}

function saveColumnOrderToSession(pathname: string, orderIndices: number[] | null) {
  try {
    if (orderIndices && orderIndices.length > 0) {
      sessionStorage.setItem(getColumnOrderSessionStorageKey(pathname), JSON.stringify(orderIndices));
    } else {
      sessionStorage.removeItem(getColumnOrderSessionStorageKey(pathname));
    }
  } catch (e) {
    console.error("Failed to save column order to session storage:", e);
  }
}

export function DataGridPage<T extends { id?: string | number }, C = unknown>({
  queryKey,
  columns,
  defaultVisibleColumns,
  searchFields = [],
  searchPlaceholder = "Search...",
  onRowClick,
  getRowId,
  toolbarActions,
  headerContent,
  emptyMessage = "No data found",
  emptyDescription,
  context,
  externalData,
  externalLoading,
  pagination,
  enableRowSelection,
  onSelectionChanged,
  selectionToolbar,
  filters = [],
  collapsibleFilters = false,
  filterState: externalFilterState,
  onFilterChange: externalOnFilterChange,
  enableRowDrag = false,
  onRowDragEnd,
  onCellValueChanged,
  isExternalDataLoading = false,
}: DataGridPageProps<T, C>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
  const [searchText, setSearchText] = useState(() => getSearchFromUrl());
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [isFilterInitialized, setIsFilterInitialized] = useState(false);
  const [isGridInitialized, setIsGridInitialized] = useState(false);
  const scrollRestoredRef = useRef(false);

  // Get all column IDs for index mapping
  const allColumnIds = useMemo(() => columns.map((col) => col.id), [columns]);

  // Use external filter state if provided, otherwise initialize from URL/session
  const [internalFilterState, setInternalFilterState] = useState<Record<string, string[]>>(() => {
    if (externalFilterState) return externalFilterState;
    const urlFilters = getFiltersFromUrl();
    if (Object.keys(urlFilters).length > 0) {
      return urlFilters;
    }
    const sessionFilters = getFiltersFromSession(window.location.pathname);
    if (sessionFilters && Object.keys(sessionFilters).length > 0) {
      return sessionFilters;
    }
    return {};
  });
  
  // Use external filter state if provided, otherwise use internal
  const filterState = externalFilterState ?? internalFilterState;

  // Expand filter bar if there are active filters
  const [showFilters, setShowFilters] = useState(() => {
    const urlFilters = getFiltersFromUrl();
    if (Object.keys(urlFilters).some(k => urlFilters[k].length > 0)) {
      return true;
    }
    const sessionFilters = getFiltersFromSession(window.location.pathname);
    if (sessionFilters && Object.keys(sessionFilters).some(k => sessionFilters[k].length > 0)) {
      return true;
    }
    return false;
  });

  // Initialize visibleColumns from URL params or session storage
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const urlColumns = getColumnsFromUrl(allColumnIds);
    if (urlColumns && urlColumns.length > 0) {
      return urlColumns;
    }
    const sessionColumns = getColumnsFromSession(window.location.pathname);
    if (sessionColumns && sessionColumns.length > 0) {
      return sessionColumns;
    }
    return defaultVisibleColumns;
  });
  const [isColumnInitialized, setIsColumnInitialized] = useState(false);

  // Initialize sort state from URL params or session storage
  const [sortState, setSortState] = useState<SortState | null>(() => {
    const urlSort = getSortFromUrl();
    if (urlSort) return urlSort;
    return getSortFromSession(window.location.pathname);
  });
  const [isSortInitialized, setIsSortInitialized] = useState(false);

  // Initialize column order from URL params or session storage
  const [columnOrder, setColumnOrder] = useState<number[] | null>(() => {
    const urlOrder = getColumnOrderFromUrl();
    if (urlOrder) return urlOrder;
    return getColumnOrderFromSession(window.location.pathname);
  });
  const [isOrderInitialized, setIsOrderInitialized] = useState(false);

  // Sync visibleColumns to URL and session storage when they change
  useEffect(() => {
    if (!isColumnInitialized) {
      setIsColumnInitialized(true);
      const urlColumns = getColumnsFromUrl(allColumnIds);
      const sessionColumns = getColumnsFromSession(window.location.pathname);
      if (urlColumns || sessionColumns) {
        setColumnsToUrl(visibleColumns, allColumnIds);
      }
      return;
    }
    
    setColumnsToUrl(visibleColumns, allColumnIds);
    saveColumnsToSession(window.location.pathname, visibleColumns);
  }, [visibleColumns, isColumnInitialized, allColumnIds]);

  // Sync filterState and searchText to URL and session storage when they change
  useEffect(() => {
    if (!isFilterInitialized) {
      setIsFilterInitialized(true);
      if (Object.keys(filterState).length > 0 || searchText) {
        setFiltersToUrl(filterState, searchText);
      }
      return;
    }
    
    setFiltersToUrl(filterState, searchText);
    saveFiltersToSession(window.location.pathname, filterState);
  }, [filterState, searchText, isFilterInitialized]);

  // Sync sort state to URL and session storage
  useEffect(() => {
    if (!isSortInitialized) {
      setIsSortInitialized(true);
      return;
    }
    setSortToUrl(sortState);
    saveSortToSession(window.location.pathname, sortState);
  }, [sortState, isSortInitialized]);

  // Sync column order to URL and session storage
  useEffect(() => {
    if (!isOrderInitialized) {
      setIsOrderInitialized(true);
      return;
    }
    setColumnOrderToUrl(columnOrder);
    saveColumnOrderToSession(window.location.pathname, columnOrder);
  }, [columnOrder, isOrderInitialized]);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gridApi && !gridApi.isDestroyed()) {
        const scrollTop = gridApi.getVerticalPixelRange()?.top;
        if (scrollTop !== undefined) {
          saveScrollToSession(window.location.pathname, scrollTop);
        }
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also save on unmount (navigation within app)
      if (gridApi && !gridApi.isDestroyed()) {
        const scrollTop = gridApi.getVerticalPixelRange()?.top;
        if (scrollTop !== undefined) {
          saveScrollToSession(window.location.pathname, scrollTop);
        }
      }
    };
  }, [gridApi]);

  // Use external data if provided, otherwise fetch via query
  const useExternalData = externalData !== undefined;
  
  const { data: queryData = [], isLoading: queryLoading } = useQuery<T[]>({
    queryKey: [queryKey],
    enabled: !useExternalData,
  });
  
  const data = useExternalData ? externalData : queryData;
  const isLoading = (useExternalData ? (externalLoading ?? false) : queryLoading) || isExternalDataLoading;

  // Determine if dragging should be suppressed (when sorting, filters, or search are active)
  const hasActiveFilters = Object.values(filterState).some((v) => v.length > 0);
  const hasActiveSearch = searchText.trim().length > 0;
  const isDragSuppressed = sortState !== null || hasActiveFilters || hasActiveSearch;

  const columnDefs = useMemo(() => {
    const cols: ColDef<T>[] = [];
    
    // Add drag handle column if row dragging is enabled
    if (enableRowDrag) {
      cols.push({
        colId: "_dragHandle",
        headerName: "",
        width: 30,
        maxWidth: 30,
        minWidth: 30,
        rowDrag: !isDragSuppressed,
        sortable: false,
        filter: false,
        resizable: false,
        suppressHeaderMenuButton: true,
        lockPosition: "left",
        pinned: "left",
        lockPinned: true,
        cellClass: "ag-drag-handle-cell",
      } as ColDef<T>);
    }
    
    // Add data columns
    columns.forEach((col) => {
      // Non-toggleable columns are always visible based on their default or explicit hide setting
      const isToggleable = col.toggleable !== false;
      const shouldHide = isToggleable 
        ? (col.hide ?? !visibleColumns.includes(col.id))
        : (col.hide ?? false);
      cols.push({
        colId: col.id,
        headerName: col.headerName,
        field: col.field,
        hide: shouldHide,
        ...col.colDef,
      } as ColDef<T>);
    });
    
    return cols;
  }, [columns, visibleColumns, enableRowSelection, enableRowDrag, isDragSuppressed, filterState, searchText]);

  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderFilterButton: true,
    }),
    []
  );

  const handleFilterChange = useCallback((filterId: string, values: string[]) => {
    if (externalOnFilterChange) {
      externalOnFilterChange(filterId, values);
    } else {
      setInternalFilterState((prev) => ({
        ...prev,
        [filterId]: values,
      }));
    }
  }, [externalOnFilterChange]);

  const filteredData = useMemo(() => {
    // Disable client-side filtering when using server-side pagination
    // as the server already handles filtering
    if (pagination) return data;
    
    let result = data;

    // Apply search text filter
    if (searchText.trim() && searchFields.length > 0) {
      const search = searchText.toLowerCase();
      result = result.filter((item) => {
        return searchFields.some((field) => {
          if (typeof field === "function") {
            return field(item).toLowerCase().includes(search);
          }
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(search);
          }
          return false;
        });
      });
    }

    // Apply declarative filters
    if (filters.length > 0) {
      result = result.filter((item) => {
        return filters.every((filter) => {
          const selectedValues = filterState[filter.id] || [];
          if (selectedValues.length === 0) return true;
          return filter.matchFn(item, selectedValues);
        });
      });
    }

    return result;
  }, [data, searchText, searchFields, pagination, filters, filterState]);

  // Note: With rowDragManaged=true, AG Grid handles visual reordering internally.
  // We only sync rowData when drag is NOT in progress to avoid conflicts.

  const onGridReady = useCallback((params: GridReadyEvent<T>) => {
    setGridApi(params.api);
    
    // Restore sort state
    if (sortState && sortState.colIndex < allColumnIds.length) {
      const colId = allColumnIds[sortState.colIndex];
      params.api.applyColumnState({
        state: [{ colId, sort: sortState.dir }],
        defaultState: { sort: null },
      });
    }

    // Restore column order
    if (columnOrder && columnOrder.length > 0) {
      const orderedColIds = columnOrder
        .filter(i => i >= 0 && i < allColumnIds.length)
        .map(i => allColumnIds[i]);
      if (orderedColIds.length > 0) {
        params.api.moveColumns(orderedColIds, 0);
      }
    }

    // Restore scroll position after a short delay to ensure data is rendered
    const savedScroll = getScrollFromSession(window.location.pathname);
    if (savedScroll && savedScroll > 0 && !scrollRestoredRef.current) {
      scrollRestoredRef.current = true;
      setTimeout(() => {
        params.api.ensureIndexVisible(0);
        const viewportEl = document.querySelector('.ag-body-viewport');
        if (viewportEl) {
          viewportEl.scrollTop = savedScroll;
        }
      }, 100);
    }

    setIsGridInitialized(true);
  }, [sortState, columnOrder, allColumnIds]);

  // Handle sort changes from AG Grid
  const handleSortChanged = useCallback((event: SortChangedEvent<T>) => {
    if (!isGridInitialized) return;
    
    const columnState = event.api.getColumnState();
    const sortedColumn = columnState.find(col => col.sort);
    
    if (sortedColumn && sortedColumn.colId) {
      const colIndex = allColumnIds.indexOf(sortedColumn.colId);
      if (colIndex !== -1) {
        setSortState({
          colIndex,
          dir: sortedColumn.sort as "asc" | "desc",
        });
      }
    } else {
      setSortState(null);
    }
  }, [allColumnIds, isGridInitialized]);

  // Handle column order changes from AG Grid
  const handleColumnMoved = useCallback((event: ColumnMovedEvent<T>) => {
    if (!isGridInitialized || !event.finished) return;
    
    const columnState = event.api.getColumnState();
    const currentOrder = columnState.map(col => allColumnIds.indexOf(col.colId || ""));
    
    // Check if order differs from default
    const defaultOrder = allColumnIds.map((_, i) => i);
    const isDefaultOrder = currentOrder.every((v, i) => v === defaultOrder[i]);
    
    if (isDefaultOrder) {
      setColumnOrder(null);
    } else {
      setColumnOrder(currentOrder.filter(i => i !== -1));
    }
  }, [allColumnIds, isGridInitialized]);

  // Handle row drag end - get new order and call callback
  const handleRowDragEnd = useCallback((event: RowDragEndEvent<T>) => {
    if (!onRowDragEnd || !gridApi) return;
    
    // Get all rows in their new order
    const reorderedData: T[] = [];
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) {
        reorderedData.push(node.data);
      }
    });
    
    onRowDragEnd(reorderedData);
  }, [onRowDragEnd, gridApi]);

  const handleRowClick = useCallback(
    (event: RowClickedEvent<T>) => {
      // Skip navigation if click was in the checkbox selection column
      const target = event.event?.target as HTMLElement | null;
      const isCheckboxColumn = target?.closest('[col-id="ag-Grid-SelectionColumn"], [col-id="_selection"], .ag-selection-checkbox');
      if (isCheckboxColumn) {
        return;
      }
      if (event.data && onRowClick) {
        onRowClick(event.data);
      }
    },
    [onRowClick]
  );

  const getColumnVisibility = useCallback(
    (columnId: string) => {
      if (!gridApi) {
        return visibleColumns.includes(columnId);
      }
      const column = gridApi.getColumn(columnId);
      return column ? column.isVisible() : false;
    },
    [gridApi, visibleColumns]
  );

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      if (!gridApi) return;
      // Only allow toggling of toggleable columns
      const colConfig = columns.find(c => c.id === columnId);
      if (colConfig?.toggleable === false) return;
      
      const column = gridApi.getColumn(columnId);
      if (column) {
        const isVisible = column.isVisible();
        gridApi.setColumnsVisible([columnId], !isVisible);
        // Update state to trigger URL/session sync (only toggleable columns)
        setVisibleColumns(prev => 
          isVisible 
            ? prev.filter(id => id !== columnId)
            : [...prev, columnId]
        );
      }
    },
    [gridApi, columns]
  );

  const handleShowAll = useCallback(() => {
    if (!gridApi) return;
    const toggleableColumnIds = columns
      .filter((col) => col.toggleable !== false)
      .map((col) => col.id);
    gridApi.setColumnsVisible(toggleableColumnIds, true);
    setVisibleColumns(toggleableColumnIds);
  }, [gridApi, columns]);

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<T>) => {
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected);
    if (onSelectionChanged) {
      onSelectionChanged(selected);
    }
  }, [onSelectionChanged]);

  const clearSelection = useCallback(() => {
    if (gridApi) {
      gridApi.deselectAll();
      setSelectedRows([]);
    }
  }, [gridApi]);

  const handleResetToDefaults = useCallback(() => {
    if (!gridApi) return;
    
    // Reset column visibility
    allColumnIds.forEach((colId) => {
      const shouldBeVisible = defaultVisibleColumns.includes(colId);
      gridApi.setColumnsVisible([colId], shouldBeVisible);
    });
    setVisibleColumns([...defaultVisibleColumns]);
    
    // Reset sort
    gridApi.applyColumnState({
      defaultState: { sort: null },
    });
    setSortState(null);
    
    // Reset column order
    gridApi.moveColumns(allColumnIds, 0);
    setColumnOrder(null);
    
    // Clear scroll position
    sessionStorage.removeItem(getScrollSessionStorageKey(window.location.pathname));
  }, [gridApi, allColumnIds, defaultVisibleColumns]);

  const defaultEmptyIconHtml = `
    <svg class="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  `;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const emptyOverlay = `
    <div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      ${defaultEmptyIconHtml}
      <p>${emptyMessage}</p>
      ${emptyDescription ? `<p class="text-sm opacity-75 mt-1">${emptyDescription}</p>` : ''}
    </div>
  `;

  return (
    <div className="p-4 md:px-6 h-full flex flex-col gap-4 ">
      {enableRowSelection && selectedRows.length > 0 && selectionToolbar && (
        <div className="bg-muted/50 border rounded-lg p-3" data-testid="selection-toolbar">
          {selectionToolbar(selectedRows, clearSelection)}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 ">
        
        <div className="flex items-center gap-2 text-foreground">

          {!pagination && searchFields.length > 0 && (
            <ExpandableSearch
              value={searchText}
              onChange={setSearchText}
              placeholder={searchPlaceholder}
            />
          )}
          {filters.length > 0 && !collapsibleFilters && (
            <FilterBar
              filters={filters}
              data={data}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              context={context}
            />
          )}
          {filters.length > 0 && collapsibleFilters && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
              className="bg-foreground/10 rounded-full"
            >
              <ListFilter className="h-4 w-4" />
              Filters
              {Object.values(filterState).some((v) => v.length > 0) && (
                <span className="rounded-full bg-primary text-primary-foreground h-2 w-2 text-xs">

                </span>
              )}
            </Button>
          )}
  
          {headerContent}
        </div>
        <div className="flex items-center gap-4">
          {toolbarActions}
          <div className="text-sm text-muted-foreground whitespace-nowrap
" data-testid="text-row-count">
            {pagination 
              ? `${pagination.total} total`
              : `${filteredData.length} of ${data.length}`
            }
            
          </div>
          <ColumnSelector
            columns={columns}
            defaultVisibleColumns={defaultVisibleColumns}
            getColumnVisibility={getColumnVisibility}
            onToggleColumn={handleToggleColumn}
            onShowAll={handleShowAll}
            onResetToDefaults={handleResetToDefaults}
          />
        </div>
      </div>

      {filters.length > 0 && collapsibleFilters && showFilters && (
        <div className="flex items-center gap-2 flex-wrap" data-testid="collapsible-filter-row">
          <FilterBar
            filters={filters}
            data={data}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            context={context}
          />
        </div>
      )}



      <div className="flex-1 min-h-[400px] overflow-hidden" style={{ contain: 'layout style paint' }} data-testid="data-grid">
        <AgGridReact
          ref={gridRef}
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          theme={gridTheme}
          onGridReady={onGridReady}
          onRowClicked={handleRowClick}
          onSortChanged={handleSortChanged}
          onColumnMoved={handleColumnMoved}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          pagination={false}
          domLayout="normal"
          context={context}
          getRowId={getRowId ? (params) => String(getRowId(params.data as T)) : (params) => String(params.data?.id)}
          overlayNoRowsTemplate={emptyOverlay}
          rowSelection={enableRowSelection ? { mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false } : undefined}
          onSelectionChanged={enableRowSelection ? handleSelectionChanged : undefined}
          rowDragManaged={enableRowDrag}
          suppressMoveWhenRowDragging={enableRowDrag}
          onRowDragEnd={enableRowDrag ? handleRowDragEnd : undefined}
          onCellValueChanged={onCellValueChanged}
        />
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
