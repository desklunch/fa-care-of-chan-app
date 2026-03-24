import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import type { ICellEditorParams } from "ag-grid-community";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DealStatusBadge } from "@/components/deal-status-badge";
import type { DealStatusRecord } from "@shared/schema";

interface StatusCellEditorProps extends ICellEditorParams {
  value: string;
  context: {
    dealStatuses: DealStatusRecord[];
  };
}

export interface StatusCellEditorRef {
  getValue: () => number | null;
  isPopup: () => boolean;
  focusIn: () => void;
}

const StatusCellEditor = forwardRef<StatusCellEditorRef, StatusCellEditorProps>(
  (props, ref) => {
    const { value, context, column, node } = props;

    const statuses = context?.dealStatuses || [];

    const currentStatus = statuses.find((s) => s.name === value);
    const valueRef = useRef<number | null>(currentStatus?.id ?? null);
    const [selectedId, setSelectedId] = useState<number | null>(valueRef.current);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      isPopup: () => true,
      focusIn: () => {
        containerRef.current?.focus();
      },
    }));

    useEffect(() => {
      const handleDocumentMouseDown = (event: MouseEvent) => {
        if (containerRef.current?.contains(event.target as Node)) {
          (event as any).__ag_Grid_Stop_Propagation = true;
        }
      };

      document.addEventListener('mousedown', handleDocumentMouseDown, { capture: true });

      return () => {
        document.removeEventListener('mousedown', handleDocumentMouseDown, { capture: true });
      };
    }, []);

    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    const handleSelect = useCallback((statusId: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      valueRef.current = statusId;
      setSelectedId(statusId);

      const field = column.getColId();
      if (node && field) {
        node.setDataValue(field, statusId);
      }

      props.api?.stopEditing();
    }, [props.api, column, node]);

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg min-w-[200px]"
        tabIndex={0}
        data-testid="status-cell-editor"
      >
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            {statuses.map((status) => (
              <div
                key={status.id}
                className={cn(
                  "flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-sm",
                  selectedId === status.id && "bg-accent"
                )}
                onClick={(e) => handleSelect(status.id, e)}
                data-testid={`status-option-${status.id}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {selectedId === status.id && <Check className="h-4 w-4" />}
                </span>
                <DealStatusBadge status={status.name} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

StatusCellEditor.displayName = "StatusCellEditor";

export default StatusCellEditor;
