import { type RichTextSegment, parseCssColor } from "./richTextParser";

export async function getDriveFileMetadata(fileId: string, accessToken: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,name,mimeType,iconLink,webViewLink,driveId`;
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

export interface DriveScopeOptions {
  driveId?: string;
  sharedWithMe?: boolean;
}

export async function searchDriveFiles(
  accessToken: string,
  query: string,
  pageToken?: string,
  parentId?: string,
  options?: DriveScopeOptions,
) {
  const driveId = options?.driveId;
  const sharedWithMe = options?.sharedWithMe;

  const params = new URLSearchParams({
    fields:
      "files(id,name,mimeType,iconLink,webViewLink,modifiedTime,owners,driveId),nextPageToken",
    pageSize: parentId || driveId || sharedWithMe ? "100" : "20",
    orderBy:
      parentId || driveId
        ? "folder,name"
        : "modifiedByMeTime desc,viewedByMeTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const clauses: string[] = ["trashed=false"];
  if (query) {
    const words = query.trim().split(/\s+/).filter(Boolean);
    for (const word of words) {
      const escaped = word.replace(/'/g, "\\'");
      clauses.push(`name contains '${escaped}'`);
    }
  }

  if (sharedWithMe) {
    clauses.push("sharedWithMe=true");
    params.set("corpora", "user");
  } else if (driveId && !parentId) {
    const escapedDriveId = driveId.replace(/'/g, "\\'");
    clauses.push(`'${escapedDriveId}' in parents`);
    params.set("corpora", "drive");
    params.set("driveId", driveId);
  } else if (parentId) {
    const escapedParent = parentId.replace(/'/g, "\\'");
    clauses.push(`'${escapedParent}' in parents`);
    if (driveId) {
      params.set("corpora", "drive");
      params.set("driveId", driveId);
    }
  } else if (query) {
    // Search across the user's personal Drive + all shared drives.
    params.set("corpora", "allDrives");
  }

  params.set("q", clauses.join(" and "));

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
  options?: DriveScopeOptions,
) {
  const driveId = options?.driveId;
  const sharedWithMe = options?.sharedWithMe;

  const params = new URLSearchParams({
    fields: "files(id,name,mimeType,modifiedTime,driveId),nextPageToken",
    pageSize: "100",
    orderBy: "name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  let q = "mimeType = 'application/vnd.google-apps.folder' and trashed=false";
  if (sharedWithMe) {
    q += " and sharedWithMe=true";
    params.set("corpora", "user");
  } else if (driveId && !parentFolderId) {
    const escapedDriveId = driveId.replace(/'/g, "\\'");
    q += ` and '${escapedDriveId}' in parents`;
    params.set("corpora", "drive");
    params.set("driveId", driveId);
  } else if (parentFolderId) {
    const escapedParent = parentFolderId.replace(/'/g, "\\'");
    q += ` and '${escapedParent}' in parents`;
    if (driveId) {
      params.set("corpora", "drive");
      params.set("driveId", driveId);
    }
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

export interface SharedDrive {
  id: string;
  name: string;
}

export async function listSharedDrives(
  accessToken: string,
): Promise<{ drives: SharedDrive[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    fields: "drives(id,name),nextPageToken",
    pageSize: "100",
  });
  const url = `https://www.googleapis.com/drive/v3/drives?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list shared drives: ${response.status} ${text}`);
  }
  const body = await response.json();
  return { drives: body.drives ?? [], nextPageToken: body.nextPageToken };
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
): Promise<{ id: string; name: string; webViewLink: string; mimeType: string; driveId?: string }> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy?supportsAllDrives=true&fields=id,name,webViewLink,mimeType,driveId`,
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

export async function shareDriveFileWithDomain(
  accessToken: string,
  fileId: string,
  domain: string,
  role: "reader" | "writer" = "writer",
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "domain", role, domain }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to share Drive file with domain: ${response.status} ${text}`);
  }
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
  userEnteredFormat?: Record<string, unknown>;
}

export async function findTokenCells(
  accessToken: string,
  spreadsheetId: string,
): Promise<TokenCell[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&fields=sheets(properties(title,sheetId),data.rowData.values(formattedValue,userEnteredFormat))`;
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
            cells.push({
              sheetTitle: title,
              sheetId: numericSheetId,
              row: rowIdx,
              col: colIdx,
              originalValue: val,
              userEnteredFormat: cell?.userEnteredFormat,
            });
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
      if (seg.text.length === 0) continue;
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
      textFormatRuns.push({ startIndex: offset, format });
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

export async function applySheetRequests(
  accessToken: string,
  spreadsheetId: string,
  requests: unknown[],
): Promise<void> {
  if (requests.length === 0) return;
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
    throw new Error(`Failed to apply sheet requests: ${res.status} ${text}`);
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

export const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export function isDriveFolderUrl(url: string): boolean {
  return /\/folders\/[a-zA-Z0-9_-]+/.test(url);
}

export function isDriveFolderMimeType(mimeType: string | null | undefined): boolean {
  return mimeType === DRIVE_FOLDER_MIME_TYPE;
}
