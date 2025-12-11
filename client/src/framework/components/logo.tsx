interface LogoProps {
  className?: string;
  width?: string | number;
  collapsed?: boolean;
}

export default function Logo({ className, width = "32", collapsed = false }: LogoProps) {
  return (
    <div className={`rounded-md  flex items-center gap-2 ${className || ""}`}>
 
      {!collapsed && (
        <span className="font-semibold text-lg tracking-tight mr-3">Care of Chan</span>
      )}
    </div>
  );
}
