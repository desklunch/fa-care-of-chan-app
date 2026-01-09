import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FieldError, FieldMutationState, FieldValidation } from "./types";

interface UseFieldMutationOptions {
  entityType: string;
  entityId: string | number;
  queryKey: (string | number | undefined)[];
  additionalQueryKeys?: (string | number | undefined)[][];
  onSuccess?: (field: string, value: unknown) => void;
  onError?: (field: string, error: Error) => void;
}

export function useFieldMutation({
  entityType,
  entityId,
  queryKey,
  additionalQueryKeys = [],
  onSuccess,
  onError,
}: UseFieldMutationOptions) {
  const { toast } = useToast();
  const [state, setState] = useState<FieldMutationState>({
    isLoading: false,
    error: null,
    fieldBeingSaved: null,
  });

  const mutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: unknown }) => {
      return apiRequest("PATCH", `/api/${entityType}/${entityId}`, { [field]: value });
    },
    onMutate: ({ field }) => {
      setState({
        isLoading: true,
        error: null,
        fieldBeingSaved: field,
      });
    },
    onSuccess: (_, { field, value }) => {
      setState({
        isLoading: false,
        error: null,
        fieldBeingSaved: null,
      });
      queryClient.invalidateQueries({ queryKey });
      additionalQueryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      onSuccess?.(field, value);
    },
    onError: (error: Error, { field }) => {
      const fieldError: FieldError = {
        field,
        message: error.message || "Failed to save",
      };
      setState({
        isLoading: false,
        error: fieldError,
        fieldBeingSaved: null,
      });
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
      onError?.(field, error);
    },
  });

  const validateField = useCallback((
    value: unknown,
    validation?: FieldValidation
  ): string | null => {
    if (!validation) return null;

    if (validation.required && (value === null || value === undefined || value === "")) {
      return "This field is required";
    }

    if (typeof value === "string") {
      if (validation.minLength && value.length < validation.minLength) {
        return `Must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Must be no more than ${validation.maxLength} characters`;
      }
      if (validation.pattern && !validation.pattern.test(value)) {
        return "Invalid format";
      }
    }

    if (validation.schema) {
      const result = validation.schema.safeParse(value);
      if (!result.success) {
        return result.error.errors[0]?.message || "Invalid value";
      }
    }

    if (validation.customValidator) {
      return validation.customValidator(value);
    }

    return null;
  }, []);

  const saveField = useCallback((
    field: string,
    value: unknown,
    validation?: FieldValidation
  ) => {
    const validationError = validateField(value, validation);
    if (validationError) {
      setState({
        isLoading: false,
        error: { field, message: validationError },
        fieldBeingSaved: null,
      });
      return false;
    }

    mutation.mutate({ field, value });
    return true;
  }, [mutation, validateField]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const isFieldLoading = useCallback((field: string) => {
    return state.isLoading && state.fieldBeingSaved === field;
  }, [state.isLoading, state.fieldBeingSaved]);

  const getFieldError = useCallback((field: string) => {
    return state.error?.field === field ? state.error.message : null;
  }, [state.error]);

  return {
    saveField,
    isLoading: state.isLoading,
    fieldBeingSaved: state.fieldBeingSaved,
    error: state.error,
    clearError,
    isFieldLoading,
    getFieldError,
    validateField,
  };
}
