import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kanban, DealKanbanCard, type KanbanColumn } from "@/components/kanban";
import { Loader2, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealStatusBadge } from "@/components/deal-status-badge";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { gridTheme } from "@/lib/ag-grid-theme";
import ReactMarkdown from "react-markdown";
import type { Deal, DealStatus, DealWithRelations, DealService, User as UserType } from "@shared/schema";
import { usePageHeader } from "@/framework/hooks/page-header-context";

ModuleRegistry.registerModules([AllCommunityModule]);

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
  { id: "snapshot-30", label: "30 Day New Biz" },
  { id: "susanas-deals", label: "Susana's Deals" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["id"];

function isValidTab(tab: string | null): tab is ReportTab {
  return REPORT_TABS.some((t) => t.id === tab);
}

function getUserFullName(user: Pick<UserType, "firstName" | "lastName"> | null | undefined): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "";
}

function getInitials(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function SnapshotViewSusana() {
  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = useMemo(() => {
    return new Map(dealServices.map((s) => [s.id, s.name]));
  }, [dealServices]);

  const SUSANA_USER_ID = "117918891533678026073";

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Filter by owner (Susana)
      if (deal.ownerId !== SUSANA_USER_ID) {
        return false;
      }
      // Filter by status
      if (!SNAPSHOT_STATUSES.includes(deal.status as DealStatus)) {
        return false;
      }
      return true;
    });
  }, [deals]);

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
        renderCard={(deal) => <DealKanbanCard deal={deal} servicesMap={servicesMap} />}
        emptyMessage="No deals"
        className="h-full"
      />
    </div>
  );
}

function SnapshotView30() {
  const gridRef = useRef<AgGridReact<DealWithRelations>>(null);

  const { data: deals = [], isLoading } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/deals"],
  });

  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = useMemo(() => {
    return new Map(dealServices.map((s) => [s.id, s.name]));
  }, [dealServices]);

  const fourteenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
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
      return lastContact >= fourteenDaysAgo;
    });
  }, [deals, fourteenDaysAgo]);

  const columnDefs = useMemo(() => [
    {
      headerName: "Deal",
      field: "displayName" as const,
      flex: 2,
      minWidth: 240,
      maxWidth: 400,
      sortable: false,
      editable: false,
      cellRenderer: (params: { data: DealWithRelations; value: string }) => {
        if (!params.data) return null;
        return (
          <span className="flex items-start gap-3 w-full">
            <span className="flex-1 truncate">{params.value}</span>

          </span>
        );
      },
    },
    {
      headerName: "Status",
      field: "status" as const,
      flex: 1,
      minWidth: 130,
      maxWidth: 130,
      sortable: false,
      editable: false,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return null;
        return (
          <DealStatusBadge status={params.value as DealWithRelations["status"]} />
        );
      },
    },
    {
      headerName: "Owner",
      field: "ownerId" as const,
      flex: 1,
      minWidth: 90,
      maxWidth: 90,
      sortable: false,
      editable: false,
      valueGetter: (params: { data: DealWithRelations | undefined }) => {
        const owner = params.data?.owner;
        if (!owner) return "";
        return getInitials(getUserFullName(owner));
      },
      cellRenderer: (params: { value: string }) => {
        return <div>{params.value}</div>;
      },
    },
    {
      headerName: "Project Date",
      field: "projectDate" as const,
      flex: 1.5,
      minWidth: 130,
      sortable: false,
      editable: false,
    },
    {
      headerName: "Concept",
      field: "concept" as const,
      flex: 3,
      minWidth: 300,
      sortable: false,
      editable: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {params.value}
            </ReactMarkdown>
          </div>
        );
      },
    },
    {
      headerName: "Services",
      field: "serviceIds" as const,
      flex: 1,
      minWidth: 180,
      sortable: false,
      editable: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { data: DealWithRelations }) => {
        const serviceIds = params.data?.serviceIds || [];
        if (serviceIds.length === 0) return null;
        const serviceNames = serviceIds.map(id => servicesMap.get(id)).filter(Boolean) as string[];
        return (
          <div className="flex flex-wrap gap-1 pt-2.5">
            {serviceNames.map((service, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      headerName: "Budget Notes",
      field: "budgetNotes" as const,
      flex: 1,
      minWidth: 150,
      sortable: false,
      editable: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[16px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {params.value}
            </ReactMarkdown>
          </div>
        );
      },
    },
    {
      headerName: "Locations",
      field: "locationsText" as const,
      flex: 2,
      minWidth: 130,
      sortable: false,
      editable: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[14px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {params.value}
            </ReactMarkdown>
          </div>
        );
      },
    },
    {
      headerName: "Next Steps",
      field: "notes" as const,
      flex: 3,
      minWidth: 300,
      sortable: false,
      editable: false,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return null;
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none py-3 pt-[16px] [&>*]:my-0 [&>ul]:my-1 [&>ol]:my-1">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {params.value}
            </ReactMarkdown>
          </div>
        );
      },
    },
  ], [servicesMap]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: false,
    editable: false,
  }), []);

  const onGridReady = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <AgGridReact
        ref={gridRef}
        rowData={filteredDeals}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        theme={gridTheme}
        domLayout="normal"
        onGridReady={onGridReady}
        suppressMovableColumns={true}
        suppressColumnVirtualisation={true}
        getRowId={(params) => params.data.id}
      />
    </div>
  );
}

export default function DealReports() {
  const [location, setLocation] = useLocation();
  
  usePageHeader({
    breadcrumbs: [
      { label: "Deals", href: "/deals" },
      { label: "Views" },
    ],
  });

  const getInitialTab = (): ReportTab => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    return isValidTab(tabParam) ? tabParam : "snapshot-30";
  };

  const [activeTab, setActiveTab] = useState<ReportTab>(getInitialTab);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get("tab");
    if (isValidTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [location]);

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
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

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 md:p-6">
        {activeTab === "snapshot-30" && <SnapshotView30 />}
        {activeTab === "susanas-deals" && <SnapshotViewSusana />}
      </div>
    </div>
  );
}
