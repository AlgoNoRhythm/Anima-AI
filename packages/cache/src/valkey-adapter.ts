import Redis from 'ioredis';
import type { CacheClient } from './types';

export function createValkeyCache(url: string): CacheClient {
  const client = new Redis(url);

  return {
    async get(key) {
      return client.get(key);
    },

    async set(key, value, ttlSeconds) {
      if (ttlSeconds) {
        await client.set(key, value, 'EX', ttlSeconds);
      } else {
        await client.set(key, value);
      }
    },

    async del(key) {
      await client.del(key);
    },

    async incr(key) {
      return client.incr(key);
    },

    async expire(key, ttlSeconds) {
      await client.expire(key, ttlSeconds);
    },

    async exists(key) {
      const result = await client.exists(key);
      return result === 1;
    },

    async keys(pattern) {
      return client.keys(pattern);
    },

    async flushAll() {
      await client.flushall();
    },

    async disconnect() {
      await client.quit();
    },
  };
}
