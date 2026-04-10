import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LocationSearch } from "@/components/location-search";
import type { DealLocation } from "@shared/schema";
import type { ICellEditorParams } from "ag-grid-community";

interface LocationsCellEditorProps extends ICellEditorParams {
  value: DealLocation[] | null;
}

export interface LocationsCellEditorRef {
  getValue: () => DealLocation[];
  isPopup: () => boolean;
  focusIn: () => void;
}

export const LocationsCellEditor = forwardRef<LocationsCellEditorRef, LocationsCellEditorProps>(
  (props, ref) => {
    const { value } = props;

    const valueRef = useRef<DealLocation[]>(value || []);
    const [locations, setLocations] = useState<DealLocation[]>(value || []);
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

    const handleChange = useCallback((newLocations: DealLocation[]) => {
      valueRef.current = newLocations;
      setLocations(newLocations);
    }, []);

    const handleDone = useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const field = props.column.getColId();
      if (props.node && field) {
        props.node.setDataValue(field, valueRef.current);
      }

      props.api?.stopEditing();
    }, [props.api, props.column, props.node]);

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg p-3 min-w-[320px] max-w-lg"
        tabIndex={0}
        data-testid="locations-cell-editor"
      >
        <LocationSearch
          value={locations}
          onChange={handleChange}
          testId="locations-cell-editor-search"
        />
        <div className="pt-2 border-t mt-2">
          <Button variant="secondary" size="sm" onClick={handleDone} className="w-full" data-testid="button-locations-editor-done">
            Done
          </Button>
        </div>
      </div>
    );
  }
);

LocationsCellEditor.displayName = "LocationsCellEditor";
