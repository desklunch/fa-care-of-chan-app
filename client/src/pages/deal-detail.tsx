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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Pencil, Trash2, CalendarCheck, Users } from "lucide-react";
import { getEventSummary } from "@/components/event-schedule";
import { CommentList } from "@/components/ui/comments";
import { cn } from "@/lib/utils";
import type { DealWithRelations, DealStatus, DealLocation, DealEvent, DealService, DealTaskWithRelations, User as UserType } from "@shared/schema";

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const statusColors: Record<DealStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  "Inquiry": { variant: "outline" },
  "Discovery": { variant: "secondary" },
  "Internal Review": { variant: "secondary", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  "Contracting": { variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "Won": { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  "Lost": { variant: "destructive" },
  "Canceled": { variant: "outline", className: "opacity-50" },
  "Declined": { variant: "outline", className: "opacity-50" },
};

function FieldRow({ label, children, testId, colSpan = 1 }: { label: string; children: React.ReactNode; testId?: string; colSpan?: number }) {
  return (
    <div className={`flex py-4 border-b border-border/50 last:border-b-0 col-span-${colSpan}`} data-testid={testId}>
      <div className="w-1/3 text-xs font-semibold shrink-0">{label}</div>
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
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>();
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");

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
      toast({ title: "Failed to delete deal", description: error.message, variant: "destructive" });
    },
  });
  
  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; dueDate?: string; assignedUserId?: string }) => {
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
      toast({ title: "Failed to create task", description: error.message, variant: "destructive" });
    },
  });
  
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: { completed?: boolean } }) => {
      return await apiRequest("PATCH", `/api/deals/${id}/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", id, "tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update task", description: error.message, variant: "destructive" });
    },
  });
  
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : undefined,
      assignedUserId: newTaskAssignee && newTaskAssignee !== "unassigned" ? newTaskAssignee : undefined,
    });
  };
  
  const handleToggleTaskComplete = (task: DealTaskWithRelations) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      data: { completed: !task.completed },
    });
  };

  if (isLoading) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Loading..." }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!deal) {
    return (
      <PageLayout breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "Not Found" }]}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Deal Not Found</h2>
          <p className="text-muted-foreground mb-4">The deal you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => setLocation("/deals")} data-testid="button-back-to-deals">
            Back to Deals
          </Button>
        </div>
      </PageLayout>
    );
  }

  const statusConfig = statusColors[deal.status as DealStatus] || { variant: "outline" as const };
  const createdByName = deal.createdBy 
    ? [deal.createdBy.firstName, deal.createdBy.lastName].filter(Boolean).join(" ") || "Unknown"
    : "Unknown";
  const createdByInitials = createdByName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  
  const ownerName = deal.owner 
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ") || "Unassigned"
    : null;
  const ownerInitials = ownerName ? ownerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "";

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
        icon: Pencil,
      }}
      additionalActions={isManagerOrAdmin ? [
        {
          label: "Delete Deal",
          onClick: () => setShowDeleteDialog(true),
          icon: Trash2,
          variant: "destructive",
        },
      ] : undefined}
    >
      <div className="">
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 bg-background z-10">
            <div className="p-4 md:p-6 pb-2 md:pb-2">
              <div className="flex items-center gap-2 mb-2">

                <Badge 
                  variant={statusConfig.variant}
                  className={statusConfig.className}
                  data-testid="badge-deal-status"
                >
                  {deal.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold" data-testid="text-deal-name">
                {deal.displayName}
              </h1>
            </div>

            <TabsList data-testid="tabs-deal" className="px-4 md:px-6">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="max-w-4xl space-y-4 p-4 md:p-6 pt-4">
            {/* Deal Information Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2">
                <FieldRow label="Client" testId="field-client">
                  {deal.client ? (
                    <Link href={`/clients/${deal.client.id}`}>
                      <span className="text-primary hover:underline cursor-pointer" data-testid="link-deal-client">
                        {deal.client.name}
                        {deal.client.industry && (
                          <span className="text-muted-foreground ml-2">({deal.client.industry})</span>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No client assigned</span>
                  )}
                </FieldRow>
                <FieldRow label="Primary Contact" testId="field-primary-contact">
                  {deal.primaryContact ? (
                    <Link href={`/contacts/${deal.primaryContact.id}`}>
                      <span className="text-primary hover:underline cursor-pointer" data-testid="link-deal-primary-contact">
                        {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                        {deal.primaryContact.emailAddresses?.[0] && (
                          <span className="text-muted-foreground ml-2">({deal.primaryContact.emailAddresses[0]})</span>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">No primary contact</span>
                  )}
                </FieldRow>
                {/* <FieldRow label="Deal Number" testId="field-deal-number">
                  <span className="font-mono">{deal.dealNumber}</span>
                </FieldRow> */}
                {locations.length > 0 && (
                  <FieldRow label="Locations" testId="field-locations" colSpan={2}>
                    <div className="flex flex-wrap gap-1" data-testid="deal-locations">
                      {locations.map((location) => (
                        <Badge
                          key={location.placeId}
                          variant="secondary"
                          data-testid={`badge-location-${location.placeId}`}
                        >
                          {location.displayName}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                {eventSchedule.length > 0 && (
                  <FieldRow label="Event Schedule" testId="field-event-schedule">
                    <div className="space-y-2" data-testid="deal-event-schedule">
                      {eventSchedule.map((event) => {
                        const summary = getEventSummary(event);
                        return (
                          <div key={event.id} data-testid={`event-schedule-item-${event.id}`}>
                            {event.label && <span className="font-medium">{event.label}: </span>}
                            <span className="text-muted-foreground">
                              {summary ? summary.text : "Date not specified"}
                            </span>
                            {summary && summary.altCount > 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {summary.altCount} Alt
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </FieldRow>
                )}
                {services.length > 0 && (
                  <FieldRow label="Services" testId="field-services">
                    <div className="flex flex-wrap gap-1" data-testid="deal-services">
                      {services.map((service) => (
                        <Badge
                          key={service}
                          variant="secondary"
                          data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </FieldRow>
                )}
                {/* <FieldRow label="Status" testId="field-status">
                  <Badge 
                    variant={statusConfig.variant}
                    className={statusConfig.className}
                  >
                    {deal.status}
                  </Badge>
                </FieldRow> */}
                <FieldRow label="Deal Value" testId="field-deal-value">
                  {deal.dealValue 
                    ? <span className="font-medium">${deal.dealValue.toLocaleString("en-US")}</span>
                    : <span className="text-muted-foreground">Not specified</span>}
                </FieldRow>
                <FieldRow label="Created" testId="field-created">
                  {deal.createdAt ? format(new Date(deal.createdAt), "MMMM d, yyyy 'at' h:mm a") : "Unknown"}
                </FieldRow>
                {deal.updatedAt && deal.updatedAt !== deal.createdAt && (
                  <FieldRow label="Last Updated" testId="field-updated">
                    {format(new Date(deal.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </FieldRow>
                )}
              </CardContent>
            </Card>

            {/* People Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">People</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldRow label="Owner" testId="field-owner">
                  {ownerName ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={deal.owner?.profileImageUrl || undefined} alt={ownerName} />
                        <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
                      </Avatar>
                      <span>{ownerName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No owner assigned</span>
                  )}
                </FieldRow>
                <FieldRow label="Created By" testId="field-created-by">
                  {deal.createdBy ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={deal.createdBy.profileImageUrl || undefined} alt={createdByName} />
                        <AvatarFallback className="text-xs">{createdByInitials}</AvatarFallback>
                      </Avatar>
                      <span>{createdByName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </FieldRow>
              </CardContent>
            </Card>

            {/* Client & Contact Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Client & Contact</CardTitle>
              </CardHeader>
              <CardContent>
 
              </CardContent>
            </Card>

            {/* Event Details Card - only show if there's data */}
            {(locations.length > 0 || eventSchedule.length > 0 || services.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Event Details</CardTitle>
                </CardHeader>
                <CardContent>

                </CardContent>
              </Card>
            )}

            {/* Concept Card */}
            {deal.concept && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Concept</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm" data-testid="deal-concept">
                    {deal.concept}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 p-4 md:p-6 pt-4 max-w-4xl">
            <Card>
              <CardContent className="flex items-center gap-2 p-4">
                <div className="flex flex-1">
                  <Input
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateTask();
                      }
                    }}
                    data-testid="input-task-title"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !newTaskDueDate && ""
                        )}
                        data-testid="button-task-due-date"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        {newTaskDueDate ? format(newTaskDueDate, 'MMM d') : ""}
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
                  <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                    <SelectTrigger data-testid="select-task-assignee" className="w-[140px]">
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
                  disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
                  data-testid="button-create-task"
                  size="sm"
                >
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">Tasks ({tasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md border hover:bg-accent/50 transition-colors",
                        task.completed && "opacity-60"
                      )}
                      data-testid={`task-item-${task.id}`}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTaskComplete(task)}
                        disabled={updateTaskMutation.isPending}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            task.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarCheck className="h-3 w-3" />
                              {format(parseDateOnly(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          {task.assignedUser && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.assignedUser.firstName} {task.assignedUser.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
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
              Are you sure you want to delete "{deal.displayName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
