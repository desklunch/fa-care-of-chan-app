import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageLayout } from "@/framework";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { defaultTheme, defaultLightTheme, defaultDarkTheme } from "@/lib/theme-provider";
import type { ThemeConfig, ThemeVariables, Theme, ThemeFonts } from "@shared/schema";
import { Save, RotateCcw, Palette, Sun, Moon, Eye, Plus, Copy, Trash2, Type, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const POPULAR_FONTS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
  "Source Sans 3", "Nunito", "Raleway", "DM Sans", "Space Grotesk",
  "Playfair Display", "Merriweather", "Libre Baskerville", "Lora",
  "PT Serif", "Work Sans", "Rubik", "Outfit", "Plus Jakarta Sans",
  "Manrope", "Sora", "Lexend", "Geist",
];

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = POPULAR_FONTS.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="">
        <span className="font-medium" style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
      </p>
      <div className="relative">
        <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fonts..."
          className="pl-8 h-10"
          data-testid={`input-font-search-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
      </div>
      <ScrollArea className="h-40 border rounded-md">
        <div className="p-1">
          {filtered.map((font) => (
            <button
              key={font}
              onClick={() => { onChange(font); setSearch(""); }}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded text-sm hover-elevate",
                font === value && "bg-primary text-primary-foreground"
              )}
              style={{ fontFamily: `"${font}", sans-serif` }}
              data-testid={`button-font-${font.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {font}
            </button>
          ))}
          {filtered.length === 0 && search && (
            <button
              onClick={() => { onChange(search); setSearch(""); }}
              className="w-full text-left px-3 py-1.5 rounded text-sm hover-elevate text-muted-foreground"
              data-testid="button-font-custom"
            >
              Use "{search}" (custom Google Font)
            </button>
          )}
        </div>
      </ScrollArea>

    </div>
  );
}

