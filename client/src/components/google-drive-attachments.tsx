import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDriveAuth } from "@/lib/google-auth";
import { formatTimeAgo } from "@/lib/format-time";
import type { DriveAttachmentWithUser } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Sheet,
  Presentation,
  FileSpreadsheet,
  File,
  Trash2,
  ExternalLink,
  Link2,
  X,
  Loader2,
  FolderOpen,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  Search,
  Check,
  LogIn,
  SquarePen,
} from "lucide-react";
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

function getMimeTypeIcon(mimeType: string | null | undefined) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;

  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "application/vnd.google-apps.document"
  ) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.google-apps.spreadsheet"
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    mimeType === "application/vnd.google-apps.presentation"
  ) {
    return <Presentation className="h-5 w-5 text-yellow-600" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (mimeType === "application/vnd.google-apps.folder") {
    return <FolderOpen className="h-5 w-5 text-muted-foreground" />;
  }
  if (mimeType === "application/vnd.google-apps.form") {
    return <Sheet className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType.startsWith("image/")) {
    return <FileImage className="h-5 w-5 text-pink-500" />;
  }
  if (mimeType.startsWith("video/")) {
    return <FileVideo className="h-5 w-5 text-orange-500" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <FileAudio className="h-5 w-5 text-teal-500" />;
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("compressed")
  ) {
    return <FileArchive className="h-5 w-5 text-amber-600" />;
  }

  return <File className="h-5 w-5 text-muted-foreground" />;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  owners?: { displayName: string }[];
}

interface DriveSearchResult {
  files: DriveFile[];
  nextPageToken?: string;
}

export function DriveAuthPrompt({ onAuthorize }: { onAuthorize: () => void }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
        <LogIn className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Connect your Google Drive</p>
          <p className="text-xs text-muted-foreground mt-1">
            Grant access to browse and attach files from your personal Google
            Drive.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAuthorize}
          data-testid="button-connect-drive"
        >
          <LogIn className="h-4 w-4 mr-1" />
          Connect Google Drive
        </Button>
      </CardContent>
    </Card>
  );
}

