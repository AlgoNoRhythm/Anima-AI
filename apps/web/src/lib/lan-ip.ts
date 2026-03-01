import { networkInterfaces } from 'os';

/**
 * Returns the first non-internal IPv4 address (LAN IP).
 * Used by the QR generator to produce scannable URLs during local dev.
 */
export function getLanIp(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}
