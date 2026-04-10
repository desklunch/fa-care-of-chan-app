import type { z } from "zod";

export type EditableFieldType = 
  | "text" 
  | "textarea" 
  | "select" 
  | "date" 
  | "multiselect" 
  | "array" 
  | "switch"
  | "number"
  | "richtext";

export interface FieldOption {
  value: string;
  label: string;
  renderLabel?: React.ReactNode;
}

export interface FieldValidation {
  schema?: z.ZodType<unknown>;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface FieldMutationState {
  isLoading: boolean;
  error: FieldError | null;
  fieldBeingSaved: string | null;
}

export interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  field: string;
  testId?: string;
  type?: EditableFieldType;
  options?: FieldOption[];
  multiSelectValues?: string[];
  arrayValue?: string[];
  booleanValue?: boolean;
  onSave: (field: string, value: unknown) => void;
  displayValue?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  valueClassName?: string;
  isLoading?: boolean;
  error?: string | null;
  validation?: FieldValidation;
}

export interface EditableTitleProps {
  value: string;
  onSave: (value: string) => void;
  testId?: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  validation?: FieldValidation;
}

export interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  testId?: string;
}

export interface FieldGridProps {
  children: React.ReactNode;
  className?: string;
}
