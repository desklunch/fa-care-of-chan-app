import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Pencil, Check, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { EditableFieldProps } from "./types";

const MOBILE_BREAKPOINT = 768;

export function EditableField({
  label,
  value,
  field,
  testId,
  type = "text",
  options = [],
  multiSelectValues = [],
  arrayValue = [],
  booleanValue = false,
  onSave,
  displayValue,
  placeholder = "Not set",
  disabled = false,
  valueClassName,
  isLoading = false,
  error,
  validation,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [selectedMulti, setSelectedMulti] = useState<string[]>(multiSelectValues);
  const [editArray, setEditArray] = useState<string[]>(arrayValue);
  const [editBoolean, setEditBoolean] = useState(booleanValue);
  const [dateOpen, setDateOpen] = useState(false);
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
    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight;
    
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

    const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight;
    setViewportHeight(getViewportHeight());

    const handleViewportResize = () => {
      setViewportHeight(getViewportHeight());
    };

    window.visualViewport?.addEventListener("resize", handleViewportResize);
    
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
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
      const scrollY = window.scrollY;
      const html = document.documentElement;
      const body = document.body;
      
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      
      return () => {
        html.style.overflow = "";
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isEditing, isMobile]);

  const validateLocally = useCallback((val: unknown): string | null => {
    if (!validation) return null;
    
    if (validation.required && (val === null || val === undefined || val === "")) {
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
  }, [validation]);

  const handleSave = () => {
    let saveValue: unknown;
    
    switch (type) {
      case "multiselect":
        saveValue = selectedMulti;
        break;
      case "array":
        saveValue = editArray.filter(v => v.trim() !== "");
        break;
      case "switch":
        saveValue = editBoolean;
        break;
      case "date":
        saveValue = editValue || null;
        break;
      default:
        saveValue = editValue || null;
    }
    
    const validationError = validateLocally(saveValue);
    if (validationError) {
      setLocalError(validationError);
      return;
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
    setIsEditing(false);
    setDateOpen(false);
    setLocalError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea" && type !== "array") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleDoubleClick = () => {
    if (!disabled && !isLoading) {
      setIsEditing(true);
      setLocalError(null);
    }
  };

  const toggleMultiSelect = (val: string) => {
    setSelectedMulti(prev => 
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const displayError = localError || error;

  const errorDisplay = displayError && (
    <p className="text-sm text-destructive" data-testid={`error-${field}`}>{displayError}</p>
  );

  const actionButtons = (
    <div className="flex gap-2 justify-end">
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={handleCancel} 
        disabled={isLoading}
        data-testid={`button-cancel-${field}`}
      >
        <X className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        onClick={handleSave} 
        disabled={isLoading}
        data-testid={`button-save-${field}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const renderEditorContent = () => {
    switch (type) {
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
                isMobile && "min-h-0",
                displayError && "border-destructive"
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
                  <SelectItem key={opt.value || "__none__"} value={opt.value || "__none__"}>
                    {opt.label}
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
                    displayError && "border-destructive"
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

      case "multiselect":
        return (
          <>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={selectedMulti.includes(opt.value) ? "default" : "outline"}
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

      case "array":
        return (
          <>
            <div className="flex flex-col gap-2 flex-1 overflow-auto">
              {editArray.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newArray = [...editArray];
                      newArray[index] = e.target.value;
                      setEditArray(newArray);
                      setLocalError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") handleCancel();
                    }}
                    className="flex-1"
                    disabled={isLoading}
                    data-testid={`input-${field}-${index}`}
                    autoFocus={index === 0}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditArray(editArray.filter((_, i) => i !== index));
                    }}
                    disabled={isLoading}
                    data-testid={`button-remove-${field}-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditArray([...editArray, ""])}
                disabled={isLoading}
                data-testid={`button-add-${field}`}
              >
                Add
              </Button>
            </div>
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
              className={cn("w-full text-sm", displayError && "border-destructive")}
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
      const mobileOverlay = (
        <div 
          className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm touch-none overscroll-none"
          style={{ height: viewportHeight-50 }}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div 
            className="absolute top-4 bottom-4 left-4 right-4 rounded-lg border shadow-lg flex flex-col gap-4 p-4 touch-auto overscroll-contain"
            data-testid={`mobile-editor-${field}`}
          >
            <div className="text-sm font-semibold shrink-0">{label}</div>
            <div className="flex-1 flex flex-col gap-2 overflow-auto">
              {renderEditorContent()}
            </div>
            {actionButtons}
          </div>
        </div>
      );
      return createPortal(mobileOverlay, document.body);
    }

    return (
      <div className="flex flex-col gap-2 w-full">
        {renderEditorContent()}
        {actionButtons}
      </div>
    );
  };

  return (
    <div
      className="group flex py-4 border-b border-border/50 last:border-b-0"
      data-testid={testId}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-2/5 text-sm font-semibold shrink-0">{label}</div>
      <div className="flex-1 text-sm">
        {isEditing ? (
          renderEditor()
        ) : (
          <div className="flex items-start gap-2 group">
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </div>
              ) : displayValue !== undefined ? (
                displayValue
              ) : value ? (
                <span className={cn("whitespace-pre-wrap", valueClassName)}>{value}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            {!disabled && !isLoading && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => {
                  setIsEditing(true);
                  setLocalError(null);
                }}
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
