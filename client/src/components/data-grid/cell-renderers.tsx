import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DateCellProps {
  value: string | Date | null | undefined;
}

export function DateCellRenderer({ value }: DateCellProps) {
  if (!value) return null;

  const date = new Date(value);
  return (
    <div className="flex items-center h-full text-muted-foreground">
      {date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </div>
  );
}

interface BadgeCellProps {
  value: string | null | undefined;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function BadgeCellRenderer({ value, variant = "secondary" }: BadgeCellProps) {
  if (!value) return null;

  return (
    <div className="flex items-center h-full">
      <Badge variant={variant} className="font-normal">
        {value}
      </Badge>
    </div>
  );
}

interface RoleBadgeCellProps {
  value: string | null | undefined;
}

export function RoleBadgeCellRenderer({ value }: RoleBadgeCellProps) {
  const isAdmin = value === "admin";

  return (
    <div className="flex items-center h-full">
      <Badge variant={isAdmin ? "default" : "outline"} className="font-normal capitalize">
        {value}
      </Badge>
    </div>
  );
}

interface StatusCellProps {
  value: boolean | null | undefined;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusCellRenderer({
  value,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: StatusCellProps) {
  return (
    <div className="flex items-center h-full">
      <Badge variant={value ? "default" : "secondary"} className="font-normal">
        {value ? activeLabel : inactiveLabel}
      </Badge>
    </div>
  );
}

interface AvatarCellProps {
  imageUrl: string | null | undefined;
  name: string;
  fallbackClassName?: string;
}

export function AvatarCellRenderer({
  imageUrl,
  name,
  fallbackClassName = "bg-primary/10 text-primary",
}: AvatarCellProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="flex items-center h-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src={imageUrl || undefined} alt={name} />
        <AvatarFallback className={`${fallbackClassName} text-xs font-medium`}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

interface NameWithAvatarCellProps {
  name: string;
  imageUrl?: string | null;
}

export function NameWithAvatarCellRenderer({ name, imageUrl }: NameWithAvatarCellProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="flex items-center gap-3 h-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src={imageUrl || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium text-foreground">{name}</span>
    </div>
  );
}

interface TextCellProps {
  value: string | null | undefined;
  className?: string;
}

export function TextCellRenderer({ value, className = "" }: TextCellProps) {
  if (!value) return null;

  return (
    <div className={`flex items-center h-full ${className}`}>
      {value}
    </div>
  );
}
