import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ThemeConfig, ThemeVariables, ThemeFonts, Theme } from "@shared/schema";

type Mode = "light" | "dark" | "system";

interface ThemeProviderState {
  theme: Mode;
  setTheme: (theme: Mode) => void;
  resolvedTheme: "light" | "dark";
  customTheme: ThemeConfig | null;
  isLoadingTheme: boolean;
  allThemes: Theme[];
  selectedThemeId: string | null;
  setSelectedThemeId: (id: string) => void;
  currentFonts: ThemeFonts;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const defaultLightTheme: ThemeVariables = {
  background: "33 43% 91%",
  foreground: "113 29% 6%",
  border: "41 32% 85%",
  card: "33 44% 95%",
  cardForeground: "113 29% 6%",
  cardBorder: "34 23% 88%",
  sidebar: "33 43% 89%",
  sidebarForeground: "0 0% 9%",
  sidebarBorder: "30 20% 81%",
  sidebarPrimary: "67 100% 50%",
  sidebarPrimaryForeground: "0 0% 98%",
  sidebarAccent: "67 100% 50%",
  sidebarAccentForeground: "113 29% 6%",
  sidebarRing: "67 100% 50%",
  popover: "33 43% 89%",
  popoverForeground: "113 29% 6%",
  popoverBorder: "32 20% 81%",
  primary: "113 29% 6%",
  primaryForeground: "67 100% 50%",
  secondary: "33 44% 86%",
  secondaryForeground: "0 0% 9%",
  muted: "33 44% 86%",
  mutedForeground: "0 0% 45%",
  accent: "217 15% 88%",
  accentForeground: "0 0% 9%",
  destructive: "0 84% 60%",
  destructiveForeground: "0 0% 98%",
  input: "0 0% 80%",
  ring: "67 100% 50%",
  chart1: "217 91% 35%",
  chart2: "173 58% 39%",
  chart3: "197 37% 24%",
  chart4: "43 74% 49%",
  chart5: "27 87% 67%",
  statusOnline: "142 71% 45%",
  statusAway: "38 92% 50%",
  statusBusy: "0 84% 60%",
  statusOffline: "220 9% 46%",
  statusProspecting: "194 100% 35%",
  statusWarmLead: "266 72% 41%",
  statusProposal: "320 62% 66%",
  statusFeedback: "32 46% 53%",
  statusContracting: "13 66% 59%",
  statusInProgress: "94 52% 42%",
  statusInvoicing: "217 57% 60%",
  statusComplete: "67 100% 50%",
  statusNoGo: "357 67% 58%",
  statusCanceled: "0 0% 10%",
  categoryFallback: "67 50% 35%",
};

const defaultDarkTheme: ThemeVariables = {
  background: "0 0% 9%",
  foreground: "0 0% 98%",
  border: "0 0% 20%",
  card: "0 0% 11%",
  cardForeground: "0 0% 98%",
  cardBorder: "0 0% 14%",
  sidebar: "0 0% 13%",
  sidebarForeground: "0 0% 98%",
  sidebarBorder: "0 0% 20%",
  sidebarPrimary: "67 100% 50%",
  sidebarPrimaryForeground: "0 0% 98%",
  sidebarAccent: "0 0% 16%",
  sidebarAccentForeground: "0 0% 98%",
  sidebarRing: "67 100% 50%",
  popover: "0 0% 18%",
  popoverForeground: "0 0% 98%",
  popoverBorder: "0 0% 16%",
  primary: "67 100% 50%",
  primaryForeground: "113 29% 6%",
  secondary: "0 0% 18%",
  secondaryForeground: "0 0% 98%",
  muted: "0 0% 17%",
  mutedForeground: "0 0% 63%",
  accent: "217 15% 17%",
  accentForeground: "0 0% 98%",
  destructive: "0 84% 60%",
  destructiveForeground: "0 0% 98%",
  input: "0 0% 24%",
  ring: "67 100% 50%",
  chart1: "217 91% 70%",
  chart2: "173 58% 65%",
  chart3: "197 37% 60%",
  chart4: "43 74% 70%",
  chart5: "27 87% 75%",
  statusOnline: "142 71% 45%",
  statusAway: "38 92% 50%",
  statusBusy: "0 72% 51%",
  statusOffline: "220 9% 46%",
  statusProspecting: "194 100% 42%",
  statusWarmLead: "266 72% 55%",
  statusProposal: "320 62% 66%",
  statusFeedback: "32 80% 65%",
  statusContracting: "13 66% 59%",
  statusInProgress: "89 61% 51%",
  statusInvoicing: "217 86% 65%",
  statusComplete: "67 100% 50%",
  statusNoGo: "358 48% 58%",
  statusCanceled: "0 0% 63%",
  categoryFallback: "67 50% 45%",
};

export const defaultTheme: ThemeConfig = {
  light: defaultLightTheme,
  dark: defaultDarkTheme,
  fonts: { headingFont: "Manrope", bodyFont: "Manrope" },
};

const defaultFonts: ThemeFonts = { headingFont: "Inter", bodyFont: "Inter" };

function cssVarName(key: string): string {
  return key.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

function applyThemeVariables(variables: ThemeVariables, root: HTMLElement) {
  Object.entries(variables).forEach(([key, value]) => {
    if (value === undefined) return;
    const cssVar = `--${cssVarName(key)}`;
    root.style.setProperty(cssVar, value);
  });
}

function applyFonts(fonts: ThemeFonts, root: HTMLElement) {
  root.style.setProperty("--font-heading", `"${fonts.headingFont}", sans-serif`);
  root.style.setProperty("--font-body", `"${fonts.bodyFont}", sans-serif`);
  root.style.setProperty("--font-sans", `"${fonts.bodyFont}", sans-serif`);
}

let currentFontLink: HTMLLinkElement | null = null;

function loadGoogleFonts(fonts: ThemeFonts) {
  const families = new Set<string>();
  if (fonts.headingFont && fonts.headingFont !== "Inter") families.add(fonts.headingFont);
  if (fonts.bodyFont && fonts.bodyFont !== "Inter") families.add(fonts.bodyFont);

  if (families.size === 0) {
    if (currentFontLink) {
      currentFontLink.remove();
      currentFontLink = null;
    }
    return;
  }

  const familyParams = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`)
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;

  if (currentFontLink && currentFontLink.href === href) return;

  if (currentFontLink) {
    currentFontLink.remove();
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  currentFontLink = link;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Mode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme: initialTheme = "system",
  storageKey = "app-theme",
}: ThemeProviderProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;

  const [theme, setThemeState] = useState<Mode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(storageKey) as Mode) || initialTheme;
    }
    return initialTheme;
  });

  const [selectedThemeId, setSelectedThemeIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selected-theme-id");
    }
    return null;
  });

  const { data: allThemes = [], isLoading: isLoadingThemes } = useQuery<Theme[]>({
    queryKey: ["/api/themes"],
    staleTime: 1000 * 60 * 5,
  });

  const { data: userPref } = useQuery<{ selectedThemeId: string | null }>({
    queryKey: ["/api/themes/user-preference"],
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: isAuthenticated,
  });

  const userPrefApplied = useRef(false);
  useEffect(() => {
    if (userPref?.selectedThemeId && !userPrefApplied.current) {
      userPrefApplied.current = true;
      localStorage.setItem("selected-theme-id", userPref.selectedThemeId);
      setSelectedThemeIdState(userPref.selectedThemeId);
    }
  }, [userPref]);

  const savePreferenceMutation = useMutation({
    mutationFn: (themeId: string) =>
      apiRequest("PUT", "/api/themes/user-preference", { selectedThemeId: themeId }),
  });

  const { data: legacyTheme } = useQuery<ThemeConfig | null>({
    queryKey: ["/api/settings/theme"],
    staleTime: 1000 * 60 * 5,
    enabled: allThemes.length === 0,
  });

  const activeTheme = allThemes.length > 0
    ? allThemes.find((t) => t.id === selectedThemeId)
      || allThemes.find((t) => t.name === "Care of Chan")
      || allThemes[0]
    : null;

  const customTheme: ThemeConfig | null = activeTheme
    ? {
        light: activeTheme.light as ThemeVariables,
        dark: activeTheme.dark as ThemeVariables,
        fonts: (activeTheme.fonts as ThemeFonts) || defaultFonts,
      }
    : legacyTheme || null;

  const currentFonts: ThemeFonts = customTheme?.fonts || defaultFonts;

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
    
    const themeConfig = customTheme || defaultTheme;
    const themeVars = themeConfig[resolvedTheme] || defaultTheme[resolvedTheme];
    applyThemeVariables(themeVars, root);

    const fonts = themeConfig.fonts || defaultFonts;
    applyFonts(fonts, root);
    loadGoogleFonts(fonts);
  }, [resolvedTheme, customTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = document.documentElement;
      const newResolvedTheme = getSystemTheme();
      
      root.classList.remove("light", "dark");
      root.classList.add(newResolvedTheme);
      
      const themeConfig = customTheme || defaultTheme;
      const themeVars = themeConfig[newResolvedTheme] || defaultTheme[newResolvedTheme];
      applyThemeVariables(themeVars, root);
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, customTheme, getSystemTheme]);

  const setTheme = useCallback((newTheme: Mode) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  }, [storageKey]);

  const setSelectedThemeId = useCallback((id: string) => {
    localStorage.setItem("selected-theme-id", id);
    setSelectedThemeIdState(id);
    if (isAuthenticated) {
      savePreferenceMutation.mutate(id);
    }
  }, [savePreferenceMutation, isAuthenticated]);

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        customTheme,
        isLoadingTheme: isLoadingThemes,
        allThemes,
        selectedThemeId: activeTheme?.id || null,
        setSelectedThemeId,
        currentFonts,
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
