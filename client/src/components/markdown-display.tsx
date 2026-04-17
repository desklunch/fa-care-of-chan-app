import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import {
  rehypeNonBreakingHyphens,
  remarkHighlight,
  normalizeHighlightsForDisplay,
} from "@/lib/markdown-utils";

interface MarkdownDisplayProps {
  children: string;
  className?: string;
}

export function MarkdownDisplay({ children, className }: MarkdownDisplayProps) {
  const normalized = normalizeHighlightsForDisplay(children || "");
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeNonBreakingHyphens]}
        remarkPlugins={[remarkBreaks, remarkHighlight]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
          mark: ({ children: markChildren }) => (
            <mark className="md-highlight">{markChildren}</mark>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
