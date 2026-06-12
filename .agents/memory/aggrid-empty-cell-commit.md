---
name: AG Grid 34 empty-cell edit commit
description: Why custom popup cell editors fail to save when a cell starts null/empty, and the reliable fix.
---

# AG Grid 34 custom cell editors don't commit when the cell starts null/empty

AG Grid v34 uses a pending-value edit model (`sourceValue` vs `pendingValue`). A
custom cell editor that only implements `getValue()` (no per-keystroke value
reporting — and v34's `ICellEditorParams` has **no** `onValueChange` callback to
report one) leaves `pendingValue === UNEDITED` the whole time.

On `stopEditing()`, AG Grid's commit loop branches on whether `sourceValue` is
truthy. When the cell started with a **falsy** value (`null` / `""`), the cell is
filtered out of the commit loop and `getValue()` is **never called**, so
`onCellValueChanged` never fires and no save happens. A cell that starts with a
truthy value takes the other branch and commits normally — which is why "edit a
non-empty field" works but "fill an empty field" silently fails.

**Fix:** in the editor's save handler, after calling `api.stopEditing()`, also
call `node.setDataValue(field, value)`. `RowNode.setDataValue` goes straight
through the value service and fires `cellValueChanged` independent of the edit
model, so it commits the null→value case. It is a no-op when `stopEditing`
already committed (non-empty edits and clear-to-empty), so exactly one
`onCellValueChanged` fires in every case — no double PATCH.

**Why:** `getValue()` returning the correct value is not enough; the bug is in
AG Grid's commit gate, not in value retrieval. Don't waste time instrumenting
`getValue` — if it isn't being logged on save, the cell was filtered out.

**How to apply:** any custom `ICellEditor` (e.g. the rich-text popup editor for
deal `concept` / `nextSteps`) used on fields that can start empty needs the
post-`stopEditing` `setDataValue` commit. The grid's `onCellValueChanged` handler
should still convert `""` → `null` for nullable text fields.
