# Universal Utilities Guide

> **Required reading** before adding a new entity-agnostic feature
> (Entity Tasks, Entity Links, Drive Attachments, etc.) **or** wiring an
> existing universal utility into a new entity (e.g. adding Entity Tasks
> to Vendors).

## What & Why

A **universal utility** is a feature that attaches behavior or data to
multiple kinds of parent entities — deals, proposals, venues, clients,
vendors, contacts, etc. — without each parent having to re-implement it.

Today we have two utilities of this kind in production and a third
about to land:

| Utility           | Code                                          | Parents (today)                              |
| ----------------- | --------------------------------------------- | -------------------------------------------- |
| Entity Tasks      | `server/domains/entity-tasks/`                | `deal`, `proposal`                           |
| Entity Links      | `server/domains/entity-links/`                | `deal`, `proposal_task`, `entity_task`       |
| Drive Attachments | `server/domains/drive-attachments/`           | `deal`, `venue`, `client`, `vendor`, `contact` |

Without a shared pattern, each utility re-invents schema shape, route
shape, permission resolution, audit logging, and frontend wiring. Task
#124 (Entity Tasks + Entity Links) settled most of the conventions; this
document captures them so the next universal utility (universal Drive
attachments) — and every one after it — follows the same playbook.

A universal utility is **not** the same as a domain feature. A domain
feature (e.g. `deals`, `venues`) owns its own table, business logic, and
routes. A universal utility attaches to a domain entity through
polymorphic columns and reuses that entity's permissions and identity.

---

## 1. Schema pattern

Every universal utility table uses a polymorphic parent reference:

```ts
entityType: varchar("entity_type", { length: 50 }).notNull(),
entityId: varchar("entity_id").notNull(),
```

Concrete examples:

- `entity_tasks` — `shared/schema.ts` lines ~916–943
- `entity_links` — `shared/schema.ts` lines ~1296–1314
- `google_drive_attachments` — `shared/schema.ts` lines ~1380–1398

### Allowed entity types

Each utility currently exports its own const tuple + Zod-style enum:

- `entityTaskEntityTypes = ["deal", "proposal"]`
- `entityLinkEntityTypes = ["deal", "proposal_task", "entity_task"]`
- `driveAttachmentEntityTypes = ["deal", "venue", "client", "vendor", "contact"]`

This is a known divergence — see *Shared Entity Registry* below.

### Indexing

Always include a composite index on `(entity_type, entity_id)` — every
read path is "give me everything for this parent":

```ts
index("idx_<table>_entity").on(table.entityType, table.entityId),
```

Add secondary indexes only for the fields you actually query/sort by
(`createdById`, `status`, `dueDate`, `parentTaskId`).

### No FK to the parent

We deliberately do **not** add a foreign key from
`entity_tasks.entity_id` → `deals.id` (or any other parent). Reasons:

1. The column is polymorphic; a single FK can't target multiple tables.
2. It lets us add new parent types by editing the registry only — no
   schema migration per parent.
3. Orphan cleanup happens via a delete listener on `domainEvents` (e.g.
   on `deal:deleted`), not via cascade. This keeps cross-domain coupling
   in code where it can be tested, not in schema.

### Validation schemas

Zod schemas live next to the table in `shared/schema.ts`:

- `insertEntityTaskSchema`, `updateEntityTaskSchema`
- `insertEntityLinkSchema`
- `insertGoogleDriveAttachmentSchema`

Routes import them. Don't write ad-hoc validation in `*.service.ts` for
shape — only for cross-field business rules.

---

## 2. Backend module shape

Each utility lives at `server/domains/<utility>/` with these files:

```
server/domains/<utility>/
  <utility>.routes.ts     // Express route handlers
  <utility>.storage.ts    // Drizzle queries (no business logic)
  <utility>.service.ts    // Optional: business logic, validation, events
  index.ts                // re-export registerXxxRoutes()
```

References:

- `server/domains/entity-tasks/` — has all four files
- `server/domains/entity-links/` — has all four files
- `server/domains/drive-attachments/` — currently has only `routes.ts` +
  `storage.ts` + `index.ts`. New utilities should add a service file as
  soon as they have any non-trivial logic (preview unfurl, permission
  resolution, event emission, etc.).

### Registration

Each module exports `registerXxxRoutes(app)` and is wired into
`server/routes.ts`:

