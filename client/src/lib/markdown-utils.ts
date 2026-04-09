import TurndownService from "turndown";
import { marked } from "marked";
import type { Root, Text } from "hast";
import { visit } from "unist-util-visit";

export function rehypeNonBreakingHyphens() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, _index, parent) => {
      const parentTag = parent && "tagName" in parent ? parent.tagName : "";
      if (parentTag === "code" || parentTag === "pre") return;
      node.value = node.value.replace(/-/g, "\u2011");
    });
  };
}

marked.setOptions({
  breaks: true,
});

function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  td.addRule("underline", {
    filter: ["u"],
    replacement: (content) => `<u>${content}</u>`,
  });
  td.addRule("coloredSpan", {
    filter: (node: HTMLElement) =>
      node.nodeName === "SPAN" && !!node.style?.color,
    replacement: (content: string, node: Node) => {
      const el = node as HTMLElement;
      return `<span style="color: ${el.style.color}">${content}</span>`;
    },
  });
  return td;
}

const HTML_TAG_PATTERN = /^<(?:p|ul|ol|h[1-6]|div|span|br|strong|em|a |li|blockquote)/i;

export function isHtmlContent(str: string): boolean {
  if (!str) return false;
  return HTML_TAG_PATTERN.test(str.trim());
}

export function markdownToHtml(md: string): string {
  if (!md) return "";
  if (isHtmlContent(md)) {
    return md;
  }
  const result = marked.parse(md, { async: false }) as string;
  return result;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const isEmpty = html === "<p><br></p>" || html === "<p></p>";
  if (isEmpty) return "";
  const td = createTurndownService();
  return td.turndown(html);
}

export function normalizeToMarkdown(value: string): string {
  if (!value) return "";
  if (isHtmlContent(value)) {
    return htmlToMarkdown(value);
  }
  return value;
}
