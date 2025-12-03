type CacheEntry<T> = { value: T; expires: number };
const CACHE = new Map<string, CacheEntry<any>>();

export function setCache<T>(key: string, value: T, ttlMs: number) {
  CACHE.set(key, { value, expires: Date.now() + ttlMs });
}

export function getCache<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}
