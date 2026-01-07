import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from "react";
import type { ICellEditorParams, ICellEditorComp } from "ag-grid-community";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectCellEditorParams extends ICellEditorParams {
  options: SelectOption[];
  placeholder?: string;
}

export interface SelectCellEditorRef {
  getValue: () => string | null;
  isCancelAfterEnd: () => boolean;
}

const SelectCellEditor = forwardRef<SelectCellEditorRef, SelectCellEditorParams>(
  (props, ref) => {
    const { options, placeholder = "Select...", stopEditing, column, node } = props;
    // Get the actual field value from the row data, not the display value from valueGetter
    const fieldName = column.getColDef().field;
    const initialValue = fieldName && node?.data ? node.data[fieldName] : null;
    const [selectedValue, setSelectedValue] = useState<string>(
      initialValue != null ? String(initialValue) : ""
    );
    const [open, setOpen] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => {
        if (selectedValue === "" || selectedValue === "__empty__") {
          return null;
        }
        return selectedValue;
      },
      isCancelAfterEnd: () => false,
    }));

    const handleValueChange = (newValue: string) => {
      setSelectedValue(newValue);
      setOpen(false);
      setTimeout(() => {
        stopEditing();
      }, 0);
    };

    const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setTimeout(() => {
          stopEditing();
        }, 0);
      }
    };

    return (
      <div ref={containerRef} className="w-full h-full flex items-center">
        <Select
          value={selectedValue}
          onValueChange={handleValueChange}
          open={open}
          onOpenChange={handleOpenChange}
        >
          <SelectTrigger 
            className="h-8 w-full border-0 bg-transparent focus:ring-0 focus:ring-offset-0"
            data-testid="select-cell-editor-trigger"
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__empty__" data-testid="select-option-empty">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                data-testid={`select-option-${option.value}`}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

SelectCellEditor.displayName = "SelectCellEditor";

export default SelectCellEditor;