```ts
// server/routes.ts (~lines 70–137)
import { registerDriveAttachmentsRoutes } from "./domains/drive-attachments";
import { registerEntityLinksRoutes } from "./domains/entity-links";
import { registerEntityTasksRoutes } from "./domains/entity-tasks";

registerDriveAttachmentsRoutes(app);
registerEntityLinksRoutes(app);
registerEntityTasksRoutes(app);
```

---

## 3. Route shape

### The convention going forward

Use **path params** for `entityType` + `entityId`:

```
GET    /api/<utility>/:entityType/:entityId
POST   /api/<utility>/:entityType/:entityId
PATCH  /api/<utility>/:entityType/:entityId/:itemId
DELETE /api/<utility>/:entityType/:entityId/:itemId
```

Why: the parent (`entityType`, `entityId`) is part of the resource's
identity, not a filter. Path params make permission middleware trivial,
eliminate `?entityType=&entityId=` query-string boilerplate, and make
log lines self-documenting.

Live examples:

- Entity Links — `entity-links.routes.ts`:
  - `GET    /api/entity-links/:entityType/:entityId`
  - `POST   /api/entity-links/:entityType/:entityId`
  - `DELETE /api/entity-links/:entityType/:entityId/:linkId`
- Drive Attachments — `drive-attachments.routes.ts`:
  - `GET    /api/drive-attachments/:entityType/:entityId`
  - `POST   /api/drive-attachments` (entityType/entityId in body — see below)
  - `DELETE /api/drive-attachments/:id`

### Inconsistencies (current state)

- **Entity Tasks** uses **query params** (`?entityType=&entityId=`)
  on collection routes and `:taskId`-only on item routes
  (`entity-tasks.routes.ts`). Should be migrated to the path-param
  convention when convenient.
- **Drive Attachments POST** still takes `entityType`/`entityId` in
  the body and DELETE uses `:id` only (no parent in path). Should also
  be migrated.

New utilities **must** start with the path-param convention. Migrations
of the old utilities can be done incrementally (add the new shape,
deprecate the old, delete after callers are updated).

---

## 4. Permissions

Universal utilities **never define their own permissions**. They reuse
the parent entity's permissions:

| Parent      | Read              | Write              | Delete              |
| ----------- | ----------------- | ------------------ | ------------------- |
| `deal`      | `deals.read`      | `deals.write`      | `deals.delete`      |
| `proposal`  | `proposals.read`  | `proposals.write`  | `proposals.delete`  |
| `venue`     | `venues.read`     | `venues.write`     | `venues.delete`     |
| `client`    | `clients.read`    | `clients.write`    | `clients.delete`    |
| `vendor`    | `vendors.read`    | `vendors.write`    | `vendors.delete`    |
| `contact`   | `contacts.read`   | `contacts.write`   | `contacts.delete`   |

The `entityType` → permission-prefix mapping is currently re-implemented
in each utility. See:

- `entity-tasks.routes.ts` `getPermissionPrefix()` (lines 10–19)
- `entity-links.service.ts` `getPermissionPrefix()` (lines 11–22)
- `drive-attachments.routes.ts` `ATTACHMENT_*_PERMISSIONS` records
  (lines 12–26)

### Target end-state

Add a single shared helper:

```ts
// shared/entity-types.ts (proposed)
export function getEntityPermissionPrefix(entityType: string): string;
```

Mapping: `deal` → `deals`, `proposal` → `proposals`,
`venue` → `venues`, `client` → `clients`, `vendor` → `vendors`,
`contact` → `contacts`. Falls back to `entityType` itself.

Every universal utility imports and uses this helper. No utility
defines its own switch.

### Special case: nested parents

Entity Links can hang off an `entity_task`. When that happens, the
permission must resolve to the *grandparent* (the deal/proposal that
owns the task). See
`entity-links.service.ts` → `getEntityTaskPermissionPrefix()` (lines
24–28).

The shared helper should expose a small extension hook for this kind of
"resolve to grandparent" case rather than letting every utility roll
its own DB lookup.

### Delete-own vs. delete-any

Most utilities allow **the creator** to delete their own item, plus
anyone with the parent's `*.delete` permission to delete any item.
See `entity-links.service.ts` (`deleteLink`, lines 134–155) and
`drive-attachments.routes.ts` DELETE handler (lines 161–197 — uses
admin role check; should be standardized to the `*.delete` permission
pattern).

---

## 5. Audit & events

### Prefer `domainEvents` + the audit bridge

`server/lib/events.ts` exposes `domainEvents.emit(...)`.
`server/lib/audit-bridge.ts` (initialized once in `server/routes.ts`
via `initializeAuditBridge()`) listens for these events and persists
them to `audit_logs`.

