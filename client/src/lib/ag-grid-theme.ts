import { themeQuartz, iconSetAlpine, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz.withPart(iconSetAlpine).withParams({
  browserColorScheme: "dark",
  spacing: 12,
  foregroundColor: "hsl(var(--foreground))",
  backgroundColor: "hsl(var(--background))",
  headerColumnResizeHandleColor: "hsl(var(--input))",
  oddRowBackgroundColor: "#8888880F",
  rowBorder: true,
  columnBorder: true,

  iconColor: "hsl(var(--muted-foreground))",
  borderColor: "hsl(var(--border))",
  chromeBackgroundColor: "hsl(var(--secondary))",
  cellHorizontalPaddingScale: 0.75,
  headerFontSize: 13,
  dragHandleColor: "hsl(var(--muted-foreground))",
  pinnedColumnBorder: true,

});
