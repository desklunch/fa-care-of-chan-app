# Field System Rollout Proposal

> **Status:** Draft proposal for review. The Phase A/B prototype branch
> (Task #288, #289) validated the architecture in a contained slice and is
> being discarded so we can plan the app-wide rollout with more rigor
> before committing to it.
>
> This document supersedes `docs/field-system-architecture.md` for
> planning purposes. That doc remains as a historical reference for what
> the prototype actually shipped.

---

## Part 1 — Proposal

### 1. Why we're doing this

`client/src/components/inline-edit/editable-field.tsx` is a 1,319-line
god component that collapses three concerns into one per-type widget:

- the **input UI** (text box, multiselect, segmented date, etc.),
- the **editing UX** (hover affordance, view↔edit toggle, Save/Cancel,
  mobile bottom-sheet overlay, loading spinner),
- the **validation rules** (per-type format checks, required-ness,
  custom callbacks).

That coupling has two concrete costs:

1. **Forms can't reuse the per-type input UI** without dragging in the
   inline-edit hover/save behavior. Every form page ends up
   reimplementing phone/email/url inputs against shadcn `<Input>` and
   re-deriving its own validators.
2. **The shell can't evolve** (e.g. a new permission gate, a different
   mobile pattern, a different save UX) without re-touching every
   per-type branch inside the 1,319-line file.

The fix is a three-layer split: pure controlled editors at the bottom,
two thin shells on top (one for inline-edit, one for forms) sharing a
single per-type registry.

### 2. What the prototype proved

The discarded branch built the full three layers and migrated one
detail page (`contact-detail`) and one form page (`contact-form`) to
the new shells. Validated:

- **The three-layer split holds.** Pure editors with
  `{ value, onChange, error?, disabled? }` are small (50–200 lines
  each), testable in isolation, and reusable across both shells.
- **The registry is the right seam.** A single `FieldTypeDefinition`
  per type — editor, view, value shape, isEmpty, optional Zod schema,
  optional imperative validator — powers both shells with no
  duplication.
- **Zod fragments compose cleanly into entity schemas.** `emailSchema`
  / `phoneSchema` / `urlSchema` exported from the inline-field package
  drop straight into a form's `z.object({...})` without adapter code.
- **`<TypedField>` collapses form boilerplate dramatically.** The
  contact form went from ~12 lines per row (`<FormField>` + `<Input>` +
  `<FormMessage>` + local-state hack for arrays) to one line:
  `<TypedField name="email" label="Email" type="email" />`.

### 3. What the prototype surfaced as friction

Things we'd want to design around before the app-wide rollout, not
discover for the second time mid-migration:

- **Enter-key handling differs between shells.** Inline shell wants
  Enter to commit and prevent default; forms want Enter to fall through
  to native submit. The prototype solved it with a conditional
  `onSubmit?: () => void` prop on editors — works, but it's a leaky
  coupling. Worth a deliberate decision on the contract.
- **`FieldRow` has no clear home.** It's used as a layout primitive by
  detail pages independent of `EditableField` (7 pages import it
  directly today). The prototype left it in `inline-edit/`, which means
  the directory can't be deleted until every `FieldRow` consumer is
  also dealt with. Decide upfront whether `FieldRow` is part of the new
  package, a layout primitive elsewhere, or replaced.
- **`EditableTitle` got skipped.** A separate 4-page consumer that
  shares the same coupling problem in miniature. Either fold it in or
  explicitly defer.
- **Prop-shape parity is a tax.** Mirroring `EditableField`'s
  `value` / `arrayValue` / `multiSelectValues` / `booleanValue` split
  made migrations mechanical but locked the new component into the old
  awkward API. Decide whether the rollout is a clean-break redesign or
  a parity-first port.
- **Switch-style label layout was deferred.** Boolean fields visually
  want `label ─── [switch]` on one row, not label-above-control. The
  first form with a boolean will rediscover this.
