import { themeQuartz, iconSetAlpine, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz.withPart(iconSetAlpine).withParams({
  browserColorScheme: "inherit",
  spacing: 12,
  foregroundColor: "hsl(var(--foreground))",
  backgroundColor: "hsl(var(--card-background))",
  headerColumnResizeHandleColor: "hsl(var(--input))",
  oddRowBackgroundColor: "#FFFFFF0F",
  rowBorder: true,
  columnBorder: false,
  headerRowBorder: true,
  iconColor: "hsl(var(--muted-foreground))",
  borderColor: "hsl(var(--border))",
  chromeBackgroundColor: "hsl(var(--secondary))",
  cellHorizontalPaddingScale: 0.75,
  headerFontSize: 13,
  dragHandleColor: "hsl(var(--muted-foreground))",
  pinnedColumnBorder: true,
  wrapperBorder: true,
  headerHeight: 48,
});
