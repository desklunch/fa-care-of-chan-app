import { resolve4, resolve6 } from "dns/promises";

export interface UnfurlResult {
  title: string | null;
  description: string | null;
  image: string | null;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
]);

const MAX_REDIRECTS = 5;

function isPrivateIPv4(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0") return true;

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("::ffff:")) {
    const ipv4 = normalized.slice(7);
    return isPrivateIPv4(ipv4);
  }
  return false;
}

async function isBlockedHost(hostname: string): Promise<boolean> {
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return true;

  if (isPrivateIPv4(hostname)) return true;
  if (isPrivateIPv6(hostname)) return true;

  try {
    let hasResolved = false;

    try {
      const ipv4Addresses = await resolve4(hostname);
      hasResolved = true;
      for (const addr of ipv4Addresses) {
        if (isPrivateIPv4(addr)) return true;
      }
    } catch {
      // no A records
    }

    try {
      const ipv6Addresses = await resolve6(hostname);
      hasResolved = true;
      for (const addr of ipv6Addresses) {
        if (isPrivateIPv6(addr)) return true;
      }
    } catch {
      // no AAAA records
    }

    if (!hasResolved) return true;
  } catch {
    return true;
  }

  return false;
}

async function safeFetch(
  url: string,
  signal: AbortSignal,
): Promise<Response | null> {
  let currentUrl = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const parsed = new URL(currentUrl);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    if (await isBlockedHost(parsed.hostname)) {
      return null;
    }

    const response = await fetch(currentUrl, {
      signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
        Accept: "text/html",
      },
      redirect: "manual",
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      const location = response.headers.get("location")!;
      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        return null;
      }
      continue;
    }

    return response;
  }

  return null;
}

export async function unfurlUrl(url: string): Promise<UnfurlResult> {
  const empty: UnfurlResult = { title: null, description: null, image: null };

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return empty;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: Response | null;
    try {
      response = await safeFetch(url, controller.signal);
    } finally {
      clearTimeout(timeout);
    }

    if (!response) {
      return empty;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return empty;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2_000_000) {
      return empty;
    }

    const MAX_BODY_SIZE = 2_000_000;
    const reader = response.body?.getReader();
    if (!reader) return empty;

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_BODY_SIZE) {
        reader.cancel();
        return empty;
      }
      chunks.push(value);
    }
    const decoder = new TextDecoder();
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join("") + decoder.decode();
    const maxLen = 50000;
    const truncated = html.length > maxLen ? html.substring(0, maxLen) : html;

    const title =
      extractMeta(truncated, "og:title") ||
      extractMeta(truncated, "twitter:title") ||
      extractTitleTag(truncated);

    const description =
      extractMeta(truncated, "og:description") ||
      extractMeta(truncated, "twitter:description") ||
      extractMetaName(truncated, "description");

    const image =
      extractMeta(truncated, "og:image") ||
      extractMeta(truncated, "twitter:image") ||
      extractLinkIcon(truncated);

    let resolvedImage = image;
    if (resolvedImage && !resolvedImage.startsWith("http")) {
      try {
        resolvedImage = new URL(resolvedImage, url).href;
      } catch {
        resolvedImage = null;
      }
    }

    return {
      title: title ? title.substring(0, 500) : null,
      description: description ? description.substring(0, 2000) : null,
      image: resolvedImage ? resolvedImage.substring(0, 2000) : null,
    };
  } catch {
    return empty;
  }
}

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*?)["']`,
    "i",
  );
  const match = html.match(regex);
  if (match) return decodeEntities(match[1]);

  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`,
    "i",
  );
  const match2 = html.match(regex2);
  if (match2) return decodeEntities(match2[1]);

  return null;
}

function extractMetaName(html: string, name: string): string | null {
  return extractMeta(html, name);
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeEntities(match[1].trim()) : null;
}

function extractLinkIcon(html: string): string | null {
  const appleTouchRegex =
    /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i;
  const appleTouchMatch = html.match(appleTouchRegex);
  if (appleTouchMatch) return decodeEntities(appleTouchMatch[1]);

  const appleTouchAlt =
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["']/i;
  const appleTouchAltMatch = html.match(appleTouchAlt);
  if (appleTouchAltMatch) return decodeEntities(appleTouchAltMatch[1]);

  return null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
