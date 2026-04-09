import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import type { DealLinkWithUser } from "@shared/schema";

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

interface DealLinksTabProps {
  dealId: string;
  canWrite: boolean;
}

export function DealLinksTab({ dealId, canWrite }: DealLinksTabProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const canDelete = can("deals.delete");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  const { data: links = [], isLoading, isError, refetch } = useQuery<DealLinkWithUser[]>({
    queryKey: ["/api/deals", dealId, "links"],
    enabled: Boolean(dealId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { url: string; label?: string }) => {
      await apiRequest("POST", `/api/deals/${dealId}/links`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "links"] });
      setNewUrl("");
      setNewLabel("");
      setShowCreateForm(false);
      toast({ title: "Link added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add link", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/deals/${dealId}/links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "links"] });
      setDeleteLinkId(null);
      toast({ title: "Link removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove link", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newUrl.trim() || !newLabel.trim()) return;
    createMutation.mutate({
      url: newUrl.trim(),
      label: newLabel.trim(),
    });
  };

  const canDeleteLink = (link: DealLinkWithUser) => {
    if (!currentUser) return false;
    return link.createdById === currentUser.id || canDelete;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-links">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 space-y-2" data-testid="error-links">
        <p className="text-sm text-muted-foreground">Failed to load links</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-links">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium" data-testid="heading-links">Share links to files</h3>
      </div>
      {canWrite && (
        <div>


          {!showCreateForm ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowCreateForm(true)}
              data-testid="button-add-link"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Link
            </Button>
          ) : (
            <Card data-testid="form-create-link">
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="https://example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newUrl.trim() && newLabel.trim()) handleCreate();
                      if (e.key === "Escape") {
                        setShowCreateForm(false);
                        setNewUrl("");
                        setNewLabel("");
                      }
                    }}
                    autoFocus
                    data-testid="input-new-link-url"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newUrl.trim() && newLabel.trim()) handleCreate();
                      if (e.key === "Escape") {
                        setShowCreateForm(false);
                        setNewUrl("");
                        setNewLabel("");
                      }
                    }}
                    data-testid="input-new-link-label"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newUrl.trim() || !newLabel.trim() || createMutation.isPending}
                    data-testid="button-submit-link"
                  >
                    {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Add Link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewUrl("");
                      setNewLabel("");
                    }}
                    data-testid="button-cancel-create-link"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {links.length > 0 && (
        <div className="space-y-3" data-testid="list-links">
          {links.map((link) => (
            <Card
              key={link.id}
              className="group overflow-visible"
              data-testid={`link-item-${link.id}`}
            >
              <CardContent className="py-3">
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

                  {canDeleteLink(link) && (
                    <div className="invisible group-hover:visible shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteLinkId(link.id)}
                        data-testid={`button-delete-link-${link.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteLinkId} onOpenChange={(open) => !open && setDeleteLinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-link">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLinkId && deleteMutation.mutate(deleteLinkId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-link"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
