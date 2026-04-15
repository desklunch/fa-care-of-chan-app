import chanseyGif from "@assets/chansey_1775839823271.gif";

interface LogoProps {
  className?: string;
  width?: string | number;
  collapsed?: boolean;
}

export default function Logo({
  className,
  width = "60px",
  collapsed = false,
}: LogoProps) {
  return (
    <div
      className={`rounded-md rounded-l-full flex items-center gap-3 ${className || ""}`}
    >
      <div className=" flex items-center justify-center rounded-full">
        <img
          src={chanseyGif}
          alt="Chansey logo"
          style={{ width: Number(width), height: Number(width) }}
          data-testid="img-logo"
        />
      </div>

      {!collapsed && (
        <span className="flex items-center gap-3 font-medium text-foreground  text-base  mr-3 ">
          Chansey
          <span className="rounded-md bg-accent text-accent-foreground w-fit p-1 py-0.5 text-[10px]/[13px] tracking-wide rounded-sm">
          1.9

          </span>
        </span>
      )}
    </div>
  );
}
