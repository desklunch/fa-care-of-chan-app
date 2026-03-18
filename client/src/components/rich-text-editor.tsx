import { useCallback, useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

function getPrimaryHslColor(): string {
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue("--primary").trim();
  const match = raw.match(/^([\d.]+)\s+([\d.]+)%?\s+([\d.]+)%?$/);
  if (match) {
    return `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`;
  }
  return "hsl(217, 91%, 60%)";
}

const lucideAttrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const lucideIcons: Record<string, string> = {
  bold: `<svg ${lucideAttrs}><path d="M6 12h9a4 4 0 0 0 0-8H7a1 1 0 0 0-1 1v18"/><path d="M6 12h11a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1v-7z" fill="none"/></svg>`,
  italic: `<svg ${lucideAttrs}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg ${lucideAttrs}><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
  link: `<svg ${lucideAttrs}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  "list-bullet": `<svg ${lucideAttrs}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  highlight: `<svg ${lucideAttrs}><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/><rect x="2" y="20" width="20" height="2" rx="0.5" fill="${getPrimaryHslColor()}" stroke="none"/></svg>`,
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
          quill.format("color", getPrimaryHslColor());
        }
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

  const handleChange = useCallback(
    (content: string) => {
      const isEmpty = content === "<p><br></p>" || content === "<p></p>";
      onChange(isEmpty ? "" : content);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const tooltip = container.querySelector(".ql-tooltip") as HTMLElement | null;
    if (!tooltip) return;

    const observer = new MutationObserver(() => {
      if (tooltip.classList.contains("ql-hidden")) return;
      const editor = container.querySelector(".ql-editor") as HTMLElement | null;
      if (!editor) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();
      let left = rangeRect.left - editorRect.left;
      const tooltipWidth = tooltip.offsetWidth;
      const editorWidth = editorRect.width;
      if (left + tooltipWidth > editorWidth) {
        left = Math.max(0, editorWidth - tooltipWidth);
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.marginLeft = "0";
    });

    observer.observe(tooltip, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="rich-text-editor-wrapper"
      data-testid={testId}
    >
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={handleChange}
        onBlur={onBlur}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
