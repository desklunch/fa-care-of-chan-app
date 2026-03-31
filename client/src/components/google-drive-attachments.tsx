import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  if (mimeType.includes("document") || mimeType.includes("word") || mimeType === "application/vnd.google-apps.document") {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "application/vnd.google-apps.spreadsheet") {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || mimeType === "application/vnd.google-apps.presentation") {
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
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) {
    return <FileArchive className="h-5 w-5 text-amber-600" />;
  }

  return <File className="h-5 w-5 text-muted-foreground" />;
}

interface DriveFile {
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

function DriveAuthPrompt({ onAuthorize }: { onAuthorize: () => void }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
        <LogIn className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Connect your Google Drive</p>
          <p className="text-xs text-muted-foreground mt-1">
            Grant access to browse and attach files from your personal Google Drive.
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

function DriveFilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  isPending,
  onDriveAuthRequired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: DriveFile) => void;
  isPending: boolean;
  onDriveAuthRequired: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedQuery(value), 400);
    setDebounceTimer(timer);
  };

  const { data: searchResults, isLoading: isSearching, error: searchError } = useQuery<DriveSearchResult>({
    queryKey: ["/api/drive/search", debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await fetch(`/api/drive/search?${params.toString()}`, { credentials: "include" });
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
    enabled: open,
    retry: false,
  });

  if (needsDriveAuth) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Browse Google Drive</DialogTitle>
            <DialogDescription>
              Connect your Google Drive to browse and attach files.
            </DialogDescription>
          </DialogHeader>
          <DriveAuthPrompt onAuthorize={() => {
            onDriveAuthRequired();
            onOpenChange(false);
          }} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
                  onClick={() => onSelect(file)}
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
                      {file.modifiedTime && `Modified ${formatTimeAgo(file.modifiedTime)}`}
                      {file.owners?.[0]?.displayName && (
                        <>{file.modifiedTime ? " · " : ""}{file.owners[0].displayName}</>
                      )}
                    </p>
                  </div>
                  {isPending && (
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {debouncedQuery ? "No files found" : "Your recent files will appear here"}
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
}

export function GoogleDriveAttachments({ entityType, entityId }: GoogleDriveAttachmentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { promptDriveAuth } = useDriveAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDriveAuthPrompt, setShowDriveAuthPrompt] = useState(false);

  const { data: attachments, isLoading } = useQuery<DriveAttachmentWithUser[]>({
    queryKey: ["/api/drive-attachments", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/drive-attachments/${entityType}/${entityId}`, { credentials: "include" });
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
    mutationFn: async (data: { driveUrl?: string; driveFileId?: string; name?: string; mimeType?: string; iconUrl?: string; webViewLink?: string }) => {
      const res = await apiRequest("POST", "/api/drive-attachments", {
        entityType,
        entityId,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive-attachments", entityType, entityId] });
      setDriveUrl("");
      setShowPasteInput(false);
      setShowPicker(false);
      toast({ title: "File attached successfully" });
    },
    onError: (error: Error) => {
      if (error.message?.includes("drive_auth_required")) {
        handleDriveAuthRequired();
        return;
      }
      toast({ title: "Failed to attach file", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/drive-attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive-attachments", entityType, entityId] });
      setDeleteId(null);
      toast({ title: "Attachment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove attachment", description: error.message, variant: "destructive" });
    },
  });

  const handlePasteSubmit = () => {
    if (!driveUrl.trim()) return;
    createMutation.mutate({ driveUrl: driveUrl.trim() });
  };

  const handlePickerSelect = (file: DriveFile) => {
    createMutation.mutate({
      driveFileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      iconUrl: file.iconLink,
      webViewLink: file.webViewLink,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-medium text-muted-foreground">Google Drive Files</h3>
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
      </div>

      {showDriveAuthPrompt && (
        <DriveAuthPrompt onAuthorize={handleConnectDrive} />
      )}

      <DriveFilePickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={handlePickerSelect}
        isPending={createMutation.isPending}
        onDriveAuthRequired={() => {
          promptDriveAuth();
        }}
      />

      {showPasteInput && (
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
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 rounded-md group hover-elevate"
              data-testid={`drive-attachment-${attachment.id}`}
            >
              <div className="flex-shrink-0">
                {getMimeTypeIcon(attachment.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {attachment.webViewLink ? (
                    <a
                      href={attachment.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate hover:underline"
                      data-testid={`link-drive-file-${attachment.id}`}
                    >
                      {attachment.name}
                    </a>
                  ) : (
                    <span className="text-sm font-medium truncate">{attachment.name}</span>
                  )}
                  {attachment.webViewLink && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {attachment.attachedBy
                    ? `${attachment.attachedBy.firstName || ""} ${attachment.attachedBy.lastName || ""}`.trim() || attachment.attachedBy.email
                    : "Unknown"}
                  {" · "}
                  {formatTimeAgo(attachment.attachedAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 invisible group-hover:visible"
                onClick={() => setDeleteId(attachment.id)}
                data-testid={`button-remove-attachment-${attachment.id}`}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
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
              This will remove the file link from this record. The file in Google Drive will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-attachment">Cancel</AlertDialogCancel>
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
