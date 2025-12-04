import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { defaultTheme, defaultLightTheme, defaultDarkTheme } from "@/lib/theme-provider";
import type { ThemeConfig, ThemeVariables } from "@shared/schema";
import { Save, RotateCcw, Palette, Sun, Moon, Eye } from "lucide-react";

function hslToHex(hsl: string): string {
  const parts = hsl.split(" ");
  if (parts.length < 3) return "#808080";
  
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1]) / 100 || 0;
  const l = parseFloat(parts[2]) / 100 || 0;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorField({ label, value, onChange, description }: ColorFieldProps) {
  const hexValue = hslToHex(value);
  
  const handleHexInput = (inputValue: string) => {
    const cleanHex = inputValue.startsWith("#") ? inputValue : `#${inputValue}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      onChange(hexToHsl(cleanHex));
    }
  };
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-8 h-8 rounded cursor-pointer border border-border flex-shrink-0"
          data-testid={`color-picker-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <div className="min-w-0 flex-1">
          <Label className="text-sm font-medium truncate block">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      <Input
        value={hexValue}
        onChange={(e) => handleHexInput(e.target.value)}
        className="w-24 text-xs font-mono flex-shrink-0"
        placeholder="#000000"
        data-testid={`input-hex-${label.toLowerCase().replace(/\s+/g, "-")}`}
      />
    </div>
  );
}

interface ColorSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function ColorSection({ title, description, children }: ColorSectionProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-1">
        {children}
      </CardContent>
    </Card>
  );
}

export default function AdminThemeEditor() {
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");
  const [localTheme, setLocalTheme] = useState<ThemeConfig>(defaultTheme);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: savedTheme, isLoading } = useQuery<ThemeConfig | null>({
    queryKey: ["/api/settings/theme"],
  });
  
  useEffect(() => {
    if (savedTheme) {
      setLocalTheme(savedTheme);
    }
  }, [savedTheme]);
  
  const saveMutation = useMutation({
    mutationFn: async (theme: ThemeConfig) => {
      const response = await apiRequest("PATCH", "/api/settings/theme", theme);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/theme"] });
      setHasChanges(false);
      toast({
        title: "Theme saved",
        description: "Your theme changes have been saved and applied.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save theme",
        description: String(error),
        variant: "destructive",
      });
    },
  });
  
  const updateColor = (mode: "light" | "dark", key: keyof ThemeVariables, value: string) => {
    setLocalTheme((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };
  
  const resetToDefaults = () => {
    setLocalTheme(defaultTheme);
    setHasChanges(true);
    toast({
      title: "Theme reset",
      description: "Theme has been reset to defaults. Save to apply changes.",
    });
  };
  
  const resetModeToDefaults = (mode: "light" | "dark") => {
    const defaults = mode === "light" ? defaultLightTheme : defaultDarkTheme;
    setLocalTheme((prev) => ({
      ...prev,
      [mode]: defaults,
    }));
    setHasChanges(true);
    toast({
      title: `${mode === "light" ? "Light" : "Dark"} theme reset`,
      description: "Mode has been reset to defaults. Save to apply changes.",
    });
  };
  
  const currentVars = localTheme[activeMode];
  
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={resetToDefaults}
        data-testid="button-reset-all"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset All
      </Button>
      <Button
        onClick={() => saveMutation.mutate(localTheme)}
        disabled={!hasChanges || saveMutation.isPending}
        data-testid="button-save-theme"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Theme"}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[{ label: "Admin" }, { label: "Theme Editor" }]}
        customHeaderAction={headerActions}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      breadcrumbs={[{ label: "Admin" }, { label: "Theme Editor" }]}
      customHeaderAction={headerActions}
    >
      <div className="p-6 space-y-6">
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "light" | "dark")} data-testid="tabs-theme-mode">
        <div className="flex items-center justify-between mb-4">
          <TabsList data-testid="tabs-list-theme-mode">
            <TabsTrigger value="light" className="gap-2" data-testid="tab-light-mode">
              <Sun className="h-4 w-4" />
              Light Mode
            </TabsTrigger>
            <TabsTrigger value="dark" className="gap-2" data-testid="tab-dark-mode">
              <Moon className="h-4 w-4" />
              Dark Mode
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetModeToDefaults(activeMode)}
            data-testid="button-reset-mode"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset {activeMode === "light" ? "Light" : "Dark"} Mode
          </Button>
        </div>
        
        <TabsContent value="light" className="mt-0">
          <ThemeColorEditor
            vars={localTheme.light}
            onChange={(key, value) => updateColor("light", key, value)}
          />
        </TabsContent>
        
        <TabsContent value="dark" className="mt-0">
          <ThemeColorEditor
            vars={localTheme.dark}
            onChange={(key, value) => updateColor("dark", key, value)}
          />
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            Live preview of your theme changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePreview vars={currentVars} mode={activeMode} />
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}

