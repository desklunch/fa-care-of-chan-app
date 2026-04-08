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
  lastContactDate: string | null;
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

export const MOCK_PIPELINE_SNAPSHOT: PipelineSnapshot = {
  kpis: {
    totalActiveDeals: 47,
    totalPipelineValue: 2385000,
    averageDealAgeDays: 34,
    stalledDealsCount: 8,
    history: {
      totalActiveDeals: {
        previousPeriod: 42,
        previousPeriodLabel: "Last 30 days",
        previousYear: 38,
        previousYearLabel: "Last year",
      },
      totalPipelineValue: {
        previousPeriod: 2120000,
        previousPeriodLabel: "Last 30 days",
        previousYear: 1780000,
        previousYearLabel: "Last year",
      },
      averageDealAgeDays: {
        previousPeriod: 31,
        previousPeriodLabel: "Last 30 days",
        previousYear: 28,
        previousYearLabel: "Last year",
      },
      stalledDealsCount: {
        previousPeriod: 6,
        previousPeriodLabel: "Last 30 days",
        previousYear: 5,
        previousYearLabel: "Last year",
      },
    },
  },
  stageData: [
    { stage: "Prospecting", dealCount: 15, totalValue: 420000, previousPeriodCount: 12, previousPeriodLabel: "Last 30 days", previousYearCount: 10, previousYearLabel: "Last year" },
    { stage: "Initial Contact", dealCount: 10, totalValue: 380000, previousPeriodCount: 9, previousPeriodLabel: "Last 30 days", previousYearCount: 8, previousYearLabel: "Last year" },
    { stage: "Qualified Lead", dealCount: 9, totalValue: 560000, previousPeriodCount: 8, previousPeriodLabel: "Last 30 days", previousYearCount: 7, previousYearLabel: "Last year" },
    { stage: "Negotiation", dealCount: 7, totalValue: 625000, previousPeriodCount: 7, previousPeriodLabel: "Last 30 days", previousYearCount: 6, previousYearLabel: "Last year" },
    { stage: "Closed Won", dealCount: 4, totalValue: 280000, previousPeriodCount: 4, previousPeriodLabel: "Last 30 days", previousYearCount: 5, previousYearLabel: "Last year" },
    { stage: "Closed Lost", dealCount: 2, totalValue: 120000, previousPeriodCount: 2, previousPeriodLabel: "Last 30 days", previousYearCount: 2, previousYearLabel: "Last year" },
  ],
  agingData: [
    { bucket: "0–7 days", count: 12 },
    { bucket: "8–14 days", count: 9 },
    { bucket: "15–30 days", count: 11 },
    { bucket: "31–60 days", count: 8 },
    { bucket: "61–90 days", count: 4 },
    { bucket: "90+ days", count: 3 },
  ],
  conversionRates: [
    { fromStage: "Prospecting", toStage: "Initial Contact", rate: 62 },
    { fromStage: "Initial Contact", toStage: "Qualified Lead", rate: 74 },
    { fromStage: "Qualified Lead", toStage: "Negotiation", rate: 55 },
    { fromStage: "Negotiation", toStage: "Closed Won", rate: 82 },
    { fromStage: "Closed Won", toStage: "Closed Lost", rate: 91 },
  ],
  stalledDeals: [
    { id: "demo-1", name: "Greenfield Corp Annual Gala", client: "Greenfield Corp", owner: "Sarah Chen", stage: "Qualified Lead", lastContactDate: "2026-02-10", value: 85000, daysSinceContact: 41 },
    { id: "demo-2", name: "Meridian Tech Launch Event", client: "Meridian Technologies", owner: "James Wilson", stage: "Negotiation", lastContactDate: "2026-02-18", value: 120000, daysSinceContact: 33 },
    { id: "demo-3", name: "BlueStar Holiday Party", client: "BlueStar Media", owner: "Sarah Chen", stage: "Initial Contact", lastContactDate: "2026-01-28", value: 45000, daysSinceContact: 54 },
    { id: "demo-4", name: "Pinnacle Retreat Weekend", client: "Pinnacle Partners", owner: "Mike Torres", stage: "Qualified Lead", lastContactDate: "2026-02-05", value: 72000, daysSinceContact: 46 },
    { id: "demo-5", name: "Oakwood Foundation Fundraiser", client: "Oakwood Foundation", owner: "Lisa Park", stage: "Prospecting", lastContactDate: "2026-01-15", value: 95000, daysSinceContact: 67 },
    { id: "demo-6", name: "Vertex Pharma Conference", client: "Vertex Pharmaceuticals", owner: "James Wilson", stage: "Negotiation", lastContactDate: "2026-02-22", value: 150000, daysSinceContact: 29 },
    { id: "demo-7", name: "Horizon Realty Open House", client: "Horizon Realty", owner: "Mike Torres", stage: "Initial Contact", lastContactDate: "2026-02-01", value: 32000, daysSinceContact: 50 },
    { id: "demo-8", name: "CrestView Product Showcase", client: "CrestView Industries", owner: "Lisa Park", stage: "Qualified Lead", lastContactDate: "2026-02-14", value: 68000, daysSinceContact: 37 },
  ],
};

