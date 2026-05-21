import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Pencil, Check, X, CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/rich-text-editor";
import { MarkdownDisplay } from "@/components/markdown-display";
import { normalizeToMarkdown } from "@/lib/markdown-utils";
import type { EditableFieldProps, EditableFieldType } from "./types";
import {
  isPossiblePhoneNumber,
  parsePhoneNumber,
  formatPhoneNumberIntl,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { PhoneFieldInput } from "./phone-field-input";

const MOBILE_BREAKPOINT = 768;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhone(val: string): string | null {
  const trimmed = (val || "").trim();
  if (!trimmed) return null;
  if (!isPossiblePhoneNumber(trimmed)) return "Enter a valid phone number";
  return null;
}

function validateEmail(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return null;
}

function validateUrl(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    if (!u.hostname.includes(".")) return "Enter a valid URL";
    return null;
  } catch {
    return "Enter a valid URL";
  }
}

function validateByType(type: EditableFieldType, val: string): string | null {
  switch (type) {
    case "phone":
      return validatePhone(val);
    case "email":
      return validateEmail(val);
    case "url":
      return validateUrl(val);
    default:
      return null;
  }
}

function coerceUrl(val: string): string {
  return /^https?:\/\//i.test(val) ? val : `https://${val}`;
}

function htTypedValueLink({
  type,
  value,
  className,
  testId,
}: {
  type: EditableFieldType;
  value: string;
  className?: string;
  testId?: string;
}) {
  const v = value.trim();
  if (!v) return null;
  if (type === "phone") {
    let formatted = v;
    let Flag: React.ComponentType<{ title?: string }> | null = null;
    try {
      const parsed = parsePhoneNumber(v);
      if (parsed) {
        formatted = formatPhoneNumberIntl(v) || v;
        if (
          parsed.country &&
          (flags as Record<string, React.ComponentType<{ title?: string }>>)[
            parsed.country
          ]
        ) {
          Flag = (
            flags as Record<string, React.ComponentType<{ title?: string }>>
          )[parsed.country];
        }
      }
    } catch {
      // fall back to raw value
    }
    return (
      <a
        href={`tel:${v.replace(/\s+/g, "")}`}
        className={cn(
          "inline-flex items-center gap-2 text-primary hover:underline",
          className,
        )}
        data-testid={testId}
      >
        {Flag && (
          <span className="inline-flex w-5 h-[14px] overflow-hidden rounded-[2px] shrink-0">
            <Flag />
          </span>
        )}
        <span>{formatted}</span>
      </a>
    );
  }
  if (type === "email") {
    return (
      <a
        href={`mailto:${v}`}
        className={cn("text-primary hover:underline", className)}
        data-testid={testId}
      >
        {v}
      </a>
    );
  }
  if (type === "url") {
    return (
      <a
        href={coerceUrl(v)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-primary hover:underline break-all", className)}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        {v}
      </a>
    );
  }
  return <span className={className}>{v}</span>;
}

function inputModeForType(
  type: EditableFieldType,
): React.HTMLAttributes<HTMLInputElement>["inputMode"] {
  switch (type) {
    case "phone":
      return "tel";
    case "email":
      return "email";
    case "url":
      return "url";
    default:
      return undefined;
  }
}

function htmlTypeForType(type: EditableFieldType): string {
  switch (type) {
    case "phone":
      return "tel";
    case "email":
      return "email";
    case "url":
      return "url";
    default:
      return "text";
  }
}

export type SegmentedDateStatus = "empty" | "incomplete" | "invalid" | "valid";

interface SegmentedDateInputProps {
  initialValue: string;
  onChange: (iso: string | null, status: SegmentedDateStatus) => void;
  disabled?: boolean;
  hasError?: boolean;
  field: string;
  onEnter?: () => void;
  onEscape?: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(v: string): string {
  return v.length === 1 ? `0${v}` : v;
}

function pad4Year(v: string): string {
  return v.padStart(4, "0");
}

function computeSegmentedStatus(
  m: string,
  d: string,
  y: string,
): { iso: string | null; status: SegmentedDateStatus } {
  if (!m && !d && !y) return { iso: null, status: "empty" };
  if (m.length < 1 || d.length < 1 || y.length < 1) {
    return { iso: null, status: "incomplete" };
  }
  const mNum = parseInt(m, 10);
  const dNum = parseInt(d, 10);
  const yNum = parseInt(y, 10);
  const dt = new Date(yNum, mNum - 1, dNum);
  if (
    !Number.isNaN(dt.getTime()) &&
    dt.getFullYear() === yNum &&
    dt.getMonth() === mNum - 1 &&
    dt.getDate() === dNum &&
    yNum >= 1 &&
    yNum <= 9999
  ) {
    return {
      iso: `${pad4Year(y)}-${pad2(m)}-${pad2(d)}`,
      status: "valid",
    };
  }
  return { iso: null, status: "invalid" };
}

function SegmentedDateInput({
  initialValue,
  onChange,
  disabled,
  hasError,
  field,
  onEnter,
  onEscape,
}: SegmentedDateInputProps) {
  const initialParts = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(initialValue || "");
    if (m) return { year: m[1], month: m[2], day: m[3] };
    return { year: "", month: "", day: "" };
  }, [initialValue]);

  const [month, setMonth] = useState(initialParts.month);
  const [day, setDay] = useState(initialParts.day);
  const [year, setYear] = useState(initialParts.year);
  const [monthOpen, setMonthOpen] = useState(false);

  const monthTriggerRef = useRef<HTMLButtonElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    monthTriggerRef.current?.focus();
  }, []);

  const emit = (m: string, d: string, y: string) => {
    const { iso, status } = computeSegmentedStatus(m, d, y);
    onChange(iso, status);
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
    emit(value, day, year);
    dayRef.current?.focus();
    dayRef.current?.select();
  };

  const handleMonthTriggerKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (monthOpen) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEscape?.();
    }
  };

  const handleDigitChange = (
    raw: string,
    maxLen: number,
    setter: (v: string) => void,
    autoAdvanceTo: React.RefObject<HTMLInputElement> | null,
    other1: string,
    other2: string,
    position: "day" | "year",
  ) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxLen);
    setter(digits);
    if (digits.length === maxLen && autoAdvanceTo?.current) {
      autoAdvanceTo.current.focus();
      autoAdvanceTo.current.select();
    }
    if (position === "day") emit(other1, digits, other2);
    if (position === "year") emit(other1, other2, digits);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    current: string,
    prevInput: React.RefObject<HTMLInputElement> | null,
    prevButton: React.RefObject<HTMLButtonElement> | null,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === "Escape") {
      onEscape?.();
    } else if (e.key === "Backspace" && current === "") {
      if (prevInput?.current) {
        prevInput.current.focus();
      } else if (prevButton?.current) {
        prevButton.current.focus();
      }
    }
  };

  const inputCls = cn(
    "text-left px-3",
    hasError && "border-destructive",
  );

  return (
    <div className="flex items-start gap-2">
      <Select
        value={month || undefined}
        onValueChange={handleMonthChange}
        disabled={disabled}
        open={monthOpen}
        onOpenChange={setMonthOpen}
      >
        <SelectTrigger
          ref={monthTriggerRef}
          className={cn("w-[170px]", hasError && "border-destructive")}
          data-testid={`input-${field}-month`}
          aria-label="Month"
          onKeyDown={handleMonthTriggerKeyDown}
        >
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, idx) => {
            const value = String(idx + 1).padStart(2, "0");
            return (
              <SelectItem
                key={value}
                value={value}
                data-testid={`option-${field}-month-${value}`}
              >
                {value} - {name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={day}
        placeholder="Day"
        maxLength={2}
        disabled={disabled}
        onChange={(e) =>
          handleDigitChange(
            e.target.value,
            2,
            setDay,
            yearRef,
            month,
            year,
            "day",
          )
        }
        onKeyDown={(e) => handleKeyDown(e, day, null, monthTriggerRef)}
        className={cn(inputCls, "w-16")}
        data-testid={`input-${field}-day`}
        aria-label="Day"
      />
      <Input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        value={year}
        placeholder="Year"
        maxLength={4}
        disabled={disabled}
        onChange={(e) =>
          handleDigitChange(
            e.target.value,
            4,
            setYear,
            null,
            month,
            day,
            "year",
          )
        }
        onKeyDown={(e) => handleKeyDown(e, year, dayRef, null)}
        className={cn(inputCls, "w-20")}
        data-testid={`input-${field}-year`}
        aria-label="Year"
      />
    </div>
  );
}

export function EditableField({
  label,
  value,
  field,
  testId,
  type = "text",
  mode = "single",
  validationStrictness = "strict",
  options = [],
  multiSelectValues = [],
  arrayValue = [],
  booleanValue = false,
  onSave,
  displayValue,
  placeholder = "+ Add",
  disabled = false,
  valueClassName,
  isLoading = false,
  error,
  validation,
}: EditableFieldProps) {
  // Treat legacy type="array" as text + multiple
  const effectiveType: EditableFieldType = type === "array" ? "text" : type;
  const effectiveMode: "single" | "multiple" =
    type === "array" ? "multiple" : mode;
  const isMultiple = effectiveMode === "multiple";

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [selectedMulti, setSelectedMulti] =
    useState<string[]>(multiSelectValues);
  const [editArray, setEditArray] = useState<string[]>(arrayValue);
  const [editBoolean, setEditBoolean] = useState(booleanValue);
  const [dateOpen, setDateOpen] = useState(false);
  const [segDateStatus, setSegDateStatus] = useState<SegmentedDateStatus>(() =>
    value ? "valid" : "empty",
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const prevMultiRef = useRef<string>(JSON.stringify(multiSelectValues));
  const prevArrayRef = useRef<string>(JSON.stringify(arrayValue));
  const prevValueRef = useRef<string | null | undefined>(value);
  const prevBooleanRef = useRef<boolean>(booleanValue);

  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    const checkMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
    const getViewportHeight = () =>
      window.visualViewport?.height ?? window.innerHeight;

    setIsMobile(checkMobile());
    setViewportHeight(getViewportHeight());

    const handleResize = () => {
      setIsMobile(checkMobile());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isEditing || !isMobile) return;

    const getViewportHeight = () =>
      window.visualViewport?.height ?? window.innerHeight;
    setViewportHeight(getViewportHeight());

    const handleViewportResize = () => {
      setViewportHeight(getViewportHeight());
    };

    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportResize,
      );
    };
  }, [isEditing, isMobile]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;

    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setEditValue(value || "");
    }

    if (prevBooleanRef.current !== booleanValue) {
      prevBooleanRef.current = booleanValue;
      setEditBoolean(booleanValue);
    }

    const currentArrayStr = JSON.stringify(arrayValue);
    if (prevArrayRef.current !== currentArrayStr) {
      prevArrayRef.current = currentArrayStr;
      setEditArray(arrayValue);
    }

    const currentMultiStr = JSON.stringify(multiSelectValues);
    if (prevMultiRef.current !== currentMultiStr) {
      prevMultiRef.current = currentMultiStr;
      setSelectedMulti(multiSelectValues);
    }
  });

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  useEffect(() => {
    if (isEditing && isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isEditing, isMobile]);

  const validateLocally = useCallback(
    (val: unknown): string | null => {
      if (!validation) return null;

      if (
        validation.required &&
        (val === null || val === undefined || val === "")
      ) {
        return "This field is required";
      }

      if (typeof val === "string") {
        if (validation.minLength && val.length < validation.minLength) {
          return `Must be at least ${validation.minLength} characters`;
        }
        if (validation.maxLength && val.length > validation.maxLength) {
          return `Must be no more than ${validation.maxLength} characters`;
        }
        if (validation.pattern && !validation.pattern.test(val)) {
          return "Invalid format";
        }
      }

      if (validation.customValidator) {
        return validation.customValidator(val);
      }

      return null;
    },
    [validation],
  );

  // Per-row typed errors for multiple mode
  const rowErrors = useMemo(() => {
    if (!isMultiple) return [] as (string | null)[];
    return editArray.map((row) => {
      if (!row.trim()) return null;
      return validateByType(effectiveType, row);
    });
  }, [isMultiple, editArray, effectiveType]);

  const hasRowErrors = rowErrors.some((e) => e !== null);

  const singleTypeError = (() => {
    if (isMultiple) return null;
    if (
      effectiveType === "phone" ||
      effectiveType === "email" ||
      effectiveType === "url"
    ) {
      return validateByType(effectiveType, editValue || "");
    }
    if (effectiveType === "date-segmented") {
      if (segDateStatus === "incomplete") return "Please complete the date";
      if (segDateStatus === "invalid") return "Invalid date";
    }
    return null;
  })();

  const handleSave = () => {
    let saveValue: unknown;

    if (isMultiple) {
      const cleaned = editArray.filter((v) => v.trim() !== "");
      saveValue = cleaned;
    } else {
      switch (effectiveType) {
        case "multiselect":
          saveValue = selectedMulti;
          break;
        case "switch":
          saveValue = editBoolean;
          break;
        case "number":
          saveValue = editValue !== "" ? Number(editValue) : null;
          break;
        case "date":
        case "date-segmented":
          saveValue = editValue || null;
          break;
        default:
          saveValue = editValue || null;
      }
    }

    const validationError = validateLocally(saveValue);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    if (validationStrictness === "strict") {
      if (isMultiple && hasRowErrors) {
        setLocalError("Please fix invalid entries");
        return;
      }
      if (!isMultiple && singleTypeError) {
        setLocalError(singleTypeError);
        return;
      }
    }

    setLocalError(null);
    onSave(field, saveValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setSelectedMulti(multiSelectValues);
    setEditArray(arrayValue);
    setEditBoolean(booleanValue);
    setSegDateStatus(value ? "valid" : "empty");
    setIsEditing(false);
    setDateOpen(false);
    setLocalError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      effectiveType !== "textarea" &&
      effectiveType !== "richtext" &&
      !isMultiple
    ) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const startEditing = () => {
    if (isMultiple && editArray.length === 0) {
      setEditArray([""]);
    }
    setIsEditing(true);
    setLocalError(null);
  };

  const handleDoubleClick = () => {
    if (!disabled && !isLoading) {
      startEditing();
    }
  };

  const toggleMultiSelect = (val: string) => {
    setSelectedMulti((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const displayError = localError || error;

  const errorDisplay = displayError && (
    <p className="text-sm text-destructive" data-testid={`error-${field}`}>
      {displayError}
    </p>
  );

  const saveDisabled =
    isLoading ||
    (validationStrictness === "strict" &&
      ((isMultiple && hasRowErrors) || (!isMultiple && !!singleTypeError)));

  const multiSummaryError =
    isMultiple && hasRowErrors ? "Fix invalid entries" : null;

  const actionButtons = (
    <div className="flex items-center gap-3 justify-start">
      {/* <div className="min-w-0 flex-1">
        {multiSummaryError && (
          <p
            className="text-sm text-destructive"
            data-testid={`row-summary-error-${field}`}
          >
            {multiSummaryError}
          </p>
        )}
      </div> */}
      <div className="flex gap-3 shrink-0 pt-4">

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveDisabled}
          data-testid={`button-save-${field}`}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isLoading}
          data-testid={`button-cancel-${field}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderMultiRowEditor = () => {
    return (
      <>
        <div className="flex flex-col gap-3 flex-1">
          {editArray.map((item, index) => {
            const rowError = rowErrors[index];
            const isNumber = effectiveType === "number";
            const isPhone = effectiveType === "phone";
            const handleRowChange = (newVal: string) => {
              const newArray = [...editArray];
              newArray[index] = newVal;
              setEditArray(newArray);
              setLocalError(null);
            };
            const handleRowKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === "Escape") handleCancel();
            };
            const rowClassName = cn(
              "!h-12 bord",
              rowError && "border-destructive ",
            );
            return (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1 flex flex-col gap-1">
                  {isPhone ? (
                    <PhoneFieldInput
                      value={item}
                      onChange={handleRowChange}
                      onKeyDown={handleRowKeyDown}
                      disabled={isLoading}
                      hasError={!!rowError}
                      testId={`input-${field}-${index}`}
                      autoFocus={index === 0}
                      className="flex-1"
                    />
                  ) : isNumber ? (
                    <NumericInput
                      value={item}
                      onChange={(e) => handleRowChange(e.target.value)}
                      onKeyDown={handleRowKeyDown}
                      className={rowClassName}
                      disabled={isLoading}
                      data-testid={`input-${field}-${index}`}
                      autoFocus={index === 0}
                    />
                  ) : (
                    <Input
                      type={htmlTypeForType(effectiveType)}
                      inputMode={inputModeForType(effectiveType)}
                      value={item}
                      onChange={(e) => handleRowChange(e.target.value)}
                      onKeyDown={handleRowKeyDown}
                      className={rowClassName}
                      disabled={isLoading}
                      data-testid={`input-${field}-${index}`}
                      autoFocus={index === 0}
                    />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditArray(editArray.filter((_, i) => i !== index));
                  }}
                  disabled={isLoading}
                  data-testid={`button-remove-${field}-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditArray([...editArray, ""])}
            disabled={isLoading}
            data-testid={`button-add-${field}`}
            className="w-fit"
          >
            + Add
          </Button>
        </div>
        {errorDisplay}
      </>
    );
  };

  const renderTypedSingleInput = () => {
    const showTypeError =
      !!singleTypeError && (validationStrictness === "lenient" || !!editValue);
    return (
      <>
        {effectiveType === "phone" ? (
          <PhoneFieldInput
            value={editValue}
            onChange={(v) => {
              setEditValue(v);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            hasError={!!displayError || showTypeError}
            testId={`input-${field}`}
            autoFocus
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={htmlTypeForType(effectiveType)}
            inputMode={inputModeForType(effectiveType)}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full text-sm !h-12",
              isMobile && "input-prevent-scroll-on-focus",
              (displayError || showTypeError) && "border-destructive",
            )}
            disabled={isLoading}
            data-testid={`input-${field}`}
          />
        )}
        {showTypeError && !displayError && (
          <p
            className="text-sm text-destructive"
            data-testid={`error-${field}`}
          >
            {singleTypeError}
          </p>
        )}
        {errorDisplay}
      </>
    );
  };

  const renderEditorContent = () => {
    if (isMultiple) {
      return renderMultiRowEditor();
    }

    switch (effectiveType) {
      case "textarea":
        return (
          <>
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setLocalError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className={cn(
                "min-h-[150px] text-base leading-[1.6em] flex-1",
                isMobile && "min-h-0 input-prevent-scroll-on-focus",
                displayError && "border-destructive",
              )}
              disabled={isLoading}
              data-testid={`input-${field}`}
            />
            {errorDisplay}
          </>
        );

      case "select":
        const selectValue = editValue || "__none__";
        return (
          <>
            <Select
              value={selectValue}
              onValueChange={(val) => {
                const actualValue = val === "__none__" ? "" : val;
                setEditValue(actualValue);
                setLocalError(null);
              }}
              disabled={isLoading}
            >
              <SelectTrigger
                className={cn("w-full", displayError && "border-destructive")}
                data-testid={`select-${field}`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem
                    key={opt.value || "__none__"}
                    value={opt.value || "__none__"}
                  >
                    {opt.renderLabel || opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorDisplay}
          </>
        );

      case "date":
        const parsedDate = editValue ? parseDateOnly(editValue) : null;
        return (
          <>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !editValue && "text-muted-foreground",
                    displayError && "border-destructive",
                  )}
                  disabled={isLoading}
                  data-testid={`datepicker-${field}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {parsedDate ? format(parsedDate, "PPP") : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedDate || undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = format(date, "yyyy-MM-dd");
                      setEditValue(formatted);
                    } else {
                      setEditValue("");
                    }
                    setDateOpen(false);
                    setLocalError(null);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errorDisplay}
          </>
        );

      case "date-segmented":
        return (
          <>
            <SegmentedDateInput
              initialValue={editValue}
              onChange={(iso, status) => {
                setEditValue(iso ?? "");
                setSegDateStatus(status);
                setLocalError(null);
              }}
              disabled={isLoading}
              hasError={
                !!displayError ||
                segDateStatus === "invalid" ||
                segDateStatus === "incomplete"
              }
              field={field}
              onEnter={handleSave}
              onEscape={handleCancel}
            />
            {errorDisplay ||
              (singleTypeError && (
                <p
                  className="text-sm text-destructive"
                  data-testid={`error-${field}`}
                >
                  {singleTypeError}
                </p>
              ))}
          </>
        );

      case "multiselect":
        return (
          <>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={
                    selectedMulti.includes(opt.value) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => {
                    toggleMultiSelect(opt.value);
                    setLocalError(null);
                  }}
                  data-testid={`badge-toggle-${opt.value.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
            {errorDisplay}
          </>
        );

      case "number":
        return (
          <>
            <NumericInput
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full text-sm",
                isMobile && "input-prevent-scroll-on-focus",
                displayError && "border-destructive",
              )}
              disabled={isLoading}
              data-testid={`input-${field}`}
            />
            {errorDisplay}
          </>
        );

      case "switch":
        return (
          <>
            <div className="flex items-center gap-3">
              <Switch
                checked={editBoolean}
                onCheckedChange={(checked) => {
                  setEditBoolean(checked);
                  setLocalError(null);
                }}
                disabled={isLoading}
                data-testid={`switch-${field}`}
              />
              <span className="text-sm">{editBoolean ? "Yes" : "No"}</span>
            </div>
            {errorDisplay}
          </>
        );

      case "richtext":
        return (
          <>
            <RichTextEditor
              value={editValue}
              onChange={(val) => {
                setEditValue(val);
                setLocalError(null);
              }}
              placeholder={placeholder}
              data-testid={`richtext-${field}`}
            />
            {errorDisplay}
          </>
        );

      case "phone":
      case "email":
      case "url":
        return renderTypedSingleInput();

      default:
        return (
          <>
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setLocalError(null);
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full text-sm",
                isMobile && "input-prevent-scroll-on-focus",
                displayError && "border-destructive",
              )}
              disabled={isLoading}
              data-testid={`input-${field}`}
            />
            {errorDisplay}
          </>
        );
    }
  };

  const renderEditor = () => {
    if (isMobile) {
      return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm z-50">
          <div
            className="fixed inset-4  rounded-lg border border-input  flex flex-col gap-4 p-6 flex flex-col justify-center"
            style={{ height: viewportHeight - 36 }}
            data-testid={`mobile-editor-${field}`}
          >
            <div className="text-base font-medium shrink-0">{label}</div>
            <div className=" flex flex-col gap-2">{renderEditorContent()}</div>
            {actionButtons}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 w-full">
        {renderEditorContent()}
        {actionButtons}
      </div>
    );
  };

  // Default display rendering for typed values (single + multiple)
  const renderTypedDisplay = () => {
    if (isMultiple) {
      if (!arrayValue || arrayValue.length === 0) return null;
      const isLinkType =
        effectiveType === "phone" ||
        effectiveType === "email" ||
        effectiveType === "url";
      if (!isLinkType) {
        return (
          <div className="flex flex-col gap-1">
            {arrayValue.map((v, i) => (
              <span key={i} className={cn(valueClassName)}>
                {v}
              </span>
            ))}
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-1">
          {arrayValue.map((v, i) => (
            <TypedValueLink
              key={i}
              type={effectiveType}
              value={v}
              testId={`link-${field}-${i}`}
            />
          ))}
        </div>
      );
    }
    if (
      (effectiveType === "phone" ||
        effectiveType === "email" ||
        effectiveType === "url") &&
      value
    ) {
      return (
        <TypedValueLink
          type={effectiveType}
          value={value}
          className={valueClassName}
          testId={`link-${field}`}
        />
      );
    }
    return null;
  };

  const typedDisplay = renderTypedDisplay();
  const hasValueForDisplay = isMultiple
    ? arrayValue && arrayValue.length > 0
    : !!value;

  return (
    <div
      className="group flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="w-3/5 flex-1 text-sm min-w-0">
        {isEditing ? (
          renderEditor()
        ) : (
          <div className="flex items-start gap-2 group  ">
            <div className="flex-1 min-w-0 ">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </div>
              ) : displayValue !== undefined ? (
                displayValue
              ) : typedDisplay && hasValueForDisplay ? (
                typedDisplay
              ) : value ? (
                effectiveType === "richtext" ? (
                  <MarkdownDisplay
                    className={cn(
                      "prose dark:prose-invert max-w-none text-sm [&>*]:my-[0.625em] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words ",
                      valueClassName,
                    )}
                  >
                    {normalizeToMarkdown(value)}
                  </MarkdownDisplay>
                ) : (
                  <span className={cn("whitespace-pre-wrap", valueClassName)}>
                    {value}
                  </span>
                )
              ) : !disabled ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="text-muted-foreground hover:text-foreground text-left cursor-pointer"
                  data-testid={`placeholder-${field}`}
                >
                  {placeholder}
                </button>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            {!disabled && !isLoading && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={startEditing}
                data-testid={`button-edit-${field}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
