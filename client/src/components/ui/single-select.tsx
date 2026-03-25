import { useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type Item = {
  id: string | number;
  label: string;
};

type ItemsByCategory = Record<string, (string | number)[]>;

interface SingleSelectProps {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  placeholder?: string;
  items?: Item[];
  itemsByCategory?: ItemsByCategory;
  itemLabels: Record<string | number, string>;
  selectedId: string | number | null;
  onSelectionChange: (selectedId: string | number | null) => void;
  testIdPrefix?: string;
  align?: "start" | "end" | "center";
  triggerClassName?: string;
  contentClassName?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

function SingleSelectContent({
  showSearch,
  searchPlaceholder,
  searchQuery,
  setSearchQuery,
  usesCategories,
  filteredCategories,
  filteredItems,
  selectedId,
  selectItem,
  itemLabels,
  testIdPrefix,
  isDropdown = false,
}: {
  showSearch: boolean;
  searchPlaceholder: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  usesCategories: boolean;
  filteredCategories: ItemsByCategory;
  filteredItems: Item[];
  selectedId: string | number | null;
  selectItem: (id: string | number) => void;
  itemLabels: Record<string | number, string>;
  testIdPrefix: string;
  isDropdown?: boolean;
}) {
  return (
    <>
      {showSearch && (
        <div className="grid grid-cols-2 gap-4 md:gap-2 p-2">
          <div className="flex items-center gap-2 col-span-2 relative">
            <Search className="absolute left-3 md:left-2 top-1/2 -translate-y-1/2 h-5 md:h-4 w-5 md:w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 md:h-10 pl-12 md:pl-8 pr-8 text-sm"
              data-testid={`input-search-${testIdPrefix}`}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10"
                onClick={() => setSearchQuery("")}
                data-testid={`button-clear-search-${testIdPrefix}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {showSearch && <div className="h-px bg-border mx-1 mb-1" />}

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
                    <DropdownMenuItem
                      key={id}
                      onClick={() => selectItem(id)}
                      data-testid={`option-${testIdPrefix}-${id}`}
                      className="cursor-pointer"
                    >
                      <span className="flex h-4 w-4 items-center justify-center mr-2">
                        {selectedId === id && <Check className="h-4 w-4" />}
                      </span>
                      {itemLabels[id] || String(id)}
                    </DropdownMenuItem>
                  ) : (
                    <div
                      key={id}
                      className="relative hover:bg-accent/50 flex cursor-pointer select-none items-center rounded-sm py-3 pl-12 pr-2 text-sm"
                      onClick={() => selectItem(id)}
                      data-testid={`option-${testIdPrefix}-${id}`}
                      role="option"
                      aria-selected={selectedId === id}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectItem(id);
                        }
                      }}
                    >
                      <span className="absolute left-2 flex h-6 w-6 items-center justify-center">
                        {selectedId === id && <Check className="h-4 w-4" />}
                      </span>
                      {itemLabels[id] || String(id)}
                    </div>
                  ),
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
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    data-testid={`option-${testIdPrefix}-${item.id}`}
                    className="cursor-pointer"
                  >
                    <span className="flex h-4 w-4 items-center justify-center mr-2">
                      {selectedId === item.id && <Check className="h-4 w-4" />}
                    </span>
                    {item.label}
                  </DropdownMenuItem>
                ) : (
                  <div
                    key={item.id}
                    className="relative hover:bg-accent/50 flex cursor-pointer select-none items-center rounded-sm py-3 pl-12 pr-2 text-sm"
                    onClick={() => selectItem(item.id)}
                    data-testid={`option-${testIdPrefix}-${item.id}`}
                    role="option"
                    aria-selected={selectedId === item.id}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectItem(item.id);
                      }
                    }}
                  >
                    <span className="absolute left-2 flex h-6 w-6 items-center justify-center">
                      {selectedId === item.id && <Check className="h-4 w-4" />}
                    </span>
                    {item.label}
                  </div>
                ),
              )
            )}
          </>
        )}
      </div>
    </>
  );
}

export function SingleSelect({
  triggerLabel,
  triggerIcon,
  placeholder = "Select an item",
  items,
  itemsByCategory,
  itemLabels,
  selectedId,
  onSelectionChange,
  testIdPrefix = "singleselect",
  align = "start",
  triggerClassName,
  contentClassName,
  searchPlaceholder = "Search...",
  showSearch = true,
}: SingleSelectProps) {
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

  const selectItem = (id: string | number) => {
    onSelectionChange(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const displayLabel =
    selectedId !== null
      ? itemLabels[selectedId] || String(selectedId)
      : triggerLabel;

  const triggerButton = (
    <Button
      size="md"
      variant="ghost"
      data-testid={`button-${testIdPrefix}`}
      className={`gap-2 h-12 md:h-9 justify-start w-full bg-foreground/10 rounded-full focus:ring-0 focus:outline-none ${triggerClassName || ""}`}
    >
      {triggerIcon}
      <span className="truncate">{displayLabel}</span>
    </Button>
  );

  const contentProps = {
    showSearch,
    searchPlaceholder,
    searchQuery,
    setSearchQuery,
    usesCategories,
    filteredCategories,
    filteredItems,
    selectedId,
    selectItem,
    itemLabels,
    testIdPrefix,
  };

  return (
    <div className="inline-flex w-full md:w-auto items-center">
      {isMobile ? (
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSearchQuery("");
          }}
        >
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
          <DialogContent
            className={`!p-0 !inset-2 !w-[calc(100vw-2rem)] !h-[calc(100dvh-2rem)] !max-w-none !flex !flex-col !overflow-hidden !translate-x-0 !translate-y-0 !left-[1rem] !top-[1rem] !right-[1rem] !bottom-[1rem] gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-50 data-[state=closed]:zoom-out-50 duration-500 rounded-xl ${contentClassName || ""}`}
            data-testid={`dialog-${testIdPrefix}`}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SingleSelectContent {...contentProps} isDropdown={false} />
          </DialogContent>
        </Dialog>
      ) : (
        <DropdownMenu
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSearchQuery("");
          }}
        >
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent
            align={align}
            className={`bg-background border-border w-72 max-h-[600px] rounded-md flex flex-col p-0 mt-1 ${contentClassName || ""}`}
            data-testid={`dropdown-${testIdPrefix}`}
          >
            <SingleSelectContent {...contentProps} isDropdown={true} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export type {
  Item as SingleSelectItem,
  ItemsByCategory as SingleSelectItemsByCategory,
};
