import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from "react";
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
}

const SelectCellEditor = forwardRef<SelectCellEditorRef, SelectCellEditorProps>(
  (props, ref) => {
    const { options = [], stopEditing, column, node } = props;
    
    // Get the actual field value from the row data
    const fieldName = column.getColDef().field;
    const initialValue = fieldName && node?.data ? node.data[fieldName] : null;
    
    // Use ref to store value immediately (React state updates are async)
    const valueRef = useRef<string | null>(
      initialValue != null ? String(initialValue) : null
    );
    const [selectedValue, setSelectedValue] = useState<string | null>(valueRef.current);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => {
        console.log("SelectCellEditor getValue called, returning:", valueRef.current);
        return valueRef.current;
      },
      isCancelAfterEnd: () => {
        console.log("SelectCellEditor isCancelAfterEnd called");
        return false;
      },
    }));

    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    const handleSelect = (value: string | null) => {
      console.log("SelectCellEditor handleSelect:", value);
      valueRef.current = value; // Update ref immediately
      setSelectedValue(value);  // Update state for UI
      // Use requestAnimationFrame to ensure the ref is updated before stopEditing
      requestAnimationFrame(() => {
        console.log("SelectCellEditor calling stopEditing, valueRef:", valueRef.current);
        if (props.api) {
          console.log("Using api.stopEditing()");
          props.api.stopEditing();
        } else {
          console.log("Using props.stopEditing()");
          stopEditing();
        }
      });
    };

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
