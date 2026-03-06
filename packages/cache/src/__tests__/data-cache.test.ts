import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withJitter, getCachedPageData, setCachedPageData, invalidatePageData, setCachedProject } from '../data-cache';
import { createMemoryCache } from '../memory-adapter';
import type { CacheClient } from '../types';

describe('withJitter', () => {
  it('returns a value within ±20% of input', () => {
    const ttl = 300;
    // Run many times to test distribution
    for (let i = 0; i < 100; i++) {
      const result = withJitter(ttl);
      expect(result).toBeGreaterThanOrEqual(240); // 300 - 60
      expect(result).toBeLessThanOrEqual(360);    // 300 + 60
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('handles small TTL values', () => {
    for (let i = 0; i < 50; i++) {
      const result = withJitter(1);
      expect(result).toBeGreaterThanOrEqual(1); // floor of 0.8 rounds to 1
      expect(result).toBeLessThanOrEqual(2);    // ceil of 1.2 rounds to 1
    }
  });

  it('returns 0 for TTL of 0', () => {
    expect(withJitter(0)).toBe(0);
  });
});

describe('Page data cache', () => {
  let cache: CacheClient;

  beforeEach(() => {
    cache = createMemoryCache();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('returns null on cache miss', async () => {
    const result = await getCachedPageData(cache, 'my-slug', 'en');
    expect(result).toBeNull();
  });

  it('stores and retrieves page data', async () => {
    const data = { project: { id: '123', name: 'Test' }, personality: null };
    await setCachedPageData(cache, 'my-slug', 'en', data);

    const result = await getCachedPageData(cache, 'my-slug', 'en');
    expect(result).toEqual(data);
  });

  it('separates data by locale', async () => {
    const enData = { lang: 'en' };
    const deData = { lang: 'de' };

    await setCachedPageData(cache, 'slug', 'en', enData);
    await setCachedPageData(cache, 'slug', 'de', deData);

    expect(await getCachedPageData(cache, 'slug', 'en')).toEqual(enData);
    expect(await getCachedPageData(cache, 'slug', 'de')).toEqual(deData);
  });

  it('invalidates page data', async () => {
    await setCachedPageData(cache, 'slug', 'en', { data: true });
    await invalidatePageData(cache, 'slug', 'en');
    expect(await getCachedPageData(cache, 'slug', 'en')).toBeNull();
  });

  it('applies jitter to TTL (set calls use withJitter)', async () => {
    vi.useFakeTimers();
    try {
      // Set with 10s TTL — jitter gives 8-12s
      await setCachedPageData(cache, 'slug', 'en', { test: true }, 10);

      // Should still be available at 7s
      vi.advanceTimersByTime(7_000);
      expect(await getCachedPageData(cache, 'slug', 'en')).not.toBeNull();

      // Should be gone at 13s (beyond max jittered TTL of 12s)
      vi.advanceTimersByTime(6_000);
      expect(await getCachedPageData(cache, 'slug', 'en')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Existing cache functions apply jitter', () => {
  let cache: CacheClient;

  beforeEach(() => {
    cache = createMemoryCache();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('setCachedProject applies jitter (value persists within min jitter range)', async () => {
    vi.useFakeTimers();
    try {
      await setCachedProject(cache, 'test-slug', { id: '1' }, 10);

      // Should exist at 7s (before min jittered TTL of 8s)
      vi.advanceTimersByTime(7_000);
      const result = await cache.get('data:project:test-slug');
      expect(result).not.toBeNull();

      // Should be gone at 13s (after max jittered TTL of 12s)
      vi.advanceTimersByTime(6_000);
      const expired = await cache.get('data:project:test-slug');
      expect(expired).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
