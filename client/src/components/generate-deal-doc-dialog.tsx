import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDriveAuth } from "@/lib/google-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Sheet,
  ExternalLink,
  LogIn,
  Check,
} from "lucide-react";
import type { DealWithRelations, DealEvent, DealLocation, DealService } from "@shared/schema";

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

interface DriveFolderResult {
  files: DriveFolder[];
  nextPageToken?: string;
}

function FolderBrowser({
  onSelect,
  selectedFolderId,
  onNeedsDriveAuth,
}: {
  onSelect: (folder: { id: string; name: string } | null) => void;
  selectedFolderId: string | null;
  onNeedsDriveAuth: () => void;
}) {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const currentParentId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  const { data: folderResult, isLoading } = useQuery<DriveFolderResult>({
    queryKey: ["/api/drive/folders", currentParentId || "root"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentParentId) params.set("parentId", currentParentId);
      const res = await fetch(`/api/drive/folders?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.code === "drive_auth_required") {
          setNeedsDriveAuth(true);
          onNeedsDriveAuth();
          throw new Error("drive_auth_required");
        }
        throw new Error("Failed to load folders");
      }
      setNeedsDriveAuth(false);
      return res.json();
    },
    retry: false,
  });

  if (needsDriveAuth) {
    return null;
  }

  const navigateInto = (folder: DriveFolder) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
    onSelect({ id: folder.id, name: folder.name });
  };

  const navigateUp = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    if (newStack.length > 0) {
      onSelect(newStack[newStack.length - 1]);
    } else {
      onSelect(null);
    }
  };

  const currentFolderName = folderStack.length > 0 ? folderStack[folderStack.length - 1].name : "My Drive";
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : "root";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {folderStack.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateUp}
            data-testid="button-folder-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{currentFolderName}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelect({ id: currentFolderId, name: currentFolderName })}
          className={selectedFolderId === currentFolderId ? "border-primary" : ""}
          data-testid="button-select-current-folder"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Select this folder
        </Button>
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : folderResult?.files && folderResult.files.length > 0 ? (
          <div className="divide-y">
            {folderResult.files.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateInto(folder)}
                className="flex items-center gap-3 p-2.5 w-full text-left hover-elevate"
                data-testid={`button-folder-${folder.id}`}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1">{folder.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No subfolders found
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
    <div className="rounded-md border p-3 space-y-1.5 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground mb-2">Fields available for template tokens:</p>
      {fields.map((f) => (
        <div key={f.label} className="flex gap-2 text-xs">
          <span className="font-medium text-muted-foreground w-28 flex-shrink-0">{f.label}</span>
          <span className="truncate">{f.value}</span>
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
}

export function GenerateDealDocDialog({ deal, servicesMap, open, onOpenChange }: GenerateDealDocDialogProps) {
  const { toast } = useToast();
  const { promptDriveAuth } = useDriveAuth();
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string } | null>(null);
  const [createdDoc, setCreatedDoc] = useState<{ id: string; webViewLink: string; name: string } | null>(null);
  const [showDriveAuth, setShowDriveAuth] = useState(false);

  const { data: driveStatus } = useQuery<{ connected: boolean; needsReauth: boolean }>({
    queryKey: ["/api/auth/drive-status"],
    enabled: open,
  });

  const needsAuth = open && driveStatus && (!driveStatus.connected || driveStatus.needsReauth);

  const generateMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await apiRequest("POST", `/api/deals/${deal.id}/generate-doc`, { folderId });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedDoc(data.doc);
      queryClient.invalidateQueries({ queryKey: ["/api/drive-attachments", "deal", deal.id] });
      toast({
        title: "Sheet created",
        description: (
          <span>
            Deal summary sheet saved to Google Drive.{" "}
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
      if (error.message?.includes("drive_auth_required")) {
        setShowDriveAuth(true);
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
                handleClose();
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
              Your deal summary sheet has been created in Google Drive and attached to this deal's files.
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
          <DialogTitle>Generate Deal Summary</DialogTitle>
          <DialogDescription>
            Create a Google Sheet from the template with this deal's information filled in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DealFieldPreview deal={deal} servicesMap={servicesMap} />

          <div className="space-y-2">
            <p className="text-sm font-medium">Choose a destination folder</p>
            <FolderBrowser
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
