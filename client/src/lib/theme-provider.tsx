import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ThemeConfig, ThemeVariables } from "@shared/schema";

type Theme = "light" | "dark" | "system";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  customTheme: ThemeConfig | null;
  isLoadingTheme: boolean;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const defaultLightTheme: ThemeVariables = {
  background: "0 0% 100%",
  foreground: "0 0% 9%",
  border: "0 0% 90%",
  card: "0 0% 98%",
  cardForeground: "0 0% 9%",
  cardBorder: "0 0% 94%",
  sidebar: "0 0% 96%",
  sidebarForeground: "0 0% 9%",
  sidebarBorder: "0 0% 92%",
  sidebarPrimary: "217 91% 60%",
  sidebarPrimaryForeground: "0 0% 98%",
  sidebarAccent: "0 0% 92%",
  sidebarAccentForeground: "0 0% 9%",
  sidebarRing: "217 91% 60%",
  popover: "0 0% 94%",
  popoverForeground: "0 0% 9%",
  popoverBorder: "0 0% 90%",
  primary: "217 91% 60%",
  primaryForeground: "0 0% 98%",
  secondary: "0 0% 90%",
  secondaryForeground: "0 0% 9%",
  muted: "0 0% 88%",
  mutedForeground: "0 0% 45%",
  accent: "217 15% 88%",
  accentForeground: "0 0% 9%",
  destructive: "0 84% 60%",
  destructiveForeground: "0 0% 98%",
  input: "0 0% 80%",
  ring: "217 91% 60%",
  chart1: "217 91% 35%",
  chart2: "173 58% 39%",
  chart3: "197 37% 24%",
  chart4: "43 74% 49%",
  chart5: "27 87% 67%",
};

const defaultDarkTheme: ThemeVariables = {
  background: "0 0% 9%",
  foreground: "0 0% 98%",
  border: "0 0% 16%",
  card: "0 0% 11%",
  cardForeground: "0 0% 98%",
  cardBorder: "0 0% 14%",
  sidebar: "0 0% 13%",
  sidebarForeground: "0 0% 98%",
  sidebarBorder: "0 0% 16%",
  sidebarPrimary: "217 91% 60%",
  sidebarPrimaryForeground: "0 0% 98%",
  sidebarAccent: "0 0% 16%",
  sidebarAccentForeground: "0 0% 98%",
  sidebarRing: "217 91% 60%",
  popover: "0 0% 15%",
  popoverForeground: "0 0% 98%",
  popoverBorder: "0 0% 18%",
  primary: "217 91% 60%",
  primaryForeground: "0 0% 98%",
  secondary: "0 0% 18%",
  secondaryForeground: "0 0% 98%",
  muted: "0 0% 17%",
  mutedForeground: "0 0% 63%",
  accent: "217 15% 17%",
  accentForeground: "0 0% 98%",
  destructive: "0 84% 60%",
  destructiveForeground: "0 0% 98%",
  input: "0 0% 24%",
  ring: "217 91% 60%",
  chart1: "217 91% 70%",
  chart2: "173 58% 65%",
  chart3: "197 37% 60%",
  chart4: "43 74% 70%",
  chart5: "27 87% 75%",
};

export const defaultTheme: ThemeConfig = {
  light: defaultLightTheme,
  dark: defaultDarkTheme,
};

function cssVarName(key: string): string {
  return key.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

function applyThemeVariables(variables: ThemeVariables, root: HTMLElement) {
  Object.entries(variables).forEach(([key, value]) => {
    const cssVar = `--${cssVarName(key)}`;
    root.style.setProperty(cssVar, value);
  });
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme: initialTheme = "system",
  storageKey = "app-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as Theme) || initialTheme;
    }
    return initialTheme;
  });

  const { data: customTheme, isLoading: isLoadingTheme } = useQuery<ThemeConfig | null>({
    queryKey: ["/api/settings/theme"],
    staleTime: 1000 * 60 * 5,
  });

  const getSystemTheme = useCallback((): "light" | "dark" => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }, []);

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    
    const themeVars = customTheme?.[resolvedTheme] || defaultTheme[resolvedTheme];
    applyThemeVariables(themeVars, root);
  }, [resolvedTheme, customTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = document.documentElement;
      const newResolvedTheme = getSystemTheme();
      
      root.classList.remove("light", "dark");
      root.classList.add(newResolvedTheme);
      
      const themeVars = customTheme?.[newResolvedTheme] || defaultTheme[newResolvedTheme];
      applyThemeVariables(themeVars, root);
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, customTheme, getSystemTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  }, [storageKey]);

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        customTheme: customTheme || null,
        isLoadingTheme,
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export { defaultLightTheme, defaultDarkTheme };
