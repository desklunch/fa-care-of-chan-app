import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { LocationSearch } from "@/components/location-search";
import { EventScheduleEditor } from "@/components/event-schedule";
import { TagAssignment } from "@/components/ui/tag-assignment";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FormSection, FormField as FormFieldType, DealLocation, DealEvent, DealService } from "@shared/schema";

interface FormFieldRendererProps {
  schema: FormSection[];
  form: UseFormReturn<Record<string, unknown>>;
  onAddField?: (sectionId: string, fieldTitle: string) => void;
  onDeleteField?: (sectionId: string, fieldId: string) => void;
}

interface SingleFieldRendererProps {
  field: FormFieldType;
  form: UseFormReturn<Record<string, unknown>>;
  onDeleteField?: (fieldId: string) => void;
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
        <NumericInput
          name={fieldProps.name}
          onBlur={fieldProps.onBlur}
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

function SingleFieldRenderer({ field, form, onDeleteField }: SingleFieldRendererProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <FormField
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem
            className="group/field grid grid-cols-3 gap-4 items-start"
            data-testid={`form-item-${field.id}`}
          >
            <div className="col-span-1 pt-2">
              <div className="flex items-center gap-1">
                <FormLabel
                  className={cn(
                    "text-sm font-medium",
                    field.required
                      ? " after:content-['*'] after:ml-0.5 after:text-destructive"
                      : ""
                  )}
                >
                  {field.name}
                </FormLabel>
                {onDeleteField && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-destructive invisible group-hover/field:visible"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid={`button-delete-field-${field.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {field.description && (
                <FormDescription className="whitespace-pre-wrap mt-1">
                  {field.description}
                </FormDescription>
              )}
            </div>
            <div className="col-span-2">
              <FormControl>
                {renderFieldInput(field, formField)}
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{field.name}"? Any data entered in this field will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`button-cancel-delete-field-${field.id}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteField?.(field.id);
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground"
              data-testid={`button-confirm-delete-field-${field.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SectionRendererProps {
  section: FormSection;
  form: UseFormReturn<Record<string, unknown>>;
  defaultExpanded?: boolean;
  onAddField?: (sectionId: string, fieldTitle: string) => void;
  onDeleteField?: (sectionId: string, fieldId: string) => void;
}

function SectionRenderer({ section, form, defaultExpanded = true, onAddField, onDeleteField }: SectionRendererProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFieldTitle, setNewFieldTitle] = useState("");

  const handleAddField = () => {
    const trimmed = newFieldTitle.trim();
    if (!trimmed || !onAddField) return;
    onAddField(section.id, trimmed);
    setNewFieldTitle("");
    setShowAddDialog(false);
  };

  return (
    <Card className="p-6" data-testid={`section-${section.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left cursor-pointer"
            data-testid={`section-toggle-${section.id}`}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90",
                isOpen && "rotate-0"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <span className="text-sm text-muted-foreground shrink-0" data-testid={`section-field-count-${section.id}`}>
                  {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
                </span>
              </div>
              {section.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-6 pt-6">
            {section.fields.map((field) => (
              <SingleFieldRenderer
                key={field.id}
                field={field}
                form={form}
                onDeleteField={onDeleteField ? (fieldId) => onDeleteField(section.id, fieldId) : undefined}
              />
            ))}
            {onAddField && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  data-testid={`button-add-field-${section.id}`}
                >
                  <Plus className="h-4 w-4" />
                  Add field
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Rich Text Field</DialogTitle>
            <DialogDescription>Enter a title for the new field.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium" htmlFor={`add-field-title-${section.id}`}>
              Field Title
            </label>
            <Input
              id={`add-field-title-${section.id}`}
              value={newFieldTitle}
              onChange={(e) => setNewFieldTitle(e.target.value)}
              placeholder="Enter field title"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddField();
                }
              }}
              data-testid={`input-add-field-title-${section.id}`}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewFieldTitle("");
                setShowAddDialog(false);
              }}
              data-testid={`button-cancel-add-field-${section.id}`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddField}
              disabled={!newFieldTitle.trim()}
              data-testid={`button-confirm-add-field-${section.id}`}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function FormFieldRenderer({ schema, form, onAddField, onDeleteField }: FormFieldRendererProps) {
  if (!schema || schema.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No form fields to display.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="form-renderer">
      {schema.map((section, index) => (
        <SectionRenderer
          key={section.id}
          section={section}
          form={form}
          defaultExpanded={index === 0}
          onAddField={onAddField}
          onDeleteField={onDeleteField}
        />
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
        case "services":
          defaults[field.id] = [];
          break;
        case "tags":
          defaults[field.id] = [];
          break;
        case "richtext":
          defaults[field.id] = field.defaultValue || "";
          break;
        default:
          defaults[field.id] = "";
      }
    });
  });

  return defaults;
}
