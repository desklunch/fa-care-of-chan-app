import { useCallback, useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown-utils";

function getHighlightHslColor(): string {
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--destructive").trim();
  const match = raw.match(/^([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?$/);
  if (match) {
    return `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;
  }
  return "hsl(0, 84%, 60%)";
}

const lucideAttrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const lucideIcons: Record<string, string> = {
  bold: `<svg ${lucideAttrs}><path d="M6 12h9a4 4 0 0 0 0-8H7a1 1 0 0 0-1 1v18"/><path d="M6 12h11a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1v-7z" fill="none"/></svg>`,
  italic: `<svg ${lucideAttrs}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg ${lucideAttrs}><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
  link: `<svg ${lucideAttrs}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  "list-bullet": `<svg ${lucideAttrs}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  highlight: `<svg ${lucideAttrs}><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/><rect x="2" y="20" width="20" height="2" rx="0.5" fill="${getHighlightHslColor()}" stroke="none"/></svg>`,
};

const toolbarButtonMap: Record<string, string> = {
  ".ql-bold": "bold",
  ".ql-italic": "italic",
  ".ql-underline": "underline",
  ".ql-link": "link",
  ".ql-list[value='bullet']": "list-bullet",
  ".ql-highlight": "highlight",
};

const modules = {
  toolbar: {
    container: [
      ["bold", "italic", "underline"],
      ["link"],
      [{ list: "bullet" }],
      ["highlight"],
    ],
    handlers: {
      highlight: function (this: { quill: import("quill").default }) {
        const quill = this.quill;
        const range = quill.getSelection();
        if (!range) return;
        const format = quill.getFormat(range);
        if (format.color) {
          quill.format("color", false);
        } else {
          quill.format("color", getHighlightHslColor());
        }
      },
    },
  },
  keyboard: {
    bindings: {
      hyphenToBullet: {
        key: " ",
        prefix: /^-$/,
        handler: function (this: { quill: import("quill").default }, range: { index: number; length: number }) {
          const quill = this.quill;
          const [line, offset] = quill.getLine(range.index);
          if (!line || offset !== 1) return true;
          quill.deleteText(range.index - 1, 1, "user");
          quill.formatLine(range.index - 1, 1, "list", "bullet", "user");
          return false;
        },
      },
    },
  },
};

const formats = ["bold", "italic", "underline", "link", "list", "color"];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  "data-testid": testId,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const internalChangeRef = useRef(false);
  const lastExternalValueRef = useRef(value || "");

  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    if (value !== lastExternalValueRef.current) {
      lastExternalValueRef.current = value || "";
      const quill = quillRef.current?.getEditor();
      if (quill) {
        const html = markdownToHtml(value || "");
        const currentHtml = quill.root.innerHTML;
        if (html !== currentHtml) {
          const selection = quill.getSelection();
          quill.root.innerHTML = html;
          if (selection) {
            try {
              quill.setSelection(selection);
            } catch (_) {}
          }
        }
      }
    }
  }, [value]);

  const handleChange = useCallback(
    (content: string) => {
      const md = htmlToMarkdown(content);
      internalChangeRef.current = true;
      lastExternalValueRef.current = md;
      onChange(md);
    },
    [onChange],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const toolbar = containerRef.current.querySelector(".ql-toolbar");
    if (!toolbar || toolbar.getAttribute("data-lucide-styled")) return;
    toolbar.setAttribute("data-lucide-styled", "true");

    for (const [selector, iconKey] of Object.entries(toolbarButtonMap)) {
      const btn = toolbar.querySelector(selector);
      if (btn && lucideIcons[iconKey]) {
        btn.innerHTML = lucideIcons[iconKey];
      }
    }
  }, []);

  const initialHtml = markdownToHtml(value || "");

  return (
    <div
      ref={containerRef}
      className="rich-text-editor-wrapper"
      data-testid={testId}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        defaultValue={initialHtml}
        onChange={handleChange}
        onBlur={onBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
