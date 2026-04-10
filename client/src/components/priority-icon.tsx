import type { FeaturePriority } from "@shared/schema";

const priorityLevels: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function PriorityIcon({ priority, className }: { priority: FeaturePriority | string | null | undefined; className?: string }) {
  if (!priority || !(priority in priorityLevels)) return null;

  const level = priorityLevels[priority];
  const barCount = 4;

  return (
    <span className={`inline-flex flex-col gap-[1px] ${className || ""}`} data-testid={`icon-priority-${priority}`}>
      {Array.from({ length: barCount }, (_, i) => {
        const barIndex = barCount - 1 - i;
        return (
          <span
            key={i}
            className="h-[2px] w-[14px] rounded-[1px] bg-current"
            style={{ opacity: barIndex < level ? 1 : 0.5 }}
          />
        );
      })}
    </span>
  );
}

export const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
