import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useDriveAuth } from "@/lib/google-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LinkIcon,
  Bookmark,
  Tag,
  FolderOpen,
  Link2,
  Check,
  X,
  Globe,
  ExternalLink,
  SquarePen,
  Trash2,
} from "lucide-react";
import {
  AttachmentRow,
  DriveAuthPrompt,
  DriveFilePickerDialog,
  type DriveFile,
} from "@/components/google-drive-attachments";
import { formatTimeAgo } from "@/lib/format-time";
import type {
  EntityLinkWithUser,
  DriveAttachmentWithUser,
} from "@shared/schema";

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

function getUserName(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
): string {
  if (!user) return "Unknown";
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unknown"
  );
}

function LinkRow({
  link,
  editable,
  labelRequired,
  onSave,
  onDelete,
  isSaving,
}: {
  link: EntityLinkWithUser;
  editable: boolean;
  labelRequired: boolean;
  onSave?: (data: {
    url: string;
    label: string | null;
  }) => Promise<void> | void;
  onDelete?: () => void;
  isSaving?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(link.url);
  const [editLabel, setEditLabel] = useState(link.label || "");

  useEffect(() => {
    if (!isEditing) {
      setEditUrl(link.url);
      setEditLabel(link.label || "");
    }
  }, [link.url, link.label, isEditing]);

  const canSave =
    !!editUrl.trim() && (!labelRequired || !!editLabel.trim()) && !isSaving;

  const handleSave = async () => {
    if (!canSave || !onSave) return;
    await onSave({ url: editUrl.trim(), label: editLabel.trim() || null });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditUrl(link.url);
    setEditLabel(link.label || "");
    setIsEditing(false);
  };

  const primary = link.label || link.previewTitle || getDomain(link.url);
  const secondary = link.label && link.previewTitle ? link.previewTitle : null;
  const faviconUrl = getFaviconUrl(link.url);

  return (
    <div
      className="flex items-start gap-3 p-2 py-4 group "
      data-testid={`link-item-${link.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="h-5 w-5 rounded-sm object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Globe className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="URL"
              data-testid={`input-edit-link-url-${link.id}`}
              className="h-10"
            />
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder={labelRequired ? "Label" : "Label (optional)"}
              data-testid={`input-edit-link-label-${link.id}`}
              className="h-10"

            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSave}
                data-testid={`button-save-edit-link-${link.id}`}
              >
                {isSaving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                data-testid={`button-cancel-edit-link-${link.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium truncate hover:underline"
                data-testid={`link-url-${link.id}`}
              >
                {primary}
              </a>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              data-testid={`text-link-title-${link.id}`}
            >
              {secondary && (
                <span>
                  {secondary} {" · "}
                </span>
              )}

              {getDomain(link.url)}
            </p>
 
            <p
              className="text-xs text-muted-foreground font-medium pt-2"
              data-testid={`text-link-meta-${link.id}`}
            >
              {getUserName(link.createdBy)}

              {" · "}
              {formatTimeAgo(link.createdAt as unknown as Date)}
            </p>
          </>
        )}
      </div>
      {editable && !isEditing && (
        <div className="flex-shrink-0 flex items-center gap-1 invisible group-hover:visible">
          {onSave && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-link-${link.id}`}
            >
              <SquarePen className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-link-${link.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const ENTITY_TYPE = "deal";

export function useDealAttachmentsStatus(dealId: string) {
  const linksQuery = useQuery<EntityLinkWithUser[]>({
    queryKey: ["/api/entity-links", ENTITY_TYPE, dealId],
    enabled: Boolean(dealId),
  });
  const attachmentsQuery = useQuery<DriveAttachmentWithUser[]>({
    queryKey: ["/api/drive-attachments", ENTITY_TYPE, dealId],
    queryFn: async () => {
      const res = await fetch(
        `/api/drive-attachments/${ENTITY_TYPE}/${dealId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: Boolean(dealId),
  });
  const linksCount = linksQuery.data?.length ?? 0;
  const attachmentsCount = attachmentsQuery.data?.length ?? 0;
  const isLoading = linksQuery.isLoading || attachmentsQuery.isLoading;
  const isError = linksQuery.isError || attachmentsQuery.isError;
  const isEmpty =
    !isLoading && !isError && linksCount === 0 && attachmentsCount === 0;
  return {
    isLoading,
    isError,
    isEmpty,
    totalCount: linksCount + attachmentsCount,
  };
}

interface DealAttachmentsPanelProps {
  dealId: string;
  canWrite?: boolean;
  compact?: boolean;
  onEmptyChange?: (empty: boolean) => void;
}

type CombinedItem =
  | { kind: "link"; id: string; sortAt: number; link: EntityLinkWithUser }
  | {
      kind: "drive";
      id: string;
      sortAt: number;
      attachment: DriveAttachmentWithUser;
    };

export function DealAttachmentsPanel({
  dealId,
  canWrite = false,
  compact = false,
  onEmptyChange,
}: DealAttachmentsPanelProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const { promptDriveAuth } = useDriveAuth();

  const canDeleteAny = can("deals.delete");

  // Link state
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  // Drive state
  const [showPicker, setShowPicker] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [pasteLabel, setPasteLabel] = useState("");
  const [pasteDescription, setPasteDescription] = useState("");
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(
    null,
  );
  const [showDriveAuthPrompt, setShowDriveAuthPrompt] = useState(false);

  const linksQuery = useQuery<EntityLinkWithUser[]>({
    queryKey: ["/api/entity-links", ENTITY_TYPE, dealId],
    enabled: Boolean(dealId),
  });

  const attachmentsQuery = useQuery<DriveAttachmentWithUser[]>({
    queryKey: ["/api/drive-attachments", ENTITY_TYPE, dealId],
    queryFn: async () => {
      const res = await fetch(
        `/api/drive-attachments/${ENTITY_TYPE}/${dealId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: Boolean(dealId),
  });

  const links = linksQuery.data ?? [];
  const attachments = attachmentsQuery.data ?? [];

  const items = useMemo<CombinedItem[]>(() => {
    const merged: CombinedItem[] = [
      ...links.map((l) => ({
        kind: "link" as const,
        id: `link-${l.id}`,
        sortAt: new Date(l.createdAt).getTime(),
        link: l,
      })),
      ...attachments.map((a) => ({
        kind: "drive" as const,
        id: `drive-${a.id}`,
        sortAt: new Date(a.attachedAt).getTime(),
        attachment: a,
      })),
    ];
    merged.sort((a, b) => b.sortAt - a.sortAt);
    return merged;
  }, [links, attachments]);

  const isLoading = linksQuery.isLoading || attachmentsQuery.isLoading;
  const isError = linksQuery.isError || attachmentsQuery.isError;
  const isEmpty = !isLoading && items.length === 0;

  useEffect(() => {
    onEmptyChange?.(isEmpty);
  }, [isEmpty, onEmptyChange]);

  // Link mutations
  const createLinkMutation = useMutation({
    mutationFn: async (data: { url: string; label?: string }) => {
      await apiRequest(
        "POST",
        `/api/entity-links/${ENTITY_TYPE}/${dealId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/entity-links", ENTITY_TYPE, dealId],
      });
      setNewUrl("");
      setNewLabel("");
      setShowCreateLink(false);
      toast({ title: "Link added" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({
      linkId,
      data,
    }: {
      linkId: string;
      data: { url?: string; label?: string | null };
    }) => {
      await apiRequest(
        "PATCH",
        `/api/entity-links/${ENTITY_TYPE}/${dealId}/${linkId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/entity-links", ENTITY_TYPE, dealId],
      });
      toast({ title: "Link updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest(
        "DELETE",
        `/api/entity-links/${ENTITY_TYPE}/${dealId}/${linkId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/entity-links", ENTITY_TYPE, dealId],
      });
      setDeleteLinkId(null);
      toast({ title: "Link removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Drive mutations
  const createAttachmentMutation = useMutation({
    mutationFn: async (data: {
      driveUrl?: string;
      driveFileId?: string;
      name?: string;
      mimeType?: string;
      iconUrl?: string;
      webViewLink?: string;
      label?: string | null;
      description?: string | null;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/drive-attachments/${encodeURIComponent(ENTITY_TYPE)}/${encodeURIComponent(dealId)}`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", ENTITY_TYPE, dealId],
      });
      setDriveUrl("");
      setPasteLabel("");
      setPasteDescription("");
      setShowPasteInput(false);
      setShowPicker(false);
      toast({ title: "File attached successfully" });
    },
    onError: (error: Error) => {
      if (error.message?.includes("drive_auth_required")) {
        setShowDriveAuthPrompt(true);
        return;
      }
      toast({
        title: "Failed to attach file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(
        "DELETE",
        `/api/drive-attachments/${encodeURIComponent(ENTITY_TYPE)}/${encodeURIComponent(dealId)}/${encodeURIComponent(id)}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", ENTITY_TYPE, dealId],
      });
      setDeleteAttachmentId(null);
      toast({ title: "Attachment removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove attachment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const labelRequired = true; // deals require labels for links

  const handleCreateLink = () => {
    if (!newUrl.trim()) return;
    if (labelRequired && !newLabel.trim()) return;
    createLinkMutation.mutate({
      url: newUrl.trim(),
      label: newLabel.trim() || undefined,
    });
  };

  const canEditLink = (link: EntityLinkWithUser) => {
    if (!currentUser) return false;
    return link.createdById === currentUser.id || canDeleteAny;
  };

  const handleSaveLink = async (
    link: EntityLinkWithUser,
    data: { url: string; label: string | null },
  ) => {
    setSavingLinkId(link.id);
    try {
      await updateLinkMutation.mutateAsync({
        linkId: link.id,
        data: {
          url: data.url,
          label: labelRequired ? (data.label ?? "") : data.label,
        },
      });
    } finally {
      setSavingLinkId(null);
    }
  };

  const handlePasteSubmit = () => {
    if (!driveUrl.trim()) return;
    createAttachmentMutation.mutate({
      driveUrl: driveUrl.trim(),
      label: pasteLabel.trim() ? pasteLabel.trim() : null,
      description: pasteDescription.trim() ? pasteDescription.trim() : null,
    });
  };

  const handlePickerSelect = (
    file: DriveFile,
    label: string,
    description: string,
  ) => {
    createAttachmentMutation.mutate({
      driveFileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      iconUrl: file.iconLink,
      webViewLink: file.webViewLink,
      label: label.trim() ? label.trim() : null,
      description: description.trim() ? description.trim() : null,
    });
  };

  const renderItems = () => {
    if (items.length === 0) return null;
    return (
      <Card className="p-4  divide-y " data-testid="list-deal-attachments">
        {items.map((item) => {
          if (item.kind === "link") {
            const editable = canWrite && canEditLink(item.link);
            return (
              <LinkRow
                key={item.id}
                link={item.link}
                editable={editable}
                labelRequired={labelRequired}
                onSave={
                  editable
                    ? (data) => handleSaveLink(item.link, data)
                    : undefined
                }
                onDelete={
                  editable ? () => setDeleteLinkId(item.link.id) : undefined
                }
                isSaving={savingLinkId === item.link.id}
              />
            );
          }
          return (
            <AttachmentRow
              key={item.id}
              attachment={item.attachment}
              entityType={ENTITY_TYPE}
              entityId={dealId}
              canWrite={canWrite}
              onDelete={(id) => setDeleteAttachmentId(id)}
            />
          );
        })}
      </Card>
    );
  };

  // Compact mode (used by Overview Attachments card)
  if (compact) {
    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center py-6"
          data-testid="loading-deal-attachments"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (isError) {
      return (
        <p
          className="text-sm text-muted-foreground"
          data-testid="error-deal-attachments"
        >
          Failed to load attachments
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {renderItems()}
        <AlertDialog
          open={!!deleteLinkId}
          onOpenChange={(open) => !open && setDeleteLinkId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Link</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this link? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-link">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteLinkId && deleteLinkMutation.mutate(deleteLinkId)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteLinkMutation.isPending}
                data-testid="button-confirm-delete-link"
              >
                {deleteLinkMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Full mode (Links tab)
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="loading-deal-attachments"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-sm font-medium"
          data-testid="heading-deal-attachments"
        >
          Share links and attach Google Drive files for this deal.
        </h3>
      </div>

      {canWrite && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => setShowCreateLink((v) => !v)}
            data-testid="button-add-link"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Add Link
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => setShowPicker(true)}
            data-testid="button-add-from-drive"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Add from Google Drive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setShowPasteInput((v) => !v)}
            data-testid="button-paste-drive-link"
          >
            {showPasteInput ? (
              <>
                <X className="h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Paste Drive URL
              </>
            )}
          </Button>
        </div>
      )}

      {canWrite && showCreateLink && (
        <Card data-testid="form-create-link">
          <CardHeader className="bg-popover">
            <CardTitle className="text-lg">Add a Link</CardTitle>
          </CardHeader>
          <CardContent className="!pt-0 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full space-y-2">
                <div className="flex items-center gap-1   text-sm font-medium "
              >
                  <div> URL</div>

                </div>
                <Input
                  placeholder="http://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => {    
                    if (e.key === "Enter" && newUrl.trim()) handleCreateLink();
                    if (e.key === "Escape") {
                      setShowCreateLink(false);
                      setNewUrl("");
                      setNewLabel("");
                    }
                  }}
                  autoFocus
                  data-testid="input-new-link-url"

                />
              </div>
              <div className="w-full space-y-2">
                      <div className="flex items-center gap-1 shrink-0  text-sm font-medium "
                >
                                <div> Title</div>

                              </div>
                <Input
                  placeholder="e.g. Client Brand Guidelines"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateLink();
                    if (e.key === "Escape") {
                      setShowCreateLink(false);
                      setNewUrl("");
                      setNewLabel("");
                    }
                  }}
                  data-testid="input-new-link-label"


                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreateLink(false);
                  setNewUrl("");
                  setNewLabel("");
                }}
                data-testid="button-cancel-create-link"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateLink}
                disabled={
                  !newUrl.trim() ||
                  (labelRequired && !newLabel.trim()) ||
                  createLinkMutation.isPending
                }
                data-testid="button-submit-link"
              >
                {createLinkMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                )}
                Save
              </Button>

            </div>
          </CardContent>
        </Card>
      )}

      {canWrite && showPasteInput && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              Paste a Google Drive sharing link to attach a file.
            </p>
            <div className="flex gap-2">
              <Input
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="flex-1"
                data-testid="input-drive-url"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePasteSubmit();
                }}
              />
              <Button
                onClick={handlePasteSubmit}
                disabled={
                  !driveUrl.trim() || createAttachmentMutation.isPending
                }
                data-testid="button-submit-drive-url"
              >
                {createAttachmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Input
              value={pasteLabel}
              onChange={(e) => setPasteLabel(e.target.value)}
              placeholder="Label (optional)"
              data-testid="input-paste-label"
            />
            <Textarea
              value={pasteDescription}
              onChange={(e) => setPasteDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              data-testid="input-paste-description"
            />
          </CardContent>
        </Card>
      )}

      {canWrite && showDriveAuthPrompt && (
        <DriveAuthPrompt
          onAuthorize={() => {
            promptDriveAuth();
            setShowDriveAuthPrompt(false);
          }}
        />
      )}

      {canWrite && (
        <DriveFilePickerDialog
          open={showPicker}
          onOpenChange={setShowPicker}
          onSelect={handlePickerSelect}
          isPending={createAttachmentMutation.isPending}
          onDriveAuthRequired={() => {
            promptDriveAuth();
          }}
        />
      )}

      {isError && (
        <p
          className="text-sm text-muted-foreground"
          data-testid="error-deal-attachments"
        >
          Failed to load attachments
        </p>
      )}

      {renderItems()}

      <AlertDialog
        open={!!deleteLinkId}
        onOpenChange={(open) => !open && setDeleteLinkId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this link? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-link">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteLinkId && deleteLinkMutation.mutate(deleteLinkId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLinkMutation.isPending}
              data-testid="button-confirm-delete-link"
            >
              {deleteLinkMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteAttachmentId}
        onOpenChange={() => setDeleteAttachmentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the file link from this deal. The file in Google
              Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-attachment">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteAttachmentId &&
                deleteAttachmentMutation.mutate(deleteAttachmentId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-attachment"
            >
              {deleteAttachmentMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
