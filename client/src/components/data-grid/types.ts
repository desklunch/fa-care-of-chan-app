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

export interface FilterConfig<T> {
  id: string;
  label: string;
  icon: LucideIcon;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DataGridPageProps<T, C = unknown> {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Array<{ label: string; href?: string }>;
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
  
  // External data mode (for paginated APIs)
  externalData?: T[];
  externalLoading?: boolean;
  
  // Pagination props
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  
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
}

export interface ColumnSelectorProps {
  columns: ColumnConfig<unknown>[];
  defaultVisibleColumns: string[];
  getColumnVisibility: (columnId: string) => boolean;
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}
