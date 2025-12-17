import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { format, addDays } from "date-fns";

type EventType = "single" | "multi";
type ScheduleMode = "confirmed" | "preferred" | "flexible";

interface EventSchedule {
  id: string;
  kind: "confirmed" | "preferred" | "alternative" | "range";
  startDate?: Date;
  rangeStartMonth?: number;
  rangeStartYear?: number;
  rangeEndMonth?: number;
  rangeEndYear?: number;
}

interface DealEvent {
  id: string;
  label: string;
  eventType: EventType;
  durationDays: number;
  scheduleMode: ScheduleMode;
  schedules: EventSchedule[];
  isExpanded: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + i);

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

  const getConfirmedSchedule = () => event.schedules.find(s => s.kind === "confirmed");
  const getPreferredSchedule = () => event.schedules.find(s => s.kind === "preferred");
  const getAlternativeSchedules = () => event.schedules.filter(s => s.kind === "alternative");
  const getRangeSchedule = () => event.schedules.find(s => s.kind === "range");

  const handleScheduleModeChange = (mode: ScheduleMode) => {
    let newSchedules: EventSchedule[] = [];
    
    if (mode === "confirmed") {
      newSchedules = [{ id: generateId(), kind: "confirmed", startDate: undefined }];
    } else if (mode === "preferred") {
      newSchedules = [
        { id: generateId(), kind: "preferred", startDate: undefined },
      ];
    } else if (mode === "flexible") {
      const now = new Date();
      newSchedules = [{
        id: generateId(),
        kind: "range",
        rangeStartMonth: now.getMonth(),
        rangeStartYear: now.getFullYear(),
        rangeEndMonth: now.getMonth(),
        rangeEndYear: now.getFullYear(),
      }];
    }
    
    onUpdate({ ...event, scheduleMode: mode, schedules: newSchedules });
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
                    {event.eventType === "multi" ? `${event.durationDays} days` : "Single day"}
                    {event.scheduleMode === "confirmed" && getConfirmedSchedule()?.startDate && (
                      <span className="ml-2">
                        {formatDateRange(getConfirmedSchedule()!.startDate!, event.durationDays)}
                      </span>
                    )}
                    {event.scheduleMode === "preferred" && getPreferredSchedule()?.startDate && (
                      <span className="ml-2">
                        Preferred: {formatDateRange(getPreferredSchedule()!.startDate!, event.durationDays)}
                        {getAlternativeSchedules().length > 0 && ` (+${getAlternativeSchedules().length} alternatives)`}
                      </span>
                    )}
                    {event.scheduleMode === "flexible" && getRangeSchedule() && (
                      <span className="ml-2">
                        Window: {formatMonthRange(
                          getRangeSchedule()!.rangeStartMonth!,
                          getRangeSchedule()!.rangeStartYear!,
                          getRangeSchedule()!.rangeEndMonth!,
                          getRangeSchedule()!.rangeEndYear!
                        )}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  event.scheduleMode === "confirmed" ? "default" :
                  event.scheduleMode === "preferred" ? "secondary" : "outline"
                }>
                  {event.scheduleMode === "confirmed" && "Confirmed"}
                  {event.scheduleMode === "preferred" && "Preferred"}
                  {event.scheduleMode === "flexible" && "Flexible"}
                </Badge>
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
                <Label>Event Type</Label>
                <Tabs 
                  value={event.eventType} 
                  onValueChange={(v) => updateField("eventType", v as EventType)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="single" className="flex-1" data-testid={`tab-single-${event.id}`}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Single Day
                    </TabsTrigger>
                    <TabsTrigger value="multi" className="flex-1" data-testid={`tab-multi-${event.id}`}>
                      <CalendarRange className="h-4 w-4 mr-2" />
                      Multi-Day
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {event.eventType === "multi" && (
              <div className="space-y-2">
                <Label htmlFor={`duration-${event.id}`}>Duration (days)</Label>
                <Input
                  id={`duration-${event.id}`}
                  type="number"
                  min={2}
                  max={30}
                  value={event.durationDays}
                  onChange={(e) => updateField("durationDays", Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-32"
                  data-testid={`input-duration-${event.id}`}
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>Scheduling Mode</Label>
              <Tabs 
                value={event.scheduleMode} 
                onValueChange={(v) => handleScheduleModeChange(v as ScheduleMode)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="confirmed" className="flex-1" data-testid={`mode-confirmed-${event.id}`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Confirmed Date
                  </TabsTrigger>
                  <TabsTrigger value="preferred" className="flex-1" data-testid={`mode-preferred-${event.id}`}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Preferred + Alternatives
                  </TabsTrigger>
                  <TabsTrigger value="flexible" className="flex-1" data-testid={`mode-flexible-${event.id}`}>
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Flexible Window
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {event.scheduleMode === "confirmed" && (
              <div className="space-y-2">
                <Label>
                  {event.eventType === "single" ? "Event Date" : "Start Date"}
                </Label>
                <Input
                  type="date"
                  value={getConfirmedSchedule()?.startDate ? format(getConfirmedSchedule()!.startDate!, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const schedule = getConfirmedSchedule();
                    if (schedule && e.target.value) {
                      updateSchedule(schedule.id, { startDate: new Date(e.target.value) });
                    }
                  }}
                  className="w-48"
                  data-testid={`input-confirmed-date-${event.id}`}
                />
                {getConfirmedSchedule()?.startDate && event.eventType === "multi" && (
                  <p className="text-sm text-muted-foreground">
                    Event runs: {formatDateRange(getConfirmedSchedule()!.startDate!, event.durationDays)}
                  </p>
                )}
              </div>
            )}

            {event.scheduleMode === "preferred" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Preferred {event.eventType === "single" ? "Date" : "Start Date"}
                  </Label>
                  <Input
                    type="date"
                    value={getPreferredSchedule()?.startDate ? format(getPreferredSchedule()!.startDate!, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const schedule = getPreferredSchedule();
                      if (schedule && e.target.value) {
                        updateSchedule(schedule.id, { startDate: new Date(e.target.value) });
                      }
                    }}
                    className="w-48"
                    data-testid={`input-preferred-date-${event.id}`}
                  />
                  {getPreferredSchedule()?.startDate && event.eventType === "multi" && (
                    <p className="text-sm text-muted-foreground">
                      Event runs: {formatDateRange(getPreferredSchedule()!.startDate!, event.durationDays)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Alternative {event.eventType === "single" ? "Dates" : "Start Dates"}</Label>
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
                    <p className="text-sm text-muted-foreground">No alternative dates added yet.</p>
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

            {event.scheduleMode === "flexible" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Window Start</Label>
                    <div className="flex gap-2">
                      <Select
                        value={getRangeSchedule()?.rangeStartMonth?.toString()}
                        onValueChange={(v) => {
                          const schedule = getRangeSchedule();
                          if (schedule) {
                            updateSchedule(schedule.id, { rangeStartMonth: parseInt(v) });
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1" data-testid={`select-start-month-${event.id}`}>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, i) => (
                            <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={getRangeSchedule()?.rangeStartYear?.toString()}
                        onValueChange={(v) => {
                          const schedule = getRangeSchedule();
                          if (schedule) {
                            updateSchedule(schedule.id, { rangeStartYear: parseInt(v) });
                          }
                        }}
                      >
                        <SelectTrigger className="w-28" data-testid={`select-start-year-${event.id}`}>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Window End</Label>
                    <div className="flex gap-2">
                      <Select
                        value={getRangeSchedule()?.rangeEndMonth?.toString()}
                        onValueChange={(v) => {
                          const schedule = getRangeSchedule();
                          if (schedule) {
                            updateSchedule(schedule.id, { rangeEndMonth: parseInt(v) });
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1" data-testid={`select-end-month-${event.id}`}>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, i) => (
                            <SelectItem key={i} value={i.toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={getRangeSchedule()?.rangeEndYear?.toString()}
                        onValueChange={(v) => {
                          const schedule = getRangeSchedule();
                          if (schedule) {
                            updateSchedule(schedule.id, { rangeEndYear: parseInt(v) });
                          }
                        }}
                      >
                        <SelectTrigger className="w-28" data-testid={`select-end-year-${event.id}`}>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {getRangeSchedule() && (
                  <p className="text-sm text-muted-foreground">
                    {event.eventType === "single" ? "Event date" : "Start date"} will be finalized within: {" "}
                    <span className="font-medium">
                      {formatMonthRange(
                        getRangeSchedule()!.rangeStartMonth!,
                        getRangeSchedule()!.rangeStartYear!,
                        getRangeSchedule()!.rangeEndMonth!,
                        getRangeSchedule()!.rangeEndYear!
                      )}
                    </span>
                  </p>
                )}
              </div>
            )}

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
      eventType: "multi",
      durationDays: 3,
      scheduleMode: "confirmed",
      schedules: [{ id: generateId(), kind: "confirmed", startDate: new Date("2025-06-15") }],
      isExpanded: true,
    },
    {
      id: generateId(),
      label: "Welcome Reception",
      eventType: "single",
      durationDays: 1,
      scheduleMode: "preferred",
      schedules: [
        { id: generateId(), kind: "preferred", startDate: new Date("2025-06-14") },
        { id: generateId(), kind: "alternative", startDate: new Date("2025-06-13") },
      ],
      isExpanded: false,
    },
    {
      id: generateId(),
      label: "Corporate Retreat",
      eventType: "multi",
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
      eventType: "single",
      durationDays: 1,
      scheduleMode: "confirmed",
      schedules: [{ id: generateId(), kind: "confirmed", startDate: undefined }],
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
          UI/UX prototype for managing event dates on deals. This demonstrates the proposed interface
          for handling confirmed dates, preferred dates with alternatives, and flexible date windows.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Schedule
          </CardTitle>
          <CardDescription>
            Add events for this deal. Each event can have confirmed dates, preferred dates with alternatives,
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
