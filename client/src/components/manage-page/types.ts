import type { LucideIcon } from "lucide-react";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import type { ReactNode } from "react";
import type { z } from "zod";

export interface ManageSectionConfig<T extends { id: string }> {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  queryKey: string;
  columns: ColumnConfig<T>[];
  defaultVisibleColumns: string[];
  searchFields: (keyof T)[];
  searchPlaceholder?: string;
  filters?: FilterConfig<T>[];
  emptyMessage: string;
  emptyDescription: string;
  getRowId: (item: T) => string;
  formSchema: z.ZodSchema;
  formFields: FormFieldConfig[];
  createDialogTitle: string;
  createDialogDescription: string;
  editDialogTitle: string;
  editDialogDescription: string;
  createEndpoint: string;
  updateEndpoint: (id: string) => string;
  deleteEndpoint: (id: string) => string;
  invalidateKeys: string[];
  getDefaultValues: (item?: T | null) => Record<string, unknown>;
  entityName: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "icon";
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface ManagePageProps {
  title: string;
  sections: ManageSectionConfig<any>[];
  breadcrumbs?: { label: string; href?: string }[];
}
