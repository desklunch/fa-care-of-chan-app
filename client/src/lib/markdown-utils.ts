import TurndownService from "turndown";
import {
  marked,
  type RendererExtensionFunction,
  type TokenizerExtensionFunction,
  type TokenizerStartFunction,
  type Token,
  type Tokens,
} from "marked";
import type { Root as HastRoot, Text as HastText } from "hast";
import type {
  Root as MdastRoot,
  Parent as MdastParent,
  PhrasingContent,
  Text as MdastText,
} from "mdast";
import { visit } from "unist-util-visit";

interface MarkNode extends MdastParent {
  type: "mark";
  data: { hName: "mark"; hProperties: { className: string[] } };
  children: PhrasingContent[];
}

declare module "mdast" {
  interface PhrasingContentMap {
    mark: MarkNode;
  }
  interface RootContentMap {
    mark: MarkNode;
  }
}

interface HighlightToken extends Tokens.Generic {
  type: "highlight";
  raw: string;
  text: string;
  tokens: Token[];
}

export function rehypeNonBreakingHyphens() {
  return (tree: HastRoot) => {
    visit(tree, "text", (node: HastText, _index, parent) => {
      const parentTag = parent && "tagName" in parent ? parent.tagName : "";
      if (parentTag === "code" || parentTag === "pre") return;
      node.value = node.value.replace(/-/g, "\u2011");
    });
  };
}