Entity Tasks and Entity Links both use this pattern:

```ts
// entity-links.service.ts (createLink)
domainEvents.emit({
  type: "entity_link:created",
  linkId: link.id,
  entityType,
  entityId,
  url: parsedUrl.href,
  actorId,
  timestamp: new Date(),
});
```

```ts
// entity-tasks.service.ts (createTask)
domainEvents.emit({
  type: "entity_task:created",
  taskId: task.id,
  taskName: task.name,
  entityType: task.entityType,
  entityId: task.entityId,
  actorId,
  timestamp: new Date(),
});
```

### Avoid manual `logAuditEvent()`

Drive Attachments still calls `logAuditEvent()` directly inside the
route handler (`drive-attachments.routes.ts` lines 139–157, 185–197).
This works but bypasses the unified event pipeline (notification rules,
future webhooks, etc.). New utilities should emit a domain event and
let the bridge log.

### Event naming convention

`<utility>.<action>` using the canonical action verbs:

```
<utility>.created
<utility>.updated
<utility>.deleted
<utility>.<custom>   // e.g. entity_task.completed, entity_task.collaborator_added
```

Event types live in `server/lib/event-registry.ts`. Listeners
(notifications, audit bridge, downstream domains) live in their own
domain modules and subscribe via `domainEvents.on(...)`.

---

## 6. Frontend integration

### One component, two props

Every universal utility ships **one** React component that takes
`entityType` and `entityId`:

```tsx
<EntityTaskGrid entityType="deal" entityId={deal.id} canWrite={canWrite} />
<EntityLinksPanel entityType="proposal" entityId={proposal.id} canWrite />
<GoogleDriveAttachments entityType="vendor" entityId={vendor.id} />
```

Files:

- `client/src/components/entity-task-grid.tsx`
- `client/src/components/entity-links-panel.tsx`
- `client/src/components/google-drive-attachments.tsx`

The component owns the entire experience for that utility — list,
empty state, create form, item rows, delete confirmation. Detail pages
just drop it in.

### React Query keys

Always include `entityType` and `entityId` as separate array segments
so caches partition cleanly per parent:

```ts
queryKey: ["/api/entity-links", entityType, entityId]
queryKey: ["/api/drive-attachments", entityType, entityId]
queryKey: ["/api/entity-tasks", entityType, entityId]
```

### Mutation invalidation

After every create/update/delete:

```ts
queryClient.invalidateQueries({
  queryKey: ["/api/<utility>", entityType, entityId],
});
```

Don't pass a templated path string as the cache segment — that breaks
hierarchical invalidation.

### Permission gating

The component receives a `canWrite` (and optionally `canDelete`) prop
from the parent page, which derives it from `usePermissions()` against
the *parent's* permission prefix. Don't have the universal component
reach into permissions itself based on `entityType` — keep that mapping
in one place (the shared helper in §4).

---

## 7. Shared Entity Registry (proposed)

### Problem today

Three utilities, three independent enums of "which entity types are
supported", three independent permission-prefix switches, and no single
place that says "here are all the parent entities the system knows
about and how to address them."

### Proposed location & shape

Create `shared/entity-types.ts`:

```ts
export const ENTITY_TYPES = [
  "deal",
  "proposal",
  "venue",
  "client",
  "vendor",
  "contact",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const entityTypeSchema = z.enum(ENTITY_TYPES);

export interface EntityMetadata {
  displayName: string;       // "Deal", "Proposal"
  permissionPrefix: string;  // "deals", "proposals"
  routeBase: string;         // "/deals", "/proposals"
  iconName: string;          // lucide icon name
}

export const ENTITY_METADATA: Record<EntityType, EntityMetadata> = {
  deal:     { displayName: "Deal",     permissionPrefix: "deals",     routeBase: "/deals",     iconName: "Briefcase" },
  proposal: { displayName: "Proposal", permissionPrefix: "proposals", routeBase: "/proposals", iconName: "FileText"  },
  venue:    { displayName: "Venue",    permissionPrefix: "venues",    routeBase: "/venues",    iconName: "Building"  },
  client:   { displayName: "Client",   permissionPrefix: "clients",   routeBase: "/clients",   iconName: "Building2" },
  vendor:   { displayName: "Vendor",   permissionPrefix: "vendors",   routeBase: "/vendors",   iconName: "Truck"     },
  contact:  { displayName: "Contact",  permissionPrefix: "contacts",  routeBase: "/contacts",  iconName: "User"      },
};

export function getEntityPermissionPrefix(entityType: string): string {
  return ENTITY_METADATA[entityType as EntityType]?.permissionPrefix ?? entityType;
}
```

