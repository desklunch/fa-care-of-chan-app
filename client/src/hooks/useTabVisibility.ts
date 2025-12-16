import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function useTabVisibility() {
  const lastActiveRef = useRef<number>(Date.now());
  const lastUserInteractionRef = useRef<number>(Date.now());

  const forceRouterSync = useCallback(() => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  }, []);

  const handleWakeUp = useCallback((source: string) => {
    const idleTime = Date.now() - lastUserInteractionRef.current;
    
    if (idleTime > STALE_THRESHOLD_MS) {
      console.log(`[AppVisibility] App idle for ${Math.round(idleTime / 1000)}s (${source}), syncing router and invalidating queries`);
      
      forceRouterSync();
      
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 100);
    }
    
    lastActiveRef.current = Date.now();
    lastUserInteractionRef.current = Date.now();
  }, [forceRouterSync]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleWakeUp("visibility");
    }
  }, [handleWakeUp]);

  const handleWindowFocus = useCallback(() => {
    handleWakeUp("focus");
  }, [handleWakeUp]);

  const handleUserInteraction = useCallback(() => {
    lastUserInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    
    document.addEventListener("click", handleUserInteraction, { passive: true });
    document.addEventListener("keydown", handleUserInteraction, { passive: true });
    document.addEventListener("scroll", handleUserInteraction, { passive: true });
    document.addEventListener("mousemove", handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
      document.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [handleVisibilityChange, handleWindowFocus, handleUserInteraction]);
}

export function TabVisibilityHandler() {
  useTabVisibility();
  return null;
}
