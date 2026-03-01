import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageClient } from './types';

export interface S3StorageOptions {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export function createS3Storage(options: S3StorageOptions): StorageClient {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region || 'auto',
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: options.forcePathStyle ?? true,
  });

  const bucket = options.bucket;

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: typeof body === 'string' ? Buffer.from(body) : body,
          ContentType: contentType || 'application/octet-stream',
        }),
      );
    },

    async get(key) {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (!response.Body) return null;
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } catch {
        return null;
      }
    },

    async getPresignedUrl(key, expiresInSeconds = 3600) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    },

    async exists(key) {
      try {
        await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return true;
      } catch {
        return false;
      }
    },

    async list(prefix = '') {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix || undefined,
        }),
      );
      return (response.Contents || [])
        .map((item) => item.Key)
        .filter((key): key is string => key !== undefined);
    },
  };
}
