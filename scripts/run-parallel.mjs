/**
 * Run several root npm/pnpm scripts in parallel (Windows-safe).
 * Usage: node scripts/run-parallel.mjs dev:web dev:api dev:worker
 */
import { spawn } from 'node:child_process';

const scripts = process.argv.slice(2).filter(Boolean);
if (scripts.length === 0) {
  console.error('Usage: node scripts/run-parallel.mjs <script> [script...]');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const children = scripts.map((name) => {
  const child = spawn(isWin ? 'pnpm.cmd' : 'pnpm', ['run', name], {
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[${name}] killed (${signal})`);
    } else if (code !== 0 && code != null) {
      console.error(`[${name}] exited ${code}`);
    }
  });
  return child;
});

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.on('exit', resolve);
      }),
  ),
);
