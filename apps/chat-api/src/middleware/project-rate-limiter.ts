import { createCacheClient, type CacheClient } from '@anima-ai/cache';

const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_WINDOW_SECONDS = 60;

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

interface RateLimitResult {
  error: string;
  retryAfter: number;
}

export async function checkProjectRateLimit(
  projectId: string,
  identifier: string,
  options?: { maxRequests?: number; windowSeconds?: number },
): Promise<RateLimitResult | null> {
  const max = options?.maxRequests || DEFAULT_MAX_REQUESTS;
  const window = options?.windowSeconds || DEFAULT_WINDOW_SECONDS;
  const key = `ratelimit:project:${projectId}:${identifier}`;

  const cache = getCache();
  const now = Date.now();

  const raw = await cache.get(key);
  let entry: RateLimitEntry | null = raw ? JSON.parse(raw) : null;

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + window * 1000 };
    await cache.set(key, JSON.stringify(entry), window);
    return null;
  }

  entry.count++;
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { error: 'Rate limit exceeded', retryAfter };
  }

  const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
  await cache.set(key, JSON.stringify(entry), remainingSeconds);
  return null;
}
