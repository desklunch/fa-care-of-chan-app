import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, DealKanbanCard, type KanbanColumn } from "@/components/kanban";
import { Loader2 } from "lucide-react";
import type { Deal, DealStatus } from "@shared/schema";

const SNAPSHOT_STATUSES: DealStatus[] = [
  "Warm Lead",
  "Prospecting",
  "Proposal",
  "Feedback",
  "Contracting",
];

const STATUS_COLORS: Record<string, string> = {
  "Warm Lead": "var(--status-warm-lead)",
  "Prospecting": "var(--status-prospecting)",
  "Proposal": "var(--status-proposal)",
  "Feedback": "var(--status-feedback)",
  "Contracting": "var(--status-contracting)",
};

const REPORT_TABS = [
  { id: "snapshot", label: "14 Day Snapshot" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["id"];

function isValidTab(tab: string | null): tab is ReportTab {
  return REPORT_TABS.some((t) => t.id === tab);
}

function SnapshotView() {
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date;
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (!SNAPSHOT_STATUSES.includes(deal.status as DealStatus)) {
        return false;
      }
      if (!deal.lastContactOn) {
        return false;
      }
      const lastContact = new Date(deal.lastContactOn);
      return lastContact >= thirtyDaysAgo;
    });
  }, [deals, thirtyDaysAgo]);

  const columns: KanbanColumn<Deal>[] = useMemo(() => {
    return SNAPSHOT_STATUSES.map((status) => ({
      id: status.toLowerCase().replace(/\s+/g, "-"),
      title: status,
      color: STATUS_COLORS[status] || "#888888",
      items: filteredDeals.filter((deal) => deal.status === status),
    }));
  }, [filteredDeals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <Kanban
        columns={columns}
        renderCard={(deal) => <DealKanbanCard deal={deal} />}
        emptyMessage="No deals"
        className="h-full"
      />
    </div>
  );
}

export default function DealReports() {
  const [location, setLocation] = useLocation();
  
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const tabParam = searchParams.get("tab");
  const activeTab: ReportTab = isValidTab(tabParam) ? tabParam : "snapshot";

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setLocation(`/deals/reports?tab=${value}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 md:px-6 border-b">

        {REPORT_TABS.length > 0 && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
            <TabsList>
              {REPORT_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-4 md:p-6">
        {activeTab === "snapshot" && <SnapshotView />}
      </div>
    </div>
  );
}
