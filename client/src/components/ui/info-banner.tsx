import { useState } from "react";
import { useLocation } from "wouter";
import { X, Info, MessageCircle } from "lucide-react";
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
  const [, setLocation] = useLocation();

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const storageKey = getStorageKey(id, userId);
    localStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  const handleBannerClick = () => {
    if (ctaUrl) {
      setLocation(ctaUrl);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`relative flex items-center gap-2 border border-accent bg-primary text-primary-foreground p-3 text-sm ${ctaUrl ? "cursor-pointer hover-elevate" : ""}`}
      data-testid={`banner-${id}`}
      onClick={handleBannerClick}
    >
      <MessageCircle className="h-6 w-6 shrink-0 stroke-[1.75px]" />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-0 hover:underline prose-sm">
          <span className="font-semibold">{title}</span>
          <span className="ml-1 font-normal">{description}</span>
        </div>
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
