import { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from "react";
import type { ICellEditorParams } from "ag-grid-community";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectCellEditorProps extends ICellEditorParams {
  options: SelectOption[];
  placeholder?: string;
}

export interface SelectCellEditorRef {
  getValue: () => string | null;
  isPopup: () => boolean;
  focusIn: () => void;
}

/**
 * Custom cell editor following AG Grid's documented popup editor pattern.
 * 
 * Key implementation details for undo/redo compatibility:
 * 1. Store value in a ref (not just state) so getValue() returns the latest value synchronously
 * 2. Expose getValue() via useImperativeHandle - AG Grid calls this to get the final value
 * 3. Set __ag_Grid_Stop_Propagation flag on mouse events to prevent AG Grid from treating
 *    clicks inside the popup as "outside" clicks that would cancel the edit
 * 4. Call stopEditing() with no arguments (false) - this commits the changes and calls getValue()
 * 5. Set isPopup() to return true for popup editors
 */
const SelectCellEditor = forwardRef<SelectCellEditorRef, SelectCellEditorProps>(
  (props, ref) => {
    const { options = [], column, node } = props;
    
    // Get the actual field value from the row data
    const fieldName = column.getColDef().field;
    const initialValue = fieldName && node?.data ? node.data[fieldName] : null;
    
    // Use ref to store value immediately (React state updates are async)
    // This ensures getValue() always returns the latest selected value
    const valueRef = useRef<string | null>(
      initialValue != null ? String(initialValue) : null
    );
    const [selectedValue, setSelectedValue] = useState<string | null>(valueRef.current);
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose methods to AG Grid
    useImperativeHandle(ref, () => ({
      // AG Grid calls this to get the final value when editing stops
      getValue: () => {
        console.log('[SelectCellEditor] getValue called, returning:', valueRef.current);
        return valueRef.current;
      },
      // Mark this as a popup editor
      isPopup: () => true,
      // Focus handler for the editor
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

    const handleSelect = useCallback((value: string | null, event: React.MouseEvent) => {
      // Prevent AG Grid from treating this as an outside click
      preventAgGridClose(event);
      event.preventDefault();
      
      // Update the ref immediately (synchronous) so getValue() returns correct value
      const previousValue = valueRef.current;
      valueRef.current = value;
      setSelectedValue(value);
      
      console.log('[SelectCellEditor] handleSelect called:', { 
        previousValue, 
        newValue: value, 
        fieldName,
        valueRefAfterSet: valueRef.current 
      });
      
      // Use setTimeout to ensure state is updated before AG Grid calls getValue()
      // stopEditing() with no arguments (or false) commits the edit and calls getValue()
      setTimeout(() => {
        console.log('[SelectCellEditor] Calling stopEditing, getValue will return:', valueRef.current);
        props.api?.stopEditing();
      }, 0);
    }, [props.api, fieldName, preventAgGridClose]);

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg min-w-[240px]"
        tabIndex={0}
        data-testid="select-cell-editor"
        onMouseDown={preventAgGridClose}
        onClick={preventAgGridClose}
      >
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            <div
              className={cn(
                "flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-sm text-sm",
                selectedValue === null && "bg-accent"
              )}
              onClick={(e) => handleSelect(null, e)}
              data-testid="select-option-empty"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {selectedValue === null && <Check className="h-4 w-4" />}
              </span>
              <span className="text-muted-foreground">None</span>
            </div>
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-sm text-sm",
                  selectedValue === option.value && "bg-accent"
                )}
                onClick={(e) => handleSelect(option.value, e)}
                data-testid={`select-option-${option.value}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {selectedValue === option.value && <Check className="h-4 w-4" />}
                </span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

SelectCellEditor.displayName = "SelectCellEditor";

export default SelectCellEditor;
