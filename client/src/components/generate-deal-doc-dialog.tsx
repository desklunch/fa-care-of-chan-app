import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDriveAuth } from "@/lib/google-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Folder,
  ChevronRight,
  ArrowLeft,
  Sheet,
  ExternalLink,
  LogIn,
  Check,
  HardDrive,
} from "lucide-react";
import type { DealWithRelations, DealEvent, DealLocation, DealService } from "@shared/schema";

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  driveId?: string;
}

interface DriveFolderResult {
  files: DriveFolder[];
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

type DestinationKind =
  | "myDrive"
  | "sharedDrivesIndex"
  | "sharedDrive"
  | "folder";

interface DestinationLocation {
  id: string;
  name: string;
  kind: DestinationKind;
  /** When set, queries within this location are scoped to a Shared Drive. */
  driveId?: string;
}

const MY_DRIVE_ID = "__my_drive__";
const SHARED_DRIVES_INDEX_ID = "__shared_drives__";

export interface DestinationFolder {
  id: string;
  name: string;
  driveId?: string;
}

// TODO: Consider extracting the section-chooser/breadcrumbs/folder-row pieces
// from `client/src/components/google-drive-attachments.tsx` into shared
// components so the attachments picker and this destination picker stay in
// sync visually. Keeping a focused folder-only browser here for now to avoid
// a risky refactor of the attachments picker, which also handles file
// selection, search, and pasted Drive URLs.
function DestinationFolderBrowser({
  onSelect,
  selectedFolderId,
  onNeedsDriveAuth,
}: {
  onSelect: (folder: DestinationFolder | null) => void;
  selectedFolderId: string | null;
  onNeedsDriveAuth: () => void;
}) {
  const [folderStack, setFolderStack] = useState<DestinationLocation[]>([]);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);

  const currentLocation: DestinationLocation | null =
    folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const sectionRoot: DestinationLocation | null =
    folderStack.length > 0 ? folderStack[0] : null;
  const sharedDriveContextId =
    folderStack.find((entry) => entry.kind === "sharedDrive")?.id ??
    folderStack.find((entry) => entry.driveId)?.driveId;
  const isAtPickerRoot = !sectionRoot;
  const showSectionChooser = isAtPickerRoot;

  const selectionForLocation = (location: DestinationLocation | null): DestinationFolder | null => {
    if (!location) return null;
    if (location.kind === "myDrive") return { id: "root", name: "My Drive" };
    if (location.kind === "folder") {
      return { id: location.id, name: location.name, driveId: location.driveId };
    }
    if (location.kind === "sharedDrive") {
      // Saving directly into a Shared Drive root is allowed: use the drive
      // ID as the parent folder ID for the Drive copy call.
      return {
        id: location.driveId ?? location.id,
        name: location.name,
        driveId: location.driveId ?? location.id,
      };
    }
    // The Shared Drives index page is just a chooser, not a writable target.
    return null;
  };

  const enterSection = (location: DestinationLocation) => {
    setFolderStack([location]);
    onSelect(selectionForLocation(location));
  };

  const navigateIntoFolder = (folder: DriveFolder) => {
    const driveId = folder.driveId ?? sharedDriveContextId;
    const next: DestinationLocation = {
      id: folder.id,
      name: folder.name,
      kind: "folder",
      driveId,
    };
    setFolderStack((stack) => [...stack, next]);
    onSelect({ id: folder.id, name: folder.name, driveId });
  };

  const goUpOneLocation = () => {
    const next = folderStack.slice(0, -1);
    setFolderStack(next);
    onSelect(selectionForLocation(next.length > 0 ? next[next.length - 1] : null));
  };

  const goToPickerRoot = () => {
    setFolderStack([]);
    onSelect(null);
  };

  const goToLocationAtIndex = (index: number) => {
    const next = folderStack.slice(0, index + 1);
    setFolderStack(next);
    onSelect(selectionForLocation(next[next.length - 1] ?? null));
  };

  // Build query parameters for the folder listing based on current location.
  const browseQueryParams = (() => {
    if (isAtPickerRoot) return null;
    if (currentLocation?.kind === "sharedDrivesIndex") return null;
    if (sectionRoot?.kind === "myDrive") {
      const parentId = currentLocation?.kind === "folder" ? currentLocation.id : "root";
      return { parentId } as { parentId?: string; driveId?: string };
    }
    // Inside a Shared Drive (the sectionRoot may be the sharedDrivesIndex
    // chooser, so look up the actual drive from the stack).
    const driveId =
      folderStack.find((entry) => entry.kind === "sharedDrive")?.driveId ??
      folderStack.find((entry) => entry.kind === "sharedDrive")?.id;
    if (driveId) {
      if (currentLocation?.kind === "sharedDrive") {
        return { driveId };
      }
      if (currentLocation?.kind === "folder") {
        return { parentId: currentLocation.id, driveId };
      }
    }
    return null;
  })();

