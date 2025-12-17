import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, X, CalendarClock } from "lucide-react";
import { format, addDays } from "date-fns";

type ScheduleMode = "specific" | "flexible";

interface EventSchedule {
  id: string;
  kind: "primary" | "alternative" | "range";
  startDate?: Date;
  rangeStartMonth?: number;
  rangeStartYear?: number;
  rangeEndMonth?: number;
  rangeEndYear?: number;
}

interface DealEvent {
  id: string;
  label: string;
  durationDays: number;
  scheduleMode: ScheduleMode;
  schedules: EventSchedule[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getNext12Months(): { month: number; year: number; label: string }[] {
  const now = new Date();
  const result = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`,
    });
  }
  return result;
}

function getEndMonthOptions(startMonth: number, startYear: number): { month: number; year: number; label: string }[] {
  const result = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(startYear, startMonth + i, 1);
    result.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`,
    });
  }
  return result;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function formatDateRange(start: Date, days: number): string {
  if (days === 1) {
    return format(start, "MMM d, yyyy");
  }
  const end = addDays(start, days - 1);
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

function formatMonthRange(startMonth: number, startYear: number, endMonth: number, endYear: number): string {
  if (startYear === endYear && startMonth === endMonth) {
    return `${MONTHS[startMonth]} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${MONTHS[startMonth]}–${MONTHS[endMonth]} ${startYear}`;
  }
  return `${MONTHS[startMonth]} ${startYear} – ${MONTHS[endMonth]} ${endYear}`;
}

function EventRow({ 
  event, 
  onUpdate, 
  onRemove 
}: { 
  event: DealEvent; 
  onUpdate: (event: DealEvent) => void;
  onRemove: () => void;
}) {
  const updateField = <K extends keyof DealEvent>(key: K, value: DealEvent[K]) => {
    onUpdate({ ...event, [key]: value });
  };

  const updateSchedule = (scheduleId: string, updates: Partial<EventSchedule>) => {
    onUpdate({
      ...event,
      schedules: event.schedules.map(s => 
        s.id === scheduleId ? { ...s, ...updates } : s
      ),
    });
  };

  const addAlternativeDate = () => {
    onUpdate({
      ...event,
      schedules: [
        ...event.schedules,
        { id: generateId(), kind: "alternative", startDate: undefined },
      ],
    });
  };

  const removeSchedule = (scheduleId: string) => {
    onUpdate({
      ...event,
      schedules: event.schedules.filter(s => s.id !== scheduleId),
    });
  };

  const getPrimarySchedule = () => event.schedules.find(s => s.kind === "primary");
  const getAlternativeSchedules = () => event.schedules.filter(s => s.kind === "alternative");
  const getRangeSchedule = () => event.schedules.find(s => s.kind === "range");

  const toggleTBD = (isTBD: boolean) => {
    if (isTBD) {
      const startOptions = getNext12Months();
      const firstStart = startOptions[0];
      onUpdate({
        ...event,
        scheduleMode: "flexible",
        schedules: [{
          id: generateId(),
          kind: "range",
          rangeStartMonth: firstStart.month,
          rangeStartYear: firstStart.year,
          rangeEndMonth: firstStart.month,
          rangeEndYear: firstStart.year,
        }],
      });
    } else {
      onUpdate({
        ...event,
        scheduleMode: "specific",
        schedules: [{ id: generateId(), kind: "primary", startDate: undefined }],
      });
    }
  };

  const rangeSchedule = getRangeSchedule();
  const startMonthOptions = getNext12Months();
  const endMonthOptions = rangeSchedule?.rangeStartMonth !== undefined && rangeSchedule?.rangeStartYear !== undefined
    ? getEndMonthOptions(rangeSchedule.rangeStartMonth, rangeSchedule.rangeStartYear)
    : [];
  
  const startValue = rangeSchedule?.rangeStartMonth !== undefined && rangeSchedule?.rangeStartYear !== undefined
    ? `${rangeSchedule.rangeStartMonth}-${rangeSchedule.rangeStartYear}`
    : undefined;
  
  const endValue = rangeSchedule?.rangeEndMonth !== undefined && rangeSchedule?.rangeEndYear !== undefined
    ? `${rangeSchedule.rangeEndMonth}-${rangeSchedule.rangeEndYear}`
    : undefined;

  return (
    <div className="border rounded-md p-3 space-y-3" data-testid={`event-card-${event.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_80px] gap-2">
          <Input
            value={event.label}
            onChange={(e) => updateField("label", e.target.value)}
            placeholder="Description (e.g., Main Conference)"
            className="h-9"
            data-testid={`input-event-label-${event.id}`}
          />
          <Input
            type="number"
            min={1}
            max={30}
            value={event.durationDays}
            onChange={(e) => updateField("durationDays", Math.max(1, parseInt(e.target.value) || 1))}
            className="h-9 w-20"
            data-testid={`input-duration-${event.id}`}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          data-testid={`button-remove-event-${event.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-xs">Duration: {event.durationDays} {event.durationDays === 1 ? "day" : "days"}</span>
      </div>

      {event.scheduleMode === "specific" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={getPrimarySchedule()?.startDate ? format(getPrimarySchedule()!.startDate!, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const schedule = getPrimarySchedule();
                if (schedule && e.target.value) {
                  updateSchedule(schedule.id, { startDate: new Date(e.target.value) });
                }
              }}
              className="h-9 w-40"
              data-testid={`input-primary-date-${event.id}`}
            />
            {getAlternativeSchedules().map((alt, index) => (
              <div key={alt.id} className="flex items-center gap-1">
                <Input
                  type="date"
                  value={alt.startDate ? format(alt.startDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateSchedule(alt.id, { startDate: new Date(e.target.value) });
                    }
                  }}
                  className="h-9 w-40"
                  data-testid={`input-alternative-${event.id}-${index}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSchedule(alt.id)}
                  className="h-7 w-7"
                  data-testid={`button-remove-alternative-${event.id}-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={addAlternativeDate}
              className="h-9 text-xs"
              data-testid={`button-add-alternative-${event.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Alt
            </Button>
          </div>
          {getPrimarySchedule()?.startDate && event.durationDays > 1 && (
            <p className="text-xs text-muted-foreground">
              {formatDateRange(getPrimarySchedule()!.startDate!, event.durationDays)}
            </p>
          )}
        </div>
      )}

      {event.scheduleMode === "flexible" && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={startValue}
            onValueChange={(v) => {
              const [month, year] = v.split("-").map(Number);
              const schedule = getRangeSchedule();
              if (schedule) {
                const newEndOptions = getEndMonthOptions(month, year);
                updateSchedule(schedule.id, { 
                  rangeStartMonth: month, 
                  rangeStartYear: year,
                  rangeEndMonth: newEndOptions[0].month,
                  rangeEndYear: newEndOptions[0].year,
                });
              }
            }}
          >
            <SelectTrigger className="h-9 w-40" data-testid={`select-start-month-${event.id}`}>
              <SelectValue placeholder="From" />
            </SelectTrigger>
            <SelectContent>
              {startMonthOptions.map((opt) => (
                <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">to</span>
          <Select
            value={endValue}
            onValueChange={(v) => {
              const [month, year] = v.split("-").map(Number);
              const schedule = getRangeSchedule();
              if (schedule) {
                updateSchedule(schedule.id, { rangeEndMonth: month, rangeEndYear: year });
              }
            }}
            disabled={!startValue}
          >
            <SelectTrigger className="h-9 w-40" data-testid={`select-end-month-${event.id}`}>
              <SelectValue placeholder="To" />
            </SelectTrigger>
            <SelectContent>
              {endMonthOptions.map((opt) => (
                <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-2">
          <Switch
            id={`tbd-${event.id}`}
            checked={event.scheduleMode === "flexible"}
            onCheckedChange={toggleTBD}
            data-testid={`switch-tbd-${event.id}`}
          />
          <Label htmlFor={`tbd-${event.id}`} className="text-xs text-muted-foreground cursor-pointer">
            Date TBD
          </Label>
        </div>
        <div className="flex items-center gap-1">
          {event.scheduleMode === "flexible" ? (
            <Badge variant="outline" className="text-xs">
              <CalendarClock className="h-3 w-3 mr-1" />
              TBD
            </Badge>
          ) : getPrimarySchedule()?.startDate && getAlternativeSchedules().length === 0 ? (
            <Badge variant="default" className="text-xs">Confirmed</Badge>
          ) : getAlternativeSchedules().length > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {getAlternativeSchedules().length + 1} options
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function EventSchedulePrototype() {
  const [events, setEvents] = useState<DealEvent[]>([
    {
      id: generateId(),
      label: "Main Conference",
      durationDays: 3,
      scheduleMode: "specific",
      schedules: [{ id: generateId(), kind: "primary", startDate: new Date("2025-06-15") }],
    },
    {
      id: generateId(),
      label: "Welcome Reception",
      durationDays: 1,
      scheduleMode: "specific",
      schedules: [
        { id: generateId(), kind: "primary", startDate: new Date("2025-06-14") },
        { id: generateId(), kind: "alternative", startDate: new Date("2025-06-13") },
      ],
    },
    {
      id: generateId(),
      label: "Corporate Retreat",
      durationDays: 2,
      scheduleMode: "flexible",
      schedules: [{
        id: generateId(),
        kind: "range",
        rangeStartMonth: 8,
        rangeStartYear: 2025,
        rangeEndMonth: 10,
        rangeEndYear: 2025,
      }],
    },
  ]);

  const addEvent = () => {
    const newEvent: DealEvent = {
      id: generateId(),
      label: "",
      durationDays: 1,
      scheduleMode: "specific",
      schedules: [{ id: generateId(), kind: "primary", startDate: undefined }],
    };
    setEvents([...events, newEvent]);
  };

  const updateEvent = (updatedEvent: DealEvent) => {
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const removeEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Event Schedule Prototype</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compact event scheduling UI. Toggle "Date TBD" to switch to flexible date windows.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events
          </CardTitle>
          <CardDescription className="text-sm">
            Add events with specific dates or flexible windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No events added yet.</p>
            </div>
          ) : (
            events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onUpdate={updateEvent}
                onRemove={() => removeEvent(event.id)}
              />
            ))
          )}

          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={addEvent}
            data-testid="button-add-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Debug: Current State</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
            {JSON.stringify(events, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
