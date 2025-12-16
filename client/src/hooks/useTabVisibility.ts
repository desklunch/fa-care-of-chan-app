import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function useTabVisibility() {
  const lastActiveRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);

  const handleVisibilityChange = useCallback(() => {
    const isNowVisible = document.visibilityState === "visible";
    
    if (isNowVisible && !isVisibleRef.current) {
      const idleTime = Date.now() - lastActiveRef.current;
      
      if (idleTime > STALE_THRESHOLD_MS) {
        console.log(`[TabVisibility] Tab was idle for ${Math.round(idleTime / 1000)}s, invalidating queries`);
        queryClient.invalidateQueries();
      }
    }
    
    isVisibleRef.current = isNowVisible;
    
    if (isNowVisible) {
      lastActiveRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    const intervalId = setInterval(() => {
      if (isVisibleRef.current) {
        lastActiveRef.current = Date.now();
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [handleVisibilityChange]);
}

export function TabVisibilityHandler() {
  useTabVisibility();
  return null;
}
