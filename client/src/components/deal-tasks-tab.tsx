import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  Trash2,
  Pencil,
  Check,
  X,
  CalendarIcon,
  UserCircle,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { parseDateOnly } from "@/lib/date";
import type { DealTaskWithRelations, User } from "@shared/schema";

function getUserName(user: Pick<User, "firstName" | "lastName"> | null | undefined): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown";
}

function getUserInitials(user: Pick<User, "firstName" | "lastName"> | null | undefined): string {
  if (!user) return "?";
  const first = user.firstName?.[0] || "";
  const last = user.lastName?.[0] || "";
  return (first + last).toUpperCase() || "?";
}

interface DealTasksTabProps {
  dealId: string;
  canWrite: boolean;
  users: User[];
}

export function DealTasksTab({ dealId, canWrite, users }: DealTasksTabProps) {
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: tasks = [], isLoading, isError, refetch } = useQuery<DealTaskWithRelations[]>({
    queryKey: ["/api/deals", dealId, "tasks"],
    enabled: Boolean(dealId),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; dueDate?: string; assignedUserId?: string }) => {
      await apiRequest("POST", `/api/deals/${dealId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "tasks"] });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setNewTaskAssignee("");
      setShowCreateForm(false);
      toast({ title: "Task created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/deals/${dealId}/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/deals/${dealId}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "tasks"] });
      setDeleteTaskId(null);
      toast({ title: "Task deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete task", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newTaskTitle.trim()) return;
    createMutation.mutate({
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate || undefined,
      assignedUserId: newTaskAssignee || undefined,
    });
  };

  const handleToggleComplete = (task: DealTaskWithRelations) => {
    updateMutation.mutate({
      taskId: task.id,
      data: { completed: !task.completed },
    });
  };

  const startEditing = (task: DealTaskWithRelations) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate || "");
    setEditAssignee(task.assignedUserId || "");
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDueDate("");
    setEditAssignee("");
  };

  const saveEditing = () => {
    if (!editingTaskId || !editTitle.trim()) return;
    updateMutation.mutate(
      {
        taskId: editingTaskId,
        data: {
          title: editTitle.trim(),
          dueDate: editDueDate || null,
          assignedUserId: editAssignee || null,
        },
      },
      {
        onSuccess: () => {
          cancelEditing();
        },
      },
    );
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const sortedTasks = [...incompleteTasks, ...completedTasks];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-tasks">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 space-y-2" data-testid="error-tasks">
        <p className="text-sm text-muted-foreground">Failed to load tasks</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-tasks">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div>
          {!showCreateForm ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowCreateForm(true)}
              data-testid="button-add-task"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
          ) : (
            <Card data-testid="form-create-task">
              <CardContent className="py-3 space-y-3">
                <Input
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskTitle.trim()) handleCreate();
                    if (e.key === "Escape") setShowCreateForm(false);
                  }}
                  autoFocus
                  data-testid="input-new-task-title"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-auto"
                      data-testid="input-new-task-due-date"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="select-new-task-assignee"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {getUserName(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newTaskTitle.trim() || createMutation.isPending}
                    data-testid="button-submit-task"
                  >
                    {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Add Task
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTaskTitle("");
                      setNewTaskDueDate("");
                      setNewTaskAssignee("");
                    }}
                    data-testid="button-cancel-create-task"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {sortedTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground" data-testid="empty-tasks">
          <p className="text-sm">No tasks yet</p>
          {canWrite && <p className="text-xs mt-1">Add a task to get started</p>}
        </div>
      )}

      {sortedTasks.length > 0 && (
        <div className="space-y-1" data-testid="list-tasks">
          {sortedTasks.map((task) => {
            const isEditing = editingTaskId === task.id;
            const assignee = task.assignedUser;
            const dueDateParsed = task.dueDate ? parseDateOnly(task.dueDate) : null;
            const isOverdue = dueDateParsed && !task.completed && dueDateParsed < startOfDay(new Date());

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                  task.completed ? "opacity-60" : ""
                }`}
                data-testid={`task-item-${task.id}`}
              >
                {!isEditing && (
                  <>
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task)}
                      disabled={!canWrite || updateMutation.isPending}
                      className="mt-0.5"
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${task.completed ? "line-through text-muted-foreground" : ""}`}
                        data-testid={`text-task-title-${task.id}`}
                      >
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {dueDateParsed && (
                          <span
                            className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                            data-testid={`text-task-due-${task.id}`}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            {format(dueDateParsed, "MMM d, yyyy")}
                          </span>
                        )}
                        {assignee && (
                          <span className="flex items-center gap-1" data-testid={`badge-task-assignee-${task.id}`}>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={assignee.profileImageUrl || undefined} alt={getUserName(assignee)} />
                              <AvatarFallback className="text-[8px]">{getUserInitials(assignee)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{getUserName(assignee)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-0.5 invisible group-hover:visible shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(task)}
                          data-testid={`button-edit-task-${task.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTaskId(task.id)}
                          data-testid={`button-delete-task-${task.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {isEditing && (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                      data-testid={`input-edit-task-title-${task.id}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-auto"
                          data-testid={`input-edit-task-due-date-${task.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <select
                          value={editAssignee}
                          onChange={(e) => setEditAssignee(e.target.value)}
                          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid={`select-edit-task-assignee-${task.id}`}
                        >
                          <option value="">Unassigned</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {getUserName(u)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={saveEditing}
                        disabled={!editTitle.trim() || updateMutation.isPending}
                        data-testid={`button-save-edit-task-${task.id}`}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        data-testid={`button-cancel-edit-task-${task.id}`}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-task">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && deleteMutation.mutate(deleteTaskId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-task"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