### Migration path

1. Land `shared/entity-types.ts` with the registry above.
2. New universal utilities import it from day one.
3. For each existing utility, replace its private enum and its private
   `getPermissionPrefix()` with imports from the registry. Keep the
   per-utility enum as a *narrower* subset where needed (e.g. Entity
   Tasks may only support `deal` + `proposal`):
   ```ts
   export const entityTaskEntityTypes = ["deal", "proposal"]
     as const satisfies readonly EntityType[];
   ```
4. Sub-entities like `entity_task` and `proposal_task` are *not* in the
   registry — they're internal. The shared helper has a separate
   "resolve to grandparent" extension hook for them (§4).

### Current state

Not yet implemented. This guide specifies it; a follow-up task
implements it.

---

## 8. Inconsistencies to fix

A consolidated list of where the current code diverges from the target
end-state above. None of these should be fixed as part of writing this
guide; they're called out so future refactors have a clear target.

| # | Area               | Divergence                                                                                                            | Target                                                          |
| - | ------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1 | Route param style  | Entity Tasks uses `?entityType&entityId` query params; Drive Attachments DELETE uses `:id` without parent in path.    | All utilities use `/api/<utility>/:entityType/:entityId[/:id]`. |
| 2 | Permission helper  | Each utility defines its own `entityType → prefix` switch.                                                            | Single `getEntityPermissionPrefix()` in `shared/entity-types.ts`. |
| 3 | Audit logging      | Drive Attachments calls `logAuditEvent()` directly in route handlers.                                                 | Emit `domainEvents`; let the audit bridge persist.              |
| 4 | Service layer      | Drive Attachments has no `*.service.ts`; logic sits in routes.                                                        | Routes thin; domain logic in `*.service.ts`.                    |
| 5 | Validation         | Drive Attachments has its `createAttachmentSchema` defined inside the routes file, not next to the table.             | Zod schemas live in `shared/schema.ts` next to the table.       |
| 6 | Entity-type enum   | Three independent enums.                                                                                              | One registry in `shared/entity-types.ts`; utilities narrow it.  |
| 7 | Delete-any policy  | Drive Attachments checks `user.role === "admin"`; others check `*.delete` permission.                                 | All utilities check the parent's `*.delete` permission.         |
| 8 | Nested-parent perm | Entity Links has bespoke "if parent is `entity_task`, resolve to its parent" logic.                                   | Shared helper exposes a small "resolve grandparent" hook.       |

---

## 9. Checklist — Authoring a new universal utility

1. **Schema** (`shared/schema.ts`)
   - [ ] Add table with `entity_type` + `entity_id` columns, no FK to
         parent, plus whatever payload columns you need.
   - [ ] Composite index on `(entity_type, entity_id)`. Secondary
         indexes only for fields you actually filter/sort by.
   - [ ] Export `*EntityTypes` tuple (narrowed from the registry once it
         exists), Drizzle types (`$inferSelect`, `$inferInsert`), and
         `insert*Schema` / `update*Schema` Zod schemas.

2. **Storage** (`server/domains/<utility>/<utility>.storage.ts`)
   - [ ] Drizzle queries only. No validation, no permission checks, no
         events.
   - [ ] Methods named `getByEntity(entityType, entityId)`, `getById`,
         `create`, `update`, `delete`.

3. **Service** (`server/domains/<utility>/<utility>.service.ts`)
   - [ ] Imports Zod schemas from `@shared/schema` and parses there.
   - [ ] Verifies parent entity exists (helper that switches on
         `entityType`, until a registry-backed verifier lands).
   - [ ] Emits `domainEvents` on every create/update/delete with the
         `<utility>.<action>` naming convention.

4. **Routes** (`server/domains/<utility>/<utility>.routes.ts`)
   - [ ] `GET/POST /api/<utility>/:entityType/:entityId`
   - [ ] `PATCH/DELETE /api/<utility>/:entityType/:entityId/:itemId`
   - [ ] Use `isAuthenticated` + `loadPermissions` middleware.
   - [ ] Permission check via the shared
         `getEntityPermissionPrefix(entityType)` + `checkPermission`.
   - [ ] Routes are thin: parse params → permission check →
         `service.x(...)` → respond.

5. **Index** (`server/domains/<utility>/index.ts`)
   - [ ] Re-export `registerXxxRoutes`.

