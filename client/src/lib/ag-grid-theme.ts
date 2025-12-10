import { themeQuartz, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz.withPart(iconSetMaterial).withParams({
  browserColorScheme: "dark",
  headerFontSize: 14,
  spacing: 12,
  foregroundColor: "hsl(var(--foreground))",
  backgroundColor: "hsl(var(--background))",
  headerColumnResizeHandleColor: "hsl(var(--border))",
  oddRowBackgroundColor: "#00000008",
  rowBorder: false,
  iconColor: "hsl(var(--input))",
  borderColor: "hsl(var(--border))",
  chromeBackgroundColor: "hsl(var(--secondary))",
  pinnedColumnBorder: false,
});
