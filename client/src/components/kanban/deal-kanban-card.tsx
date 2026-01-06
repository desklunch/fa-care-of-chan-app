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
  const services = deal.services || [];
  const locationsText = deal.locationsText || "";
  const budgetNotes = deal.budgetNotes;
  const showBudgetNotes = budgetNotes && budgetNotes !== "Not disclosed";

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card
        className={cn(
          "p-3 bg-foreground/5 hover-elevate cursor-pointer transition-shadow",
          className
        )}
        data-testid={`kanban-card-${deal.id}`}
      >
        <div className="space-y-3">

          <h4 className="font-medium text-base leading-tight truncate">
            {deal.displayName}
          </h4>
          {services.length > 0 && (
            <div className="flex flex-wrap gap-1 mx-[-2px]">
              {services.slice(0, 3).map((service) => (
                <Badge
                  key={service}
                  variant="secondary"
                  className="text-xs px-1 py-0 rounded-sm"
                >
                  {service}
                </Badge>
              ))}
              {services.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0"
                >
                  +{services.length - 3}
                </Badge>
              )}
            </div>
          )}

          {deal.projectDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{deal.projectDate}</span>
            </div>
          )}

  
          {locationsText && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{locationsText}</span>
            </div>
          )}

          {showBudgetNotes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="line-clamp-2">{budgetNotes}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
