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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { ChevronDown, ChevronUp, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onAddSection?: (title: string, description?: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onEditSection?: (sectionId: string, title: string, description?: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  onMoveField?: (
    sectionId: string,
    fieldId: string,
    direction: "up" | "down",
  ) => void;
}

interface SingleFieldRendererProps {
  field: FormFieldType;
  form: UseFormReturn<Record<string, unknown>>;
  onDeleteField?: (fieldId: string) => void;
  onMoveField?: (fieldId: string, direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
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

function SingleFieldRenderer({
  field,
  form,
  onDeleteField,
  onMoveField,
  canMoveUp,
  canMoveDown,
}: SingleFieldRendererProps) {
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
                {(onMoveField || onDeleteField) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover/field:opacity-100 group-focus-within/field:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`More actions for ${field.name}`}
                        data-testid={`button-field-more-${field.id}`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {onMoveField && (
                        <>
                          <DropdownMenuItem
                            disabled={!canMoveUp}
                            onSelect={(e) => {
                              if (!canMoveUp) {
                                e.preventDefault();
                                return;
                              }
                              onMoveField(field.id, "up");
                            }}
                            data-testid={`button-move-field-up-${field.id}`}
                          >
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canMoveDown}
                            onSelect={(e) => {
                              if (!canMoveDown) {
                                e.preventDefault();
                                return;
                              }
                              onMoveField(field.id, "down");
                            }}
                            data-testid={`button-move-field-down-${field.id}`}
                          >
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Move Down
                          </DropdownMenuItem>
                        </>
                      )}
                      {onDeleteField && (
                        <DropdownMenuItem
                          onSelect={() => setShowDeleteConfirm(true)}
                          className="text-destructive focus:text-destructive"
                          data-testid={`button-delete-field-${field.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete field
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
  onDeleteSection?: (sectionId: string) => void;
  onEditSection?: (sectionId: string, title: string, description?: string) => void;
  onMoveSection?: (sectionId: string, direction: "up" | "down") => void;
  onMoveField?: (
    sectionId: string,
    fieldId: string,
    direction: "up" | "down",
  ) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function SectionRenderer({
  section,
  form,
  defaultExpanded = true,
  onAddField,
  onDeleteField,
  onDeleteSection,
  onEditSection,
  onMoveSection,
  onMoveField,
  canMoveUp,
  canMoveDown,
}: SectionRendererProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newFieldTitle, setNewFieldTitle] = useState("");
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState(false);
  const [showEditSectionDialog, setShowEditSectionDialog] = useState(false);
  const [editSectionTitle, setEditSectionTitle] = useState(section.title);
  const [editSectionDescription, setEditSectionDescription] = useState(
    section.description ?? "",
  );

  const openEditSectionDialog = () => {
    setEditSectionTitle(section.title);
    setEditSectionDescription(section.description ?? "");
    setShowEditSectionDialog(true);
  };

  const handleEditSectionSubmit = () => {
    const trimmedTitle = editSectionTitle.trim();
    if (!trimmedTitle || !onEditSection) return;
    const trimmedDescription = editSectionDescription.trim();
    onEditSection(section.id, trimmedTitle, trimmedDescription || undefined);
    setShowEditSectionDialog(false);
  };

  const handleAddField = () => {
    const trimmed = newFieldTitle.trim();
    if (!trimmed || !onAddField) return;
    onAddField(section.id, trimmed);
    setNewFieldTitle("");
    setShowAddDialog(false);
  };

  const canDeleteSection = section.fields.length === 0;

  return (
    <Card className="p-4" data-testid={`section-${section.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
              data-testid={`section-toggle-${section.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90",
                        isOpen && "rotate-0"
                      )}
                    />
                  </div>
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
          {(onMoveSection || onEditSection || onDeleteSection) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  data-testid={`button-section-more-${section.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onMoveSection && (
                  <>
                    <DropdownMenuItem
                      disabled={!canMoveUp}
                      onSelect={(e) => {
                        if (!canMoveUp) {
                          e.preventDefault();
                          return;
                        }
                        onMoveSection(section.id, "up");
                      }}
                      data-testid={`button-move-section-up-${section.id}`}
                    >
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Move Up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canMoveDown}
                      onSelect={(e) => {
                        if (!canMoveDown) {
                          e.preventDefault();
                          return;
                        }
                        onMoveSection(section.id, "down");
                      }}
                      data-testid={`button-move-section-down-${section.id}`}
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Move Down
                    </DropdownMenuItem>
                  </>
                )}
                {onEditSection && (
                  <DropdownMenuItem
                    onSelect={openEditSectionDialog}
                    data-testid={`button-edit-section-${section.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit section
                  </DropdownMenuItem>
                )}
                {onDeleteSection && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropdownMenuItem
                            disabled={!canDeleteSection}
                            onSelect={(e) => {
                              if (!canDeleteSection) {
                                e.preventDefault();
                                return;
                              }
                              setShowDeleteSectionConfirm(true);
                            }}
                            className="text-destructive focus:text-destructive"
                            data-testid={`button-delete-section-${section.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete section
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      {!canDeleteSection && (
                        <TooltipContent side="left">
                          Remove all fields before deleting this section
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <CollapsibleContent>
          <div className="space-y-4 pt-6">
            {section.fields.map((field, fieldIndex) => (
              <SingleFieldRenderer
                key={field.id}
                field={field}
                form={form}
                onDeleteField={onDeleteField ? (fieldId) => onDeleteField(section.id, fieldId) : undefined}
                onMoveField={
                  onMoveField
                    ? (fieldId, direction) =>
                        onMoveField(section.id, fieldId, direction)
                    : undefined
                }
                canMoveUp={fieldIndex > 0}
                canMoveDown={fieldIndex < section.fields.length - 1}
              />
            ))}
            {onAddField && (
              <div className="text-right align-right pt-4">
                <Button
                  type="button"
                  variant="outline"
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

      <Dialog open={showEditSectionDialog} onOpenChange={setShowEditSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Section</DialogTitle>
            <DialogDescription>
              Update the title or description for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label
                className="text-sm font-medium"
                htmlFor={`edit-section-title-${section.id}`}
              >
                Section Title
              </label>
              <Input
                id={`edit-section-title-${section.id}`}
                value={editSectionTitle}
                onChange={(e) => setEditSectionTitle(e.target.value)}
                placeholder="Enter section title"
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEditSectionSubmit();
                  }
                }}
                data-testid={`input-edit-section-title-${section.id}`}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor={`edit-section-description-${section.id}`}
              >
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id={`edit-section-description-${section.id}`}
                value={editSectionDescription}
                onChange={(e) => setEditSectionDescription(e.target.value)}
                placeholder="Enter section description"
                className="mt-2"
                data-testid={`input-edit-section-description-${section.id}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditSectionDialog(false)}
              data-testid={`button-cancel-edit-section-${section.id}`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditSectionSubmit}
              disabled={!editSectionTitle.trim()}
              data-testid={`button-confirm-edit-section-${section.id}`}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteSectionConfirm} onOpenChange={setShowDeleteSectionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{section.title}"? This section is empty and will be removed from the intake.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`button-cancel-delete-section-${section.id}`}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSection?.(section.id);
                setShowDeleteSectionConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground"
              data-testid={`button-confirm-delete-section-${section.id}`}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function FormFieldRenderer({
  schema,
  form,
  onAddField,
  onDeleteField,
  onAddSection,
  onDeleteSection,
  onEditSection,
  onMoveSection,
  onMoveField,
}: FormFieldRendererProps) {
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");

  const handleAddSection = () => {
    const trimmedTitle = newSectionTitle.trim();
    if (!trimmedTitle || !onAddSection) return;
    const trimmedDescription = newSectionDescription.trim();
    onAddSection(trimmedTitle, trimmedDescription || undefined);
    setNewSectionTitle("");
    setNewSectionDescription("");
    setShowAddSectionDialog(false);
  };

  const hasSections = !!schema && schema.length > 0;

  return (
    <div className="space-y-4" data-testid="form-renderer">
      {hasSections ? (
        schema.map((section, index) => (
          <SectionRenderer
            key={section.id}
            section={section}
            form={form}
            defaultExpanded={index === 0}
            onAddField={onAddField}
            onDeleteField={onDeleteField}
            onDeleteSection={onDeleteSection}
            onEditSection={onEditSection}
            onMoveSection={onMoveSection}
            onMoveField={onMoveField}
            canMoveUp={index > 0}
            canMoveDown={index < schema.length - 1}
          />
        ))
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No form fields to display.</p>
        </Card>
      )}

      {onAddSection && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddSectionDialog(true)}
            data-testid="button-add-section"
          >
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        </div>
      )}

      <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Create a new section to group related fields. You can add fields after the section is created.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="add-section-title">
                Section Title
              </label>
              <Input
                id="add-section-title"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Enter section title"
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
                data-testid="input-add-section-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="add-section-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="add-section-description"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                placeholder="Enter section description"
                className="mt-2"
                data-testid="input-add-section-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewSectionTitle("");
                setNewSectionDescription("");
                setShowAddSectionDialog(false);
              }}
              data-testid="button-cancel-add-section"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddSection}
              disabled={!newSectionTitle.trim()}
              data-testid="button-confirm-add-section"
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
