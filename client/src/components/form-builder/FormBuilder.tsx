import { useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Settings,
  FileText,
  Hash,
  Type,
  AlignLeft,
  CheckSquare,
  Calendar,
  List,
  Mail,
  Phone,
  Link as LinkIcon,
  ToggleLeft,
  Layers,
  FileEdit,
  MapPin,
  CalendarRange,
  DollarSign,
  Briefcase,
  Tag,
  Unlink,
} from "lucide-react";
import type { FormSection, FormField, FormFieldType, EntityMapping } from "@shared/schema";
import { mappableEntities } from "@shared/schema";

const textCompatibleTypes: FormFieldType[] = ["text", "textarea", "richtext", "email", "phone", "url"];

function isFieldTypeCompatible(fieldType: FormFieldType, propertyFieldType: FormFieldType): boolean {
  if (fieldType === propertyFieldType) return true;
  if (propertyFieldType === "text" && textCompatibleTypes.includes(fieldType)) return true;
  if (propertyFieldType === "textarea" && textCompatibleTypes.includes(fieldType)) return true;
  if (fieldType === "text" && (propertyFieldType === "textarea" || propertyFieldType === "richtext")) return true;
  if (fieldType === "textarea" && (propertyFieldType === "text" || propertyFieldType === "richtext")) return true;
  if (fieldType === "richtext" && (propertyFieldType === "text" || propertyFieldType === "textarea")) return true;
  return false;
}

const fieldTypeIcons: Record<FormFieldType, typeof Type> = {
  text: Type,
  textarea: AlignLeft,
  richtext: FileEdit,
  number: Hash,
  email: Mail,
  phone: Phone,
  url: LinkIcon,
  select: List,
  checkbox: CheckSquare,
  date: Calendar,
  toggle: ToggleLeft,
  array: Layers,
  location: MapPin,
  eventSchedule: CalendarRange,
  budgetRange: DollarSign,
  services: Briefcase,
  tags: Tag,
};

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: "Short Text",
  textarea: "Long Text",
  richtext: "Rich Text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  url: "URL",
  select: "Dropdown",
  checkbox: "Checkbox",
  date: "Date",
  toggle: "Toggle",
  array: "List/Array",
  location: "Location",
  eventSchedule: "Event Schedule",
  budgetRange: "Budget Range",
  services: "Services",
  tags: "Tags",
};

interface FormBuilderProps {
  value: FormSection[];
  onChange: (sections: FormSection[]) => void;
}