interface ThemeColorEditorProps {
  vars: ThemeVariables;
  onChange: (key: keyof ThemeVariables, value: string) => void;
}

function ThemeColorEditor({ vars, onChange }: ThemeColorEditorProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <ColorSection title="Background & Foreground" description="Main application colors">
          <ColorField
            label="Background"
            value={vars.background}
            onChange={(v) => onChange("background", v)}
            description="Main page background"
          />
          <ColorField
            label="Foreground"
            value={vars.foreground}
            onChange={(v) => onChange("foreground", v)}
            description="Primary text color"
          />
          <ColorField
            label="Border"
            value={vars.border}
            onChange={(v) => onChange("border", v)}
            description="Default border color"
          />
          <ColorField
            label="Input"
            value={vars.input}
            onChange={(v) => onChange("input", v)}
            description="Input field borders"
          />
          <ColorField
            label="Ring"
            value={vars.ring}
            onChange={(v) => onChange("ring", v)}
            description="Focus ring color"
          />
        </ColorSection>
        
        <ColorSection title="Cards" description="Card component colors">
          <ColorField
            label="Card Background"
            value={vars.card}
            onChange={(v) => onChange("card", v)}
          />
          <ColorField
            label="Card Foreground"
            value={vars.cardForeground}
            onChange={(v) => onChange("cardForeground", v)}
          />
          <ColorField
            label="Card Border"
            value={vars.cardBorder}
            onChange={(v) => onChange("cardBorder", v)}
          />
        </ColorSection>
        
        <ColorSection title="Popover" description="Dropdown and popover colors">
          <ColorField
            label="Popover Background"
            value={vars.popover}
            onChange={(v) => onChange("popover", v)}
          />
          <ColorField
            label="Popover Foreground"
            value={vars.popoverForeground}
            onChange={(v) => onChange("popoverForeground", v)}
          />
          <ColorField
            label="Popover Border"
            value={vars.popoverBorder}
            onChange={(v) => onChange("popoverBorder", v)}
          />
        </ColorSection>
      </div>
      
      <div>
        <ColorSection title="Primary Colors" description="Main action colors">
          <ColorField
            label="Primary"
            value={vars.primary}
            onChange={(v) => onChange("primary", v)}
            description="Primary buttons and links"
          />
          <ColorField
            label="Primary Foreground"
            value={vars.primaryForeground}
            onChange={(v) => onChange("primaryForeground", v)}
          />
        </ColorSection>
        
        <ColorSection title="Secondary & Muted" description="Secondary elements">
          <ColorField
            label="Secondary"
            value={vars.secondary}
            onChange={(v) => onChange("secondary", v)}
          />
          <ColorField
            label="Secondary Foreground"
            value={vars.secondaryForeground}
            onChange={(v) => onChange("secondaryForeground", v)}
          />
          <ColorField
            label="Muted"
            value={vars.muted}
            onChange={(v) => onChange("muted", v)}
          />
          <ColorField
            label="Muted Foreground"
            value={vars.mutedForeground}
            onChange={(v) => onChange("mutedForeground", v)}
            description="Subdued text color"
          />
        </ColorSection>
        
        <ColorSection title="Accent & Destructive" description="Accent and warning colors">
          <ColorField
            label="Accent"
            value={vars.accent}
            onChange={(v) => onChange("accent", v)}
          />
          <ColorField
            label="Accent Foreground"
            value={vars.accentForeground}
            onChange={(v) => onChange("accentForeground", v)}
          />
          <ColorField
            label="Destructive"
            value={vars.destructive}
            onChange={(v) => onChange("destructive", v)}
            description="Delete and error states"
          />
          <ColorField
            label="Destructive Foreground"
            value={vars.destructiveForeground}
            onChange={(v) => onChange("destructiveForeground", v)}
          />
        </ColorSection>
        
        <ColorSection title="Sidebar" description="Navigation sidebar colors">
          <ColorField
            label="Sidebar Background"
            value={vars.sidebar}
            onChange={(v) => onChange("sidebar", v)}
          />
          <ColorField
            label="Sidebar Foreground"
            value={vars.sidebarForeground}
            onChange={(v) => onChange("sidebarForeground", v)}
          />
          <ColorField
            label="Sidebar Border"
            value={vars.sidebarBorder}
            onChange={(v) => onChange("sidebarBorder", v)}
          />
          <ColorField
            label="Sidebar Primary"
            value={vars.sidebarPrimary}
            onChange={(v) => onChange("sidebarPrimary", v)}
          />
          <ColorField
            label="Sidebar Primary Foreground"
            value={vars.sidebarPrimaryForeground}
            onChange={(v) => onChange("sidebarPrimaryForeground", v)}
          />
          <ColorField
            label="Sidebar Accent"
            value={vars.sidebarAccent}
            onChange={(v) => onChange("sidebarAccent", v)}
          />
          <ColorField
            label="Sidebar Accent Foreground"
            value={vars.sidebarAccentForeground}
            onChange={(v) => onChange("sidebarAccentForeground", v)}
          />
          <ColorField
            label="Sidebar Ring"
            value={vars.sidebarRing}
            onChange={(v) => onChange("sidebarRing", v)}
          />
        </ColorSection>
        
        <ColorSection title="Charts" description="Data visualization colors">
          <ColorField
            label="Chart 1"
            value={vars.chart1}
            onChange={(v) => onChange("chart1", v)}
          />
          <ColorField
            label="Chart 2"
            value={vars.chart2}
            onChange={(v) => onChange("chart2", v)}
          />
          <ColorField
            label="Chart 3"
            value={vars.chart3}
            onChange={(v) => onChange("chart3", v)}
          />
          <ColorField
            label="Chart 4"
            value={vars.chart4}
            onChange={(v) => onChange("chart4", v)}
          />
          <ColorField
            label="Chart 5"
            value={vars.chart5}
            onChange={(v) => onChange("chart5", v)}
          />
        </ColorSection>
      </div>
    </div>
  );
}

