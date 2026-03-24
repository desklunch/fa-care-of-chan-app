import { ReplitConnectors } from "@replit/connectors-sdk";

export async function getDriveFileMetadata(fileId: string) {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy(
    "google-drive",
    `/drive/v3/files/${fileId}?fields=id,name,mimeType,iconLink,webViewLink`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Drive file metadata: ${response.status}`);
  }
  return response.json();
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
