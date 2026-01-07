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
 * Key requirements for undo/redo compatibility:
 * 1. Store value in a ref (not just state) so getValue() returns the latest value synchronously
 * 2. Expose getValue() via useImperativeHandle - AG Grid calls this to get the final value
 * 3. Use setTimeout(0) to queue stopEditing() - ensures value is set before AG Grid queries it
 * 4. Call stopEditing() with no arguments (or false) - true means "cancel" which discards changes
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
      getValue: () => valueRef.current,
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

    const handleSelect = useCallback((value: string | null) => {
      // Update the ref immediately (synchronous) so getValue() returns correct value
      valueRef.current = value;
      // Update state for UI re-render
      setSelectedValue(value);
      
      // Queue stopEditing in the next event loop tick
      // This ensures the value is fully set before AG Grid calls getValue()
      // Using setTimeout(0) creates a macrotask that runs after React's state updates
      setTimeout(() => {
        props.api?.stopEditing();
      }, 0);
    }, [props.api]);

    return (
      <div
        ref={containerRef}
        className="bg-background border rounded-md shadow-lg min-w-[240px]"
        tabIndex={0}
        data-testid="select-cell-editor"
      >
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            <div
              className={cn(
                "flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-2 py-1.5 rounded-sm text-sm",
                selectedValue === null && "bg-accent"
              )}
              onClick={() => handleSelect(null)}
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
                onClick={() => handleSelect(option.value)}
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
