import type { StorageClient } from './types';
import { createLocalStorage } from './local-adapter';
import { createS3Storage } from './s3-adapter';

export function createStorageClient(): StorageClient {
  const endpoint = process.env.STORAGE_ENDPOINT;

  if (!endpoint) {
    return createLocalStorage();
  }

  return createS3Storage({
    endpoint,
    bucket: process.env.STORAGE_BUCKET || 'anima-ai',
    accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
    secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
  });
}