interface ThemePreviewProps {
  vars: ThemeVariables;
  mode: "light" | "dark";
}

function ThemePreview({ vars, mode }: ThemePreviewProps) {
  const style = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      return [`--${cssVar}`, value];
    })
  ) as React.CSSProperties;
  
  return (
    <div
      className={`p-6 rounded-lg border ${mode === "dark" ? "dark" : ""}`}
      style={{
        ...style,
        backgroundColor: `hsl(${vars.background})`,
        color: `hsl(${vars.foreground})`,
        borderColor: `hsl(${vars.border})`,
      }}
      data-testid="preview-container"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="px-4 py-2 rounded-md font-medium text-sm"
            style={{
              backgroundColor: `hsl(${vars.primary})`,
              color: `hsl(${vars.primaryForeground})`,
            }}
            data-testid="preview-primary-button"
          >
            Primary Button
          </div>
          <div
            className="px-4 py-2 rounded-md font-medium text-sm border"
            style={{
              backgroundColor: `hsl(${vars.secondary})`,
              color: `hsl(${vars.secondaryForeground})`,
              borderColor: `hsl(${vars.border})`,
            }}
            data-testid="preview-secondary-button"
          >
            Secondary
          </div>
          <div
            className="px-4 py-2 rounded-md font-medium text-sm"
            style={{
              backgroundColor: `hsl(${vars.destructive})`,
              color: `hsl(${vars.destructiveForeground})`,
            }}
            data-testid="preview-destructive-button"
          >
            Destructive
          </div>
        </div>
        
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: `hsl(${vars.card})`,
            borderColor: `hsl(${vars.cardBorder})`,
          }}
          data-testid="preview-card"
        >
          <h3 className="font-semibold mb-2" style={{ color: `hsl(${vars.cardForeground})` }}>
            Card Example
          </h3>
          <p style={{ color: `hsl(${vars.mutedForeground})` }} data-testid="preview-muted-text">
            This is muted text inside a card component.
          </p>
        </div>
        
        <div className="flex gap-2" data-testid="preview-chart-colors">
          {[vars.chart1, vars.chart2, vars.chart3, vars.chart4, vars.chart5].map((color, i) => (
            <div
              key={i}
              className="h-8 flex-1 rounded"
              style={{ backgroundColor: `hsl(${color})` }}
              data-testid={`preview-chart-${i + 1}`}
            />
          ))}
        </div>
        
        <div
          className="p-3 rounded-lg"
          style={{
            backgroundColor: `hsl(${vars.accent})`,
            color: `hsl(${vars.accentForeground})`,
          }}
          data-testid="preview-accent"
        >
          Accent background with accent foreground text
        </div>
      </div>
    </div>
  );
}
