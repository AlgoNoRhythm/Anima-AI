import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../app.js';
import { createCacheClient, type CacheClient } from '@anima-ai/cache';

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_SECONDS = 60;

// Singleton cache client (falls back to in-memory when no REDIS_URL is set)
let cacheClient: CacheClient | null = null;

function getCache(): CacheClient {
  if (!cacheClient) {
    cacheClient = createCacheClient();
  }
  return cacheClient;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimiter(
  maxRequests?: number,
  windowSeconds?: number,
): MiddlewareHandler<AppEnv> {
  const max = maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || DEFAULT_MAX_REQUESTS;
  const window = windowSeconds || parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '', 10) || DEFAULT_WINDOW_SECONDS;

  return async (c, next) => {
    // Use session token or IP as key
    const sessionToken = c.req.header('X-Session-Token') || '';
    // Take only the first IP from x-forwarded-for (client IP) to prevent spoofing
    const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwardedFor || c.req.header('x-real-ip') || 'unknown';
    const identifier = sessionToken || ip;
    const key = `ratelimit:${identifier}`;

    const cache = getCache();
    const now = Date.now();

    const raw = await cache.get(key);
    let entry: RateLimitEntry | null = raw ? JSON.parse(raw) : null;

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + window * 1000 };
      await cache.set(key, JSON.stringify(entry), window);
    } else {
      entry.count++;
      if (entry.count > max) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json(
          { error: 'Rate limit exceeded', retryAfter: Math.ceil((entry.resetAt - now) / 1000) },
          429,
        );
      }
      // Update count in cache, preserving remaining TTL
      const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
      await cache.set(key, JSON.stringify(entry), remainingSeconds);
    }

    await next();
  };
}

// For testing
export async function resetRateLimiter() {
  if (cacheClient) {
    await cacheClient.flushAll();
  }
  cacheClient = null;
}
