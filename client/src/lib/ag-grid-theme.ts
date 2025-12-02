import { themeQuartz, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    browserColorScheme: "light",
    headerFontSize: 14,
    spacing: 12,
    headerColumnResizeHandleColor: "#F3F3F3",
    oddRowBackgroundColor: "hsl(var(--card))",
    rowBorder: false,
    iconColor: "hsl(var(--input))",
    borderColor: "hsl(var(--border))", 
    chromeBackgroundColor: "hsl(var(--sidebar))",

  });
