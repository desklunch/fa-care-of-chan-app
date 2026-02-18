import { cn } from "@/lib/utils";
import type { DealStatus } from "@shared/schema";

interface DealStatusBadgeProps {
  status: DealStatus | string;
  className?: string;
}

const statusStyleMap: Record<string, string> = {
  "Prospecting": "deal-status-prospecting",
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
  const statusClass = statusStyleMap[status] || "deal-status-fallback";
  
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
      data-testid={`badge-deal-status-${status.toLowerCase().replace(/\s+/g, "-")}`}
      title={status}
    >
      {status}
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
