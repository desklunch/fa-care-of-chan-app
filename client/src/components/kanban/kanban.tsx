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

export function Kanban<T>({
  columns,
  renderCard,
  emptyMessage = "No items",
  className,
}: KanbanProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    checkMobile();
    checkScrollability();
    
    const handleResize = () => {
      checkMobile();
      checkScrollability();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkMobile, checkScrollability]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollability);
    return () => container.removeEventListener("scroll", checkScrollability);
  }, [checkScrollability]);

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

  const handleScrollLeft = () => {
    if (isMobile) {
      const newIndex = Math.max(0, currentIndex - 1);
      scrollToColumn(newIndex);
    } else {
      const container = scrollContainerRef.current;
      if (!container) return;
      const columnWidth = container.scrollWidth / columns.length;
      container.scrollBy({ left: -columnWidth, behavior: "auto" });
    }
  };

  const handleScrollRight = () => {
    if (isMobile) {
      const newIndex = Math.min(columns.length - 1, currentIndex + 1);
      scrollToColumn(newIndex);
    } else {
      const container = scrollContainerRef.current;
      if (!container) return;
      const columnWidth = container.scrollWidth / columns.length;
      container.scrollBy({ left: columnWidth, behavior: "auto" });
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

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {(canScrollLeft || canScrollRight) && (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between pointer-events-none p-2 md:p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            disabled={!canScrollLeft}
            className={cn(
              "pointer-events-auto bg-background/80 backdrop-blur-sm shadow-md",
              !canScrollLeft && "opacity-0"
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
              "pointer-events-auto bg-background/80 backdrop-blur-sm shadow-md",
              !canScrollRight && "opacity-0"
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
          "flex-1 flex overflow-x-auto overflow-y-hidden scroll-smooth",
          "md:snap-none snap-x snap-mandatory",
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        )}
        style={{ scrollSnapType: isMobile ? "x mandatory" : "none" }}
      >
        {columns.map((column, index) => (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 flex flex-col h-full",
              "w-full md:w-[280px] lg:w-[300px]",
              "snap-start",
              index < columns.length - 1 && "md:mr-3"
            )}
            data-testid={`kanban-column-${column.id}`}
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
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

            <div className="flex-1 overflow-y-auto px-1 space-y-2 pb-4">
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
          {columns.map((column, index) => (
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
