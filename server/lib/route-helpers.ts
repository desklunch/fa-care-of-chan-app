import { Response } from "express";
import { ServiceError } from "../services/base.service";

export function handleServiceError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof ServiceError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
      FORBIDDEN: 403,
      CONFLICT: 409,
    };
    const status = statusMap[error.code] || 500;
    res.status(status).json({ message: error.message, details: error.details });
    return;
  }
  console.error(fallbackMessage, error);
  res.status(500).json({ message: fallbackMessage });
}
