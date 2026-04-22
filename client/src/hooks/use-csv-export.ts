import { useCallback, useRef } from "react";
import {
  buildCsvFilename,
  downloadRowsAsCsv,
  type CsvColumn,
} from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";

export interface UseCsvExportOptions<T, C = undefined> {
  filenamePrefix: string;
  columns: CsvColumn<T, C>[];
  getContext?: () => C;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function useCsvExport<T, C = undefined>(
  options: UseCsvExportOptions<T, C>,
) {
  const { toast } = useToast();
  const rowsRef = useRef<T[]>([]);

  const onFilteredDataChange = useCallback((rows: T[]) => {
    rowsRef.current = rows;
  }, []);

  const handleExport = useCallback(() => {
    const rows = rowsRef.current;
    if (rows.length === 0) {
      toast({
        title: options.emptyTitle ?? "Nothing to export",
        description:
          options.emptyDescription ??
          "There are no records matching the current filters.",
      });
      return;
    }
    const ctx = (options.getContext?.() ?? undefined) as C;
    downloadRowsAsCsv(
      rows,
      options.columns,
      ctx,
      buildCsvFilename(options.filenamePrefix),
    );
  }, [
    options.columns,
    options.filenamePrefix,
    options.getContext,
    options.emptyTitle,
    options.emptyDescription,
    toast,
  ]);

  return { onFilteredDataChange, handleExport };
}
