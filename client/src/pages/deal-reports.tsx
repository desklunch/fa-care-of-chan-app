import { useMemo, useCallback } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { NoPermissionMessage } from "@/components/no-permission-message";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { DealWithRelations } from "@shared/schema";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import { usePageHeader } from "@/framework/hooks/page-header-context";
import { DataGridPage } from "@/components/data-grid";
import { dealColumns } from "@/pages/deals-sandbox";
import { useDealsGridEditing } from "@/hooks/useDealsGridEditing";

ModuleRegistry.registerModules([AllCommunityModule]);

const SNAPSHOT_VISIBLE_COLUMNS = [
  "displayName",
  "status",
  "owner",
  "projectDate",
  "concept",
  "services",
  "budgetNotes",
  "locations",
  "nextSteps",
];

function SnapshotView14() {
  const { activeStatuses } = useDealStatuses();
  const { gridContext, handleCellValueChanged } = useDealsGridEditing();

  const activeStatusNames = useMemo(
    () =>
      activeStatuses
        .filter((s) => s.winProbability > 0 && s.winProbability < 100)
        .map((s) => s.name),
    [activeStatuses],
  );

  const fourteenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14);
    return date;
  }, []);

  const snapshotColumns = useMemo(() => {
    return dealColumns
      .filter((col) => SNAPSHOT_VISIBLE_COLUMNS.includes(col.id))
      .sort(
        (a, b) =>
          SNAPSHOT_VISIBLE_COLUMNS.indexOf(a.id) -
          SNAPSHOT_VISIBLE_COLUMNS.indexOf(b.id),
      );
  }, []);

  const transformDeals = useCallback(
    (deals: DealWithRelations[]) => {
      return deals.filter((deal) => {
        if (!activeStatusNames.includes(deal.statusName || "")) {
          return false;
        }
        if (!deal.lastContactOn) {
          return false;
        }
        const lastContact = new Date(deal.lastContactOn);
        return lastContact >= fourteenDaysAgo;
      });
    },
    [activeStatusNames, fourteenDaysAgo],
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <DataGridPage
        queryKey="/api/deals"
        columns={snapshotColumns}
        defaultVisibleColumns={SNAPSHOT_VISIBLE_COLUMNS}
        context={gridContext}
        transformData={transformDeals}
        onCellValueChanged={handleCellValueChanged}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals in the last 14 days"
        hideColumnSelector
        enableCellSelection
      />
    </div>
  );
}

export default function DealReports() {
  usePageHeader({
    breadcrumbs: [
      { label: "Deals", href: "/deals" },
      { label: "14 Day Snapshot" },
    ],
  });

  return (
    <PermissionGate
      permission="deals.read"
      behavior="fallback"
      fallback={
        <div className="p-6">
          <NoPermissionMessage
            title="Access Denied"
            message="You don't have permission to view deal reports. Please contact an administrator if you need access."
          />
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <SnapshotView14 />

      </div>
    </PermissionGate>
  );
}
