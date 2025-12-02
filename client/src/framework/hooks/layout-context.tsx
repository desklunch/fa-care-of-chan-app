import { createContext, useContext, ReactNode } from "react";
import type { LayoutConfig } from "../types/layout";

const LayoutContext = createContext<LayoutConfig | undefined>(undefined);

interface LayoutProviderProps {
  config: LayoutConfig;
  children: ReactNode;
}

export function LayoutProvider({ config, children }: LayoutProviderProps) {
  return (
    <LayoutContext.Provider value={config}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
