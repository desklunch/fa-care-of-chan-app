import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { debugLog } from "@/lib/debug-logger";

interface RouterRecoveryContextType {
  routerKey: number;
  forceRouterRemount: () => void;
}

const RouterRecoveryContext = createContext<RouterRecoveryContextType | null>(null);

export function RouterRecoveryProvider({ children }: { children: ReactNode }) {
  const [routerKey, setRouterKey] = useState(0);

  const forceRouterRemount = useCallback(() => {
    debugLog("NAVIGATION", "Forcing router remount to create fresh subscriptions", {
      previousKey: routerKey,
      newKey: routerKey + 1,
    });
    setRouterKey((prev) => prev + 1);
  }, [routerKey]);

  return (
    <RouterRecoveryContext.Provider value={{ routerKey, forceRouterRemount }}>
      {children}
    </RouterRecoveryContext.Provider>
  );
}

export function useRouterRecovery() {
  const context = useContext(RouterRecoveryContext);
  if (!context) {
    throw new Error("useRouterRecovery must be used within RouterRecoveryProvider");
  }
  return context;
}
