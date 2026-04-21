import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Copy, KeyRound, Loader2, Plus, Trash2, Check } from "lucide-react";

interface ApiKeyView {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface CreatedApiKey extends ApiKeyView {
  token: string;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function ApiKeysCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyView | null>(null);

  const { data: keys = [], isLoading } = useQuery<ApiKeyView[]>({
    queryKey: ["/api/profile/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (newLabel: string) => {
      const res = await apiRequest("POST", "/api/profile/api-keys", { label: newLabel });
      return (await res.json()) as CreatedApiKey;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/profile/api-keys"] });
      setCreatedKey(data);
      setCreateOpen(false);
      setLabel("");
      setCopied(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create key", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/profile/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/api-keys"] });
      toast({ title: "API key revoked" });
      setRevokeTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to revoke key", description: err.message, variant: "destructive" });
    },
  });

  const mcpUrl = `${window.location.origin}/api/mcp`;

  const handleCopyToken = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <>
      <Card className="border-card-border" data-testid="card-api-keys">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Connected Apps & API Keys</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            data-testid="button-new-api-key"
          >
            <Plus className="h-4 w-4 mr-1" /> New Key
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-medium">Connect Claude or any MCP client</p>
            <p className="text-muted-foreground">
              Generate a personal API key, then add a remote MCP server in your client using the URL
              and token below. Deals you create through chat will be attributed to you.
            </p>
            <div className="grid gap-2 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">MCP Server URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input readOnly value={mcpUrl} data-testid="input-mcp-url" className="font-mono text-xs" />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(mcpUrl)}
                    data-testid="button-copy-mcp-url"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Authorization</Label>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <div>
                    Header (Claude Desktop, IDE clients):{" "}
                    <code className="font-mono">Authorization: Bearer YOUR_KEY</code>
                  </div>
                  <div>
                    URL (Claude.ai web custom connector — no header field):{" "}
                    <code className="font-mono break-all">{mcpUrl}?token=YOUR_KEY</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Active keys</h4>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active keys yet.</p>
            ) : (
              <div className="space-y-2">
                {activeKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                    data-testid={`row-api-key-${key.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`text-api-key-label-${key.id}`}>
                          {key.label}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {key.keyPrefix}…
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last used: {formatDate(key.lastUsedAt)} · Created: {formatDate(key.createdAt)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevokeTarget(key)}
                      data-testid={`button-revoke-api-key-${key.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {revokedKeys.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Revoked keys</h4>
              <div className="space-y-2">
                {revokedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3 opacity-60"
                    data-testid={`row-api-key-revoked-${key.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.label}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {key.keyPrefix}…
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Revoked: {formatDate(key.revokedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give this key a label so you can recognize where it's used (e.g. "Claude Desktop").
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="api-key-label">Label</Label>
            <Input
              id="api-key-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Claude Desktop"
              data-testid="input-api-key-label"
              maxLength={100}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create-key">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(label.trim())}
              disabled={!label.trim() || createMutation.isPending}
              data-testid="button-confirm-create-key"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time you'll see the full token. Store it somewhere safe—if you lose it,
              revoke the key and create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Token</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={createdKey?.token ?? ""}
                className="font-mono text-xs"
                data-testid="input-new-api-key-token"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleCopyToken}
                data-testid="button-copy-new-api-key"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)} data-testid="button-done-new-api-key">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any client using "{revokeTarget?.label}" will immediately lose access. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke-key">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
              data-testid="button-confirm-revoke-key"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
