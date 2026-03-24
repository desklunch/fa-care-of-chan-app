import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
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
  Loader2,
  HelpCircle,
  FlaskConical,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { MOCK_PIPELINE_SNAPSHOT } from "@/lib/mock-pipeline-forecast-data";

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

type DateRangeFilter = "30" | "60" | "90" | "quarter" | "year" | "all";

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

interface HistoricalComparison {
  previousPeriod: number;
  previousPeriodLabel: string;
  previousYear: number;
  previousYearLabel: string;
}

interface PipelineKPIs {
  totalActiveDeals: number;
  totalPipelineValue: number;
  averageDealAgeDays: number;
  stalledDealsCount: number;
  history: {
    totalActiveDeals: HistoricalComparison;
    totalPipelineValue: HistoricalComparison;
    averageDealAgeDays: HistoricalComparison;
    stalledDealsCount: HistoricalComparison;
  } | null;
}

interface StageData {
  stage: string;
  dealCount: number;
  totalValue: number;
  previousPeriodCount: number;
  previousPeriodLabel: string;
  previousYearCount: number;
  previousYearLabel: string;
}

interface AgingBucket {
  bucket: string;
  count: number;
}

interface ConversionRate {
  fromStage: string;
  toStage: string;
  rate: number;
}

interface StalledDeal {
  id: string;
  name: string;
  client: string;
  owner: string;
  stage: string;
  lastContactDate: string | null;
  value: number;
  daysSinceContact: number;
}

interface PipelineSnapshot {
  kpis: PipelineKPIs;
  stageData: StageData[];
  agingData: AgingBucket[];
  conversionRates: ConversionRate[];
  stalledDeals: StalledDeal[];
}

