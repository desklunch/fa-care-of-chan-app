export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  link?: string;
}

function parseHexColor(color: string): { red: number; green: number; blue: number } | null {
  let hex = color.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { red: r / 255, green: g / 255, blue: b / 255 };
}

function parseRgbColor(color: string): { red: number; green: number; blue: number } | null {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return {
    red: parseInt(match[1]) / 255,
    green: parseInt(match[2]) / 255,
    blue: parseInt(match[3]) / 255,
  };
}

export function parseCssColor(color: string): { red: number; green: number; blue: number } | null {
  if (!color) return null;
  const hslMatch = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    if (s === 0) {
      return { red: l, green: l, blue: l };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      red: hue2rgb(p, q, h + 1 / 3),
      green: hue2rgb(p, q, h),
      blue: hue2rgb(p, q, h - 1 / 3),
    };
  }
  return parseHexColor(color) || parseRgbColor(color);
}

interface FormatState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  link?: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

interface InlineMatch {
  index: number;
  fullLength: number;
  innerContent: string;
  formatDelta: Partial<FormatState>;
}

function findEarliestInlineMatch(text: string): InlineMatch | null {
  const candidates: InlineMatch[] = [];

  const boldMd = text.match(/\*\*(.+?)\*\*/);
  if (boldMd && boldMd.index !== undefined) {
    candidates.push({
      index: boldMd.index,
      fullLength: boldMd[0].length,
      innerContent: boldMd[1],
      formatDelta: { bold: true },
    });
  }

  const italicUnderscore = text.match(/(?<!\w)_(.+?)_(?!\w)/);
  if (italicUnderscore && italicUnderscore.index !== undefined) {
    if (!boldMd || italicUnderscore.index !== boldMd.index) {
      candidates.push({
        index: italicUnderscore.index,
        fullLength: italicUnderscore[0].length,
        innerContent: italicUnderscore[1],
        formatDelta: { italic: true },
      });
    }
  }

  const italicStar = text.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
  if (italicStar && italicStar.index !== undefined) {
    if (!boldMd || italicStar.index !== boldMd.index) {
      candidates.push({
        index: italicStar.index,
        fullLength: italicStar[0].length,
        innerContent: italicStar[1],
        formatDelta: { italic: true },
      });
    }
  }

  const linkMd = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (linkMd && linkMd.index !== undefined) {
    candidates.push({
      index: linkMd.index,
      fullLength: linkMd[0].length,
      innerContent: linkMd[1],
      formatDelta: { link: linkMd[2], underline: true },
    });
  }

  const uTag = text.match(/<u>([\s\S]*?)<\/u>/i);
  if (uTag && uTag.index !== undefined) {
    candidates.push({
      index: uTag.index,
      fullLength: uTag[0].length,
      innerContent: uTag[1],
      formatDelta: { underline: true },
    });
  }

  const spanTag = text.match(/<span\s+style=["'][^"']*color:\s*([^;"']+)[^"']*["']>([\s\S]*?)<\/span>/i);
  if (spanTag && spanTag.index !== undefined) {
    candidates.push({
      index: spanTag.index,
      fullLength: spanTag[0].length,
      innerContent: spanTag[2],
      formatDelta: { color: spanTag[1].trim() },
    });
  }

  const aTag = text.match(/<a\s+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (aTag && aTag.index !== undefined) {
    candidates.push({
      index: aTag.index,
      fullLength: aTag[0].length,
      innerContent: aTag[2],
      formatDelta: { link: aTag[1], underline: true },
    });
  }

  const strongTag = text.match(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/i);
  if (strongTag && strongTag.index !== undefined) {
    candidates.push({
      index: strongTag.index,
      fullLength: strongTag[0].length,
      innerContent: strongTag[1],
      formatDelta: { bold: true },
    });
  }

  const emTag = text.match(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/i);
  if (emTag && emTag.index !== undefined) {
    candidates.push({
      index: emTag.index,
      fullLength: emTag[0].length,
      innerContent: emTag[1],
      formatDelta: { italic: true },
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index || b.fullLength - a.fullLength);
  return candidates[0];
}

function parseInline(text: string, inherited: FormatState, segments: RichTextSegment[]): void {
  let remaining = text;

  while (remaining.length > 0) {
    const match = findEarliestInlineMatch(remaining);
    if (!match) {
      if (remaining) {
        segments.push({ text: decodeHtmlEntities(remaining), ...cleanFormat(inherited) });
      }
      break;
    }

    if (match.index > 0) {
      const before = remaining.slice(0, match.index);
      segments.push({ text: decodeHtmlEntities(before), ...cleanFormat(inherited) });
    }

    const childFormat: FormatState = { ...inherited };
    if (match.formatDelta.bold) childFormat.bold = true;
    if (match.formatDelta.italic) childFormat.italic = true;
    if (match.formatDelta.underline) childFormat.underline = true;
    if (match.formatDelta.color) childFormat.color = match.formatDelta.color;
    if (match.formatDelta.link) childFormat.link = match.formatDelta.link;

    parseInline(match.innerContent, childFormat, segments);

    remaining = remaining.slice(match.index + match.fullLength);
  }
}

function cleanFormat(fmt: FormatState): Partial<RichTextSegment> {
  const result: Partial<RichTextSegment> = {};
  if (fmt.bold) result.bold = true;
  if (fmt.italic) result.italic = true;
  if (fmt.underline) result.underline = true;
  if (fmt.color) result.color = fmt.color;
  if (fmt.link) result.link = fmt.link;
  return result;
}

function stripBlockTags(input: string): string {
  let result = input;
  result = result.replace(/<br\s*\/?>/gi, "\n");
  result = result.replace(/<\/p>\s*<p[^>]*>/gi, "\n");
  result = result.replace(/<p[^>]*>/gi, "");
  result = result.replace(/<\/p>/gi, "\n");
  result = result.replace(/<\/?(?:div|blockquote|h[1-6])[^>]*>/gi, "\n");
  result = result.replace(/<\/li>\s*/gi, "\n");
  result = result.replace(/<li[^>]*>/gi, "• ");
  result = result.replace(/<\/?(?:ul|ol)[^>]*>/gi, "");
  return result;
}

function convertBulletLines(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)/);
      if (bulletMatch) {
        return bulletMatch[1] + "• " + bulletMatch[2];
      }
      return line;
    })
    .join("\n");
}

export function parseRichText(input: string): RichTextSegment[] {
  if (!input) return [{ text: "" }];

  let processed = stripBlockTags(input);
  processed = convertBulletLines(processed);

  processed = processed.replace(/^\n+/, "").replace(/\n+$/, "");

  const segments: RichTextSegment[] = [];
  parseInline(processed, {}, segments);

  const merged: RichTextSegment[] = [];
  for (const seg of segments) {
    if (seg.text === "") continue;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.bold === seg.bold &&
      prev.italic === seg.italic &&
      prev.underline === seg.underline &&
      prev.color === seg.color &&
      prev.link === seg.link
    ) {
      prev.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged.length > 0 ? merged : [{ text: "" }];
}
