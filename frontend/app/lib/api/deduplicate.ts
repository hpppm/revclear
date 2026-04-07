/**
 * In-flight + short-TTL request deduplication.
 *
 * Two layers of deduplication:
 * 1. In-flight: callers that arrive while a request is pending share the same
 *    Promise — only one HTTP request is made.
 * 2. TTL cache: the resolved Promise is kept for TTL_MS after it settles so
 *    that near-simultaneous sequential calls (e.g. two components mounting on
 *    a page navigation within 500 ms) also share the result without firing a
 *    second request.
 */
const TTL_MS = 500;

const pending = new Map<string, Promise<unknown>>();
const resolved = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

export function deduplicateGet<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // 1. In-flight deduplication
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  // 2. Short-TTL cache for recently-resolved promises
  const cached = resolved.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.promise as Promise<T>;

  const promise = fn().finally(() => {
    pending.delete(key);
    // Schedule TTL cache eviction
    setTimeout(() => resolved.delete(key), TTL_MS);
  });

  pending.set(key, promise);
  resolved.set(key, { promise, expiresAt: Date.now() + TTL_MS });
  return promise;
}

/**
 * Invalidate a cached key immediately (call after a mutation that affects
 * the resource, e.g. create/update/delete).
 */
export function invalidateDedupeCache(key: string): void {
  pending.delete(key);
  resolved.delete(key);
}
