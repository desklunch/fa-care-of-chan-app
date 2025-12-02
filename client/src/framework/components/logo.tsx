import { Building2 } from "lucide-react";

interface LogoProps {
  className?: string;
  width?: string | number;
  collapsed?: boolean;
}

export default function Logo({ className, width = "36", collapsed = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <div 
        className="flex items-center justify-center rounded-md bg-primary text-primary-foreground"
        style={{ width: Number(width), height: Number(width) }}
      >
        <Building2 className="h-5 w-5" />
      </div>
      {!collapsed && (
        <span className="font-semibold text-lg tracking-tight mr-3">Company</span>
      )}
    </div>
  );
}
