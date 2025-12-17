import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, CalendarDays, CalendarRange } from "lucide-react";
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
  isExpanded: boolean;
}

const MONTHS = [
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
      label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
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
      label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
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
    return `${MONTHS[startMonth]} – ${MONTHS[endMonth]} ${startYear}`;
  }
  return `${MONTHS[startMonth]} ${startYear} – ${MONTHS[endMonth]} ${endYear}`;
}

function EventCard({ 
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

  const isConfirmed = event.scheduleMode === "specific" && 
    getPrimarySchedule()?.startDate && 
    getAlternativeSchedules().length === 0;

  const handleScheduleModeChange = (mode: ScheduleMode) => {
    let newSchedules: EventSchedule[] = [];
    
    if (mode === "specific") {
      newSchedules = [{ id: generateId(), kind: "primary", startDate: undefined }];
    } else if (mode === "flexible") {
      const startOptions = getNext12Months();
      const firstStart = startOptions[0];
      newSchedules = [{
        id: generateId(),
        kind: "range",
        rangeStartMonth: firstStart.month,
        rangeStartYear: firstStart.year,
        rangeEndMonth: firstStart.month,
        rangeEndYear: firstStart.year,
      }];
    }
    
    onUpdate({ ...event, scheduleMode: mode, schedules: newSchedules });
  };

  const getStatusBadge = () => {
    if (event.scheduleMode === "flexible") {
      return <Badge variant="outline">Flexible</Badge>;
    }
    if (isConfirmed) {
      return <Badge variant="default">Confirmed</Badge>;
    }
    if (getAlternativeSchedules().length > 0) {
      return <Badge variant="secondary">Alternatives</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getEventSummary = () => {
    const durationText = event.durationDays > 1 ? `${event.durationDays} days` : "1 day";
    
    if (event.scheduleMode === "specific") {
      const primary = getPrimarySchedule();
      if (primary?.startDate) {
        const dateText = formatDateRange(primary.startDate, event.durationDays);
        const altCount = getAlternativeSchedules().length;
        if (altCount > 0) {
          return `${dateText} (+${altCount} alternative${altCount > 1 ? 's' : ''})`;
        }
        return dateText;
      }
      return durationText;
    }
    
    if (event.scheduleMode === "flexible") {
      const range = getRangeSchedule();
      if (range) {
        return `${durationText} • Window: ${formatMonthRange(
          range.rangeStartMonth!,
          range.rangeStartYear!,
          range.rangeEndMonth!,
          range.rangeEndYear!
        )}`;
      }
    }
    
    return durationText;
  };

  return (
    <Card className="mb-4" data-testid={`event-card-${event.id}`}>
      <Collapsible open={event.isExpanded} onOpenChange={(open) => updateField("isExpanded", open)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate rounded-t-md">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{event.label || "Untitled Event"}</CardTitle>
                  <CardDescription className="mt-1">
                    {getEventSummary()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {event.isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`event-label-${event.id}`}>Event Name</Label>
                <Input
                  id={`event-label-${event.id}`}
                  value={event.label}
                  onChange={(e) => updateField("label", e.target.value)}
                  placeholder="e.g., Main Conference, Gala Dinner"
                  data-testid={`input-event-label-${event.id}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`duration-${event.id}`}>Duration (days)</Label>
                <Input
                  id={`duration-${event.id}`}
                  type="number"
                  min={1}
                  max={30}
                  value={event.durationDays}
                  onChange={(e) => updateField("durationDays", Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32"
                  data-testid={`input-duration-${event.id}`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Date Selection</Label>
              <Tabs 
                value={event.scheduleMode} 
                onValueChange={(v) => handleScheduleModeChange(v as ScheduleMode)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="specific" className="flex-1" data-testid={`mode-specific-${event.id}`}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Specific Date
                  </TabsTrigger>
                  <TabsTrigger value="flexible" className="flex-1" data-testid={`mode-flexible-${event.id}`}>
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Flexible Window
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {event.scheduleMode === "specific" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {event.durationDays === 1 ? "Event Date" : "Start Date"}
                  </Label>
                  <Input
                    type="date"
                    value={getPrimarySchedule()?.startDate ? format(getPrimarySchedule()!.startDate!, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const schedule = getPrimarySchedule();
                      if (schedule && e.target.value) {
                        updateSchedule(schedule.id, { startDate: new Date(e.target.value) });
                      }
                    }}
                    className="w-48"
                    data-testid={`input-primary-date-${event.id}`}
                  />
                  {getPrimarySchedule()?.startDate && event.durationDays > 1 && (
                    <p className="text-sm text-muted-foreground">
                      Event runs: {formatDateRange(getPrimarySchedule()!.startDate!, event.durationDays)}
                    </p>
                  )}
                  {isConfirmed && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      This date is confirmed (no alternatives)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Alternative {event.durationDays === 1 ? "Dates" : "Start Dates"}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addAlternativeDate}
                      data-testid={`button-add-alternative-${event.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Alternative
                    </Button>
                  </div>
                  
                  {getAlternativeSchedules().length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No alternatives. Add alternative dates if the primary date isn't final.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getAlternativeSchedules().map((alt, index) => (
                        <div key={alt.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <Input
                            type="date"
                            value={alt.startDate ? format(alt.startDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                updateSchedule(alt.id, { startDate: new Date(e.target.value) });
                              }
                            }}
                            className="w-40"
                            data-testid={`input-alternative-${event.id}-${index}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSchedule(alt.id)}
                            data-testid={`button-remove-alternative-${event.id}-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {event.scheduleMode === "flexible" && (() => {
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Window Start</Label>
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
                        <SelectTrigger data-testid={`select-start-month-${event.id}`}>
                          <SelectValue placeholder="Select start month" />
                        </SelectTrigger>
                        <SelectContent>
                          {startMonthOptions.map((opt) => (
                            <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Window End</Label>
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
                        <SelectTrigger data-testid={`select-end-month-${event.id}`}>
                          <SelectValue placeholder={startValue ? "Select end month" : "Select start first"} />
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
                  </div>

                  {rangeSchedule && rangeSchedule.rangeStartMonth !== undefined && rangeSchedule.rangeEndMonth !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {event.durationDays === 1 ? "Event date" : "Start date"} will be finalized within: {" "}
                      <span className="font-medium">
                        {formatMonthRange(
                          rangeSchedule.rangeStartMonth,
                          rangeSchedule.rangeStartYear!,
                          rangeSchedule.rangeEndMonth,
                          rangeSchedule.rangeEndYear!
                        )}
                      </span>
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
                data-testid={`button-remove-event-${event.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Event
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
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
      isExpanded: true,
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
      isExpanded: false,
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
      isExpanded: false,
    },
  ]);

  const addEvent = () => {
    const newEvent: DealEvent = {
      id: generateId(),
      label: "",
      durationDays: 1,
      scheduleMode: "specific",
      schedules: [{ id: generateId(), kind: "primary", startDate: undefined }],
      isExpanded: true,
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
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Event Schedule Prototype</h1>
        <p className="text-muted-foreground mt-1">
          UI/UX prototype for managing event dates on deals. Dates are confirmed when no alternatives exist.
          Duration defaults to 1 day and can be increased for multi-day events.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Schedule
          </CardTitle>
          <CardDescription>
            Add events for this deal. Each event can have a specific date (with optional alternatives) 
            or a flexible window for when the date will be finalized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events added yet.</p>
              <p className="text-sm">Click the button below to add your first event.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onUpdate={updateEvent}
                  onRemove={() => removeEvent(event.id)}
                />
              ))}
            </div>
          )}

          <Button 
            type="button" 
            variant="outline" 
            className="w-full mt-4"
            onClick={addEvent}
            data-testid="button-add-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current State (Debug)</CardTitle>
          <CardDescription>JSON representation of the event schedule data</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
            {JSON.stringify(events, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
