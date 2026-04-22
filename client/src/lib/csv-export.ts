export interface CsvColumn<T, C = unknown> {
  header: string;
  get: (row: T, ctx: C) => unknown;
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (typeof value === "string") {
    str = value;
  } else if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (str === "") return "";
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeRowsToCsv<T, C = unknown>(
  rows: T[],
  columns: CsvColumn<T, C>[],
  ctx: C = undefined as unknown as C,
): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCsvValue(c.header)).join(","));
  for (const row of rows) {
    const cells = columns.map((c) => escapeCsvValue(c.get(row, ctx)));
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

export function buildCsvFilename(prefix: string): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${prefix}-${y}-${m}-${d}.csv`;
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadRowsAsCsv<T, C = unknown>(
  rows: T[],
  columns: CsvColumn<T, C>[],
  ctx: C = undefined as unknown as C,
  filename?: string,
  filenamePrefix = "export",
): void {
  const csv = serializeRowsToCsv(rows, columns, ctx);
  downloadCsv(csv, filename ?? buildCsvFilename(filenamePrefix));
}

export function formatCsvTimestamp(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}
