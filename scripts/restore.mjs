#!/usr/bin/env node
/**
 * P17 — restore from ./backups/*.sql
 * Prefers host psql; falls back to docker compose exec.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv.find((a, i) => process.argv[i - 1] === '--') ?? process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Usage: pnpm restore -- ./backups/<file>.sql');
  process.exit(1);
}

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://bookverse:bookverse@localhost:5432/bookverse';

console.log(`[restore] applying ${file}`);

function tryHost() {
  return spawnSync('psql', [`--dbname=${databaseUrl}`, '-f', file], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function tryDocker() {
  const sql = readFileSync(file, 'utf8');
  return spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'bookverse', '-d', 'bookverse'],
    { encoding: 'utf8', cwd: root, input: sql, shell: process.platform === 'win32' },
  );
}

let result = tryHost();
if (result.status !== 0) {
  console.warn('[restore] host psql unavailable — trying docker compose postgres…');
  result = tryDocker();
}

if (result.status !== 0) {
  console.error('[restore] FAILED');
  if (result.stderr) console.error(result.stderr);
  process.exit(result.status ?? 1);
}
console.log('[restore] OK');
