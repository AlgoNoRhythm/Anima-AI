import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMemoryCache } from '../memory-adapter';
import type { CacheClient } from '../types';

describe('MemoryCache LRU eviction', () => {
  let cache: CacheClient;

  afterEach(async () => {
    if (cache) await cache.disconnect();
  });

  it('evicts oldest entries when maxEntries is exceeded', async () => {
    cache = createMemoryCache(3);

    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');

    // All 3 should exist
    expect(await cache.get('a')).toBe('1');
    expect(await cache.get('b')).toBe('2');
    expect(await cache.get('c')).toBe('3');

    // Adding 4th should evict the oldest (a, since get moved it but we accessed all)
    // After get('a'), get('b'), get('c'), order is a, b, c
    // Actually after the gets above, order is: a (touched last after initial set reorder), b, c
    // Let's reset and test more carefully
    await cache.flushAll();

    await cache.set('x', '1');
    await cache.set('y', '2');
    await cache.set('z', '3');
    // Order: x, y, z

    await cache.set('w', '4'); // Should evict x (oldest)
    expect(await cache.get('x')).toBeNull();
    expect(await cache.get('y')).toBe('2');
    expect(await cache.get('z')).toBe('3');
    expect(await cache.get('w')).toBe('4');
  });

  it('LRU touch on get moves entry to end', async () => {
    cache = createMemoryCache(3);

    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');
    // Order: a, b, c

    // Touch 'a' by reading it — moves it to end
    await cache.get('a');
    // Order: b, c, a

    // Adding new entry should evict 'b' (now oldest)
    await cache.set('d', '4');
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('a')).toBe('1');
    expect(await cache.get('c')).toBe('3');
    expect(await cache.get('d')).toBe('4');
  });

  it('LRU touch on set (update) moves entry to end', async () => {
    cache = createMemoryCache(3);

    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');
    // Order: a, b, c

    // Update 'a' — moves to end
    await cache.set('a', 'updated');
    // Order: b, c, a

    await cache.set('d', '4'); // Evicts 'b'
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('a')).toBe('updated');
  });

  it('respects maxEntries with incr', async () => {
    cache = createMemoryCache(2);

    await cache.set('a', '1');
    await cache.set('b', '2');
    // Order: a, b

    await cache.incr('c'); // Adds new key, should evict 'a'
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBe('2');
    expect(await cache.get('c')).toBe('1');
  });

  it('default max entries is 10000', async () => {
    // Just verify it accepts the default without error
    cache = createMemoryCache();
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });
});
