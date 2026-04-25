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
  Folder,
  FolderOpen,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  Search,
  Check,
  LogIn,
  SquarePen,
  ChevronRight,
  ArrowLeft,
  HardDrive,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    return <Folder className="h-5 w-5 text-blue-500" />;
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
  driveId?: string;
}

interface DriveSearchResult {
  files: DriveFile[];
  nextPageToken?: string;
}

interface SharedDrive {
  id: string;
  name: string;
}

interface SharedDriveListResult {
  drives: SharedDrive[];
  nextPageToken?: string;
}

type DriveLocationKind = "myDrive" | "sharedWithMe" | "sharedDrive" | "folder";

interface DriveLocation {
  id: string;
  name: string;
  kind: DriveLocationKind;
  /** When set, all queries within this location are scoped to a Shared Drive. */
  driveId?: string;
}

const SHARED_WITH_ME_ID = "__shared_with_me__";
const MY_DRIVE_ID = "__my_drive__";

const DRIVE_URL_HOSTS = new Set([
  "docs.google.com",
  "drive.google.com",
  "sheets.google.com",
  "slides.google.com",
  "forms.google.com",
]);

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isDriveUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!looksLikeUrl(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    return (
      DRIVE_URL_HOSTS.has(host) ||
      host.endsWith(".docs.google.com") ||
      host.endsWith(".drive.google.com")
    );
  } catch {
    return false;
  }
}

