/**
 * Query utilities for optimizing relational database queries.
 * 
 * These utilities help consolidate multiple sequential queries into single
 * queries with JOINs, then group the results in memory. This significantly
 * reduces latency when querying Neon serverless PostgreSQL.
 * 
 * Pattern: Instead of N+1 queries, we fetch all related data in one query
 * and use these grouping utilities to organize the results by entity ID.
 */

/**
 * Groups an array of joined results by a key field.
 * Useful for converting flat JOIN results into nested structures.
 * 
 * @example
 * const results = await db.select().from(venues).leftJoin(photos, eq(venues.id, photos.venueId));
 * const grouped = groupByKey(results, 'venueId', (r) => r.photo);
 * // Returns Map<venueId, Photo[]>
 */
export function groupByKey<T, K extends string | number, V>(
  items: T[],
  keyExtractor: (item: T) => K | null | undefined,
  valueExtractor: (item: T) => V | null | undefined
): Map<K, V[]> {
  const map = new Map<K, V[]>();
  
  for (const item of items) {
    const key = keyExtractor(item);
    const value = valueExtractor(item);
    
    if (key != null && value != null) {
      const existing = map.get(key);
      if (existing) {
        existing.push(value);
      } else {
        map.set(key, [value]);
      }
    }
  }
  
  return map;
}

/**
 * Groups joined results and returns arrays for each key, with empty array as default.
 * Similar to groupByKey but returns empty arrays for missing keys.
 */
export function groupByKeyWithDefault<T, K extends string | number, V>(
  items: T[],
  keyExtractor: (item: T) => K | null | undefined,
  valueExtractor: (item: T) => V | null | undefined,
  allKeys: K[]
): Map<K, V[]> {
  const map = groupByKey(items, keyExtractor, valueExtractor);
  
  for (const key of allKeys) {
    if (!map.has(key)) {
      map.set(key, []);
    }
  }
  
  return map;
}

/**
 * Deduplicates an array of objects by a key field.
 * Useful when JOINs produce duplicate rows.
 */
export function dedupeByKey<T, K>(
  items: T[],
  keyExtractor: (item: T) => K
): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  
  for (const item of items) {
    const key = keyExtractor(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Creates a lookup map from an array of items.
 * Useful for O(1) lookups when joining data in memory.
 */
export function createLookupMap<T, K extends string | number>(
  items: T[],
  keyExtractor: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keyExtractor(item), item);
  }
  return map;
}

/**
 * Executes multiple async operations in parallel and returns results.
 * Unlike Promise.all, this is designed for database queries where
 * connection pooling may limit parallelism benefits.
 * 
 * Note: For Neon serverless, parallel queries can sometimes be slower
 * due to connection pooling limits. Use this for independent queries
 * that don't share connections, or when query count is small (2-3).
 */
export async function parallelQueries<T extends readonly unknown[]>(
  ...queries: { [K in keyof T]: () => Promise<T[K]> }
): Promise<T> {
  return Promise.all(queries.map(fn => fn())) as Promise<T>;
}
