import { type RichTextSegment, parseCssColor } from "./richTextParser";

export async function getDriveFileMetadata(fileId: string, accessToken: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,iconLink,webViewLink`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Drive file metadata: ${response.status} ${text}`);
  }
  return response.json();
}

export async function searchDriveFiles(
  accessToken: string,
  query: string,
  pageToken?: string,
) {
  const params = new URLSearchParams({
    fields: "files(id,name,mimeType,iconLink,webViewLink,modifiedTime,owners),nextPageToken",
    pageSize: "20",
    orderBy: "modifiedByMeTime desc,viewedByMeTime desc",
  });

  if (query) {
    const words = query.trim().split(/\s+/).filter(Boolean);
    const clauses = words.map((word) => {
      const escaped = word.replace(/'/g, "\\'");
      return `name contains '${escaped}'`;
    });
    params.set("q", `${clauses.join(" and ")} and trashed=false`);
  } else {
    params.set("q", "trashed=false");
  }

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to search Drive files: ${response.status} ${text}`);
  }

  return response.json();
}

export async function listDriveFolders(
  accessToken: string,
  parentFolderId?: string,
) {
  const params = new URLSearchParams({
    fields: "files(id,name,mimeType,modifiedTime),nextPageToken",
    pageSize: "50",
    orderBy: "name",
  });

  let q = "mimeType = 'application/vnd.google-apps.folder' and trashed=false";
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  } else {
    q += " and 'root' in parents";
  }
  params.set("q", q);

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list Drive folders: ${response.status} ${text}`);
  }

  return response.json();
}

export async function createGoogleDoc(
  accessToken: string,
  title: string,
  folderId: string,
  htmlContent: string,
): Promise<{ id: string; name: string; webViewLink: string; mimeType: string }> {
  const boundary = "multipart_boundary_" + Date.now();
  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
    parents: [folderId],
  };

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
    htmlContent +
    `\r\n--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create Google Doc: ${response.status} ${text}`);
  }

  return response.json();
}

export async function copyDriveFile(
  accessToken: string,
  fileId: string,
  name: string,
  folderId: string,
): Promise<{ id: string; name: string; webViewLink: string; mimeType: string }> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name,webViewLink,mimeType`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, parents: [folderId] }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to copy Drive file: ${response.status} ${text}`);
  }

  return response.json();
}

function quoteSheetTitle(title: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(title)) return title;
  return `'${title.replace(/'/g, "''")}'`;
}

function columnToLetter(col: number): string {
  let result = "";
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
}

export interface TokenCell {
  sheetTitle: string;
  sheetId: number;
  row: number;
  col: number;
  originalValue: string;
}

export async function findTokenCells(
  accessToken: string,
  spreadsheetId: string,
): Promise<TokenCell[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&fields=sheets(properties(title,sheetId),data.rowData.values.formattedValue)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to read spreadsheet data: ${res.status} ${text}`);
  }
  const body = await res.json();
  const cells: TokenCell[] = [];

  for (const sheet of body.sheets || []) {
    const title = sheet.properties?.title || "Sheet1";
    const numericSheetId = sheet.properties?.sheetId ?? 0;
    for (const grid of sheet.data || []) {
      for (let rowIdx = 0; rowIdx < (grid.rowData || []).length; rowIdx++) {
        const row = grid.rowData[rowIdx];
        for (let colIdx = 0; colIdx < (row.values || []).length; colIdx++) {
          const cell = row.values[colIdx];
          const val = cell?.formattedValue;
          if (typeof val === "string" && val.includes("{{")) {
            cells.push({ sheetTitle: title, sheetId: numericSheetId, row: rowIdx, col: colIdx, originalValue: val });
          }
        }
      }
    }
  }

  return cells;
}

export async function writeTokenCells(
  accessToken: string,
  spreadsheetId: string,
  updates: { sheetTitle: string; row: number; col: number; value: string }[],
): Promise<void> {
  if (updates.length === 0) return;

  const data = updates.map((u) => ({
    range: `${quoteSheetTitle(u.sheetTitle)}!${columnToLetter(u.col)}${u.row + 1}`,
    values: [[u.value]],
  }));

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write sheet values: ${res.status} ${text}`);
  }
}

export interface RichCellUpdate {
  sheetId: number;
  row: number;
  col: number;
  segments: RichTextSegment[];
}

interface SheetsRgbColor {
  red: number;
  green: number;
  blue: number;
}

interface SheetsTextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  foregroundColorStyle?: { rgbColor: SheetsRgbColor };
  link?: { uri: string };
}

interface SheetsTextFormatRun {
  startIndex: number;
  format: SheetsTextFormat;
}

export async function writeRichTextCells(
  accessToken: string,
  spreadsheetId: string,
  updates: RichCellUpdate[],
): Promise<void> {
  if (updates.length === 0) return;

  const requests = updates.map((u) => {
    const plainText = u.segments.map((s) => s.text).join("");
    const textFormatRuns: SheetsTextFormatRun[] = [];
    let offset = 0;

    for (const seg of u.segments) {
      const format: SheetsTextFormat = {};
      if (seg.bold) format.bold = true;
      if (seg.italic) format.italic = true;
      if (seg.underline) format.underline = true;
      if (seg.color) {
        const parsed = parseCssColor(seg.color);
        if (parsed) {
          format.foregroundColorStyle = { rgbColor: parsed };
        }
      }
      if (seg.link && /^(?:https?:|mailto:)/i.test(seg.link)) {
        format.link = { uri: seg.link };
      }
      const hasFormat = Object.keys(format).length > 0;
      if (hasFormat) {
        textFormatRuns.push({ startIndex: offset, format });
      }
      offset += seg.text.length;
    }

    return {
      updateCells: {
        rows: [
          {
            values: [
              {
                userEnteredValue: { stringValue: plainText },
                textFormatRuns: textFormatRuns.length > 0 ? textFormatRuns : undefined,
              },
            ],
          },
        ],
        fields: "userEnteredValue,textFormatRuns",
        start: {
          sheetId: u.sheetId,
          rowIndex: u.row,
          columnIndex: u.col,
        },
      },
    };
  });

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write rich text cells: ${res.status} ${text}`);
  }
}

export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
