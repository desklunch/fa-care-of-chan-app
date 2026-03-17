import { useState, useMemo } from "react";
import { usePageHeader } from "@/framework/hooks/page-header-context";
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
import {
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  MapPin,
  Clock,
} from "lucide-react";
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
import { getForecastData, stageProbabilities } from "@/lib/mock-forecast-data";

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

  usePageHeader({
    breadcrumbs: [
      { label: "Deals", href: "/deals" },
      { label: "Forecast" },
    ],
  });

  const data = useMemo(() => getForecastData(horizon), [horizon]);

  const maxDensity = useMemo(
    () => Math.max(...data.eventDensity.map((d) => d.eventCount), 1),
    [data.eventDensity],
  );

  const maxDays = useMemo(
    () => Math.max(...data.eventDensity.map((d) => d.totalDays), 1),
    [data.eventDensity],
  );

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
        <div className="flex items-center gap-2" data-testid="controls-horizon">
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
        <Card data-testid="card-weighted-pipeline">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weighted Pipeline
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unweighted Pipeline
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deals in Forecast
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Quarter
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
          <CardTitle className="text-base font-semibold">
            Revenue Projection by Month
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
          <CardTitle className="text-base font-semibold">
            Workload Density
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
            <CardTitle className="text-base font-semibold">
              Revenue by Service Type
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
            <CardTitle className="text-base font-semibold">
              Revenue by Client Industry
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
            <CardTitle className="text-base font-semibold">
              Revenue by Location
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
            <CardTitle className="text-base font-semibold">
              Stage Win Probabilities
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
            <CardTitle className="text-base font-semibold">
              Quarterly Rollup
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
          <CardTitle className="text-base font-semibold">
            Upcoming Events
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
