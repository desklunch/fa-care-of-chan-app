import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import { rehypeNonBreakingHyphens } from "@/lib/markdown-utils";

interface MarkdownDisplayProps {
  children: string;
  className?: string;
}

export function MarkdownDisplay({ children, className }: MarkdownDisplayProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeNonBreakingHyphens]}
        remarkPlugins={[remarkBreaks]}
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
