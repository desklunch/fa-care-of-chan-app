import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from "react";
import type { ICellEditorParams } from "ag-grid-community";
import { EventScheduleEditor } from "@/components/event-schedule";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { DealEvent } from "@shared/schema";

interface EventScheduleCellEditorProps extends ICellEditorParams {
  value: DealEvent[];
  context?: {
    onUpdateDeal?: (dealId: string, updates: Record<string, unknown>) => void;
  };
}

export interface EventScheduleCellEditorRef {
  getValue: () => DealEvent[];
  isPopup: () => boolean;
  focusIn: () => void;
}

const EventScheduleCellEditor = forwardRef<EventScheduleCellEditorRef, EventScheduleCellEditorProps>(
  (props, ref) => {
    const initialValue = (props.data?.eventSchedule as DealEvent[]) || [];
    const [editValue, setEditValue] = useState<DealEvent[]>(JSON.parse(JSON.stringify(initialValue)));
    const containerRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<DealEvent[]>(JSON.parse(JSON.stringify(initialValue)));

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

      const handleKeyDown = (event: KeyboardEvent) => {
        if (containerRef.current?.contains(event.target as Node)) {
          if (event.key === "Enter" || event.key === "Tab") {
            event.stopPropagation();
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            valueRef.current = JSON.parse(JSON.stringify(initialValue));
            props.api?.stopEditing(true);
          }
        }
      };

      document.addEventListener('mousedown', handleDocumentMouseDown, { capture: true });
      document.addEventListener('keydown', handleKeyDown, { capture: true });

      return () => {
        document.removeEventListener('mousedown', handleDocumentMouseDown, { capture: true });
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
      };
    }, []);

    const handleSave = () => {
      valueRef.current = editValue;
      const dealId = props.data?.id;
      if (dealId && props.context?.onUpdateDeal) {
        if (props.node) {
          const rowData = props.node.data;
          if (rowData) {
            rowData.eventSchedule = editValue;
          }
        }
        props.context.onUpdateDeal(dealId, { eventSchedule: editValue });
        props.api?.refreshCells({ rowNodes: [props.node], force: true });
      }
      props.api?.stopEditing(true);
    };

    const handleCancel = () => {
      valueRef.current = JSON.parse(JSON.stringify(initialValue));
      props.api?.stopEditing(true);
    };

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg"
        style={{ width: "620px", maxHeight: "500px", overflowY: "auto" }}
        tabIndex={0}
        data-testid="event-schedule-cell-editor"
      >
        <div className="p-3">
          <EventScheduleEditor
            value={editValue}
            onChange={(events) => {
              setEditValue(events);
              valueRef.current = events;
            }}
          />
          <div className="flex gap-2 justify-end mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              data-testid="button-event-schedule-cancel"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid="button-event-schedule-save"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

EventScheduleCellEditor.displayName = "EventScheduleCellEditor";

export default EventScheduleCellEditor;
