# Vendor Information Collection Form - Technical Specification

## Overview
The Vendor Information Collection Form (also known as RFI - Request for Information) system enables staff to create customizable forms, send them to multiple vendors via unique tokenized URLs, and collect structured responses. This supports vendor qualification, capability assessment, and information gathering workflows.

---

## Core Concepts

### Workflow
```
1. Create Template (optional) → Reusable form structure
2. Create Request → Draft with title, description, due date
3. Add Vendors → Select which vendors receive the form
4. Customize Form → Edit sections and fields as needed
5. Send Request → Generates unique tokens, locks form
6. Vendors Respond → Public form at /rfi/respond/:token
7. Review Responses → View collected data in admin UI
```

### Status Flow
```
Draft → Sent
  │       │
  │       └─► Vendors respond (Pending → Responded)
  │
  └─► Can edit form, add/remove vendors
```

---

## Database Schema

### `rfi_forms` - Reusable Templates
```
rfi_forms:
├── id (serial, PK, NOT NULL)
├── name (varchar 255, NOT NULL)
├── description (text)
├── templateData (jsonb, NOT NULL) - Form structure
├── createdById (FK → users.id, on delete: set null)
├── createdAt / updatedAt (timestamps)

Index: on name
```

### `rfi_requests` - Individual Requests
```
rfi_requests:
├── id (serial, PK, NOT NULL)
├── formId (FK → rfi_forms.id, on delete: set null)
├── title (varchar 255, NOT NULL)
├── description (text)
├── formSchema (jsonb, NOT NULL) - Copied/customized form structure
├── status (varchar 20, NOT NULL, default: "Draft")
├── dueDate (date)
├── createdById (FK → users.id, on delete: set null)
├── createdAt / updatedAt (timestamps)

Indexes:
├── on formId
├── on createdById
└── on status
```

### `rfi_recipients` - Vendor Links
```
rfi_recipients:
├── id (serial, PK, NOT NULL)
├── requestId (FK → rfi_requests.id, cascade delete, NOT NULL)
├── vendorId (FK → vendors.id, cascade delete, NOT NULL)
├── token (varchar 255, unique, NOT NULL) - Public URL token
├── status (varchar 20, NOT NULL, default: "Pending")
├── sentAt (timestamp)
├── respondedAt (timestamp)

Indexes:
├── on requestId
├── on vendorId
├── on token
└── Unique on (requestId, vendorId)
```

### `rfi_responses` - Vendor Submissions
```
rfi_responses:
├── id (serial, PK, NOT NULL)
├── recipientId (FK → rfi_recipients.id, cascade delete, unique, NOT NULL)
├── responseData (jsonb, NOT NULL) - Field values keyed by field ID
├── createdAt / updatedAt (timestamps)

Index: on recipientId
```

---

## Form Schema Structure

### FormSection
```typescript
interface FormSection {
  id: string;           // Unique section identifier
  title: string;        // Section heading
  description?: string; // Optional section description
  fields: FormField[];  // Array of fields in this section
}
```

### FormField
```typescript
interface FormField {
  id: string;           // Unique field identifier
  name: string;         // Field label
  type: FieldType;      // Field input type
  placeholder?: string; // Input placeholder text
  description?: string; // Help text below field
  options?: string[];   // For select fields only
  required?: boolean;   // Validation requirement
}

type FieldType = 
  | "text"      // Single-line text input
  | "textarea"  // Multi-line text input
  | "number"    // Numeric input
  | "date"      // Date picker
  | "select"    // Dropdown with options
  | "checkbox"  // Boolean checkbox
  | "toggle"    // Boolean toggle switch
  | "array"     // Dynamic list of text items
  | "url"       // URL input with validation
  | "email"     // Email input with validation
  | "phone";    // Phone number input with validation
```

### Example Form Schema
```json
[
  {
    "id": "section-1",
    "title": "Company Information",
    "fields": [
      {
        "id": "field-1",
        "name": "Legal Business Name",
        "type": "text",
        "required": true
      },
      {
        "id": "field-2",
        "name": "Years in Business",
        "type": "number",
        "required": true
      },
      {
        "id": "field-3",
        "name": "Company Website",
        "type": "url",
        "required": false
      }
    ]
  },
  {
    "id": "section-2",
    "title": "Capabilities",
    "fields": [
      {
        "id": "field-4",
        "name": "Primary Service Area",
        "type": "select",
        "options": ["Catering", "AV", "Florals", "Staffing"],
        "required": true
      },
      {
        "id": "field-5",
        "name": "Service Regions",
        "type": "array",
        "description": "List all cities/regions you serve"
      }
    ]
  }
]
```

