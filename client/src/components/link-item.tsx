import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ExternalLink,
  Link as LinkIcon,
  Globe,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import type { EntityLinkWithUser } from "@shared/schema";

function getUserName(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!user) return "Unknown";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
}

function getUserInitials(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!user) return "?";
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  return (first + last).toUpperCase() || "?";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  } catch {
    return "";
  }
}

export interface LinkItemProps {
  link: EntityLinkWithUser;
  compact?: boolean;
  editable?: boolean;
  labelRequired?: boolean;
  onSave?: (data: { url: string; label: string | null }) => Promise<void> | void;
  onDelete?: () => void;
  isSaving?: boolean;
}

export function LinkItem({
  link,
  compact = false,
  editable = false,
  labelRequired = false,
  onSave,
  onDelete,
  isSaving = false,
}: LinkItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(link.url);
  const [editLabel, setEditLabel] = useState(link.label || "");

  useEffect(() => {
    if (!isEditing) {
      setEditUrl(link.url);
      setEditLabel(link.label || "");
    }
  }, [link.url, link.label, isEditing]);

  const startEdit = () => {
    setEditUrl(link.url);
    setEditLabel(link.label || "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditUrl(link.url);
    setEditLabel(link.label || "");
  };

  const canSave =
    !!editUrl.trim() &&
    (!labelRequired || !!editLabel.trim()) &&
    !isSaving;

  const handleSave = async () => {
    if (!canSave || !onSave) return;
    await onSave({
      url: editUrl.trim(),
      label: editLabel.trim() || null,
    });
    setIsEditing(false);
  };

  if (compact) {
    if (isEditing) {
      return (
        <div
          className="space-y-2 p-2 border rounded-md"
          data-testid={`link-edit-${link.id}`}
        >
          <Input
            placeholder="URL"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            data-testid={`input-edit-link-url-${link.id}`}
          />
          <Input
            placeholder={labelRequired ? "Label" : "Label (optional)"}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            data-testid={`input-edit-link-label-${link.id}`}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
              disabled={isSaving}
              data-testid={`button-cancel-edit-link-${link.id}`}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              data-testid={`button-save-edit-link-${link.id}`}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Save
            </Button>
          </div>
        </div>
      );
    }

    const faviconUrl = getFaviconUrl(link.url);
    return (
      <div
        className="flex items-start justify-between gap-2 p-2 border rounded-md group"
        data-testid={`link-item-${link.id}`}
      >
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 min-w-0 flex-1"
          data-testid={`link-url-${link.id}`}
        >
          {link.previewImage ? (
            <img
              src={link.previewImage}
              alt=""
              className="h-8 w-8 rounded-md object-cover flex-shrink-0"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (faviconUrl && img.src !== faviconUrl) {
                  img.className = "h-8 w-8 rounded-md border p-1 bg-muted object-contain flex-shrink-0";
                  img.src = faviconUrl;
                } else {
                  img.style.display = "none";
                }
              }}
            />
          ) : faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="h-8 w-8 rounded-md border p-1 bg-muted object-contain flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <LinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium truncate block">
              {link.label || link.previewTitle || link.url}
            </span>
            {link.previewDescription && (
              <span className="text-xs text-muted-foreground line-clamp-1">{link.previewDescription}</span>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-muted-foreground truncate">{getDomain(link.url)}</span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="flex items-center gap-1">
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage
                    src={link.createdBy?.profileImageUrl || undefined}
                    alt={getUserName(link.createdBy)}
                  />
                  <AvatarFallback className="text-[6px]">
                    {getUserInitials(link.createdBy)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground">{getUserName(link.createdBy)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground" data-testid={`text-link-date-${link.id}`}>
                {format(new Date(link.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
        </a>
        {editable && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onSave && (
              <Button
                size="icon"
                variant="ghost"
                onClick={startEdit}
                data-testid={`button-edit-link-${link.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                data-testid={`button-remove-link-${link.id}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      className="group overflow-visible"
      data-testid={`link-item-${link.id}`}
    >
      <CardContent className="py-3">
        {isEditing ? (
          <div className="space-y-3" data-testid={`link-edit-${link.id}`}>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="https://example.com"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) handleSave();
                  if (e.key === "Escape") cancelEdit();
                }}
                autoFocus
                data-testid={`input-edit-link-url-${link.id}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={labelRequired ? "Label" : "Label (optional)"}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) handleSave();
                  if (e.key === "Escape") cancelEdit();
                }}
                data-testid={`input-edit-link-label-${link.id}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSave}
                data-testid={`button-save-edit-link-${link.id}`}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                disabled={isSaving}
                data-testid={`button-cancel-edit-link-${link.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {link.previewImage ? (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <img
                  src={link.previewImage}
                  alt=""
                  className="w-20 h-14 object-cover rounded-md border"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const favicon = getFaviconUrl(link.url);
                    if (favicon && img.src !== favicon) {
                      img.className = "w-10 h-10 rounded-md border p-1.5 bg-muted object-contain";
                      img.src = favicon;
                    } else {
                      img.style.display = "none";
                    }
                  }}
                  data-testid={`img-link-preview-${link.id}`}
                />
              </a>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <img
                  src={getFaviconUrl(link.url)}
                  alt=""
                  className="w-10 h-10 rounded-md border p-1.5 bg-muted object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                  data-testid={`img-link-favicon-${link.id}`}
                />
                <div className="w-10 h-10 rounded-md border items-center justify-center shrink-0 bg-muted hidden">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
              </a>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                data-testid={`link-url-${link.id}`}
              >
                <span className="truncate">
                  {link.label || link.previewTitle || getDomain(link.url)}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              </a>

              {link.previewTitle && link.label && (
                <p className="text-xs text-muted-foreground truncate" data-testid={`text-link-title-${link.id}`}>
                  {link.previewTitle}
                </p>
              )}

              {link.previewDescription && (
                <p
                  className="text-xs text-muted-foreground line-clamp-2"
                  data-testid={`text-link-desc-${link.id}`}
                >
                  {link.previewDescription}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-muted-foreground">{getDomain(link.url)}</span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage
                      src={link.createdBy?.profileImageUrl || undefined}
                      alt={getUserName(link.createdBy)}
                    />
                    <AvatarFallback className="text-[7px]">
                      {getUserInitials(link.createdBy)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground">
                    {getUserName(link.createdBy)}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground" data-testid={`text-link-date-${link.id}`}>
                  {format(new Date(link.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>

            {editable && (
              <div className="invisible group-hover:visible shrink-0 flex items-center gap-1">
                {onSave && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={startEdit}
                    data-testid={`button-edit-link-${link.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onDelete}
                    data-testid={`button-delete-link-${link.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
