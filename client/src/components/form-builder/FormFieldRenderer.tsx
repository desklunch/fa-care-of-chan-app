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

function SingleFieldRenderer({ field, form }: SingleFieldRendererProps) {
  return (
    <FormField
      control={form.control}
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className="space-y-2" data-testid={`form-item-${field.id}`}>
          <FormLabel className={field.required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ""}>
            {field.name}
          </FormLabel>
          <FormControl>
            {field.type === "text" && (
              <Input
                {...formField}
                value={formField.value as string || ""}
                placeholder={field.placeholder}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "email" && (
              <Input
                {...formField}
                type="email"
                value={formField.value as string || ""}
                placeholder={field.placeholder}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "phone" && (
              <Input
                {...formField}
                type="tel"
                value={formField.value as string || ""}
                placeholder={field.placeholder}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "url" && (
              <Input
                {...formField}
                type="url"
                value={formField.value as string || ""}
                placeholder={field.placeholder}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "number" && (
              <Input
                {...formField}
                type="number"
                value={formField.value as number || ""}
                onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : "")}
                placeholder={field.placeholder}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "date" && (
              <Input
                {...formField}
                type="date"
                value={formField.value as string || ""}
                data-testid={`input-${field.id}`}
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                {...formField}
                value={formField.value as string || ""}
                placeholder={field.placeholder}
                className="resize-none"
                rows={4}
                data-testid={`textarea-${field.id}`}
              />
            )}
            {field.type === "select" && (
              <Select
                value={formField.value as string || ""}
                onValueChange={formField.onChange}
              >
                <SelectTrigger data-testid={`select-${field.id}`}>
                  <SelectValue placeholder={field.placeholder || "Select an option"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      data-testid={`option-${field.id}-${option}`}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.type === "checkbox" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!formField.value}
                  onCheckedChange={formField.onChange}
                  data-testid={`checkbox-${field.id}`}
                />
                {field.placeholder && (
                  <Label className="font-normal text-muted-foreground">
                    {field.placeholder}
                  </Label>
                )}
              </div>
            )}
            {field.type === "toggle" && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!formField.value}
                  onCheckedChange={formField.onChange}
                  data-testid={`toggle-${field.id}`}
                />
                {field.placeholder && (
                  <Label className="font-normal text-muted-foreground">
                    {field.placeholder}
                  </Label>
                )}
              </div>
            )}
            {field.type === "array" && (
              <Textarea
                {...formField}
                value={formField.value as string || ""}
                placeholder={field.placeholder || "Enter items, one per line"}
                className="resize-none"
                rows={4}
                data-testid={`array-${field.id}`}
              />
            )}
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
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
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
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

export function buildValidationRules(schema: FormSection[]): Record<string, { required?: boolean }> {
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

export function buildDefaultValues(schema: FormSection[]): Record<string, unknown> {
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
