import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { DealService } from "@shared/schema";

interface ServicesCellEditorProps {
  value: number[] | null;
  context: {
    services: DealService[];
    servicesMap: Map<number, DealService>;
  };
  stopEditing: () => void;
}

export interface ServicesCellEditorRef {
  getValue: () => number[];
}

export const ServicesCellEditor = forwardRef<ServicesCellEditorRef, ServicesCellEditorProps>(
  (props, ref) => {
    const { value, context, stopEditing } = props;
    const [selectedIds, setSelectedIds] = useState<number[]>(value || []);
    const containerRef = useRef<HTMLDivElement>(null);

    const services = context?.services?.filter((s) => s.isActive) || [];

    useImperativeHandle(ref, () => ({
      getValue: () => selectedIds,
    }));

    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    const handleToggle = (serviceId: number, checked: boolean) => {
      if (checked) {
        setSelectedIds((prev) => [...prev, serviceId]);
      } else {
        setSelectedIds((prev) => prev.filter((id) => id !== serviceId));
      }
    };

    const handleDone = () => {
      stopEditing();
    };

    return (
      <div
        ref={containerRef}
        className="bg-background border rounded-md shadow-lg p-2 min-w-[200px]"
        tabIndex={0}
      >
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
              >
                <Checkbox
                  checked={selectedIds.includes(service.id)}
                  onCheckedChange={(checked) =>
                    handleToggle(service.id, checked === true)
                  }
                  className="border-input"
                />
                <span className="text-sm">{service.name}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-2 border-t mt-2">
          <Button variant="secondary" size="sm" onClick={handleDone} className="w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }
);

ServicesCellEditor.displayName = "ServicesCellEditor";
