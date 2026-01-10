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
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap",
        "size-3 p-0 rounded-full text-[0px]",
        "@[140px]:px-1.5 @[140px]:py-0.5 @[140px]:text-xs @[140px]:rounded-[5px] @[140px]:size-auto",
        statusClass,
        className
      )}
      data-testid={`badge-deal-status-${status.toLowerCase().replace(/\s+/g, "-")}`}
      title={status}
    >
      {status}
    </span>
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
    <div className={cn("@container", className)}>
      {children}
    </div>
  );
}
