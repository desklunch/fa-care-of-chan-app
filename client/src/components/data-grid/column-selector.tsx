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

  const categorizedColumns = useMemo(() => {
    const categories: Record<string, ColumnConfig<T>[]> = {};
    columns
      .filter((col) => col.toggleable !== false)
      .forEach((col) => {
        if (!categories[col.category]) {
          categories[col.category] = [];
        }
        categories[col.category].push(col);
      });
    return categories;
  }, [columns]);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="md"
          data-testid="button-column-selector"
          className={menuOpen ? "bg-accent" : ""}
        >
          <Settings2 className="h-4 w-4" />
          Columns
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
            onClick={onShowAll}
            className="w-full text-xs h-8"
            data-testid="button-show-all-columns"
          >
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToDefaults}
            className="w-full text-xs h-8"
            data-testid="button-reset-columns"
          >
            Reset
          </Button>
        </div>

        <DropdownMenuSeparator />

        <div className="overflow-y-auto flex-1 py-2">
          {Object.entries(categorizedColumns).map(([category, cols]) => (
            <div key={category} className="mb-3">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {category}
              </div>
              {cols.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={getColumnVisibility(col.id)}
                  onCheckedChange={() => onToggleColumn(col.id)}
                  data-testid={`checkbox-column-${col.id}`}
                >
                  {col.headerName}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8"
            onClick={() => setMenuOpen(false)}
            data-testid="button-close-column-selector"
          >
            Close
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
