import logoImage from "@assets/coc-icon-1_1769700566602.png";

interface LogoProps {
  className?: string;
  width?: string | number;
  collapsed?: boolean;
}

export default function Logo({ className, width = "32", collapsed = false }: LogoProps) {
  const size = Number(width) + 12;
  
  return (
    <div className={`rounded-md rounded-l-full flex items-center gap-4 ${className || ""}`}>
      <img 
        src={logoImage} 
        alt="Care of Chan OS" 
        style={{ width: size, height: size }}
        className="rounded-xl"
      />

      {!collapsed && (
        <span className="font-semibold text-lg tracking-tight mr-3">Care of Chan OS</span>
      )}
    </div>
  );
}
