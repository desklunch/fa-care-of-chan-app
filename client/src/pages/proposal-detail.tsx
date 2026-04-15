import { useState } from "react";
import { useParams } from "wouter";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRow } from "@/components/inline-edit/field-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermissions } from "@/hooks/usePermissions";
import { CommentList } from "@/components/ui/comments";
import { ProposalTaskGrid } from "@/components/proposal-task-grid";
import { format } from "date-fns";
import {
  Loader2,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Circle,
  Clock,
  Link as LinkIcon,
  Users,
  ExternalLink,
  UserPlus,
  ArrowLeft,
  History,
} from "lucide-react";
import { EntityLinksPanel } from "@/components/entity-links-panel";
import type {
  ProposalWithRelations,
  ProposalStatusRecord,
  ProposalTask,
  ProposalTaskWithRelations,
  ProposalStakeholder,
  EntityTeamMemberWithUser,
  User,
} from "@shared/schema";

interface StakeholderWithRelations extends ProposalStakeholder {
  user: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl" | "email"> | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddresses: string[] | null;
    jobTitle: string | null;
  } | null;
}

interface CollaboratorUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-amber-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function ProposalDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const { can } = usePermissions();
  const canWrite = can("proposals.write");
  const canDelete = can("proposals.delete");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddStakeholderDialog, setShowAddStakeholderDialog] = useState(false);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [stakeholderType, setStakeholderType] = useState<"user" | "contact">("user");
  const [stakeholderSearchId, setStakeholderSearchId] = useState("");
  const [teamMemberUserId, setTeamMemberUserId] = useState("");
  const [teamMemberRole, setTeamMemberRole] = useState("");

  const { data: proposal, isLoading } = useQuery<ProposalWithRelations>({
    queryKey: ["/api/proposals", params.id],
  });

  const { data: statuses = [] } = useQuery<ProposalStatusRecord[]>({
    queryKey: ["/api/proposals/statuses"],
  });

  const { data: tasks = [] } = useQuery<ProposalTaskWithRelations[]>({
    queryKey: ["/api/proposals", params.id, "tasks"],
    enabled: !!params.id,
  });

  const { data: stakeholders = [] } = useQuery<StakeholderWithRelations[]>({
    queryKey: ["/api/proposals", params.id, "stakeholders"],
    enabled: !!params.id,
  });

  const { data: teamMembers = [] } = useQuery<EntityTeamMemberWithUser[]>({
    queryKey: ["/api/proposals", params.id, "team"],
    enabled: !!params.id,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  usePageTitle(proposal?.title || "Proposal");

  const updateProposal = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/proposals/${params.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
  });

  const deleteProposal = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/proposals/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setLocation("/proposals");
      toast({ title: "Proposal deleted" });
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: { name: string; description?: string; parentTaskId?: string }) => {
      const res = await apiRequest("POST", `/api/proposals/${params.id}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "tasks"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/proposals/${params.id}/tasks/${taskId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/proposals/${params.id}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "tasks"] });
      if (selectedTaskId) setSelectedTaskId(null);
    },
  });

  const reorderTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await apiRequest("POST", `/api/proposals/${params.id}/tasks/reorder`, { taskIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "tasks"] });
    },
  });


  const addStakeholder = useMutation({
    mutationFn: async (data: { userId?: string; contactId?: string }) => {
      const res = await apiRequest("POST", `/api/proposals/${params.id}/stakeholders`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "stakeholders"] });
      setShowAddStakeholderDialog(false);
      setStakeholderSearchId("");
    },
  });

  const removeStakeholder = useMutation({
    mutationFn: async (stakeholderId: string) => {
      await apiRequest("DELETE", `/api/proposals/${params.id}/stakeholders/${stakeholderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "stakeholders"] });
    },
  });

  const addTeamMember = useMutation({
    mutationFn: async (data: { userId: string; role?: string }) => {
      const res = await apiRequest("POST", `/api/proposals/${params.id}/team`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "team"] });
      setShowAddTeamDialog(false);
      setTeamMemberUserId("");
      setTeamMemberRole("");
    },
  });

  const removeTeamMember = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/proposals/${params.id}/team/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", params.id, "team"] });
    },
  });

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Proposals", href: "/proposals" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!proposal) {
    return (
      <PageLayout breadcrumbs={[{ label: "Proposals", href: "/proposals" }, { label: "Not Found" }]}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <span className="text-muted-foreground">Proposal not found</span>
          <Button variant="outline" onClick={() => setLocation("/proposals")} data-testid="button-back-proposals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </div>
      </PageLayout>
    );
  }

  const currentStatus = statuses.find((s) => s.id === proposal.status);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ??
    tasks.flatMap((t) => t.subTasks ?? []).find((s) => s.id === selectedTaskId) ?? null;

  const tasksDone = tasks.reduce((sum, t) => {
    const subDone = t.subTasks?.filter((s) => s.status === "done").length ?? 0;
    return sum + (t.status === "done" ? 1 : 0) + subDone;
  }, 0);
  const tasksTotal = tasks.reduce((sum, t) => sum + 1 + (t.subTasks?.length ?? 0), 0);

  const locations = (proposal.locations ?? []) as Array<{ displayName?: string; city?: string; state?: string; country?: string }>;
  const eventSchedule = (proposal.eventSchedule ?? []) as Array<{ name?: string; date?: string; startTime?: string; endTime?: string }>;

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Proposals", href: "/proposals" },
        { label: proposal.title },
      ]}
      additionalActions={[
        ...(canWrite
          ? statuses
              .filter((s) => s.isActive && s.id !== proposal.status)
              .map((s) => ({
                label: `Set ${s.label}`,
                onClick: () => updateProposal.mutate({ status: s.id }),
                variant: "default" as const,
              }))
          : []),
        ...(proposal.deal
          ? [
              {
                label: "View Deal",
                onClick: () => setLocation(`/deals/${proposal.deal!.id}`),
                icon: ExternalLink,
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                label: "Delete Proposal",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive" as const,
              },
            ]
          : []),
      ]}
    >
      <div className="">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="max-w-4xl p-4 md:px-6 pb-2 md:pb-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {proposal.client && (
                    <span className="text-sm font-semibold" data-testid="badge-client">
                      {proposal.client.name}
                    </span>
                  )}
                  {currentStatus && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                      style={
                        currentStatus.color
                          ? { backgroundColor: `${currentStatus.color}20`, color: currentStatus.color, borderColor: `${currentStatus.color}40` }
                          : undefined
                      }
                      data-testid="badge-proposal-status"
                    >
                      {currentStatus.label}
                    </Badge>
                  )}
                </div>

                <h1 className="text-xl font-semibold" data-testid="text-proposal-title">
                  {proposal.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {proposal.owner && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={proposal.owner.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {(proposal.owner.firstName?.[0] || "") + (proposal.owner.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <span data-testid="text-proposal-owner">{proposal.owner.firstName} {proposal.owner.lastName}</span>
                    </div>
                  )}
                  {proposal.createdAt && (
                    <span data-testid="text-created-date">Created {format(new Date(proposal.createdAt), "MMM d, yyyy")}</span>
                  )}
                  {tasksTotal > 0 && (
                    <span data-testid="text-task-progress">{tasksDone}/{tasksTotal} tasks done</span>
                  )}
                </div>
              </div>
            </div>

            <TabsList data-testid="tabs-proposal" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="stakeholders" data-testid="tab-stakeholders">
                Stakeholders
              </TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">
                Comments
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="max-w-4xl space-y-4 p-4 md:p-6 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base" data-testid="heading-proposal-overview">
                  Proposal Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <FieldRow label="Description" testId="field-description">
                  <p className="text-sm" data-testid="text-description">
                    {proposal.description || <span className="text-muted-foreground">No description provided</span>}
                  </p>
                </FieldRow>

                <FieldRow label="Team Members" testId="field-team-members">
                  {teamMembers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {teamMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={m.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(m.user?.firstName?.[0] || "") + (m.user?.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{m.user?.firstName} {m.user?.lastName}</span>
                          {m.role && <Badge variant="secondary" className="text-xs">{m.role}</Badge>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No team members assigned</span>
                  )}
                </FieldRow>

                <FieldRow label="Task Progress" testId="field-task-progress">
                  {tasksTotal > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span>{tasksDone} of {tasksTotal} complete</span>
                        <span className="text-muted-foreground">{Math.round((tasksDone / tasksTotal) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-md transition-all"
                          style={{ width: `${(tasksDone / tasksTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No tasks added yet</span>
                  )}
                </FieldRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base" data-testid="heading-project-info">
                  Project Info
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <FieldRow label="Locations" testId="field-locations">
                  {locations.length > 0 ? (
                    <div className="space-y-1" data-testid="text-locations">
                      {locations.map((loc, i) => (
                        <p key={i} className="text-sm">
                          {loc.displayName || [loc.city, loc.state, loc.country].filter(Boolean).join(", ")}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No locations specified</span>
                  )}
                </FieldRow>

                <FieldRow label="Event Schedule" testId="field-event-schedule">
                  {eventSchedule.length > 0 ? (
                    <div className="space-y-2" data-testid="text-event-schedule">
                      {eventSchedule.map((evt, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{evt.name || `Event ${i + 1}`}</span>
                          {evt.date && (
                            <span className="text-muted-foreground ml-2">
                              {format(new Date(evt.date), "MMM d, yyyy")}
                              {evt.startTime ? ` ${evt.startTime}` : ""}
                              {evt.endTime ? ` - ${evt.endTime}` : ""}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No events scheduled</span>
                  )}
                </FieldRow>

                <FieldRow label="Budget" testId="field-budget">
                  <div data-testid="text-budget">
                    {(proposal.budgetLow != null || proposal.budgetHigh != null) ? (
                      <div className="space-y-1">
                        <p className="text-sm">
                          {formatCurrency(proposal.budgetLow)}
                          {proposal.budgetLow != null && proposal.budgetHigh != null ? " - " : ""}
                          {formatCurrency(proposal.budgetHigh)}
                        </p>
                        {proposal.budgetNotes && (
                          <p className="text-xs text-muted-foreground">{proposal.budgetNotes}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No budget set</span>
                    )}
                  </div>
                </FieldRow>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="p-4 md:p-6 pt-4">
            <ProposalTaskGrid
              tasks={tasks}
              allUsers={allUsers}
              canWrite={canWrite}
              onUpdateTask={(taskId, data) => updateTask.mutate({ taskId, data })}
              onCreateTask={(data) => createTask.mutate(data)}
              onReorderTasks={(taskIds) => reorderTasks.mutate(taskIds)}
              onSelectTask={(taskId) => setSelectedTaskId(taskId)}
              selectedTaskId={selectedTaskId}
            />
          </TabsContent>

          <TabsContent value="stakeholders" className="p-4 md:p-6 pt-4 max-w-4xl space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Team Members</h2>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddTeamDialog(true)}
                    data-testid="button-add-team-member"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                )}
              </div>

              {teamMembers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <span className="text-sm">No team members assigned</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((m) => (
                    <Card key={m.id} className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {(m.user?.firstName?.[0] || "") + (m.user?.lastName?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium" data-testid={`text-team-member-${m.id}`}>
                              {m.user?.firstName} {m.user?.lastName}
                            </div>
                            {m.role && (
                              <div className="text-xs text-muted-foreground">{m.role}</div>
                            )}
                          </div>
                        </div>
                        {canWrite && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeTeamMember.mutate(m.id)}
                            data-testid={`button-remove-team-${m.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium">Stakeholders</h2>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddStakeholderDialog(true)}
                    data-testid="button-add-stakeholder"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Stakeholder
                  </Button>
                )}
              </div>

              {stakeholders.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <span className="text-sm">No stakeholders added</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {stakeholders.map((s) => (
                    <Card key={s.id} className="p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {s.user ? (
                              <>
                                <AvatarImage src={s.user?.profileImageUrl || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(s.user?.firstName?.[0] || "") + (s.user?.lastName?.[0] || "")}
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback className="text-xs">
                                {(s.contact?.firstName?.[0] || "") + (s.contact?.lastName?.[0] || "")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium" data-testid={`text-stakeholder-${s.id}`}>
                              {s.user
                                ? `${s.user.firstName} ${s.user.lastName}`
                                : s.contact
                                  ? `${s.contact.firstName} ${s.contact.lastName}`
                                  : "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {s.user ? "Internal" : "External Contact"}
                              {s.contact?.jobTitle ? ` \u00b7 ${s.contact.jobTitle}` : ""}
                            </div>
                          </div>
                        </div>
                        {canWrite && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeStakeholder.mutate(s.id)}
                            data-testid={`button-remove-stakeholder-${s.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comments" className="p-4 md:p-6 pt-4 max-w-4xl">
            <CommentList entityType="proposal" entityId={params.id!} />
          </TabsContent>

          <TabsContent value="activity" className="p-4 md:p-6 pt-4 max-w-4xl">
            <ProposalActivityTimeline proposalId={params.id!} />
          </TabsContent>
        </Tabs>
      </div>

      <TaskDetailSheet
        task={selectedTask}
        proposalId={params.id!}
        canWrite={canWrite}
        allUsers={allUsers}
        onClose={() => setSelectedTaskId(null)}
        onUpdateTask={(taskId, data) => updateTask.mutate({ taskId, data })}
        onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
        onCreateSubTask={(parentTaskId, name) =>
          createTask.mutate({ name, parentTaskId })
        }
      />

      <Dialog open={showAddStakeholderDialog} onOpenChange={setShowAddStakeholderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stakeholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={stakeholderType === "user" ? "default" : "outline"}
                size="sm"
                onClick={() => setStakeholderType("user")}
                data-testid="button-stakeholder-user"
              >
                Internal User
              </Button>
              <Button
                variant={stakeholderType === "contact" ? "default" : "outline"}
                size="sm"
                onClick={() => setStakeholderType("contact")}
                data-testid="button-stakeholder-contact"
              >
                External Contact
              </Button>
            </div>
            {stakeholderType === "user" ? (
              <Select value={stakeholderSearchId} onValueChange={setStakeholderSearchId}>
                <SelectTrigger data-testid="select-stakeholder-user">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Contact ID"
                value={stakeholderSearchId}
                onChange={(e) => setStakeholderSearchId(e.target.value)}
                data-testid="input-stakeholder-contact-id"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStakeholderDialog(false)} data-testid="button-cancel-stakeholder">
              Cancel
            </Button>
            <Button
              onClick={() =>
                addStakeholder.mutate(
                  stakeholderType === "user"
                    ? { userId: stakeholderSearchId }
                    : { contactId: stakeholderSearchId },
                )
              }
              disabled={!stakeholderSearchId || addStakeholder.isPending}
              data-testid="button-submit-stakeholder"
            >
              {addStakeholder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={teamMemberUserId} onValueChange={setTeamMemberUserId}>
              <SelectTrigger data-testid="select-team-member">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Role (optional, e.g. Creative Director)"
              value={teamMemberRole}
              onChange={(e) => setTeamMemberRole(e.target.value)}
              data-testid="input-team-member-role"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeamDialog(false)} data-testid="button-cancel-team">
              Cancel
            </Button>
            <Button
              onClick={() =>
                addTeamMember.mutate({
                  userId: teamMemberUserId,
                  role: teamMemberRole || undefined,
                })
              }
              disabled={!teamMemberUserId || addTeamMember.isPending}
              data-testid="button-submit-team"
            >
              {addTeamMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this proposal? This will also remove
              all tasks, stakeholders, and team members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProposal.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}


interface TaskActivityEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  performedAt: string;
  performerFirstName: string | null;
  performerLastName: string | null;
}

function TaskActivitySection({ taskId }: { taskId: string }) {
  const { data: activity = [], isLoading } = useQuery<TaskActivityEntry[]>({
    queryKey: ["/api/proposals/tasks", taskId, "activity"],
    enabled: !!taskId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activity.length === 0) return null;

  function formatAction(action: string): string {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Activity</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activity.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 text-xs text-muted-foreground" data-testid={`activity-entry-${entry.id}`}>
            <History className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-foreground">
                {entry.performerFirstName
                  ? `${entry.performerFirstName} ${entry.performerLastName || ""}`
                  : "System"}
              </span>{" "}
              <span>{formatAction(entry.action)}</span>
              {entry.performedAt && (
                <span className="ml-1">
                  {format(new Date(entry.performedAt), "MMM d, h:mm a")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivityEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  performedAt: string;
  performerFirstName: string | null;
  performerLastName: string | null;
}

function describeActivity(entry: ActivityEntry): string {
  const entityLabels: Record<string, string> = {
    proposal: "proposal",
    proposal_task: "task",
    proposal_task_link: "task link",
    proposal_stakeholder: "stakeholder",
    entity_team_member: "team member",
  };
  const entityLabel = entityLabels[entry.entityType] || entry.entityType;

  const actionLabels: Record<string, string> = {
    create: "added",
    update: "updated",
    delete: "removed",
  };
  const actionLabel = actionLabels[entry.action] || entry.action;

  const changes = entry.changes as Record<string, unknown> | null;
  let detail = "";

  if (entry.entityType === "proposal" && entry.action === "update" && changes) {
    if (changes.before && changes.after) {
      const before = changes.before as Record<string, unknown>;
      const after = changes.after as Record<string, unknown>;
      if (before.status !== undefined && after.status !== undefined) {
        return `changed proposal status`;
      }
    }
    const changedKeys = Object.keys(changes).filter(
      (k) => k !== "before" && k !== "after",
    );
    if (changedKeys.length > 0) {
      detail = ` (${changedKeys.join(", ")})`;
    }
  }

  if (entry.entityType === "proposal_task" && changes) {
    if (changes.taskName) {
      detail = ` "${changes.taskName}"`;
    }
    if (changes.status === "done") {
      return `completed task${detail}`;
    }
  }

  if (entry.entityType === "proposal_task_link" && changes?.url) {
    detail = ` (${changes.url})`;
  }

  if (entry.entityType === "proposal" && entry.action === "create") {
    return "created proposal";
  }

  return `${actionLabel} ${entityLabel}${detail}`;
}

function getActivityIcon(entry: ActivityEntry) {
  if (entry.entityType === "proposal_task" && entry.action === "create")
    return <Plus className="h-3.5 w-3.5" />;
  if (
    entry.entityType === "proposal_task" &&
    (entry.changes as Record<string, unknown>)?.status === "done"
  )
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (entry.entityType === "proposal_task_link")
    return <LinkIcon className="h-3.5 w-3.5" />;
  if (entry.entityType === "proposal_stakeholder" || entry.entityType === "entity_team_member")
    return <UserPlus className="h-3.5 w-3.5" />;
  if (entry.action === "delete")
    return <Trash2 className="h-3.5 w-3.5" />;
  return <History className="h-3.5 w-3.5" />;
}

function ProposalActivityTimeline({ proposalId }: { proposalId: string }) {
  const { data: activity = [], isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ["/api/proposals", proposalId, "activity"],
    enabled: !!proposalId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const groupedByDate = activity.reduce<Record<string, ActivityEntry[]>>(
    (acc, entry) => {
      const date = format(new Date(entry.performedAt), "MMMM d, yyyy");
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, entries]) => (
        <div key={date}>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            {date}
          </h4>
          <div className="relative ml-3 border-l border-border pl-6 space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative"
                data-testid={`proposal-activity-${entry.id}`}
              >
                <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {getActivityIcon(entry)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">
                      {entry.performerFirstName
                        ? `${entry.performerFirstName} ${entry.performerLastName || ""}`
                        : "System"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {describeActivity(entry)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(entry.performedAt), "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskDetailSheet({
  task,
  proposalId,
  canWrite,
  allUsers,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onCreateSubTask,
}: {
  task: ProposalTask | ProposalTaskWithRelations | null;
  proposalId: string;
  canWrite: boolean;
  allUsers: User[];
  onClose: () => void;
  onUpdateTask: (taskId: string, data: Record<string, unknown>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateSubTask: (parentTaskId: string, name: string) => void;
}) {
  const [newCollaboratorId, setNewCollaboratorId] = useState("");
  const [newSubTaskName, setNewSubTaskName] = useState("");

  const { data: collaborators = [] } = useQuery<CollaboratorUser[]>({
    queryKey: ["/api/proposals/tasks", task?.id, "collaborators"],
    enabled: !!task?.id,
  });

  const addCollaborator = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/proposals/tasks/${task!.id}/collaborators`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals/tasks", task?.id, "collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", proposalId, "tasks"] });
      setNewCollaboratorId("");
    },
  });

  const removeCollaborator = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/proposals/tasks/${task!.id}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals/tasks", task?.id, "collaborators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", proposalId, "tasks"] });
    },
  });

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-task-detail">
        {task && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <TaskStatusIcon status={task.status} />
                <span className="truncate">{task.name}</span>
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {task.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-task-description">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  {canWrite ? (
                    <Select
                      value={task.status}
                      onValueChange={(val) => onUpdateTask(task.id, { status: val })}
                    >
                      <SelectTrigger data-testid="select-task-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{task.status}</Badge>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Owner</h4>
                  {canWrite ? (
                    <Select
                      value={task.ownerId ?? ""}
                      onValueChange={(val) => { if (val) onUpdateTask(task.id, { ownerId: val }); }}
                    >
                      <SelectTrigger data-testid="select-task-owner">
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {(task as ProposalTaskWithRelations).owner
                        ? `${(task as ProposalTaskWithRelations).owner!.firstName} ${(task as ProposalTaskWithRelations).owner!.lastName}`
                        : "No owner"}
                    </span>
                  )}
                </div>
              </div>

              {canWrite && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Due Date</h4>
                    <Input
                      type="date"
                      value={task.dueDate ?? ""}
                      onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value || null })}
                      data-testid="input-task-due-date"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Start Date</h4>
                    <Input
                      type="date"
                      value={task.startDate ?? ""}
                      onChange={(e) => onUpdateTask(task.id, { startDate: e.target.value || null })}
                      data-testid="input-task-start-date"
                    />
                  </div>
                </div>
              )}

              {!task.parentTaskId && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sub-tasks</h4>
                  <div className="space-y-1">
                    {((task as ProposalTaskWithRelations).subTasks ?? []).map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50" data-testid={`subtask-row-${sub.id}`}>
                        <TaskStatusIcon status={sub.status} />
                        <span className={`text-sm flex-1 ${sub.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {sub.name}
                        </span>
                      </div>
                    ))}
                    {canWrite && (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          placeholder="Add sub-task..."
                          value={newSubTaskName}
                          onChange={(e) => setNewSubTaskName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newSubTaskName.trim()) {
                              onCreateSubTask(task.id, newSubTaskName.trim());
                              setNewSubTaskName("");
                            }
                          }}
                          data-testid="input-subtask-name"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={!newSubTaskName.trim()}
                          onClick={() => {
                            if (newSubTaskName.trim()) {
                              onCreateSubTask(task.id, newSubTaskName.trim());
                              setNewSubTaskName("");
                            }
                          }}
                          data-testid="button-add-subtask"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium">Collaborators</h4>
                </div>
                <div className="space-y-2">
                  {collaborators.map((c: CollaboratorUser) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={c.profileImageUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(c.firstName?.[0] || "") + (c.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{c.firstName} {c.lastName}</span>
                      </div>
                      {canWrite && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCollaborator.mutate(c.id)}
                          data-testid={`button-remove-collaborator-${c.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {canWrite && (
                    <div className="flex items-center gap-2">
                      <Select value={newCollaboratorId} onValueChange={setNewCollaboratorId}>
                        <SelectTrigger className="flex-1" data-testid="select-add-collaborator">
                          <SelectValue placeholder="Add collaborator" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers
                            .filter((u) => !collaborators.some((c) => c.id === u.id))
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={!newCollaboratorId || addCollaborator.isPending}
                        onClick={() => addCollaborator.mutate(newCollaboratorId)}
                        data-testid="button-add-collaborator"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Links</h4>
                <EntityLinksPanel entityType="proposal_task" entityId={task.id} canWrite={canWrite} compact />
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Task Comments</h4>
                <CommentList entityType="proposal_task" entityId={task.id} />
              </div>

              <TaskActivitySection taskId={task.id} />

              {canWrite && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDeleteTask(task.id);
                      onClose();
                    }}
                    data-testid="button-delete-task-detail"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Task
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
