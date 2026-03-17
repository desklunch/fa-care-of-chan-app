import { useState } from "react";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Ticket,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from "lucide-react";
import {
  getPipelineSnapshot,
  DATE_RANGE_OPTIONS,
  type DateRangeFilter,
  type PipelineSnapshot,
  type HistoricalComparison,
} from "@/lib/pipeline-mock-data";

const STAGE_COLORS: Record<string, string> = {
  Prospecting: "var(--status-prospecting)",
  Proposal: "var(--status-proposal)",
  Feedback: "var(--status-feedback)",
  Contracting: "var(--status-contracting)",
  "In Progress": "var(--status-in-progress)",
  "Final Invoicing": "var(--status-invoicing)",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatFullCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function formatChange(current: number, previous: number): { value: string; direction: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) return { value: "0%", direction: "flat" };
  if (previous === 0) return { value: "New", direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { value: "0%", direction: "flat" };
  const sign = pct > 0 ? "+" : "";
  return { value: `${sign}${pct}%`, direction: pct > 0 ? "up" : "down" };
}

function getColorClass(direction: "up" | "down" | "flat", invert?: boolean) {
  if (direction === "flat") return "text-muted-foreground";
  const isPositive = invert ? direction === "down" : direction === "up";
  return isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

function DirectionIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <TrendingUp className="h-3 w-3" />;
  if (direction === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function ChangeIndicator({
  current,
  comparison,
  invertColor,
}: {
  current: number;
  comparison: HistoricalComparison | null;
  invertColor?: boolean;
}) {
  if (!comparison) return null;

  const period = formatChange(current, comparison.previousPeriod);
  const yoy = formatChange(current, comparison.previousYear);

  return (
    <div className="flex flex-col gap-0.5 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`flex items-center gap-1 text-xs font-medium tabular-nums ${getColorClass(period.direction, invertColor)}`}>
          <DirectionIcon direction={period.direction} />
          {period.value}
          <span className="text-muted-foreground font-normal">{comparison.previousPeriodLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`flex items-center gap-1 text-xs font-medium tabular-nums ${getColorClass(yoy.direction, invertColor)}`}>
          <DirectionIcon direction={yoy.direction} />
          {yoy.value}
          <span className="text-muted-foreground font-normal">{comparison.previousYearLabel}</span>
        </span>
      </div>
    </div>
  );
}

function KPICards({ kpis }: { kpis: PipelineSnapshot["kpis"] }) {
  const avgDealValue =
    kpis.totalActiveDeals > 0
      ? Math.round(kpis.totalPipelineValue / kpis.totalActiveDeals)
      : 0;

  const prevMonthAvgDealValue =
    kpis.history && kpis.history.totalActiveDeals.previousPeriod > 0
      ? Math.round(kpis.history.totalPipelineValue.previousPeriod / kpis.history.totalActiveDeals.previousPeriod)
      : 0;

  const prevYearAvgDealValue =
    kpis.history && kpis.history.totalActiveDeals.previousYear > 0
      ? Math.round(kpis.history.totalPipelineValue.previousYear / kpis.history.totalActiveDeals.previousYear)
      : 0;

  const cards = [
    {
      title: "Active Deals",
      value: kpis.totalActiveDeals.toString(),
      icon: Ticket,
      testId: "kpi-active-deals",
      current: kpis.totalActiveDeals,
      comparison: kpis.history?.totalActiveDeals ?? null,
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(kpis.totalPipelineValue),
      icon: DollarSign,
      testId: "kpi-pipeline-value",
      current: kpis.totalPipelineValue,
      comparison: kpis.history?.totalPipelineValue ?? null,
    },
    {
      title: "Avg Deal Value",
      value: formatCurrency(avgDealValue),
      icon: TrendingUp,
      testId: "kpi-avg-deal-size",
      current: avgDealValue,
      comparison: kpis.history ? {
        previousPeriod: prevMonthAvgDealValue,
        previousPeriodLabel: kpis.history.totalActiveDeals.previousPeriodLabel,
        previousYear: prevYearAvgDealValue,
        previousYearLabel: kpis.history.totalActiveDeals.previousYearLabel,
      } : null,
    },
    {
      title: "Avg Deal Age",
      value: `${kpis.averageDealAgeDays} days`,
      icon: Clock,
      testId: "kpi-avg-deal-age",
      current: kpis.averageDealAgeDays,
      comparison: kpis.history?.averageDealAgeDays ?? null,
      invertColor: true,
    },
    {
      title: "Stalled Deals",
      value: kpis.stalledDealsCount.toString(),
      subtitle: "No activity 30+ days",
      icon: AlertTriangle,
      testId: "kpi-stalled-deals",
      current: kpis.stalledDealsCount,
      comparison: kpis.history?.stalledDealsCount ?? null,
      invertColor: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.testId} data-testid={card.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`${card.testId}-value`}>
                {card.value}
              </div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              )}
              <ChangeIndicator
                current={card.current}
                comparison={card.comparison}
                invertColor={card.invertColor}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StageChangeTag({ current, previous, label }: { current: number; previous: number; label: string }) {
  const change = formatChange(current, previous);
  if (change.direction === "flat") return null;

  const colorClass =
    change.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <span className={`text-xs tabular-nums ${colorClass}`} title={`${label}: was ${previous}, now ${current}`}>
      {change.value} {label}
    </span>
  );
}

function StageFunnel({ stageData }: { stageData: PipelineSnapshot["stageData"] }) {
  const maxCount = Math.max(...stageData.map((s) => s.dealCount), 1);

  return (
    <Card data-testid="chart-stage-funnel">
      <CardHeader>
        <CardTitle className="text-base">Stage Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageData.map((stage) => {
            const widthPercent = Math.max((stage.dealCount / maxCount) * 100, 8);
            const color = STAGE_COLORS[stage.stage] || "hsl(var(--primary))";
            return (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm gap-2 flex-wrap">
                  <span className="font-medium">{stage.stage}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-muted-foreground">
                      {stage.dealCount} deals &middot; {formatCurrency(stage.totalValue)}
                    </span>
                    {stage.previousPeriodLabel && (
                      <StageChangeTag current={stage.dealCount} previous={stage.previousPeriodCount} label={stage.previousPeriodLabel} />
                    )}
                    {stage.previousYearLabel && (
                      <StageChangeTag current={stage.dealCount} previous={stage.previousYearCount} label={stage.previousYearLabel} />
                    )}
                  </div>
                </div>
                <div className="h-8 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-3"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: color,
                      minWidth: "2rem",
                    }}
                    data-testid={`funnel-bar-${stage.stage.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {stage.dealCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const agingChartConfig: ChartConfig = {
  count: {
    label: "Deals",
    color: "hsl(var(--primary))",
  },
};

function AgingChart({ agingData }: { agingData: PipelineSnapshot["agingData"] }) {
  return (
    <Card data-testid="chart-deal-aging">
      <CardHeader>
        <CardTitle className="text-base">Deal Aging</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={agingChartConfig} className="h-[130px] w-full aspect-auto">
          <BarChart data={agingData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="bucket"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ConversionRates({ rates }: { rates: PipelineSnapshot["conversionRates"] }) {
  return (
    <Card data-testid="chart-conversion-rates">
      <CardHeader>
        <CardTitle className="text-base">Stage Conversion Rates</CardTitle>
        <p className="text-sm text-muted-foreground">
          Historical percentage of deals that moved from one stage to the next
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rates.map((rate) => {
            const widthPercent = Math.max(rate.rate, 8);
            const color = STAGE_COLORS[rate.fromStage] || "hsl(var(--primary))";
            return (
              <div key={`${rate.fromStage}-${rate.toStage}`} className="space-y-1">
                <div className="flex items-center justify-between text-sm gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{rate.fromStage}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{rate.toStage}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">{rate.rate}%</span>
                </div>
                <div className="h-8 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-3"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: color,
                      minWidth: "2rem",
                    }}
                    data-testid={`conversion-bar-${rate.fromStage.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {rate.rate}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StalledDealsTable({ deals }: { deals: PipelineSnapshot["stalledDeals"] }) {
  const sorted = [...deals].sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  if (sorted.length === 0) {
    return (
      <Card data-testid="table-stalled-deals">
        <CardHeader>
          <CardTitle className="text-base">Stalled Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No stalled deals in this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="table-stalled-deals">
      <CardHeader>
        <CardTitle className="text-base">
          Stalled Deals
          <Badge variant="secondary" className="ml-2">
            {sorted.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stalled</TableHead>
                <TableHead>Deal</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="min-w-[120px]">Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((deal) => (
                <TableRow key={deal.id} data-testid={`stalled-deal-row-${deal.id}`}>
                  <TableCell>
                    <span
                      className="font-bold text-red-600 dark:text-red-400 tabular-nums"
                      data-testid={`stalled-duration-${deal.id}`}
                    >
                      {deal.daysSinceContact}d
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      since {new Date(deal.lastContactDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{deal.name}</TableCell>
                  <TableCell data-testid={`stalled-client-${deal.id}`}>{deal.client}</TableCell>
                  <TableCell className="text-muted-foreground">{deal.owner}</TableCell>
                  <TableCell>
                    <DealStatusBadge status={deal.stage} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatFullCurrency(deal.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelineHealth() {
  usePageTitle("Pipeline Health");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined);
  const snapshot = getPipelineSnapshot(dateRange);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-pipeline-health">
      {asOfDate && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300" data-testid="banner-simulated-date">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Simulated report date: {format(asOfDate, "MMMM d, yyyy")} (mock data — will use real data when pipeline is connected)
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your active sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRangeFilter)}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-range-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <KPICards kpis={snapshot.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageFunnel stageData={snapshot.stageData} />
        <ConversionRates rates={snapshot.conversionRates} />
      </div>

      <AgingChart agingData={snapshot.agingData} />

      <StalledDealsTable deals={snapshot.stalledDeals} />
    </div>
  );
}