export function DriveFilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  isPending,
  onDriveAuthRequired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: DriveFile, label: string, description: string) => void;
  isPending: boolean;
  onDriveAuthRequired: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const [pickedFile, setPickedFile] = useState<DriveFile | null>(null);
  const [pickerLabel, setPickerLabel] = useState("");
  const [pickerDescription, setPickerDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setPickedFile(null);
      setPickerLabel("");
      setPickerDescription("");
    }
  }, [open]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedQuery(value), 400);
    setDebounceTimer(timer);
  };

  const { data: searchResults, isLoading: isSearching } =
    useQuery<DriveSearchResult>({
      queryKey: ["/api/drive/search", debouncedQuery],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set("q", debouncedQuery);
        const res = await fetch(`/api/drive/search?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.code === "drive_auth_required") {
            setNeedsDriveAuth(true);
            throw new Error("drive_auth_required");
          }
          throw new Error("Failed to search Drive");
        }
        setNeedsDriveAuth(false);
        return res.json();
      },
      enabled: open && !pickedFile,
      retry: false,
    });

  if (needsDriveAuth) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Browse Google Drive</DialogTitle>
            <DialogDescription>
              Connect your Google Drive to browse and attach files.
            </DialogDescription>
          </DialogHeader>
          <DriveAuthPrompt
            onAuthorize={() => {
              onDriveAuthRequired();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (pickedFile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
            <DialogDescription>
              Optionally add a label and description for this file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-md border">
              <div className="flex-shrink-0">
                {getMimeTypeIcon(pickedFile.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  data-testid="text-picked-file-name"
                >
                  {pickedFile.name}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="picker-label"
              >
                Label (optional)
              </label>
              <Input
                id="picker-label"
                value={pickerLabel}
                onChange={(e) => setPickerLabel(e.target.value)}
                placeholder="A short, descriptive label"
                data-testid="input-picker-label"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="picker-description"
              >
                Description (optional)
              </label>
              <Textarea
                id="picker-description"
                value={pickerDescription}
                onChange={(e) => setPickerDescription(e.target.value)}
                placeholder="Why is this file attached?"
                rows={3}
                data-testid="input-picker-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPickedFile(null)}
              disabled={isPending}
              data-testid="button-picker-back"
            >
              Back
            </Button>
            <Button
              onClick={() =>
                onSelect(pickedFile, pickerLabel, pickerDescription)
              }
              disabled={isPending}
              data-testid="button-picker-confirm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Attach File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Browse Google Drive</DialogTitle>
          <DialogDescription>
            Search for a file in your Google Drive and click to attach it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search your Google Drive..."
              className="pl-9"
              data-testid="input-drive-search"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults?.files && searchResults.files.length > 0 ? (
              searchResults.files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setPickedFile(file)}
                  disabled={isPending}
                  className="flex items-center gap-3 p-2.5 rounded-md w-full text-left hover-elevate"
                  data-testid={`button-pick-file-${file.id}`}
                >
                  <div className="flex-shrink-0">
                    {getMimeTypeIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.modifiedTime &&
                        `Modified ${formatTimeAgo(file.modifiedTime)}`}
                      {file.owners?.[0]?.displayName && (
                        <>
                          {file.modifiedTime ? " · " : ""}
                          {file.owners[0].displayName}
                        </>
                      )}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {debouncedQuery
                  ? "No files found"
                  : "Your recent files will appear here"}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GoogleDriveAttachmentsProps {
  entityType: string;
  entityId: string;
  canWrite?: boolean;
}

export function AttachmentRow({
  attachment,
  entityType,
  entityId,
  canWrite,
  onDelete,
}: {
  attachment: DriveAttachmentWithUser;
  entityType: string;
  entityId: string;
  canWrite: boolean;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(attachment.label ?? "");
  const [descDraft, setDescDraft] = useState(attachment.description ?? "");

  useEffect(() => {
    setLabelDraft(attachment.label ?? "");
    setDescDraft(attachment.description ?? "");
  }, [attachment.label, attachment.description]);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      label: string | null;
      description: string | null;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/drive-attachments/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(attachment.id)}`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", entityType, entityId],
      });
      setIsEditing(false);
      toast({ title: "Attachment updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update attachment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      label: labelDraft.trim() ? labelDraft.trim() : null,
      description: descDraft.trim() ? descDraft.trim() : null,
    });
  };

  const handleCancel = () => {
    setLabelDraft(attachment.label ?? "");
    setDescDraft(attachment.description ?? "");
    setIsEditing(false);
  };

  const primary = attachment.label || attachment.name;
  const secondary = attachment.label ? attachment.name : null;

  return (
    <div
      className="flex items-start gap-3 p-2 py-4  group "
      data-testid={`drive-attachment-${attachment.id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getMimeTypeIcon(attachment.mimeType)}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Label (optional)"
              data-testid={`input-edit-label-${attachment.id}`}
            />
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              data-testid={`input-edit-description-${attachment.id}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid={`button-save-edit-${attachment.id}`}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                data-testid={`button-cancel-edit-${attachment.id}`}
              >
                Cancel
              </Button>
              {(attachment.label || attachment.description) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateMutation.mutate({ label: null, description: null })
                  }
                  disabled={updateMutation.isPending}
                  data-testid={`button-clear-edit-${attachment.id}`}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {attachment.webViewLink ? (
                <a
                  href={attachment.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium truncate hover:underline"
                  data-testid={`link-drive-file-${attachment.id}`}
                >
                  {primary}
                </a>
              ) : (
                <span
                  className="text-sm font-medium truncate"
                  data-testid={`text-drive-file-name-${attachment.id}`}
                >
                  {primary}
                </span>
              )}
              {attachment.webViewLink && (
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              data-testid={`text-drive-file-filename-${attachment.id}`}
            >
              {secondary && <span className="">{secondary}{" · "}</span>}
             Google Drive
            </p>
            {attachment.description && (
              <p
                className="text-xs text-muted-foreground whitespace-pre-wrap"
                data-testid={`text-drive-file-description-${attachment.id}`}
              >
                {attachment.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-2 font-medium">
              {attachment.attachedBy
                ? `${attachment.attachedBy.firstName || ""} ${attachment.attachedBy.lastName || ""}`.trim() ||
                  attachment.attachedBy.email
                : "Unknown"}
              {" · "}
              {formatTimeAgo(attachment.attachedAt)}
            </p>
          </>
        )}
      </div>
      {canWrite && !isEditing && (
        <div className="flex-shrink-0 flex items-center gap-1 invisible group-hover:visible">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            data-testid={`button-edit-attachment-${attachment.id}`}
          >
            <SquarePen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(attachment.id)}
            data-testid={`button-remove-attachment-${attachment.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function GoogleDriveAttachments({
  entityType,
  entityId,
  canWrite = true,
}: GoogleDriveAttachmentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { promptDriveAuth } = useDriveAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [pasteLabel, setPasteLabel] = useState("");
  const [pasteDescription, setPasteDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDriveAuthPrompt, setShowDriveAuthPrompt] = useState(false);

  const { data: attachments, isLoading } = useQuery<DriveAttachmentWithUser[]>({
    queryKey: ["/api/drive-attachments", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/drive-attachments/${entityType}/${entityId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: !!entityId,
  });

  const handleDriveAuthRequired = () => {
    setShowDriveAuthPrompt(true);
  };

  const handleConnectDrive = () => {
    promptDriveAuth();
    setShowDriveAuthPrompt(false);
  };

  const createMutation = useMutation({
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
        `/api/drive-attachments/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", entityType, entityId],
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
        handleDriveAuthRequired();
        return;
      }
      toast({
        title: "Failed to attach file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(
        "DELETE",
        `/api/drive-attachments/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(id)}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", entityType, entityId],
      });
      setDeleteId(null);
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

  const handlePasteSubmit = () => {
    if (!driveUrl.trim()) return;
    createMutation.mutate({
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
    createMutation.mutate({
      driveFileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      iconUrl: file.iconLink,
      webViewLink: file.webViewLink,
      label: label.trim() ? label.trim() : null,
      description: description.trim() ? description.trim() : null,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-medium text-muted-foreground">
          Google Drive Files
        </h3>
        {canWrite && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPicker(true)}
              data-testid="button-browse-drive"
            >
              <Search className="h-4 w-4 mr-1" />
              Browse Drive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasteInput(!showPasteInput)}
              data-testid="button-paste-link"
            >
              {showPasteInput ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-1" />
                  Paste Link
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {canWrite && showDriveAuthPrompt && (
        <DriveAuthPrompt onAuthorize={handleConnectDrive} />
      )}

      {canWrite && (
        <DriveFilePickerDialog
          open={showPicker}
          onOpenChange={setShowPicker}
          onSelect={handlePickerSelect}
          isPending={createMutation.isPending}
          onDriveAuthRequired={() => {
            promptDriveAuth();
          }}
        />
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
                disabled={!driveUrl.trim() || createMutation.isPending}
                data-testid="button-submit-drive-url"
              >
                {createMutation.isPending ? (
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

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              entityType={entityType}
              entityId={entityId}
              canWrite={canWrite}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">
          No files attached yet.
        </p>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the file link from this record. The file in
              Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-attachment">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-attachment"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
