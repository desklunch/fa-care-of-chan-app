import { vi } from "vitest";
import type { IStorage } from "../storage";

export function createMockStorage(): IStorage {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (typeof prop === "string") {
        if (!_target[prop]) {
          _target[prop] = vi.fn();
        }
        return _target[prop];
      }
      return undefined;
    },
  };
  return new Proxy({} as Record<string, unknown>, handler) as unknown as IStorage;
}
