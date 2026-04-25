import { db } from "../db";
import { sql } from "drizzle-orm";
import { SEED_TEMPLATE_NAMESPACES } from "../domains/forms/forms.seed";
import {
  buildIntakeFieldKey,
  FORM_TEMPLATE_NAMESPACE_REGEX,
  RESERVED_FORM_TEMPLATE_NAMESPACE,
} from "@shared/schema";

// All namespace values that must NEVER be assigned to a real form template.
// `custom` is reserved for ad-hoc/non-templated sections.
const RESERVED_NAMESPACES: ReadonlySet<string> = new Set([
  RESERVED_FORM_TEMPLATE_NAMESPACE,
]);

function isReservedNamespace(candidate: string): boolean {
  return RESERVED_NAMESPACES.has(candidate);
}

function slugifyNamespace(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "template";
}

async function ensureUniqueNamespace(
  base: string,
  takenIds: Set<string>,
  takenNamespaces: Set<string>,
  templateId: string,
): Promise<string> {
  // Normalize the base candidate. If it is reserved, fails the regex,
  // or slugifies to a reserved value, escape to a deterministic
  // template-specific fallback that is guaranteed not to be reserved.
  let candidate = base;
  if (
    isReservedNamespace(candidate) ||
    !FORM_TEMPLATE_NAMESPACE_REGEX.test(candidate)
  ) {
    candidate = slugifyNamespace(base);
  }
  if (isReservedNamespace(candidate) || !FORM_TEMPLATE_NAMESPACE_REGEX.test(candidate)) {
    candidate = `template-${templateId.slice(0, 8)}`;
  }

  // Suffix until unique AND non-reserved. Defensively re-check reserved
  // status at each suffix iteration so we never hand back a reserved value.
  let unique = candidate;
  let suffix = 2;
  while (takenNamespaces.has(unique) || isReservedNamespace(unique)) {
    unique = `${candidate}-${suffix}`;
    suffix++;
  }

  // Final safety assertion: refuse to return a reserved namespace.
  if (isReservedNamespace(unique)) {
    throw new Error(
      `[form-template-namespaces migration] Refusing to assign reserved namespace '${unique}' to template ${templateId}`,
    );
  }

  takenNamespaces.add(unique);
  takenIds.add(templateId);
  return unique;
}

