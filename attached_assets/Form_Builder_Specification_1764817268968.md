# FormBuilder & Dynamic Forms - Technical Specification

## Overview
The FormBuilder system provides a reusable, drag-and-drop interface for creating and editing dynamic form structures. It powers multiple features including RFI forms and Discovery forms. The system consists of two main parts: the **FormBuilder** (for editing form structure) and the **FormFieldRenderer** (for rendering forms to end users).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Form System                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────┐                  │
│  │   FormBuilder    │    │ FormFieldRenderer │                  │
│  │  (Edit Mode)     │    │   (View Mode)     │                  │
│  └────────┬─────────┘    └─────────┬─────────┘                  │
│           │                        │                             │
│           ▼                        ▼                             │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              FormSection[] (JSON Schema)              │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
FormBuilder
├── DndContext (section reordering)
│   └── SortableContext
│       └── SortableSection[]
│           ├── Section header (title, description, delete)
│           ├── DndContext (field reordering)
│           │   └── SortableContext
│           │       └── SortableField[]
│           │           ├── Drag handle
│           │           ├── Field name input
│           │           ├── Field type badge
│           │           ├── Required toggle
│           │           └── Options editor (for select type)
│           └── FieldTypeSelector (add field button)
└── Add Section button

FormFieldRenderer
├── Input (text, url, email, phone)
├── Textarea
├── Number input
├── Date picker
├── Select dropdown
├── Checkbox
├── Toggle switch
└── Array (dynamic list)
```

---

## Data Structures

### FormSection
```typescript
interface FormSection {
  id: string;           // Unique identifier (e.g., "section-1699999999999")
  title: string;        // Section heading displayed to users
  description?: string; // Optional section description
  fields: FormField[];  // Array of fields within this section
}
```

### FormField
```typescript
interface FormField {
  id: string;           // Unique identifier (e.g., "field-1699999999999")
  name: string;         // Field label displayed to users
  type: FieldType;      // Input type
  placeholder?: string; // Placeholder text for input
  description?: string; // Help text displayed below field
  options?: string[];   // Options for select fields only
  required?: boolean;   // Whether field is required
}
```

### FieldType
```typescript
type FieldType = 
  | "text"      // Single-line text input
  | "textarea"  // Multi-line text input
  | "number"    // Numeric input
  | "date"      // Date picker (YYYY-MM-DD)
  | "select"    // Dropdown with predefined options
  | "checkbox"  // Boolean checkbox
  | "toggle"    // Boolean toggle switch
  | "array"     // Dynamic list of text items
  | "url"       // URL input with validation
  | "email"     // Email input with validation
  | "phone";    // Phone number input with validation
```

---

## Field Types Reference

| Type | Description | Validation | UI Component |
|------|-------------|------------|--------------|
| text | Single-line text | None | `<Input>` |
| textarea | Multi-line text | None | `<Textarea>` |
| number | Numeric value | Must be a number | `<Input type="number">` |
| date | Calendar date | Valid date format | `<Input type="date">` |
| url | Website URL | Valid URL format | `<Input>` with URL validation |
| email | Email address | Valid email format | `<Input>` with email validation |
| phone | Phone number | 10+ digits, allowed: `\d\s\-\+\(\)` | `<Input>` with phone validation |
| select | Dropdown choice | Must match option | `<Select>` |
| checkbox | Boolean toggle | Boolean | `<Checkbox>` |
| toggle | Boolean switch | Boolean | `<Switch>` |
| array | List of items | Array of strings | Custom array editor |

---

## Components

### FormBuilder
Main component for editing form structure.

```typescript
interface FormBuilderProps {
  sections: FormSection[];
  onSectionsChange: (sections: FormSection[]) => void;
  readOnly?: boolean;  // Disables all editing when true
}
```

**Features:**
- Drag-and-drop section reordering (dnd-kit)
- Drag-and-drop field reordering within sections
- Add/edit/delete sections
- Add/edit/delete fields
- Field type selection via popover
- Required field toggle
- Options management for select fields
- Read-only mode support

### FormFieldRenderer
Renders individual form fields for data entry.

```typescript
interface FormFieldRendererProps {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
}
```

**Features:**
- Renders appropriate input component based on field type
- Real-time validation for url, email, phone fields
- Validation error display
- Description/help text support
- Array field management (add/remove items)

### FieldTypeSelector
Popover component for selecting field types when adding new fields.

```typescript
interface FieldTypeSelectorProps {
  onSelect: (type: FieldType) => void;
  buttonLabel?: string;           // Default: "Add Field"
  buttonVariant?: "default" | "outline" | "ghost";
  buttonSize?: "default" | "sm" | "lg";
  buttonClassName?: string;
  testId?: string;
}
```

---

## Drag-and-Drop Implementation

Uses `@dnd-kit` library for drag-and-drop functionality.

### Dependencies
```json
{
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x",
  "@dnd-kit/utilities": "^3.x"
}
```

### Section Reordering
```typescript
const handleSectionDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const newSections = arrayMove(sections, oldIndex, newIndex);
    onSectionsChange(newSections);
  }
};
```

### Field Reordering
Fields can be reordered within their parent section using the same pattern.

---

## Validation

### Client-Side Validation (FormFieldRenderer)
```typescript
// URL Validation
const validateUrl = (url: string): boolean => {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Email Validation
const validateEmail = (email: string): boolean => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone Validation
const validatePhone = (phone: string): boolean => {
  if (!phone) return true;
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
};
```

### Dynamic Zod Schema Generation
For form submission, a Zod schema is dynamically generated from the form structure:

```typescript
function generateZodSchema(sections: FormSection[]) {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  sections.forEach((section) => {
    section.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'text':
        case 'textarea':
          fieldSchema = field.required 
            ? z.string().min(1, "Required")
            : z.string();
          break;
        case 'email':
          fieldSchema = z.string().email();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'checkbox':
        case 'toggle':
          fieldSchema = z.boolean();
          break;
        case 'array':
          fieldSchema = field.required
            ? z.array(z.string()).min(1, "At least one item required")
            : z.array(z.string());
          break;
        // ... other types
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional().nullable();
      }

      schemaFields[field.id] = fieldSchema;
    });
  });

  return z.object(schemaFields);
}
```

## Storage Format

Form schemas are stored as JSONB in the database

---

## Example Form Schema

```json
[
  {
    "id": "section-1699999999999",
    "title": "Company Information",
    "description": "Basic details about your organization",
    "fields": [
      {
        "id": "field-1699999999001",
        "name": "Company Name",
        "type": "text",
        "placeholder": "Enter company name",
        "required": true
      },
      {
        "id": "field-1699999999002",
        "name": "Years in Business",
        "type": "number",
        "description": "How long has your company been operating?",
        "required": true
      },
      {
        "id": "field-1699999999003",
        "name": "Company Website",
        "type": "url",
        "placeholder": "https://example.com",
        "required": false
      }
    ]
  },
  {
    "id": "section-1699999999998",
    "title": "Services",
    "fields": [
      {
        "id": "field-1699999999004",
        "name": "Primary Service",
        "type": "select",
        "options": ["Catering", "AV Equipment", "Florals", "Staffing"],
        "required": true
      },
      {
        "id": "field-1699999999005",
        "name": "Service Regions",
        "type": "array",
        "description": "List all cities/regions you serve"
      },
      {
        "id": "field-1699999999006",
        "name": "Available Weekends",
        "type": "toggle"
      }
    ]
  }
]
```