import type { CacheClient } from './types';
import { createMemoryCache } from './memory-adapter';
import { createValkeyCache } from './valkey-adapter';
import { createLogger } from '@anima-ai/shared';

const log = createLogger('cache');

export function createCacheClient(): CacheClient {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      log.warn(
        'REDIS_URL is not set — using in-memory cache. ' +
        'Rate limiting and caching will NOT be shared across instances. ' +
        'Set REDIS_URL to a Valkey/Redis instance for production use.',
      );
    }
    return createMemoryCache();
  }

  return createValkeyCache(redisUrl);
}
