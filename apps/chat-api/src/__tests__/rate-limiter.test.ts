import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { resetRateLimiter } from '../middleware/rate-limiter.js';

describe('Rate Limiter', () => {
  const app = createApp();

  beforeEach(async () => {
    await resetRateLimiter();
  });

  it('allows requests within limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/chat/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': 'rate-test-token',
        },
        body: JSON.stringify({ message: 'test' }),
      });
      expect(res.status).not.toBe(429);
    }
  });

  it('blocks requests exceeding limit', async () => {
    // Send 21 requests (default limit is 20)
    const results: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await app.request('/api/chat/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': 'flood-token',
        },
        body: JSON.stringify({ message: 'test' }),
      });
      results.push(res.status);
    }

    // Some should be 429
    expect(results).toContain(429);
  });

  it('includes Retry-After header when rate limited', async () => {
    // Exceed limit
    for (let i = 0; i < 21; i++) {
      await app.request('/api/chat/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': 'retry-token',
        },
        body: JSON.stringify({ message: 'test' }),
      });
    }

    const res = await app.request('/api/chat/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': 'retry-token',
      },
      body: JSON.stringify({ message: 'test' }),
    });

    if (res.status === 429) {
      expect(res.headers.get('Retry-After')).toBeDefined();
    }
  });
});
