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
 * Uses a ref to store value synchronously so getValue() always returns the latest.
 * Uses __ag_Grid_Stop_Propagation flag to prevent clicks inside popup from closing the editor.
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

    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    /**
     * Prevents AG Grid from treating mouse events inside this popup as "outside" clicks.
     * AG Grid checks for __ag_Grid_Stop_Propagation flag on events to determine if
     * the event should be ignored for edit-closing purposes.
     */
    const preventAgGridClose = useCallback((event: React.MouseEvent) => {
      // Set the internal AG Grid flag to prevent this event from closing the editor
      (event.nativeEvent as any).__ag_Grid_Stop_Propagation = true;
      event.stopPropagation();
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
      // Prevent AG Grid from treating this as an outside click
      preventAgGridClose(event);
      
      // Queue stopEditing in the next event loop tick
      // stopEditing() with no arguments commits the edit and calls getValue()
      setTimeout(() => {
        console.log('[ServicesCellEditor] Calling stopEditing, getValue will return:', valueRef.current);
        props.api?.stopEditing();
      }, 0);
    }, [props.api, preventAgGridClose]);

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg p-2 min-w-[200px]"
        tabIndex={0}
        onMouseDown={preventAgGridClose}
        onClick={preventAgGridClose}
      >
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                onMouseDown={preventAgGridClose}
                onClick={preventAgGridClose}
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
