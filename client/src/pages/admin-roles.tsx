import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import {
  Plus,
  Shield,
  ShieldCheck,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Lock,
} from "lucide-react";
import type { RoleRecord } from "@shared/schema";
import {
  TIER_PRESETS,
  ALL_PERMISSIONS,
  getPermissionsByResource,
  type Permission,
} from "@shared/permissions";

const RESOURCE_LABELS: Record<string, string> = {
  venues: "Venues",
  clients: "Clients",
  contacts: "Contacts",
  vendors: "Vendors",
  deals: "Deals",
  sales: "Sales",
  team: "Team",
  audit: "Audit",
  app_features: "App Features",
  releases: "Releases",
  admin: "Admin",
  vendor_tokens: "Vendor Tokens",
  theme: "Theme",
  search: "Search",
};

function PermissionToggleGroup({
  resource,
  permissions,
  enabledPermissions,
  onToggle,
}: {
  resource: string;
  permissions: Permission[];
  enabledPermissions: string[];
  onToggle: (perm: string, enabled: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">
        {RESOURCE_LABELS[resource] || resource}
      </h4>
      <div className="space-y-1">
        {permissions.map((perm) => {
          const action = perm.split(".").slice(1).join(".");
          const isEnabled = enabledPermissions.includes(perm);
          return (
            <div
              key={perm}
              className="flex items-center justify-between py-1 px-2 rounded-md"
              data-testid={`permission-toggle-${perm}`}
            >
              <span className="text-sm text-muted-foreground">{action}</span>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => onToggle(perm, checked)}
                data-testid={`switch-${perm}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleEditor({
  role,
  onClose,
}: {
  role: RoleRecord;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [permissions, setPermissions] = useState<string[]>(role.permissions || []);
  const permissionsByResource = getPermissionsByResource();

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; permissions?: string[] }) => {
      const res = await apiRequest("PATCH", `/api/roles/${role.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role updated", description: `"${name}" has been updated.` });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    },
  });

  const handleToggle = (perm: string, enabled: boolean) => {
    setPermissions((prev) =>
      enabled ? [...prev, perm] : prev.filter((p) => p !== perm)
    );
  };

  const handleSave = () => {
    updateMutation.mutate({ name, description, permissions });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={role.isSystem}
            data-testid="input-role-name-edit"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="input-role-description-edit"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">
          Permissions ({permissions.length} of {ALL_PERMISSIONS.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(permissionsByResource).map(([resource, perms]) => (
            <Card key={resource}>
              <CardContent className="pt-4 pb-3">
                <PermissionToggleGroup
                  resource={resource}
                  permissions={perms}
                  enabledPermissions={permissions}
                  onToggle={handleToggle}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !name.trim()}
          data-testid="button-save-role"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function NewRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: string[] }) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role created", description: `"${name}" has been created.` });
      onOpenChange(false);
      setName("");
      setDescription("");
      setPreset("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create role", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const permissions = preset ? TIER_PRESETS[preset]?.permissions || [] : [];
    createMutation.mutate({ name, description, permissions: permissions as string[] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a new role with custom permissions. You can optionally start from a tier preset.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales Manager"
              data-testid="input-role-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for..."
              data-testid="input-role-description"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Start from preset (optional)</label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger data-testid="select-preset">
                <SelectValue placeholder="No preset — start with no permissions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No preset</SelectItem>
                {Object.entries(TIER_PRESETS).map(([key, tier]) => (
                  <SelectItem key={key} value={key} data-testid={`select-preset-${key}`}>
                    {tier.label} ({tier.permissions.length} permissions)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !name.trim()}
            data-testid="button-create-role"
          >
            {createMutation.isPending ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleCard({
  role,
  expandedRoleId,
  onToggleExpand,
}: {
  role: RoleRecord;
  expandedRoleId: number | null;
  onToggleExpand: (id: number | null) => void;
}) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isExpanded = expandedRoleId === role.id;

  const { data: userCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/roles", role.id, "users", "count"],
    enabled: showDeleteDialog,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/roles/${role.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted", description: `"${role.name}" has been deleted.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete role", variant: "destructive" });
    },
  });

  return (
    <>
      <Card data-testid={`card-role-${role.id}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              onClick={() => onToggleExpand(isExpanded ? null : role.id)}
              className="flex items-center gap-2 min-w-0"
              data-testid={`button-expand-role-${role.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <CardTitle className="text-base truncate">{role.name}</CardTitle>
            </button>
            {role.isSystem && (
              <Badge variant="secondary" className="shrink-0">
                <Lock className="h-3 w-3 mr-1" />
                System
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" data-testid={`badge-permission-count-${role.id}`}>
              {role.permissions?.length || 0} permissions
            </Badge>
            {!role.isSystem && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                data-testid={`button-delete-role-${role.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        {role.description && !isExpanded && (
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </CardContent>
        )}
        {isExpanded && (
          <CardContent className="pt-2">
            <RoleEditor role={role} onClose={() => onToggleExpand(null)} />
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{role.name}"?
              {userCountData && userCountData.count > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  {userCountData.count} user(s) currently have this role. You must reassign them before deleting.
                </span>
              )}
              {userCountData && userCountData.count === 0 && (
                <span className="block mt-2">
                  No users currently have this role.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || (userCountData != null && userCountData.count > 0)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminRoles() {
  usePageTitle("Role Management");
  const { can } = usePermissions();
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const hasAdminSettings = can("admin.settings");

  const { data: rolesData, isLoading } = useQuery<RoleRecord[]>({
    queryKey: ["/api/roles"],
    enabled: hasAdminSettings,
  });

  if (!hasAdminSettings) {
    return (
      <PageLayout title="Role Management">
        <NoPermissionMessage />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Role Management"
      actions={
        <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-role">
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span>{rolesData?.length || 0} roles configured</span>
            </div>
            <div className="space-y-3">
              {rolesData?.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  expandedRoleId={expandedRoleId}
                  onToggleExpand={setExpandedRoleId}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <NewRoleDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </PageLayout>
  );
}
