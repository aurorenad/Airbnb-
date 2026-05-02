
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();


export const getCache = (key: string): any | null => {
  const entry = cacheStore.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data;
};

/**
 * Set cache data with TTL (Time To Live)
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds
 */
export const setCache = (key: string, data: any, ttlSeconds: number = 60): void => {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { data, expiresAt });
};

/**
 * Delete cache entry by key
 */
export const deleteCache = (key: string): void => {
  cacheStore.delete(key);
};

/**
 * Delete multiple cache entries by pattern
 * Useful for invalidating related caches
 */
export const deleteCacheByPattern = (pattern: string): void => {
  const keys = Array.from(cacheStore.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  });
};

/**
 * Clear all cache entries
 */
export const clearCache = (): void => {
  cacheStore.clear();
};

/**
 * Clean expired entries from cache (optional maintenance)
 */
export const cleanupExpiredCache = (): void => {
  const keys = Array.from(cacheStore.keys());
  keys.forEach(key => {
    const entry = cacheStore.get(key);
    if (entry && Date.now() > entry.expiresAt) {
      cacheStore.delete(key);
    }
  });
};
