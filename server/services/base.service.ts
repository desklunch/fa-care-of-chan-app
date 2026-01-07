import type { IStorage } from "../storage";

export interface ServiceContext {
  actorId: string;
  storage: IStorage;
}

export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServiceError";
  }

  static notFound(entity: string, id?: string): ServiceError {
    const message = id ? `${entity} with id '${id}' not found` : `${entity} not found`;
    return new ServiceError("NOT_FOUND", message, 404);
  }

  static validation(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError("VALIDATION_ERROR", message, 400, details);
  }

  static forbidden(message: string = "You do not have permission to perform this action"): ServiceError {
    return new ServiceError("FORBIDDEN", message, 403);
  }

  static conflict(message: string): ServiceError {
    return new ServiceError("CONFLICT", message, 409);
  }
}

export abstract class BaseService {
  protected storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  protected ensureExists<T>(value: T | null | undefined, entity: string, id?: string): T {
    if (!value) {
      throw ServiceError.notFound(entity, id);
    }
    return value;
  }
}
