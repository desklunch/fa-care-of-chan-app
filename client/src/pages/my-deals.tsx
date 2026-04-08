import { useCallback, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CellValueChangedEvent } from "ag-grid-community";
import { PageLayout } from "@/framework";
import { DataGridPage } from "@/components/data-grid";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { NoPermissionMessage } from "@/components/no-permission-message";
import type {
  DealWithRelations,
  DealService,
  User as UserType,
} from "@shared/schema";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  dealColumns,
  dealFilters,
  DEFAULT_VISIBLE_COLUMNS,
  createStatusComparator,
} from "@/pages/deals-sandbox";
import type {
  DealLinkedClientEntry,
  DealTagEntry,
  DealsGridContext,
} from "@/pages/deals-sandbox";

const myDealFilters = dealFilters.filter((f) => f.id !== "owner");

export default function MyDealsPage() {
  usePageTitle("My Deals");
  const [, setLocation] = useProtectedLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const { user: currentUser } = useAuth();
  const canWrite = can("deals.write");

  const { statuses: dealStatusList } = useDealStatuses();
  const statusSortOrderByName = useMemo(() => {
    return new Map(dealStatusList.map((s) => [s.name, s.sortOrder]));
  }, [dealStatusList]);

  const { data: users = [] } = useQuery<
    Array<Pick<UserType, "id" | "firstName" | "lastName" | "role" | "isActive">>
  >({
    queryKey: ["/api/users"],
  });

  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = new Map(dealServices.map((s) => [s.id, s]));

  const { data: allLinkedClients = [] } = useQuery<DealLinkedClientEntry[]>({
    queryKey: ["/api/deals/all-linked-clients"],
  });

  const linkedClientsMap = useMemo(() => {
    const map = new Map<string, DealLinkedClientEntry[]>();
    for (const entry of allLinkedClients) {
      const existing = map.get(entry.dealId) || [];
      existing.push(entry);
      map.set(entry.dealId, existing);
    }
    return map;
  }, [allLinkedClients]);

  const { data: allDealTags = [] } = useQuery<DealTagEntry[]>({
    queryKey: ["/api/deals/all-deal-tags"],
  });

  const dealTagsMap = useMemo(() => {
    const map = new Map<string, DealTagEntry[]>();
    for (const entry of allDealTags) {
      const existing = map.get(entry.dealId) || [];
      existing.push(entry);
      map.set(entry.dealId, existing);
    }
    return map;
  }, [allDealTags]);

  const gridContext: DealsGridContext = {
    users,
    services: dealServices,
    servicesMap,
    linkedClientsMap,
    dealTagsMap,
    dealStatuses: dealStatusList,
  };

  const mobileColumnConfig: Record<
    string,
    {
      pinned?: "left" | "right" | boolean;
      lockPinned?: boolean;
      width?: number;
      minWidth?: number;
      maxWidth?: number;
      resizable?: boolean;
      flex?: number;
      headerName?: string;
      editable?: boolean;
    }
  > = {
    displayName: {
      flex: 1,
      resizable: false,
      editable: false,
      minWidth: 180,
      pinned: false,
      lockPinned: false,
    },
    owner: {
      flex: 0,
      width: 60,
      resizable: false,
      headerName: "",
      editable: false,
    },
    status: {
      flex: 0,
      width: 50,
      resizable: false,
      headerName: "",
      editable: false,
    },
  };

  const columnsWithStatusSort = useMemo(() => {
    const comparator = createStatusComparator(statusSortOrderByName);
    return dealColumns.map((col) =>
      col.id === "status"
        ? { ...col, colDef: { ...col.colDef, comparator } }
        : col,
    );
  }, [statusSortOrderByName]);

  const responsiveColumns = useMemo(() => {
    if (!isMobile) return columnsWithStatusSort;

    const mobileColumnIds = Object.keys(mobileColumnConfig);

    return columnsWithStatusSort
      .filter((col) => mobileColumnIds.includes(col.id))
      .map((col) => {
        const {
          pinned,
          lockPinned,
          width,
          minWidth,
          maxWidth,
          resizable,
          flex,
          ...restColDef
        } = col.colDef || {};
        const mobileConfig = mobileColumnConfig[col.id] || {};
        return {
          ...col,
          colDef: {
            ...restColDef,
            ...mobileConfig,
          },
        };
      });
  }, [isMobile, columnsWithStatusSort]);

  const transformData = useCallback(
    (data: DealWithRelations[]) => {
      if (!currentUser?.id) return [];
      return data.filter((deal) => deal.ownerId === currentUser.id);
    },
    [currentUser?.id],
  );

  const updateDealMutation = useMutation({
    mutationFn: async ({
      dealId,
      updates,
    }: {
      dealId: string;
      updates: Record<string, unknown>;
    }) => {
      return apiRequest("PATCH", `/api/deals/${dealId}`, updates);
    },
    onMutate: async ({ dealId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/deals"] });
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>([
        "/api/deals",
      ]);
      if (previousDeals) {
        queryClient.setQueryData<DealWithRelations[]>(["/api/deals"], (old) => {
          if (!old) return old;
          return old.map((deal) => {
            if (deal.id === dealId) {
              const updatedDeal = { ...deal, ...updates };
              if (updates.ownerId !== undefined) {
                const user = users.find((u) => u.id === updates.ownerId);
                if (user) {
                  updatedDeal.owner = { ...user } as typeof deal.owner;
                } else if (updates.ownerId === "" || updates.ownerId === null) {
                  updatedDeal.owner = null;
                }
              }
              return updatedDeal as DealWithRelations;
            }
            return deal;
          });
        });
      }
      return { previousDeals };
    },
    onError: (error, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["/api/deals"], context.previousDeals);
      }
      toast({
        title: "Failed to save changes",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating deal:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<DealWithRelations>) => {
      const { data, colDef, newValue, oldValue } = event;
      if (!data?.id || !colDef.field) return;

      const field = colDef.field as string;
      let processedValue: unknown = newValue;

      if (field === "serviceIds") {
        const oldIds = (oldValue as number[] | null) || [];
        const newIds = (newValue as number[] | null) || [];
        if (
          oldIds.length === newIds.length &&
          oldIds.every((id, i) => id === newIds[i])
        ) {
          return;
        }
        processedValue = newIds;
      } else {
        if (newValue === oldValue) return;
      }

      if (field === "statusName") {
        const statusId =
          typeof data.status === "number"
            ? data.status
            : parseInt(String(data.status), 10);
        if (!isNaN(statusId)) {
          const updates: Record<string, unknown> = { status: statusId };
          updateDealMutation.mutate({ dealId: data.id, updates });
        }
        return;
      }

      if (field === "ownerId") {
        processedValue = data.ownerId;
        if (processedValue === "") {
          processedValue = null;
        }
      }

      const dateFields = [
        "startedOn",
        "wonOn",
        "lastContactOn",
        "proposalSentOn",
        "projectDate",
      ];
      if (dateFields.includes(field)) {
        processedValue = newValue === "" ? null : newValue;
      }

      const nullableIdFields = ["clientId"];
      if (nullableIdFields.includes(field) && newValue === "") {
        processedValue = null;
      }

      const nullableTextFields = [
        "concept",
        "notes",
        "nextSteps",
        "budgetNotes",
      ];
      if (nullableTextFields.includes(field) && newValue === "") {
        processedValue = null;
      }

      const updates: Record<string, unknown> = { [field]: processedValue };
      updateDealMutation.mutate({ dealId: data.id, updates });
    },
    [updateDealMutation],
  );

  const reorderMutation = useMutation({
    mutationFn: async (dealIds: string[]) => {
      return apiRequest("POST", "/api/deals/reorder", { dealIds });
    },
    onMutate: async (dealIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["/api/deals"] });
      const previousDeals = queryClient.getQueryData<DealWithRelations[]>([
        "/api/deals",
      ]);
      if (previousDeals) {
        const dealMap = new Map(previousDeals.map((d) => [d.id, d]));
        const reorderedDeals = dealIds
          .map((id) => dealMap.get(id))
          .filter((d): d is DealWithRelations => d !== undefined);
        queryClient.setQueryData(["/api/deals"], reorderedDeals);
      }
      return { previousDeals };
    },
    onError: (error, _dealIds, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["/api/deals"], context.previousDeals);
      }
      toast({
        title: "Failed to save order",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      });
      console.error("Error reordering deals:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
  });

  const handleRowDragEnd = (reorderedData: DealWithRelations[]) => {
    const dealIds = reorderedData.map((deal) => deal.id);
    reorderMutation.mutate(dealIds);
  };

  if (!canWrite) {
    return (
      <PageLayout breadcrumbs={[{ label: "My Deals" }]}>
        <NoPermissionMessage title="Permission Required" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={[{ label: "My Deals" }]}
    >
      <DataGridPage
        queryKey="/api/deals"
        columns={responsiveColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        searchFields={[
          "displayName",
          (deal) => `#${deal.dealNumber}`,
          "status",
          (deal) => deal.client?.name || "",
          (deal) => {
            const locations = deal.locations as Array<{
              displayName: string;
            }> | null;
            return locations?.map((loc) => loc.displayName).join(" ") || "";
          },
        ]}
        searchPlaceholder="Search my deals..."
        filters={myDealFilters}
        collapsibleFilters={true}
        context={gridContext}
        getRowId={(deal) => deal.id || ""}
        emptyMessage="No deals found"
        emptyDescription="You don't have any deals assigned to you yet."
        enableRowDrag={!isMobile}
        onRowDragEnd={handleRowDragEnd}
        onCellValueChanged={handleCellValueChanged}
        hideColumnSelector={isMobile}
        enableCellSelection={!isMobile}
        onRowClick={
          isMobile ? (deal) => setLocation(`/deals/${deal.id}`) : undefined
        }
        headerContent={undefined}
        transformData={transformData}
      />
    </PageLayout>
  );
}
