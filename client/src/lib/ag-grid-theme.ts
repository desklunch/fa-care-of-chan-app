import { themeQuartz, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    browserColorScheme: "light",
    headerFontSize: 14,
    spacing: 12,
    headerColumnResizeHandleColor: "hsl(var(--border))",
    oddRowBackgroundColor: "hsl(var(--card))",
    rowBorder: false,
    iconColor: "hsl(var(--input))",
    borderColor: "hsl(var(--border))", 
    chromeBackgroundColor: "hsl(var(--sidebar))",
    pinnedColumnBorder: false
  });