---

## API Endpoints

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfi/forms` | List all templates |
| GET | `/api/rfi/forms/:id` | Get template by ID |
| POST | `/api/rfi/forms` | Create new template |
| PATCH | `/api/rfi/forms/:id` | Update template |
| DELETE | `/api/rfi/forms/:id` | Delete template |

### Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfi/requests` | List all requests |
| GET | `/api/rfi/requests/:id` | Get request with recipients |
| POST | `/api/rfi/requests` | Create new request |
| PATCH | `/api/rfi/requests/:id` | Update request details |
| DELETE | `/api/rfi/requests/:id` | Delete request |
| PATCH | `/api/rfi/requests/:id/form` | Update form schema |
| POST | `/api/rfi/requests/:id/send` | Send to all vendors |

### Vendors (Recipients)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rfi/requests/:id/vendors` | Add vendor to request |
| DELETE | `/api/rfi/requests/:id/vendors/:vendorId` | Remove vendor |

### Responses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfi/responses/:requestId` | Get all responses for request |

### Public (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfi/respond/:token` | Get form for vendor response |
| POST | `/api/rfi/respond/:token` | Submit vendor response |

---

## Frontend Pages

| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/rfis` | `rfis.tsx` | List view with tabs (Requests/Templates) | Yes |
| `/rfis/:id` | `rfi-detail.tsx` | Request detail with tabs (Overview/Vendors/Form/Responses) | Yes |
| `/rfis/:id/form` | `rfi-form-editor.tsx` | Full-page form builder | Yes |
| `/rfi/respond/:token` | `rfi-response.tsx` | Public vendor response form | No |

---

## TypeScript Types

```typescript
// Database types
export type RfiForm = typeof rfiForms.$inferSelect;
export type RfiRequest = typeof rfiRequests.$inferSelect;
export type RfiRecipient = typeof rfiRecipients.$inferSelect;
export type RfiResponse = typeof rfiResponses.$inferSelect;

// Insert schemas (auto-generated fields omitted)
export type InsertRfiForm = z.infer<typeof insertRfiFormSchema>;
export type InsertRfiRequest = z.infer<typeof insertRfiRequestSchema>;
export type InsertRfiRecipient = z.infer<typeof insertRfiRecipientSchema>;
export type InsertRfiResponse = z.infer<typeof insertRfiResponseSchema>;

// API response types
interface RfiRequestResponse {
  request: RfiRequest;
  recipients: (RfiRecipient & { 
    vendor: Vendor & { services?: VendorService[] } 
  })[];
}

interface RfiResponseData {
  request: {
    id: number;
    title: string;
    description: string;
    formSchema: FormSection[];
    dueDate: string | null;
  };
  recipient: {
    id: number;
    vendorId: number;
    token: string;
  };
  vendor: {
    id: number;
    businessName: string;
  };
  existingResponse: Record<string, any> | null;
}
```

---

## Entity Relationship Diagram

```
┌──────────────┐
│    users     │
└──────┬───────┘
       │ createdById
       ▼
┌──────────────┐         ┌──────────────┐
│  rfi_forms   │────────►│ rfi_requests │
│  (templates) │ formId  └──────┬───────┘
└──────────────┘                │
                                │ requestId
                                ▼
┌──────────────┐         ┌──────────────┐
│   vendors    │◄────────┤rfi_recipients│
└──────────────┘ vendorId└──────┬───────┘
                                │
                                │ recipientId
                                ▼
                         ┌──────────────┐
                         │rfi_responses │
                         └──────────────┘
```

---

## Key Features

1. **Reusable Templates** - Save form structures for repeated use
2. **Per-Request Customization** - Modify form schema per request without affecting template
3. **Tokenized Distribution** - Unique URL per vendor, no login required
4. **Dynamic Form Builder** - Drag-and-drop sections and fields with dnd-kit
5. **Multiple Field Types** - 11 input types with validation
6. **Response Tracking** - Status per vendor (Pending/Responded)
7. **Due Date Support** - Optional deadline for responses
8. **Form Locking** - Form becomes read-only after sending
9. **Inline Vendor Selection** - Autocomplete search to add vendors
10. **Response Editing** - Vendors can update their response before deadline

---

## Validation

### Dynamic Schema Generation
The response form dynamically generates Zod validation schemas from the form structure:

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
        case 'url':
          fieldSchema = z.string().url();
          break;
        // ... other types
      }

      schemaFields[field.id] = fieldSchema;
    });
  });

  return z.object(schemaFields);
}
```