export interface ForecastLocation {
  displayName: string;
}

export interface ForecastDeal {
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
}

export interface BreakdownItem {
  name: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

export interface MonthlyRevenue {
  month: string;
  monthLabel: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

export interface QuarterlyRollup {
  quarter: string;
  weighted: number;
  unweighted: number;
  dealCount: number;
}

export interface EventDensity {
  month: string;
  monthLabel: string;
  eventCount: number;
  totalDays: number;
}

export interface ForecastData {
  deals: ForecastDeal[];
  monthlyRevenue: MonthlyRevenue[];
  quarterlyRollups: QuarterlyRollup[];
  eventDensity: EventDensity[];
  revenueByService: BreakdownItem[];
  revenueByLocation: BreakdownItem[];
  summary: {
    totalWeighted: number;
    totalUnweighted: number;
    dealCount: number;
    currentQuarterRevenue: number;
  };
}

export const MOCK_FORECAST_DATA: ForecastData = {
  summary: {
    totalWeighted: 1245000,
    totalUnweighted: 3680000,
    dealCount: 24,
    currentQuarterRevenue: 485000,
  },
  deals: [
    { id: "fd-1", name: "Greenfield Corp Annual Gala", clientName: "Greenfield Corp", status: "Qualified Lead", eventType: "Gala", budgetLow: 70000, budgetHigh: 100000, weightedValue: 21250, probability: 25, eventDate: "2026-05-14", locations: [{ displayName: "Grand Ballroom, Chicago" }], durationDays: 1, services: ["Catering", "Decor", "AV"] },
    { id: "fd-2", name: "Meridian Tech Launch", clientName: "Meridian Technologies", status: "Negotiation", eventType: "Product Launch", budgetLow: 100000, budgetHigh: 140000, weightedValue: 72000, probability: 60, eventDate: "2026-04-22", locations: [{ displayName: "Convention Center, San Francisco" }], durationDays: 2, services: ["AV", "Staging", "Catering"] },
    { id: "fd-3", name: "BlueStar Holiday Party", clientName: "BlueStar Media", status: "Prospecting", eventType: "Corporate Party", budgetLow: 30000, budgetHigh: 60000, weightedValue: 4500, probability: 10, eventDate: "2026-12-18", locations: [{ displayName: "Rooftop Venue, NYC" }], durationDays: 1, services: ["Catering", "Entertainment"] },
    { id: "fd-4", name: "Pinnacle Partners Retreat", clientName: "Pinnacle Partners", status: "Qualified Lead", eventType: "Corporate Retreat", budgetLow: 55000, budgetHigh: 90000, weightedValue: 18125, probability: 25, eventDate: "2026-06-10", locations: [{ displayName: "Mountain Lodge, Aspen" }], durationDays: 3, services: ["Lodging", "Activities", "Catering"] },
    { id: "fd-5", name: "Oakwood Fundraiser Gala", clientName: "Oakwood Foundation", status: "Prospecting", eventType: "Fundraiser", budgetLow: 80000, budgetHigh: 110000, weightedValue: 9500, probability: 10, eventDate: "2026-09-05", locations: [{ displayName: "Historic Estate, Boston" }], durationDays: 1, services: ["Catering", "Decor", "Entertainment"] },
    { id: "fd-6", name: "Vertex Pharma Summit", clientName: "Vertex Pharmaceuticals", status: "Negotiation", eventType: "Conference", budgetLow: 130000, budgetHigh: 170000, weightedValue: 90000, probability: 60, eventDate: "2026-05-02", locations: [{ displayName: "Medical Center, Houston" }], durationDays: 3, services: ["AV", "Staging", "Catering", "Registration"] },
    { id: "fd-7", name: "Horizon Open House Series", clientName: "Horizon Realty", status: "Initial Contact", eventType: "Open House", budgetLow: 20000, budgetHigh: 35000, weightedValue: 5500, probability: 20, eventDate: "2026-04-15", locations: [{ displayName: "Various, Miami" }], durationDays: 5, services: ["Staging", "Photography"] },
    { id: "fd-8", name: "CrestView Product Showcase", clientName: "CrestView Industries", status: "Qualified Lead", eventType: "Trade Show", budgetLow: 60000, budgetHigh: 80000, weightedValue: 17500, probability: 25, eventDate: "2026-07-20", locations: [{ displayName: "Expo Center, Dallas" }], durationDays: 2, services: ["Booth Design", "AV", "Staffing"] },
    { id: "fd-9", name: "Stellar Brands Fashion Show", clientName: "Stellar Brands", status: "Closed Won", eventType: "Fashion Show", budgetLow: 90000, budgetHigh: 120000, weightedValue: 84000, probability: 80, eventDate: "2026-04-08", locations: [{ displayName: "Fashion District, LA" }], durationDays: 1, services: ["Staging", "Lighting", "Photography"] },
    { id: "fd-10", name: "Apex Consulting Awards", clientName: "Apex Consulting", status: "Negotiation", eventType: "Awards Ceremony", budgetLow: 45000, budgetHigh: 65000, weightedValue: 33000, probability: 60, eventDate: "2026-06-28", locations: [{ displayName: "Downtown Hotel, Seattle" }], durationDays: 1, services: ["AV", "Catering", "Decor"] },
    { id: "fd-11", name: "NovaTech Hackathon", clientName: "NovaTech", status: "Closed Won", eventType: "Hackathon", budgetLow: 25000, budgetHigh: 40000, weightedValue: 26000, probability: 80, eventDate: "2026-05-30", locations: [{ displayName: "Innovation Hub, Austin" }], durationDays: 2, services: ["AV", "Catering", "Venue"] },
    { id: "fd-12", name: "Bayside Weddings Expo", clientName: "Bayside Events", status: "Qualified Lead", eventType: "Expo", budgetLow: 35000, budgetHigh: 50000, weightedValue: 10625, probability: 25, eventDate: "2026-08-12", locations: [{ displayName: "Convention Hall, San Diego" }], durationDays: 2, services: ["Booth Design", "Floral", "Photography"] },
    { id: "fd-13", name: "Redwood Bank Annual Dinner", clientName: "Redwood National Bank", status: "Closed Won", eventType: "Dinner", budgetLow: 55000, budgetHigh: 70000, weightedValue: 59375, probability: 95, eventDate: "2026-04-03", locations: [{ displayName: "Private Club, Charlotte" }], durationDays: 1, services: ["Catering", "Decor", "Entertainment"] },
    { id: "fd-14", name: "EcoGreen Summit", clientName: "EcoGreen Alliance", status: "Initial Contact", eventType: "Summit", budgetLow: 40000, budgetHigh: 60000, weightedValue: 10000, probability: 20, eventDate: "2026-07-15", locations: [{ displayName: "Green Campus, Portland" }], durationDays: 2, services: ["AV", "Catering", "Venue"] },
    { id: "fd-15", name: "Atlas Logistics Team Build", clientName: "Atlas Logistics", status: "Closed Won", eventType: "Team Building", budgetLow: 18000, budgetHigh: 28000, weightedValue: 18400, probability: 80, eventDate: "2026-05-18", locations: [{ displayName: "Adventure Park, Denver" }], durationDays: 1, services: ["Activities", "Catering"] },
    { id: "fd-16", name: "Luxe Hotels Brand Summit", clientName: "Luxe Hotels", status: "Qualified Lead", eventType: "Brand Summit", budgetLow: 75000, budgetHigh: 95000, weightedValue: 21250, probability: 25, eventDate: "2026-08-25", locations: [{ displayName: "Resort, Scottsdale" }], durationDays: 2, services: ["AV", "Staging", "Catering", "Decor"] },
    { id: "fd-17", name: "Pacific Health Symposium", clientName: "Pacific Health Systems", status: "Negotiation", eventType: "Symposium", budgetLow: 110000, budgetHigh: 145000, weightedValue: 76500, probability: 60, eventDate: "2026-06-05", locations: [{ displayName: "Medical Campus, San Jose" }], durationDays: 3, services: ["AV", "Registration", "Catering"] },
    { id: "fd-18", name: "Cityscape Architecture Awards", clientName: "Cityscape Design", status: "Prospecting", eventType: "Awards", budgetLow: 50000, budgetHigh: 70000, weightedValue: 6000, probability: 10, eventDate: "2026-10-14", locations: [{ displayName: "Gallery, Philadelphia" }], durationDays: 1, services: ["Staging", "Lighting", "Catering"] },
    { id: "fd-19", name: "Summit Schools Graduation", clientName: "Summit Schools Network", status: "Closed Won", eventType: "Graduation", budgetLow: 22000, budgetHigh: 32000, weightedValue: 21600, probability: 80, eventDate: "2026-05-22", locations: [{ displayName: "Campus Grounds, Minneapolis" }], durationDays: 1, services: ["AV", "Staging", "Catering"] },
    { id: "fd-20", name: "Ironclad Manufacturing Expo", clientName: "Ironclad Mfg", status: "Initial Contact", eventType: "Trade Show", budgetLow: 40000, budgetHigh: 55000, weightedValue: 9500, probability: 20, eventDate: "2026-09-22", locations: [{ displayName: "Industrial Center, Detroit" }], durationDays: 3, services: ["Booth Design", "AV", "Staffing"] },
    { id: "fd-21", name: "Brightline Marketing Summit", clientName: "Brightline Agency", status: "Closed Won", eventType: "Summit", budgetLow: 48000, budgetHigh: 62000, weightedValue: 52250, probability: 95, eventDate: "2026-04-10", locations: [{ displayName: "Boutique Hotel, Nashville" }], durationDays: 2, services: ["AV", "Catering", "Photography"] },
    { id: "fd-22", name: "Riverdale Community Festival", clientName: "Riverdale Community Assn", status: "Prospecting", eventType: "Festival", budgetLow: 15000, budgetHigh: 25000, weightedValue: 2000, probability: 10, eventDate: "2026-08-04", locations: [{ displayName: "Public Park, Atlanta" }], durationDays: 2, services: ["Entertainment", "Food Vendors", "Staging"] },
    { id: "fd-23", name: "Quantum Computing Conference", clientName: "Quantum Labs", status: "Negotiation", eventType: "Conference", budgetLow: 95000, budgetHigh: 125000, weightedValue: 66000, probability: 60, eventDate: "2026-07-08", locations: [{ displayName: "Tech Campus, Palo Alto" }], durationDays: 3, services: ["AV", "Registration", "Catering", "Venue"] },
    { id: "fd-24", name: "Heritage Museum Benefit", clientName: "Heritage Museum", status: "Qualified Lead", eventType: "Benefit", budgetLow: 65000, budgetHigh: 85000, weightedValue: 18750, probability: 25, eventDate: "2026-11-02", locations: [{ displayName: "Museum Hall, Washington DC" }], durationDays: 1, services: ["Catering", "Decor", "Entertainment", "Lighting"] },
  ],
  monthlyRevenue: [
    { month: "2026-04", monthLabel: "Apr 2026", weighted: 298375, unweighted: 645000, dealCount: 5 },
    { month: "2026-05", monthLabel: "May 2026", weighted: 249750, unweighted: 585000, dealCount: 6 },
    { month: "2026-06", monthLabel: "Jun 2026", weighted: 127625, unweighted: 370000, dealCount: 3 },
    { month: "2026-07", monthLabel: "Jul 2026", weighted: 93500, unweighted: 280000, dealCount: 3 },
    { month: "2026-08", monthLabel: "Aug 2026", weighted: 33875, unweighted: 180000, dealCount: 3 },
    { month: "2026-09", monthLabel: "Sep 2026", weighted: 19000, unweighted: 190000, dealCount: 2 },
    { month: "2026-10", monthLabel: "Oct 2026", weighted: 6000, unweighted: 60000, dealCount: 1 },
    { month: "2026-11", monthLabel: "Nov 2026", weighted: 18750, unweighted: 75000, dealCount: 1 },
    { month: "2026-12", monthLabel: "Dec 2026", weighted: 4500, unweighted: 45000, dealCount: 1 },
  ],
  quarterlyRollups: [
    { quarter: "Q2 2026", weighted: 675750, unweighted: 1600000, dealCount: 14 },
    { quarter: "Q3 2026", weighted: 146375, unweighted: 650000, dealCount: 8 },
    { quarter: "Q4 2026", weighted: 29250, unweighted: 180000, dealCount: 3 },
  ],
  eventDensity: [
    { month: "2026-04", monthLabel: "Apr 2026", eventCount: 5, totalDays: 7 },
    { month: "2026-05", monthLabel: "May 2026", eventCount: 6, totalDays: 10 },
    { month: "2026-06", monthLabel: "Jun 2026", eventCount: 3, totalDays: 7 },
    { month: "2026-07", monthLabel: "Jul 2026", eventCount: 3, totalDays: 8 },
    { month: "2026-08", monthLabel: "Aug 2026", eventCount: 3, totalDays: 6 },
    { month: "2026-09", monthLabel: "Sep 2026", eventCount: 2, totalDays: 4 },
    { month: "2026-10", monthLabel: "Oct 2026", eventCount: 1, totalDays: 1 },
    { month: "2026-11", monthLabel: "Nov 2026", eventCount: 1, totalDays: 1 },
    { month: "2026-12", monthLabel: "Dec 2026", eventCount: 1, totalDays: 1 },
  ],
  revenueByService: [
    { name: "AV", weighted: 420000, unweighted: 1250000, dealCount: 14 },
    { name: "Catering", weighted: 380000, unweighted: 1100000, dealCount: 18 },
    { name: "Staging", weighted: 195000, unweighted: 580000, dealCount: 8 },
    { name: "Decor", weighted: 145000, unweighted: 420000, dealCount: 6 },
    { name: "Entertainment", weighted: 72000, unweighted: 230000, dealCount: 4 },
    { name: "Photography", weighted: 55000, unweighted: 170000, dealCount: 4 },
    { name: "Registration", weighted: 48000, unweighted: 140000, dealCount: 3 },
    { name: "Booth Design", weighted: 37000, unweighted: 120000, dealCount: 3 },
  ],
  revenueByLocation: [
    { name: "San Francisco", weighted: 72000, unweighted: 120000, dealCount: 1 },
    { name: "Chicago", weighted: 21250, unweighted: 85000, dealCount: 1 },
    { name: "Houston", weighted: 90000, unweighted: 150000, dealCount: 1 },
    { name: "Austin", weighted: 26000, unweighted: 32500, dealCount: 1 },
    { name: "Los Angeles", weighted: 84000, unweighted: 105000, dealCount: 1 },
    { name: "Seattle", weighted: 33000, unweighted: 55000, dealCount: 1 },
    { name: "Dallas", weighted: 17500, unweighted: 70000, dealCount: 1 },
    { name: "Miami", weighted: 5500, unweighted: 27500, dealCount: 1 },
    { name: "Denver", weighted: 18400, unweighted: 23000, dealCount: 1 },
    { name: "Other Locations", weighted: 877350, unweighted: 3012000, dealCount: 15 },
  ],
};
