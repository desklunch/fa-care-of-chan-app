import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function OfflineOverlay() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AlertDialog open={offline}>
      <AlertDialogContent
        data-testid="dialog-offline"
        className="max-w-sm"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>You're offline</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            It looks like you've lost your internet connection. The app will
            resume automatically once you're back online.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