import { useDealStatuses } from "@/hooks/useDealStatuses";

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
      tooltip: "Total number of deals currently in an active pipeline stage (Prospecting, Proposal, Feedback, Contracting, In Progress, or Final Invoicing). When a date range is selected, only deals whose start date (or creation date if no start date exists) falls within that range are counted. Closed, lost, or archived deals are excluded.",
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(kpis.totalPipelineValue),
      icon: DollarSign,
      testId: "kpi-pipeline-value",
      current: kpis.totalPipelineValue,
      comparison: kpis.history?.totalPipelineValue ?? null,
      tooltip: "Sum of the estimated value of every active deal in the pipeline. Each deal's value is calculated as the average of its low and high budget estimates ((low + high) / 2). Only deals in active stages whose start date (or creation date fallback) falls within the selected date range are included.",
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
      tooltip: "Pipeline Value divided by the number of Active Deals. This gives the average estimated value per deal. If there are no active deals, this shows $0.",
    },
    {
      title: "Avg Deal Age",
      value: `${kpis.averageDealAgeDays} days`,
      icon: Clock,
      testId: "kpi-avg-deal-age",
      current: kpis.averageDealAgeDays,
      comparison: kpis.history?.averageDealAgeDays ?? null,
      invertColor: true,
      tooltip: "Average number of days each active deal has been in the pipeline, measured from the deal's start date (or creation date if no start date exists) to the current date (or simulated date if set). A higher number may indicate deals are progressing slowly. Lower is generally better (shown in green when decreasing).",
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
      tooltip: "Number of active deals with no recorded contact for 30 or more days. The system checks the last contact date; if none exists, it falls back to the deal's start date or creation date. A lower number is better (shown in green when decreasing). These deals may need follow-up attention.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.testId} data-testid={card.testId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                {card.title}
                <SectionTooltip text={card.tooltip} />
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
  const { statusMap } = useDealStatuses();

  return (
    <Card data-testid="chart-stage-funnel">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Stage Funnel
          <SectionTooltip text="Shows how many deals are in each active pipeline stage along with their combined value. Bar width is proportional to the deal count relative to the stage with the most deals. When a date range other than 'All time' is selected, percentage changes versus the prior period and the same period last year are shown for each stage's deal count." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stageData.map((stage) => {
            const widthPercent = Math.max((stage.dealCount / maxCount) * 100, 8);
            const color = statusMap.get(stage.stage)?.colorLight || "hsl(var(--primary))";
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
        <CardTitle className="text-base flex items-center">
          Deal Aging
          <SectionTooltip text="Displays a bar chart showing how long active deals have been in the pipeline, grouped into time buckets: less than 1 week, 1-2 weeks, 2-4 weeks, 1-2 months, and 2+ months. Age is calculated from each deal's start date (or creation date if unavailable) to the current date. This helps identify whether deals are moving through the pipeline at a healthy pace." />
        </CardTitle>
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
  const { statusMap } = useDealStatuses();
  return (
    <Card data-testid="chart-conversion-rates">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Stage Conversion Rates
          <SectionTooltip text="Shows the historical percentage of deals that advanced from one pipeline stage to the next sequential stage. The rate is calculated by dividing the number of sequential forward transitions (e.g. Prospecting to Proposal) by the total number of transitions out of that source stage recorded in audit history — including backward, skipped, and non-sequential moves. This means the denominator captures all stage departures, while the numerator only counts the next-stage advance. Uses all historical transition records, not just the current date range." />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Historical percentage of deals that moved from one stage to the next
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rates.map((rate) => {
            const widthPercent = Math.max(rate.rate, 8);
            const color = statusMap.get(rate.fromStage)?.colorLight || "hsl(var(--primary))";
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
          <CardTitle className="text-base flex items-center">
            Stalled Deals
            <SectionTooltip text="Lists all active deals where the last recorded contact was 30 or more days ago. If no contact date exists, the deal's start or creation date is used instead. Deals are sorted by the number of days since last contact (longest first). The table shows the stalled duration, deal name, client, owner, current stage, and estimated value. These are deals that may require immediate follow-up." />
          </CardTitle>
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
        <CardTitle className="text-base flex items-center">
          Stalled Deals
          <SectionTooltip text="Lists all active deals where the last recorded contact was 30 or more days ago. If no contact date exists, the deal's start or creation date is used instead. Deals are sorted by the number of days since last contact (longest first). The table shows the stalled duration, deal name, client, owner, current stage, and estimated value. These are deals that may require immediate follow-up." />
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
                      {deal.lastContactDate
                        ? `since ${new Date(deal.lastContactDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}`
                        : "no contact recorded"}
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
  const [demoMode, setDemoMode] = useState(false);

  const asOfDateStr = asOfDate ? format(asOfDate, "yyyy-MM-dd") : undefined;

  const { data: liveSnapshot, isLoading, error } = useQuery<PipelineSnapshot>({
    queryKey: ["/api/deals/pipeline-health", dateRange, asOfDateStr],
    queryFn: async () => {
      const params = new URLSearchParams({ range: dateRange });
      if (asOfDateStr) params.set("asOfDate", asOfDateStr);
      const res = await fetch(`/api/deals/pipeline-health?${params}`);
      if (!res.ok) throw new Error("Failed to load pipeline data");
      return res.json();
    },
    enabled: !demoMode,
  });

  const snapshot = demoMode ? MOCK_PIPELINE_SNAPSHOT : liveSnapshot;

  if (isLoading && !demoMode) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-pipeline-health-loading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pipeline Health</h1>
            <p className="text-sm text-muted-foreground mt-1">Loading pipeline data...</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if ((error || !snapshot) && !demoMode) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="page-pipeline-health-error">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Pipeline Health</h1>
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
        <Card className="mt-6">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load pipeline data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-pipeline-health">
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
          <h1 className="text-2xl font-bold">Pipeline Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your active sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
              <div className="relative" data-testid="filter-group-pipeline">
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
                  <Select
                    value={dateRange}
                    onValueChange={demoMode ? undefined : (v) => setDateRange(v as DateRangeFilter)}
                    disabled={demoMode}
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
            </TooltipTrigger>
            {demoMode && (
              <TooltipContent side="bottom" className="text-xs">
                Filters are disabled while viewing demo data
              </TooltipContent>
            )}
          </Tooltip>
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