function extractDriveFileIdClient(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isDriveFolderUrlClient(url: string): boolean {
  return /\/folders\/[a-zA-Z0-9_-]+/.test(url);
}

const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

function isFolderMimeType(mimeType: string | null | undefined): boolean {
  return mimeType === DRIVE_FOLDER_MIME_TYPE;
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
  onSelectUrl,
  isPending,
  onDriveAuthRequired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (file: DriveFile, label: string, description: string) => void;
  onSelectUrl: (url: string, label: string, description: string) => void;
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
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [pickerLabel, setPickerLabel] = useState("");
  const [pickerDescription, setPickerDescription] = useState("");
  const [folderStack, setFolderStack] = useState<DriveLocation[]>([]);
  const currentLocation: DriveLocation | null =
    folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const sectionRoot: DriveLocation | null =
    folderStack.length > 0 ? folderStack[0] : null;
  const sharedDriveContextId =
    folderStack.find((entry) => entry.kind === "sharedDrive")?.id ??
    folderStack.find((entry) => entry.driveId)?.driveId;

  useEffect(() => {
    if (!open) {
      setPickedFile(null);
      setPickedUrl(null);
      setPickerLabel("");
      setPickerDescription("");
      setSearchQuery("");
      setDebouncedQuery("");
      setFolderStack([]);
    }
  }, [open]);

  const pushLocation = (location: DriveLocation) => {
    setFolderStack((stack) => [...stack, location]);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const openFolder = (file: DriveFile) => {
    pushLocation({
      id: file.id,
      name: file.name,
      kind: "folder",
      driveId: file.driveId ?? sharedDriveContextId,
    });
  };

  const goUpOneLocation = () => {
    setFolderStack((stack) => stack.slice(0, -1));
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const goToLocationAtIndex = (index: number) => {
    setFolderStack((stack) => stack.slice(0, index + 1));
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const goToPickerRoot = () => {
    setFolderStack([]);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const trimmedQuery = searchQuery.trim();
  const inputIsUrl = looksLikeUrl(trimmedQuery);
  const inputIsDriveUrl = inputIsUrl && isDriveUrl(trimmedQuery);
  const inputIsFolderUrl = inputIsDriveUrl && isDriveFolderUrlClient(trimmedQuery);
  const extractedFileId = inputIsDriveUrl
    ? extractDriveFileIdClient(trimmedQuery)
    : null;
  const urlError = inputIsUrl
    ? !inputIsDriveUrl
      ? "That doesn't look like a Google Drive link."
      : !extractedFileId
        ? `We couldn't find a${inputIsFolderUrl ? " folder" : " file"} ID in that Drive link.`
        : null
    : null;
  const pickedUrlIsFolder = pickedUrl ? isDriveFolderUrlClient(pickedUrl) : false;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (looksLikeUrl(value)) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(value), 400);
    setDebounceTimer(timer);
  };

  const handleConfirmUrl = () => {
    if (!inputIsDriveUrl || !extractedFileId) return;
    setPickedUrl(trimmedQuery);
  };

  const trimmedDebouncedQuery = debouncedQuery.trim();
  const isBrowseMode = !trimmedDebouncedQuery;
  const isAtPickerRoot = !sectionRoot;
  // The picker root is a section chooser (My Drive, Shared with me, Shared
  // Drives) rather than a file listing — only show file/folder rows when the
  // user is inside a section, or whenever they're searching.
  const showSectionChooser = isAtPickerRoot && isBrowseMode;

  // Build query parameters reflecting the current location.
  const browseQueryParams = (() => {
    if (isAtPickerRoot) return null;
    if (sectionRoot?.kind === "myDrive") {
      const parentId =
        currentLocation?.kind === "folder" ? currentLocation.id : "root";
      return { parentId } as {
        parentId?: string;
        driveId?: string;
        sharedWithMe?: boolean;
      };
    }
    if (sectionRoot?.kind === "sharedWithMe") {
      if (currentLocation?.kind === "sharedWithMe") {
        return { sharedWithMe: true };
      }
      // Drilling into a folder we discovered via Shared with me.
      return {
        parentId: currentLocation!.id,
        driveId: sharedDriveContextId,
      };
    }
    if (sectionRoot?.kind === "sharedDrive") {
      const driveId = sectionRoot.id;
      if (currentLocation?.kind === "sharedDrive") {
        return { driveId };
      }
      return { parentId: currentLocation!.id, driveId };
    }
    return null;
  })();

  const searchEnabled =
    open && !pickedFile && !pickedUrl && !inputIsUrl && !showSectionChooser;

  const { data: searchResults, isLoading: isSearching } =
    useQuery<DriveSearchResult>({
      queryKey: [
        "/api/drive/search",
        debouncedQuery,
        browseQueryParams?.parentId ?? "",
        browseQueryParams?.driveId ?? "",
        browseQueryParams?.sharedWithMe ? "swm" : "",
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (browseQueryParams?.parentId)
          params.set("parentId", browseQueryParams.parentId);
        if (browseQueryParams?.driveId)
          params.set("driveId", browseQueryParams.driveId);
        if (browseQueryParams?.sharedWithMe) params.set("sharedWithMe", "true");
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
      enabled: searchEnabled,
      retry: false,
    });

  // In browse mode (inside a section), also fetch the folder list separately
  // so folders are guaranteed to appear at the top of the listing regardless
  // of how the mixed search results paginate.
  const folderListEnabled =
    open &&
    !pickedFile &&
    !pickedUrl &&
    !inputIsUrl &&
    isBrowseMode &&
    !!browseQueryParams;

  const { data: folderResults, isLoading: isLoadingFolders } =
    useQuery<DriveSearchResult>({
      queryKey: [
        "/api/drive/folders",
        browseQueryParams?.parentId ?? "",
        browseQueryParams?.driveId ?? "",
        browseQueryParams?.sharedWithMe ? "swm" : "",
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (
          browseQueryParams?.parentId &&
          browseQueryParams.parentId !== "root"
        ) {
          params.set("parentId", browseQueryParams.parentId);
        }
        if (browseQueryParams?.driveId)
          params.set("driveId", browseQueryParams.driveId);
        if (browseQueryParams?.sharedWithMe) params.set("sharedWithMe", "true");
        const res = await fetch(`/api/drive/folders?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.code === "drive_auth_required") {
            setNeedsDriveAuth(true);
            throw new Error("drive_auth_required");
          }
          throw new Error("Failed to list Drive folders");
        }
        setNeedsDriveAuth(false);
        return res.json();
      },
      enabled: folderListEnabled,
      retry: false,
    });

  // List the user's accessible Shared Drives — only needed at the picker root.
  const sharedDrivesEnabled =
    open && !pickedFile && !pickedUrl && !inputIsUrl && showSectionChooser;

  const { data: sharedDrivesResult, isLoading: isLoadingSharedDrives } =
    useQuery<SharedDriveListResult>({
      queryKey: ["/api/drive/shared-drives"],
      queryFn: async () => {
        const res = await fetch(`/api/drive/shared-drives`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.code === "drive_auth_required") {
            setNeedsDriveAuth(true);
            throw new Error("drive_auth_required");
          }
          throw new Error("Failed to list Shared Drives");
        }
        setNeedsDriveAuth(false);
        return res.json();
      },
      enabled: sharedDrivesEnabled,
      retry: false,
    });

  const browseFolders = isBrowseMode ? folderResults?.files ?? [] : [];
  const browseFolderIds = new Set(browseFolders.map((f) => f.id));
  const browseRows: DriveFile[] = isBrowseMode
    ? [
        ...browseFolders,
        ...((searchResults?.files ?? []).filter(
          (f) => !isFolderMimeType(f.mimeType) || !browseFolderIds.has(f.id),
        )),
      ]
    : searchResults?.files ?? [];
  const isListLoading = showSectionChooser
    ? isLoadingSharedDrives
    : isBrowseMode
      ? isSearching || isLoadingFolders
      : isSearching;
  const sharedDrives = sharedDrivesResult?.drives ?? [];

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

  if (pickedFile || pickedUrl) {
    const pickedIsFolder =
      (pickedFile ? isFolderMimeType(pickedFile.mimeType) : false) ||
      pickedUrlIsFolder;
    const pickedNoun = pickedIsFolder ? "folder" : "file";
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {pickedIsFolder ? "Attach Folder" : "Add Attachment"}
            </DialogTitle>
            <DialogDescription>
              {pickedFile
                ? `Optionally add a label and description for this ${pickedNoun}.`
                : pickedIsFolder
                  ? "Optionally add a label and description for this folder."
                  : "Optionally add a label and description for this link."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-md border">
              <div className="flex-shrink-0">
                {pickedFile ? (
                  getMimeTypeIcon(pickedFile.mimeType)
                ) : pickedUrlIsFolder ? (
                  <Folder className="h-5 w-5 text-blue-500" />
                ) : (
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    data-testid={
                      pickedFile ? "text-picked-file-name" : "text-picked-url"
                    }
                  >
                    {pickedFile ? pickedFile.name : pickedUrl}
                  </p>
                  {pickedIsFolder && (
                    <Badge
                      variant="secondary"
                      data-testid="badge-picked-folder"
                    >
                      Folder
                    </Badge>
                  )}
                </div>
                {pickedUrl ? (
                  <p className="text-xs text-muted-foreground">
                    We'll fetch the {pickedNoun} details from Google Drive when
                    you attach.
                  </p>
                ) : null}
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
              onClick={() => {
                setPickedFile(null);
                setPickedUrl(null);
              }}
              disabled={isPending}
              data-testid="button-picker-back"
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (pickedFile) {
                  onSelect(pickedFile, pickerLabel, pickerDescription);
                } else if (pickedUrl) {
                  onSelectUrl(pickedUrl, pickerLabel, pickerDescription);
                }
              }}
              disabled={isPending}
              data-testid="button-picker-confirm"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              {pickedIsFolder
                ? "Attach Folder"
                : pickedFile
                  ? "Attach File"
                  : "Attach Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="min-w-0">
          <DialogTitle>Browse Google Drive</DialogTitle>
          <DialogDescription>
            Browse your Google Drive folders, search for a file, or paste a
            Drive file or folder link to attach it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 min-w-0">
          <div className="relative">
            {inputIsUrl ? (
              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search your Google Drive or paste a Drive link..."
              className="pl-9"
              data-testid="input-drive-search"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  inputIsDriveUrl &&
                  extractedFileId &&
                  !isPending
                ) {
                  e.preventDefault();
                  handleConfirmUrl();
                }
              }}
              autoFocus
            />
          </div>
          {inputIsUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-md border">
                <div className="flex-shrink-0">
                  {inputIsFolderUrl ? (
                    <Folder className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      data-testid="text-pasted-url"
                    >
                      {trimmedQuery}
                    </p>
                    {inputIsFolderUrl && (
                      <Badge
                        variant="secondary"
                        data-testid="badge-pasted-folder"
                      >
                        Folder
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {urlError
                      ? urlError
                      : inputIsFolderUrl
                        ? "Looks like a Google Drive folder."
                        : "Looks like a Google Drive link."}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConfirmUrl}
                  disabled={!inputIsDriveUrl || !extractedFileId || isPending}
                  data-testid="button-attach-pasted-url"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {inputIsFolderUrl ? "Attach folder" : "Attach link"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isBrowseMode && (
                <div
                  className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground"
                  data-testid="drive-picker-breadcrumb"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goUpOneLocation}
                    disabled={folderStack.length === 0}
                    data-testid="button-drive-folder-up"
                    aria-label="Go up one folder"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={goToPickerRoot}
                    disabled={isAtPickerRoot}
                    className="px-1.5 py-1 rounded-md hover-elevate active-elevate-2 disabled:opacity-100 disabled:cursor-default disabled:hover:bg-transparent font-medium text-foreground"
                    data-testid="button-drive-breadcrumb-root"
                  >
                    Drive
                  </button>
                  {folderStack.map((entry, index) => (
                    <span
                      key={`${entry.kind}-${entry.id}`}
                      className="flex items-center gap-1 min-w-0"
                    >
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      <button
                        type="button"
                        onClick={() => goToLocationAtIndex(index)}
                        disabled={index === folderStack.length - 1}
                        className="px-1.5 py-1 rounded-md truncate max-w-[180px] hover-elevate active-elevate-2 disabled:opacity-100 disabled:cursor-default disabled:hover:bg-transparent text-foreground"
                        data-testid={`button-drive-breadcrumb-${entry.id}`}
                      >
                        {entry.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-80 overflow-y-auto space-y-0.5">
                {isListLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : showSectionChooser ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        pushLocation({
                          id: MY_DRIVE_ID,
                          name: "My Drive",
                          kind: "myDrive",
                        })
                      }
                      disabled={isPending}
                      className="flex items-center gap-3 p-2.5 rounded-md w-full text-left hover-elevate"
                      data-testid="button-drive-section-my-drive"
                    >
                      <div className="flex-shrink-0">
                        <HardDrive className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">My Drive</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Files in your personal Google Drive
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        pushLocation({
                          id: SHARED_WITH_ME_ID,
                          name: "Shared with me",
                          kind: "sharedWithMe",
                        })
                      }
                      disabled={isPending}
                      className="flex items-center gap-3 p-2.5 rounded-md w-full text-left hover-elevate"
                      data-testid="button-drive-section-shared-with-me"
                    >
                      <div className="flex-shrink-0">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Shared with me
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Files others have shared directly with you
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                    {sharedDrives.length > 0 ? (
                      sharedDrives.map((drive) => (
                        <button
                          key={drive.id}
                          type="button"
                          onClick={() =>
                            pushLocation({
                              id: drive.id,
                              name: drive.name,
                              kind: "sharedDrive",
                              driveId: drive.id,
                            })
                          }
                          disabled={isPending}
                          className="flex items-center gap-3 p-2.5 rounded-md w-full text-left hover-elevate"
                          data-testid={`button-drive-section-shared-drive-${drive.id}`}
                        >
                          <div className="flex-shrink-0">
                            <Folder className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {drive.name}
                              </p>
                              <Badge variant="secondary">Shared drive</Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground px-2 pt-3">
                        No Shared Drives available.
                      </p>
                    )}
                  </>
                ) : browseRows.length > 0 ? (
                  browseRows.map((file) => {
                    const isFolder = isFolderMimeType(file.mimeType);
                    const meta = (
                      <p className="text-xs text-muted-foreground truncate">
                        {file.modifiedTime &&
                          `Modified ${formatTimeAgo(file.modifiedTime)}`}
                        {file.owners?.[0]?.displayName && (
                          <>
                            {file.modifiedTime ? " · " : ""}
                            {file.owners[0].displayName}
                          </>
                        )}
                      </p>
                    );

                    if (isFolder) {
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-1"
                          data-testid={`row-drive-folder-${file.id}`}
                        >
                          <button
                            type="button"
                            onClick={() => openFolder(file)}
                            disabled={isPending}
                            className="flex items-center gap-3 p-2.5 flex-1 min-w-0 text-left rounded-md hover-elevate"
                            data-testid={`button-open-folder-${file.id}`}
                          >
                            <div className="flex-shrink-0">
                              {getMimeTypeIcon(file.mimeType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.name}
                              </p>
                              {meta}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPickedFile(file)}
                            disabled={isPending}
                            className="flex-shrink-0"
                            data-testid={`button-attach-folder-${file.id}`}
                          >
                            Attach
                          </Button>
                        </div>
                      );
                    }

                    return (
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
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          {meta}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {!isBrowseMode
                      ? "No files found"
                      : currentLocation?.kind === "sharedWithMe"
                        ? "Nothing has been shared with you yet"
                        : currentLocation?.kind === "sharedDrive"
                          ? "This Shared Drive is empty"
                          : currentLocation?.kind === "folder"
                            ? "This folder is empty"
                            : "Your Drive is empty"}
                  </p>
                )}
              </div>
            </>
          )}
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
  const isFolder = isFolderMimeType(attachment.mimeType);
  const sourceLabel = isFolder ? "Google Drive folder" : "Google Drive";

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
            <div className="flex items-center gap-1.5 flex-wrap">
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
              {isFolder && (
                <Badge
                  variant="secondary"
                  data-testid={`badge-drive-folder-${attachment.id}`}
                >
                  Folder
                </Badge>
              )}
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              data-testid={`text-drive-file-filename-${attachment.id}`}
            >
              {secondary && <span className="">{secondary}{" · "}</span>}
              {sourceLabel}
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
    onSuccess: (result: DriveAttachmentWithUser | undefined) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/drive-attachments", entityType, entityId],
      });
      setDriveUrl("");
      setPasteLabel("");
      setPasteDescription("");
      setShowPasteInput(false);
      setShowPicker(false);
      toast({
        title: isFolderMimeType(result?.mimeType)
          ? "Folder attached successfully"
          : "File attached successfully",
      });
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

  const handlePickerSelectUrl = (
    url: string,
    label: string,
    description: string,
  ) => {
    createMutation.mutate({
      driveUrl: url,
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
          onSelectUrl={handlePickerSelectUrl}
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
              Paste a Google Drive sharing link to attach a file or folder.
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
