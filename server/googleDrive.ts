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
