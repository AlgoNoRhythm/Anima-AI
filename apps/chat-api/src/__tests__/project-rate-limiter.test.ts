import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cache module before imports
vi.mock('@anima-ai/cache', () => {
  const store = new Map<string, string>();
  return {
    createCacheClient: vi.fn(() => ({
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      delete: vi.fn(async (key: string) => store.delete(key)),
      _store: store,
    })),
  };
});

import { createCacheClient } from '@anima-ai/cache';
import { checkProjectRateLimit } from '../middleware/project-rate-limiter.js';

function getCacheStore(): Map<string, string> {
  return (vi.mocked(createCacheClient)() as any)._store;
}

beforeEach(() => {
  getCacheStore().clear();
});

describe('checkProjectRateLimit', () => {
  it('allows the first request', async () => {
    const result = await checkProjectRateLimit('proj-1', 'user-1');
    expect(result).toBeNull();
  });

  it('allows requests within limit', async () => {
    for (let i = 0; i < 20; i++) {
      const result = await checkProjectRateLimit('proj-1', 'user-1');
      expect(result).toBeNull();
    }
  });

  it('blocks requests exceeding default limit of 20', async () => {
    for (let i = 0; i < 20; i++) {
      await checkProjectRateLimit('proj-1', 'user-1');
    }
    const result = await checkProjectRateLimit('proj-1', 'user-1');
    expect(result).not.toBeNull();
    expect(result!.error).toBe('Rate limit exceeded');
    expect(result!.retryAfter).toBeGreaterThan(0);
  });

  it('respects custom maxRequests', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 5 });
      expect(result).toBeNull();
    }
    const result = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 5 });
    expect(result).not.toBeNull();
    expect(result!.error).toBe('Rate limit exceeded');
  });

  it('uses per-project keys (different projects are independent)', async () => {
    // Exhaust limit on project A
    for (let i = 0; i < 3; i++) {
      await checkProjectRateLimit('proj-A', 'user-1', { maxRequests: 3 });
    }
    const blockedA = await checkProjectRateLimit('proj-A', 'user-1', { maxRequests: 3 });
    expect(blockedA).not.toBeNull();

    // Project B should still be allowed
    const resultB = await checkProjectRateLimit('proj-B', 'user-1', { maxRequests: 3 });
    expect(resultB).toBeNull();
  });

  it('uses per-user keys (different users are independent)', async () => {
    // Exhaust limit for user-1
    for (let i = 0; i < 3; i++) {
      await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 3 });
    }
    const blockedUser1 = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 3 });
    expect(blockedUser1).not.toBeNull();

    // user-2 on the same project should still be allowed
    const resultUser2 = await checkProjectRateLimit('proj-1', 'user-2', { maxRequests: 3 });
    expect(resultUser2).toBeNull();
  });

  it('resets counter after window expires', async () => {
    // Set up a very short window by manipulating cache
    for (let i = 0; i < 3; i++) {
      await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 3, windowSeconds: 1 });
    }
    const blocked = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 3, windowSeconds: 1 });
    expect(blocked).not.toBeNull();

    // Simulate window expiry by clearing cache entry
    const store = getCacheStore();
    store.delete('ratelimit:project:proj-1:user-1');

    // Should be allowed again
    const result = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 3, windowSeconds: 1 });
    expect(result).toBeNull();
  });

  it('returns retryAfter in seconds', async () => {
    for (let i = 0; i < 5; i++) {
      await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 5, windowSeconds: 60 });
    }
    const result = await checkProjectRateLimit('proj-1', 'user-1', { maxRequests: 5, windowSeconds: 60 });
    expect(result).not.toBeNull();
    expect(result!.retryAfter).toBeGreaterThan(0);
    expect(result!.retryAfter).toBeLessThanOrEqual(60);
  });
});
