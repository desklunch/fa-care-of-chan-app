import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Settings } from "lucide-react";
import {
  FieldTypeSelector,
  type FieldType,
} from "@/components/forms/field-type-selector";
import { Badge } from "@/components/ui/badge";

export interface FormField {
  id: string;
  name: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "checkbox"
    | "toggle"
    | "array"
    | "url"
    | "email"
    | "phone";
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface SortableFieldProps {
  field: FormField;
  sectionId: string;
  onEdit: (
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>,
  ) => void;
  onDelete: (sectionId: string, fieldId: string) => void;
  readOnly?: boolean;
}

function SortableField({
  field,
  sectionId,
  onEdit,
  onDelete,
  readOnly = false,
}: SortableFieldProps) {
  const [newOption, setNewOption] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      const currentOptions = field.options || [];
      onEdit(sectionId, field.id, {
        options: [...currentOptions, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = field.options || [];
    onEdit(sectionId, field.id, {
      options: currentOptions.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-muted/30 rounded border border-border space-y-4"
      data-testid={`field-${field.id}`}
    >
      <div className="flex items-center justify-between gap-8">

            <div className="flex w-full items-center gap-4">
              {!readOnly && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              <Input
                value={field.name}
                onChange={(e) =>
                  onEdit(sectionId, field.id, { name: e.target.value })
                }
                placeholder="Field Name"
                className="text-sm col-span-2"
                data-testid={`input-field-name-${field.id}`}
                readOnly={readOnly}
              />
            </div>
  
        <div className="flex items-center gap-4">
          <Badge
            variant=""
            className="capitalize text-xs"
            data-testid={`badge-field-type-${field.id}`}
          >
            {field.type}
          </Badge>
          {field.type === "select" && !readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOptions(!showOptions)}
              data-testid={`button-toggle-options-${field.id}`}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(sectionId, field.id)}
              data-testid={`button-delete-field-${field.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
 
      </div>

      {/* Description and Required Row */}
      <div className="flex flex-col gap-4 items-start pl-8 ">


        <Input
          value={field.placeholder || ""}
          onChange={(e) =>
            onEdit(sectionId, field.id, { placeholder: e.target.value })
          }
          placeholder="Placeholder text"
          className="text-xs col-span-3 placeholder:text-xs"
          data-testid={`input-field-placeholder-${field.id}`}
          readOnly={readOnly}
        />
        <Textarea
          value={field.description || ""}
          onChange={(e) =>
            onEdit(sectionId, field.id, { description: e.target.value })
          }
          placeholder="Help text / description (optional)"
          className="text-xs placeholder:text-xs resize-none"
          rows={2}
          data-testid={`textarea-field-description-${field.id}`}
          readOnly={readOnly}
        />

        <div className="flex items-center gap-2 pl-2">
          <Switch
            checked={!!field.required}
            onCheckedChange={(checked) =>
              onEdit(sectionId, field.id, { required: !!checked })
            }
            id={`required-${field.id}`}
            data-testid={`switch-field-required-${field.id}`}
            disabled={readOnly}
          />
          <label
            htmlFor={`required-${field.id}`}
            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Required Field
          </label>
        </div>
      </div>

      {field.type === "select" && showOptions && (
        <div className="pl-10 space-y-2 border-l-2 border-primary/20 ml-2">
          <div className="text-sm font-medium">Select Options</div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option"
              className="text-sm"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              data-testid={`input-new-option-${field.id}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              data-testid={`button-add-option-${field.id}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {field.options && field.options.length > 0 && (
            <div className="space-y-1">
              {field.options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded text-sm"
                  data-testid={`option-${field.id}-${index}`}
                >
                  <span>{option}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    data-testid={`button-remove-option-${field.id}-${index}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SortableSectionProps {
  section: FormSection;
  onEdit: (sectionId: string, updates: Partial<FormSection>) => void;
  onDelete: (sectionId: string) => void;
  onAddField: (sectionId: string, fieldType: FieldType) => void;
  onEditField: (
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>,
  ) => void;
  onDeleteField: (sectionId: string, fieldId: string) => void;
  readOnly?: boolean;
}

function SortableSection({
  section,
  onEdit,
  onDelete,
  onAddField,
  onEditField,
  onDeleteField,
  readOnly = false,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`section-${section.id}`}>
      <Card className="space-y-4 mb-4">
        <CardHeader className="p-4 group space-y-3">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </button>
            )}

            <Input
              value={section.title}
              onChange={(e) => onEdit(section.id, { title: e.target.value })}
              className="flex-1 font-semibold"
              placeholder="Section Title"
              data-testid={`input-section-title-${section.id}`}
              readOnly={readOnly}
            />

            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(section.id)}
                data-testid={`button-delete-section-${section.id}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Section Description */}
          <div className="pl-6 pr-12">
            <Textarea
              value={section.description || ""}
              onChange={(e) =>
                onEdit(section.id, { description: e.target.value })
              }
              placeholder="Section description (optional)"
              className="text-sm placeholder:text-xs resize-none"
              rows={2}
              data-testid={`textarea-section-description-${section.id}`}
              readOnly={readOnly}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <DndContext
            sensors={useSensors(
              useSensor(PointerSensor),
              useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
              }),
            )}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const oldIndex = section.fields.findIndex(
                  (f) => f.id === active.id,
                );
                const newIndex = section.fields.findIndex(
                  (f) => f.id === over.id,
                );
                const newFields = arrayMove(section.fields, oldIndex, newIndex);
                onEdit(section.id, { fields: newFields });
              }
            }}
          >
            <SortableContext
              items={section.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId={section.id}
                  onEdit={onEditField}
                  onDelete={onDeleteField}
                  readOnly={readOnly}
                />
              ))}
            </SortableContext>
          </DndContext>

          {!readOnly && (
            <FieldTypeSelector
              onSelect={(fieldType) => onAddField(section.id, fieldType)}
              buttonLabel="Add Field"
              buttonVariant="outline"
              buttonSize="sm"
              buttonClassName="mt-4"
              testId={`button-add-field-${section.id}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface FormBuilderProps {
  sections: FormSection[];
  onSectionsChange: (sections: FormSection[]) => void;
  readOnly?: boolean;
}

export function FormBuilder({
  sections,
  onSectionsChange,
  readOnly = false,
}: FormBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      onSectionsChange(newSections);
    }
  };

  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: "New Section",
      fields: [],
    };
    onSectionsChange([...sections, newSection]);
  };

  const editSection = (sectionId: string, updates: Partial<FormSection>) => {
    onSectionsChange(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
    );
  };

  const deleteSection = (sectionId: string) => {
    onSectionsChange(sections.filter((s) => s.id !== sectionId));
  };

  const addField = (sectionId: string, fieldType: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: "New Field",
      type: fieldType,
      placeholder: "",
    };

    onSectionsChange(
      sections.map((s) =>
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s,
      ),
    );
  };

  const editField = (
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>,
  ) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f,
              ),
            }
          : s,
      ),
    );
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSection
              key={section.id}
              section={section}
              onEdit={editSection}
              onDelete={deleteSection}
              onAddField={addField}
              onEditField={editField}
              onDeleteField={deleteField}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <Button
          onClick={addSection}
          variant="outline"
          className="w-full"
          data-testid="button-add-section"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      )}
    </div>
  );
}
