import { ColDef, CellValueChangedEvent } from "ag-grid-community";
import { LucideIcon } from "lucide-react";

export interface FilterOptionSource<T, C = unknown> {
  type: "deriveFromData" | "query" | "static";
  queryKey?: string;
  labelField?: string;
  valueField?: string;
  filterFn?: (item: unknown) => boolean;
  deriveOptions?: (data: T[], context?: C) => Array<{ id: string; label: string }>;
  options?: Array<{ id: string; label: string }>;
}

export type FilterType = "multi" | "single";

export interface FilterConfig<T> {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: FilterType; // defaults to "multi"
  placeholder?: string;
  optionSource: FilterOptionSource<T>;
  matchFn: (item: T, selectedValues: string[]) => boolean;
}

export interface ColumnConfig<T> {
  id: string;
  headerName: string;
  field?: keyof T | string;
  category?: string;
  hide?: boolean;
  toggleable?: boolean;
  colDef: Omit<ColDef<T>, "colId" | "headerName" | "field" | "hide">;
}

export interface DataGridPageProps<T, C = unknown> {
  queryKey: string;
  columns: ColumnConfig<T>[];
  defaultVisibleColumns: string[];
  searchFields?: (keyof T | ((item: T) => string))[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  toolbarActions?: React.ReactNode;
  headerContent?: React.ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  context?: C;
  
  // When true, shows loading state while external context data (like lookup tables) is loading
  isExternalDataLoading?: boolean;
  
  // Row selection props
  enableRowSelection?: boolean;
  onSelectionChanged?: (selectedRows: T[]) => void;
  selectionToolbar?: (selectedRows: T[], clearSelection: () => void) => React.ReactNode;
  
  // Declarative filters
  filters?: FilterConfig<T>[];
  
  // Collapsible filters - when true, filters are hidden behind a toggle button
  collapsibleFilters?: boolean;
  
  // Row dragging props
  enableRowDrag?: boolean;
  onRowDragEnd?: (reorderedData: T[]) => void;
  
  // Cell editing props
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  
  // Cell selection - when false, cells cannot be focused/selected (defaults to false)
  enableCellSelection?: boolean;
  
  // Hide column selector (useful for mobile)
  hideColumnSelector?: boolean;
}

export interface ColumnSelectorProps {
  columns: ColumnConfig<unknown>[];
  defaultVisibleColumns: string[];
  getColumnVisibility: (columnId: string) => boolean;
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}
