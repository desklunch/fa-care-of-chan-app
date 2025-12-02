import { ColDef } from "ag-grid-community";

export interface ColumnConfig<T> {
  id: string;
  headerName: string;
  field?: keyof T | string;
  category: string;
  hide?: boolean;
  toggleable?: boolean;
  colDef: Omit<ColDef<T>, "colId" | "headerName" | "field" | "hide">;
}

export interface DataGridPageProps<T, C = unknown> {
  title?: string;
  queryKey: string;
  columns: ColumnConfig<T>[];
  defaultVisibleColumns: string[];
  searchFields?: (keyof T | ((item: T) => string))[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  toolbarActions?: React.ReactNode;
  emptyMessage?: string;
  context?: C;
}

export interface ColumnSelectorProps {
  columns: ColumnConfig<unknown>[];
  defaultVisibleColumns: string[];
  getColumnVisibility: (columnId: string) => boolean;
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}
