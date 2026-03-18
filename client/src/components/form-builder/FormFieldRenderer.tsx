import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import type { FormSection, FormField as FormFieldType } from "@shared/schema";

interface FormFieldRendererProps {
  schema: FormSection[];
  form: UseFormReturn<Record<string, unknown>>;
}

interface SingleFieldRendererProps {
  field: FormFieldType;
  form: UseFormReturn<Record<string, unknown>>;
}

function renderFieldInput(
  fieldDef: FormFieldType,
  formField: {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<never>;
  },
) {
  const { ref: _ref, ...fieldProps } = formField;
  switch (fieldDef.type) {
    case "text":
      return (
        <Input
          {...fieldProps}
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "email":
      return (
        <Input
          {...fieldProps}
          type="email"
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "phone":
      return (
        <Input
          {...fieldProps}
          type="tel"
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "url":
      return (
        <Input
          {...fieldProps}
          type="url"
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "number":
      return (
        <Input
          {...fieldProps}
          type="number"
          value={(fieldProps.value as number) || ""}
          onChange={(e) =>
            fieldProps.onChange(e.target.value ? Number(e.target.value) : "")
          }
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "date":
      return (
        <Input
          {...fieldProps}
          type="date"
          value={(fieldProps.value as string) || ""}
          data-testid={`input-${fieldDef.id}`}
        />
      );
    case "textarea":
      return (
        <Textarea
          {...fieldProps}
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          className=""
          rows={4}
          data-testid={`textarea-${fieldDef.id}`}
        />
      );
    case "select":
      return (
        <Select
          value={(fieldProps.value as string) || ""}
          onValueChange={fieldProps.onChange}
        >
          <SelectTrigger data-testid={`select-${fieldDef.id}`}>
            <SelectValue
              placeholder={fieldDef.placeholder || "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {fieldDef.options?.map((option) => (
              <SelectItem
                key={option}
                value={option}
                data-testid={`option-${fieldDef.id}-${option}`}
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!fieldProps.value}
            onCheckedChange={fieldProps.onChange}
            data-testid={`checkbox-${fieldDef.id}`}
          />
          {fieldDef.placeholder && (
            <Label className="font-normal text-muted-foreground">
              {fieldDef.placeholder}
            </Label>
          )}
        </div>
      );
    case "toggle":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!fieldProps.value}
            onCheckedChange={fieldProps.onChange}
            data-testid={`toggle-${fieldDef.id}`}
          />
          {fieldDef.placeholder && (
            <Label className="font-normal text-muted-foreground">
              {fieldDef.placeholder}
            </Label>
          )}
        </div>
      );
    case "array":
      return (
        <Textarea
          {...fieldProps}
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder || "Enter items, one per line"}
          className="resize-none"
          rows={4}
          data-testid={`array-${fieldDef.id}`}
        />
      );
    default:
      return (
        <Input
          {...fieldProps}
          value={(fieldProps.value as string) || ""}
          placeholder={fieldDef.placeholder}
          data-testid={`input-${fieldDef.id}`}
        />
      );
  }
}

function SingleFieldRenderer({ field, form }: SingleFieldRendererProps) {
  return (
    <FormField
      control={form.control}
      name={field.id}
      render={({ field: formField }) => (
        <FormItem
          className="space-y-0 grid grid-cols-12 w-full gap-6"
          data-testid={`form-item-${field.id}`}
        >
          <FormLabel
            className={
              field.required
                ? "col-span-2 after:content-['*'] after:ml-0.5 after:text-destructive"
                : "col-span-2 "
            }
          >
            {field.name}
          </FormLabel>
          <FormControl className="col-span-6">
            {renderFieldInput(field, formField)}
          </FormControl>

          {field.description && (
            <FormDescription className="col-span-4">
              {field.description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SectionRendererProps {
  section: FormSection;
  form: UseFormReturn<Record<string, unknown>>;
}

function SectionRenderer({ section, form }: SectionRendererProps) {
  return (
    <Card className="p-6" data-testid={`section-${section.id}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {section.description}
          </p>
        )}
      </div>
      <div className="space-y-6">
        {section.fields.map((field) => (
          <SingleFieldRenderer key={field.id} field={field} form={form} />
        ))}
      </div>
    </Card>
  );
}

export function FormFieldRenderer({ schema, form }: FormFieldRendererProps) {
  if (!schema || schema.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No form fields to display.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="form-renderer">
      {schema.map((section) => (
        <SectionRenderer key={section.id} section={section} form={form} />
      ))}
    </div>
  );
}

export function buildValidationRules(
  schema: FormSection[],
): Record<string, { required?: boolean }> {
  const rules: Record<string, { required?: boolean }> = {};

  schema.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.required) {
        rules[field.id] = { required: true };
      }
    });
  });

  return rules;
}

export function buildDefaultValues(
  schema: FormSection[],
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  schema.forEach((section) => {
    section.fields.forEach((field) => {
      switch (field.type) {
        case "checkbox":
        case "toggle":
          defaults[field.id] = false;
          break;
        case "number":
          defaults[field.id] = "";
          break;
        default:
          defaults[field.id] = "";
      }
    });
  });

  return defaults;
}
