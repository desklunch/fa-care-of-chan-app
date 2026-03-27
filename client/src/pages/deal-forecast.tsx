import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { usePageHeader } from "@/framework/hooks/page-header-context";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  MapPin,
  Clock,
  Loader2,
  X,
  HelpCircle,
  FlaskConical,
} from "lucide-react";
import { MOCK_FORECAST_DATA } from "@/lib/mock-pipeline-forecast-data";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

function SectionTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center focus:outline-none">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer inline-block ml-1.5 flex-shrink-0" data-testid="icon-help" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed p-3">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ForecastLocation {
  displayName: string;
}

interface ForecastDeal {
  id: string;
  name: string;
  clientName: string;
  status: string;
  eventType: string;
  budgetLow: number;
  budgetHigh: number;
  weightedValue: number;
  probability: number;
  eventDate: string;
  locations: ForecastLocation[];
  durationDays: number;
  services: string[];
  industry: string;
}

interface BreakdownItem {
  name: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

interface MonthlyRevenue {
  month: string;
  monthLabel: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

interface QuarterlyRollup {
  quarter: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

interface EventDensity {
  month: string;
  monthLabel: string;
  eventCount: number;
  totalDays: number;
}

interface ForecastData {
  deals: ForecastDeal[];
  monthlyRevenue: MonthlyRevenue[];
  quarterlyRollups: QuarterlyRollup[];
  eventDensity: EventDensity[];
  revenueByService: BreakdownItem[];
  revenueByIndustry: BreakdownItem[];
  revenueByLocation: BreakdownItem[];
  summary: {
    totalWeighted: number;
    totalUnweighted: number;
    dealCount: number;
    currentQuarterRevenue: number;
  };
}


type Horizon = 3 | 6 | 12;
type ChartMode = "weighted" | "unweighted" | "both";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString()}`;
}

const chartConfig: ChartConfig = {
  weighted: {
    label: "Weighted Pipeline",
    color: "hsl(var(--primary))",
  },
  unweighted: {
    label: "Unweighted Pipeline",
    color: "hsl(var(--muted-foreground))",
  },
};

const BREAKDOWN_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.40)",
  "hsl(var(--primary) / 0.28)",
  "hsl(var(--muted-foreground) / 0.60)",
  "hsl(var(--muted-foreground) / 0.45)",
  "hsl(var(--muted-foreground) / 0.30)",
  "hsl(var(--muted-foreground) / 0.20)",
  "hsl(var(--muted-foreground) / 0.15)",
  "hsl(var(--muted-foreground) / 0.10)",
  "hsl(var(--muted-foreground) / 0.08)",
  "hsl(var(--muted-foreground) / 0.06)",
  "hsl(var(--muted-foreground) / 0.05)",
  "hsl(var(--muted-foreground) / 0.04)",
  "hsl(var(--muted-foreground) / 0.03)",
];

const densityColors = [
  "hsl(var(--muted))",
  "hsl(var(--primary) / 0.25)",
  "hsl(var(--primary) / 0.45)",
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.85)",
  "hsl(var(--primary))",
];

function getDensityColor(count: number, max: number): string {
  if (count === 0) return densityColors[0];
  const idx = Math.min(Math.ceil((count / max) * 4), 5);
  return densityColors[idx];
}

export default function DealForecast() {
  const [horizon, setHorizon] = useState<Horizon>(6);
  const [chartMode, setChartMode] = useState<ChartMode>("both");
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined);
  const [demoMode, setDemoMode] = useState(true);
  const { statuses: allDealStatuses } = useDealStatuses();

  const stageProbabilities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allDealStatuses) {
      if (s.winProbability > 0 && s.winProbability < 100) {
        map[s.name] = s.winProbability / 100;
      }
    }
    return map;
  }, [allDealStatuses]);

  usePageHeader({
    breadcrumbs: [
      { label: "Deals", href: "/deals" },
      { label: "Forecast" },
    ],
  });

  const asOfParam = asOfDate ? format(asOfDate, "yyyy-MM-dd") : undefined;

  const { data: liveData, isLoading, error } = useQuery<ForecastData>({
    queryKey: ['/api/deals/forecast', horizon, asOfParam],
    queryFn: async () => {
      const params = new URLSearchParams({ horizon: String(horizon) });
      if (asOfParam) params.set("asOfDate", asOfParam);
      const res = await fetch(`/api/deals/forecast?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      return res.json();
    },
    enabled: !demoMode,
  });

  const data = demoMode ? MOCK_FORECAST_DATA : liveData;

  const maxDensity = useMemo(
    () => Math.max(...(data?.eventDensity ?? []).map((d) => d.eventCount), 1),
    [data?.eventDensity],
  );

  const maxDays = useMemo(
    () => Math.max(...(data?.eventDensity ?? []).map((d) => d.totalDays), 1),
    [data?.eventDensity],
  );

  if (error && !demoMode) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-forecast-title">
              Revenue Forecast
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pipeline projections and workload overview
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDemoMode(true)}
            data-testid="button-toggle-demo"
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            View Demo Data
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive font-medium" data-testid="text-forecast-error">
              Failed to load forecast data
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error.message.includes("403")
                ? "You do not have permission to view forecast data."
                : "Please try again later."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((isLoading || !data) && !demoMode) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-forecast-title">
              Revenue Forecast
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pipeline projections and workload overview
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" data-testid="controls-horizon">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDemoMode(true)}
              data-testid="button-toggle-demo"
            >
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              View Demo Data
            </Button>
            <div className="flex items-center gap-1">
              <DatePicker
                date={asOfDate}
                onSelect={setAsOfDate}
                placeholder="As of today"
                data-testid="datepicker-as-of-date"
              />
              {asOfDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAsOfDate(undefined)}
                  data-testid="button-clear-as-of-date"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {([3, 6, 12] as Horizon[]).map((h) => (
              <Button
                key={h}
                variant={horizon === h ? "default" : "outline"}
                size="sm"
                onClick={() => setHorizon(h)}
                data-testid={`button-horizon-${h}`}
              >
                {h}mo
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {demoMode && (
        <div className="flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-50 dark:bg-violet-950/20 px-3 py-2 text-xs text-violet-800 dark:text-violet-300" data-testid="banner-demo-mode">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          Viewing demo data — these numbers are for demonstration purposes only
        </div>
      )}
      {asOfDate && !demoMode && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300" data-testid="banner-simulated-date">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Simulated report date: {format(asOfDate, "MMMM d, yyyy")}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-forecast-title">
            Revenue Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline projections and workload overview
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-testid="controls-horizon">
          <Button
            variant={demoMode ? "default" : "outline"}
            size="sm"
            onClick={() => setDemoMode((v) => !v)}
            data-testid="button-toggle-demo"
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            {demoMode ? "Demo Data" : "Live Data"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative" data-testid="filter-group-forecast">
                <div className={`flex items-center gap-2 flex-wrap ${demoMode ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-1">
                    <DatePicker
                      date={asOfDate}
                      onSelect={demoMode ? undefined : setAsOfDate}
                      placeholder="As of today"
                      data-testid="datepicker-as-of-date"
                    />
                    {asOfDate && !demoMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAsOfDate(undefined)}
                        data-testid="button-clear-as-of-date"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {([3, 6, 12] as Horizon[]).map((h) => (
                    <Button
                      key={h}
                      variant={horizon === h ? "default" : "outline"}
                      size="sm"
                      onClick={demoMode ? undefined : () => setHorizon(h)}
                      disabled={demoMode}
                      data-testid={`button-horizon-${h}`}
                    >
                      {h}mo
                    </Button>
                  ))}
                </div>
              </div>
            </TooltipTrigger>
            {demoMode && (
              <TooltipContent side="bottom" className="text-xs">
                Filters are disabled while viewing demo data
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-weighted-pipeline">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              Weighted Pipeline
              <SectionTooltip text="Sum of the probability-adjusted value of every deal in the forecast. Each deal's weighted value is calculated as: (budget low + budget high) / 2 multiplied by the stage win probability (e.g. Prospecting = 10%, Proposal = 25%, Contracting = 60%, In Progress = 80%, Final Invoicing = 95%). Includes all deals with an earliest event date within the selected horizon from the current or simulated as-of date, regardless of deal status. Deals in stages without a defined probability contribute zero weighted value." />
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-weighted-value">
              {formatCurrency(data.summary.totalWeighted)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Probability-adjusted value
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-unweighted-pipeline">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              Unweighted Pipeline
              <SectionTooltip text="Sum of the full estimated value of every deal in the forecast without applying any probability weighting. Each deal's value is the average of its low and high budget estimates ((low + high) / 2). This represents the best-case total revenue if every deal closes. Includes all deals with an earliest event date within the selected horizon from the current or simulated as-of date, regardless of deal status." />
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unweighted-value">
              {formatCurrency(data.summary.totalUnweighted)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best-case total value
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-deal-count">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              Deals in Forecast
              <SectionTooltip text="Total number of deals included in the current forecast. A deal is included when its earliest event date falls within the selected forecast horizon (3, 6, or 12 months from the current or simulated as-of date). The earliest event date is a single stored date on each deal, not every scheduled event. All matching deals are counted regardless of their current pipeline stage or status." />
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-deal-count">
              {data.summary.dealCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active pipeline deals
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-quarter-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              Current Quarter
              <SectionTooltip text="Weighted pipeline value for deals with event dates in the current calendar quarter only. Calculated by summing each qualifying deal's average budget multiplied by its stage win probability. Includes all deals in the forecast whose event month and year fall in the current quarter, regardless of status." />
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quarter-revenue">
              {formatCurrency(data.summary.currentQuarterRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected {`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-revenue-chart">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center">
            Revenue Projection by Month
            <SectionTooltip text="Bar chart showing projected revenue for each month in the forecast horizon. Deals are assigned to months based on their earliest event date. 'Weighted' bars show each deal's average budget multiplied by its stage win probability. 'Unweighted' bars show the full average budget without probability adjustment. All deals in the horizon are included regardless of status. You can toggle between viewing weighted only, unweighted only, or both side by side." />
          </CardTitle>
          <div className="flex items-center gap-2">
            {(["both", "weighted", "unweighted"] as ChartMode[]).map((mode) => (
              <Button
                key={mode}
                variant={chartMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setChartMode(mode)}
                data-testid={`button-chart-${mode}`}
              >
                {mode === "both"
                  ? "Both"
                  : mode === "weighted"
                    ? "Weighted"
                    : "Unweighted"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={data.monthlyRevenue} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const label = String(name).toLowerCase().includes("weight")
                        ? (String(name).toLowerCase().startsWith("un") ? "Unweighted" : "Weighted")
                        : String(name);
                      return (
                        <span>
                          {label}: {formatCurrencyFull(value as number)}
                        </span>
                      );
                    }}
                  />
                }
              />
              <Legend />
              {(chartMode === "both" || chartMode === "weighted") && (
                <Bar
                  dataKey="weighted"
                  name="Weighted"
                  fill="var(--color-weighted)"
                  radius={[4, 4, 0, 0]}
                />
              )}
              {(chartMode === "both" || chartMode === "unweighted") && (
                <Bar
                  dataKey="unweighted"
                  name="Unweighted"
                  fill="var(--color-unweighted)"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.5}
                />
              )}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card data-testid="card-workload-timeline">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center">
            Workload Density
            <SectionTooltip text="Visualizes how busy each month will be based on total production days. Deals are grouped by the month of their earliest event date. Each deal contributes its combined event schedule duration (in days); deals with no schedule or zero total duration default to 1 day. Bar height and color intensity reflect total production days per month relative to the busiest month. The count below each bar shows how many deals fall in that month. Use this to spot capacity bottlenecks." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end" style={{ height: 200 }}>
            {data.monthlyRevenue.map((month) => {
              const density = data.eventDensity.find(
                (d) => d.monthLabel === month.monthLabel,
              );
              const count = density?.eventCount ?? 0;
              const days = density?.totalDays ?? 0;
              const barHeightPct = days > 0 ? Math.max((days / maxDays) * 100, 15) : 0;
              return (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center"
                  data-testid={`cell-density-${month.month}`}
                  style={{ height: "100%" }}
                >
                  <div className="flex-1 w-full flex items-end">
                    {days > 0 ? (
                      <div
                        className="w-full rounded-md flex items-center justify-center text-xs font-semibold transition-all"
                        style={{
                          height: `${barHeightPct}%`,
                          backgroundColor: getDensityColor(days, maxDays),
                          color:
                            days > maxDays * 0.4
                              ? "hsl(var(--primary-foreground))"
                              : "hsl(var(--foreground))",
                        }}
                      >
                        {days}d
                      </div>
                    ) : (
                      <div
                        className="w-full h-1 rounded-full"
                        style={{ backgroundColor: densityColors[0] }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground mt-1">
                    {month.monthLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "event" : "events"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Bar height and color intensity reflect total production days per month.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
              <span>Less</span>
              {densityColors.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="card-revenue-by-service">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              Revenue by Service Type
              <SectionTooltip text="Breaks down weighted pipeline revenue by the services associated with each deal. If a deal has multiple services, its weighted value is divided equally among them. Deals with no services assigned are excluded from this breakdown. Each service shows the number of deals it appears in and the total weighted value attributed to it. Sorted by weighted value (highest first)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenueByService.map((item, idx) => {
                const maxWeighted = data.revenueByService[0]?.weighted || 1;
                return (
                  <div
                    key={item.name}
                    className="space-y-1"
                    data-testid={`row-service-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {item.dealCount} {item.dealCount === 1 ? "deal" : "deals"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                        {formatCurrency(item.weighted)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.weighted / maxWeighted) * 100}%`,
                          backgroundColor: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-by-industry">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              Revenue by Client Industry
              <SectionTooltip text="Breaks down weighted pipeline revenue by the industry of each deal's client. Each deal's full weighted value (average budget times stage probability) is assigned to its client's industry. Shows the number of deals and total weighted value for each industry, sorted by weighted value (highest first). Clients without an industry are grouped under 'Other'." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenueByIndustry.map((item, idx) => {
                const maxWeighted = data.revenueByIndustry[0]?.weighted || 1;
                return (
                  <div
                    key={item.name}
                    className="space-y-1"
                    data-testid={`row-industry-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {item.dealCount} {item.dealCount === 1 ? "deal" : "deals"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                        {formatCurrency(item.weighted)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.weighted / maxWeighted) * 100}%`,
                          backgroundColor: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-by-location">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              Revenue by Location
              <SectionTooltip text="Breaks down weighted pipeline revenue by event location. If a deal has multiple locations, its weighted value is divided equally among them. Deals with no locations assigned are excluded from this breakdown. Shows the number of deals and total weighted value for each location, sorted by weighted value (highest first). Only the top 10 locations are displayed." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenueByLocation.map((item, idx) => {
                const maxWeighted = data.revenueByLocation[0]?.weighted || 1;
                return (
                  <div
                    key={item.name}
                    className="space-y-1"
                    data-testid={`row-location-${item.name.toLowerCase().replace(/[\s,]+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {item.dealCount} {item.dealCount === 1 ? "deal" : "deals"}
                      </span>
                      <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                        {formatCurrency(item.weighted)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(item.weighted / maxWeighted) * 100}%`,
                          backgroundColor: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-stage-probabilities">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              Stage Win Probabilities
              <SectionTooltip text="Shows the probability assigned to each active pipeline stage, used to weight deal values throughout this forecast. These percentages represent the likelihood that a deal at that stage will ultimately close and generate revenue." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stageProbabilities).map(([stage, prob]) => (
                <div
                  key={stage}
                  className="flex items-center justify-between gap-4"
                  data-testid={`row-stage-${stage.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="text-sm font-medium">{stage}</span>
                  <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground tabular-nums w-10 text-right">
                      {Math.round(prob * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-quarterly-rollup">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center">
              Quarterly Rollup
              <SectionTooltip text="Aggregates the monthly revenue projections into calendar quarters (Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec). Shows the total weighted pipeline value, total unweighted value, and number of deals for each quarter within the forecast horizon. Values are summed from the individual monthly projections." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Weighted</TableHead>
                  <TableHead className="text-right">Unweighted</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.quarterlyRollups.map((q) => (
                  <TableRow key={q.quarter} data-testid={`row-quarter-${q.quarter.replace(/\s+/g, "-")}`}>
                    <TableCell className="font-medium">{q.quarter}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(q.weighted)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(q.unweighted)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {q.dealCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-upcoming-events">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center">
            Upcoming Events
            <SectionTooltip text="Lists all deals in the forecast sorted by earliest event date (soonest first). Shows the deal name, client, date, location(s), current pipeline stage, and estimated budget (average of low and high budget). Includes all deals with an earliest event date in the horizon regardless of status. This gives a chronological view of upcoming work within the selected forecast horizon." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="hidden sm:table-cell">Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Stage</TableHead>
                <TableHead className="text-right">Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.deals
                .sort(
                  (a, b) =>
                    new Date(a.eventDate).getTime() -
                    new Date(b.eventDate).getTime(),
                )
                .map((deal) => (
                  <TableRow key={deal.id} data-testid={`row-event-${deal.id}`}>
                    <TableCell>
                      <div className="font-medium text-sm">{deal.name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {deal.clientName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {deal.clientName}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground hidden lg:block" />
                        {new Date(deal.eventDate + "T00:00:00").toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {deal.locations.map((l) => l.displayName).join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                      {formatCurrency((deal.budgetLow + deal.budgetHigh) / 2)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