6. **Registration** (`server/routes.ts`)
   - [ ] Import and call `registerXxxRoutes(app)` alongside the others.

7. **Frontend component**
   (`client/src/components/<utility>-panel.tsx` or similar)
   - [ ] Props: `{ entityType: string; entityId: string; canWrite?: boolean }`.
   - [ ] Query key: `["/api/<utility>", entityType, entityId]`.
   - [ ] Mutations call `queryClient.invalidateQueries` with the same key.
   - [ ] Uses `apiRequest` for POST/PATCH/DELETE; default fetcher for GET.

8. **Wire-in** (per parent entity that needs the utility)
   - [ ] Drop the component into the parent's detail page, passing
         `entityType="<parent>"` and the parent's id.
   - [ ] Confirm the parent's `*.read` / `*.write` / `*.delete`
         permissions exist; create them if not.

9. **Documentation**
   - [ ] Add a one-line entry to `replit.md` under Domain-Based Modules
         describing the new utility and its supported parents.

---

## 10. Checklist — Adding an existing utility to a new entity

1. [ ] Extend the utility's allowed-entities tuple in `shared/schema.ts`
       (e.g. add `"vendor"` to `entityTaskEntityTypes`). Once the shared
       registry lands, also confirm the new entity is in
       `ENTITY_TYPES`.
2. [ ] Confirm the new parent has `*.read`, `*.write`, `*.delete`
       permissions defined in `shared/permissions.ts` and assigned to
       the right tier(s).
3. [ ] If the utility hard-codes a `getPermissionPrefix()` switch, add
       the new entity there. (Or migrate it to the shared helper.)
4. [ ] If the utility has a parent-existence check
       (`verifyEntityExists`), extend it to query the new parent table.
5. [ ] If the utility renders parent display names (e.g. Entity Tasks
       shows the deal/proposal name), extend its `resolveEntityNames`
       helper to query the new parent.
6. [ ] Drop the utility's frontend component into the new parent's
       detail page with the right `entityType` / `entityId` / `canWrite`
       props.
7. [ ] Smoke test: as a user with the parent's `*.write` permission,
       verify create / update / delete works end-to-end. As a viewer,
       verify read-only.
8. [ ] Update `replit.md` to reflect the new parent in the utility's
       supported list.

---

## 11. Worked example — Universal Drive Attachments

The next task takes today's Drive Attachments and brings it up to the
universal pattern above. Mapping (no code, just the plan):

- **Schema**: `google_drive_attachments` already polymorphic. Narrow
  `driveAttachmentEntityTypes` to be `as const satisfies readonly
  EntityType[]` once the shared registry exists. Move
  `createAttachmentSchema` from the routes file into `shared/schema.ts`
  next to the table (Inconsistency #5).
- **Routes**: introduce
  `GET/POST /api/drive-attachments/:entityType/:entityId` and
  `DELETE /api/drive-attachments/:entityType/:entityId/:id`
  (Inconsistency #1). Keep the legacy shape temporarily; remove after
  callers are updated.
- **Permissions**: replace `ATTACHMENT_READ_PERMISSIONS` /
  `ATTACHMENT_WRITE_PERMISSIONS` records with the shared
  `getEntityPermissionPrefix()` (Inconsistency #2). Switch the
  delete-any check from `user.role === "admin"` to
  `<prefix>.delete` permission (Inconsistency #7).
- **Service**: extract `drive-attachments.service.ts` from the route
  file (Inconsistency #4). Move metadata-fetch + audit-event emission
  into the service.
- **Audit**: emit `drive_attachment.created` /
  `drive_attachment.deleted` via `domainEvents` instead of calling
  `logAuditEvent()` from the route (Inconsistency #3). Register listeners
  on the audit bridge if any new event types are added to
  `event-registry.ts`.
- **Frontend**: `GoogleDriveAttachments` already takes
  `entityType` + `entityId`. Switch its query key to
  `["/api/drive-attachments", entityType, entityId]` (it currently is
  shaped this way — keep it). Update the create mutation to POST to
  the new path-param URL once the new shape is live, and update the
  delete mutation to use the new `:entityType/:entityId/:id` URL.
- **Wire-in**: any new parent (e.g. proposals) → extend
  `driveAttachmentEntityTypes`, follow the §10 checklist.

When that work lands, this section can be replaced with a short
"see `server/domains/drive-attachments/`" pointer; the value of the
worked example is in showing how every section above maps to a real
upcoming change.
