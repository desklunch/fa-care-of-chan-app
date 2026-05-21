import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CellValueChangedEvent } from "ag-grid-community";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDealStatuses } from "@/hooks/useDealStatuses";
import type {
  DealWithRelations,
  DealService,
  DealLocation,
  User as UserType,
} from "@shared/schema";
import type {
  DealsGridContext,
  DealLinkedClientEntry,
  DealTagEntry,
} from "@/pages/deals-sandbox";

export function useDealsGridEditing() {
  const { toast } = useToast();
  const { statuses: dealStatusList } = useDealStatuses();

  const { data: users = [] } = useQuery<
    Array<Pick<UserType, "id" | "firstName" | "lastName" | "role" | "isActive">>
  >({
    queryKey: ["/api/users"],
  });

  const { data: dealServices = [] } = useQuery<DealService[]>({
    queryKey: ["/api/deal-services"],
  });

  const servicesMap = useMemo(
    () => new Map(dealServices.map((s) => [s.id, s])),
    [dealServices],
  );

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

  const handleDirectDealUpdate = useCallback(
    (dealId: string, updates: Record<string, unknown>) => {
      updateDealMutation.mutate({ dealId, updates });
    },
    [updateDealMutation],
  );

  const gridContext = useMemo<DealsGridContext>(
    () => ({
      users,
      services: dealServices,
      servicesMap,
      linkedClientsMap,
      dealTagsMap,
      dealStatuses: dealStatusList,
      onUpdateDeal: handleDirectDealUpdate,
    }),
    [
      users,
      dealServices,
      servicesMap,
      linkedClientsMap,
      dealTagsMap,
      dealStatusList,
      handleDirectDealUpdate,
    ],
  );

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
      } else if (field === "locations") {
        const oldLocs = (oldValue as DealLocation[] | null) || [];
        const newLocs = (newValue as DealLocation[] | null) || [];
        if (
          oldLocs.length === newLocs.length &&
          oldLocs.every((loc, i) => loc.placeId === newLocs[i]?.placeId)
        ) {
          return;
        }
        processedValue = newLocs;
      } else if (field === "eventSchedule") {
        return;
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
        processedValue = (data as any)[field] || null;
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

  return {
    users,
    dealServices,
    servicesMap,
    linkedClientsMap,
    dealTagsMap,
    dealStatusList,
    gridContext,
    updateDealMutation,
    handleCellValueChanged,
  };
}
