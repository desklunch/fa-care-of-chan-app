import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Role } from "@shared/permissions";

const STORAGE_KEY = "dev-tier-override";

interface TierOverrideContextType {
  overrideRole: Role | null;
  setOverrideRole: (role: Role | null) => void;
  clearOverride: () => void;
}

const TierOverrideContext = createContext<TierOverrideContextType | undefined>(undefined);

export function TierOverrideProvider({ children }: { children: ReactNode }) {
  const [overrideRole, setOverrideRoleState] = useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return saved as Role;
    }
    return null;
  });

  useEffect(() => {
    if (overrideRole) {
      localStorage.setItem(STORAGE_KEY, overrideRole);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [overrideRole]);

  const setOverrideRole = (role: Role | null) => {
    setOverrideRoleState(role);
  };

  const clearOverride = () => {
    setOverrideRoleState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <TierOverrideContext.Provider value={{ overrideRole, setOverrideRole, clearOverride }}>
      {children}
    </TierOverrideContext.Provider>
  );
}

export function useTierOverride() {
  const context = useContext(TierOverrideContext);
  if (context === undefined) {
    return { overrideRole: null, setOverrideRole: () => {}, clearOverride: () => {} };
  }
  return context;
}
