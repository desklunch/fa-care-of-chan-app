import { useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  Check,
  ListChecks,
  ListRestart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type Item = {
  id: string | number;
  label: string;
};

type ItemsByCategory = Record<string, (string | number)[]>;

interface MultiSelectProps {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  placeholder?: string;
  items?: Item[];
  itemsByCategory?: ItemsByCategory;
  itemLabels: Record<string | number, string>;
  selectedIds: (string | number)[];
  onSelectionChange: (selectedIds: (string | number)[]) => void;
  showSelectAll?: boolean;
  showReset?: boolean;
  defaultSelectedIds?: (string | number)[];
  defaultSelectAll?: boolean;
  variant?: "outline" | "default";
  testIdPrefix?: string;
  align?: "start" | "end" | "center";
  buttonClassName?: string;
  triggerActiveClassName?: string;
  contentClassName?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

function MultiSelectContent({
  showSelectAll,
  showReset,
  selectAll,
  reset,
  showSearch,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  usesCategories,
  filteredCategories,
  filteredItems,
  selectedIds,
  toggleItem,
  itemLabels,
  testIdPrefix,
  setIsOpen,
  isDropdown = false,
}: {
  showSelectAll: boolean;
  showReset: boolean;
  selectAll: () => void;
  reset: () => void;
  showSearch: boolean;
  searchPlaceholder: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  usesCategories: boolean;
  filteredCategories: ItemsByCategory;
  filteredItems: Item[];
  selectedIds: (string | number)[];
  toggleItem: (id: string | number) => void;
  itemLabels: Record<string | number, string>;
  testIdPrefix: string;
  setIsOpen: (open: boolean) => void;
  isDropdown?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:gap-2 p-4 md:p-2">
        {showSelectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="w-full text-sm md:text-xs h-10 md:h-8 rounded-lg md:rounded-sm [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[2px]"
            data-testid={`button-select-all-${testIdPrefix}`}
          >
            <ListChecks />
            Select All
          </Button>
        )}

        {showReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="w-full text-sm md:text-xs h-10 md:h-8 rounded-lg md:rounded-sm [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[2px]"
            data-testid={`button-reset-${testIdPrefix}`}
          >
            <ListRestart />
            Reset
          </Button>
        )}

        {showSearch && (
          <div className="col-span-2 relative">
            <Search className="absolute left-3 md:left-2 top-1/2 -translate-y-1/2 h-5 md:h-4 w-5 md:w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 md:h-10 pl-12 md:pl-8 pr-8 text-sm"
              data-testid={`input-search-${testIdPrefix}`}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 md:right-2 top-1/2 -translate-y-1/2 h-8 md:h-6 w-8 md:w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border mx-1 mb-1" />

      <div className="overflow-y-auto flex-1 p-2">
        {usesCategories ? (
          <>
            {Object.entries(filteredCategories).map(([category, ids]) => (
              <div key={category} className="mb-6">
                <div className="px-2 py-0 text-xs font-semibold text-muted-foreground mb-1">
                  {category}
                </div>
                
                {ids.map((id) =>
                  isDropdown ? (
                    <DropdownMenuCheckboxItem
                      key={id}
                      checked={selectedIds.includes(id)}
                      onCheckedChange={() => toggleItem(id)}
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`checkbox-${testIdPrefix}-${id}`}
                    >
                      {itemLabels[id] || String(id)}
                    </DropdownMenuCheckboxItem>
                  ) : (
                    <div
                      key={id}
                      className="relative hover:bg-accent/50 flex cursor-pointer select-none items-center rounded-sm py-3 pl-12 pr-2 text-sm"
                      onClick={() => toggleItem(id)}
                      data-testid={`checkbox-${testIdPrefix}-${id}`}
                      role="menuitemcheckbox"
                      aria-checked={selectedIds.includes(id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleItem(id);
                        }
                      }}
                    >
                      <span className="absolute border border-border rounded-sm left-2 flex h-6 w-6 items-center justify-center">
                        {selectedIds.includes(id) && <Check className="h-4 w-4" />}
                      </span>
                      {itemLabels[id] || String(id)}
                    </div>
                  )
                )}
              </div>
            ))}
            {Object.keys(filteredCategories).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No items found
              </div>
            )}
          </>
        ) : (
          <>
            {filteredItems.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No items found
              </div>
            ) : (
              filteredItems.map((item) =>
                isDropdown ? (
                  <DropdownMenuCheckboxItem
                    key={item.id}
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    onSelect={(e) => e.preventDefault()}
                    data-testid={`checkbox-${testIdPrefix}-${item.id}`}
                  >
                    {item.label}
                  </DropdownMenuCheckboxItem>
                ) : (
                  <div
                    key={item.id}
                    className="relative hover:bg-accent/50 flex cursor-pointer select-none items-center rounded-sm py-3 pl-12 pr-2 text-sm"
                    onClick={() => toggleItem(item.id)}
                    data-testid={`checkbox-${testIdPrefix}-${item.id}`}
                    role="menuitemcheckbox"
                    aria-checked={selectedIds.includes(item.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItem(item.id);
                      }
                    }}
                  >
                    <span className="absolute border border-border rounded-sm left-2 flex h-6 w-6 items-center justify-center">
                      {selectedIds.includes(item.id) && <Check className="h-3 w-3" />}
                    </span>
                    {item.label}
                  </div>
                )
              )
            )}
          </>
        )}
      </div>

      <div className="h-px bg-border mx-1 mt-1" />

      <div className="p-4 md:p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-sm md:text-xs h-12 md:h-8 rounded-lg md:rounded-sm"
          onClick={() => setIsOpen(false)}
          data-testid={`button-close-${testIdPrefix}`}
        >
          Close
        </Button>
      </div>
    </>
  );
}

