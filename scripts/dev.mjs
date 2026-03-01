#!/usr/bin/env node
/**
 * Dev startup script: loads .env / .env.local from the monorepo root,
 * then launches `turbo dev`. This ensures all services (web, chat-api, worker)
 * share the same environment variables (DATABASE_URL, API keys, etc.).
 */
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    // Don't override existing env vars (e.g. from shell)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const root = resolve(import.meta.dirname);
loadEnvFile(resolve(root, '..', '.env'));
loadEnvFile(resolve(root, '..', '.env.local'));

try {
  execSync('turbo dev', { stdio: 'inherit', env: process.env });
} catch {
  process.exit(1);
}
