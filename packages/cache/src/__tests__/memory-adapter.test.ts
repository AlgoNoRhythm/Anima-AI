import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMemoryCache } from '../memory-adapter';
import type { CacheClient } from '../types';

describe('MemoryCacheAdapter', () => {
  let cache: CacheClient;

  beforeEach(() => {
    cache = createMemoryCache();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  it('gets and sets values', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
  });

  it('returns null for missing keys', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('deletes values', async () => {
    await cache.set('key', 'val');
    await cache.del('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('increments values', async () => {
    expect(await cache.incr('counter')).toBe(1);
    expect(await cache.incr('counter')).toBe(2);
    expect(await cache.incr('counter')).toBe(3);
  });

  it('increments existing string numbers', async () => {
    await cache.set('counter', '10');
    expect(await cache.incr('counter')).toBe(11);
  });

  it('checks existence', async () => {
    expect(await cache.exists('key')).toBe(false);
    await cache.set('key', 'val');
    expect(await cache.exists('key')).toBe(true);
  });

  it('respects TTL', async () => {
    vi.useFakeTimers();
    try {
      await cache.set('ttl-key', 'value', 1);
      expect(await cache.get('ttl-key')).toBe('value');

      vi.advanceTimersByTime(1500);
      expect(await cache.get('ttl-key')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sets expiry on existing key', async () => {
    vi.useFakeTimers();
    try {
      await cache.set('key', 'value');
      await cache.expire('key', 1);
      expect(await cache.get('key')).toBe('value');

      vi.advanceTimersByTime(1500);
      expect(await cache.get('key')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('finds keys by pattern', async () => {
    await cache.set('user:1', 'a');
    await cache.set('user:2', 'b');
    await cache.set('post:1', 'c');

    const userKeys = await cache.keys('user:*');
    expect(userKeys).toHaveLength(2);
    expect(userKeys).toContain('user:1');
    expect(userKeys).toContain('user:2');
  });

  it('flushes all data', async () => {
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.flushAll();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });
});
