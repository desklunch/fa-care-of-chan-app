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

const COMMON_ICONS = [
  "Accessibility", "Activity", "AirVent", "Alarm", "Album", "AlertCircle", "AlertTriangle",
  "AlignCenter", "AlignLeft", "AlignRight", "Anchor", "Aperture", "Apple", "Archive",
  "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "AtSign", "Award",
  "Baby", "Backpack", "Badge", "BadgeCheck", "Ban", "Banknote", "BarChart",
  "Battery", "BedDouble", "Beer", "Bell", "Bike", "Binary", "Bird", "Bitcoin",
  "Bluetooth", "Bold", "Bomb", "Book", "Bookmark", "Bot", "Box", "Brain",
  "Briefcase", "Brush", "Bug", "Building", "Bus", "Cake", "Calculator",
  "Calendar", "Camera", "Car", "CaseSensitive", "Cat", "Check", "CheckCircle",
  "ChefHat", "Cherry", "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp",
  "Chrome", "Circle", "Citrus", "Clipboard", "Clock", "Cloud", "Clover", "Code",
  "Coffee", "Cog", "Coins", "Columns", "Command", "Compass", "Computer",
  "Contact", "Cookie", "Copy", "Copyright", "CreditCard", "Croissant", "Crown",
  "Cup", "Database", "Delete", "Diamond", "Dice", "Dna", "Dog", "DollarSign",
  "Download", "Droplet", "Drum", "Dumbbell", "Ear", "Edit", "Egg", "ExternalLink",
  "Eye", "EyeOff", "Facebook", "FastForward", "Feather", "File", "FileText",
  "Film", "Filter", "Fingerprint", "Fire", "Fish", "Flag", "Flame", "Flashlight",
  "FlipHorizontal", "Flower", "Focus", "Folder", "Footprints", "Fork",
  "Forklift", "Forward", "Frame", "Frown", "Fuel", "Gamepad", "Gauge", "Gem",
  "Ghost", "Gift", "GitBranch", "Github", "Glasses", "Globe", "Goal", "Grab",
  "GraduationCap", "Grape", "Grid", "Grip", "Guitar", "Hammer", "Hand",
  "HandHeart", "HandMetal", "Handshake", "HardDrive", "Hash", "Headphones",
  "Heart", "HeartPulse", "HelpCircle", "Hexagon", "Highlighter", "History",
  "Home", "Hotel", "Hourglass", "IceCream", "Image", "Inbox", "Infinity", "Info",
  "Instagram", "Italic", "Key", "Keyboard", "Lamp", "Landmark", "Languages",
  "Laptop", "Laugh", "Layers", "Layout", "Leaf", "Library", "Lightbulb", "Link",
  "Linkedin", "List", "Loader", "Lock", "LogIn", "LogOut", "Lollipop", "Luggage",
  "Magnet", "Mail", "Map", "MapPin", "Maximize", "Medal", "Megaphone", "Meh",
  "Menu", "MessageCircle", "Mic", "Microscope", "Microwave", "Milestone", "Milk",
  "Minimize", "Minus", "Monitor", "Moon", "MoreHorizontal", "Mountain", "Mouse",
  "Move", "Music", "Navigation", "Network", "Newspaper", "NotepadText", "Nut",
  "Octagon", "Option", "Orbit", "Package", "Paintbrush", "Palette", "Palmtree",
  "Paperclip", "PartyPopper", "Pause", "PawPrint", "Pen", "Pencil", "Pentagon",
  "Percent", "Phone", "Piano", "PieChart", "Pill", "Pin", "Pizza", "Plane",
  "Play", "Plug", "Plus", "Pocket", "Podcast", "Popcorn", "Power", "Printer",
  "Projector", "Puzzle", "QrCode", "Quote", "Radio", "Rainbow", "Receipt",
  "Recycle", "Redo", "Refrigerator", "Repeat", "Reply", "Rewind", "Ribbon",
  "Rocket", "RockingChair", "Rotate", "Ruler", "Sailboat", "Salad", "Sandwich",
  "Satellite", "Save", "Scale", "Scan", "School", "Scissors", "ScreenShare",
  "Scroll", "Search", "Send", "Server", "Settings", "Shapes", "Share", "Sheet",
  "Shield", "Ship", "Shirt", "ShoppingBag", "ShoppingCart", "Shovel", "Shower",
  "Shrub", "Shuffle", "Sigma", "Signal", "Signpost", "SlidersHorizontal",
  "Smartphone", "Smile", "Snowflake", "Sofa", "Soup", "Sparkle", "Sparkles",
  "Speaker", "Spline", "Split", "Sprout", "Square", "Stamp", "Star", "Stethoscope",
  "Sticker", "StickyNote", "Stop", "Stopwatch", "Store", "StretchHorizontal",
  "Strikethrough", "Subscript", "Sun", "Sunrise", "Sunset", "Superscript", "Sword",
  "Syringe", "Table", "Tablet", "Tag", "Target", "Tent", "Terminal", "TestTube",
  "Text", "Thermometer", "ThumbsDown", "ThumbsUp", "Ticket", "Timer", "ToggleLeft",
  "ToggleRight", "Tornado", "Tractor", "TrafficCone", "Train", "Trash", "TreePine",
  "Trees", "Triangle", "Trophy", "Truck", "Tv", "Twitch", "Twitter", "Umbrella",
  "Underline", "Undo", "Unlink", "Unlock", "Upload", "Usb", "User", "Users",
  "Utensils", "UtensilsCrossed", "Vault", "Vegan", "Video", "Voicemail", "Volume",
  "Wallet", "Wand", "Watch", "Waves", "Webcam", "Weight", "Wifi", "Wind", "Wine",
  "Workflow", "Wrench", "X", "Youtube", "Zap", "ZoomIn", "ZoomOut",
];

const iconEntries = COMMON_ICONS.map((name) => ({
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
      return COMMON_ICONS;
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
