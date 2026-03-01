import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageClient } from './types';

export function createLocalStorage(baseDir?: string): StorageClient {
  const storageDir = baseDir || path.join(process.cwd(), '.storage');

  async function ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  function getFullPath(key: string): string {
    return path.join(storageDir, key);
  }

  return {
    async put(key, body, _contentType) {
      const fullPath = getFullPath(key);
      await ensureDir(fullPath);
      const buffer = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
      await fs.writeFile(fullPath, buffer);
    },

    async get(key) {
      try {
        const fullPath = getFullPath(key);
        return await fs.readFile(fullPath);
      } catch {
        return null;
      }
    },

    async getPresignedUrl(key, _expiresInSeconds = 3600) {
      // For local storage, return a file:// URL or relative path
      return `/storage/${key}`;
    },

    async delete(key) {
      try {
        const fullPath = getFullPath(key);
        await fs.unlink(fullPath);
      } catch {
        // Ignore if file doesn't exist
      }
    },

    async exists(key) {
      try {
        const fullPath = getFullPath(key);
        await fs.access(fullPath);
        return true;
      } catch {
        return false;
      }
    },

    async list(prefix = '') {
      try {
        const dir = getFullPath(prefix);
        const entries = await fs.readdir(dir, { recursive: true });
        return entries
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => (prefix ? `${prefix}/${entry}` : entry).replace(/\\/g, '/'));
      } catch {
        return [];
      }
    },
  };
}