export async function migrateFormTemplateNamespaces(): Promise<void> {
  console.log("[form-template-namespaces migration] Starting idempotent migration...");

  // 1. Ensure column exists (nullable for backfill)
  await db.execute(sql`
    ALTER TABLE form_templates
    ADD COLUMN IF NOT EXISTS namespace VARCHAR(100)
  `);

  // 2. Backfill any rows that don't have a namespace yet.
  //    Also rewrite any pre-existing rows that somehow ended up with a
  //    reserved namespace (e.g. 'custom') BEFORE we apply the UNIQUE
  //    constraint and seed runs.
  const rows = await db.execute<{ id: string; name: string; namespace: string | null }>(
    sql`SELECT id, name, namespace FROM form_templates`,
  );

  const takenNamespaces = new Set<string>();
  const reservedRows: { id: string; name: string }[] = [];
  for (const row of rows.rows) {
    if (row.namespace && row.namespace.trim().length > 0) {
      if (isReservedNamespace(row.namespace)) {
        // Will be rewritten below — do NOT mark as taken.
        reservedRows.push({ id: row.id, name: row.name });
      } else {
        takenNamespaces.add(row.namespace);
      }
    }
  }

  const updatedIds = new Set<string>();

  // 2a. Rewrite reserved-namespace templates first so they never collide
  //     with ad-hoc sections that emit `intake:custom:<fieldId>`.
  for (const row of reservedRows) {
    const seedNs = SEED_TEMPLATE_NAMESPACES[row.id];
    const base = seedNs ?? slugifyNamespace(row.name);
    const ns = await ensureUniqueNamespace(base, updatedIds, takenNamespaces, row.id);
    await db.execute(
      sql`UPDATE form_templates SET namespace = ${ns} WHERE id = ${row.id}`,
    );
    console.warn(
      `[form-template-namespaces migration] Rewrote reserved namespace on template ${row.id} (${row.name}) -> ${ns}`,
    );
  }

  // 2b. Backfill rows that have no namespace at all.
  for (const row of rows.rows) {
    if (row.namespace && row.namespace.trim().length > 0 && !isReservedNamespace(row.namespace)) continue;
    if (reservedRows.some((r) => r.id === row.id)) continue;
    const seedNs = SEED_TEMPLATE_NAMESPACES[row.id];
    const base = seedNs ?? slugifyNamespace(row.name);
    const ns = await ensureUniqueNamespace(base, updatedIds, takenNamespaces, row.id);
    await db.execute(
      sql`UPDATE form_templates SET namespace = ${ns} WHERE id = ${row.id}`,
    );
  }

  // 3. Add NOT NULL + UNIQUE + index (idempotent)
  await db.execute(sql`
    ALTER TABLE form_templates ALTER COLUMN namespace SET NOT NULL
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'form_templates_namespace_unique'
      ) THEN
        ALTER TABLE form_templates
        ADD CONSTRAINT form_templates_namespace_unique UNIQUE (namespace);
      END IF;
    END
    $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_form_templates_namespace ON form_templates(namespace)
  `);

  // 4. Stamp templateNamespace into existing deal_intakes form_schema sections
  //    AND rewrite responseData keys from raw `<fieldId>` to composite
  //    `<namespace>:<fieldId>` so reads/writes line up across the app.
  const intakes = await db.execute<{
    id: string;
    template_id: string | null;
    template_name: string;
    form_schema: unknown;
    response_data: unknown;
  }>(sql`SELECT id, template_id, template_name, form_schema, response_data FROM deal_intakes`);

  // Build template-id -> namespace map
  const templateNsRows = await db.execute<{ id: string; namespace: string }>(
    sql`SELECT id, namespace FROM form_templates`,
  );
  const templateIdToNs = new Map<string, string>();
  for (const r of templateNsRows.rows) {
    templateIdToNs.set(r.id, r.namespace);
  }

  let stampedCount = 0;
  let rewrittenCount = 0;
  for (const intake of intakes.rows) {
    const sections = Array.isArray(intake.form_schema) ? intake.form_schema : [];
    if (sections.length === 0) continue;

    // Determine namespace for this intake
    let intakeNs: string | undefined;
    if (intake.template_id && templateIdToNs.has(intake.template_id)) {
      intakeNs = templateIdToNs.get(intake.template_id);
    } else if (intake.template_name) {
      intakeNs = slugifyNamespace(intake.template_name);
    }
    if (!intakeNs) intakeNs = RESERVED_FORM_TEMPLATE_NAMESPACE;

    let sectionsMutated = false;
    const updatedSections = (sections as Array<Record<string, unknown>>).map((section) => {
      if (section && typeof section === "object" && !("templateNamespace" in section)) {
        sectionsMutated = true;
        return { ...section, templateNamespace: intakeNs };
      }
      return section;
    });

    // Rewrite responseData keys from raw fieldId -> "<ns>:<fieldId>" for any
    // field whose composite key isn't already populated. Idempotent: skips
    // values already keyed to composite form.
    const responseData =
      intake.response_data && typeof intake.response_data === "object"
        ? { ...(intake.response_data as Record<string, unknown>) }
        : {};
    let responseMutated = false;

    for (const section of updatedSections) {
      const sectionNs =
        (section as { templateNamespace?: string }).templateNamespace ?? intakeNs;
      const fields = Array.isArray((section as { fields?: unknown }).fields)
        ? ((section as { fields: Array<{ id?: string }> }).fields)
        : [];
      for (const field of fields) {
        if (!field || typeof field !== "object" || !field.id) continue;
        const compositeKey = buildIntakeFieldKey(sectionNs, field.id);
        if (compositeKey === field.id) continue;
        if (Object.prototype.hasOwnProperty.call(responseData, compositeKey)) continue;
        if (Object.prototype.hasOwnProperty.call(responseData, field.id)) {
          responseData[compositeKey] = responseData[field.id];
          delete responseData[field.id];
          responseMutated = true;
        }
      }
    }

    if (sectionsMutated && responseMutated) {
      await db.execute(
        sql`UPDATE deal_intakes SET form_schema = ${JSON.stringify(updatedSections)}::jsonb, response_data = ${JSON.stringify(responseData)}::jsonb WHERE id = ${intake.id}`,
      );
      stampedCount++;
      rewrittenCount++;
    } else if (sectionsMutated) {
      await db.execute(
        sql`UPDATE deal_intakes SET form_schema = ${JSON.stringify(updatedSections)}::jsonb WHERE id = ${intake.id}`,
      );
      stampedCount++;
    } else if (responseMutated) {
      await db.execute(
        sql`UPDATE deal_intakes SET response_data = ${JSON.stringify(responseData)}::jsonb WHERE id = ${intake.id}`,
      );
      rewrittenCount++;
    }
  }

  console.log(
    `[form-template-namespaces migration] Done. Backfilled ${updatedIds.size} template namespaces, stamped ${stampedCount} intake snapshots, rewrote ${rewrittenCount} response payloads.`,
  );
}
