import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { Loader2, Pencil, Trash2, Calendar, User, Hash, Building2, MapPin, CalendarClock, Briefcase, UserCircle, Mail, Phone, DollarSign, CalendarCheck, Users } from "lucide-react";
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono" data-testid="text-deal-number">
                  #{deal.dealNumber}
                </span>
                <Badge 
                  variant={statusConfig.variant}
                  className={statusConfig.className}
                  data-testid="badge-deal-status"
                >
                  {deal.status}
                </Badge>
              </div>
              <CardTitle className="text-2xl" data-testid="text-deal-name">
                {deal.displayName}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
                <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Separator />
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Details
                </h3>
                
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Deal Number</p>
                    <p className="font-mono">{deal.dealNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p>{deal.createdAt ? format(new Date(deal.createdAt), "MMMM d, yyyy 'at' h:mm a") : "Unknown"}</p>
                  </div>
                </div>

                {deal.updatedAt && deal.updatedAt !== deal.createdAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Last Updated</p>
                      <p>{format(new Date(deal.updatedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Client
                </h3>
                
                {deal.client ? (
                  <Link href={`/clients/${deal.client.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer" data-testid="link-deal-client">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{deal.client.name}</p>
                        {deal.client.industry && (
                          <p className="text-sm text-muted-foreground">{deal.client.industry}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>No client assigned</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Primary Contact
                </h3>
                
                {deal.primaryContact ? (
                  <Link href={`/contacts/${deal.primaryContact.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer" data-testid="link-deal-primary-contact">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {deal.primaryContact.firstName} {deal.primaryContact.lastName}
                        </p>
                        <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                          {deal.primaryContact.emailAddresses?.[0] && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {deal.primaryContact.emailAddresses[0]}
                            </span>
                          )}
                          {deal.primaryContact.phoneNumbers?.[0] && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {deal.primaryContact.phoneNumbers[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <UserCircle className="h-4 w-4" />
                    <span>No primary contact</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Created By
                </h3>
                
                {deal.createdBy ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={deal.createdBy.profileImageUrl || undefined} alt={createdByName} />
                      <AvatarFallback>{createdByInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{createdByName}</p>
                      <p className="text-sm text-muted-foreground">Team Member</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Unknown user</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Owner
                </h3>
                
                {ownerName ? (
                  <div className="flex items-center gap-3" data-testid="deal-owner">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={deal.owner?.profileImageUrl || undefined} alt={ownerName} />
                      <AvatarFallback>{ownerInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{ownerName}</p>
                      <p className="text-sm text-muted-foreground">Deal Owner</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No owner assigned</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Deal Value
                </h3>
                
                <div className="flex items-center gap-3" data-testid="deal-value">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className={deal.dealValue ? "font-medium" : "text-muted-foreground"}>
                    {deal.dealValue 
                      ? `$${deal.dealValue.toLocaleString("en-US")}`
                      : "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Locations Section */}
            {((deal.locations as DealLocation[]) || []).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Locations
                  </h3>
                  <div className="flex flex-wrap gap-2" data-testid="deal-locations">
                    {((deal.locations as DealLocation[]) || []).map((location) => (
                      <Badge
                        key={location.placeId}
                        variant="secondary"
                        className="gap-1"
                        data-testid={`badge-location-${location.placeId}`}
                      >
                        <MapPin className="h-3 w-3" />
                        {location.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Event Schedule Section */}
            {((deal.eventSchedule as DealEvent[]) || []).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Event Schedule
                  </h3>
                  <div className="space-y-2" data-testid="deal-event-schedule">
                    {((deal.eventSchedule as DealEvent[]) || []).map((event) => {
                      const summary = getEventSummary(event);
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                          data-testid={`event-schedule-item-${event.id}`}
                        >
                          <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            {event.label && (
                              <p className="font-medium text-sm truncate">{event.label}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {summary ? summary.text : "Date not specified"}
                            </p>
                          </div>
                          {summary && summary.altCount > 0 && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {summary.altCount} Alt Date{summary.altCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Services Section */}
            {((deal.services as DealService[]) || []).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Services
                  </h3>
                  <div className="flex flex-wrap gap-2" data-testid="deal-services">
                    {((deal.services as DealService[]) || []).map((service) => (
                      <Badge
                        key={service}
                        variant="secondary"
                        className="gap-1"
                        data-testid={`badge-service-${service.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Briefcase className="h-3 w-3" />
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

                {/* Concept Section */}
                {deal.concept && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Concept
                      </h3>
                      <div className="whitespace-pre-wrap text-sm" data-testid="deal-concept">
                        {deal.concept}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-6">
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

              <TabsContent value="comments" className="mt-6">
                <CommentList 
                  entityType="deal" 
                  entityId={id} 
                  currentUser={user || undefined}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
