import type { CacheClient } from './types';

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

const DEFAULT_MAX_ENTRIES = 10_000;

export function createMemoryCache(maxEntries: number = DEFAULT_MAX_ENTRIES): CacheClient {
  const store = new Map<string, CacheEntry>();

  // Proactive cleanup: sweep expired entries every 60s
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        store.delete(key);
      }
    }
  }, 60_000);
  cleanupInterval.unref();

  function isExpired(entry: CacheEntry): boolean {
    if (entry.expiresAt === null) return false;
    return Date.now() > entry.expiresAt;
  }

  /** Move key to end of Map (most recently used). */
  function touch(key: string, entry: CacheEntry): void {
    store.delete(key);
    store.set(key, entry);
  }

  /** Evict oldest entries (front of Map) until under maxEntries. */
  function evictIfNeeded(): void {
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) {
        store.delete(oldest);
      } else {
        break;
      }
    }
  }

  function getEntry(key: string): CacheEntry | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      store.delete(key);
      return null;
    }
    // Move to end (LRU touch)
    touch(key, entry);
    return entry;
  }

  return {
    async get(key) {
      const entry = getEntry(key);
      return entry?.value ?? null;
    },

    async set(key, value, ttlSeconds) {
      // Delete first so re-insert goes to end of Map
      store.delete(key);
      store.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
      evictIfNeeded();
    },

    async del(key) {
      store.delete(key);
    },

    async incr(key) {
      const entry = getEntry(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = (isNaN(current) ? 0 : current) + 1;
      store.delete(key);
      store.set(key, {
        value: String(next),
        expiresAt: entry?.expiresAt ?? null,
      });
      evictIfNeeded();
      return next;
    },

    async expire(key, ttlSeconds) {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + ttlSeconds * 1000;
      }
    },

    async exists(key) {
      return getEntry(key) !== null;
    },

    async keys(pattern) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const now = Date.now();
      const result: string[] = [];
      // Snapshot keys to avoid mutation during iteration (getEntry does LRU touch)
      const allKeys = [...store.keys()];
      for (const key of allKeys) {
        const entry = store.get(key);
        if (!entry) continue;
        if (entry.expiresAt !== null && now > entry.expiresAt) {
          store.delete(key);
          continue;
        }
        if (regex.test(key)) {
          result.push(key);
        }
      }
      return result;
    },

    async flushAll() {
      store.clear();
    },

    async disconnect() {
      clearInterval(cleanupInterval);
      store.clear();
    },
  };
}