function getHighlightHslColor(): string {
  if (typeof document === "undefined") return "hsl(0, 84%, 60%)";
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--destructive").trim();
  const match = raw.match(/^([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?$/);
  if (match) {
    return `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;
  }
  return "hsl(0, 84%, 60%)";
}

marked.setOptions({
  breaks: true,
});

const highlightStart: TokenizerStartFunction = function (src) {
  const i = src.indexOf("==");
  return i === -1 ? undefined : i;
};

const highlightTokenizer: TokenizerExtensionFunction = function (src) {
  const m = /^==([\s\S]+?)==/.exec(src);
  if (!m) return undefined;
  if (m[1].includes("\n\n")) return undefined;
  const innerTokens: Token[] = [];
  this.lexer.inline(m[1], innerTokens);
  const token: HighlightToken = {
    type: "highlight",
    raw: m[0],
    text: m[1],
    tokens: innerTokens,
  };
  return token;
};

const highlightRenderer: RendererExtensionFunction = function (token) {
  const highlight = token as HighlightToken;
  const inner = this.parser.parseInline(highlight.tokens);
  return `<span style="color: ${getHighlightHslColor()}">${inner}</span>`;
};

marked.use({
  extensions: [
    {
      name: "highlight",
      level: "inline",
      start: highlightStart,
      tokenizer: highlightTokenizer,
      renderer: highlightRenderer,
    },
  ],
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
    filter: (node) =>
      node.nodeName === "SPAN" &&
      !!(node as HTMLElement).style &&
      !!(node as HTMLElement).style.color,
    replacement: (content) => {
      if (!content || !content.trim()) return content;
      // Use a `==text==` sentinel so the markdown round-trips cleanly
      // without injecting raw inline HTML that breaks surrounding
      // block-level markdown parsing.
      return `==${content}==`;
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
  // Normalize any legacy `<span style="color: …">…</span>` highlights in
  // stored markdown to the new `==…==` sentinel so the marked extension
  // below can render them consistently when reopened in the editor.
  const normalized = normalizeHighlightsForDisplay(md);
  const result = marked.parse(normalized, { async: false }) as string;
  return result;
}

// Quill 2.x applies inline style attributors (like color) directly onto
// existing inline blots, producing markup like
// `<strong style="color: red">…</strong>` rather than wrapping in a span.
// To keep the Turndown highlight rule (which only matches spans) firing
// alongside the built-in bold/italic/underline rules, lift any color style
// off non-span inline elements and into a wrapping `<span>` around their
// content.
function normalizeColorWrappers(html: string): string {
  if (typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const elements = container.querySelectorAll<HTMLElement>("[style*='color']");
  elements.forEach((el) => {
    if (el.nodeName === "SPAN") return;
    const color = el.style.color;
    if (!color) return;
    el.style.removeProperty("color");
    if (!el.getAttribute("style")) el.removeAttribute("style");
    const span = document.createElement("span");
    span.style.color = color;
    while (el.firstChild) span.appendChild(el.firstChild);
    el.appendChild(span);
  });
  return container.innerHTML;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const isEmpty = html === "<p><br></p>" || html === "<p></p>";
  if (isEmpty) return "";
  const normalized = normalizeColorWrappers(html);
  const td = createTurndownService();
  return td.turndown(normalized);
}

export function normalizeToMarkdown(value: string): string {
  if (!value) return "";
  if (isHtmlContent(value)) {
    return htmlToMarkdown(value);
  }
  return value;
}

const LEGACY_HIGHLIGHT_SPAN =
  /<span\s+style\s*=\s*"[^"]*color\s*:[^"]*"\s*>([\s\S]*?)<\/span>/gi;

// Convert any legacy raw `<span style="color: …">…</span>` highlights that
// may exist in already-saved markdown into the `==…==` sentinel form so the
// remark plugin below can render them consistently and without breaking
// surrounding markdown parsing.
export function normalizeHighlightsForDisplay(md: string): string {
  if (!md) return md;
  return md.replace(LEGACY_HIGHLIGHT_SPAN, (_, inner: string) => {
    if (!inner.trim()) return inner;
    return `==${inner}==`;
  });
}

function makeMarkNode(children: PhrasingContent[]): MarkNode {
  return {
    type: "mark",
    data: { hName: "mark", hProperties: { className: ["md-highlight"] } },
    children,
  };
}

function isPhrasingParent(
  node: unknown,
): node is MdastParent & { children: PhrasingContent[] } {
  if (!node || typeof node !== "object") return false;
  const candidate = node as { children?: unknown };
  return Array.isArray(candidate.children);
}

function processChildren(parent: MdastParent & { children: PhrasingContent[] }): void {
  const children = parent.children;
  let i = 0;
  while (i < children.length) {
    const child = children[i];
    if (child.type !== "text") {
      i++;
      continue;
    }
    const value = (child as MdastText).value;
    const startIdx = value.indexOf("==");
    if (startIdx === -1) {
      i++;
      continue;
    }
    // Try to find the closing marker in the same text node first.
    const sameNodeEnd = value.indexOf("==", startIdx + 2);
    if (sameNodeEnd !== -1) {
      const before = value.slice(0, startIdx);
      const inner = value.slice(startIdx + 2, sameNodeEnd);
      const after = value.slice(sameNodeEnd + 2);
      const replacement: PhrasingContent[] = [];
      if (before) replacement.push({ type: "text", value: before });
      replacement.push(makeMarkNode([{ type: "text", value: inner }]));
      if (after) replacement.push({ type: "text", value: after });
      children.splice(i, 1, ...replacement);
      i += replacement.length;
      continue;
    }
    // Otherwise look for the closing marker in subsequent sibling text nodes.
    let endNodeIdx = -1;
    let endOffset = -1;
    for (let j = i + 1; j < children.length; j++) {
      const sibling = children[j];
      if (sibling.type === "text") {
        const idx = (sibling as MdastText).value.indexOf("==");
        if (idx !== -1) {
          endNodeIdx = j;
          endOffset = idx;
          break;
        }
      }
    }
    if (endNodeIdx === -1) {
      i++;
      continue;
    }
    const beforeText = value.slice(0, startIdx);
    const startInside = value.slice(startIdx + 2);
    const endNode = children[endNodeIdx] as MdastText;
    const endInside = endNode.value.slice(0, endOffset);
    const afterText = endNode.value.slice(endOffset + 2);
    const insideChildren: PhrasingContent[] = [];
    if (startInside) insideChildren.push({ type: "text", value: startInside });
    for (let k = i + 1; k < endNodeIdx; k++) {
      insideChildren.push(children[k]);
    }
    if (endInside) insideChildren.push({ type: "text", value: endInside });
    const replacement: PhrasingContent[] = [];
    if (beforeText) replacement.push({ type: "text", value: beforeText });
    replacement.push(makeMarkNode(insideChildren));
    if (afterText) replacement.push({ type: "text", value: afterText });
    children.splice(i, endNodeIdx - i + 1, ...replacement);
    i += replacement.length;
  }
}

// remark plugin: scan parsed mdast nodes for `==…==` sentinels (which may
// span several inline children when the highlight wraps formatted text)
// and wrap the matching range in a `<mark class="md-highlight">` element.
// Operating on the parsed tree means we never inject raw HTML into the
// markdown string, so surrounding paragraphs / lists / emphasis stay
// parsed as markdown.
export function remarkHighlight() {
  return (tree: MdastRoot) => {
    visit(tree, (node) => {
      if (isPhrasingParent(node)) {
        processChildren(node);
      }
    });
  };
}
