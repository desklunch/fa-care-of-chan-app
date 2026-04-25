# Deal Summary Template Tokens

When a deal summary is generated from a Google Sheets template, the template
can contain `{{token}}` placeholders that are replaced with deal data in the
generated copy. The original template is never modified.

## Intake field tokens

Reference the value of an individual intake response by combining the
template's `namespace` with the field's `id`:

```
{{intake:<namespace>:<field-id>}}
```

For example, the `Event Concept` field of a template with namespace
`event-intake` is referenced as `{{intake:event-intake:field-event-concept}}`.

Notes:

- Each form template owns a unique, immutable `namespace` (slug). Sections
  copied into a deal's intake snapshot remember the namespace they came from,
  so tokens keep resolving even if the source template is later renamed or
  edited.
- When multiple templates have been merged into the same intake, every field
  is addressed through its template's namespace, so identical field ids in
  different templates never collide.
- Sections that pre-date namespaces (or that were authored ad-hoc on a deal)
  fall back to the reserved namespace `custom`, e.g.
  `{{intake:custom:field-notes}}`.
- A copy-token button is shown next to every field in the form builder and on
  a deal's intake — use it to grab the exact token without typing.

## Block tokens

### `{{intake_fields}}`

Expands into one row per intake response, grouped by section. Section rows are
written in the cell's column and merged across two columns. Field rows put the
field label in the same column as the token and the field's value in the next
column. If the block token cell sits inline with other content in the same
cell, the literal token is left in place and a warning is logged.

## Style tokens

Style tokens let template authors control how the cells produced by
`{{intake_fields}}` look without any per-deal styling living in the database.
Place any of the tokens below in a cell of the template, format that cell the
way you want each kind of cell to look (bold, font, size, color, background,
alignment, wrap, borders, number format, etc.), and the generator copies that
cell's `userEnteredFormat` onto every matching cell it produces.

| Token                          | Applies to                                       |
| ------------------------------ | ------------------------------------------------ |
| `{{style:intake-section}}`     | Each section header row from `{{intake_fields}}` |
| `{{style:intake-field-label}}` | Every field label cell in the intake block       |
| `{{style:intake-field-value}}` | Every field value cell in the intake block       |

Notes:

- The cell's own formatting is what gets copied; only the cell's `{{style:…}}`
  text matters for routing.
- A style token cell is only treated as such when its entire content matches
  one of the tokens above. Mixing other text or other tokens into the same
  cell turns it back into a regular token cell.
- In the generated copy, the literal `{{style:…}}` text is cleared, and any
  formatting on those cells is left in place.
- If a token is missing from the template, that kind of cell falls back to the
  template's existing formatting (no formatting request is sent).
- If the same style token appears more than once, the first occurrence wins
  and a warning is logged for the others.
- Rich-text formatting that comes from a richtext field's value still renders
  on top of the cell-level format.
- Re-running the generator produces consistent results because the original
  template is never modified — only the per-deal copy.
