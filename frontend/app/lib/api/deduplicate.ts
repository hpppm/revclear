/**
 * In-flight request deduplication.
 *
 * If two callers request the same key while a request is already in-flight,
 * they both receive the same Promise — only one HTTP request is made.
 * The entry is cleared as soon as the request settles (success or error).
 */
const pending = new Map<string, Promise<any>>();

export function deduplicateGet<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing;

  const promise = fn().finally(() => {
    pending.delete(key);
  });

  pending.set(key, promise);
  return promise;
}
