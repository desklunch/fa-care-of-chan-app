import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridReadyEvent, ModuleRegistry, AllCommunityModule, SelectionChangedEvent } from "ag-grid-community";
import { gridTheme } from "@/lib/ag-grid-theme";
import { ColumnSelector } from "./column-selector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { ColumnConfig, DataGridPageProps } from "./types";

ModuleRegistry.registerModules([AllCommunityModule]);

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
}: DataGridPageProps<T, C>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Use external data if provided, otherwise fetch via query
  const useExternalData = externalData !== undefined;
  
  const { data: queryData = [], isLoading: queryLoading } = useQuery<T[]>({
    queryKey: [queryKey],
    enabled: !useExternalData,
  });
  
  const data = useExternalData ? externalData : queryData;
  const isLoading = useExternalData ? (externalLoading ?? false) : queryLoading;

  const columnDefs = useMemo(() => {
    const cols: ColDef<T>[] = [];
    
    // Add checkbox selection column if row selection is enabled
    if (enableRowSelection) {
      cols.push({
        colId: "_selection",
        headerName: "",
        width: 50,
        maxWidth: 50,
        minWidth: 50,
        headerCheckboxSelection: true,
        checkboxSelection: true,
        suppressHeaderFilterButton: true,
        sortable: false,
        filter: false,
        resizable: false,
        pinned: "left",
      });
    }
    
    // Add data columns
    columns.forEach((col) => {
      cols.push({
        colId: col.id,
        headerName: col.headerName,
        field: col.field,
        hide: col.hide ?? !defaultVisibleColumns.includes(col.id),
        ...col.colDef,
      } as ColDef<T>);
    });
    
    return cols;
  }, [columns, defaultVisibleColumns, enableRowSelection]);

  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderFilterButton: true,
    }),
    []
  );

  const filteredData = useMemo(() => {
    // Disable client-side filtering when using server-side pagination
    // as the server already handles filtering
    if (pagination) return data;
    
    if (!searchText.trim() || searchFields.length === 0) return data;
    const search = searchText.toLowerCase();

    return data.filter((item) => {
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
  }, [data, searchText, searchFields, pagination]);

  const onGridReady = useCallback((params: GridReadyEvent<T>) => {
    setGridApi(params.api);
  }, []);

  const handleRowClick = useCallback(
    (event: { data: T | undefined }) => {
      if (event.data && onRowClick) {
        onRowClick(event.data);
      }
    },
    [onRowClick]
  );

  const getColumnVisibility = useCallback(
    (columnId: string) => {
      if (!gridApi) {
        return defaultVisibleColumns.includes(columnId);
      }
      const column = gridApi.getColumn(columnId);
      return column ? column.isVisible() : false;
    },
    [gridApi, defaultVisibleColumns]
  );

  const handleToggleColumn = useCallback(
    (columnId: string) => {
      if (!gridApi) return;
      const column = gridApi.getColumn(columnId);
      if (column) {
        const isVisible = column.isVisible();
        gridApi.setColumnsVisible([columnId], !isVisible);
      }
    },
    [gridApi]
  );

  const handleShowAll = useCallback(() => {
    if (!gridApi) return;
    const allColumnIds = columns
      .filter((col) => col.toggleable !== false)
      .map((col) => col.id);
    gridApi.setColumnsVisible(allColumnIds, true);
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
    const allColumnIds = columns.map((col) => col.id);
    allColumnIds.forEach((colId) => {
      const shouldBeVisible = defaultVisibleColumns.includes(colId);
      gridApi.setColumnsVisible([colId], shouldBeVisible);
    });
  }, [gridApi, columns, defaultVisibleColumns]);

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
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
          <ColumnSelector
            columns={columns}
            defaultVisibleColumns={defaultVisibleColumns}
            getColumnVisibility={getColumnVisibility}
            onToggleColumn={handleToggleColumn}
            onShowAll={handleShowAll}
            onResetToDefaults={handleResetToDefaults}
          />
          {!pagination && searchFields.length > 0 && (
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-9"
                data-testid="input-search"
              />
            </div>
          )}
          {headerContent}
        </div>
        <div className="flex items-center gap-2">
          {toolbarActions}
          <div className="text-sm text-muted-foreground" data-testid="text-row-count">
            {pagination 
              ? `${pagination.total} total`
              : `${filteredData.length} of ${data.length}`
            }
          </div>
        </div>
      </div>

      {enableRowSelection && selectedRows.length > 0 && selectionToolbar && (
        <div className="bg-muted/50 border rounded-lg p-3 mb-4" data-testid="selection-toolbar">
          {selectionToolbar(selectedRows, clearSelection)}
        </div>
      )}

      <div className="flex-1 min-h-[400px] overflow-hidden" data-testid="data-grid">
        <AgGridReact
          ref={gridRef}
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          theme={gridTheme}
          onGridReady={onGridReady}
          onRowClicked={handleRowClick}
          suppressCellFocus={true}
          pagination={false}
          domLayout="normal"
          context={context}
          getRowId={getRowId ? (params) => String(getRowId(params.data as T)) : (params) => String(params.data?.id)}
          overlayNoRowsTemplate={emptyOverlay}
          rowSelection={enableRowSelection ? "multiple" : undefined}
          onSelectionChanged={enableRowSelection ? handleSelectionChanged : undefined}
          suppressRowClickSelection={enableRowSelection}
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
