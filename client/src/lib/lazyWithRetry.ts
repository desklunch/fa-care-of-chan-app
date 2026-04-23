import { lazy, type ComponentType } from "react";

const RETRY_DELAYS_MS = [300, 900, 2400];

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = (error as Error)?.message || String(error);
  return (
    /Loading chunk \d+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /dynamically imported module/i.test(message)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (attempt === RETRY_DELAYS_MS.length || !isChunkLoadError(error)) {
          break;
        }
        const jitter = Math.random() * 150;
        await wait(RETRY_DELAYS_MS[attempt] + jitter);
      }
    }
    throw lastError;
  });
}
