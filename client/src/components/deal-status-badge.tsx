import { cn } from "@/lib/utils";
import { useDealStatuses } from "@/hooks/useDealStatuses";

interface DealStatusBadgeProps {
  status: string;
  className?: string;
}

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

export function DealStatusBadge({ status, className }: DealStatusBadgeProps) {
  const { statusMap } = useDealStatuses();
  const record = statusMap.get(status);

  const useInlineColors = record && record.colorLight !== "#888888";

  const inlineStyle = useInlineColors
    ? {
        "--status-bg": record.colorLight,
        "--status-bg-dark": record.colorDark,
        backgroundColor: "var(--status-bg)",
        borderColor: "var(--status-bg)",
        color: "#fff",
      } as React.CSSProperties
    : undefined;

  const statusClass = useInlineColors ? "" : (fallbackStyleMap[status] || "deal-status-fallback");

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
