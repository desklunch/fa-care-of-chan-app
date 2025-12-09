import { themeQuartz, iconSetMaterial } from "ag-grid-community";

const baseThemeParams = {
  headerFontSize: 14,
  spacing: 12,
  headerColumnResizeHandleColor: "hsl(var(--border))",
  oddRowBackgroundColor: "hsl(var(--card))",
  rowBorder: false,
  iconColor: "hsl(var(--input))",
  borderColor: "hsl(var(--border))", 
  chromeBackgroundColor: "hsl(var(--sidebar))",
  pinnedColumnBorder: false
};

export const gridThemeLight = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    ...baseThemeParams,
    browserColorScheme: "light",
  });

export const gridThemeDark = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    ...baseThemeParams,
    browserColorScheme: "dark",
  });

// Default export for backwards compatibility
export const gridTheme = gridThemeLight;
