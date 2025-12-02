import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AgGridColumnSelectorProps {
  columnCategories: Record<string, string[]>;
  columnDisplayNames: Record<string, string>;
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onShowAll: () => void;
  onResetToDefaults: () => void;
}

export function AgGridColumnSelector({
  columnCategories,
  columnDisplayNames,
  visibleColumns,
  onToggleColumn,
  onShowAll,
  onResetToDefaults,
}: AgGridColumnSelectorProps) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  return (
    <DropdownMenu open={columnMenuOpen} onOpenChange={setColumnMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="md"
          data-testid="button-column-visibility"
          className={columnMenuOpen ? 'bg-accent' : ''}
        >
          <Settings2 className="h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="mt-1 bg-background border-black/10 w-[100vw] md:w-72 max-h-[600px] overflow-y-auto rounded-none md:rounded-md overflow-y-hidden flex flex-col gap-0"
        data-testid="dropdown-column-visibility"
      >
        <div className="flex gap-2">
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

        <div className="overflow-y-scroll h-full flex flex-col gap-4">
          {Object.entries(columnCategories).map(([category, columnIds]) => (
            <div key={category}>
              <div className="px-2 py-0 text-xs font-semibold text-muted-foreground">
                {category}
              </div>
              {columnIds.map((columnId) => (
                <DropdownMenuCheckboxItem
                  key={columnId}
                  checked={visibleColumns.includes(columnId)}
                  onCheckedChange={() => onToggleColumn(columnId)}
                  data-testid={`checkbox-column-${columnId}`}
                >
                  {columnDisplayNames[columnId] || columnId}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />

        <div className="bg">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8"
            onClick={() => setColumnMenuOpen(false)}
            data-testid="button-close-column-menu"
          >
            Close
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
