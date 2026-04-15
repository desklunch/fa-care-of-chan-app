import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { ProposalTaskWithRelations, User } from "@shared/schema";

const COL_COUNT = 7;

interface ProposalTaskGridProps {
  tasks: ProposalTaskWithRelations[];
  allUsers: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">[];
  canWrite: boolean;
  onUpdateTask: (taskId: string, data: Record<string, unknown>) => void;

  onCreateTask: (data: { name: string; parentTaskId?: string }) => void;
  onReorderTasks: (taskIds: string[]) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
}

const statusColors: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    return format(parseISO(dateString), "MMM d");
  } catch {
    return dateString;
  }
}

function formatDateDisplay(startDate: string | null | undefined, dueDate: string | null | undefined): string {
  if (!dueDate && !startDate) return "";
  if (dueDate && startDate) {
    return `${formatDate(startDate)} – ${formatDate(dueDate)}`;
  }
  if (dueDate) return formatDate(dueDate);
  return formatDate(startDate);
}

function TaskNameIndicators({
  task,
  isCollapsed,
  onToggleCollapse,
}: {
  task: ProposalTaskWithRelations;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const subCount = task.subTasks?.length ?? 0;
  const commentCount = task.commentCount ?? 0;

  return (
    <span className="inline-flex items-center gap-1.5 flex-shrink-0 ml-1.5">
      {subCount > 0 && onToggleCollapse && (
        <button
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          data-testid={`button-collapse-${task.id}`}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span>{subCount}</span>
        </button>
      )}
      {commentCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
          data-testid={`indicator-comments-${task.id}`}
        >
          <MessageSquare className="h-3 w-3" />
          <span>{commentCount}</span>
        </span>
      )}
    </span>
  );
}

function CollaboratorAvatars({
  collaborators,
}: {
  collaborators: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">[];
}) {
  if (collaborators.length === 0) {
    return <span className="text-sm text-muted-foreground/50">-</span>;
  }

  const maxShow = 3;
  const visible = collaborators.slice(0, maxShow);
  const remaining = collaborators.length - maxShow;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((u) => (
        <Avatar key={u.id} className="h-6 w-6 border border-background">
          <AvatarImage src={u.profileImageUrl || undefined} />
          <AvatarFallback className="text-[8px]">
            {(u.firstName?.[0] || "") + (u.lastName?.[0] || "")}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <span className="text-[10px] text-muted-foreground ml-1.5">+{remaining}</span>
      )}
    </div>
  );
}

function InlineNewTask({
  onSubmit,
  onCancel,
  isSubTask = false,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isSubTask?: boolean;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      onSubmit(name.trim());
      setName("");
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <tr className="border-b border-border">
      <td className="px-2 py-3 border-r border-border">
        <div className="w-6 h-6" />
      </td>
      <td className="px-4 py-3 border-r border-border" colSpan={1}>
        <div className={isSubTask ? "pl-6" : ""}>
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (!name.trim()) onCancel(); }}
            onKeyDown={handleKeyDown}
            placeholder={isSubTask ? "Sub-task name" : "Task name"}
            className="h-8 w-full text-[15px]"
            data-testid="input-inline-new-task"
          />
        </div>
      </td>
      <td className="px-4 py-3 border-r border-border" />
      <td className="px-4 py-3 border-r border-border" />
      <td className="px-4 py-3 border-r border-border" />
      <td className="px-4 py-3" />
    </tr>
  );
}

function SortableTaskRow({
  task,
  children,
  showDropIndicator,
}: {
  task: ProposalTaskWithRelations;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
  showDropIndicator?: "before" | "after" | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task.id,
    animateLayoutChanges: () => false,
  });

  return (
    <>
      {showDropIndicator === "before" && (
        <tr className="h-0">
          <td colSpan={COL_COUNT} className="p-0 h-[2px] bg-primary" />
        </tr>
      )}
      <tr
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.4 : 1 }}
        className={`border-b border-border ${isDragging ? "bg-muted/30" : ""}`}
        data-testid={`task-row-${task.id}`}
      >
        {children({ ...listeners, ...attributes })}
      </tr>
      {showDropIndicator === "after" && (
        <tr className="h-0">
          <td colSpan={COL_COUNT} className="p-0 h-[2px] bg-primary" />
        </tr>
      )}
    </>
  );
}

