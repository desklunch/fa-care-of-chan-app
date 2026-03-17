import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { requirePermission } from "../../middleware/permissions";
import { logAuditEvent } from "../../audit";
import { handleServiceError } from "../../lib/route-helpers";
import { storage } from "../../storage";
import { DealsService } from "../../services/deals.service";
import { dealStatuses, type DealStatus, insertDealIntakeSchema, updateDealIntakeSchema } from "@shared/schema";
import { dealsStorage } from "./deals.storage";
import { formsStorage } from "../forms/forms.storage";

const dealsService = new DealsService(storage);

export function registerDealsRoutes(app: Express): void {
  app.get("/api/deals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let statusFilter: DealStatus[] | undefined;
      
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        statusFilter = statusArray.filter(s => dealStatuses.includes(s as DealStatus)) as DealStatus[];
      }
      
      const deals = await dealsService.list({ status: statusFilter });
      res.json(deals);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deals");
    }
  });

  app.get("/api/deals/forecast", isAuthenticated, requirePermission("admin.settings"), async (req, res) => {
    try {
      const horizonParam = parseInt(req.query.horizon as string) || 6;
      const horizon = [3, 6, 12].includes(horizonParam) ? horizonParam : 6;

      const asOfParam = req.query.asOfDate as string | undefined;
      const now = asOfParam && /^\d{4}-\d{2}-\d{2}$/.test(asOfParam)
        ? new Date(asOfParam + "T00:00:00")
        : new Date();
      const startDate = now.toISOString().substring(0, 10);
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() + horizon);
      const endDate = cutoff.toISOString().substring(0, 10);

      const stageProbabilities: Record<string, number> = {
        "Prospecting": 0.10,
        "Warm Lead": 0.15,
        "Proposal": 0.25,
        "Feedback": 0.40,
        "Contracting": 0.60,
        "In Progress": 0.80,
        "Final Invoicing": 0.95,
      };

      const [rawDeals, allServices] = await Promise.all([
        dealsStorage.getDealsForForecast(startDate, endDate),
        dealsStorage.getAllDealServices(),
      ]);

      const serviceMap = new Map<number, string>();
      for (const svc of allServices) {
        serviceMap.set(svc.id, svc.name);
      }

      const deals = rawDeals.map((d) => {
        const budgetLow = d.budgetLow ?? 0;
        const budgetHigh = d.budgetHigh ?? 0;
        const probability = stageProbabilities[d.status] ?? 0;
        const avg = (budgetLow + budgetHigh) / 2;
        const totalDurationDays = (d.eventSchedule ?? []).reduce(
          (sum, ev) => sum + (ev.durationDays || 0),
          0
        );
        const services = (d.serviceIds ?? [])
          .map((id) => serviceMap.get(id))
          .filter((name): name is string => !!name);

        return {
          id: d.id,
          name: d.displayName,
          clientName: d.clientName ?? "Unknown",
          status: d.status,
          eventType: "",
          budgetLow,
          budgetHigh,
          weightedValue: Math.round(avg * probability),
          probability,
          eventDate: d.earliestEventDate!,
          locations: (d.locations ?? []).map((loc) => ({
            displayName: loc.displayName,
          })),
          durationDays: totalDurationDays || 1,
          services,
          industry: d.industryName ?? "Other",
        };
      });

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

      const allMonthKeys: string[] = [];
      const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= cutoff) {
        const mk = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        allMonthKeys.push(mk);
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const monthMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
      for (const deal of deals) {
        const mk = getMonthKey(deal.eventDate);
        const avg = (deal.budgetLow + deal.budgetHigh) / 2;
        const existing = monthMap.get(mk) || { weighted: 0, unweighted: 0, dealCount: 0 };
        existing.weighted += avg * deal.probability;
        existing.unweighted += avg;
        existing.dealCount += 1;
        monthMap.set(mk, existing);
      }

      const monthlyRevenue = allMonthKeys.map((mk) => {
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

      const quarterlyRollups = Array.from(quarterMap.entries()).map(
        ([quarter, data]) => ({
          quarter,
          weighted: data.weighted,
          unweighted: data.unweighted,
          dealCount: data.dealCount,
        })
      );

      const densityMap = new Map<string, { eventCount: number; totalDays: number }>();
      for (const deal of deals) {
        const mk = getMonthKey(deal.eventDate);
        const existing = densityMap.get(mk) || { eventCount: 0, totalDays: 0 };
        existing.eventCount += 1;
        existing.totalDays += deal.durationDays;
        densityMap.set(mk, existing);
      }

      const eventDensity = allMonthKeys.map((mk) => {
        const data = densityMap.get(mk) || { eventCount: 0, totalDays: 0 };
        return {
          month: mk,
          monthLabel: getMonthLabel(mk),
          eventCount: data.eventCount,
          totalDays: data.totalDays,
        };
      });

      const totalWeighted = deals.reduce((sum, d) => {
        const avg = (d.budgetLow + d.budgetHigh) / 2;
        return sum + avg * d.probability;
      }, 0);

      const totalUnweighted = deals.reduce((sum, d) => {
        return sum + (d.budgetLow + d.budgetHigh) / 2;
      }, 0);

      const currentQ = Math.ceil((now.getMonth() + 1) / 3);
      const currentYear = now.getFullYear();
      const currentQuarterDeals = deals.filter((d) => {
        const eventMonth = parseInt(d.eventDate.substring(5, 7));
        const eventQ = Math.ceil(eventMonth / 3);
        const eventYear = parseInt(d.eventDate.substring(0, 4));
        return eventQ === currentQ && eventYear === currentYear;
      });

      const currentQuarterRevenue = currentQuarterDeals.reduce((sum, d) => {
        const avg = (d.budgetLow + d.budgetHigh) / 2;
        return sum + avg * d.probability;
      }, 0);

      const svcBreakdownMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
      for (const deal of deals) {
        const avg = (deal.budgetLow + deal.budgetHigh) / 2;
        const serviceCount = deal.services.length || 1;
        for (const service of deal.services) {
          const existing = svcBreakdownMap.get(service) || { weighted: 0, unweighted: 0, dealCount: 0 };
          existing.weighted += (avg * deal.probability) / serviceCount;
          existing.unweighted += avg / serviceCount;
          existing.dealCount += 1;
          svcBreakdownMap.set(service, existing);
        }
      }
      const revenueByService = Array.from(svcBreakdownMap.entries())
        .map(([name, data]) => ({
          name,
          weighted: Math.round(data.weighted),
          unweighted: Math.round(data.unweighted),
          dealCount: data.dealCount,
        }))
        .sort((a, b) => b.weighted - a.weighted);

      const industryBreakdownMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
      for (const deal of deals) {
        const avg = (deal.budgetLow + deal.budgetHigh) / 2;
        const existing = industryBreakdownMap.get(deal.industry) || { weighted: 0, unweighted: 0, dealCount: 0 };
        existing.weighted += avg * deal.probability;
        existing.unweighted += avg;
        existing.dealCount += 1;
        industryBreakdownMap.set(deal.industry, existing);
      }
      const revenueByIndustry = Array.from(industryBreakdownMap.entries())
        .map(([name, data]) => ({
          name,
          weighted: Math.round(data.weighted),
          unweighted: Math.round(data.unweighted),
          dealCount: data.dealCount,
        }))
        .sort((a, b) => b.weighted - a.weighted);

      const locationBreakdownMap = new Map<string, { weighted: number; unweighted: number; dealCount: number }>();
      for (const deal of deals) {
        const avg = (deal.budgetLow + deal.budgetHigh) / 2;
        const locCount = deal.locations.length || 1;
        for (const loc of deal.locations) {
          const key = loc.displayName;
          const existing = locationBreakdownMap.get(key) || { weighted: 0, unweighted: 0, dealCount: 0 };
          existing.weighted += (avg * deal.probability) / locCount;
          existing.unweighted += avg / locCount;
          existing.dealCount += 1;
          locationBreakdownMap.set(key, existing);
        }
      }
      const revenueByLocation = Array.from(locationBreakdownMap.entries())
        .map(([name, data]) => ({
          name,
          weighted: Math.round(data.weighted),
          unweighted: Math.round(data.unweighted),
          dealCount: data.dealCount,
        }))
        .sort((a, b) => b.weighted - a.weighted)
        .slice(0, 10);

      res.json({
        deals,
        monthlyRevenue,
        quarterlyRollups,
        eventDensity,
        revenueByService,
        revenueByIndustry,
        revenueByLocation,
        summary: {
          totalWeighted: Math.round(totalWeighted),
          totalUnweighted: Math.round(totalUnweighted),
          dealCount: deals.length,
          currentQuarterRevenue: Math.round(currentQuarterRevenue),
        },
      });
    } catch (error) {
      handleServiceError(res, error, "Failed to generate forecast");
    }
  });

  app.get("/api/deals/pipeline-health", isAuthenticated, requirePermission("admin.settings"), async (req, res) => {
    try {
      const rangeParam = (req.query.range as string) || "all";
      const validRanges = ["30", "60", "90", "quarter", "year", "all"];
      const range = validRanges.includes(rangeParam) ? rangeParam : "all";

      const asOfParam = req.query.asOfDate as string | undefined;
      const now = asOfParam && /^\d{4}-\d{2}-\d{2}$/.test(asOfParam)
        ? new Date(asOfParam + "T00:00:00")
        : new Date();

      const ACTIVE_STAGES = [
        "Prospecting", "Proposal", "Feedback", "Contracting", "In Progress", "Final Invoicing",
      ];

      const [allDeals, transitions] = await Promise.all([
        dealsStorage.getPipelineDeals(ACTIVE_STAGES),
        dealsStorage.getStatusTransitions(),
      ]);

      function daysBetween(a: Date, b: Date): number {
        return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
      }

      function getDateRange(r: string, ref: Date): { start: Date; end: Date } | null {
        const end = new Date(ref);
        const start = new Date(ref);
        switch (r) {
          case "30": start.setDate(start.getDate() - 30); break;
          case "60": start.setDate(start.getDate() - 60); break;
          case "90": start.setDate(start.getDate() - 90); break;
          case "quarter": {
            const q = Math.floor(end.getMonth() / 3);
            start.setMonth(q * 3, 1);
            start.setHours(0, 0, 0, 0);
            break;
          }
          case "year": {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            break;
          }
          case "all":
          default:
            return null;
        }
        return { start, end };
      }

      function filterDeals(dealsList: typeof allDeals, dateRange: { start: Date; end: Date } | null) {
        if (!dateRange) return dealsList;
        return dealsList.filter((d) => {
          const created = d.createdAt ? new Date(d.createdAt) : null;
          return created && created <= dateRange.end;
        });
      }

      const currentRange = getDateRange(range, now);
      const currentDeals = filterDeals(allDeals, currentRange);

      function dealValue(d: typeof allDeals[0]): number {
        const low = d.budgetLow ?? 0;
        const high = d.budgetHigh ?? 0;
        return (low + high) / 2;
      }

      function computeSnapshot(dealsList: typeof allDeals, refDate: Date) {
        const totalActive = dealsList.length;
        const totalValue = dealsList.reduce((sum, d) => sum + dealValue(d), 0);
        const ages = dealsList.map((d) => {
          const started = d.startedOn ? new Date(d.startedOn) : (d.createdAt ? new Date(d.createdAt) : refDate);
          return daysBetween(started, refDate);
        });
        const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
        const stalledDeals = dealsList.filter((d) => {
          if (d.lastContactOn) {
            return daysBetween(new Date(d.lastContactOn), refDate) >= 30;
          }
          const fallbackDate = d.startedOn ? new Date(d.startedOn) : (d.createdAt ? new Date(d.createdAt) : null);
          if (!fallbackDate) return false;
          return daysBetween(fallbackDate, refDate) >= 30;
        });

        const stageMap = new Map<string, { count: number; value: number }>();
        for (const stage of ACTIVE_STAGES) {
          stageMap.set(stage, { count: 0, value: 0 });
        }
        for (const d of dealsList) {
          const entry = stageMap.get(d.status);
          if (entry) {
            entry.count++;
            entry.value += dealValue(d);
          }
        }

        const agingBuckets = [
          { bucket: "< 1 week", min: 0, max: 7 },
          { bucket: "1-2 weeks", min: 7, max: 14 },
          { bucket: "2-4 weeks", min: 14, max: 28 },
          { bucket: "1-2 months", min: 28, max: 60 },
          { bucket: "2+ months", min: 60, max: Infinity },
        ];
        const agingData = agingBuckets.map((b) => ({
          bucket: b.bucket,
          count: ages.filter((a) => a >= b.min && a < b.max).length,
        }));

        return {
          totalActive,
          totalValue: Math.round(totalValue),
          avgAge,
          stalledCount: stalledDeals.length,
          stageMap,
          agingData,
          stalledDeals: stalledDeals
            .map((d) => {
              const started = d.startedOn || (d.createdAt ? new Date(d.createdAt).toISOString().substring(0, 10) : null);
              const lastContact = d.lastContactOn ? new Date(d.lastContactOn) : null;
              const daysSince = lastContact ? daysBetween(lastContact, refDate) : (started ? daysBetween(new Date(started), refDate) : 999);
              return {
                id: d.id,
                name: d.displayName,
                client: d.clientName ?? "Unknown",
                owner: [d.ownerFirstName, d.ownerLastName].filter(Boolean).join(" ") || "Unassigned",
                stage: d.status,
                lastContactDate: d.lastContactOn ?? started ?? null,
                value: Math.round(dealValue(d)),
                daysSinceContact: daysSince,
              };
            })
            .sort((a, b) => b.daysSinceContact - a.daysSinceContact),
        };
      }

      const current = computeSnapshot(currentDeals, now);

      const conversionMap = new Map<string, Map<string, number>>();
      for (const t of transitions) {
        const changes = t.changes as Record<string, unknown> | null;
        if (!changes || !changes.status) continue;
        const statusChange = changes.status as { from?: string; to?: string };
        if (!statusChange.from || !statusChange.to) continue;
        if (!ACTIVE_STAGES.includes(statusChange.from) || !ACTIVE_STAGES.includes(statusChange.to)) continue;
        const fromIdx = ACTIVE_STAGES.indexOf(statusChange.from);
        const toIdx = ACTIVE_STAGES.indexOf(statusChange.to);
        if (toIdx !== fromIdx + 1) continue;
        if (!conversionMap.has(statusChange.from)) {
          conversionMap.set(statusChange.from, new Map());
        }
        const toMap = conversionMap.get(statusChange.from)!;
        toMap.set(statusChange.to, (toMap.get(statusChange.to) || 0) + 1);
      }

      const fromCounts = new Map<string, number>();
      for (const t of transitions) {
        const changes = t.changes as Record<string, unknown> | null;
        if (!changes || !changes.status) continue;
        const statusChange = changes.status as { from?: string; to?: string };
        if (!statusChange.from || !ACTIVE_STAGES.includes(statusChange.from)) continue;
        fromCounts.set(statusChange.from, (fromCounts.get(statusChange.from) || 0) + 1);
      }

      const conversionRates = ACTIVE_STAGES.slice(0, -1).map((fromStage, i) => {
        const toStage = ACTIVE_STAGES[i + 1];
        const totalFrom = fromCounts.get(fromStage) || 0;
        const converted = conversionMap.get(fromStage)?.get(toStage) || 0;
        const rate = totalFrom > 0 ? Math.round((converted / totalFrom) * 100) : 0;
        return { fromStage, toStage, rate };
      });

      let history: {
        totalActiveDeals: { previousPeriod: number; previousPeriodLabel: string; previousYear: number; previousYearLabel: string };
        totalPipelineValue: { previousPeriod: number; previousPeriodLabel: string; previousYear: number; previousYearLabel: string };
        averageDealAgeDays: { previousPeriod: number; previousPeriodLabel: string; previousYear: number; previousYearLabel: string };
        stalledDealsCount: { previousPeriod: number; previousPeriodLabel: string; previousYear: number; previousYearLabel: string };
      } | null = null;

      let prevPeriodStages: Map<string, { count: number; value: number }> | null = null;
      let prevYearStages: Map<string, { count: number; value: number }> | null = null;
      let prevPeriodLabel = "";
      let prevYearLabel = "";
      let stagePrevPeriodLabel = "";
      let stageYearLabel = "";

      if (range !== "all" && currentRange) {
        let prevPeriodRange: { start: Date; end: Date };
        let prevYearRange: { start: Date; end: Date };

        switch (range) {
          case "30":
          case "60":
          case "90": {
            const days = parseInt(range);
            const prevEnd = new Date(currentRange.start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - days + 1);
            prevPeriodRange = { start: prevStart, end: prevEnd };

            const yearEnd = new Date(currentRange.end);
            yearEnd.setFullYear(yearEnd.getFullYear() - 1);
            const yearStart = new Date(currentRange.start);
            yearStart.setFullYear(yearStart.getFullYear() - 1);
            prevYearRange = { start: yearStart, end: yearEnd };

            prevPeriodLabel = `vs prior ${days} days`;
            prevYearLabel = `vs same ${days} days last year`;
            stagePrevPeriodLabel = `prior ${days}d`;
            stageYearLabel = "yr ago";
            break;
          }
          case "quarter": {
            const curQ = Math.floor(now.getMonth() / 3);
            const curYear = now.getFullYear();
            const prevQMonth = curQ === 0 ? 9 : (curQ - 1) * 3;
            const prevQYear = curQ === 0 ? curYear - 1 : curYear;
            const prevQStart = new Date(prevQYear, prevQMonth, 1);
            const prevQEnd = new Date(prevQYear, prevQMonth + 3, 0, 23, 59, 59);
            prevPeriodRange = { start: prevQStart, end: prevQEnd };

            const sameQLastYearStart = new Date(curYear - 1, curQ * 3, 1);
            const sameQLastYearEnd = new Date(curYear - 1, curQ * 3 + 3, 0, 23, 59, 59);
            prevYearRange = { start: sameQLastYearStart, end: sameQLastYearEnd };

            prevPeriodLabel = "vs last quarter";
            prevYearLabel = "vs same quarter last year";
            stagePrevPeriodLabel = "last qtr";
            stageYearLabel = "yr ago";
            break;
          }
          case "year": {
            const thisYear = now.getFullYear();
            const lastYearStart = new Date(thisYear - 1, 0, 1);
            const lastYearEnd = new Date(thisYear - 1, 11, 31, 23, 59, 59);
            prevPeriodRange = { start: lastYearStart, end: lastYearEnd };

            const twoYearsStart = new Date(thisYear - 2, 0, 1);
            const twoYearsEnd = new Date(thisYear - 2, 11, 31, 23, 59, 59);
            prevYearRange = { start: twoYearsStart, end: twoYearsEnd };

            prevPeriodLabel = "vs last year";
            prevYearLabel = "vs 2 years ago";
            stagePrevPeriodLabel = "last yr";
            stageYearLabel = "2yr ago";
            break;
          }
          default: {
            const fallbackDays = daysBetween(currentRange.start, currentRange.end);
            const fbEnd = new Date(currentRange.start);
            fbEnd.setDate(fbEnd.getDate() - 1);
            const fbStart = new Date(fbEnd);
            fbStart.setDate(fbStart.getDate() - fallbackDays);
            prevPeriodRange = { start: fbStart, end: fbEnd };
            const yrEnd = new Date(currentRange.end);
            yrEnd.setFullYear(yrEnd.getFullYear() - 1);
            const yrStart = new Date(currentRange.start);
            yrStart.setFullYear(yrStart.getFullYear() - 1);
            prevYearRange = { start: yrStart, end: yrEnd };
            break;
          }
        }

        const prevDeals = filterDeals(allDeals, prevPeriodRange);
        const yearDeals = filterDeals(allDeals, prevYearRange);

        const prevSnapshot = computeSnapshot(prevDeals, prevPeriodRange.end);
        const yearSnapshot = computeSnapshot(yearDeals, prevYearRange.end);

        prevPeriodStages = prevSnapshot.stageMap;
        prevYearStages = yearSnapshot.stageMap;

        history = {
          totalActiveDeals: {
            previousPeriod: prevSnapshot.totalActive,
            previousPeriodLabel: prevPeriodLabel,
            previousYear: yearSnapshot.totalActive,
            previousYearLabel: prevYearLabel,
          },
          totalPipelineValue: {
            previousPeriod: prevSnapshot.totalValue,
            previousPeriodLabel: prevPeriodLabel,
            previousYear: yearSnapshot.totalValue,
            previousYearLabel: prevYearLabel,
          },
          averageDealAgeDays: {
            previousPeriod: prevSnapshot.avgAge,
            previousPeriodLabel: prevPeriodLabel,
            previousYear: yearSnapshot.avgAge,
            previousYearLabel: prevYearLabel,
          },
          stalledDealsCount: {
            previousPeriod: prevSnapshot.stalledCount,
            previousPeriodLabel: prevPeriodLabel,
            previousYear: yearSnapshot.stalledCount,
            previousYearLabel: prevYearLabel,
          },
        };
      }

      const stageData = ACTIVE_STAGES.map((stage) => {
        const entry = current.stageMap.get(stage) || { count: 0, value: 0 };
        const prevPeriod = prevPeriodStages?.get(stage) || { count: 0, value: 0 };
        const prevYear = prevYearStages?.get(stage) || { count: 0, value: 0 };
        return {
          stage,
          dealCount: entry.count,
          totalValue: Math.round(entry.value),
          previousPeriodCount: prevPeriod.count,
          previousPeriodLabel: stagePrevPeriodLabel,
          previousYearCount: prevYear.count,
          previousYearLabel: stageYearLabel,
        };
      });

      res.json({
        kpis: {
          totalActiveDeals: current.totalActive,
          totalPipelineValue: current.totalValue,
          averageDealAgeDays: current.avgAge,
          stalledDealsCount: current.stalledCount,
          history,
        },
        stageData,
        agingData: current.agingData,
        conversionRates,
        stalledDeals: current.stalledDeals,
      });
    } catch (error) {
      handleServiceError(res, error, "Failed to compute pipeline health");
    }
  });

  app.get("/api/deals/all-deal-tags", isAuthenticated, async (req, res) => {
    try {
      const results = await dealsStorage.getAllDealTags();
      res.json(results);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch all deal tags");
    }
  });

  app.get("/api/deals/all-linked-clients", isAuthenticated, async (req, res) => {
    try {
      const { db } = await import("../../db");
      const { dealClients, clients } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const results = await db
        .select({
          dealId: dealClients.dealId,
          clientId: dealClients.clientId,
          clientName: clients.name,
          label: dealClients.label,
        })
        .from(dealClients)
        .innerJoin(clients, eq(dealClients.clientId, clients.id));
      res.json(results);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch all linked clients");
    }
  });

  app.get("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const deal = await dealsService.getById(req.params.id);
      res.json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal");
    }
  });

  app.post("/api/deals", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.create(req.body, actorId);
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal",
        entityId: deal.id,
        metadata: { displayName: deal.displayName, status: deal.status },
      });
      
      res.status(201).json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to create deal");
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.update(req.params.id, req.body, actorId);
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal",
        entityId: req.params.id,
        changes: req.body,
      });
      
      res.json(deal);
    } catch (error) {
      handleServiceError(res, error, "Failed to update deal");
    }
  });

  app.post("/api/deals/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const { dealIds } = req.body;
      const actorId = req.user.claims.sub;
      
      await dealsService.reorder(dealIds, actorId);
      
      await logAuditEvent(req, {
        action: "reorder",
        entityType: "deals",
        entityId: "bulk",
        metadata: { count: dealIds?.length || 0 },
      });
      
      res.json({ success: true, reorderedCount: dealIds?.length || 0 });
    } catch (error) {
      handleServiceError(res, error, "Failed to reorder deals");
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, requirePermission("deals.delete"), async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const deal = await dealsService.getById(req.params.id);
      
      await dealsService.delete(req.params.id, actorId);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { displayName: deal.displayName },
      });
      
      res.status(204).send();
    } catch (error) {
      handleServiceError(res, error, "Failed to delete deal");
    }
  });

  app.get("/api/deals/:dealId/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await dealsService.getTasks(req.params.dealId);
      res.json(tasks);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal tasks");
    }
  });

  app.post("/api/deals/:dealId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const task = await dealsService.createTask(
        { ...req.body, dealId: req.params.dealId },
        actorId
      );
      
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_task",
        entityId: task.id,
        status: "success",
        metadata: { dealId: req.params.dealId, title: task.title },
      });
      
      res.status(201).json(task);
    } catch (error) {
      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_task",
        entityId: null,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to create deal task");
    }
  });

  app.patch("/api/deals/:dealId/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const task = await dealsService.updateTask(
        req.params.dealId,
        req.params.taskId,
        req.body,
        actorId
      );
      
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "success",
        metadata: { dealId: req.params.dealId },
      });
      
      res.json(task);
    } catch (error) {
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to update deal task");
    }
  });

  app.get("/api/deals/:id/linked-clients", isAuthenticated, async (req, res) => {
    try {
      const linkedClients = await dealsStorage.getLinkedClientsByDealId(req.params.id);
      res.json(linkedClients);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch linked clients");
    }
  });

  app.post("/api/deals/:id/linked-clients", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId, label } = req.body;
      if (!clientId) {
        return res.status(400).json({ message: "clientId is required" });
      }
      await dealsStorage.linkDealClient(req.params.id, clientId, label);

      await logAuditEvent(req, {
        action: "link_client",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { clientId, label },
      });

      const linkedClients = await dealsStorage.getLinkedClientsByDealId(req.params.id);
      res.status(201).json(linkedClients);
    } catch (error) {
      handleServiceError(res, error, "Failed to link client to deal");
    }
  });

  app.delete("/api/deals/:id/linked-clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      await dealsStorage.unlinkDealClient(req.params.id, req.params.clientId);

      await logAuditEvent(req, {
        action: "unlink_client",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { clientId: req.params.clientId },
      });

      res.status(204).send();
    } catch (error) {
      handleServiceError(res, error, "Failed to unlink client from deal");
    }
  });

  app.get("/api/deals/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const tagIds = await dealsStorage.getDealTagIds(req.params.id);
      res.json(tagIds);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal tags");
    }
  });

  app.put("/api/deals/:id/tags", isAuthenticated, async (req: any, res) => {
    try {
      const { tagIds } = req.body;
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: "tagIds must be an array" });
      }
      await dealsStorage.setDealTags(req.params.id, tagIds);

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal",
        entityId: req.params.id,
        metadata: { field: "tags", tagIds },
      });

      res.json({ success: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to update deal tags");
    }
  });

  app.delete("/api/deals/:dealId/tasks/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      await dealsService.deleteTask(req.params.dealId, req.params.taskId, actorId);
      
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "success",
        metadata: { dealId: req.params.dealId },
      });
      
      res.status(204).send();
    } catch (error) {
      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_task",
        entityId: req.params.taskId,
        status: "failure",
        metadata: { dealId: req.params.dealId, error: (error as Error).message },
      });
      handleServiceError(res, error, "Failed to delete deal task");
    }
  });

  // ==========================================
  // DEAL INTAKE ROUTES
  // ==========================================

  app.get("/api/deals/:dealId/intake", isAuthenticated, async (req, res) => {
    try {
      const intake = await dealsStorage.getDealIntake(req.params.dealId);
      res.json(intake);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal intake");
    }
  });

  app.post("/api/deals/:dealId/intake", isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.body;
      if (!templateId) {
        return res.status(400).json({ message: "templateId is required" });
      }

      const template = await formsStorage.getFormTemplateById(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const existing = await dealsStorage.getDealIntake(req.params.dealId);
      if (existing) {
        await dealsStorage.deleteDealIntake(req.params.dealId);
      }

      const actorId = req.user.claims.sub;
      const intakeData = {
        dealId: req.params.dealId,
        templateId: template.id,
        templateName: template.name,
        formSchema: template.formSchema,
        responseData: {},
        status: "draft" as const,
      };

      const result = insertDealIntakeSchema.safeParse(intakeData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const intake = await dealsStorage.createDealIntake(result.data, actorId);

      await logAuditEvent(req, {
        action: "create",
        entityType: "deal_intake",
        entityId: intake.id,
        status: "success",
        metadata: { dealId: req.params.dealId, templateId, templateName: template.name },
      });

      res.status(201).json(intake);
    } catch (error) {
      handleServiceError(res, error, "Failed to create deal intake");
    }
  });

  app.patch("/api/deals/:dealId/intake", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await dealsStorage.getDealIntake(req.params.dealId);
      if (!existing) {
        return res.status(404).json({ message: "No intake found for this deal" });
      }

      if (existing.status === "completed") {
        return res.status(400).json({ message: "Cannot modify a completed intake. Delete it first to start over." });
      }

      const result = updateDealIntakeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const intake = await dealsStorage.updateDealIntake(req.params.dealId, result.data);

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_intake",
        entityId: existing.id,
        status: "success",
        metadata: { dealId: req.params.dealId, status: result.data.status },
      });

      res.json(intake);
    } catch (error) {
      handleServiceError(res, error, "Failed to update deal intake");
    }
  });

  app.delete("/api/deals/:dealId/intake", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await dealsStorage.getDealIntake(req.params.dealId);
      if (!existing) {
        return res.status(404).json({ message: "No intake found for this deal" });
      }

      await dealsStorage.deleteDealIntake(req.params.dealId);

      await logAuditEvent(req, {
        action: "delete",
        entityType: "deal_intake",
        entityId: existing.id,
        status: "success",
        metadata: { dealId: req.params.dealId },
      });

      res.status(204).send();
    } catch (error) {
      handleServiceError(res, error, "Failed to delete deal intake");
    }
  });
}
