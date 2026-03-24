import { useQuery } from "@tanstack/react-query";
import type { DealStatusRecord } from "@shared/schema";

export function useDealStatuses() {
  const { data: statuses = [], isLoading } = useQuery<DealStatusRecord[]>({
    queryKey: ["/api/deal-statuses"],
    staleTime: 5 * 60 * 1000,
  });

  const activeStatuses = statuses.filter((s) => s.isActive);
  const statusNames = activeStatuses.map((s) => s.name);
  const statusMap = new Map(statuses.map((s) => [s.name, s]));
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const defaultStatus = statuses.find((s) => s.isDefault);

  return {
    statuses,
    activeStatuses,
    statusNames,
    statusMap,
    statusById,
    defaultStatus,
    isLoading,
  };
}