export function MultiSelect({
  triggerLabel,
  triggerIcon,
  placeholder = "Select items",
  items,
  itemsByCategory,
  itemLabels,
  selectedIds,
  onSelectionChange,
  showSelectAll = true,
  showReset = true,
  defaultSelectedIds = [],
  defaultSelectAll = false,
  variant = "outline",
  testIdPrefix = "multiselect",
  align = "start",
  buttonClassName = "bg-primary text-primary-foreground",
  triggerActiveClassName = "bg-accent",
  contentClassName,
  searchPlaceholder = "Search...",
  showSearch = true,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const usesCategories = !!itemsByCategory;

  const allItems = useMemo(() => {
    if (items) return items;

    if (itemsByCategory) {
      const flatItems: Item[] = [];
      Object.values(itemsByCategory).forEach((categoryIds) => {
        categoryIds.forEach((id) => {
          flatItems.push({
            id,
            label: itemLabels[id] || String(id),
          });
        });
      });
      return flatItems;
    }

    return [];
  }, [items, itemsByCategory, itemLabels]);

  const effectiveDefaults = useMemo(() => {
    if (defaultSelectAll && defaultSelectedIds.length === 0) {
      return allItems.map((item) => item.id);
    }
    return defaultSelectedIds;
  }, [defaultSelectAll, defaultSelectedIds, allItems]);

  const isDifferentFromDefaults = useMemo(() => {
    if (selectedIds.length !== effectiveDefaults.length) return true;
    const sortedSelected = [...selectedIds].sort();
    const sortedDefaults = [...effectiveDefaults].sort();
    return !sortedSelected.every((id, index) => id === sortedDefaults[index]);
  }, [selectedIds, effectiveDefaults]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return allItems;
    const query = searchQuery.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [allItems, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!itemsByCategory) return {};
    if (!searchQuery) return itemsByCategory;

    const query = searchQuery.toLowerCase();
    const filtered: ItemsByCategory = {};

    Object.entries(itemsByCategory).forEach(([category, ids]) => {
      const matchingIds = ids.filter((id) => {
        const label = itemLabels[id] || String(id);
        return label.toLowerCase().includes(query);
      });
      if (matchingIds.length > 0) {
        filtered[category] = matchingIds;
      }
    });

    return filtered;
  }, [itemsByCategory, itemLabels, searchQuery]);

  const toggleItem = (id: string | number) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(allItems.map((item) => item.id));
  };

  const reset = () => {
    onSelectionChange(effectiveDefaults);
  };

  const buttonVariant = isDifferentFromDefaults ? "default" : variant;
  const appliedButtonClassName = isDifferentFromDefaults ? buttonClassName : "";

  const displayLabel =
    selectedIds.length === 0 ? triggerLabel : `${selectedIds.length} ${triggerLabel}`;

  const triggerButton = (
    <Button
      variant={buttonVariant}
      size="default"
      data-testid={`button-${testIdPrefix}`}
      className={`${appliedButtonClassName} gap-1 ${isDifferentFromDefaults ? "rounded-r-none border-r-0" : ""}`}
    >
      {triggerIcon}
      <span>{displayLabel}</span>
    </Button>
  );

  const clearButton = isDifferentFromDefaults && (
    <Button
      type="button"
      variant="default"
      size="default"
      className="rounded-l-none border-l-0 px-2"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        reset();
      }}
      data-testid={`button-clear-${testIdPrefix}`}
    >
      <X className="h-3 w-3 stroke-[3px]" />
    </Button>
  );

  const contentProps = {
    showSelectAll,
    showReset,
    selectAll,
    reset,
    showSearch,
    searchPlaceholder,
    searchQuery,
    setSearchQuery,
    usesCategories,
    filteredCategories,
    filteredItems,
    selectedIds,
    toggleItem,
    itemLabels,
    testIdPrefix,
    setIsOpen,
  };

  return (
    <div className="inline-flex items-center">
      {isMobile ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
          <DialogContent
            className="!p-0 !inset-2 !w-[calc(100vw-2rem)] !h-[calc(100dvh-2rem)] !max-w-none !flex !flex-col !overflow-hidden !translate-x-0 !translate-y-0 !left-[1rem] !top-[1rem] !right-[1rem] !bottom-[1rem] gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-50 data-[state=closed]:zoom-out-50 duration-500 rounded-xl"
            data-testid={`dialog-${testIdPrefix}`}
          >
            <MultiSelectContent {...contentProps} isDropdown={false} />
          </DialogContent>
        </Dialog>
      ) : (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent
            align={align}
            className="bg-background border-border w-72 max-h-[600px] rounded-md flex flex-col p-0 mt-1"
            data-testid={`dropdown-${testIdPrefix}`}
          >
            <MultiSelectContent {...contentProps} isDropdown={true} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {clearButton}
    </div>
  );
}

export type { Item as MultiSelectItem, ItemsByCategory as MultiSelectItemsByCategory };
