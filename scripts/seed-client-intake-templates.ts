/**
 * One-time seed script: creates 8 Client Intake form templates from the
 * `attached_assets/Chansey_-_New_Client_Intake_Form_Templates_*.xlsx`
 * workbook.
 *
 * Idempotent: any template whose `name` or `namespace` already exists is
 * skipped and logged.
 *
 * Run with: `npx tsx scripts/seed-client-intake-templates.ts`
 */
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import { db } from "../server/db";
import {
  formTemplates,
  type FormField,
  type FormFieldType,
  type FormSection,
} from "@shared/schema";
import { eq, or, inArray } from "drizzle-orm";

const SOURCE_FILE = path.join(
  process.cwd(),
  "attached_assets",
  "Chansey_-_New_Client_Intake_Form_Templates_1779801571737.xlsx",
);

const SHEET_TO_NAMESPACE: Record<string, { name: string; namespace: string }> = {
  "Standard Event": { name: "Standard Event", namespace: "standard-event" },
  "Brand Trip Event": { name: "Brand Trip Event", namespace: "brand-trip-event" },
  Mailer: { name: "Mailer", namespace: "mailer" },
  "Event Concepting ": { name: "Event Concepting", namespace: "event-concepting" },
  "Event Creative Direction ": {
    name: "Event Creative Direction",
    namespace: "event-creative-direction",
  },
  "Guest List": { name: "Guest List", namespace: "guest-list" },
  "Gifting List": { name: "Gifting List", namespace: "gifting-list" },
  "Venue Programming": { name: "Venue Programming", namespace: "venue-programming" },
};

function mapFieldType(raw: string): FormFieldType | null {
  const t = raw.trim().toLowerCase();
  if (t === "rich text") return "richtext";
  if (t === "short text") return "text";
  if (t === "dropdown") return "select";
  return null;
}

/**
 * Convert the spreadsheet's plain-text rich-text default into Markdown:
 * - Consecutive lines beginning with `- ` collapse into a bulleted list.
 * - All other line breaks become paragraph breaks (blank line between).
 */
function toMarkdown(raw: string): string {
  if (!raw) return "";
  const lines = raw.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd());

  const blocks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const bullets: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        bullets.push(lines[i]);
        i++;
      }
      blocks.push(bullets.join("\n"));
      continue;
    }
    // Plain paragraph: a single non-bullet, non-empty line.
    blocks.push(line);
    i++;
  }
  return blocks.join("\n\n");
}

/**
 * Parse `[A, B, C (x or y), D]` style dropdown options. Commas inside
 * parentheses are NOT split — so `Brand Trip (International or Domestic)`
 * stays one option.
 */
function parseDropdownOptions(raw: string): string[] {
  if (!raw) return [];
  let s = raw.trim();
  if (s.startsWith("[")) s = s.slice(1);
  if (s.endsWith("]")) s = s.slice(0, -1);

  const parts: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      const t = buf.trim();
      if (t) parts.push(t);
      buf = "";
    } else {
      buf += ch;
    }
  }
  const last = buf.trim();
  if (last) parts.push(last);
  return parts;
}

interface SheetRow {
  section: string;
  fieldType: string;
  fieldName: string;
  defaultContent: string;
  dropdownOptions: string;
}

function readSheet(sheet: XLSX.WorkSheet): SheetRow[] {
  const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  const out: SheetRow[] = [];
  // Skip header row.
  for (let i = 1; i < json.length; i++) {
    const row = json[i] as unknown[];
    if (!row || row.length === 0) continue;
    const cells = row.map((c) => String(c ?? "").trim());
    if (cells.every((c) => c === "")) continue;
    out.push({
      section: cells[0] ?? "",
      fieldType: cells[1] ?? "",
      fieldName: cells[2] ?? "",
      defaultContent: String(row[3] ?? ""),
      dropdownOptions: cells[4] ?? "",
    });
  }
  return out;
}

