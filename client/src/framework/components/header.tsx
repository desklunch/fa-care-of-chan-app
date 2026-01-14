import { ChevronRight, MoreVertical, Menu } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Breadcrumb, ActionButton } from "../types/layout";

interface HeaderProps {
  isMobileOpen: boolean;
  onToggle: () => void;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ActionButton;
  additionalActions?: ActionButton[];
}

function renderPrimaryActionButton(action: ActionButton, testId: string) {
  if (action.href) {
    return (
      <Link href={action.href}>
        <Button
          variant="default"
          size="sm"
          data-testid={testId}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      </Link>
    );
  }
  return (
    <Button
      variant="default"
      size="sm"
      onClick={action.onClick}
      data-testid={testId}
    >
      {action.icon && <action.icon className="h-4 w-4" />}
      {action.label}
    </Button>
  );
}

function renderDropdownItem(action: ActionButton, index: number) {
  const isDestructive = action.variant === "destructive";
  
  if (action.href) {
    return (
      <Link href={action.href} key={index}>
        <DropdownMenuItem 
          className={isDestructive ? "text-destructive focus:text-destructive" : ""}
          data-testid={`menu-item-action-${index}`}
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </DropdownMenuItem>
      </Link>
    );
  }
  return (
    <DropdownMenuItem
      key={index}
      onClick={action.onClick}
      className={isDestructive ? "text-destructive focus:text-destructive" : ""}
      data-testid={`menu-item-action-${index}`}
    >
      {action.icon && <action.icon className="h-4 w-4 mr-2" />}
      {action.label}
    </DropdownMenuItem>
  );
}

export default function Header({
  isMobileOpen,
  onToggle,
  breadcrumbs,
  primaryAction,
  additionalActions,
}: HeaderProps) {
  const hasActions = primaryAction || (additionalActions && additionalActions.length > 0);
  const allDropdownActions = [
    ...(primaryAction ? [primaryAction] : []),
    ...(additionalActions || []),
  ];

  return (
    <header
      className="sticky top-0 shrink-0 h-[56px] md:h-[72px] bg-background border-b border-border px-2 md:px-4 flex items-center justify-between gap-2 z-40"
      data-testid="header-main"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-10 w-10 p-0 relative z-[101] md:hidden flex-shrink-0"
        data-testid="button-mobile-menu"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className="flex items-center gap-2 flex-1 min-w-0 pl-1"
          aria-label="Breadcrumb"
          data-testid="breadcrumb-nav"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2 min-w-0">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className={`${index === 0 ? "text-base font-semibold" : "text-sm text-muted-foreground"} hover:text-foreground transition-colors truncate`}
                  data-testid={`breadcrumb-${index}`}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={`${index === 0 ? "text-base font-semibold" : "text-sm"} truncate`}
                  data-testid={`breadcrumb-${index}`}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {(!breadcrumbs || breadcrumbs.length === 0) && <div className="flex-1" />}

      <div className="flex items-center gap-2 flex-shrink-0">
        {primaryAction && (
          <div className="hidden md:flex items-center gap-2">
            {renderPrimaryActionButton(primaryAction, "button-primary-action")}
          </div>
        )}

        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 p-0 ${additionalActions && additionalActions.length > 0 ? "" : "md:hidden"}`}
                data-testid="button-actions-menu"
                aria-label="Actions menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="dropdown-actions-menu">
              {allDropdownActions.map((action, index) => renderDropdownItem(action, index))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
