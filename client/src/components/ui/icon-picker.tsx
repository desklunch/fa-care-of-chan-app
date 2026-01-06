import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import Fuse from "fuse.js";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICON_NAMES = Object.keys(LucideIcons).filter(
  (key) =>
    key !== "createLucideIcon" &&
    key !== "default" &&
    key !== "icons" &&
    !key.startsWith("Lucide") &&
    typeof (LucideIcons as Record<string, unknown>)[key] === "function"
);

const iconEntries = ICON_NAMES.map((name) => ({
  name,
  searchName: name.toLowerCase().replace(/([A-Z])/g, " $1").trim(),
}));

const fuse = new Fuse(iconEntries, {
  keys: ["name", "searchName"],
  threshold: 0.3,
  ignoreLocation: true,
});

interface IconPickerProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function IconPicker({
  value,
  onValueChange,
  placeholder = "Select an icon",
  disabled = false,
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      return ICON_NAMES;
    }
    return fuse.search(search).map((result) => result.item.name);
  }, [search]);

  const handleSelect = useCallback(
    (iconName: string) => {
      onValueChange?.(iconName);
      setOpen(false);
      setSearch("");
    },
    [onValueChange]
  );

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, search]);

  const SelectedIcon = value
    ? (LucideIcons as unknown as Record<string, IconComponent>)[value]
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-start gap-2", className)}
          data-testid="button-icon-picker"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4" />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            data-testid="input-icon-search"
          />
        </div>
        <ScrollArea className="h-[280px]" ref={scrollRef}>
          <div className="p-2">
            {filteredIcons.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">
                No icons found
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {filteredIcons.slice(0, 150).map((iconName) => {
                  const Icon = (LucideIcons as unknown as Record<string, IconComponent>)[
                    iconName
                  ];
                  if (!Icon) return null;
                  const isSelected = value === iconName;
                  return (
                    <Tooltip key={iconName}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isSelected ? "secondary" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-9 w-9",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={() => handleSelect(iconName)}
                          data-testid={`icon-option-${iconName}`}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {iconName}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}
            {filteredIcons.length > 150 && (
              <div className="text-center text-muted-foreground py-2 text-xs">
                Showing 150 of {filteredIcons.length} icons. Use search to find
                more.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface IconDisplayProps {
  name: string;
  className?: string;
}

export function IconDisplay({ name, className }: IconDisplayProps) {
  const Icon = (LucideIcons as unknown as Record<string, IconComponent>)[name];
  if (!Icon) {
    return <LucideIcons.HelpCircle className={className} />;
  }
  return <Icon className={className} />;
}