function ThemeListItem({ theme, isSelected, onSelect, onDuplicate, onDelete }: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const lightVars = theme.light as ThemeVariables;
  const darkVars = theme.dark as ThemeVariables;

  return (
    <div
      className={cn(
        "p-2 rounded-md cursor-pointer border transition-colors",
        isSelected ? "border-primary bg-primary/10" : "border-transparent bg-primary/5 hover-elevate"
      )}
      onClick={onSelect}
      data-testid={`theme-list-item-${theme.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium flex-1 truncate" data-testid={`text-theme-name-${theme.id}`}>
          {theme.name}
        </span>
        {theme.isBuiltIn && <Badge variant="secondary" className="text-[10px]">Built-in</Badge>}
      </div>
      <div className="flex gap-1 mb-2">
        {[lightVars.primary, lightVars.accent, lightVars.background, lightVars.card, lightVars.sidebar].map((color, i) => (
          <div
            key={i}
            className="h-4 flex-1 rounded-sm"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 w-7 text-xs "
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          data-testid={`button-duplicate-theme-${theme.id}`}
        >
          <Copy className="h-3 w-3 mr-1" />
          
        </Button>
        {!theme.isBuiltIn && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 w-7 text-xs text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            data-testid={`button-delete-theme-${theme.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminThemeEditor() {
  usePageTitle("Theme Editor");
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [localLight, setLocalLight] = useState<ThemeVariables>(defaultLightTheme);
  const [localDark, setLocalDark] = useState<ThemeVariables>(defaultDarkTheme);
  const [localFonts, setLocalFonts] = useState<ThemeFonts>({ headingFont: "Inter", bodyFont: "Inter" });
  const [localName, setLocalName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  
  const { data: allThemes = [], isLoading } = useQuery<Theme[]>({
    queryKey: ["/api/themes"],
  });

  useEffect(() => {
    if (allThemes.length > 0 && !selectedThemeId) {
      setSelectedThemeId(allThemes[0].id);
    }
  }, [allThemes, selectedThemeId]);

  useEffect(() => {
    const theme = allThemes.find((t) => t.id === selectedThemeId);
    if (theme) {
      setLocalLight(theme.light as ThemeVariables);
      setLocalDark(theme.dark as ThemeVariables);
      setLocalFonts((theme.fonts as ThemeFonts) || { headingFont: "Inter", bodyFont: "Inter" });
      setLocalName(theme.name);
      setHasChanges(false);
    }
  }, [selectedThemeId, allThemes]);

  const selectedTheme = allThemes.find((t) => t.id === selectedThemeId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThemeId) return;
      const response = await apiRequest("PATCH", `/api/themes/${selectedThemeId}`, {
        name: localName,
        light: localLight,
        dark: localDark,
        fonts: localFonts,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/theme"] });
      setHasChanges(false);
      toast({ title: "Theme saved", description: "Your theme changes have been saved and applied." });
    },
    onError: (error) => {
      toast({ title: "Failed to save theme", description: String(error), variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/themes", {
        name,
        light: defaultLightTheme,
        dark: defaultDarkTheme,
        fonts: { headingFont: "Inter", bodyFont: "Inter" },
        isBuiltIn: false,
      });
      return response.json();
    },
    onSuccess: (newTheme: Theme) => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      setSelectedThemeId(newTheme.id);
      setCreateDialogOpen(false);
      setNewThemeName("");
      toast({ title: "Theme created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create theme", description: String(error), variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest("POST", `/api/themes/${id}/duplicate`, { name });
      return response.json();
    },
    onSuccess: (newTheme: Theme) => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      setSelectedThemeId(newTheme.id);
      toast({ title: "Theme duplicated" });
    },
    onError: (error) => {
      toast({ title: "Failed to duplicate theme", description: String(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/themes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      if (allThemes.length > 1) {
        const remaining = allThemes.filter((t) => t.id !== selectedThemeId);
        setSelectedThemeId(remaining[0]?.id || null);
      }
      toast({ title: "Theme deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete theme", description: String(error), variant: "destructive" });
    },
  });
  
  const updateColor = (mode: "light" | "dark", key: keyof ThemeVariables, value: string) => {
    if (mode === "light") {
      setLocalLight((prev) => ({ ...prev, [key]: value }));
    } else {
      setLocalDark((prev) => ({ ...prev, [key]: value }));
    }
    setHasChanges(true);
  };
  
  const resetModeToDefaults = (mode: "light" | "dark") => {
    const defaults = mode === "light" ? defaultLightTheme : defaultDarkTheme;
    if (mode === "light") setLocalLight(defaults);
    else setLocalDark(defaults);
    setHasChanges(true);
    toast({
      title: `${mode === "light" ? "Light" : "Dark"} theme reset`,
      description: "Mode has been reset to defaults. Save to apply changes.",
    });
  };
  
  const currentVars = activeMode === "light" ? localLight : localDark;
  
  const primaryAction = {
    label: saveMutation.isPending ? "Saving..." : "Save Theme",
    icon: Save,
    variant: "default" as const,
    onClick: () => saveMutation.mutate(),
    disabled: !hasChanges,
  };

  if (isLoading) {
    return (
      <PageLayout 
        breadcrumbs={[{ label: "Admin" }, { label: "Theme Editor" }]}
        primaryAction={primaryAction}
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
      primaryAction={primaryAction}
    >
      <div className="flex gap-0 h-full overflow-hidden ">
        <div className="w-64 sticky top-0 flex-shrink-0 space-y-2 border-r p-2">
          <div className="gap-1 space-y-2 ">
            <h3 className="text-xs uppercase font-semibold text-muted-foreground ">Themes</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              data-testid="button-create-theme"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" /> New Theme
            </Button>
          </div>
          <div className="space-y-1">
            {allThemes.map((theme) => (
              <ThemeListItem
                key={theme.id}
                theme={theme}
                isSelected={theme.id === selectedThemeId}
                onSelect={() => setSelectedThemeId(theme.id)}
                onDuplicate={() => duplicateMutation.mutate({ id: theme.id, name: `${theme.name} (Copy)` })}
                onDelete={() => deleteMutation.mutate(theme.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-4 overflow-y-scroll h-full  ">
          {selectedTheme && (
            <>
              <div className="mb-4">
                <Label className="text-sm font-medium">Theme Name</Label>
                <Input
                  value={localName}
                  onChange={(e) => { setLocalName(e.target.value); setHasChanges(true); }}
                  className="mt-1 "
                  data-testid="input-theme-name"
                />
              </div>

              <Card className="mb-4">
                <CardHeader className="!p-4 !pb-0 ">
                  <CardTitle className="text-base flex items-center gap-2 ">
                    <Type className="h-4 w-4" />
                    Fonts
                  </CardTitle>
                  {/* <CardDescription>Choose fonts from Google Fonts for headings and body text</CardDescription> */}
                </CardHeader>
                <CardContent className="!p-4 ">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FontPicker
                      label="Heading Font"
                      value={localFonts.headingFont}
                      onChange={(v) => { setLocalFonts((prev) => ({ ...prev, headingFont: v })); setHasChanges(true); }}
                    />
                    <FontPicker
                      label="Body Font"
                      value={localFonts.bodyFont}
                      onChange={(v) => { setLocalFonts((prev) => ({ ...prev, bodyFont: v })); setHasChanges(true); }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "light" | "dark")} data-testid="tabs-theme-mode">
                <div className="flex items-center justify-between gap-2 flex-wrap">
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
                
                <TabsContent value="light" className="mt-2 space-y-4 !p-0">
                  <ThemeColorEditor
                    vars={localLight}
                    onChange={(key, value) => updateColor("light", key, value)}
                  />
                </TabsContent>
                
                <TabsContent value="dark" className="mt-2 space-y-4 !p-0">
                  <ThemeColorEditor
                    vars={localDark}
                    onChange={(key, value) => updateColor("dark", key, value)}
                  />
                </TabsContent>
              </Tabs>
              
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview
                  </CardTitle>
                  <CardDescription>Live preview of your theme changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ThemePreview vars={currentVars} mode={activeMode} fonts={localFonts} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
            <DialogDescription>Enter a name for your new theme. It will start with default colors.</DialogDescription>
          </DialogHeader>
          <Input
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="My Custom Theme"
            data-testid="input-new-theme-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create-theme">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newThemeName)}
              disabled={!newThemeName.trim() || createMutation.isPending}
              data-testid="button-confirm-create-theme"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <ColorField label="Background" value={vars.background} onChange={(v) => onChange("background", v)} description="Main page background" />
          <ColorField label="Foreground" value={vars.foreground} onChange={(v) => onChange("foreground", v)} description="Primary text color" />
          <ColorField label="Border" value={vars.border} onChange={(v) => onChange("border", v)} description="Default border color" />
          <ColorField label="Input" value={vars.input} onChange={(v) => onChange("input", v)} description="Input field borders" />
          <ColorField label="Ring" value={vars.ring} onChange={(v) => onChange("ring", v)} description="Focus ring color" />
        </ColorSection>
        
        <ColorSection title="Cards" description="Card component colors">
          <ColorField label="Card Background" value={vars.card} onChange={(v) => onChange("card", v)} />
          <ColorField label="Card Foreground" value={vars.cardForeground} onChange={(v) => onChange("cardForeground", v)} />
          <ColorField label="Card Border" value={vars.cardBorder} onChange={(v) => onChange("cardBorder", v)} />
        </ColorSection>
        
        <ColorSection title="Popover" description="Dropdown and popover colors">
          <ColorField label="Popover Background" value={vars.popover} onChange={(v) => onChange("popover", v)} />
          <ColorField label="Popover Foreground" value={vars.popoverForeground} onChange={(v) => onChange("popoverForeground", v)} />
          <ColorField label="Popover Border" value={vars.popoverBorder} onChange={(v) => onChange("popoverBorder", v)} />
        </ColorSection>

        <ColorSection title="Presence Indicators" description="Presence and status colors">
          <ColorField label="Online" value={vars.statusOnline || "142 71% 45%"} onChange={(v) => onChange("statusOnline", v)} description="Online presence indicator" />
          <ColorField label="Away" value={vars.statusAway || "38 92% 50%"} onChange={(v) => onChange("statusAway", v)} description="Away presence indicator" />
          <ColorField label="Busy" value={vars.statusBusy || "0 84% 60%"} onChange={(v) => onChange("statusBusy", v)} description="Busy presence indicator" />
          <ColorField label="Offline" value={vars.statusOffline || "220 9% 46%"} onChange={(v) => onChange("statusOffline", v)} description="Offline presence indicator" />
        </ColorSection>

        <ColorSection title="Deal Status Colors" description="Pipeline stage colors for deal badges and kanban">
          <ColorField label="Prospecting" value={vars.statusProspecting || "194 100% 35%"} onChange={(v) => onChange("statusProspecting", v)} description="Prospecting stage" />
          <ColorField label="Warm Lead" value={vars.statusWarmLead || "266 72% 41%"} onChange={(v) => onChange("statusWarmLead", v)} description="Warm lead stage" />
          <ColorField label="Proposal" value={vars.statusProposal || "320 62% 66%"} onChange={(v) => onChange("statusProposal", v)} description="Proposal stage" />
          <ColorField label="Feedback" value={vars.statusFeedback || "32 46% 53%"} onChange={(v) => onChange("statusFeedback", v)} description="Feedback/waiting stage" />
          <ColorField label="Contracting" value={vars.statusContracting || "13 66% 59%"} onChange={(v) => onChange("statusContracting", v)} description="Contracting stage" />
          <ColorField label="In Progress" value={vars.statusInProgress || "94 52% 42%"} onChange={(v) => onChange("statusInProgress", v)} description="In progress stage" />
          <ColorField label="Invoicing" value={vars.statusInvoicing || "217 57% 60%"} onChange={(v) => onChange("statusInvoicing", v)} description="Invoicing stage" />
          <ColorField label="Complete" value={vars.statusComplete || "67 100% 50%"} onChange={(v) => onChange("statusComplete", v)} description="Completed deals" />
          <ColorField label="No-Go" value={vars.statusNoGo || "357 67% 58%"} onChange={(v) => onChange("statusNoGo", v)} description="No-go/lost deals" />
          <ColorField label="Canceled" value={vars.statusCanceled || "0 0% 10%"} onChange={(v) => onChange("statusCanceled", v)} description="Canceled deals" />
        </ColorSection>
        <ColorSection title="Feature Category Colors" description="Fallback colors for feature categories and kanban columns">
          <ColorField label="Category Fallback" value={vars.categoryFallback || "217 14% 50%"} onChange={(v) => onChange("categoryFallback", v)} description="Default color for categories without a custom color" />
        </ColorSection>
      </div>
      
      <div>
        <ColorSection title="Primary Colors" description="Main action colors">
          <ColorField label="Primary" value={vars.primary} onChange={(v) => onChange("primary", v)} description="Primary buttons and links" />
          <ColorField label="Primary Foreground" value={vars.primaryForeground} onChange={(v) => onChange("primaryForeground", v)} />
        </ColorSection>
        
        <ColorSection title="Secondary & Muted" description="Secondary elements">
          <ColorField label="Secondary" value={vars.secondary} onChange={(v) => onChange("secondary", v)} />
          <ColorField label="Secondary Foreground" value={vars.secondaryForeground} onChange={(v) => onChange("secondaryForeground", v)} />
          <ColorField label="Muted" value={vars.muted} onChange={(v) => onChange("muted", v)} />
          <ColorField label="Muted Foreground" value={vars.mutedForeground} onChange={(v) => onChange("mutedForeground", v)} description="Subdued text color" />
        </ColorSection>
        
        <ColorSection title="Accent & Destructive" description="Accent and warning colors">
          <ColorField label="Accent" value={vars.accent} onChange={(v) => onChange("accent", v)} />
          <ColorField label="Accent Foreground" value={vars.accentForeground} onChange={(v) => onChange("accentForeground", v)} />
          <ColorField label="Destructive" value={vars.destructive} onChange={(v) => onChange("destructive", v)} description="Delete and error states" />
          <ColorField label="Destructive Foreground" value={vars.destructiveForeground} onChange={(v) => onChange("destructiveForeground", v)} />
        </ColorSection>
        
        <ColorSection title="Sidebar" description="Navigation sidebar colors">
          <ColorField label="Sidebar Background" value={vars.sidebar} onChange={(v) => onChange("sidebar", v)} />
          <ColorField label="Sidebar Foreground" value={vars.sidebarForeground} onChange={(v) => onChange("sidebarForeground", v)} />
          <ColorField label="Sidebar Border" value={vars.sidebarBorder} onChange={(v) => onChange("sidebarBorder", v)} />
          <ColorField label="Sidebar Primary" value={vars.sidebarPrimary} onChange={(v) => onChange("sidebarPrimary", v)} />
          <ColorField label="Sidebar Primary Foreground" value={vars.sidebarPrimaryForeground} onChange={(v) => onChange("sidebarPrimaryForeground", v)} />
          <ColorField label="Sidebar Accent" value={vars.sidebarAccent} onChange={(v) => onChange("sidebarAccent", v)} />
          <ColorField label="Sidebar Accent Foreground" value={vars.sidebarAccentForeground} onChange={(v) => onChange("sidebarAccentForeground", v)} />
          <ColorField label="Sidebar Ring" value={vars.sidebarRing} onChange={(v) => onChange("sidebarRing", v)} />
        </ColorSection>
        
        <ColorSection title="Charts" description="Data visualization colors">
          <ColorField label="Chart 1" value={vars.chart1} onChange={(v) => onChange("chart1", v)} />
          <ColorField label="Chart 2" value={vars.chart2} onChange={(v) => onChange("chart2", v)} />
          <ColorField label="Chart 3" value={vars.chart3} onChange={(v) => onChange("chart3", v)} />
          <ColorField label="Chart 4" value={vars.chart4} onChange={(v) => onChange("chart4", v)} />
          <ColorField label="Chart 5" value={vars.chart5} onChange={(v) => onChange("chart5", v)} />
        </ColorSection>
      </div>
    </div>
  );
}

interface ThemePreviewProps {
  vars: ThemeVariables;
  mode: "light" | "dark";
  fonts?: ThemeFonts;
}

function ThemePreview({ vars, mode, fonts }: ThemePreviewProps) {
  const style = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => {
      if (value === undefined) return [`--${key}`, ""];
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
        fontFamily: fonts ? `"${fonts.bodyFont}", sans-serif` : undefined,
      }}
      data-testid="preview-container"
    >
      <div className="space-y-4">
        {fonts && (
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: `"${fonts.headingFont}", sans-serif` }}
            data-testid="preview-heading-font"
          >
            Heading in {fonts.headingFont}
          </h2>
        )}
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="px-4 py-2 rounded-md font-medium text-sm"
            style={{ backgroundColor: `hsl(${vars.primary})`, color: `hsl(${vars.primaryForeground})` }}
            data-testid="preview-primary-button"
          >
            Primary Button
          </div>
          <div
            className="px-4 py-2 rounded-md font-medium text-sm border"
            style={{ backgroundColor: `hsl(${vars.secondary})`, color: `hsl(${vars.secondaryForeground})`, borderColor: `hsl(${vars.border})` }}
            data-testid="preview-secondary-button"
          >
            Secondary
          </div>
          <div
            className="px-4 py-2 rounded-md font-medium text-sm"
            style={{ backgroundColor: `hsl(${vars.destructive})`, color: `hsl(${vars.destructiveForeground})` }}
            data-testid="preview-destructive-button"
          >
            Destructive
          </div>
        </div>
        
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: `hsl(${vars.card})`, borderColor: `hsl(${vars.cardBorder})` }}
          data-testid="preview-card"
        >
          <h3 className="font-semibold mb-2" style={{ color: `hsl(${vars.cardForeground})`, fontFamily: fonts ? `"${fonts.headingFont}", sans-serif` : undefined }}>
            Card Example
          </h3>
          <p style={{ color: `hsl(${vars.mutedForeground})` }} data-testid="preview-muted-text">
            This is muted text inside a card component.
          </p>
        </div>

        <div className="flex items-center gap-3" data-testid="preview-status-indicators">
          {[
            { label: "Online", color: vars.statusOnline || "142 71% 45%" },
            { label: "Away", color: vars.statusAway || "38 92% 50%" },
            { label: "Busy", color: vars.statusBusy || "0 84% 60%" },
            { label: "Offline", color: vars.statusOffline || "220 9% 46%" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${color})` }} />
              <span className="text-xs" style={{ color: `hsl(${vars.mutedForeground})` }}>{label}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2" data-testid="preview-chart-colors">
          {[vars.chart1, vars.chart2, vars.chart3, vars.chart4, vars.chart5].map((color, i) => (
            <div key={i} className="h-8 flex-1 rounded" style={{ backgroundColor: `hsl(${color})` }} data-testid={`preview-chart-${i + 1}`} />
          ))}
        </div>
        
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `hsl(${vars.accent})`, color: `hsl(${vars.accentForeground})` }}
          data-testid="preview-accent"
        >
          Accent background with accent foreground text
        </div>
      </div>
    </div>
  );
}
