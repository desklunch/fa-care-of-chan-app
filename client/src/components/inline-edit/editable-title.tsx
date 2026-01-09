import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditableTitleProps } from "./types";

export function EditableTitle({
  value,
  onSave,
  testId,
  disabled = false,
  isLoading = false,
  error,
  validation,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  const validateLocally = (val: string): string | null => {
    if (!validation) return null;
    
    if (validation.required && !val.trim()) {
      return "This field is required";
    }
    
    if (validation.minLength && val.length < validation.minLength) {
      return `Must be at least ${validation.minLength} characters`;
    }
    
    if (validation.maxLength && val.length > validation.maxLength) {
      return `Must be no more than ${validation.maxLength} characters`;
    }
    
    if (validation.pattern && !validation.pattern.test(val)) {
      return "Invalid format";
    }
    
    if (validation.customValidator) {
      return validation.customValidator(val);
    }
    
    return null;
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    
    const validationError = validateLocally(trimmed);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    
    if (trimmed && trimmed !== value) {
      setLocalError(null);
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setLocalError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const displayError = localError || error;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={cn(
              "text-3xl font-bold flex-1 bg-transparent border-b-2 outline-none",
              displayError ? "border-destructive" : "border-primary"
            )}
            data-testid={`input-${testId}`}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid={`button-cancel-${testId}`}
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading}
            data-testid={`button-save-${testId}`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </Button>
        </div>
        {displayError && (
          <p className="text-sm text-destructive" data-testid={`error-${testId}`}>
            {displayError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2"
      onDoubleClick={() => {
        if (!disabled && !isLoading) {
          setIsEditing(true);
          setLocalError(null);
        }
      }}
    >
      {isLoading ? (
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-2xl font-bold text-muted-foreground">Saving...</span>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold" data-testid={testId}>
            {value}
          </h1>
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => {
                setIsEditing(true);
                setLocalError(null);
              }}
              data-testid={`button-edit-${testId}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
