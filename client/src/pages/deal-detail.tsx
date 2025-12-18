import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Pencil, Trash2, CalendarCheck, UserRound, MoreVertical, X, Check, PenBox } from "lucide-react";
import { getEventSummary } from "@/components/event-schedule";
import { CommentList } from "@/components/ui/comments";
import { cn } from "@/lib/utils";
import type {
  DealWithRelations,
  DealStatus,
  DealLocation,
  DealEvent,
  DealService,
  DealTaskWithRelations,
  User as UserType,
} from "@shared/schema";

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const statusColors: Record<
  DealStatus,
  {
    variant: "default" | "secondary" | "outline" | "destructive";
    className?: string;
  }
> = {
  Inquiry: { variant: "outline" },
  Discovery: { variant: "secondary" },
  "Internal Review": {
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  Contracting: {
    variant: "secondary",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  Won: {
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  Lost: { variant: "destructive" },
  Canceled: { variant: "outline", className: "opacity-50" },
  Declined: { variant: "outline", className: "opacity-50" },
};

function FieldRow({
  label,
  children,
  testId,
  colSpan = 1,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
  colSpan?: number;
}) {
  return (
    <div
      className={`flex py-4 border-b border-border/50 last:border-b-0 col-span-${colSpan}`}
      data-testid={testId}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState<Date | undefined>();
  const [editTaskAssignee, setEditTaskAssignee] = useState<string>("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: deal, isLoading } = useQuery<DealWithRelations>({
    queryKey: ["/api/deals", id],
    enabled: Boolean(id),
  });

  const { data: tasks = [] } = useQuery<DealTaskWithRelations[]>({
    queryKey: ["/api/deals", id, "tasks"],
    enabled: Boolean(id),
  });

  const { data: usersData = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  usePageTitle(deal?.displayName || "Deal");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/deals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Deal deleted successfully" });
      setLocation("/deals");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      dueDate?: string;
      assignedUserId?: string;
    }) => {
      return await apiRequest("POST", `/api/deals/${id}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tasks"] });
      setNewTaskTitle("");
      setNewTaskDueDate(undefined);
      setNewTaskAssignee("");
      toast({ title: "Task created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: { completed?: boolean; title?: string; dueDate?: string | null; assignedUserId?: string | null };
    }) => {
      return await apiRequest(
        "PATCH",
        `/api/deals/${id}/tasks/${taskId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tasks"] });
      setEditingTaskId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("DELETE", `/api/deals/${id}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tasks"] });
      setDeleteTaskId(null);
      toast({ title: "Task deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate
        ? format(newTaskDueDate, "yyyy-MM-dd")
        : undefined,
      assignedUserId:
        newTaskAssignee && newTaskAssignee !== "unassigned"
          ? newTaskAssignee
          : undefined,
    });
  };

  const handleToggleTaskComplete = (task: DealTaskWithRelations) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      data: { completed: !task.completed },
    });
  };

  const handleStartEditTask = (task: DealTaskWithRelations) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDueDate(task.dueDate ? parseDateOnly(task.dueDate) : undefined);
    setEditTaskAssignee(task.assignedUserId || "");
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditTaskTitle("");
    setEditTaskDueDate(undefined);
    setEditTaskAssignee("");
  };

  const handleSaveEditTask = () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    updateTaskMutation.mutate({
      taskId: editingTaskId,
      data: {
        title: editTaskTitle.trim(),
        dueDate: editTaskDueDate ? format(editTaskDueDate, "yyyy-MM-dd") : null,
        assignedUserId: editTaskAssignee && editTaskAssignee !== "unassigned" ? editTaskAssignee : null,
      },
    });
  };

  if (isLoading) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Loading..." },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!deal) {
    return (
      <PageLayout
        breadcrumbs={[
          { label: "Deals", href: "/deals" },
          { label: "Not Found" },
        ]}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The deal you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            onClick={() => setLocation("/deals")}
            data-testid="button-back-to-deals"
          >
            Back to Deals
          </Button>
        </div>
      </PageLayout>
    );
  }

  const statusConfig = statusColors[deal.status as DealStatus] || {
    variant: "outline" as const,
  };
  const createdByName = deal.createdBy
    ? [deal.createdBy.firstName, deal.createdBy.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";
  const createdByInitials = createdByName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const ownerName = deal.owner
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ") ||
      "Unassigned"
    : null;
  const ownerInitials = ownerName
    ? ownerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const locations = (deal.locations as DealLocation[]) || [];
  const eventSchedule = (deal.eventSchedule as DealEvent[]) || [];
  const services = (deal.services as DealService[]) || [];

  return (
    <PageLayout
      breadcrumbs={[
        { label: "Deals", href: "/deals" },
        { label: deal.displayName },
      ]}
      primaryAction={{
        label: "Edit",
        href: `/deals/${id}/edit`,
        icon: PenBox,
      }}
      additionalActions={
        isManagerOrAdmin
          ? [
              {
                label: "Delete",
                onClick: () => setShowDeleteDialog(true),
                icon: Trash2,
                variant: "destructive",
              },
            ]
          : undefined
      }
    >
      <div className="">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="p-4 md:p-6 pb-2 md:pb-2">
              <div className="flex flex-col gap-2 ">

                <div>
                  <span className="text-sm font-semibold">
                    {deal.client?.name}
                  </span>
                  <h1
                    className="text-2xl font-bold"
                    data-testid="text-deal-name"
                  >
                    {deal.displayName}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={statusConfig.variant}
                    className={statusConfig.className}
                    data-testid="badge-deal-status"
                  >
                    {deal.status}
                  </Badge>
                  {ownerName ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 rounded-full">
                        <AvatarImage
                          src={deal.owner?.profileImageUrl || undefined}
                          alt={ownerName}
                        />
                        <AvatarFallback className="text-xs">
                          {ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium  ">{ownerName}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-medium">Unassigned</span>
                  )}
                </div>

              </div>
            </div>

            <TabsList data-testid="tabs-deal" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">
                Comments
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="max-w-4xl space-y-4 p-4 md:p-6 pt-4"
          >
            {/* Deal Information Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Deal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldRow label="Client" testId="field-client">
                  {deal.client ? (
                    <Link href={`/clients/${deal.client.id}`}>
                      <span
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="link-deal-client"
                      >
                        {deal.client.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      No client assigned
                    </span>
                  )}
                </FieldRow>
                <FieldRow
                  label="Primary Contact"
                  testId="field-primary-contact"
                >
                  {deal.primaryContact ? (
                    <Link href={`/contacts/${deal.primaryContact.id}`}>
                      <p
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="link-deal-primary-contact"
                      >
                        {deal.primaryContact.firstName}{" "}
                        {deal.primaryContact.lastName}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      No primary contact
                    </span>
                  )}
                </FieldRow>
                {/* <FieldRow label="Deal Number" testId="field-deal-number">
                  <span className="font-mono">{deal.dealNumber}</span>
                </FieldRow> */}
                {locations.length > 0 && (
                  <FieldRow
                    label="Locations"
                    testId="field-locations"
                    colSpan={2}
                  >
                    <div
                      className="flex flex-wrap gap-3"
                      data-testid="deal-locations"
                    >
                      {locations.map((location) => (
                        <Badge
                          key={location.placeId}
                          variant="default"
                          data-testid={`badge-location-${location.placeId}`}
                          size="lg"
                          className="py-1 px-2 text-xs text-background"
                        >
                          {location.displayName}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                {eventSchedule.length > 0 && (
                  <FieldRow
                    label="Event Schedule"
                    testId="field-event-schedule"
                    colSpan={2}
                  >
                    <div
                      className="space-y-4"
                      data-testid="deal-event-schedule"
                    >
                      {eventSchedule.map((event) => {
                        const summary = getEventSummary(event);
                        return (
                          <div
                            key={event.id}
                            data-testid={`event-schedule-item-${event.id}`}
                            className="flex flex-col gap-2"
                          >
                            {event.label && (
                              <span className="font-semibold">
                                {event.label}
                              </span>
                            )}
                            <div className="flex gap-2">
                              <span className="text-sm font-medium">
                                {summary ? summary.text : "Date not specified"}
                              </span>
                            </div>
                            {summary && summary.altCount > 0 && (
                              <Badge
                                variant="outline"
                                className="px-1.5 w-fit text-[10px] opacity-50 "
                              >
                                + {summary.altCount} Alternate Date
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </FieldRow>
                )}
                {services.length > 0 && (
                  <FieldRow
                    label="Services"
                    testId="field-services"
                    colSpan={2}
                  >
                    <div
                      className="flex flex-wrap gap-2"
                      data-testid="deal-services"
                    >
                      {services.map((service) => (
                        <Badge
                          key={service}
                          variant="secondary"
                          data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                          size="lg"
                          className="py-1 px-2 text-xs"
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                <FieldRow label="Deal Value" testId="field-deal-value">
                  {deal.dealValue ? (
                    <span className="font-medium">
                      ${deal.dealValue.toLocaleString("en-US")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unconfirmed</span>
                  )}
                </FieldRow>

                {deal.concept && (
                  <FieldRow label="Concept" testId="field-concept">
                    <span className="">{deal.concept}</span>
                  </FieldRow>
                )}

                {deal.notes && (
                  <FieldRow label="Notes" testId="field-notes">
                    <span className="">{deal.notes}</span>
                  </FieldRow>
                )}
              </CardContent>
            </Card>

            {/* Tasks Preview Card */}
            {(() => {
              const incompleteTasks = tasks
                .filter((t) => !t.completed)
                .sort((a, b) => {
                  if (!a.dueDate && !b.dueDate) return 0;
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return a.dueDate.localeCompare(b.dueDate);
                });
              const displayTasks = incompleteTasks.slice(0, 3);
              const remainingCount = incompleteTasks.length - 3;

              if (incompleteTasks.length === 0) return null;

              return (
                <Card>
                  <CardHeader className="pb-2 ">
                    <CardTitle className="text-lg">Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {displayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="grid grid-cols-1 sm:grid-cols-2 items-center gap-y-1 gap-x-3 py-6 bg-card border-b"
                        data-testid={`preview-task-${task.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() =>
                              handleToggleTaskComplete(task)
                            }
                            disabled={updateTaskMutation.isPending}
                            data-testid={`preview-checkbox-task-${task.id}`}
                            className="w-4 h-4 rounded-full"
                          />
                          <p className="text-sm font-medium">{task.title}</p>
                        </div>

                        <div className="ml-7 flex justify-between sm:justify-end items-center">
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-primary">
                                <CalendarCheck className="h-3 w-3" />
                                {format(
                                  parseDateOnly(task.dueDate),
                                  "MMM d, yyyy",
                                )}
                              </span>
                            )}
                            {task.assignedUser && (
                              <span className="text-xs font-medium flex items-center gap-1">
                                <UserRound className="h-3 w-3" />
                                {task.assignedUser.firstName}{" "}
                                {task.assignedUser.lastName}
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  data-testid={`preview-button-task-menu-${task.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    handleStartEditTask(task);
                                    setActiveTab("tasks");
                                  }}
                                  data-testid={`preview-button-edit-task-${task.id}`}
                                >
                                  <PenBox className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTaskId(task.id)}
                                  data-testid={`preview-button-delete-task-${task.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("tasks")}
                        className="w-full text-sm text-primary hover:underline text-left py-6"
                        data-testid="link-more-tasks"
                      >
                        + {remainingCount} more
                        
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent
            value="tasks"
            className="space-y-4 p-4 md:p-6 pt-4 max-w-4xl"
          >
            <Card>
              <CardContent className="flex items-center gap-2 p-4 ">
                <div className="flex flex-1">
                  <Input
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateTask();
                      }
                    }}
                    data-testid="input-task-title"
                  />
                </div>
                <div className="flex items-center gap-2 ">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "border-input min-w-12 w-fit h-12 text-xs justify-center text-left font-normal",
                          !newTaskDueDate && "",
                        )}
                        data-testid="button-task-due-date"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        {newTaskDueDate ? format(newTaskDueDate, "MMM d") : ""}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newTaskDueDate}
                        onSelect={setNewTaskDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={newTaskAssignee}
                    onValueChange={setNewTaskAssignee}
                  >
                    <SelectTrigger
                      data-testid="select-task-assignee"
                      className="w-[140px] text-xs"
                    >
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {usersData.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateTask}
                  disabled={
                    createTaskMutation.isPending || !newTaskTitle.trim()
                  }
                  data-testid="button-create-task"
                  size="sm"
                  className="h-12"
                >
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">
                  {tasks.filter((t) => !t.completed).length > 0 && `${tasks.filter((t) => !t.completed).length} Task${tasks.filter((t) => !t.completed).length > 1 ? 's' : ''}`} 
                   {tasks.filter((t) => !t.completed).length == 0 && `Tasks`} 
                  {/*tasks.filter((t) => t.completed).length > 0  */}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks yet
                  </p>
                ) : (
                  <>
                    {/* Incomplete tasks */}
                    {tasks.filter((t) => !t.completed).map((task) => (
                      editingTaskId === task.id ? (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded-md border bg-accent/30"
                          data-testid={`task-edit-${task.id}`}
                        >
                          <div className="flex flex-1">
                            <Input
                              value={editTaskTitle}
                              onChange={(e) => setEditTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEditTask();
                                }
                                if (e.key === "Escape") {
                                  handleCancelEditTask();
                                }
                              }}
                              data-testid={`input-edit-task-${task.id}`}
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "border-input min-w-12 w-fit h-12 bg-backgroun text-xs justify-center text-left font-normal",
                                  )}
                                  data-testid={`button-edit-task-due-date-${task.id}`}
                                >
                                  <CalendarCheck className="h-4 w-4" />
                                  {editTaskDueDate ? format(editTaskDueDate, "MMM d") : ""}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={editTaskDueDate}
                                  onSelect={setEditTaskDueDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <Select
                              value={editTaskAssignee}
                              onValueChange={setEditTaskAssignee}
                            >
                              <SelectTrigger
                                data-testid={`select-edit-task-assignee-${task.id}`}
                                className="w-[140px] text-xs text-left"
                              >
                                <SelectValue placeholder="Assignee" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {usersData.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleSaveEditTask}
                            disabled={updateTaskMutation.isPending || !editTaskTitle.trim()}
                            size="icon"
                            variant="ghost"
                            data-testid={`button-save-edit-task-${task.id}`}
                            className="h-12"
                          >
                            {updateTaskMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={handleCancelEditTask}
                            size="icon"
                            variant="ghost"
                            data-testid={`button-cancel-edit-task-${task.id}`}
                            className="h-12"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row justify-between items-start gap-2 p-4 py-4 rounded-md border hover:bg-accent/50 transition-colors"
                          data-testid={`task-item-${task.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => handleToggleTaskComplete(task)}
                              disabled={updateTaskMutation.isPending}
                              data-testid={`checkbox-task-${task.id}`}
                              className="w-5 h-5 rounded-full"
                            />
                            <p className="text-sm font-medium">
                              {task.title}
                            </p>
                          </div>
                          <div className="ml-7 sm:ml-0 text-xs text-muted-foreground flex items-center gap-3">
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarCheck className="h-3 w-3" />
                                {format(parseDateOnly(task.dueDate), "MMM d, yyyy")}
                              </span>
                            )}
                            {task.assignedUser && (
                              <span className="flex items-center justify-start sm:justify-end gap-2">
                                <Avatar className="h-5 w-5 rounded-full">
                                  <AvatarImage
                                    src={task.assignedUser.profileImageUrl || undefined}
                                    alt={`${task.assignedUser.firstName} ${task.assignedUser.lastName}`}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {`${task.assignedUser.firstName[0]}${task.assignedUser.lastName[0]}`.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {task.assignedUser.firstName} {task.assignedUser.lastName[0]}.
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  data-testid={`button-task-menu-${task.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleStartEditTask(task)}
                                  data-testid={`button-edit-task-${task.id}`}
                                >
                                  <PenBox className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTaskId(task.id)}
                                  data-testid={`button-delete-task-${task.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    ))}

                    {/* Completed tasks section */}
                    {tasks.filter((t) => t.completed).length > 0 && (
                      <>
                        <div className="pt-4 pb-2">
                          <h4 className="text-sm font-semibold text-muted-foreground">                  {tasks.filter((t) => t.completed).length > 0 && `${tasks.filter((t) => t.completed).length} Completed`} </h4>
                        </div>
                        {tasks.filter((t) => t.completed).map((task) => (
                          editingTaskId === task.id ? (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 rounded-md border bg-accent/30"
                              data-testid={`task-edit-${task.id}`}
                            >
                              <div className="flex flex-1">
                                <Input
                                  value={editTaskTitle}
                                  onChange={(e) => setEditTaskTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEditTask();
                                    }
                                    if (e.key === "Escape") {
                                      handleCancelEditTask();
                                    }
                                  }}
                                  data-testid={`input-edit-task-${task.id}`}
                                  autoFocus
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "border-input min-w-12 w-fit h-12 text-xs justify-center text-left font-normal",
                                      )}
                                      data-testid={`button-edit-task-due-date-${task.id}`}
                                    >
                                      <CalendarCheck className="h-4 w-4" />
                                      {editTaskDueDate ? format(editTaskDueDate, "MMM d") : ""}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={editTaskDueDate}
                                      onSelect={setEditTaskDueDate}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <Select
                                  value={editTaskAssignee}
                                  onValueChange={setEditTaskAssignee}
                                >
                                  <SelectTrigger
                                    data-testid={`select-edit-task-assignee-${task.id}`}
                                    className="w-[140px] text-xs"
                                  >
                                    <SelectValue placeholder="Assignee" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {usersData.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={handleSaveEditTask}
                                disabled={updateTaskMutation.isPending || !editTaskTitle.trim()}
                                size="icon"
                                variant="ghost"
                                data-testid={`button-save-edit-task-${task.id}`}
                              >
                                {updateTaskMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                onClick={handleCancelEditTask}
                                size="icon"
                                variant="ghost"
                                data-testid={`button-cancel-edit-task-${task.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              key={task.id}
                              className="flex flex-col sm:flex-row justify-between items-start gap-2 p-4 py-4 rounded-md border hover:bg-accent/50 transition-colors opacity-60"
                              data-testid={`task-item-${task.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={task.completed}
                                  onCheckedChange={() => handleToggleTaskComplete(task)}
                                  disabled={updateTaskMutation.isPending}
                                  data-testid={`checkbox-task-${task.id}`}
                                  className="w-5 h-5 rounded-full"
                                />
                                <p className="text-sm font-medium line-through text-muted-foreground">
                                  {task.title}
                                </p>
                              </div>
                              <div className="ml-7 sm:ml-0 text-xs text-muted-foreground flex items-center gap-3">
                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarCheck className="h-3 w-3" />
                                    {format(parseDateOnly(task.dueDate), "MMM d, yyyy")}
                                  </span>
                                )}
                                {task.assignedUser && (
                                  <span className="flex items-center justify-start sm:justify-end gap-2">
                                    <Avatar className="h-5 w-5 rounded-full">
                                      <AvatarImage
                                        src={task.assignedUser.profileImageUrl || undefined}
                                        alt={`${task.assignedUser.firstName} ${task.assignedUser.lastName}`}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {`${task.assignedUser.firstName[0]}${task.assignedUser.lastName[0]}`.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {task.assignedUser.firstName} {task.assignedUser.lastName[0]}.
                                  </span>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      data-testid={`button-task-menu-${task.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleStartEditTask(task)}
                                      data-testid={`button-edit-task-${task.id}`}
                                    >
                                      <PenBox className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteTaskId(task.id)}
                                      data-testid={`button-delete-task-${task.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )
                        ))}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="p-4 md:p-6 pt-4 max-w-4xl">
            <CommentList
              entityType="deal"
              entityId={id}
              currentUser={user || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deal.displayName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-task">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTaskMutation.isPending}
              data-testid="button-confirm-delete-task"
            >
              {deleteTaskMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
