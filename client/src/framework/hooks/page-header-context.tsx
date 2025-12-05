import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Breadcrumb, ActionButton } from "../types/layout";

interface PageHeaderState {
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ActionButton;
  additionalActions?: ActionButton[];
}

interface PageHeaderContextValue {
  headerState: PageHeaderState;
  setHeaderState: (state: PageHeaderState) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

interface PageHeaderProviderProps {
  children: ReactNode;
}

export function PageHeaderProvider({ children }: PageHeaderProviderProps) {
  const [headerState, setHeaderState] = useState<PageHeaderState>({});

  return (
    <PageHeaderContext.Provider value={{ headerState, setHeaderState }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderContext() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error("usePageHeaderContext must be used within a PageHeaderProvider");
  }
  return context;
}

export function usePageHeader(config: PageHeaderState) {
  const { setHeaderState } = usePageHeaderContext();

  useEffect(() => {
    setHeaderState(config);
    
    return () => {
      setHeaderState({});
    };
  }, [
    JSON.stringify(config.breadcrumbs),
    config.primaryAction?.label,
    config.primaryAction?.onClick,
    config.primaryAction?.href,
    config.additionalActions?.length,
    setHeaderState
  ]);
}
