import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneFieldInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  hasError?: boolean;
  testId?: string;
  autoFocus?: boolean;
  className?: string;
}

const InputAdapter = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function InputAdapter(props, ref) {
    return <Input ref={ref} {...props} />;
  },
);

export function PhoneFieldInput({
  value,
  onChange,
  onKeyDown,
  disabled,
  hasError,
  testId,
  autoFocus,
  className,
}: PhoneFieldInputProps) {
  return (
    <div
      className={cn(
        "phone-field-input flex items-center gap-2 rounded-md border border-input bg-background pl-3 pr-1 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
        hasError && "border-destructive",
        disabled && "opacity-50",
        className,
      )}
      onKeyDown={onKeyDown}
      data-testid={testId ? `${testId}-wrapper` : undefined}
    >
      <PhoneInput
        international
        defaultCountry="US"
        flags={flags}
        value={value || undefined}
        onChange={(v) => onChange(v ?? "")}
        disabled={disabled}
        inputComponent={InputAdapter}
        numberInputProps={{
          // strip wrapper border so it inherits the parent's ring
          className: "border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0",
          "data-testid": testId,
          autoFocus,
        }}
      />
    </div>
  );
}