- **Side-by-side demo pages add migration debt.** The prototype
  cloned `contact-detail` to `contact-detail-demo` for safe rollout,
  which had to be deleted as part of the real migration. For 8 detail
  pages and 13 form pages, that's a lot of throwaway clones. Worth
  considering feature-flag / per-route gating instead.
- **First-consumer migrations are rarely complete.** The prototype
  migrated `contact-detail` off `EditableField` but it still imports
  `FieldRow` from `inline-edit/`. The rollout plan should distinguish
  "consumer of `EditableField`" from "consumer of `inline-edit/`" as
  separate exit criteria.

### 4. Consumer inventory (grounding the rollout)

Counted directly from the current codebase, excluding the prototype's
`inline-field/` and `form-field/` directories (which will be rebuilt):

**Detail pages using `EditableField` (4):**
`client-detail`, `deal-detail`, `vendor-detail`, `app-feature-detail`

**Detail pages using `FieldRow` (7, partially overlapping):**
`contact-detail`, `deal-detail`, `vendor-detail`, `app-feature-detail`,
`app-issue-detail`, `proposal-detail`, `team-profile`

**Pages using `EditableTitle` (4):**
`client-detail`, `deal-detail`, `vendor-detail`, `app-feature-detail`

**Form pages (`*-form.tsx`, 13):**
`contact-form`, `client-form`, `vendor-form`, `deal-form`,
`proposal-form`, `app-issue-form`, `app-feature-form`, `venue-form`,
`venue-collection-form`, `form-template-form`, `form-request-form`,
`vendor-update-form`, `public-form`

Net: **~17 distinct pages** are touched by the rollout (some appear in
multiple inventories). Plus any `form-builder` consumers in
`client/src/components/form-builder/` not yet audited.

