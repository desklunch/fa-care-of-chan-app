import { cn } from "@/lib/utils";
import type { FieldRowProps, FieldGridProps } from "./types";

export function FieldRow({ label, children, testId }: FieldRowProps) {
  return (
    <div
      className="flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export function FieldGrid({ children, className }: FieldGridProps) {
  return (
    <div className={cn("divide-y divide-border/50", className)}>
      {children}
    </div>
  );
}
