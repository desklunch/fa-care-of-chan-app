import { cn } from "@/lib/utils";
import { useDealStatuses } from "@/hooks/useDealStatuses";

interface DealStatusBadgeProps {
  status: string;
  className?: string;
}

const statusToCssVar: Record<string, string> = {
  "Prospecting": "--status-prospecting",
  "Initial Contact": "--status-prospecting",
  "Qualified Lead": "--status-warm-lead",
  "Warm Lead": "--status-warm-lead",
  "Proposal": "--status-proposal",
  "Proposal Sent": "--status-proposal",
  "Feedback": "--status-feedback",
  "Negotiation": "--status-contracting",
  "Contracting": "--status-contracting",
  "In Progress": "--status-in-progress",
  "Final Invoicing": "--status-invoicing",
  "Closed Won": "--status-complete",
  "Complete": "--status-complete",
  "Closed Lost": "--status-no-go",
  "No-Go": "--status-no-go",
  "Declined by Us": "--status-canceled",
  "Canceled": "--status-canceled",
  "Legacy": "--status-canceled",
};

const fallbackStyleMap: Record<string, string> = {
  "Prospecting": "deal-status-prospecting",
  "Initial Contact": "deal-status-warm-lead",
  "Qualified Lead": "deal-status-proposal",
  "Proposal Sent": "deal-status-proposal",
  "Negotiation": "deal-status-contracting",
  "Closed Won": "deal-status-complete",
  "Closed Lost": "deal-status-no-go",
  "Declined by Us": "deal-status-canceled",
  "Legacy": "deal-status-waiting",
  "Warm Lead": "deal-status-warm-lead",
  "Proposal": "deal-status-proposal",
  "Feedback": "deal-status-waiting",
  "Contracting": "deal-status-contracting",
  "In Progress": "deal-status-in-progress",
  "Final Invoicing": "deal-status-invoicing",
  "Complete": "deal-status-complete",
  "No-Go": "deal-status-no-go",
  "Canceled": "deal-status-canceled",
};

const DEFAULT_SEED_COLORS = new Set([
  "#6366f1", "#818cf8", "#0ea5e9", "#38bdf8", "#8b5cf6", "#a78bfa",
  "#d946ef", "#e879f9", "#f59e0b", "#fbbf24", "#10b981", "#34d399",
  "#ef4444", "#f87171", "#64748b", "#94a3b8", "#9ca3af", "#d1d5db",
  "#888888",
]);

export function DealStatusBadge({ status, className }: DealStatusBadgeProps) {
  const { statusMap } = useDealStatuses();
  const record = statusMap.get(status);

  const hasCustomColor = record && !DEFAULT_SEED_COLORS.has(record.colorLight?.toLowerCase() || "");

  const themeVar = statusToCssVar[status];

  let inlineStyle: React.CSSProperties | undefined;
  let statusClass = "";

  if (hasCustomColor) {
    inlineStyle = {
      backgroundColor: record.colorLight,
      borderColor: record.colorLight,
      color: "#fff",
    };
  } else if (themeVar) {
    inlineStyle = {
      backgroundColor: `hsl(var(${themeVar}))`,
      borderColor: `hsl(var(${themeVar}))`,
      color: "#fff",
    };
  } else {
    statusClass = fallbackStyleMap[status] || "deal-status-fallback";
  }

  return (
    <div className="@container/status w-full flex flex-0 items-center  ">

    <span
      className={cn(
        statusClass,
        className,
        "inline-flex items-center justify-center font-medium whitespace-nowrap",
        "size-3 p-0 rounded-full text-[0px] mt-1 !border-[2px]",
        "@[100px]/status:px-1.5 @[100px]/status:py-0.5 @[100px]/status:text-xs @[100px]/status:rounded-[5px] @[100px]/status:mt-0 @[100px]/status:size-auto @[100px]/status:!border-[1.25px] ",

      )}
      style={inlineStyle}
      data-testid={`badge-deal-status-${status.toLowerCase().replace(/\s+/g, "-")}`}
      title={status}
    >
      {status}
      {record && record.winProbability > 0 && record.winProbability < 100 && (
        <span className="ml-1 font-semibold opacity-50">{record.winProbability}%</span>
      )}
    </span>
    </div>
  );
}

export function DealStatusBadgeContainer({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn("@container bg-white", className)}>
      {children}
    </div>
  );
}
