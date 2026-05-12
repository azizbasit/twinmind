type CacheEntry<T> = {
  value: T;
  expiry: number | null;
  timer?: any;
};

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private static instance: InMemoryCache;

  private constructor() {}

  public static getInstance(): InMemoryCache {
    if (!InMemoryCache.instance) {
      InMemoryCache.instance = new InMemoryCache();
    }
    return InMemoryCache.instance;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttlMs Time to live in milliseconds (optional)
   */
  public set<T>(key: string, value: T, ttlMs?: number): void {
    // Clear existing timer if any
    const existing = this.cache.get(key);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    let timer: any;
    let expiry: number | null = null;

    if (ttlMs) {
      expiry = Date.now() + ttlMs;
      timer = setTimeout(() => {
        this.delete(key);
      }, ttlMs);
      
      // Ensure timer doesn't prevent process from exiting (Node.js only)
      if (timer && typeof timer === 'object' && typeof timer.unref === 'function') {
        timer.unref();
      }
    }

    this.cache.set(key, { value, expiry, timer });
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found/expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Double check expiry (though setTimeout should handle it)
    if (entry.expiry && entry.expiry < Date.now()) {
      this.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a key from the cache
   * @param key Cache key
   */
  public delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry?.timer) {
      clearTimeout(entry.timer);
    }
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  public clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    }
    this.cache.clear();
  }

  /**
   * Increment a numeric value (useful for rate limiting)
   * @param key Cache key
   * @param ttlMs TTL for the key if it doesn't exist
   * @returns The new value
   */
  public incr(key: string, ttlMs?: number): number {
    const current = this.get<number>(key) || 0;
    const newVal = current + 1;
    
    // If it's the first increment, set the TTL
    if (current === 0) {
      this.set(key, newVal, ttlMs);
    } else {
      // Maintain existing expiry
      const entry = this.cache.get(key);
      const remainingTtl = entry?.expiry ? entry.expiry - Date.now() : undefined;
      this.set(key, newVal, remainingTtl);
    }
    
    return newVal;
  }
}

export const cache = InMemoryCache.getInstance();
