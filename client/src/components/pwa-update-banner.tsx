import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!show) return null;

  return (
    <div
      data-testid="banner-pwa-update"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded-md border bg-card px-4 py-2 shadow-lg"
    >
      <span className="text-sm text-muted-foreground">
        New version available — reload
      </span>
      <Button
        data-testid="button-pwa-reload"
        size="sm"
        variant="default"
        onClick={() => {
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => window.location.reload(),
            { once: true }
          );
          navigator.serviceWorker
            .getRegistration()
            .then((reg) => reg?.waiting?.postMessage("SKIP_WAITING"));
        }}
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Reload
      </Button>
    </div>
  );
}
