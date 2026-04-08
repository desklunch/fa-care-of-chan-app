import { Express } from "express";
import { isAuthenticated } from "../../googleAuth";
import { getDriveAccessToken } from "../../googleAuth";
import { requirePermission, loadPermissions, checkPermission } from "../../middleware/permissions";
import { logAuditEvent, getChangedFields } from "../../audit";
import { handleServiceError } from "../../lib/route-helpers";
import { storage } from "../../storage";
import { DealsService } from "../../services/deals.service";
import { type DealStatus, type DealStatusRecord, type FormSection, type FormField, type DealWithRelations, type DealEvent, type DealLocation, insertDealIntakeSchema, updateDealIntakeSchema, insertDealStatusSchema, mappableEntities } from "@shared/schema";
import { dealsStorage } from "./deals.storage";
import { formsStorage } from "../forms/forms.storage";
import { createGoogleDoc } from "../../googleDrive";
import { driveAttachmentsStorage } from "../drive-attachments/drive-attachments.storage";

const dealsService = new DealsService(storage);

export function registerDealsRoutes(app: Express): void {
  app.get("/api/deal-statuses", isAuthenticated, async (_req, res) => {
    try {
      const statuses = await storage.getDealStatuses();
      res.json(statuses);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deal statuses");
    }
  });

  app.patch("/api/deal-statuses/:id", isAuthenticated, requirePermission("sales.manage"), async (req: any, res) => {
    try {
      const validatedData = insertDealStatusSchema.partial().safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validatedData.error.errors,
        });
      }
      const original = await storage.getDealStatusById(parseInt(req.params.id));
      const status = await storage.updateDealStatus(parseInt(req.params.id), validatedData.data);
      if (!status) {
        return res.status(404).json({ message: "Deal status not found" });
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_status",
        entityId: req.params.id,
        status: "success",
        changes: getChangedFields(original, status),
      });

      res.json(status);
    } catch (error) {
      console.error("Error updating deal status:", error);
      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_status",
        entityId: req.params.id,
        status: "failure",
        metadata: { error: (error as Error).message },
      });
      res.status(500).json({ message: "Failed to update deal status" });
    }
  });

  app.get("/api/deals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let statusFilter: DealStatus[] | undefined;
      
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        statusFilter = statusArray as DealStatus[];
      }
      
      const deals = await dealsService.list({ status: statusFilter });
      res.json(deals);
    } catch (error) {
      handleServiceError(res, error, "Failed to fetch deals");
    }
  });

  app.get("/api/deals/forecast", isAuthenticated, requirePermission("deals.read"), async (req, res) => {
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

      const allStatuses = await storage.getDealStatuses();
      const stageProbabilities: Record<string, number> = {};
      for (const s of allStatuses) {
        stageProbabilities[s.name] = s.winProbability / 100;
      }

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
        const probability = stageProbabilities[d.statusName ?? ""] ?? 0;
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
          status: d.statusName ?? "Unknown",
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

  app.get("/api/deals/pipeline-health", isAuthenticated, requirePermission("deals.read"), async (req, res) => {
    try {
      const rangeParam = (req.query.range as string) || "all";
      const validRanges = ["30", "60", "90", "quarter", "year", "all"];
      const range = validRanges.includes(rangeParam) ? rangeParam : "all";

      const asOfParam = req.query.asOfDate as string | undefined;
      const now = asOfParam && /^\d{4}-\d{2}-\d{2}$/.test(asOfParam)
        ? new Date(asOfParam + "T00:00:00")
        : new Date();

      const allPipelineStatuses = await storage.getDealStatuses();
      const ACTIVE_STAGES = allPipelineStatuses.filter(s => s.isActive).map(s => s.name);

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
          const entered = d.startedOn ? new Date(d.startedOn) : (d.createdAt ? new Date(d.createdAt) : null);
          return entered && entered >= dateRange.start && entered <= dateRange.end;
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
          const entry = stageMap.get(d.statusName ?? "");
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
                stage: d.statusName ?? "Unknown",
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

      const result = updateDealIntakeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error.flatten() });
      }

      const { status: _status, ...safeData } = result.data;
      const intake = await dealsStorage.updateDealIntake(req.params.dealId, safeData);

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal_intake",
        entityId: existing.id,
        status: "success",
        metadata: { dealId: req.params.dealId },
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

  app.post("/api/deals/:dealId/intake/sync", isAuthenticated, async (req: any, res) => {
    try {
      const { dryRun } = req.body;
      const dealId = req.params.dealId;
      const actorId = req.user.claims.sub;

      const intake = await dealsStorage.getDealIntake(dealId);
      if (!intake) {
        return res.status(404).json({ message: "No intake found for this deal" });
      }

      const deal = await dealsService.getById(dealId);

      const formSchema = intake.formSchema as FormSection[];
      const responseData = intake.responseData as Record<string, unknown>;

      const mappedFields: FormField[] = [];
      for (const section of formSchema) {
        for (const field of section.fields) {
          if (field.entityMapping?.entityType === "deal" && field.entityMapping?.propertyKey) {
            mappedFields.push(field);
          }
        }
      }

      if (mappedFields.length === 0) {
        return res.json({ changes: [], message: "No mapped fields found" });
      }

      const changes: Array<{
        propertyKey: string;
        label: string;
        currentValue: unknown;
        newValue: unknown;
        fieldId: string;
      }> = [];

      const deepEqual = (a: unknown, b: unknown): boolean => {
        if (a === b) return true;
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          return a.every((item, i) => deepEqual(item, b[i]));
        }
        if (typeof a === "object" && typeof b === "object") {
          const aObj = a as Record<string, unknown>;
          const bObj = b as Record<string, unknown>;
          const aKeys = Object.keys(aObj).sort();
          const bKeys = Object.keys(bObj).sort();
          if (aKeys.length !== bKeys.length) return false;
          return aKeys.every((key, i) => key === bKeys[i] && deepEqual(aObj[key], bObj[key]));
        }
        return a === b;
      };

      const dealUpdates: Record<string, unknown> = {};
      let tagIds: string[] | null = null;

      for (const field of mappedFields) {
        const propKey = field.entityMapping!.propertyKey;
        const responseValue = responseData[field.id];

        if (responseValue === undefined || responseValue === null || responseValue === "") continue;
        if (Array.isArray(responseValue) && responseValue.length === 0) continue;
        if (typeof responseValue === "object" && !Array.isArray(responseValue) && Object.keys(responseValue as object).length === 0) continue;

        const entityDef = mappableEntities.deal;
        const propDef = entityDef.properties.find(p => p.key === propKey);
        if (!propDef) continue;
        const label = propDef.label;

        const parseResult = propDef.valueSchema.safeParse(responseValue);
        if (!parseResult.success) continue;

        if (propKey === "tags") {
          const currentTagIds = await dealsStorage.getDealTagIds(dealId);
          const newTagIds = responseValue as string[];
          const tagsMatch = currentTagIds.length === newTagIds.length && [...currentTagIds].sort().every((v, i) => v === [...newTagIds].sort()[i]);
          if (!tagsMatch) {
            tagIds = newTagIds;
            changes.push({
              propertyKey: "tags",
              label,
              currentValue: currentTagIds,
              newValue: tagIds,
              fieldId: field.id,
            });
          }
        } else {
          const currentValue = (deal as Record<string, unknown>)[propKey];
          if (!deepEqual(currentValue, responseValue)) {
            changes.push({
              propertyKey: propKey,
              label,
              currentValue,
              newValue: responseValue,
              fieldId: field.id,
            });
            dealUpdates[propKey] = responseValue;
          }
        }
      }

      if (changes.length === 0) {
        return res.json({ changes: [], message: "No data to sync" });
      }

      if (dryRun) {
        return res.json({ changes, dryRun: true });
      }

      if (Object.keys(dealUpdates).length > 0) {
        await dealsService.update(dealId, dealUpdates, actorId);
      }

      if (tagIds !== null) {
        await dealsStorage.setDealTags(dealId, tagIds);
      }

      await logAuditEvent(req, {
        action: "update",
        entityType: "deal",
        entityId: dealId,
        status: "success",
        metadata: { source: "intake_sync", changedProperties: changes.map(c => c.propertyKey) },
      });

      res.json({ changes, applied: true });
    } catch (error) {
      handleServiceError(res, error, "Failed to sync intake to deal");
    }
  });

  app.post("/api/deals/:id/generate-doc", isAuthenticated, loadPermissions, async (req: any, res) => {
    try {
      if (!checkPermission(req, "deals.read")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const dealId = req.params.id;
      const { folderId } = req.body;

      if (!folderId) {
        return res.status(400).json({ message: "folderId is required" });
      }

      const userId = req.user.claims.sub;
      const accessToken = await getDriveAccessToken(req.session);
      if (!accessToken) {
        return res.status(403).json({
          message: "Google Drive access not authorized",
          code: "drive_auth_required",
        });
      }

      const deal = await storage.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      const allServices = await storage.getDealServices();
      const servicesMap = new Map(allServices.map((s) => [s.id, s.name]));

      const htmlContent = buildDealDocHtml(deal, servicesMap);
      const docTitle = `${deal.displayName} - Deal Summary`;

      let docResult;
      try {
        docResult = await createGoogleDoc(accessToken, docTitle, folderId, htmlContent);
      } catch (driveError: any) {
        const msg = driveError?.message || "";
        if (msg.includes("403") || msg.includes("insufficient") || msg.includes("Insufficient Permission")) {
          return res.status(403).json({
            message: "Insufficient Google Drive permissions. Please reconnect your Google Drive with updated permissions.",
            code: "drive_auth_required",
          });
        }
        throw driveError;
      }

      const attachment = await driveAttachmentsStorage.createAttachment({
        entityType: "deal",
        entityId: dealId,
        driveFileId: docResult.id,
        name: docResult.name,
        mimeType: docResult.mimeType,
        webViewLink: docResult.webViewLink,
        attachedById: userId,
      });

      const attachmentWithUser = await driveAttachmentsStorage.getAttachmentById(attachment.id);

      await logAuditEvent(req, {
        action: "create",
        entityType: "drive_attachment",
        entityId: attachment.id,
        status: "success",
        metadata: { source: "generate_doc", dealId, docId: docResult.id },
      });

      res.json({
        doc: docResult,
        attachment: attachmentWithUser,
      });
    } catch (error) {
      console.error("Error generating deal doc:", error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });
}

function buildDealDocHtml(deal: DealWithRelations, servicesMap: Map<number, string>): string {
  const escape = (str: string | null | undefined) =>
    (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const ownerName = deal.owner
    ? [deal.owner.firstName, deal.owner.lastName].filter(Boolean).join(" ")
    : "Unassigned";

  const clientName = deal.client?.name || "No client";

  const serviceIds = (deal.serviceIds as number[]) || [];
  const serviceNames = serviceIds
    .map((id) => servicesMap.get(id))
    .filter(Boolean)
    .join(", ");

  const locations = (deal.locations as DealLocation[]) || [];
  const locationNames = locations.map((l) => l.displayName).join(", ");

  const events = (deal.eventSchedule as DealEvent[]) || [];
  const eventLines = events.map((ev) => {
    const scheduleInfo = ev.schedules
      .map((s) => {
        if (s.startDate) return s.startDate;
        if (s.rangeStartMonth && s.rangeStartYear) {
          const startLabel = `${s.rangeStartMonth}/${s.rangeStartYear}`;
          if (s.rangeEndMonth && s.rangeEndYear) {
            return `${startLabel} - ${s.rangeEndMonth}/${s.rangeEndYear}`;
          }
          return startLabel;
        }
        return "TBD";
      })
      .join(", ");
    return `<li><strong>${escape(ev.label)}</strong> (${ev.durationDays} day${ev.durationDays !== 1 ? "s" : ""}) &mdash; ${scheduleInfo}</li>`;
  });

  const budgetRange =
    deal.budgetLow || deal.budgetHigh
      ? `$${(deal.budgetLow || 0).toLocaleString()} - $${(deal.budgetHigh || 0).toLocaleString()}`
      : "Not specified";

  const sections: string[] = [];

  sections.push(`<h1>${escape(deal.displayName)}</h1>`);
  sections.push(`<p style="color:#666;font-size:12px;">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>`);
  sections.push(`<hr/>`);

  sections.push(`<h2>Deal Overview</h2>`);
  sections.push(`<table style="border-collapse:collapse;width:100%;">`);
  sections.push(tableRow("Client", escape(clientName)));
  sections.push(tableRow("Status", escape(deal.statusName || "Unknown")));
  sections.push(tableRow("Owner", escape(ownerName)));
  if (deal.brand) sections.push(tableRow("Brand", escape(deal.brand.name)));
  if (serviceNames) sections.push(tableRow("Services", escape(serviceNames)));
  sections.push(tableRow("Budget Range", escape(budgetRange)));
  if (deal.budgetNotes) sections.push(tableRow("Budget Notes", escape(deal.budgetNotes)));
  sections.push(`</table>`);

  if (locationNames) {
    sections.push(`<h2>Locations</h2>`);
    sections.push(`<p>${escape(locationNames)}</p>`);
  }

  if (events.length > 0) {
    sections.push(`<h2>Event Schedule</h2>`);
    sections.push(`<ul>${eventLines.join("")}</ul>`);
  }

  if (deal.concept) {
    sections.push(`<h2>Concept</h2>`);
    sections.push(`<p>${escape(deal.concept)}</p>`);
  }

  if (deal.nextSteps) {
    sections.push(`<h2>Next Steps</h2>`);
    sections.push(`<p>${escape(deal.nextSteps)}</p>`);
  }

  if (deal.notes) {
    sections.push(`<h2>Notes</h2>`);
    sections.push(`<p>${escape(deal.notes)}</p>`);
  }

  if (deal.primaryContact) {
    sections.push(`<h2>Primary Contact</h2>`);
    const contactName = [deal.primaryContact.firstName, deal.primaryContact.lastName].filter(Boolean).join(" ");
    sections.push(`<p>${escape(contactName)}`);
    if (deal.primaryContact.jobTitle) sections.push(` &mdash; ${escape(deal.primaryContact.jobTitle)}`);
    sections.push(`</p>`);
  }

  return `<html><body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">${sections.join("\n")}</body></html>`;
}

function tableRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`;
}
