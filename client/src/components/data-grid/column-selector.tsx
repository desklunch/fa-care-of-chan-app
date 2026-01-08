import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { ColumnConfig } from "./types";
import { ListRestart, PanelTopClose } from "lucide-react";

interface ColumnSelectorProps<T> {
  columns: ColumnConfig<T>[];
  defaultVisibleColumns: string[];
  getColumnVisibility: (columnId: string) => boolean;
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}

export function ColumnSelector<T>({
  columns,
  defaultVisibleColumns,
  getColumnVisibility,
  onToggleColumn,
  onShowAll,
  onResetToDefaults,
}: ColumnSelectorProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleableColumns = useMemo(() => {
    return columns.filter((col) => col.toggleable !== false);
  }, [columns]);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="md"
          data-testid="button-column-selector"
          className={menuOpen ? "bg-foreground/30 rounded-full" : "bg-foreground/10 rounded-full"}
        >
          <Settings2 className="h-4 w-4" />
          
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="mt-1 bg-background border-border w-[100vw] md:w-72 max-h-[500px] rounded-none md:rounded-md flex flex-col"
        data-testid="dropdown-column-selector"
      >
        <div className="flex gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onShowAll();
            }}
            className="w-full text-xs h-8"
            data-testid="button-show-all-columns"
          >
            Show All
          </Button>
   
        </div>

        <DropdownMenuSeparator />

        <div className="overflow-y-auto flex-1 py-2">
          {toggleableColumns.map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={getColumnVisibility(col.id)}
              onCheckedChange={() => onToggleColumn(col.id)}
              onSelect={(e) => e.preventDefault()}
              data-testid={`checkbox-column-${col.id}`}
            >
              {col.headerName}
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        <div className="flex gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onResetToDefaults();
            }}
            className="w-full text-xs h-8"
            data-testid="button-reset-columns"
          >
            <ListRestart className="h-4 w-4"/>

            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8"
            onClick={() => setMenuOpen(false)}
            data-testid="button-close-column-selector"
          >
            <PanelTopClose className="h-4 w-4" />

            Close
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
