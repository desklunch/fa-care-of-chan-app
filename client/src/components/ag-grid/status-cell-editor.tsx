import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import type { ICellEditorParams } from "ag-grid-community";
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

const StatusCellEditor = forwardRef<any, StatusCellEditorProps>(
  (props, ref) => {
    const { value, context, column, node } = props;

    const statuses = context?.dealStatuses || [];
    const currentStatus = statuses.find((s) => s.name === value);
    const valueRef = useRef<number | null>(currentStatus?.id ?? null);
    const [selectedId, setSelectedId] = useState<number | null>(valueRef.current);
    const containerRef = useRef<HTMLDivElement>(null);

    const colId = column.getColId();
    const fieldName = column.getColDef().field;

    console.log("[StatusCellEditor] MOUNTED", {
      value,
      colId,
      fieldName,
      currentStatusId: currentStatus?.id,
      statusCount: statuses.length,
    });

    useImperativeHandle(ref, () => ({
      getValue: () => {
        console.log("[StatusCellEditor] getValue called, returning:", valueRef.current);
        return valueRef.current;
      },
      isPopup: () => true,
      isCancelAfterEnd: () => false,
      focusIn: () => {
        containerRef.current?.focus();
      },
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const preventAgGridClose = (e: MouseEvent) => {
        (e as any).__ag_Grid_Stop_Propagation = true;
      };
      el.addEventListener("mousedown", preventAgGridClose, true);
      el.addEventListener("click", preventAgGridClose, true);
      el.focus();
      return () => {
        console.log("[StatusCellEditor] UNMOUNTING");
        el.removeEventListener("mousedown", preventAgGridClose, true);
        el.removeEventListener("click", preventAgGridClose, true);
      };
    }, []);

    const handleSelect = useCallback(
      (statusId: number, statusName: string) => {
        console.log("[StatusCellEditor] handleSelect:", { statusId, statusName });
        valueRef.current = statusId;
        setSelectedId(statusId);

        console.log("[StatusCellEditor] Trying setDataValue with Column object");
        try {
          const r1 = node.setDataValue(column, statusId);
          console.log("[StatusCellEditor] setDataValue(column, statusId) result:", r1);
        } catch (e1) {
          console.error("[StatusCellEditor] setDataValue(column) error:", e1);
          try {
            console.log("[StatusCellEditor] Trying setDataValue with colId:", colId);
            const r2 = node.setDataValue(colId, statusId);
            console.log("[StatusCellEditor] setDataValue(colId) result:", r2);
          } catch (e2) {
            console.error("[StatusCellEditor] setDataValue(colId) error:", e2);
            try {
              console.log("[StatusCellEditor] Trying setDataValue with fieldName:", fieldName);
              const r3 = node.setDataValue(fieldName!, statusId);
              console.log("[StatusCellEditor] setDataValue(fieldName) result:", r3);
            } catch (e3) {
              console.error("[StatusCellEditor] setDataValue(fieldName) error:", e3);
            }
          }
        }

        props.api?.stopEditing();
      },
      [props.api, column, colId, fieldName, node],
    );

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg min-w-[200px]"
        tabIndex={0}
        data-testid="status-cell-editor"
      >
        <div className="max-h-[280px] overflow-y-auto p-1">
          {statuses.map((status) => (
            <div
              key={status.id}
              className={cn(
                "flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-sm",
                selectedId === status.id && "bg-accent",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[StatusCellEditor] onClick:", status.name, status.id);
                handleSelect(status.id, status.name);
              }}
              data-testid={`status-option-${status.id}`}
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {selectedId === status.id && <Check className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0 pointer-events-none">
                <DealStatusBadge status={status.name} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

StatusCellEditor.displayName = "StatusCellEditor";

export default StatusCellEditor;
