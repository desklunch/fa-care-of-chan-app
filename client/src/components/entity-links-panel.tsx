import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  LinkIcon,
  Globe,
  Bookmark,
  Tag,
} from "lucide-react";
import type { EntityLinkWithUser } from "@shared/schema";
import { LinkItem } from "@/components/link-item";

interface EntityLinksPanelProps {
  entityType: string;
  entityId: string;
  canWrite?: boolean;
  compact?: boolean;
}

export function EntityLinksPanel({ entityType, entityId, canWrite = false, compact = false }: EntityLinksPanelProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);

  const deletePermission = entityType === "deal" ? "deals.delete" : "proposals.delete";
  const canDeleteAny = can(deletePermission);

  const { data: links = [], isLoading, isError, refetch } = useQuery<EntityLinkWithUser[]>({
    queryKey: ["/api/entity-links", entityType, entityId],
    enabled: Boolean(entityId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { url: string; label?: string }) => {
      await apiRequest("POST", `/api/entity-links/${entityType}/${entityId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity-links", entityType, entityId] });
      setNewUrl("");
      setNewLabel("");
      setShowCreateForm(false);
      toast({ title: "Link added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add link", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ linkId, data }: { linkId: string; data: { url?: string; label?: string | null } }) => {
      await apiRequest("PATCH", `/api/entity-links/${entityType}/${entityId}/${linkId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity-links", entityType, entityId] });
      toast({ title: "Link updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update link", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/entity-links/${entityType}/${entityId}/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity-links", entityType, entityId] });
      setDeleteLinkId(null);
      toast({ title: "Link removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove link", description: error.message, variant: "destructive" });
    },
  });

  const labelRequired = entityType === "deal";

  const handleCreate = () => {
    if (!newUrl.trim()) return;
    if (labelRequired && !newLabel.trim()) return;
    createMutation.mutate({
      url: newUrl.trim(),
      label: newLabel.trim() || undefined,
    });
  };

  const canEditLink = (link: EntityLinkWithUser) => {
    if (!currentUser) return false;
    if (entityType === "proposal_task") return canWrite;
    return link.createdById === currentUser.id || canDeleteAny;
  };

  const handleSave = async (link: EntityLinkWithUser, data: { url: string; label: string | null }) => {
    setSavingLinkId(link.id);
    try {
      await updateMutation.mutateAsync({
        linkId: link.id,
        data: {
          url: data.url,
          label: labelRequired ? (data.label ?? "") : data.label,
        },
      });
    } catch {
      // surfaced via toast in onError
      throw new Error("save failed");
    } finally {
      setSavingLinkId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-entity-links">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 space-y-2" data-testid="error-entity-links">
        <p className="text-sm text-muted-foreground">Failed to load links</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-entity-links">
          Retry
        </Button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {links.length === 0 && !canWrite && (
          <p className="text-sm text-muted-foreground" data-testid="text-no-links">
            No links attached.
          </p>
        )}
        {links.map((link) => {
          const editable = canWrite && canEditLink(link);
          return (
            <LinkItem
              key={link.id}
              link={link}
              compact
              editable={editable}
              labelRequired={labelRequired}
              onSave={editable ? (data) => handleSave(link, data) : undefined}
              onDelete={editable ? () => deleteMutation.mutate(link.id) : undefined}
              isSaving={savingLinkId === link.id}
            />
          );
        })}
        {canWrite && (
          <div className="space-y-2 pt-2 border-t">
            <Input
              placeholder="URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              data-testid="input-link-url"
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder={labelRequired ? "Label" : "Label (optional)"}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                data-testid="input-link-label"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!newUrl.trim() || (labelRequired && !newLabel.trim()) || createMutation.isPending}
                onClick={handleCreate}
                data-testid="button-add-link"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" data-testid="heading-links">Share links to Google Drive documents, websites, etc.</h3>
      </div>
      {canWrite && (
        <div>
          {!showCreateForm ? (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setShowCreateForm(true)}
              data-testid="button-add-link"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Add Link
            </Button>
          ) : (
            <Card data-testid="form-create-link">
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="URL (e.g. http://example.com)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newUrl.trim()) handleCreate();
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
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder={labelRequired ? "Title" : "Title (optional)"}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
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
                    disabled={!newUrl.trim() || (labelRequired && !newLabel.trim()) || createMutation.isPending}
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
        <div className="space-y-3" data-testid="list-entity-links">
          {links.map((link) => {
            const editable = canWrite && canEditLink(link);
            return (
              <LinkItem
                key={link.id}
                link={link}
                editable={editable}
                labelRequired={labelRequired}
                onSave={editable ? (data) => handleSave(link, data) : undefined}
                onDelete={editable ? () => setDeleteLinkId(link.id) : undefined}
                isSaving={savingLinkId === link.id}
              />
            );
          })}
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
