import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal } from "@shared/schema";

interface DealKanbanCardProps {
  deal: Deal;
  className?: string;
}

export function DealKanbanCard({ deal, className }: DealKanbanCardProps) {
  const formattedDate = deal.projectDate
    ? new Date(deal.projectDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const services = deal.services || [];
  const locationsText = deal.locationsText || "";
  const budgetNotes = deal.budgetNotes || "";

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card
        className={cn(
          "p-3 hover-elevate cursor-pointer transition-shadow",
          className
        )}
        data-testid={`kanban-card-${deal.id}`}
      >
        <div className="space-y-2">
          <h4 className="font-medium text-sm leading-tight line-clamp-2">
            {deal.displayName}
          </h4>

          {formattedDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
          )}

          {services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {services.slice(0, 3).map((service) => (
                <Badge
                  key={service}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {service}
                </Badge>
              ))}
              {services.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  +{services.length - 3}
                </Badge>
              )}
            </div>
          )}

          {locationsText && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{locationsText}</span>
            </div>
          )}

          {budgetNotes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{budgetNotes}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
