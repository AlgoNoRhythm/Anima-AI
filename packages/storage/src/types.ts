export interface StorageClient {
  put(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}
