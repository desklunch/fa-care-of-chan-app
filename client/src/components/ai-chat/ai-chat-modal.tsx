import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Send, Loader2, Bot, User, Wrench, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  name: string;
  result: Record<string, unknown>;
}

interface ChatEvent {
  type: "content" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  message?: string;
}

export function AiChatFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="icon"
        className="!fixed bottom-6 right-6 !z-[1000] h-14 w-14 rounded-full shadow-lg"
        data-testid="button-ai-chat-fab"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {isOpen && (
        <AiChatModal onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}

function AiChatModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<(ToolCall | ToolResult)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolActivity]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setToolActivity([]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: ChatEvent = JSON.parse(line.slice(6));
              
              if (event.type === "content" && event.content) {
                assistantContent += event.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content = assistantContent;
                  } else {
                    updated.push({ role: "assistant", content: assistantContent });
                  }
                  return updated;
                });
              } else if (event.type === "tool_call" && event.name) {
                setToolActivity((prev) => [...prev, { 
                  name: event.name!, 
                  arguments: event.arguments || {} 
                }]);
              } else if (event.type === "tool_result" && event.name) {
                setToolActivity((prev) => [...prev, { 
                  name: event.name!, 
                  result: event.result || {} 
                }]);
              } else if (event.type === "error") {
                setMessages((prev) => [...prev, { 
                  role: "assistant", 
                  content: `Error: ${event.message || "An error occurred"}` 
                }]);
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Error: ${error instanceof Error ? error.message : "Failed to send message"}` 
      }]);
    } finally {
      setIsLoading(false);
      setToolActivity([]);
    }
  }, [input, messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="ai-chat-modal-backdrop"
    >
      <div 
        className="bg-background border rounded-lg shadow-xl flex flex-col w-full max-w-2xl mx-4"
        style={{ height: "calc(100vh - 32px)" }}
        data-testid="ai-chat-modal"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            data-testid="button-close-ai-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <div className="text-lg font-medium">How can I help you today?</div>
              <div className="text-sm mt-2 max-w-md">
                I can help you generate editorial descriptions for venues. 
                Just tell me which venue you'd like me to write about.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <MessageContent content={message.content} />
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {toolActivity.length > 0 && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted/50 border border-dashed rounded-lg px-4 py-2 text-sm text-muted-foreground">
                    {toolActivity.map((activity, i) => (
                      <div key={i}>
                        {"arguments" in activity
                          ? `Calling ${formatToolName(activity.name)}...`
                          : `${formatToolName(activity.name)} complete`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && toolActivity.length === 0 && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to generate a description for a venue..."
              className="resize-none min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
              data-testid="input-ai-chat"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[44px] w-[44px]"
              data-testid="button-send-ai-message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | { text: string; href: string })[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ text: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : part.href.startsWith("/") ? (
          <Link 
            key={i} 
            href={part.href}
            className="text-primary underline underline-offset-2 hover:no-underline inline-flex items-center gap-1"
          >
            {part.text}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:no-underline inline-flex items-center gap-1"
          >
            {part.text}
            <ExternalLink className="h-3 w-3" />
          </a>
        )
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