function buildSchema(
  rows: SheetRow[],
  namespace: string,
): { sections: FormSection[]; warnings: string[] } {
  const warnings: string[] = [];
  const sectionMap = new Map<string, FormSection>();
  const orderedSections: FormSection[] = [];

  for (const row of rows) {
    const sectionTitle = row.section.trim();
    if (!sectionTitle) {
      warnings.push(`Row missing section for field "${row.fieldName}"`);
      continue;
    }
    const fieldType = mapFieldType(row.fieldType);
    if (!fieldType) {
      warnings.push(
        `Unknown field type "${row.fieldType}" for field "${row.fieldName}"`,
      );
      continue;
    }

    let section = sectionMap.get(sectionTitle);
    if (!section) {
      section = {
        id: randomUUID(),
        title: sectionTitle,
        fields: [],
        templateNamespace: namespace,
      };
      sectionMap.set(sectionTitle, section);
      orderedSections.push(section);
    }

    const field: FormField = {
      id: randomUUID(),
      name: row.fieldName.trim(),
      type: fieldType,
    };

    if (fieldType === "richtext") {
      const md = toMarkdown(row.defaultContent);
      if (md) field.defaultValue = md;
    } else if (fieldType === "select") {
      const opts = parseDropdownOptions(row.dropdownOptions);
      if (opts.length > 0) field.options = opts;
      else
        warnings.push(
          `Dropdown field "${row.fieldName}" has no parseable options`,
        );
    }

    section.fields.push(field);
  }

  return { sections: orderedSections, warnings };
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`[seed-client-intake] Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  console.log(`[seed-client-intake] Reading ${path.basename(SOURCE_FILE)}`);
  const wb = XLSX.readFile(SOURCE_FILE);

  const targets = Object.entries(SHEET_TO_NAMESPACE);

  // Pre-fetch existing templates by name or namespace for skip-check.
  const names = targets.map(([, v]) => v.name);
  const namespaces = targets.map(([, v]) => v.namespace);
  const existing = await db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      namespace: formTemplates.namespace,
    })
    .from(formTemplates)
    .where(or(inArray(formTemplates.name, names), inArray(formTemplates.namespace, namespaces)));

  const existingNames = new Set(existing.map((e) => e.name));
  const existingNamespaces = new Set(existing.map((e) => e.namespace));

  let created = 0;
  let skipped = 0;

  for (const [sheetName, { name, namespace }] of targets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      console.warn(`[seed-client-intake] SKIP "${name}" — sheet "${sheetName}" not found`);
      skipped++;
      continue;
    }

    const reasons: string[] = [];
    if (existingNames.has(name)) reasons.push(`name "${name}" exists`);
    if (existingNamespaces.has(namespace))
      reasons.push(`namespace "${namespace}" exists`);
    if (reasons.length > 0) {
      console.log(`[seed-client-intake] SKIP "${name}" — ${reasons.join("; ")}`);
      skipped++;
      continue;
    }

    const rows = readSheet(sheet);
    const { sections, warnings } = buildSchema(rows, namespace);
    for (const w of warnings) {
      console.warn(`[seed-client-intake]   warning (${name}): ${w}`);
    }

    if (sections.length === 0) {
      console.warn(`[seed-client-intake] SKIP "${name}" — no usable rows`);
      skipped++;
      continue;
    }

    await db.insert(formTemplates).values({
      name,
      namespace,
      category: "client_intake",
      description: null,
      formSchema: sections,
    });

    const fieldCount = sections.reduce((sum, s) => sum + s.fields.length, 0);
    console.log(
      `[seed-client-intake] CREATED "${name}" (${namespace}) — ${sections.length} sections, ${fieldCount} fields`,
    );
    created++;
  }

  console.log(`[seed-client-intake] Done. created=${created} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-client-intake] FAILED:", err);
  process.exit(1);
});
