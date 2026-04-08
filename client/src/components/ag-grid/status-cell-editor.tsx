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

    const fieldName = column.getColDef().field || "statusName";
    const colId = column.getColId();

    console.log("[StatusCellEditor] MOUNTED", {
      value,
      fieldName,
      colId,
      currentStatusId: currentStatus?.id,
      statusCount: statuses.length,
      nodeId: node?.id,
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
      console.log("[StatusCellEditor] Setting up native event listeners on container");
      const handler = (e: MouseEvent) => {
        (e as any).__ag_Grid_Stop_Propagation = true;
        console.log("[StatusCellEditor] Native", e.type, "- set __ag_Grid_Stop_Propagation", {
          target: (e.target as HTMLElement)?.tagName,
          targetClass: (e.target as HTMLElement)?.className?.substring(0, 50),
        });
      };
      el.addEventListener("mousedown", handler, true);
      el.addEventListener("click", handler, true);
      containerRef.current?.focus();
      return () => {
        console.log("[StatusCellEditor] UNMOUNTING - removing listeners");
        el.removeEventListener("mousedown", handler, true);
        el.removeEventListener("click", handler, true);
      };
    }, []);

    const handleSelect = useCallback(
      (statusId: number, statusName: string) => {
        console.log("[StatusCellEditor] handleSelect called:", {
          statusId,
          statusName,
          previousValueRef: valueRef.current,
          fieldName,
          colId,
          nodeExists: !!node,
        });

        valueRef.current = statusId;
        setSelectedId(statusId);

        if (node && fieldName) {
          console.log("[StatusCellEditor] Calling node.setDataValue:", { fieldName, statusId });
          try {
            const result = node.setDataValue(fieldName, statusId);
            console.log("[StatusCellEditor] setDataValue result:", result);
          } catch (err) {
            console.error("[StatusCellEditor] setDataValue ERROR:", err);
          }
        } else {
          console.warn("[StatusCellEditor] Cannot setDataValue - node:", !!node, "fieldName:", fieldName);
        }

        console.log("[StatusCellEditor] Calling stopEditing");
        props.api?.stopEditing();
      },
      [props.api, fieldName, colId, node],
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
                console.log("[StatusCellEditor] Option mousedown:", status.name);
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                console.log("[StatusCellEditor] Option onClick:", status.name, status.id);
                e.preventDefault();
                e.stopPropagation();
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
