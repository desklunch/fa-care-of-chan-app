import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  id: string;
  title: string;
  color: string;
  items: T[];
}

interface KanbanProps<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, columnId: string) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

const COLUMN_WIDTH = 320;
const COLUMN_GAP = 12;

export function Kanban<T>({
  columns,
  renderCard,
  emptyMessage = "No items",
  className,
}: KanbanProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(columns.length);
  const [startColumnIndex, setStartColumnIndex] = useState(0);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const calculateVisibleColumns = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isMobile) {
      setVisibleColumns(columns.length);
      return;
    }
    const containerWidth = container.clientWidth;
    const columnsCount = Math.floor((containerWidth + COLUMN_GAP) / (COLUMN_WIDTH + COLUMN_GAP));
    setVisibleColumns(Math.max(1, Math.min(columnsCount, columns.length)));
  }, [columns.length, isMobile]);

  useEffect(() => {
    checkMobile();
    calculateVisibleColumns();
    
    const handleResize = () => {
      checkMobile();
      calculateVisibleColumns();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkMobile, calculateVisibleColumns]);

  useEffect(() => {
    if (startColumnIndex > 0 && startColumnIndex + visibleColumns > columns.length) {
      setStartColumnIndex(Math.max(0, columns.length - visibleColumns));
    }
  }, [visibleColumns, columns.length, startColumnIndex]);

  const scrollToColumn = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const columnWidth = container.scrollWidth / columns.length;
    const targetScroll = index * columnWidth;
    
    container.scrollTo({
      left: targetScroll,
      behavior: "auto",
    });
    setCurrentIndex(index);
  };

  const canScrollLeft = isMobile ? currentIndex > 0 : startColumnIndex > 0;
  const canScrollRight = isMobile 
    ? currentIndex < columns.length - 1 
    : startColumnIndex + visibleColumns < columns.length;

  const handleScrollLeft = () => {
    if (isMobile) {
      const newIndex = Math.max(0, currentIndex - 1);
      scrollToColumn(newIndex);
    } else {
      setStartColumnIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleScrollRight = () => {
    if (isMobile) {
      const newIndex = Math.min(columns.length - 1, currentIndex + 1);
      scrollToColumn(newIndex);
    } else {
      setStartColumnIndex((prev) => Math.min(columns.length - visibleColumns, prev + 1));
    }
  };

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    if (!isMobile) return;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const columnWidth = container.scrollWidth / columns.length;
      const newIndex = Math.round(container.scrollLeft / columnWidth);
      setCurrentIndex(Math.min(Math.max(0, newIndex), columns.length - 1));
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const displayedColumns = isMobile 
    ? columns 
    : columns.slice(startColumnIndex, startColumnIndex + visibleColumns);
  const hasHiddenColumns = !isMobile && visibleColumns < columns.length;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {(canScrollLeft || canScrollRight || hasHiddenColumns) && !isMobile && (
        <div className="flex justify-start gap-4 pb-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            className={cn(
              "",
              !canScrollLeft && "opacity-50 bg-background border border-muted-foreground/50 text-muted-foreground"
            )}
            data-testid="button-kanban-scroll-left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollRight}
            disabled={!canScrollRight}
            className={cn(
              "",
              !canScrollRight && "opacity-50 bg-background border border-muted-foreground/50 text-muted-foreground"
            )}
            data-testid="button-kanban-scroll-right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 flex overflow-x-hidden overflow-y-hidden",
          isMobile && "overflow-x-auto scroll-smooth snap-x snap-mandatory"
        )}
        style={{ scrollSnapType: isMobile ? "x mandatory" : "none" }}
      >
        {displayedColumns.map((column, index) => (
          <div
            key={column.id}
            className={cn(
              "bg-foreground/[2%] rounded-lg flex-shrink-0 flex flex-col h-full",
              "snap-start"
            )}
            style={{
              width: isMobile ? "100%" : `${COLUMN_WIDTH}px`,
              marginRight: index < displayedColumns.length - 1 ? `${COLUMN_GAP}px` : undefined,
            }}
            data-testid={`kanban-column-${column.id}`}
          >
            <div className="flex items-center gap-2 px-4 py-4 mb-4 rounded-t-lg bg-foreground/5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: column.color }}
              />
              <h3 className="text-sm font-medium text-foreground truncate">
                {column.title}
              </h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {column.items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-1 space-y-3 pb-4">
              {column.items.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border border-dashed rounded-md mx-2">
                  {emptyMessage}
                </div>
              ) : (
                column.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="px-2">
                    {renderCard(item, column.id)}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {isMobile && columns.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {displayedColumns.map((column, index) => (
            <button
              key={column.id}
              onClick={() => scrollToColumn(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentIndex
                  ? "bg-primary"
                  : "bg-muted hover:bg-muted-foreground/30"
              )}
              data-testid={`kanban-dot-${column.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
