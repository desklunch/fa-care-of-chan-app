import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { recordReloadTrigger } from "@/lib/debug-logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: unknown): boolean {
  const message = (error as Error)?.message || String(error);
  return (
    /Loading chunk \d+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (!isChunkLoadError(error)) {
      console.error("Chunk error boundary caught error:", error);
    }
  }

  handleReload = () => {
    recordReloadTrigger("chunk-error-boundary", {
      message: this.state.error?.message,
      isChunk: isChunkLoadError(this.state.error),
    });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isChunk = isChunkLoadError(this.state.error);

    return (
      <div
        className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 gap-4 text-center"
        data-testid="chunk-error-fallback"
      >
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {isChunk ? "Couldn't load this page" : "Something went wrong"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {isChunk
              ? "The page failed to load. This is usually a temporary network issue."
              : "An unexpected error occurred. Please try reloading the page."}
          </p>
        </div>
        <Button onClick={this.handleReload} data-testid="button-reload-page">
          Reload
        </Button>
      </div>
    );
  }
}
