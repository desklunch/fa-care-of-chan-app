/**
 * Shared Route Utilities
 * 
 * Common helpers used across domain route handlers.
 * Keep routes DRY by centralizing repeated patterns here.
 */

import { Response } from 'express';
import { ServiceError } from '../services/base.service';

/**
 * Handles ServiceError exceptions and sends appropriate HTTP responses.
 * Use this in route handlers to convert service-layer errors to HTTP responses.
 * 
 * @example
 * try {
 *   const result = await someService.doSomething();
 *   res.json(result);
 * } catch (error) {
 *   handleServiceError(res, error, 'Failed to do something');
 * }
 */
export function handleServiceError(
  res: Response,
  error: unknown,
  fallbackMessage: string
): void {
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

/**
 * Standard error response helper for non-ServiceError cases.
 * Use for simple error responses in routes without service layers.
 * 
 * @example
 * if (!entity) {
 *   return sendNotFound(res, 'Venue');
 * }
 */
export function sendNotFound(res: Response, entityType: string): void {
  res.status(404).json({ message: `${entityType} not found` });
}

/**
 * Standard server error response.
 * Use when catching unexpected errors in route handlers.
 */
export function sendServerError(
  res: Response,
  error: unknown,
  message: string
): void {
  console.error(message, error);
  res.status(500).json({ message });
}

/**
 * Validates that a required parameter exists.
 * Returns true if valid, sends 400 response and returns false if not.
 * 
 * @example
 * if (!validateRequired(res, req.params.id, 'id')) return;
 */
export function validateRequired(
  res: Response,
  value: unknown,
  paramName: string
): boolean {
  if (value === undefined || value === null || value === '') {
    res.status(400).json({ message: `Missing required parameter: ${paramName}` });
    return false;
  }
  return true;
}