function TaskRowContent({
  task,
  dragHandleProps,
  allUsers,
  canWrite,
  onUpdate,
  onOpenDetail,
  isOverlay = false,
  isSubTask = false,
  isCollapsed,
  onToggleCollapse,
}: {
  task: ProposalTaskWithRelations;
  dragHandleProps: React.HTMLAttributes<HTMLElement>;
  allUsers: Pick<User, "id" | "firstName" | "lastName" | "profileImageUrl">[];
  canWrite: boolean;
  onUpdate: (updates: Record<string, unknown>) => void;
  onOpenDetail?: () => void;
  isOverlay?: boolean;
  isSubTask?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(task.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(task.name);
  }, [task.name]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const handleNameSubmit = () => {
    if (nameValue.trim() && nameValue !== task.name) {
      onUpdate({ name: nameValue.trim() });
    } else {
      setNameValue(task.name);
    }
    setEditingName(false);
  };

  const handleStatusChange = (value: string) => {
    onUpdate({ status: value });
  };

  const handleOwnerChange = (value: string) => {
    if (value === "none") return;
    onUpdate({ ownerId: value });
  };

  const [datePickerMode, setDatePickerMode] = useState<"due" | "start">("due");

  const handleDateChange = (date: Date | undefined, mode: "due" | "start") => {
    if (!date) {
      if (mode === "due") {
        onUpdate({ dueDate: null, startDate: null });
      } else {
        onUpdate({ startDate: null });
      }
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    if (mode === "due") {
      const updates: Record<string, unknown> = { dueDate: dateStr };
      if (task.startDate && dateStr < task.startDate) {
        updates.startDate = dateStr;
      }
      onUpdate(updates);
    } else {
      if (!task.dueDate) {
        onUpdate({ dueDate: dateStr, startDate: dateStr });
      } else if (dateStr > task.dueDate) {
        onUpdate({ startDate: task.dueDate, dueDate: dateStr });
      } else {
        onUpdate({ startDate: dateStr });
      }
    }
  };

  const ownerUser = task.owner || allUsers.find((u) => u.id === task.ownerId);
  const ownerName = ownerUser
    ? `${ownerUser.firstName} ${ownerUser.lastName}`
    : null;
  const collaborators = task.collaborators ?? [];

  if (isOverlay) {
    return (
      <>
        <td className="px-2 py-3 border-r border-border">
          <button
            {...dragHandleProps}
            className="flex items-center justify-center w-6 h-6 rounded cursor-grab active:cursor-grabbing hover-elevate"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </td>
        <td className="px-4 py-3 border-r border-border">
          <span className="text-[15px] font-normal truncate block">{task.name}</span>
        </td>
        <td className="px-4 py-3 border-r border-border">
          {task.status ? (
            <Badge variant="secondary" className={`${statusColors[task.status]} no-default-active-elevate`}>
              {statusLabels[task.status] || task.status}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground/50">-</span>
          )}
        </td>
        <td className="px-4 py-3 border-r border-border">
          <span className="text-sm">{ownerName || "-"}</span>
        </td>
        <td className="px-4 py-3 border-r border-border">
          <CollaboratorAvatars collaborators={collaborators} />
        </td>
        <td className="px-4 py-3 border-r border-border">
          <span className="text-sm">
            {formatDateDisplay(task.startDate, task.dueDate)}
          </span>
        </td>
        <td className="px-4 py-3" />
      </>
    );
  }

  const handleNameClick = () => {
    if (window.innerWidth < 768 && onOpenDetail) {
      onOpenDetail();
    } else {
      setEditingName(true);
    }
  };

  return (
    <>
      <td className="px-2 py-3 border-r border-border">
        {!isSubTask ? (
          <button
            {...dragHandleProps}
            className="flex items-center justify-center w-6 h-6 rounded cursor-grab active:cursor-grabbing hover-elevate"
            data-testid={`drag-handle-task-${task.id}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-6 h-6" />
        )}
      </td>
      <td className="px-4 py-3 border-r border-border group overflow-hidden">
        <div className={cn("flex items-center gap-1", isSubTask && "pl-6")}>
          {editingName ? (
            <Input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
                if (e.key === "Escape") {
                  setNameValue(task.name);
                  setEditingName(false);
                }
              }}
              className="h-8 flex-1 min-w-0 text-[15px]"
              data-testid={`input-inline-task-name-${task.id}`}
            />
          ) : (
            <span
              className={cn(
                "text-[15px] font-normal cursor-pointer hover:bg-muted/50 px-2 py-1 -mx-2 rounded truncate block min-w-0 flex-1",
                task.status === "done" && "line-through text-muted-foreground",
              )}
              onClick={handleNameClick}
              data-testid={`text-task-name-${task.id}`}
            >
              {task.name}
            </span>
          )}
          {!editingName && !isSubTask && (
            <TaskNameIndicators
              task={task}
              isCollapsed={isCollapsed}
              onToggleCollapse={onToggleCollapse}
            />
          )}
          {!editingName && isSubTask && (task.commentCount ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground flex-shrink-0 ml-1"
              data-testid={`indicator-comments-${task.id}`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>{task.commentCount}</span>
            </span>
          )}
          {onOpenDetail && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground invisible group-hover:visible flex-shrink-0 hidden md:flex"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail();
              }}
              data-testid={`button-detail-task-${task.id}`}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
      <td className="px-2 py-3 border-r border-border">
        {canWrite ? (
          <Select value={task.status} onValueChange={handleStatusChange}>
            <SelectTrigger
              className="h-8 w-full border-0 bg-transparent hover:bg-muted/50 focus:ring-0 px-0"
              data-testid={`select-inline-status-${task.id}`}
            >
              <Badge
                variant="secondary"
                className={`${statusColors[task.status]} no-default-active-elevate pointer-events-none`}
              >
                {statusLabels[task.status] || task.status}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="secondary"
            className={`${statusColors[task.status]} no-default-active-elevate`}
          >
            {statusLabels[task.status] || task.status}
          </Badge>
        )}
      </td>
      <td className="px-2 py-3 border-r border-border">
        {canWrite ? (
          <Select value={task.ownerId || "none"} onValueChange={handleOwnerChange}>
            <SelectTrigger
              className="h-8 w-full border-0 bg-transparent hover:bg-muted/50 focus:ring-0 px-2"
              data-testid={`select-inline-owner-${task.id}`}
            >
              {ownerUser ? (
                <div className="flex items-center gap-1.5 truncate">
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={ownerUser.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(ownerUser.firstName?.[0] || "") + (ownerUser.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{ownerUser.firstName}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground/50">-</span>
              )}
            </SelectTrigger>
            <SelectContent>
              {allUsers.filter((u) => u.firstName || u.lastName).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm">{ownerName || "-"}</span>
        )}
      </td>
      <td className="px-4 py-3 border-r border-border">
        <CollaboratorAvatars collaborators={collaborators} />
      </td>
      <td className="px-4 py-3 border-r border-border">
        {canWrite ? (
          <Popover onOpenChange={() => setDatePickerMode("due")}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-8 w-full px-2 justify-start text-left font-normal hover:bg-muted/50",
                  !task.dueDate && !task.startDate && "text-muted-foreground/50",
                )}
                data-testid={`button-inline-due-date-${task.id}`}
              >
                <span className="text-sm truncate">
                  {task.dueDate || task.startDate ? formatDateDisplay(task.startDate, task.dueDate) : "-"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex border-b">
                <button
                  className={cn(
                    "flex-1 px-4 py-2 text-xs font-medium transition-colors",
                    datePickerMode === "due"
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setDatePickerMode("due")}
                  data-testid={`tab-due-date-${task.id}`}
                >
                  Due Date
                  {task.dueDate && (
                    <span className="ml-1 text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>
                  )}
                </button>
                <button
                  className={cn(
                    "flex-1 px-4 py-2 text-xs font-medium transition-colors",
                    datePickerMode === "start"
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setDatePickerMode("start")}
                  data-testid={`tab-start-date-${task.id}`}
                >
                  Start Date
                  {task.startDate && (
                    <span className="ml-1 text-[10px] text-muted-foreground">{formatDate(task.startDate)}</span>
                  )}
                </button>
              </div>
              <Calendar
                mode="single"
                selected={
                  datePickerMode === "due"
                    ? (task.dueDate ? parseISO(task.dueDate) : undefined)
                    : (task.startDate ? parseISO(task.startDate) : undefined)
                }
                onSelect={(date) => handleDateChange(date, datePickerMode)}
                initialFocus
              />
              <div className="p-2 border-t flex gap-2">
                {datePickerMode === "due" && task.dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDateChange(undefined, "due")}
                    data-testid={`button-clear-due-date-${task.id}`}
                  >
                    Clear dates
                  </Button>
                )}
                {datePickerMode === "start" && task.startDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDateChange(undefined, "start")}
                    data-testid={`button-clear-start-date-${task.id}`}
                  >
                    Clear start date
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-sm">
            {task.dueDate || task.startDate ? formatDateDisplay(task.startDate, task.dueDate) : "-"}
          </span>
        )}
      </td>
    </>
  );
}

interface DropTarget {
  targetId: string;
  position: "before" | "after";
}

export function ProposalTaskGrid({
  tasks,
  allUsers,
  canWrite,
  onUpdateTask,
  onCreateTask,
  onReorderTasks,
  onSelectTask,
  selectedTaskId,
}: ProposalTaskGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [pendingNewTask, setPendingNewTask] = useState(false);
  const [pendingSubTaskParentId, setPendingSubTaskParentId] = useState<string | null>(null);
  const [taskCreationKey, setTaskCreationKey] = useState(0);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const parentTasks = tasks.filter((t) => !t.parentTaskId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDropTarget(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over || !activeId) {
      setDropTarget(null);
      return;
    }
    const overId = over.id as string;
    if (overId === activeId) {
      setDropTarget(null);
      return;
    }

    const activeIndex = parentTasks.findIndex((t) => t.id === activeId);
    const overIndex = parentTasks.findIndex((t) => t.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
      setDropTarget(null);
      return;
    }

    const position = activeIndex < overIndex ? "after" : "before";
    setDropTarget({ targetId: overId, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !dropTarget) {
      setActiveId(null);
      setDropTarget(null);
      return;
    }

    const draggedId = active.id as string;
    const oldIndex = parentTasks.findIndex((t) => t.id === draggedId);
    let newIndex = parentTasks.findIndex((t) => t.id === dropTarget.targetId);

    if (dropTarget.position === "after") newIndex++;
    if (oldIndex < newIndex) newIndex--;

    if (oldIndex !== newIndex && oldIndex !== -1 && newIndex >= 0) {
      const newOrder = [...parentTasks];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      onReorderTasks(newOrder.map((t) => t.id));
    }

    setActiveId(null);
    setDropTarget(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDropTarget(null);
  };

  const getDropIndicator = (taskId: string): "before" | "after" | null => {
    if (!dropTarget || dropTarget.targetId !== taskId) return null;
    return dropTarget.position;
  };

  const activeTask = activeId ? parentTasks.find((t) => t.id === activeId) : null;

  if (tasks.length === 0 && !pendingNewTask) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <GripVertical className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2" data-testid="text-no-tasks">No tasks yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Add tasks to track your proposal progress
        </p>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => setPendingNewTask(true)}
            data-testid="button-add-first-task"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {parentTasks.map((task) => {
          const subTasks = task.subTasks ?? [];
          const isCollapsed = collapsedTasks.has(task.id);
          return (
            <div key={task.id} className="border-b border-border">
              <div
                className="flex items-center gap-2 px-3 py-3 hover-elevate cursor-pointer"
                onClick={() => onSelectTask(task.id)}
                data-testid={`mobile-task-${task.id}`}
              >
                {subTasks.length > 0 && (
                  <button
                    className="flex-shrink-0 p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(task.id);
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                )}
                <StatusIcon status={task.status} />
                <span
                  className={cn(
                    "flex-1 truncate text-sm min-w-0",
                    task.status === "done" && "line-through text-muted-foreground",
                  )}
                  data-testid={`mobile-task-name-${task.id}`}
                >
                  {task.name}
                </span>
                {subTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{subTasks.length}</span>
                )}
                {(task.commentCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {task.commentCount}
                  </span>
                )}
                {task.owner && (
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={task.owner.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {(task.owner.firstName?.[0] || "") + (task.owner.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              {!isCollapsed && subTasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 pl-10 pr-3 py-2 border-t border-border hover-elevate cursor-pointer"
                  onClick={() => onSelectTask(sub.id)}
                  data-testid={`mobile-subtask-${sub.id}`}
                >
                  <StatusIcon status={sub.status} />
                  <span
                    className={cn(
                      "flex-1 truncate text-sm min-w-0",
                      sub.status === "done" && "line-through text-muted-foreground",
                    )}
                  >
                    {sub.name}
                  </span>
                  {(sub.commentCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {sub.commentCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        {canWrite && (
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setPendingNewTask(true)}
              data-testid="mobile-button-add-task"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add task
            </Button>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div>
            <table className="w-full border-collapse [table-layout:fixed]" data-testid="table-proposal-tasks">
              <thead className="border-b">
                <tr>
                  <th className="px-2 py-3 text-left w-[40px]" />
                  <th className="px-4 py-3 text-left text-[13px] w-full font-medium text-muted-foreground">
                    Task Name
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[130px]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[150px]">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[120px]">
                    Collaborators
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[170px]">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={parentTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {parentTasks.map((task) => {
                    const subTasks = task.subTasks ?? [];
                    const isCollapsed = collapsedTasks.has(task.id);
                    const indicator = getDropIndicator(task.id);

                    return [
                      <SortableTaskRow
                        key={task.id}
                        task={task}
                        showDropIndicator={indicator}
                      >
                        {(dragHandleProps) => (
                          <TaskRowContent
                            task={task}
                            dragHandleProps={dragHandleProps}
                            allUsers={allUsers}
                            canWrite={canWrite}
                            onUpdate={(updates) => onUpdateTask(task.id, updates)}

                            onOpenDetail={() => onSelectTask(task.id)}
                            isCollapsed={isCollapsed}
                            onToggleCollapse={subTasks.length > 0 ? () => toggleCollapse(task.id) : undefined}
                          />
                        )}
                      </SortableTaskRow>,
                      ...(!isCollapsed
                        ? subTasks.map((sub) => (
                            <tr
                              key={sub.id}
                              className="border-b border-border bg-muted/20"
                              data-testid={`subtask-row-${sub.id}`}
                            >
                              <TaskRowContent
                                task={sub as ProposalTaskWithRelations}
                                dragHandleProps={{}}
                                allUsers={allUsers}
                                canWrite={canWrite}
                                onUpdate={(updates) => onUpdateTask(sub.id, updates)}

                                onOpenDetail={() => onSelectTask(sub.id)}
                                isSubTask
                              />
                            </tr>
                          ))
                        : []),
                    ];
                  })}
                </SortableContext>

                {pendingSubTaskParentId && (
                  <InlineNewTask
                    key={`new-subtask-${pendingSubTaskParentId}-${taskCreationKey}`}
                    isSubTask
                    onSubmit={(name) => {
                      onCreateTask({ name, parentTaskId: pendingSubTaskParentId });
                      setTaskCreationKey((k) => k + 1);
                    }}
                    onCancel={() => setPendingSubTaskParentId(null)}
                  />
                )}

                {pendingNewTask && (
                  <InlineNewTask
                    key={`new-task-${taskCreationKey}`}
                    onSubmit={(name) => {
                      onCreateTask({ name });
                      setTaskCreationKey((k) => k + 1);
                    }}
                    onCancel={() => setPendingNewTask(false)}
                  />
                )}
                {canWrite && (
                  <tr>
                    <td colSpan={COL_COUNT} className="px-4 py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-7 px-2"
                        onClick={() => setPendingNewTask(true)}
                        data-testid="button-add-task-bottom"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add task
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <div className="pointer-events-none">
                <table className="w-full bg-background/95 border border-primary/20 rounded-md shadow-lg">
                  <tbody>
                    <tr>
                      <TaskRowContent
                        task={activeTask}
                        dragHandleProps={{}}
                        allUsers={allUsers}
                        canWrite={false}
                        onUpdate={() => {}}

                        isOverlay
                      />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
