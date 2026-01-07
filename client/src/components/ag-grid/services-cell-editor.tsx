import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { DealService } from "@shared/schema";
import type { ICellEditorParams } from "ag-grid-community";

interface ServicesCellEditorProps extends ICellEditorParams {
  value: number[] | null;
  context: {
    services: DealService[];
    servicesMap: Map<number, DealService>;
  };
}

export interface ServicesCellEditorRef {
  getValue: () => number[];
  isPopup: () => boolean;
  focusIn: () => void;
}

/**
 * Custom cell editor for multi-select services.
 * Follows AG Grid's documented popup editor pattern for undo/redo compatibility.
 * Uses native DOM event listeners with { capture: true } to intercept events before AG Grid.
 */
export const ServicesCellEditor = forwardRef<ServicesCellEditorRef, ServicesCellEditorProps>(
  (props, ref) => {
    const { value, context } = props;
    
    // Use ref to store value immediately (React state updates are async)
    const valueRef = useRef<number[]>(value || []);
    const [selectedIds, setSelectedIds] = useState<number[]>(value || []);
    const containerRef = useRef<HTMLDivElement>(null);

    const services = context?.services?.filter((s) => s.isActive) || [];

    // Expose methods to AG Grid
    useImperativeHandle(ref, () => ({
      getValue: () => {
        console.log('[ServicesCellEditor] getValue called, returning:', valueRef.current);
        return valueRef.current;
      },
      isPopup: () => true,
      focusIn: () => {
        containerRef.current?.focus();
      },
    }));

    // Add native DOM event listeners with { capture: true } to intercept events before AG Grid
    // Set the __ag_Grid_Stop_Propagation flag to tell AG Grid to ignore this event
    // IMPORTANT: Don't call stopPropagation() or it will block our React click handlers!
    useEffect(() => {
      const handleDocumentMouseDown = (event: MouseEvent) => {
        if (containerRef.current?.contains(event.target as Node)) {
          (event as any).__ag_Grid_Stop_Propagation = true;
          console.log('[ServicesCellEditor] Set __ag_Grid_Stop_Propagation flag on mousedown');
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

    const handleToggle = useCallback((serviceId: number, checked: boolean) => {
      if (checked) {
        valueRef.current = [...valueRef.current, serviceId];
        setSelectedIds(valueRef.current);
      } else {
        valueRef.current = valueRef.current.filter((id) => id !== serviceId);
        setSelectedIds(valueRef.current);
      }
    }, []);

    const handleDone = useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('[ServicesCellEditor] handleDone called, value:', valueRef.current);
      
      // Use setDataValue directly instead of relying on getValue()
      // AG Grid's popup editor handling has a bug where it doesn't call getValue()
      // when the user clicks inside the popup. setDataValue bypasses this issue
      // and still triggers onCellValueChanged for server persistence.
      const field = props.column.getColId();
      if (props.node && field) {
        console.log('[ServicesCellEditor] Using setDataValue to update:', { field, value: valueRef.current });
        props.node.setDataValue(field, valueRef.current);
      }
      
      // Stop editing (this will cancel without calling getValue, which is fine
      // since we already updated the value via setDataValue)
      props.api?.stopEditing();
    }, [props.api, props.column, props.node]);

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg p-2 min-w-[200px]"
        tabIndex={0}
      >
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
              >
                <Checkbox
                  checked={selectedIds.includes(service.id)}
                  onCheckedChange={(checked) =>
                    handleToggle(service.id, checked === true)
                  }
                  className="border-input"
                />
                <span className="text-sm">{service.name}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-2 border-t mt-2">
          <Button variant="secondary" size="sm" onClick={handleDone} className="w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }
);

ServicesCellEditor.displayName = "ServicesCellEditor";
