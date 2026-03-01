import type { CacheClient } from './types';

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export function createMemoryCache(): CacheClient {
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

  function getEntry(key: string): CacheEntry | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  return {
    async get(key) {
      const entry = getEntry(key);
      return entry?.value ?? null;
    },

    async set(key, value, ttlSeconds) {
      store.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },

    async del(key) {
      store.delete(key);
    },

    async incr(key) {
      const entry = getEntry(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = (isNaN(current) ? 0 : current) + 1;
      store.set(key, {
        value: String(next),
        expiresAt: entry?.expiresAt ?? null,
      });
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
      const result: string[] = [];
      for (const [key] of store) {
        if (regex.test(key) && getEntry(key)) {
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
