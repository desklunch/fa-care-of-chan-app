import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatWithCommas(value: string): string {
  const cleaned = value.replace(/[^0-9-]/g, "");
  if (cleaned === "" || cleaned === "-") return cleaned;
  const isNegative = cleaned.startsWith("-");
  const digits = isNegative ? cleaned.slice(1) : cleaned;
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return isNegative ? `-${formatted}` : formatted;
}

function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

interface NumericInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: number | string | null | undefined;
  onChange: (e: { target: { value: string } }) => void;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => {
      if (value === null || value === undefined || value === "") return "";
      return formatWithCommas(String(value));
    });

    React.useEffect(() => {
      if (value === null || value === undefined || value === "") {
        setDisplayValue("");
        return;
      }
      const raw = stripCommas(displayValue);
      if (raw !== String(value)) {
        setDisplayValue(formatWithCommas(String(value)));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9,-]/g, "");
      setDisplayValue(formatWithCommas(raw));
      const stripped = stripCommas(raw);
      onChange({ target: { value: stripped } });
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput, formatWithCommas, stripCommas };
