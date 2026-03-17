export interface MockLocation {
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
  locations: MockLocation[];
  durationDays: number;
  services: string[];
  industry: string;
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

export const stageProbabilities: Record<string, number> = {
  "Prospecting": 0.10,
  "Warm Lead": 0.15,
  "Proposal": 0.25,
  "Feedback": 0.40,
  "Contracting": 0.60,
  "In Progress": 0.80,
  "Final Invoicing": 0.95,
};

const mockDeals: ForecastDeal[] = [
  { id: "d1", name: "Nike Global Summit 2026", clientName: "Nike", status: "Contracting", eventType: "Corporate Summit", budgetLow: 450000, budgetHigh: 550000, weightedValue: 300000, probability: 0.60, eventDate: "2026-04-15", locations: [{ displayName: "Austin, TX" }], durationDays: 3, services: ["Executive Production", "Event Concepting", "Creative Direction"], industry: "Retail & Fashion" },
  { id: "d2", name: "Spotify Wrapped Party", clientName: "Spotify", status: "In Progress", eventType: "Brand Activation", budgetLow: 320000, budgetHigh: 380000, weightedValue: 280000, probability: 0.80, eventDate: "2026-04-22", locations: [{ displayName: "Los Angeles, CA" }], durationDays: 2, services: ["Production", "Talent Programming", "Content Creation"], industry: "Technology" },
  { id: "d3", name: "Google I/O After Party", clientName: "Google", status: "Proposal", eventType: "Product Launch", budgetLow: 600000, budgetHigh: 750000, weightedValue: 168750, probability: 0.25, eventDate: "2026-05-10", locations: [{ displayName: "Mountain View, CA" }, { displayName: "San Francisco, CA" }], durationDays: 1, services: ["Executive Production", "Culinary Programming", "Production"], industry: "Technology" },
  { id: "d4", name: "Meta Connect Experience", clientName: "Meta", status: "Feedback", eventType: "Tech Conference", budgetLow: 500000, budgetHigh: 650000, weightedValue: 230000, probability: 0.40, eventDate: "2026-05-18", locations: [{ displayName: "San Jose, CA" }], durationDays: 2, services: ["Event Concepting", "Production", "Content Creation"], industry: "Technology" },
  { id: "d5", name: "Patagonia Earth Day Gala", clientName: "Patagonia", status: "Final Invoicing", eventType: "Gala Dinner", budgetLow: 200000, budgetHigh: 250000, weightedValue: 213750, probability: 0.95, eventDate: "2026-04-22", locations: [{ displayName: "Ventura, CA" }], durationDays: 1, services: ["Culinary Production", "Culinary Programming", "RSVP Management"], industry: "Retail & Fashion" },
  { id: "d6", name: "Tesla Cybertruck Reveal Tour", clientName: "Tesla", status: "Prospecting", eventType: "Product Launch", budgetLow: 800000, budgetHigh: 1000000, weightedValue: 90000, probability: 0.10, eventDate: "2026-06-05", locations: [{ displayName: "Austin, TX" }, { displayName: "Los Angeles, CA" }, { displayName: "New York, NY" }], durationDays: 4, services: ["Executive Production", "Creative Direction", "Marketing", "Production"], industry: "Automotive" },
  { id: "d7", name: "Airbnb Host Summit", clientName: "Airbnb", status: "Contracting", eventType: "Conference", budgetLow: 350000, budgetHigh: 420000, weightedValue: 231000, probability: 0.60, eventDate: "2026-06-12", locations: [{ displayName: "San Francisco, CA" }], durationDays: 2, services: ["Executive Production", "Event Concepting", "RSVP Management"], industry: "Technology" },
  { id: "d8", name: "Samsung Galaxy Unpacked", clientName: "Samsung", status: "Proposal", eventType: "Product Launch", budgetLow: 700000, budgetHigh: 850000, weightedValue: 193750, probability: 0.25, eventDate: "2026-06-20", locations: [{ displayName: "New York, NY" }], durationDays: 1, services: ["Production", "Creative Direction", "Content Creation"], industry: "Technology" },
  { id: "d9", name: "Whole Foods Market Festival", clientName: "Whole Foods", status: "In Progress", eventType: "Culinary Event", budgetLow: 180000, budgetHigh: 220000, weightedValue: 160000, probability: 0.80, eventDate: "2026-07-08", locations: [{ displayName: "Austin, TX" }], durationDays: 3, services: ["Culinary Production", "Culinary Programming", "Programming"], industry: "Food & Beverage" },
  { id: "d10", name: "Apple WWDC Side Event", clientName: "Apple", status: "Warm Lead", eventType: "Networking Event", budgetLow: 400000, budgetHigh: 500000, weightedValue: 67500, probability: 0.15, eventDate: "2026-07-15", locations: [{ displayName: "Cupertino, CA" }], durationDays: 1, services: ["Executive Production", "Talent Programming"], industry: "Technology" },
  { id: "d11", name: "Amazon Prime Day Celebration", clientName: "Amazon", status: "Feedback", eventType: "Brand Activation", budgetLow: 550000, budgetHigh: 650000, weightedValue: 240000, probability: 0.40, eventDate: "2026-07-20", locations: [{ displayName: "Seattle, WA" }, { displayName: "New York, NY" }], durationDays: 2, services: ["Production", "Marketing", "Content Creation"], industry: "Technology" },
  { id: "d12", name: "Red Bull Extreme Fest", clientName: "Red Bull", status: "Contracting", eventType: "Festival", budgetLow: 300000, budgetHigh: 380000, weightedValue: 204000, probability: 0.60, eventDate: "2026-08-02", locations: [{ displayName: "Las Vegas, NV" }], durationDays: 3, services: ["Executive Production", "Talent Programming", "Production", "Programming"], industry: "Food & Beverage" },
  { id: "d13", name: "Salesforce Dreamforce Lounge", clientName: "Salesforce", status: "Proposal", eventType: "Corporate Event", budgetLow: 450000, budgetHigh: 550000, weightedValue: 125000, probability: 0.25, eventDate: "2026-08-15", locations: [{ displayName: "San Francisco, CA" }], durationDays: 2, services: ["Event Concepting", "Consulting", "RSVP Management"], industry: "Technology" },
  { id: "d14", name: "Netflix Premiere Night", clientName: "Netflix", status: "In Progress", eventType: "Premiere", budgetLow: 250000, budgetHigh: 300000, weightedValue: 220000, probability: 0.80, eventDate: "2026-08-28", locations: [{ displayName: "Los Angeles, CA" }], durationDays: 1, services: ["Production", "Creative Direction", "Talent Programming"], industry: "Entertainment" },
  { id: "d15", name: "Uber Annual Awards", clientName: "Uber", status: "Prospecting", eventType: "Awards Ceremony", budgetLow: 280000, budgetHigh: 350000, weightedValue: 31500, probability: 0.10, eventDate: "2026-09-05", locations: [{ displayName: "San Francisco, CA" }], durationDays: 1, services: ["Event Concepting", "Production"], industry: "Technology" },
  { id: "d16", name: "BMW Electric Future Launch", clientName: "BMW", status: "Feedback", eventType: "Product Launch", budgetLow: 650000, budgetHigh: 800000, weightedValue: 290000, probability: 0.40, eventDate: "2026-09-12", locations: [{ displayName: "Miami, FL" }, { displayName: "Los Angeles, CA" }], durationDays: 2, services: ["Executive Production", "Creative Direction", "Marketing", "Content Creation"], industry: "Automotive" },
  { id: "d17", name: "LinkedIn Talent Connect", clientName: "LinkedIn", status: "Contracting", eventType: "Conference", budgetLow: 380000, budgetHigh: 450000, weightedValue: 249000, probability: 0.60, eventDate: "2026-09-20", locations: [{ displayName: "Nashville, TN" }], durationDays: 3, services: ["Executive Production", "Event Concepting", "Consulting"], industry: "Technology" },
  { id: "d18", name: "Adidas Creator Week", clientName: "Adidas", status: "Proposal", eventType: "Brand Activation", budgetLow: 420000, budgetHigh: 520000, weightedValue: 117500, probability: 0.25, eventDate: "2026-10-05", locations: [{ displayName: "Portland, OR" }], durationDays: 4, services: ["Creative Direction", "Content Creation", "Marketing", "Gifting"], industry: "Retail & Fashion" },
  { id: "d19", name: "Microsoft Ignite Side Stage", clientName: "Microsoft", status: "Warm Lead", eventType: "Tech Conference", budgetLow: 500000, budgetHigh: 600000, weightedValue: 82500, probability: 0.15, eventDate: "2026-10-15", locations: [{ displayName: "Chicago, IL" }], durationDays: 2, services: ["Production", "Event Concepting"], industry: "Technology" },
  { id: "d20", name: "Disney Holiday Spectacular", clientName: "Disney", status: "Prospecting", eventType: "Holiday Event", budgetLow: 900000, budgetHigh: 1100000, weightedValue: 100000, probability: 0.10, eventDate: "2026-11-20", locations: [{ displayName: "Orlando, FL" }, { displayName: "Los Angeles, CA" }], durationDays: 5, services: ["Executive Production", "Creative Direction", "Talent Programming", "Production", "Gifting"], industry: "Entertainment" },
  { id: "d21", name: "Stripe Fintech Forum", clientName: "Stripe", status: "Feedback", eventType: "Forum", budgetLow: 280000, budgetHigh: 340000, weightedValue: 124000, probability: 0.40, eventDate: "2026-10-25", locations: [{ displayName: "San Francisco, CA" }], durationDays: 1, services: ["Consulting", "Event Concepting", "RSVP Management"], industry: "Financial Services" },
  { id: "d22", name: "Lululemon Mindfulness Retreat", clientName: "Lululemon", status: "In Progress", eventType: "Wellness Event", budgetLow: 200000, budgetHigh: 260000, weightedValue: 184000, probability: 0.80, eventDate: "2026-11-08", locations: [{ displayName: "Scottsdale, AZ" }], durationDays: 3, services: ["Concept Development", "Culinary Programming", "Programming"], industry: "Retail & Fashion" },
  { id: "d23", name: "Adobe MAX After Hours", clientName: "Adobe", status: "Contracting", eventType: "Networking Event", budgetLow: 320000, budgetHigh: 400000, weightedValue: 216000, probability: 0.60, eventDate: "2026-11-15", locations: [{ displayName: "Los Angeles, CA" }], durationDays: 1, services: ["Production", "Talent Programming", "Culinary Production"], industry: "Technology" },
  { id: "d24", name: "Coca-Cola Holiday Campaign Launch", clientName: "Coca-Cola", status: "Proposal", eventType: "Brand Activation", budgetLow: 500000, budgetHigh: 620000, weightedValue: 140000, probability: 0.25, eventDate: "2026-12-01", locations: [{ displayName: "Atlanta, GA" }, { displayName: "Miami, FL" }], durationDays: 2, services: ["Marketing", "Creative Direction", "Content Creation", "Production"], industry: "Food & Beverage" },
  { id: "d25", name: "Warner Bros Year-End Gala", clientName: "Warner Bros", status: "Final Invoicing", eventType: "Gala Dinner", budgetLow: 350000, budgetHigh: 420000, weightedValue: 365750, probability: 0.95, eventDate: "2026-12-15", locations: [{ displayName: "Los Angeles, CA" }], durationDays: 1, services: ["Culinary Production", "Culinary Programming", "RSVP Management", "Gifting"], industry: "Entertainment" },
];

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getQuarter(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const q = Math.ceil(parseInt(month) / 3);
  return `Q${q} ${year}`;
}

export function getForecastData(horizonMonths: number) {
  const now = new Date(2026, 2, 17);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() + horizonMonths);
  const cutoffStr = cutoff.toISOString().substring(0, 10);
  const nowStr = now.toISOString().substring(0, 10);

  const filtered = mockDeals.filter(
    (d) => d.eventDate >= nowStr && d.eventDate <= cutoffStr
  );

  const monthMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();

  for (const deal of filtered) {
    const mk = getMonthKey(deal.eventDate);
    const avg = (deal.budgetLow + deal.budgetHigh) / 2;
    const existing = monthMap.get(mk) || { weighted: 0, unweighted: 0, dealCount: 0 };
    existing.weighted += avg * deal.probability;
    existing.unweighted += avg;
    existing.dealCount += 1;
    monthMap.set(mk, existing);
  }

  const allMonthKeys: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= cutoff) {
    const mk = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    allMonthKeys.push(mk);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const monthlyRevenue: MonthlyRevenue[] = allMonthKeys.map((mk) => {
    const data = monthMap.get(mk) || { weighted: 0, unweighted: 0, dealCount: 0 };
    return {
      month: mk,
      monthLabel: getMonthLabel(mk),
      weighted: Math.round(data.weighted),
      unweighted: Math.round(data.unweighted),
      dealCount: data.dealCount,
    };
  });

  const quarterMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
  for (const mr of monthlyRevenue) {
    const q = getQuarter(mr.month);
    const existing = quarterMap.get(q) || { weighted: 0, unweighted: 0, dealCount: 0 };
    existing.weighted += mr.weighted;
    existing.unweighted += mr.unweighted;
    existing.dealCount += mr.dealCount;
    quarterMap.set(q, existing);
  }

  const quarterlyRollups: QuarterlyRollup[] = Array.from(quarterMap.entries()).map(
    ([quarter, data]) => ({
      quarter,
      weighted: data.weighted,
      unweighted: data.unweighted,
      dealCount: data.dealCount,
    })
  );

  const densityMap = new Map<string, { eventCount: number; totalDays: number }>();
  for (const deal of filtered) {
    const mk = getMonthKey(deal.eventDate);
    const existing = densityMap.get(mk) || { eventCount: 0, totalDays: 0 };
    existing.eventCount += 1;
    existing.totalDays += deal.durationDays;
    densityMap.set(mk, existing);
  }

  const eventDensity: EventDensity[] = allMonthKeys.map((mk) => {
    const data = densityMap.get(mk) || { eventCount: 0, totalDays: 0 };
    return {
      month: mk,
      monthLabel: getMonthLabel(mk),
      eventCount: data.eventCount,
      totalDays: data.totalDays,
    };
  });

  const totalWeighted = filtered.reduce((sum, d) => {
    const avg = (d.budgetLow + d.budgetHigh) / 2;
    return sum + avg * d.probability;
  }, 0);

  const totalUnweighted = filtered.reduce((sum, d) => {
    return sum + (d.budgetLow + d.budgetHigh) / 2;
  }, 0);

  const currentQuarterDeals = filtered.filter((d) => {
    const eventMonth = parseInt(d.eventDate.substring(5, 7));
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    const eventQ = Math.ceil(eventMonth / 3);
    const eventYear = parseInt(d.eventDate.substring(0, 4));
    return eventQ === currentQ && eventYear === now.getFullYear();
  });

  const currentQuarterRevenue = currentQuarterDeals.reduce((sum, d) => {
    const avg = (d.budgetLow + d.budgetHigh) / 2;
    return sum + avg * d.probability;
  }, 0);

  const serviceMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
  for (const deal of filtered) {
    const avg = (deal.budgetLow + deal.budgetHigh) / 2;
    const serviceCount = deal.services.length || 1;
    for (const service of deal.services) {
      const existing = serviceMap.get(service) || { weighted: 0, unweighted: 0, dealCount: 0 };
      existing.weighted += (avg * deal.probability) / serviceCount;
      existing.unweighted += avg / serviceCount;
      existing.dealCount += 1;
      serviceMap.set(service, existing);
    }
  }
  const revenueByService: BreakdownItem[] = Array.from(serviceMap.entries())
    .map(([name, data]) => ({
      name,
      weighted: Math.round(data.weighted),
      unweighted: Math.round(data.unweighted),
      dealCount: data.dealCount,
    }))
    .sort((a, b) => b.weighted - a.weighted);

  const industryMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
  for (const deal of filtered) {
    const avg = (deal.budgetLow + deal.budgetHigh) / 2;
    const existing = industryMap.get(deal.industry) || { weighted: 0, unweighted: 0, dealCount: 0 };
    existing.weighted += avg * deal.probability;
    existing.unweighted += avg;
    existing.dealCount += 1;
    industryMap.set(deal.industry, existing);
  }
  const revenueByIndustry: BreakdownItem[] = Array.from(industryMap.entries())
    .map(([name, data]) => ({
      name,
      weighted: Math.round(data.weighted),
      unweighted: Math.round(data.unweighted),
      dealCount: data.dealCount,
    }))
    .sort((a, b) => b.weighted - a.weighted);

  const locationMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
  for (const deal of filtered) {
    const avg = (deal.budgetLow + deal.budgetHigh) / 2;
    const locCount = deal.locations.length || 1;
    for (const loc of deal.locations) {
      const key = loc.displayName;
      const existing = locationMap.get(key) || { weighted: 0, unweighted: 0, dealCount: 0 };
      existing.weighted += (avg * deal.probability) / locCount;
      existing.unweighted += avg / locCount;
      existing.dealCount += 1;
      locationMap.set(key, existing);
    }
  }
  const revenueByLocation: BreakdownItem[] = Array.from(locationMap.entries())
    .map(([name, data]) => ({
      name,
      weighted: Math.round(data.weighted),
      unweighted: Math.round(data.unweighted),
      dealCount: data.dealCount,
    }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 10);

  return {
    deals: filtered,
    monthlyRevenue,
    quarterlyRollups,
    eventDensity,
    revenueByService,
    revenueByIndustry,
    revenueByLocation,
    summary: {
      totalWeighted: Math.round(totalWeighted),
      totalUnweighted: Math.round(totalUnweighted),
      dealCount: filtered.length,
      currentQuarterRevenue: Math.round(currentQuarterRevenue),
    },
  };
}
