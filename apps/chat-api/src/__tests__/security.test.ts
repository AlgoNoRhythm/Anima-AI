import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';

describe('Security Headers', () => {
  const app = createApp();

  it('sets security headers', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('sets CORS headers', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    // Should have CORS headers
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
    expect(allowOrigin).toBeDefined();
  });
});
