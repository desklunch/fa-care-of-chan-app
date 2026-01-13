import { useEffect } from "react";
import { useLocation } from "wouter";
import { initNavigationWatchdog, updateWouterLocation } from "@/lib/navigation-watchdog";

export function useNavigationWatchdog(): void {
  const [location] = useLocation();
  
  useEffect(() => {
    updateWouterLocation(location);
  }, [location]);
}

export function NavigationWatchdog(): null {
  useNavigationWatchdog();
  return null;
}

initNavigationWatchdog();
