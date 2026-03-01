import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.DOCKER === '1' ? 'standalone' : undefined,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@anima-ai/ui', '@anima-ai/shared', '@anima-ai/database', '@anima-ai/ai', '@anima-ai/storage', '@anima-ai/cache'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  serverExternalPackages: [
    'drizzle-orm',
    'pg',
    'pdf-parse',
    'ioredis',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
  ],
};

export default nextConfig;
