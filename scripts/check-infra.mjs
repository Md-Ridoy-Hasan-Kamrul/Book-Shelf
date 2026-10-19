/**
 * Probe local Postgres (:5432) and Redis (:6379) before starting API/worker.
 * Exits 0 always (warn-only) so `dev:web` can still run; prints a clear banner when down.
 */
import net from 'node:net';

function probe(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

const [postgres, redis] = await Promise.all([probe(5432), probe(6379)]);

if (postgres && redis) {
  console.log('[infra] Postgres :5432 and Redis :6379 OK');
  process.exit(0);
}

console.error('');
console.error('╔══════════════════════════════════════════════════════════════╗');
console.error('║  BookVerse infra missing — API/worker will fail or idle     ║');
console.error('╠══════════════════════════════════════════════════════════════╣');
if (!postgres) console.error('║  ✗ Postgres not on :5432                                     ║');
else console.error('║  ✓ Postgres :5432                                            ║');
if (!redis) console.error('║  ✗ Redis not on :6379                                        ║');
else console.error('║  ✓ Redis :6379                                               ║');
console.error('╠══════════════════════════════════════════════════════════════╣');
console.error('║  Fix:                                                        ║');
console.error('║  1. Install Docker Desktop                                   ║');
console.error('║  2. Open Docker Desktop (engine running)                     ║');
console.error('║  3. pnpm docker:up                                           ║');
console.error('║  4. Restart npm run / pnpm run dev                           ║');
console.error('╚══════════════════════════════════════════════════════════════╝');
console.error('');
process.exit(0);
