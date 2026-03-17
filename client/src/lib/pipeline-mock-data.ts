export interface HistoricalComparison {
  previousPeriod: number;
  previousPeriodLabel: string;
  previousYear: number;
  previousYearLabel: string;
}

export interface PipelineKPIs {
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

export interface StageData {
  stage: string;
  dealCount: number;
  totalValue: number;
  previousPeriodCount: number;
  previousPeriodLabel: string;
  previousYearCount: number;
  previousYearLabel: string;
}

export interface AgingBucket {
  bucket: string;
  count: number;
}

export interface ConversionRate {
  fromStage: string;
  toStage: string;
  rate: number;
}

export interface StalledDeal {
  id: string;
  name: string;
  client: string;
  owner: string;
  stage: string;
  lastContactDate: string;
  value: number;
  daysSinceContact: number;
}

export interface PipelineSnapshot {
  kpis: PipelineKPIs;
  stageData: StageData[];
  agingData: AgingBucket[];
  conversionRates: ConversionRate[];
  stalledDeals: StalledDeal[];
}

const ACTIVE_STAGES = [
  "Prospecting",
  "Proposal",
  "Feedback",
  "Contracting",
  "In Progress",
  "Final Invoicing",
];

const defaultSnapshot: PipelineSnapshot = {
  kpis: {
    totalActiveDeals: 42,
    totalPipelineValue: 3_875_000,
    averageDealAgeDays: 28,
    stalledDealsCount: 7,
    history: null,
  },
  stageData: [
    { stage: "Prospecting", dealCount: 14, totalValue: 680_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
    { stage: "Proposal", dealCount: 10, totalValue: 920_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
    { stage: "Feedback", dealCount: 7, totalValue: 785_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
    { stage: "Contracting", dealCount: 5, totalValue: 640_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
    { stage: "In Progress", dealCount: 4, totalValue: 550_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
    { stage: "Final Invoicing", dealCount: 2, totalValue: 300_000, previousPeriodCount: 0, previousPeriodLabel: "", previousYearCount: 0, previousYearLabel: "" },
  ],
  agingData: [
    { bucket: "< 1 week", count: 8 },
    { bucket: "1-2 weeks", count: 12 },
    { bucket: "2-4 weeks", count: 10 },
    { bucket: "1-2 months", count: 7 },
    { bucket: "2+ months", count: 5 },
  ],
  conversionRates: [
    { fromStage: "Prospecting", toStage: "Proposal", rate: 71 },
    { fromStage: "Proposal", toStage: "Feedback", rate: 70 },
    { fromStage: "Feedback", toStage: "Contracting", rate: 71 },
    { fromStage: "Contracting", toStage: "In Progress", rate: 80 },
    { fromStage: "In Progress", toStage: "Final Invoicing", rate: 50 },
  ],
  stalledDeals: [
    {
      id: "d-001",
      name: "Nike Product Launch Gala",
      client: "Nike",
      owner: "Susana Reyes",
      stage: "Proposal",
      lastContactDate: "2026-02-01",
      value: 185_000,
      daysSinceContact: 44,
    },
    {
      id: "d-002",
      name: "Google I/O After-Party",
      client: "Google",
      owner: "Marcus Chen",
      stage: "Feedback",
      lastContactDate: "2026-01-28",
      value: 240_000,
      daysSinceContact: 48,
    },
    {
      id: "d-003",
      name: "Salesforce Dreamforce VIP Dinner",
      client: "Salesforce",
      owner: "Susana Reyes",
      stage: "Prospecting",
      lastContactDate: "2026-02-10",
      value: 95_000,
      daysSinceContact: 35,
    },
    {
      id: "d-004",
      name: "Spotify Wrapped Celebration",
      client: "Spotify",
      owner: "Ava Thompson",
      stage: "Contracting",
      lastContactDate: "2026-01-20",
      value: 310_000,
      daysSinceContact: 56,
    },
    {
      id: "d-005",
      name: "Red Bull Summer Series Kickoff",
      client: "Red Bull",
      owner: "Marcus Chen",
      stage: "Proposal",
      lastContactDate: "2026-02-05",
      value: 125_000,
      daysSinceContact: 40,
    },
    {
      id: "d-006",
      name: "Hermès Private Client Event",
      client: "Hermès",
      owner: "Ava Thompson",
      stage: "Feedback",
      lastContactDate: "2026-02-12",
      value: 420_000,
      daysSinceContact: 33,
    },
    {
      id: "d-007",
      client: "Adobe",
      name: "Adobe MAX Opening Reception",
      owner: "Susana Reyes",
      stage: "Prospecting",
      lastContactDate: "2026-01-15",
      value: 78_000,
      daysSinceContact: 61,
    },
  ],
};

const snapshot30: PipelineSnapshot = {
  kpis: {
    totalActiveDeals: 18,
    totalPipelineValue: 1_520_000,
    averageDealAgeDays: 14,
    stalledDealsCount: 2,
    history: {
      totalActiveDeals: { previousPeriod: 15, previousPeriodLabel: "vs prior 30 days", previousYear: 12, previousYearLabel: "vs same 30 days last year" },
      totalPipelineValue: { previousPeriod: 1_280_000, previousPeriodLabel: "vs prior 30 days", previousYear: 980_000, previousYearLabel: "vs same 30 days last year" },
      averageDealAgeDays: { previousPeriod: 16, previousPeriodLabel: "vs prior 30 days", previousYear: 12, previousYearLabel: "vs same 30 days last year" },
      stalledDealsCount: { previousPeriod: 3, previousPeriodLabel: "vs prior 30 days", previousYear: 1, previousYearLabel: "vs same 30 days last year" },
    },
  },
  stageData: [
    { stage: "Prospecting", dealCount: 7, totalValue: 340_000, previousPeriodCount: 6, previousPeriodLabel: "prior 30d", previousYearCount: 5, previousYearLabel: "yr ago" },
    { stage: "Proposal", dealCount: 5, totalValue: 460_000, previousPeriodCount: 4, previousPeriodLabel: "prior 30d", previousYearCount: 3, previousYearLabel: "yr ago" },
    { stage: "Feedback", dealCount: 3, totalValue: 380_000, previousPeriodCount: 3, previousPeriodLabel: "prior 30d", previousYearCount: 2, previousYearLabel: "yr ago" },
    { stage: "Contracting", dealCount: 2, totalValue: 220_000, previousPeriodCount: 1, previousPeriodLabel: "prior 30d", previousYearCount: 1, previousYearLabel: "yr ago" },
    { stage: "In Progress", dealCount: 1, totalValue: 120_000, previousPeriodCount: 1, previousPeriodLabel: "prior 30d", previousYearCount: 1, previousYearLabel: "yr ago" },
    { stage: "Final Invoicing", dealCount: 0, totalValue: 0, previousPeriodCount: 0, previousPeriodLabel: "prior 30d", previousYearCount: 0, previousYearLabel: "yr ago" },
  ],
  agingData: [
    { bucket: "< 1 week", count: 6 },
    { bucket: "1-2 weeks", count: 7 },
    { bucket: "2-4 weeks", count: 5 },
    { bucket: "1-2 months", count: 0 },
    { bucket: "2+ months", count: 0 },
  ],
  conversionRates: [
    { fromStage: "Prospecting", toStage: "Proposal", rate: 71 },
    { fromStage: "Proposal", toStage: "Feedback", rate: 60 },
    { fromStage: "Feedback", toStage: "Contracting", rate: 67 },
    { fromStage: "Contracting", toStage: "In Progress", rate: 50 },
    { fromStage: "In Progress", toStage: "Final Invoicing", rate: 0 },
  ],
  stalledDeals: [
    defaultSnapshot.stalledDeals[2],
    defaultSnapshot.stalledDeals[4],
  ],
};

const snapshot60: PipelineSnapshot = {
  kpis: {
    totalActiveDeals: 30,
    totalPipelineValue: 2_680_000,
    averageDealAgeDays: 22,
    stalledDealsCount: 4,
    history: {
      totalActiveDeals: { previousPeriod: 26, previousPeriodLabel: "vs prior 60 days", previousYear: 22, previousYearLabel: "vs same 60 days last year" },
      totalPipelineValue: { previousPeriod: 2_310_000, previousPeriodLabel: "vs prior 60 days", previousYear: 1_850_000, previousYearLabel: "vs same 60 days last year" },
      averageDealAgeDays: { previousPeriod: 24, previousPeriodLabel: "vs prior 60 days", previousYear: 19, previousYearLabel: "vs same 60 days last year" },
      stalledDealsCount: { previousPeriod: 3, previousPeriodLabel: "vs prior 60 days", previousYear: 2, previousYearLabel: "vs same 60 days last year" },
    },
  },
  stageData: [
    { stage: "Prospecting", dealCount: 10, totalValue: 480_000, previousPeriodCount: 8, previousPeriodLabel: "prior 60d", previousYearCount: 7, previousYearLabel: "yr ago" },
    { stage: "Proposal", dealCount: 8, totalValue: 720_000, previousPeriodCount: 7, previousPeriodLabel: "prior 60d", previousYearCount: 6, previousYearLabel: "yr ago" },
    { stage: "Feedback", dealCount: 5, totalValue: 580_000, previousPeriodCount: 5, previousPeriodLabel: "prior 60d", previousYearCount: 4, previousYearLabel: "yr ago" },
    { stage: "Contracting", dealCount: 4, totalValue: 500_000, previousPeriodCount: 3, previousPeriodLabel: "prior 60d", previousYearCount: 3, previousYearLabel: "yr ago" },
    { stage: "In Progress", dealCount: 2, totalValue: 280_000, previousPeriodCount: 2, previousPeriodLabel: "prior 60d", previousYearCount: 1, previousYearLabel: "yr ago" },
    { stage: "Final Invoicing", dealCount: 1, totalValue: 120_000, previousPeriodCount: 1, previousPeriodLabel: "prior 60d", previousYearCount: 1, previousYearLabel: "yr ago" },
  ],
  agingData: [
    { bucket: "< 1 week", count: 7 },
    { bucket: "1-2 weeks", count: 10 },
    { bucket: "2-4 weeks", count: 8 },
    { bucket: "1-2 months", count: 5 },
    { bucket: "2+ months", count: 0 },
  ],
  conversionRates: [
    { fromStage: "Prospecting", toStage: "Proposal", rate: 80 },
    { fromStage: "Proposal", toStage: "Feedback", rate: 63 },
    { fromStage: "Feedback", toStage: "Contracting", rate: 80 },
    { fromStage: "Contracting", toStage: "In Progress", rate: 50 },
    { fromStage: "In Progress", toStage: "Final Invoicing", rate: 50 },
  ],
  stalledDeals: [
    defaultSnapshot.stalledDeals[0],
    defaultSnapshot.stalledDeals[1],
    defaultSnapshot.stalledDeals[4],
    defaultSnapshot.stalledDeals[5],
  ],
};

export type DateRangeFilter = "30" | "60" | "90" | "quarter" | "year" | "all";

export const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

function withComparisons(
  base: PipelineSnapshot,
  periodLabel: string,
  yearLabel: string,
  stagePeriodLabel: string,
  stageYearLabel: string,
  kpiHistory: {
    totalActiveDeals: { previousPeriod: number; previousYear: number };
    totalPipelineValue: { previousPeriod: number; previousYear: number };
    averageDealAgeDays: { previousPeriod: number; previousYear: number };
    stalledDealsCount: { previousPeriod: number; previousYear: number };
  },
  stagePrevious: { periodCount: number; yearCount: number }[],
): PipelineSnapshot {
  return {
    ...base,
    kpis: {
      ...base.kpis,
      history: {
        totalActiveDeals: { ...kpiHistory.totalActiveDeals, previousPeriodLabel: periodLabel, previousYearLabel: yearLabel },
        totalPipelineValue: { ...kpiHistory.totalPipelineValue, previousPeriodLabel: periodLabel, previousYearLabel: yearLabel },
        averageDealAgeDays: { ...kpiHistory.averageDealAgeDays, previousPeriodLabel: periodLabel, previousYearLabel: yearLabel },
        stalledDealsCount: { ...kpiHistory.stalledDealsCount, previousPeriodLabel: periodLabel, previousYearLabel: yearLabel },
      },
    },
    stageData: base.stageData.map((s, i) => ({
      ...s,
      previousPeriodCount: stagePrevious[i].periodCount,
      previousPeriodLabel: stagePeriodLabel,
      previousYearCount: stagePrevious[i].yearCount,
      previousYearLabel: stageYearLabel,
    })),
  };
}

const snapshot90 = withComparisons(
  defaultSnapshot,
  "vs prior 90 days",
  "vs same 90 days last year",
  "prior 90d",
  "yr ago",
  {
    totalActiveDeals: { previousPeriod: 36, previousYear: 29 },
    totalPipelineValue: { previousPeriod: 3_200_000, previousYear: 2_450_000 },
    averageDealAgeDays: { previousPeriod: 30, previousYear: 24 },
    stalledDealsCount: { previousPeriod: 6, previousYear: 3 },
  },
  [
    { periodCount: 12, yearCount: 8 },
    { periodCount: 11, yearCount: 7 },
    { periodCount: 6, yearCount: 5 },
    { periodCount: 4, yearCount: 3 },
    { periodCount: 2, yearCount: 4 },
    { periodCount: 1, yearCount: 2 },
  ],
);

const snapshotQuarter = withComparisons(
  defaultSnapshot,
  "vs last quarter",
  "vs same quarter last year",
  "last qtr",
  "yr ago",
  {
    totalActiveDeals: { previousPeriod: 35, previousYear: 30 },
    totalPipelineValue: { previousPeriod: 3_100_000, previousYear: 2_550_000 },
    averageDealAgeDays: { previousPeriod: 32, previousYear: 26 },
    stalledDealsCount: { previousPeriod: 8, previousYear: 5 },
  },
  [
    { periodCount: 11, yearCount: 9 },
    { periodCount: 9, yearCount: 7 },
    { periodCount: 6, yearCount: 5 },
    { periodCount: 5, yearCount: 4 },
    { periodCount: 3, yearCount: 3 },
    { periodCount: 1, yearCount: 2 },
  ],
);

const snapshotYear = withComparisons(
  defaultSnapshot,
  "vs last year",
  "vs 2 years ago",
  "last yr",
  "2yr ago",
  {
    totalActiveDeals: { previousPeriod: 31, previousYear: 24 },
    totalPipelineValue: { previousPeriod: 2_650_000, previousYear: 1_900_000 },
    averageDealAgeDays: { previousPeriod: 25, previousYear: 22 },
    stalledDealsCount: { previousPeriod: 4, previousYear: 3 },
  },
  [
    { periodCount: 9, yearCount: 7 },
    { periodCount: 8, yearCount: 6 },
    { periodCount: 5, yearCount: 4 },
    { periodCount: 4, yearCount: 3 },
    { periodCount: 3, yearCount: 2 },
    { periodCount: 2, yearCount: 2 },
  ],
);

export function getPipelineSnapshot(range: DateRangeFilter): PipelineSnapshot {
  switch (range) {
    case "30":
      return snapshot30;
    case "60":
      return snapshot60;
    case "90":
      return snapshot90;
    case "quarter":
      return snapshotQuarter;
    case "year":
      return snapshotYear;
    case "all":
    default:
      return defaultSnapshot;
  }
}