### 5. Target architecture (distilled)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3a — <InlineField>           Layer 3b — <TypedField>      │
│ (hover-to-edit, save/cancel,       (react-hook-form adapter,    │
│  mobile overlay, validation         via useController, surfaces │
│  gating, view-mode rendering)       fieldState errors)          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2 — Registry (FieldTypeDefinition per type)               │
│ editor + view + valueShape + isEmpty + schema? + validate?       │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1 — Pure controlled editors & views                       │
│ EditorProps<T>: { value, onChange, error?, disabled?, ... }     │
│ ViewProps<T>:   { value, options?, className?, ... }            │
└─────────────────────────────────────────────────────────────────┘
```

Per-type coverage required: `text`, `textarea`, `select`, `date`,
`date-segmented`, `multiselect`, `switch`, `number`, `richtext`,
`phone`, `email`, `url`, plus a multi-row mode for typed-string arrays.

Schema fragments: `phoneSchema`, `emailSchema`, `urlSchema` — format-only,
nullable/empty-tolerant, composed into entity schemas by form pages.

### 6. Open design questions

These should be resolved (or explicitly deferred with a reason) before
implementation begins. Default proposals in italics.

1. **Prop-shape parity vs. clean redesign?** Mirror the existing
   `EditableField` API to keep migrations mechanical, or design the
   ideal API and absorb the migration cost?
   _Default: parity for v1, clean break in a v2 once everything is
   migrated. The prototype showed parity-port migrations are minutes,
   not hours._

2. **Where does `FieldRow` live?** Part of the new package, a separate
   layout primitive in `components/layout/`, or replaced inline?
   _Default: lift into the new package (`inline-field/field-row.tsx`)
   so the old `inline-edit/` directory can be deleted in one shot._

3. **Does `EditableTitle` fold in?** Same coupling, smaller surface (4
   pages, 1 type).
   _Default: yes, in the same rollout. Treat it as another registry
   entry (`type: "title"`) rendered by `<InlineField variant="title">`._

4. **Enter-key contract on editors?** Conditional `onSubmit?` prop, a
   context flag (`<InlineContext>` vs no context = form), or split
   editor variants?
   _Default: context flag. One editor implementation, behavior keyed
   off `useContext(InlineFieldContext) != null`. Less prop noise,
   harder to misuse._

5. **`useFieldArray` integration on day one?** The prototype's
   `<TypedField mode="multiple">` owns the whole array via
   `useController` — fine for add-to-end, breaks for reorder.
   _Default: defer. Build a `<TypedFieldArray>` companion only when a
   real form needs reorder._

6. **Required-ness: schema-driven or prop-driven?** Prop is a UI badge
   today, schema is the source of truth — drift risk.
   _Default: schema-driven, via a `FormProvider`-level context that
   exposes the resolver's Zod schema. Costs a small amount of
   introspection plumbing, eliminates a whole class of bug._

7. **`composeEntitySchema` helper from day one?** The prototype
   deferred it pending a second form.
   _Default: still defer. Two forms is the minimum signal; three is
   when patterns stabilize. Ship raw `z.object({...})` with imported
   fragments until then._

8. **Rollout per-page strategy: clone-and-swap or in-place migration?**
   Clones are safer but generate throwaway code.
   _Default: in-place migration behind a per-page feature flag (route
   query param or env var), removed when the page soaks for one release._

9. **What about `form-builder/`?** Not audited yet. May or may not be
   in scope.
   _Default: audit before Phase 0 ends. If it's a different problem
   domain (dynamic form definitions vs. static field declarations),
   defer indefinitely._

10. **Test strategy?** Per-editor unit tests, shell integration tests,
    or both?
    _Default: per-editor Vitest unit tests (value↔onChange round-trip,
    error rendering, validator agreement) at minimum. Shell tests are
    nice-to-have, added if a regression motivates them._

---

## Part 2 — Rollout Plan

Assumes the proposal above is accepted (with whatever amendments fall
out of review). Each phase has explicit entry and exit criteria so we
can pause between phases without losing context.

### Phase 0 — Foundation

**Goal:** Rebuild Layers 1–3 from scratch with the decisions from §6
baked in. Zero consumer changes.

**Scope:**
- `client/src/components/inline-field/` — registry, editors/, views,
  schemas/, validators, the `<InlineField>` shell, and `<FieldRow>` if
  decided per §6 Q2.
- `client/src/components/form-field/` — `<TypedField>` adapter.
- `inline-edit/` and all consumers untouched.
- Per-editor Vitest suites (§6 Q10).
- Audit `components/form-builder/` (§6 Q9) and document whether it's
  in or out of scope.

**Entry criteria:** §6 questions resolved (or explicitly deferred).

**Exit criteria:**
- All 13 per-type editors implemented with green unit tests.
- `<InlineField>` renders all types in a Storybook-ish demo route
  (kept under `/dev/` or behind an env gate, not a per-page clone).
- `<TypedField>` smoke-tested against a hand-rolled fixture form.
- No imports from `inline-edit/` into the new package.

**Rollback:** Delete the two new directories. Zero blast radius.

### Phase 1 — Proof in production

**Goal:** Migrate one detail page and one form page in-place to prove
the rollout pattern.

**Scope:**
- `contact-detail.tsx` migrated off `EditableField` _and_ `FieldRow`
  (full exit from `inline-edit/`, unlike the prototype's partial port).
- `contact-form.tsx` migrated to `<TypedField>`.
- Both migrations behind a per-page feature flag (§6 Q8).
- Visual diff review against the live pages.

**Entry criteria:** Phase 0 exit criteria met.

**Exit criteria:**
- Both pages run on the new components for one release cycle without
  regressions filed.
- Migration playbook documented (one `.md` describing the mechanical
  steps for porting a detail page and a form page).
- Feature flags removed.

**Rollback:** Toggle the feature flag. If permanently broken, revert
the two files.

### Phase 2 — Broad migration

**Goal:** Port the remaining detail pages and forms.

**Scope (detail pages, prioritized by `EditableField` _and_ `FieldRow`
exposure):**
1. `deal-detail` (EditableField + FieldRow + EditableTitle)
2. `vendor-detail` (EditableField + FieldRow + EditableTitle)
3. `app-feature-detail` (EditableField + FieldRow + EditableTitle)
4. `client-detail` (EditableField + EditableTitle)
5. `proposal-detail` (FieldRow only)
6. `team-profile` (FieldRow only)
7. `app-issue-detail` (FieldRow only)

**Scope (form pages, prioritized by surface size to flush out edge
cases early):**
1. `client-form` (closest shape to contact-form, low risk)
2. `vendor-form` (introduces multiselect-in-form pressure)
3. `deal-form` (date-heavy)
4. Remaining 9 form pages in any order

**Entry criteria:** Phase 1 exit criteria met and playbook holds up.

**Exit criteria:**
- No production page imports from `client/src/components/inline-edit/`.
- No production form imports shadcn `<FormField>` for any field type
  in the registry (one-offs like `<PlaceAutocomplete>` excepted and
  documented).
- §6 Q5 (`useFieldArray`) revisited based on what showed up in real
  forms.

**Rollback:** Per page. Each migration is one PR; revert that PR.

### Phase 3 — Cleanup

**Goal:** Delete the old surface, lock in the new one.

**Scope:**
- Delete `client/src/components/inline-edit/` (all files).
- Delete or fold `editable-title.tsx` per §6 Q3.
- Update `replit.md` system architecture section.
- Promote the migration playbook into the architecture doc.
- Per-type editor unit tests reviewed for coverage gaps now that
  every editor has real consumers.

**Entry criteria:** Phase 2 exit criteria met, plus one release cycle
of soak.

**Exit criteria:**
- `inline-edit/` directory gone.
- `grep -r 'inline-edit' client/` returns nothing.
- Architecture doc updated.

**Rollback:** Restore the deleted directory from git. Cheap because
nothing imports from it anymore.

### Phase 4 (optional) — v2 redesign

Only if §6 Q1 was answered "parity for v1, clean break in v2." Revisit
the public prop shape (`value` / `arrayValue` / `multiSelectValues` /
`booleanValue`), the Enter-key contract, and any other API smells that
accumulated. Migrate in place with a codemod or manual sweep.

---

## Part 3 — Risk register

| Risk                                                                 | Likelihood | Mitigation                                                                 |
| -------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| A detail page uses an `EditableField` config the registry can't model | Medium     | Audit all 8 detail pages in Phase 0; extend the registry, don't bypass it. |
| A form needs `useFieldArray` semantics before Phase 2 finishes        | Medium     | §6 Q5 default is "defer"; revisit after first 3 form migrations.           |
| Visual regression on hover affordance / mobile bottom-sheet           | Medium     | Visual diff review gate in Phase 1; pixel-diff tooling if affordable.      |
| `form-builder/` turns out to share field-rendering code               | Low–Medium | Audit in Phase 0 (§6 Q9). If yes, fold into rollout; if no, document.      |
| Permission gating (`canEdit`) drifts between old and new components   | Low        | Migrate `canEdit` semantics into the registry/shell contract in Phase 0.   |
| Rollout stalls between Phase 2 and Phase 3 (perpetual dual-system)    | High       | Phase 2 exit criterion is a hard "no `inline-edit/` imports" check.        |
| Bundle size regresses (richtext, phone editors loaded everywhere)     | Low        | Re-measure after Phase 2; lazy-load specific heavy editors if needed.      |

---

## Part 4 — Explicitly not on the roadmap

- A grand "form framework" abstraction over react-hook-form. The whole
  point of `<TypedField>` is to be thin — it's a wire, not a wrapper.
- Server-side permission enforcement changes. `canEdit` stays a
  client-side rendering hint.
- Migrating non-registry editors like `PlaceAutocomplete` to the new
  system. They stay on shadcn `<FormField>`.
- A unified inline-edit + form-edit shell. The two UX patterns are
  genuinely different; one shell would be worse than two thin ones.
