import { themeQuartz, iconSetMaterial } from "ag-grid-community";

export const gridTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    browserColorScheme: "light",
    headerFontSize: 14,
    spacing: 12,
    headerColumnResizeHandleColor: "#F3F3F3",
    oddRowBackgroundColor: "#00000006",
    rowBorder: false,
    iconColor: "#00000033",
    borderColor: "hsl(var(--border))",

  });
