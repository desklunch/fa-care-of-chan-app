import { useLocation as useWouterLocation } from "wouter";
import { useCallback } from "react";
import { startNavigationWatchdog } from "@/lib/navigation-watchdog";

export function useProtectedLocation(): ReturnType<typeof useWouterLocation> {
  const [location, setLocation] = useWouterLocation();

  const protectedSetLocation = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      startNavigationWatchdog(to);
      setLocation(to, options);
    },
    [setLocation]
  );

  return [location, protectedSetLocation];
}