function generateId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface SortableFieldProps {
  field: FormField;
  sectionId: string;
  onEdit: (field: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableField({ field, onEdit, onDelete, onDuplicate }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = fieldTypeIcons[field.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-background border rounded-md group"
    >
      <button
        className="cursor-grab hover:bg-muted p-1 rounded"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-field-${field.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.name || "Untitled Field"}</span>
          {field.required && (
            <Badge variant="secondary" className="text-xs">Required</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{fieldTypeLabels[field.type]}</span>
      </div>
      
      <div className="flex items-center gap-1 invisible group-hover:visible">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(field)}
          data-testid={`edit-field-${field.id}`}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          data-testid={`duplicate-field-${field.id}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          data-testid={`delete-field-${field.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface SortableSectionProps {
  section: FormSection;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddField: () => void;
  onEditField: (field: FormField) => void;
  onDeleteField: (fieldId: string) => void;
  onDuplicateField: (field: FormField) => void;
  onReorderFields: (oldIndex: number, newIndex: number) => void;
}

function SortableSection({
  section,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddField,
  onEditField,
  onDeleteField,
  onDuplicateField,
  onReorderFields,
}: SortableSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.fields.findIndex((f) => f.id === active.id);
      const newIndex = section.fields.findIndex((f) => f.id === over.id);
      onReorderFields(oldIndex, newIndex);
    }
  }

  return (
    <Card ref={setNodeRef} style={style} className="p-4" data-testid={`section-${section.id}`}>
      <div className="flex items-center gap-2 mb-4">
        <button
          className="cursor-grab hover:bg-muted p-1 rounded"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-section-${section.id}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        
        {isEditingTitle ? (
          <Input
            value={section.title}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
            className="flex-1"
            autoFocus
            data-testid={`input-section-title-${section.id}`}
          />
        ) : (
          <h3
            className="flex-1 font-semibold cursor-pointer hover:underline"
            onClick={() => setIsEditingTitle(true)}
            data-testid={`section-title-${section.id}`}
          >
            {section.title || "Untitled Section"}
          </h3>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          data-testid={`toggle-section-${section.id}`}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          data-testid={`duplicate-section-${section.id}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          data-testid={`delete-section-${section.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-3">
            <Input
              placeholder="Section description (optional)"
              value={section.description || ""}
              onChange={(e) => onUpdate({ ...section, description: e.target.value })}
              className="text-sm"
              data-testid={`input-section-description-${section.id}`}
            />
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFieldDragEnd}
          >
            <SortableContext
              items={section.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {section.fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    sectionId={section.id}
                    onEdit={onEditField}
                    onDelete={() => onDeleteField(field.id)}
                    onDuplicate={() => onDuplicateField(field)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            onClick={onAddField}
            className="w-full border-dashed"
            data-testid={`add-field-to-section-${section.id}`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </>
      )}
    </Card>
  );
}

interface FieldEditorDialogProps {
  field: FormField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: FormField) => void;
}

function FieldEditorDialog({ field, open, onOpenChange, onSave }: FieldEditorDialogProps) {
  const [editedField, setEditedField] = useState<FormField | null>(field);

  const handleSave = useCallback(() => {
    if (editedField) {
      onSave(editedField);
      onOpenChange(false);
    }
  }, [editedField, onSave, onOpenChange]);

  const updateField = useCallback((updates: Partial<FormField>) => {
    if (editedField) {
      setEditedField({ ...editedField, ...updates });
    }
  }, [editedField]);

  const addOption = useCallback(() => {
    if (editedField && editedField.type === "select") {
      const options = editedField.options || [];
      const newOption = `Option ${options.length + 1}`;
      setEditedField({ ...editedField, options: [...options, newOption] });
    }
  }, [editedField]);

  const updateOption = useCallback((index: number, value: string) => {
    if (editedField && editedField.type === "select" && editedField.options) {
      const newOptions = [...editedField.options];
      newOptions[index] = value;
      setEditedField({ ...editedField, options: newOptions });
    }
  }, [editedField]);

  const removeOption = useCallback((index: number) => {
    if (editedField && editedField.type === "select" && editedField.options) {
      const newOptions = editedField.options.filter((_, i) => i !== index);
      setEditedField({ ...editedField, options: newOptions });
    }
  }, [editedField]);

  if (field && (!editedField || field.id !== editedField.id)) {
    setEditedField(field);
    return null;
  }

  if (!editedField) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
          <DialogDescription>Configure the field settings below.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name / Label</Label>
            <Input
              id="field-name"
              value={editedField.name}
              onChange={(e) => updateField({ name: e.target.value })}
              placeholder="Field name"
              data-testid="input-field-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <Select
              value={editedField.type}
              onValueChange={(value: FormFieldType) => updateField({ type: value, options: value === "select" ? [] : undefined })}
              disabled={(() => {
                if (!editedField.entityMapping?.propertyKey) return false;
                const entity = mappableEntities[editedField.entityMapping.entityType];
                const prop = entity?.properties.find((p) => p.key === editedField.entityMapping!.propertyKey);
                if (!prop) return false;
                return !textCompatibleTypes.includes(prop.fieldType);
              })()}
            >
              <SelectTrigger id="field-type" data-testid="select-field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fieldTypeLabels)
                  .filter(([type]) => {
                    if (!editedField.entityMapping?.propertyKey) return true;
                    const entity = mappableEntities[editedField.entityMapping.entityType];
                    const prop = entity?.properties.find((p) => p.key === editedField.entityMapping!.propertyKey);
                    if (!prop) return true;
                    return isFieldTypeCompatible(type as FormFieldType, prop.fieldType);
                  })
                  .map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editedField.entityMapping?.propertyKey && (() => {
              const entity = mappableEntities[editedField.entityMapping!.entityType];
              const prop = entity?.properties.find((p) => p.key === editedField.entityMapping!.propertyKey);
              return prop && !textCompatibleTypes.includes(prop.fieldType)
                ? <p className="text-xs text-muted-foreground">Type is locked by property mapping.</p>
                : <p className="text-xs text-muted-foreground">Type is limited to compatible types by property mapping.</p>;
            })()}
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={editedField.placeholder || ""}
              onChange={(e) => updateField({ placeholder: e.target.value })}
              placeholder="Placeholder text"
              data-testid="input-field-placeholder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-description">Description / Help Text</Label>
            <Textarea
              id="field-description"
              value={editedField.description || ""}
              onChange={(e) => updateField({ description: e.target.value })}
              placeholder="Additional instructions for this field"
              className="resize-none"
              rows={2}
              data-testid="textarea-field-description"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="field-required"
              checked={editedField.required}
              onCheckedChange={(checked) => updateField({ required: !!checked })}
              data-testid="checkbox-field-required"
            />
            <Label htmlFor="field-required" className="cursor-pointer">Required field</Label>
          </div>

          <div className="space-y-2">
            <Label>Property Mapping</Label>
            <p className="text-xs text-muted-foreground">
              Optionally map this field to an entity property for data sync.
            </p>
            <Select
              value={editedField.entityMapping?.entityType || "__none__"}
              onValueChange={(val) => {
                if (val === "__none__") {
                  updateField({ entityMapping: undefined });
                } else {
                  updateField({
                    entityMapping: { entityType: val, propertyKey: "" },
                  });
                }
              }}
            >
              <SelectTrigger data-testid="select-entity-type">
                <SelectValue placeholder="No mapping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No mapping</SelectItem>
                {Object.entries(mappableEntities).map(([key, entity]) => (
                  <SelectItem key={key} value={key}>
                    {entity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editedField.entityMapping?.entityType && mappableEntities[editedField.entityMapping.entityType] && (
              <Select
                value={editedField.entityMapping.propertyKey || "__none__"}
                onValueChange={(propKey) => {
                  if (propKey === "__none__") {
                    updateField({
                      entityMapping: { ...editedField.entityMapping!, propertyKey: "" },
                    });
                    return;
                  }
                  const entity = mappableEntities[editedField.entityMapping!.entityType];
                  const prop = entity?.properties.find((p) => p.key === propKey);
                  if (prop) {
                    const updates: Partial<FormField> = {
                      entityMapping: { ...editedField.entityMapping!, propertyKey: propKey },
                    };
                    if (!isFieldTypeCompatible(editedField.type, prop.fieldType)) {
                      updates.type = prop.fieldType;
                    }
                    updateField(updates);
                  }
                }}
              >
                <SelectTrigger data-testid="select-entity-property">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select property...</SelectItem>
                  {mappableEntities[editedField.entityMapping.entityType].properties
                    .filter((prop) => isFieldTypeCompatible(editedField.type, prop.fieldType))
                    .map((prop) => (
                    <SelectItem key={prop.key} value={prop.key}>
                      {prop.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {editedField.entityMapping?.propertyKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateField({ entityMapping: undefined })}
                className="text-muted-foreground gap-1"
                data-testid="button-clear-mapping"
              >
                <Unlink className="h-3 w-3" />
                Clear Mapping
              </Button>
            )}
          </div>

          {editedField.type === "select" && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {(editedField.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder="Option"
                      className="flex-1"
                      data-testid={`input-option-${index}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      data-testid={`remove-option-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
                data-testid="button-add-option"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-field">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-field">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: FormFieldType) => void;
}

function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field</DialogTitle>
          <DialogDescription>Choose a field type to add to this section.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {(Object.entries(fieldTypeLabels) as [FormFieldType, string][]).map(([type, label]) => {
            const Icon = fieldTypeIcons[type];
            return (
              <Button
                key={type}
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onAdd(type);
                  onOpenChange(false);
                }}
                data-testid={`add-field-type-${type}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FormBuilder({ value, onChange }: FormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [addFieldSectionId, setAddFieldSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.findIndex((s: FormSection) => s.id === active.id);
      const newIndex = value.findIndex((s: FormSection) => s.id === over.id);
      onChange(arrayMove(value, oldIndex, newIndex));
    }
  }, [value, onChange]);

  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: generateId(),
      title: "New Section",
      description: "",
      fields: [],
    };
    onChange([...value, newSection]);
  }, [value, onChange]);

  const updateSection = useCallback((sectionId: string, updates: FormSection) => {
    onChange(value.map((s: FormSection) => (s.id === sectionId ? updates : s)));
  }, [value, onChange]);

  const deleteSection = useCallback((sectionId: string) => {
    onChange(value.filter((s: FormSection) => s.id !== sectionId));
  }, [value, onChange]);

  const duplicateSection = useCallback((section: FormSection) => {
    const newSection: FormSection = {
      ...section,
      id: generateId(),
      title: `${section.title} (Copy)`,
      fields: section.fields.map((f: FormField) => ({ ...f, id: generateId() })),
    };
    const index = value.findIndex((s: FormSection) => s.id === section.id);
    const newSections = [...value];
    newSections.splice(index + 1, 0, newSection);
    onChange(newSections);
  }, [value, onChange]);

  const addField = useCallback((sectionId: string, type: FormFieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      name: fieldTypeLabels[type],
      placeholder: "",
      required: false,
      options: type === "select" ? [] : undefined,
    };
    onChange(
      value.map((s: FormSection) =>
        s.id === sectionId
          ? { ...s, fields: [...s.fields, newField] }
          : s
      )
    );
    setEditingField(newField);
    setIsFieldEditorOpen(true);
  }, [value, onChange]);

  const updateField = useCallback((sectionId: string, updatedField: FormField) => {
    onChange(
      value.map((s: FormSection) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map((f: FormField) => (f.id === updatedField.id ? updatedField : f)) }
          : s
      )
    );
  }, [value, onChange]);

  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    onChange(
      value.map((s: FormSection) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f: FormField) => f.id !== fieldId) }
          : s
      )
    );
  }, [value, onChange]);

  const duplicateField = useCallback((sectionId: string, field: FormField) => {
    const newField: FormField = {
      ...field,
      id: generateId(),
      name: `${field.name} (Copy)`,
    };
    onChange(
      value.map((s: FormSection) => {
        if (s.id === sectionId) {
          const index = s.fields.findIndex((f: FormField) => f.id === field.id);
          const newFields = [...s.fields];
          newFields.splice(index + 1, 0, newField);
          return { ...s, fields: newFields };
        }
        return s;
      })
    );
  }, [value, onChange]);

  const reorderFields = useCallback((sectionId: string, oldIndex: number, newIndex: number) => {
    onChange(
      value.map((s: FormSection) =>
        s.id === sectionId
          ? { ...s, fields: arrayMove(s.fields, oldIndex, newIndex) }
          : s
      )
    );
  }, [value, onChange]);

  const handleEditField = useCallback((_sectionId: string, field: FormField) => {
    setEditingField(field);
    setIsFieldEditorOpen(true);
  }, []);

  const handleSaveField = useCallback((field: FormField) => {
    const sectionId = value.find((s: FormSection) =>
      s.fields.some((f: FormField) => f.id === field.id)
    )?.id;
    if (sectionId) {
      updateField(sectionId, field);
    }
  }, [value, updateField]);

  return (
    <div className="space-y-4" data-testid="form-builder">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={value.map((s: FormSection) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {value.map((section: FormSection) => (
              <SortableSection
                key={section.id}
                section={section}
                onUpdate={(s) => updateSection(section.id, s)}
                onDelete={() => deleteSection(section.id)}
                onDuplicate={() => duplicateSection(section)}
                onAddField={() => setAddFieldSectionId(section.id)}
                onEditField={(field) => handleEditField(section.id, field)}
                onDeleteField={(fieldId) => deleteField(section.id, fieldId)}
                onDuplicateField={(field) => duplicateField(section.id, field)}
                onReorderFields={(oldIndex, newIndex) =>
                  reorderFields(section.id, oldIndex, newIndex)
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {value.length === 0 && (
        <Card className="p-8 border-dashed flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No sections yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a section to start building your form.
          </p>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={addSection}
        className="w-full border-dashed"
        data-testid="button-add-section"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>

      <FieldEditorDialog
        field={editingField}
        open={isFieldEditorOpen}
        onOpenChange={setIsFieldEditorOpen}
        onSave={handleSaveField}
      />

      <AddFieldDialog
        open={!!addFieldSectionId}
        onOpenChange={(open) => !open && setAddFieldSectionId(null)}
        onAdd={(type) => {
          if (addFieldSectionId) {
            addField(addFieldSectionId, type);
            setAddFieldSectionId(null);
          }
        }}
      />
    </div>
  );
}
