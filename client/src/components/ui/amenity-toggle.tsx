import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { icons, HelpCircle, type LucideIcon } from "lucide-react";
import type { Amenity } from "@shared/schema";

function getIconComponent(iconName: string): LucideIcon {
  const icon = icons[iconName as keyof typeof icons];
  return (icon || HelpCircle) as LucideIcon;
}

interface AmenityToggleProps {
  selectedAmenityIds: string[];
  onAmenitiesChange: (amenityIds: string[]) => void;
  disabled?: boolean;
}

export function AmenityToggle({
  selectedAmenityIds,
  onAmenitiesChange,
  disabled = false,
}: AmenityToggleProps) {
  const { data: amenities = [], isLoading } = useQuery<Amenity[]>({
    queryKey: ["/api/amenities"],
  });

  const handleToggle = (amenityId: string) => {
    if (disabled) return;
    
    if (selectedAmenityIds.includes(amenityId)) {
      onAmenitiesChange(selectedAmenityIds.filter((id) => id !== amenityId));
    } else {
      onAmenitiesChange([...selectedAmenityIds, amenityId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-8 w-24 bg-muted animate-pulse rounded-md"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {amenities.map((amenity) => {
        const isSelected = selectedAmenityIds.includes(amenity.id);
        const IconComponent = getIconComponent(amenity.icon);

        return (
          <Badge
            key={amenity.id}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer gap-1.5 px-3 py-1.5 text-sm transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleToggle(amenity.id)}
            data-testid={`toggle-amenity-${amenity.id}`}
          >
            <IconComponent className="h-4 w-4" />
            {amenity.name}
          </Badge>
        );
      })}
    </div>
  );
}

interface AmenityDisplayProps {
  amenities: Amenity[];
  className?: string;
}

export function AmenityDisplay({ amenities, className }: AmenityDisplayProps) {
  if (amenities.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">No amenities assigned</span>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {amenities.map((amenity) => {
        const IconComponent = getIconComponent(amenity.icon);

        return (
          <Badge
            key={amenity.id}
            variant="outline"
            className="text-base gap-3 px-4 py-2 border-input rounded-full"
            data-testid={`display-amenity-${amenity.id}`}
          >
            <IconComponent className="h-5 w-5 stroke-[1.5px]" />
            {amenity.name}
          </Badge>
        );
      })}
    </div>
  );
}
