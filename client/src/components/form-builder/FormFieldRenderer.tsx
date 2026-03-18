import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/rich-text-editor";
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
import { LocationSearch } from "@/components/location-search";
import { EventScheduleEditor } from "@/components/event-schedule";
import { TagAssignment } from "@/components/ui/tag-assignment";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { FormSection, FormField as FormFieldType, DealLocation, DealEvent, DealService } from "@shared/schema";

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
    case "richtext":
      return (
        <div className="w-full">
          <RichTextEditor
            value={(fieldProps.value as string) || ""}
            onChange={(val) => fieldProps.onChange(val)}
            onBlur={fieldProps.onBlur}
            placeholder={fieldDef.placeholder}
            data-testid={`richtext-${fieldDef.id}`}
          />
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
    case "location":
      return (
        <LocationSearch
          value={(fieldProps.value as DealLocation[]) || []}
          onChange={(locations) => fieldProps.onChange(locations)}
          testId={`location-${fieldDef.id}`}
        />
      );
    case "eventSchedule":
      return (
        <EventScheduleEditor
          value={(fieldProps.value as DealEvent[]) || []}
          onChange={(events) => fieldProps.onChange(events)}
        />
      );
    case "budgetRange":
      return (
        <BudgetRangeInput
          value={(fieldProps.value as { low?: number; high?: number; notes?: string }) || {}}
          onChange={(val) => fieldProps.onChange(val)}
          testId={`budget-${fieldDef.id}`}
        />
      );
    case "services":
      return (
        <ServicesFieldRenderer
          value={(fieldProps.value as number[]) || []}
          onChange={(ids) => fieldProps.onChange(ids)}
          testId={`services-${fieldDef.id}`}
        />
      );
    case "tags":
      return (
        <TagAssignment
          category="Deals"
          selectedTagIds={(fieldProps.value as string[]) || []}
          onTagsChange={(ids) => fieldProps.onChange(ids)}
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

function BudgetRangeInput({
  value,
  onChange,
  testId,
}: {
  value: { low?: number; high?: number; notes?: string };
  onChange: (val: { low?: number; high?: number; notes?: string }) => void;
  testId?: string;
}) {
  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Low</Label>
          <Input
            type="number"
            value={value.low ?? ""}
            onChange={(e) =>
              onChange({ ...value, low: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="Min budget"
            data-testid={testId ? `${testId}-low` : "input-budget-low"}
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">High</Label>
          <Input
            type="number"
            value={value.high ?? ""}
            onChange={(e) =>
              onChange({ ...value, high: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="Max budget"
            data-testid={testId ? `${testId}-high` : "input-budget-high"}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={value.notes || ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Budget notes..."
          className="resize-none"
          rows={2}
          data-testid={testId ? `${testId}-notes` : "textarea-budget-notes"}
        />
      </div>
    </div>
  );
}

function ServicesFieldRenderer({
  value,
  onChange,
  testId,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  testId?: string;
}) {
  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  return (
    <div className="grid grid-cols-3 gap-3" data-testid={testId}>
      {dealServices
        .filter((s) => s.isActive)
        .map((service) => {
          const isSelected = value.includes(service.id);
          return (
            <Badge
              key={service.id}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none toggle-elevate",
                isSelected && "toggle-elevated",
              )}
              onClick={() => {
                if (isSelected) {
                  onChange(value.filter((id) => id !== service.id));
                } else {
                  onChange([...value, service.id]);
                }
              }}
              data-testid={`badge-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {service.name}
            </Badge>
          );
        })}
    </div>
  );
}

function SingleFieldRenderer({ field, form }: SingleFieldRendererProps) {
  return (
    <FormField
      control={form.control}
      name={field.id}
      render={({ field: formField }) => (
        <FormItem
          className=""
          data-testid={`form-item-${field.id}`}
        >
          <FormLabel
            className={
              field.required
                ? " after:content-['*'] after:ml-0.5 after:text-destructive"
                : ""
            }
          >
            {field.name}
          </FormLabel>
          {field.description && (
            <FormDescription className="">
              {field.description}
            </FormDescription>
          )}
          <FormControl className="">
            {renderFieldInput(field, formField)}
          </FormControl>
  

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
      <div className="space-y-6 ">
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
        case "location":
          defaults[field.id] = [];
          break;
        case "eventSchedule":
          defaults[field.id] = [];
          break;
        case "budgetRange":
          defaults[field.id] = {};
          break;
        case "services":
          defaults[field.id] = [];
          break;
        case "tags":
          defaults[field.id] = [];
          break;
        default:
          defaults[field.id] = "";
      }
    });
  });

  return defaults;
}
