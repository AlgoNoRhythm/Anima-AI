import type { CacheClient } from './types';

// --- TTL jitter to prevent thundering herd ---

/** Add ±20% random jitter to a TTL value. */
export function withJitter(ttl: number): number {
  const jitter = ttl * 0.2;
  return Math.round(ttl + (Math.random() * 2 - 1) * jitter);
}

// --- Project by slug ---

const PROJECT_PREFIX = 'data:project:';
const PROJECT_TTL = 300; // 5 minutes

export async function getCachedProject<T = unknown>(cache: CacheClient, slug: string): Promise<T | null> {
  const raw = await cache.get(`${PROJECT_PREFIX}${slug}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setCachedProject(cache: CacheClient, slug: string, project: unknown, ttl = PROJECT_TTL): Promise<void> {
  await cache.set(`${PROJECT_PREFIX}${slug}`, JSON.stringify(project), withJitter(ttl));
}

export async function invalidateProject(cache: CacheClient, slug: string): Promise<void> {
  await cache.del(`${PROJECT_PREFIX}${slug}`);
}

// --- Project meta (personality + document titles + entity) ---

const META_PREFIX = 'data:meta:';
const META_TTL = 300; // 5 minutes

export async function getCachedProjectMeta<T = unknown>(cache: CacheClient, projectId: string): Promise<T | null> {
  const raw = await cache.get(`${META_PREFIX}${projectId}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setCachedProjectMeta(cache: CacheClient, projectId: string, meta: unknown, ttl = META_TTL): Promise<void> {
  await cache.set(`${META_PREFIX}${projectId}`, JSON.stringify(meta), withJitter(ttl));
}

export async function invalidateProjectMeta(cache: CacheClient, projectId: string): Promise<void> {
  await cache.del(`${META_PREFIX}${projectId}`);
}

// --- Session validation ---

const SESSION_PREFIX = 'data:session:';

export async function getCachedSession<T = unknown>(cache: CacheClient, token: string): Promise<T | null> {
  const raw = await cache.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setCachedSession(cache: CacheClient, token: string, data: unknown, ttlSeconds?: number): Promise<void> {
  await cache.set(`${SESSION_PREFIX}${token}`, JSON.stringify(data), ttlSeconds ? withJitter(ttlSeconds) : undefined);
}

export async function invalidateSession(cache: CacheClient, token: string): Promise<void> {
  await cache.del(`${SESSION_PREFIX}${token}`);
}

// --- Document trees ---

const TREES_PREFIX = 'data:trees:';
const TREES_TTL = 600; // 10 minutes

export async function getCachedDocumentTrees<T = unknown>(cache: CacheClient, projectId: string): Promise<T | null> {
  const raw = await cache.get(`${TREES_PREFIX}${projectId}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setCachedDocumentTrees(cache: CacheClient, projectId: string, trees: unknown, ttl = TREES_TTL): Promise<void> {
  await cache.set(`${TREES_PREFIX}${projectId}`, JSON.stringify(trees), withJitter(ttl));
}

export async function invalidateDocumentTrees(cache: CacheClient, projectId: string): Promise<void> {
  await cache.del(`${TREES_PREFIX}${projectId}`);
}

// --- Page data (combined public page queries) ---

const PAGE_DATA_PREFIX = 'data:page:';
const PAGE_DATA_TTL = 60; // 60 seconds

export async function getCachedPageData<T = unknown>(cache: CacheClient, slug: string, locale: string): Promise<T | null> {
  const raw = await cache.get(`${PAGE_DATA_PREFIX}${slug}:${locale}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setCachedPageData(cache: CacheClient, slug: string, locale: string, data: unknown, ttl = PAGE_DATA_TTL): Promise<void> {
  await cache.set(`${PAGE_DATA_PREFIX}${slug}:${locale}`, JSON.stringify(data), withJitter(ttl));
}

export async function invalidatePageData(cache: CacheClient, slug: string, locale: string): Promise<void> {
  await cache.del(`${PAGE_DATA_PREFIX}${slug}:${locale}`);
}
