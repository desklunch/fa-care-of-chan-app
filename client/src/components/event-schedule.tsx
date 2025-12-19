import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Trash2, X, Calendar, Plus } from "lucide-react";
import { format, addDays } from "date-fns";
import { parseDateOnly } from "@/lib/date";
import type { DealEvent, EventScheduleItem, ScheduleMode } from "@shared/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

function formatMonthRange(startMonth: number, startYear: number, endMonth: number, endYear: number): string {
  if (startYear === endYear && startMonth === endMonth) {
    return `${MONTHS[startMonth]} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${MONTHS[startMonth]} – ${MONTHS[endMonth]} ${startYear}`;
  }
  return `${MONTHS[startMonth]} ${startYear} – ${MONTHS[endMonth]} ${endYear}`;
}

interface EventSummary {
  text: string;
  altCount: number;
}

export function getEventSummary(event: DealEvent): EventSummary | null {
  if (event.scheduleMode === "specific") {
    const primary = event.schedules.find((s) => s.kind === "primary");
    const alternatives = event.schedules.filter((s) => s.kind === "alternative");
    
    if (!primary?.startDate) {
      return null;
    }
    
    const startDate = parseDateOnly(primary.startDate);
    if (!startDate) {
      return null;
    }
    const altCount = alternatives.length;
    
    if (event.durationDays === 1) {
      return {
        text: format(startDate, "EEE MMM d, yyyy"),
        altCount,
      };
    } else {
      const endDate = addDays(startDate, event.durationDays - 1);
      const dateRange = startDate.getMonth() === endDate.getMonth()
        ? `${format(startDate, "EEE MMM d")} – ${format(endDate, "d, yyyy")}`
        : `${format(startDate, "EEE MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
      return {
        text: `${event.durationDays} days, ${dateRange}`,
        altCount,
      };
    }
  } else {
    const range = event.schedules.find((s) => s.kind === "range");
    if (
      range?.rangeStartMonth === undefined ||
      range?.rangeStartYear === undefined ||
      range?.rangeEndMonth === undefined ||
      range?.rangeEndYear === undefined
    ) {
      return null;
    }
    
    const dayText = event.durationDays === 1 ? "1 day" : `${event.durationDays} days`;
    const monthRange = formatMonthRange(
      range.rangeStartMonth,
      range.rangeStartYear,
      range.rangeEndMonth,
      range.rangeEndYear,
    );
    return {
      text: `${dayText} in ${monthRange}`,
      altCount: 0,
    };
  }
}

export function getEventsSummaryText(events: DealEvent[]): string {
  if (!events || events.length === 0) return "";
  const summaries = events.map(e => getEventSummary(e)).filter(Boolean);
  if (summaries.length === 0) return "";
  return summaries.map(s => s!.text).join("; ");
}

function EventRow({
  event,
  onUpdate,
  onRemove,
}: {
  event: DealEvent;
  onUpdate: (event: DealEvent) => void;
  onRemove: () => void;
}) {
  const updateField = <K extends keyof DealEvent>(key: K, value: DealEvent[K]) => {
    onUpdate({ ...event, [key]: value });
  };

  const updateSchedule = (scheduleId: string, updates: Partial<EventScheduleItem>) => {
    onUpdate({
      ...event,
      schedules: event.schedules.map((s) =>
        s.id === scheduleId ? { ...s, ...updates } : s,
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
      schedules: event.schedules.filter((s) => s.id !== scheduleId),
    });
  };

  const getPrimarySchedule = () => event.schedules.find((s) => s.kind === "primary");
  const getAlternativeSchedules = () => event.schedules.filter((s) => s.kind === "alternative");
  const getRangeSchedule = () => event.schedules.find((s) => s.kind === "range");

  const toggleTBD = (isTBD: boolean) => {
    if (isTBD) {
      const startOptions = getNext12Months();
      const firstStart = startOptions[0];
      onUpdate({
        ...event,
        scheduleMode: "flexible",
        schedules: [
          {
            id: generateId(),
            kind: "range",
            rangeStartMonth: firstStart.month,
            rangeStartYear: firstStart.year,
            rangeEndMonth: firstStart.month,
            rangeEndYear: firstStart.year,
          },
        ],
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
  const endMonthOptions =
    rangeSchedule?.rangeStartMonth !== undefined && rangeSchedule?.rangeStartYear !== undefined
      ? getEndMonthOptions(rangeSchedule.rangeStartMonth, rangeSchedule.rangeStartYear)
      : [];

  const startValue =
    rangeSchedule?.rangeStartMonth !== undefined && rangeSchedule?.rangeStartYear !== undefined
      ? `${rangeSchedule.rangeStartMonth}-${rangeSchedule.rangeStartYear}`
      : undefined;

  const endValue =
    rangeSchedule?.rangeEndMonth !== undefined && rangeSchedule?.rangeEndYear !== undefined
      ? `${rangeSchedule.rangeEndMonth}-${rangeSchedule.rangeEndYear}`
      : undefined;

  const summary = getEventSummary(event);
  const primarySchedule = getPrimarySchedule();
  const primaryDate = primarySchedule?.startDate ? parseDateOnly(primarySchedule.startDate) ?? undefined : undefined;

  return (
    <div className="border rounded-md p-3 space-y-3 pb-4" data-testid={`event-card-${event.id}`}>
      <div className="w-full flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2 text-sm" data-testid={`text-summary-${event.id}`}>
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{summary ? summary.text : "Please provide date requirements"}</span>
          {summary && summary.altCount > 0 && (
            <Badge variant="outline" className="text-muted-foreground text-xs px-1 py-0.5">
              {summary.altCount} Alt Date{summary.altCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8  hover:text-destructive"
          data-testid={`button-remove-event-${event.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-4 w-full">
          <div className="space-y-1 w-full">
            <Label className="text-xs">Description</Label>
            <Input
              value={event.label}
              onChange={(e) => updateField("label", e.target.value)}
              placeholder="Description (e.g., Main Conference)"
              className="h-10"
              data-testid={`input-event-label-${event.id}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration</Label>
            <div className="flex h-10 items-center rounded-md border px-3 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring bg-background border-input">
              <input
                type="number"
                min={1}
                max={30}
                value={event.durationDays}
                onChange={(e) => updateField("durationDays", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-4 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid={`input-duration-${event.id}`}
              />
              <span className="text-muted-foreground text-xs">
                {event.durationDays === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`tbd-${event.id}`} className="text-xs">Date TBD</Label>
            <div className="h-10 w-16 flex items-center justify-center bg-background border border-input rounded-md">
              <Switch
                id={`tbd-${event.id}`}
                checked={event.scheduleMode === "flexible"}
                onCheckedChange={toggleTBD}
                data-testid={`switch-tbd-${event.id}`}
              />
            </div>
          </div>
        </div>
      </div>

      {event.scheduleMode === "specific" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className="text-xs">
                {event.durationDays === 1 ? "Event Date" : "Start Date"}
              </Label>
              <DatePicker
                date={primaryDate}
                onSelect={(date) => {
                  const schedule = getPrimarySchedule();
                  if (schedule) {
                    updateSchedule(schedule.id, { startDate: date ? format(date, "yyyy-MM-dd") : undefined });
                  }
                }}
                placeholder="Select date"
                data-testid={`input-primary-date-${event.id}`}
                className="h-10 pr-6"
              />
            </div>

            {getAlternativeSchedules().map((alt, index) => (
              <div key={alt.id} className="flex items-center">
                <div className="space-y-1">
                  <Label className="text-xs">Alt Date {index + 1}</Label>
                  <div className="flex items-center gap-0 bg-background rounded-md border">
                    <DatePicker
                      date={alt.startDate ? parseDateOnly(alt.startDate) ?? undefined : undefined}
                      onSelect={(date) => {
                        updateSchedule(alt.id, { startDate: date ? format(date, "yyyy-MM-dd") : undefined });
                      }}
                      placeholder="Select date"
                      className="rounded-r-none border-none"
                      data-testid={`input-alternative-${event.id}-${index}`}
                    />
                    <div className="h-6 w-px bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSchedule(alt.id)}
                      className="h-10 rounded-l-none text-muted-foreground hover:text-destructive w-5 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:stroke-[2.5px] border-none mr-1"
                      data-testid={`button-remove-alternative-${event.id}-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAlternativeDate}
              className="h-10 text-xs px-2 pr-4"
              data-testid={`button-add-alternative-${event.id}`}
            >
              <Plus className="h-3 w-3" />
              Alt Dates
            </Button>
          </div>
        </div>
      )}

      {event.scheduleMode === "flexible" && (
        <div className="space-y-1">
          <Label className="text-xs">Date Window</Label>
          <div className="flex items-center gap-2">
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
              <SelectTrigger className="h-10 w-48" data-testid={`select-start-month-${event.id}`}>
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
            <span className="text-muted-foreground text-xs mx-1">to</span>
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
              <SelectTrigger className="h-10 w-48" data-testid={`select-end-month-${event.id}`}>
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
        </div>
      )}
    </div>
  );
}

interface EventScheduleEditorProps {
  value: DealEvent[];
  onChange: (events: DealEvent[]) => void;
}

export function EventScheduleEditor({ value, onChange }: EventScheduleEditorProps) {
  const addEvent = () => {
    const newEvent: DealEvent = {
      id: generateId(),
      label: "",
      durationDays: 1,
      scheduleMode: "specific",
      schedules: [{ id: generateId(), kind: "primary", startDate: undefined }],
    };
    onChange([...value, newEvent]);
  };

  const updateEvent = (updatedEvent: DealEvent) => {
    onChange(value.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
  };

  const removeEvent = (eventId: string) => {
    onChange(value.filter((e) => e.id !== eventId));
  };

  return (
    <div className="space-y-3">
      {value.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          onUpdate={updateEvent}
          onRemove={() => removeEvent(event.id)}
        />
      ))}
      <Button
        type="button"
        variant="default"
        size="lg"
        onClick={addEvent}
        className="w-full h-10"
        data-testid="button-add-event"
      >
        <CalendarPlus className="h-4 w-4 " />
        Add a Calendar Block
      </Button>
    </div>
  );
}
