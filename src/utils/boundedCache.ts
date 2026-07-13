/**
 * Insert into a module-level Map with FIFO eviction once it exceeds `max`
 * entries. Session-scoped image/info caches would otherwise grow unbounded as a
 * user browses many destinations; capping the oldest entry keeps memory flat
 * while preserving the hot set. Insertion order is Map's natural iteration
 * order, so the first key is the oldest.
 */
export function setBounded<K, V>(cache: Map<K, V>, key: K, value: V, max: number): void {
  cache.set(key, value);
  if (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}
