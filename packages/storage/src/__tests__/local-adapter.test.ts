import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createLocalStorage } from '../local-adapter';

describe('LocalStorageAdapter', () => {
  let testDir: string;
  let storage: ReturnType<typeof createLocalStorage>;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `anima-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    storage = createLocalStorage(testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('puts and gets a file', async () => {
    await storage.put('test/file.txt', 'hello world');
    const result = await storage.get('test/file.txt');
    expect(result).not.toBeNull();
    expect(result!.toString()).toBe('hello world');
  });

  it('puts and gets a binary file', async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    await storage.put('binary.bin', buffer);
    const result = await storage.get('binary.bin');
    expect(result).not.toBeNull();
    expect(Buffer.compare(result!, buffer)).toBe(0);
  });

  it('returns null for non-existent file', async () => {
    const result = await storage.get('non-existent.txt');
    expect(result).toBeNull();
  });

  it('checks file existence', async () => {
    await storage.put('exists.txt', 'data');
    expect(await storage.exists('exists.txt')).toBe(true);
    expect(await storage.exists('nope.txt')).toBe(false);
  });

  it('deletes a file', async () => {
    await storage.put('to-delete.txt', 'data');
    expect(await storage.exists('to-delete.txt')).toBe(true);
    await storage.delete('to-delete.txt');
    expect(await storage.exists('to-delete.txt')).toBe(false);
  });

  it('deleting non-existent file does not throw', async () => {
    await expect(storage.delete('nope.txt')).resolves.not.toThrow();
  });

  it('returns a presigned URL (local path)', async () => {
    const url = await storage.getPresignedUrl('file.pdf');
    expect(url).toBe('/storage/file.pdf');
  });

  it('lists files with prefix', async () => {
    await storage.put('docs/a.pdf', 'a');
    await storage.put('docs/b.pdf', 'b');
    await storage.put('other/c.pdf', 'c');
    const files = await storage.list('docs');
    expect(files).toHaveLength(2);
    expect(files).toContain('docs/a.pdf');
    expect(files).toContain('docs/b.pdf');
  });

  it('lists empty directory', async () => {
    const files = await storage.list('empty');
    expect(files).toHaveLength(0);
  });
});
