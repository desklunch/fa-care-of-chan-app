import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProposalWithRelations, ProposalStatusRecord } from "@shared/schema";
import type { ColumnConfig, FilterConfig } from "@/components/data-grid/types";
import { format } from "date-fns";
import { CircleFadingPlus, FileText, User, Download } from "lucide-react";
import { useCsvExport } from "@/hooks/use-csv-export";
import { formatCsvTimestamp, type CsvColumn } from "@/lib/csv-export";

const DEFAULT_VISIBLE_COLUMNS = ["title", "deal", "status", "owner", "createdAt"];

interface ProposalsGridContext {
  statuses: ProposalStatusRecord[];
  statusesMap: Map<number, ProposalStatusRecord>;
}

const proposalColumns: ColumnConfig<ProposalWithRelations>[] = [
  {
    id: "title",
    headerName: "Title",
    field: "title",
    category: "Basic Info",
    colDef: {
      flex: 2,
      minWidth: 200,
    },
  },
  {
    id: "deal",
    headerName: "Deal",
    field: "deal",
    category: "Basic Info",
    colDef: {
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params: { data: ProposalWithRelations }) => {
        const deal = params.data?.deal;
        if (!deal) return null;
        return (
          <span className="text-sm" data-testid={`text-deal-${params.data.id}`}>
            {deal.displayName}
          </span>
        );
      },
    },
  },
  {
    id: "status",
    headerName: "Status",
    field: "status",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: { data: ProposalWithRelations }) => {
        const color = params.data?.statusColor;
        const name = params.data?.statusName;
        if (!name) return null;
        return (
          <div className="flex items-center py-2.5">
            <Badge
              variant="secondary"
              className="text-xs"
              style={color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40` } : undefined}
              data-testid={`badge-status-${params.data.id}`}
            >
              {name}
            </Badge>
          </div>
        );
      },
    },
  },
  {
    id: "client",
    headerName: "Client",
    field: "client",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: ProposalWithRelations }) => {
        const client = params.data?.client;
        if (!client) return null;
        return (
          <span className="text-sm" data-testid={`text-client-${params.data.id}`}>
            {client.name}
          </span>
        );
      },
    },
  },
  {
    id: "owner",
    headerName: "Owner",
    field: "owner",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: { data: ProposalWithRelations }) => {
        const owner = params.data?.owner;
        if (!owner) return null;
        return (
          <div className="flex items-center gap-2 py-1" data-testid={`text-owner-${params.data.id}`}>
            <Avatar className="h-6 w-6">
              <AvatarImage src={owner.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {(owner.firstName?.[0] || "") + (owner.lastName?.[0] || "")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{owner.firstName} {owner.lastName}</span>
          </div>
        );
      },
    },
  },
  {
    id: "createdAt",
    headerName: "Created",
    field: "createdAt",
    category: "Basic Info",
    colDef: {
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: { data: ProposalWithRelations }) => {
        if (!params.data?.createdAt) return null;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(params.data.createdAt), "MMM d, yyyy")}
          </span>
        );
      },
    },
  },
];

const proposalFilters: FilterConfig<ProposalWithRelations>[] = [
  {
    id: "status",
    label: "Status",
    icon: FileText,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (_data, context) => {
        const ctx = context as ProposalsGridContext | undefined;
        if (!ctx?.statuses) return [];
        return ctx.statuses
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({ id: String(s.id), label: s.label }));
      },
    },
    matchFn: (proposal, selectedValues) => {
      return selectedValues.includes(String(proposal.status));
    },
  },
  {
    id: "owner",
    label: "Owner",
    icon: User,
    optionSource: {
      type: "deriveFromData",
      deriveOptions: (data) => {
        const owners = new Map<string, string>();
        data.forEach((p) => {
          if (p.owner?.id) {
            owners.set(p.owner.id, `${p.owner.firstName || ""} ${p.owner.lastName || ""}`.trim());
          }
        });
        return Array.from(owners.entries()).map(([id, label]) => ({ id, label }));
      },
    },
    matchFn: (proposal, selectedValues) => {
      return proposal.owner?.id ? selectedValues.includes(proposal.owner.id) : false;
    },
  },
];

const PROPOSAL_CSV_COLUMNS: CsvColumn<ProposalWithRelations>[] = [
  { header: "ID", get: (p) => p.id ?? "" },
  { header: "Title", get: (p) => p.title ?? "" },
  { header: "Deal ID", get: (p) => p.dealId ?? "" },
  { header: "Deal Name", get: (p) => p.deal?.displayName ?? "" },
  { header: "Deal Number", get: (p) => p.deal?.dealNumber ?? "" },
  { header: "Status", get: (p) => p.statusName ?? String(p.status ?? "") },
  { header: "Client ID", get: (p) => p.clientId ?? "" },
  { header: "Client Name", get: (p) => p.client?.name ?? "" },
  { header: "Owner ID", get: (p) => p.ownerId ?? "" },
  {
    header: "Owner",
    get: (p) =>
      p.owner ? `${p.owner.firstName ?? ""} ${p.owner.lastName ?? ""}`.trim() : "",
  },
  { header: "Description", get: (p) => p.description ?? "" },
  { header: "Budget Low", get: (p) => p.deal?.budgetLow ?? "" },
  { header: "Budget High", get: (p) => p.deal?.budgetHigh ?? "" },
  { header: "Budget Notes", get: (p) => p.deal?.budgetNotes ?? "" },
  {
    header: "Locations",
    get: (p) =>
      (p.deal?.locations ?? []).map((loc) => loc.displayName ?? "").filter(Boolean).join("; "),
  },
  {
    header: "Event Schedule",
    get: (p) => (p.deal?.eventSchedule ? JSON.stringify(p.deal.eventSchedule) : ""),
  },
  {
    header: "Service IDs",
    get: (p) => (p.deal?.serviceIds ?? []).join("; "),
  },
  { header: "Created By ID", get: (p) => p.createdById ?? "" },
  {
    header: "Created By",
    get: (p) =>
      p.createdBy
        ? `${p.createdBy.firstName ?? ""} ${p.createdBy.lastName ?? ""}`.trim()
        : "",
  },
  { header: "Created At", get: (p) => formatCsvTimestamp(p.createdAt) },
  { header: "Updated At", get: (p) => formatCsvTimestamp(p.updatedAt) },
];

export default function Proposals() {
  usePageTitle("Proposals");
  const [, setLocation] = useProtectedLocation();
  const { can } = usePermissions();
  const canCreate = can("proposals.write");

  const { data: statuses = [], isLoading: statusesLoading } = useQuery<ProposalStatusRecord[]>({
    queryKey: ["/api/proposals/statuses"],
  });

  const statusesMap = new Map(statuses.map((s) => [s.id, s]));

  const gridContext: ProposalsGridContext = {
    statuses,
    statusesMap,
  };

  const { onFilteredDataChange, handleExport } = useCsvExport<ProposalWithRelations>({
    filenamePrefix: "proposals",
    columns: PROPOSAL_CSV_COLUMNS,
    emptyDescription: "There are no proposals matching the current filters.",
  });

  return (
    <PageLayout
      breadcrumbs={[{ label: "Proposals" }]}
      primaryAction={
        canCreate
          ? {
              label: "New Proposal",
              href: "/proposals/new",
              icon: CircleFadingPlus,
            }
          : undefined
      }
      additionalActions={[
        {
          label: "Export CSV",
          icon: Download,
          variant: "outline",
          onClick: handleExport,
        },
      ]}
    >
      <DataGridPage
        queryKey="/api/proposals"
        columns={proposalColumns}
        filters={proposalFilters}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={["title"]}
        searchPlaceholder="Search proposals..."
        onRowClick={(proposal) => setLocation(`/proposals/${proposal.id}`)}
        getRowId={(proposal) => proposal.id || ""}
        emptyMessage="No proposals found"
        emptyDescription="Create a proposal from a qualified deal to get started."
        context={gridContext}
        isExternalDataLoading={statusesLoading}
        onFilteredDataChange={onFilteredDataChange}
      />
    </PageLayout>
  );
}
