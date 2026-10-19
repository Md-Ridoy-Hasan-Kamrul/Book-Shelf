#!/usr/bin/env node
/**
 * P17 — local Postgres backup → ./backups/
 * Prefers host pg_dump; falls back to `docker compose exec postgres pg_dump`.
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = join(root, 'backups');
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = join(backupDir, `bookverse-${stamp}.sql`);
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://bookverse:bookverse@localhost:5432/bookverse';

console.log(`[backup] writing ${outFile}`);

function tryHostPgDump() {
  return spawnSync(
    'pg_dump',
    ['--no-owner', '--no-acl', '--clean', '--if-exists', `--dbname=${databaseUrl}`, `-f`, outFile],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
}

function tryDockerPgDump() {
  const result = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U',
      'bookverse',
      '-d',
      'bookverse',
      '--no-owner',
      '--no-acl',
      '--clean',
      '--if-exists',
    ],
    { encoding: 'utf8', cwd: root, shell: process.platform === 'win32' },
  );
  if (result.status === 0 && result.stdout) {
    writeFileSync(outFile, result.stdout, 'utf8');
  }
  return result;
}

let result = tryHostPgDump();
if (result.status !== 0) {
  console.warn('[backup] host pg_dump unavailable — trying docker compose postgres…');
  if (result.stderr) console.warn(result.stderr);
  result = tryDockerPgDump();
}

if (result.status !== 0) {
  console.error('[backup] FAILED — install PostgreSQL client tools or start `pnpm docker:up`');
  if (result.stderr) console.error(result.stderr);
  process.exit(result.status ?? 1);
}
console.log(`[backup] OK → ${outFile}`);
console.log('[backup] Restore: pnpm restore -- <path-to.sql>');
