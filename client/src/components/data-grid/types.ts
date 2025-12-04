import { ColDef } from "ag-grid-community";
import { LucideIcon } from "lucide-react";

export interface ColumnConfig<T> {
  id: string;
  headerName: string;
  field?: keyof T | string;
  category: string;
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
}

export interface ColumnSelectorProps {
  columns: ColumnConfig<unknown>[];
  defaultVisibleColumns: string[];
  getColumnVisibility: (columnId: string) => boolean;
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}
