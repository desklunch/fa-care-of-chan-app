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
      className={`rounded-md rounded-l-full flex items-center gap-4 ${className || ""}`}
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
        <span className="font-semibold text-ptimary dark:text-pink-200 text-lg  mr-3 ">
          Chansey
        </span>
      )}
    </div>
  );
}