  const folderListEnabled = !!browseQueryParams;

  const { data: folderResult, isLoading: isLoadingFolders } =
    useQuery<DriveFolderResult>({
      queryKey: [
        "/api/drive/folders",
        browseQueryParams?.parentId ?? "",
        browseQueryParams?.driveId ?? "",
      ],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (browseQueryParams?.parentId && browseQueryParams.parentId !== "root") {
          params.set("parentId", browseQueryParams.parentId);
        }
        if (browseQueryParams?.driveId) {
          params.set("driveId", browseQueryParams.driveId);
        }
        const res = await fetch(`/api/drive/folders?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.code === "drive_auth_required") {
            setNeedsDriveAuth(true);
            onNeedsDriveAuth();
            throw new Error("drive_auth_required");
          }
          throw new Error("Failed to list folders");
        }
        setNeedsDriveAuth(false);
        return res.json();
      },
      enabled: folderListEnabled,
      retry: false,
    });

  const isAtSharedDrivesIndex = currentLocation?.kind === "sharedDrivesIndex";
  const sharedDrivesEnabled = isAtSharedDrivesIndex;
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
            onNeedsDriveAuth();
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

  if (needsDriveAuth) {
    return null;
  }

  const sharedDrives = sharedDrivesResult?.drives ?? [];
  const folders = folderResult?.files ?? [];
  const isListLoading = showSectionChooser
    ? false
    : isAtSharedDrivesIndex
      ? isLoadingSharedDrives
      : isLoadingFolders;

  // "Select this folder" is enabled for any writable destination: My Drive
  // root, a Shared Drive root, or any folder. The intermediate Shared Drives
  // index page is a chooser, not a destination.
  const currentSelection = selectionForLocation(currentLocation);
  const canSelectCurrent = currentSelection !== null;
  const isCurrentSelected =
    canSelectCurrent &&
    !!selectedFolderId &&
    selectedFolderId === currentSelection!.id;

  return (
    <div className="space-y-2">
      {!showSectionChooser && (
      <div>
        <div
          className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground"
          data-testid="destination-picker-breadcrumb"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={goUpOneLocation}
            disabled={folderStack.length === 0}
            data-testid="button-destination-folder-up"
            aria-label="Go up one folder"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={goToPickerRoot}
            disabled={isAtPickerRoot}
            className="px-1.5 py-1 rounded-md hover-elevate active-elevate-2 disabled:opacity-100 disabled:cursor-default disabled:hover:bg-transparent font-medium text-foreground"
            data-testid="button-destination-breadcrumb-root"
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
                data-testid={`button-destination-breadcrumb-${entry.id}`}
              >
                {entry.name}
              </button>
            </span>
          ))}
          </div>
          {canSelectCurrent && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(currentSelection)}
                className={isCurrentSelected ? "border-primary" : ""}
                data-testid="button-select-current-folder"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Select this folder
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto border rounded-md">
        {isListLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : showSectionChooser ? (
          <div className="divide-y">
            <button
              type="button"
              onClick={() =>
                enterSection({
                  id: MY_DRIVE_ID,
                  name: "My Drive",
                  kind: "myDrive",
                })
              }
              className="flex items-center gap-3 p-2.5 w-full text-left hover-elevate"
              data-testid="button-destination-section-my-drive"
            >
              <HardDrive className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">My Drive</p>
                <p className="text-xs text-muted-foreground truncate">
                  Your personal Google Drive
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
            <button
              type="button"
              onClick={() =>
                enterSection({
                  id: SHARED_DRIVES_INDEX_ID,
                  name: "Shared Drives",
                  kind: "sharedDrivesIndex",
                })
              }
              className="flex items-center gap-3 p-2.5 w-full text-left hover-elevate"
              data-testid="button-destination-section-shared-drives"
            >
              <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Shared Drives</p>
                <p className="text-xs text-muted-foreground truncate">
                  Workspace drives you have access to
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </div>
        ) : isAtSharedDrivesIndex ? (
          sharedDrives.length > 0 ? (
            <div className="divide-y">
              {sharedDrives.map((drive) => (
                <button
                  key={drive.id}
                  type="button"
                  onClick={() => {
                    const next: DestinationLocation = {
                      id: drive.id,
                      name: drive.name,
                      kind: "sharedDrive",
                      driveId: drive.id,
                    };
                    setFolderStack((stack) => [...stack, next]);
                    onSelect(selectionForLocation(next));
                  }}
                  className="flex items-center gap-3 p-2.5 w-full text-left hover-elevate"
                  data-testid={`button-destination-shared-drive-${drive.id}`}
                >
                  <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium truncate">{drive.name}</p>
                      <Badge variant="secondary">Shared drive</Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              You don't have access to any Shared Drives.
            </p>
          )
        ) : folders.length > 0 ? (
          <div className="divide-y">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => navigateIntoFolder(folder)}
                className="flex items-center gap-3 p-2.5 w-full text-left hover-elevate"
                data-testid={`button-destination-folder-${folder.id}`}
              >
                <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{folder.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {currentLocation?.kind === "sharedDrive"
              ? "This Shared Drive has no folders yet"
              : "No subfolders here"}
          </p>
        )}
      </div>
    </div>
  );
}

function DealFieldPreview({ deal, servicesMap }: { deal: DealWithRelations; servicesMap: Map<number, DealService> }) {
  const ownerName = deal.owner
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ")
    : "Unassigned";

  const serviceIds = (deal.serviceIds as number[]) || [];
  const serviceNames = serviceIds
    .map((id) => servicesMap.get(id)?.name)
    .filter(Boolean);

  const locations = (deal.locations as DealLocation[]) || [];
  const events = (deal.eventSchedule as DealEvent[]) || [];

  const budgetRange =
    deal.budgetLow || deal.budgetHigh
      ? `$${(deal.budgetLow || 0).toLocaleString()} - $${(deal.budgetHigh || 0).toLocaleString()}`
      : null;

  const fields: { label: string; value: string }[] = [
    { label: "Deal Name", value: deal.displayName },
    { label: "Client", value: deal.client?.name || "No client" },
    { label: "Status", value: deal.statusName || "Unknown" },
    { label: "Owner", value: ownerName },
  ];
  if (serviceNames.length > 0) fields.push({ label: "Services", value: serviceNames.join(", ") });
  if (budgetRange) fields.push({ label: "Budget", value: budgetRange });
  if (deal.budgetNotes) fields.push({ label: "Budget Notes", value: "Included" });
  if (locations.length > 0) fields.push({ label: "Locations", value: locations.map((l) => l.displayName).join(", ") });
  if (events.length > 0) fields.push({ label: "Project Dates", value: `${events.length} event${events.length !== 1 ? "s" : ""}` });
  if (deal.concept) fields.push({ label: "Concept", value: deal.concept.slice(0, 100) + (deal.concept.length > 100 ? "..." : "") });
  if (deal.nextSteps) fields.push({ label: "Next Steps", value: deal.nextSteps.slice(0, 100) + (deal.nextSteps.length > 100 ? "..." : "") });
  if (deal.notes) fields.push({ label: "Notes", value: "Included" });
  if (deal.primaryContact) {
    const contactName = [deal.primaryContact.firstName, deal.primaryContact.lastName].filter(Boolean).join(" ");
    fields.push({ label: "Primary Contact", value: contactName });
  }
  if (deal.startedOn) fields.push({ label: "Deal Start Date", value: deal.startedOn });
  if (deal.lastContactOn) fields.push({ label: "Last Client Contact", value: deal.lastContactOn });
  if (deal.wonOn) fields.push({ label: "Deal Won On", value: deal.wonOn });
  if (deal.proposalSentOn) fields.push({ label: "Proposal Sent On", value: deal.proposalSentOn });

  return (
    <div className="rounded-md border p-3 space-y-1.5 bg-muted/30 min-w-0 overflow-hidden">
      <p className="text-xs font-medium text-muted-foreground mb-2">Fields available for template tokens:</p>
      {fields.map((f) => (
        <div key={f.label} className="flex gap-2 text-xs min-w-0">
          <span className="font-medium text-muted-foreground w-28 flex-shrink-0">{f.label}</span>
          <span className="truncate min-w-0 flex-1">{f.value}</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
        Intake form fields and tags are also included when available.
      </p>
    </div>
  );
}

interface GenerateDealDocDialogProps {
  deal: DealWithRelations;
  servicesMap: Map<number, DealService>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: "intake" | "discovery";
}

export function GenerateDealDocDialog({ deal, servicesMap, open, onOpenChange, kind = "intake" }: GenerateDealDocDialogProps) {
  const isDiscovery = kind === "discovery";
  const kindLabel = isDiscovery ? "Deal Discovery" : "Deal Summary";
  const { toast } = useToast();
  const { promptDriveAuth } = useDriveAuth();
  const [selectedFolder, setSelectedFolder] = useState<DestinationFolder | null>(null);
  const [createdDoc, setCreatedDoc] = useState<{ id: string; webViewLink: string; name: string } | null>(null);
  const [showDriveAuth, setShowDriveAuth] = useState(false);

  const { data: driveStatus } = useQuery<{ connected: boolean; needsReauth: boolean }>({
    queryKey: ["/api/auth/drive-status"],
    enabled: open,
  });

  const needsAuth = open && driveStatus && (!driveStatus.connected || driveStatus.needsReauth);
  const driveConnected = !!driveStatus && driveStatus.connected && !driveStatus.needsReauth;

  useEffect(() => {
    if (driveConnected && showDriveAuth) {
      setShowDriveAuth(false);
    }
  }, [driveConnected, showDriveAuth]);

  const generateMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await apiRequest("POST", `/api/deals/${deal.id}/generate-doc`, { folderId, kind });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedDoc(data.doc);
      queryClient.invalidateQueries({ queryKey: ["/api/drive-attachments", "deal", deal.id] });
      toast({
        title: "Sheet created",
        description: (
          <span>
            {kindLabel} sheet saved to Google Drive.{" "}
            <a
              href={data.doc.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Open Sheet
            </a>
          </span>
        ),
      });
    },
    onError: (error: Error) => {
      if (error.message?.includes("drive_folder_write_denied")) {
        toast({
          title: "Can't save to that folder",
          description:
            "You don't have permission to save files in the selected Shared Drive folder. Pick a folder where you have edit access, or ask the Shared Drive owner for access.",
          variant: "destructive",
        });
        return;
      }
      if (error.message?.includes("drive_auth_required")) {
        setShowDriveAuth(true);
        return;
      }
      if (error.message?.includes("sheets_api_disabled")) {
        toast({
          title: "Google Sheets API not enabled",
          description: "Please enable the Google Sheets API in your Google Cloud Console project, then try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to generate sheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedFolder) return;
    generateMutation.mutate(selectedFolder.id);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedFolder(null);
      setCreatedDoc(null);
      setShowDriveAuth(false);
    }, 200);
  };

  if (showDriveAuth || needsAuth) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Google Drive</DialogTitle>
            <DialogDescription>
              You need to connect your Google Drive to generate summary sheets.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <LogIn className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Grant access so the app can create sheets in your Drive.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                promptDriveAuth();
              }}
              data-testid="button-connect-drive-for-doc"
            >
              <LogIn className="h-4 w-4 mr-1" />
              Connect Google Drive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (createdDoc) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sheet Created</DialogTitle>
            <DialogDescription>
              Your {kindLabel.toLowerCase()} sheet has been created in Google Drive and attached to this deal's files.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-md border w-full">
              <Sheet className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{createdDoc.name}</p>
                <p className="text-xs text-muted-foreground">Google Sheet</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-close-doc-dialog"
              >
                Close
              </Button>
              <Button
                className="flex-1"
                asChild
                data-testid="button-open-doc"
              >
                <a href={createdDoc.webViewLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Sheet
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate {kindLabel}</DialogTitle>
          <DialogDescription>
            Create a Google Sheet from the {kindLabel} template with this deal's information filled in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 min-w-0 overflow-hidden">
          {/* <DealFieldPreview deal={deal} servicesMap={servicesMap} /> */}

          <div className="space-y-2">
            <p className="text-sm font-medium">Choose a destination folder</p>
            <DestinationFolderBrowser
              onSelect={setSelectedFolder}
              selectedFolderId={selectedFolder?.id || null}
              onNeedsDriveAuth={() => setShowDriveAuth(true)}
            />
            {selectedFolder && (
              <p className="text-xs text-muted-foreground">
                Sheet will be saved to: <span className="font-medium">{selectedFolder.name}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-generate-doc">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedFolder || generateMutation.isPending}
            data-testid="button-confirm-generate-doc"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sheet className="h-4 w-4 mr-1" />
                Generate Sheet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
