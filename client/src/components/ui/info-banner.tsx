import { useState } from "react";
import { Link } from "wouter";
import { X, Info, DraftingCompass } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InfoBannerProps {
  id: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaUrl?: string;
  userId?: string;
}

function getStorageKey(bannerId: string, userId?: string): string {
  return `info-banner-dismissed-${bannerId}${userId ? `-${userId}` : ""}`;
}

function getInitialDismissedState(bannerId: string, userId?: string): boolean {
  if (typeof window === "undefined") return true;
  const storageKey = getStorageKey(bannerId, userId);
  return localStorage.getItem(storageKey) === "true";
}

export function InfoBanner({
  id,
  title,
  description,
  ctaLabel,
  ctaUrl,
  userId,
}: InfoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => 
    getInitialDismissedState(id, userId)
  );

  const handleDismiss = () => {
    const storageKey = getStorageKey(id, userId);
    localStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="px-4 md:px-6 relative flex items-center gap-3 border border-accent bg-primary text-primary-foreground p-3 text-base"
      data-testid={`banner-${id}`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-0">
          <span className="font-bold">{title}</span>
          <span className="ml-1 font-medium">{description}</span>
        </div>
        {ctaLabel && ctaUrl && (
          <Link href={ctaUrl}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              data-testid={`button-banner-cta-${id}`}
            >
              <DraftingCompass className="h-4 w-4" />

              {ctaLabel}
            </Button>
          </Link>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={handleDismiss}
        data-testid={`button-dismiss-banner-${id}`}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}
