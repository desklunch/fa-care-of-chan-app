import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from "react";
import type { ICellEditorParams } from "ag-grid-community";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface RichTextCellEditorProps extends ICellEditorParams {
  value: string;
}

export interface RichTextCellEditorRef {
  getValue: () => string;
  isPopup: () => boolean;
  focusIn: () => void;
}

const RichTextCellEditor = forwardRef<RichTextCellEditorRef, RichTextCellEditorProps>(
  (props, ref) => {
    const [editValue, setEditValue] = useState(props.value || "");
    const containerRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<string>(props.value || "");

    const fieldName = props.column.getColDef().field;

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
            valueRef.current = props.value || "";
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
      if (props.node && fieldName) {
        props.node.setDataValue(fieldName, editValue);
      }
      props.api?.stopEditing();
    };

    const handleCancel = () => {
      valueRef.current = props.value || "";
      props.api?.stopEditing(true);
    };

    return (
      <div
        ref={containerRef}
        className="ag-custom-component-popup bg-background border rounded-md shadow-lg"
        style={{ width: "500px", maxHeight: "400px" }}
        tabIndex={0}
        data-testid="richtext-cell-editor"
      >
        <div className="p-3">
          <RichTextEditor
            value={editValue}
            onChange={(val) => {
              setEditValue(val);
              valueRef.current = val;
            }}
            placeholder="Enter content..."
            alwaysShowToolbar
            data-testid="richtext-cell-editor-input"
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              data-testid="button-richtext-cancel"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid="button-richtext-save"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

RichTextCellEditor.displayName = "RichTextCellEditor";

export default RichTextCellEditor;
