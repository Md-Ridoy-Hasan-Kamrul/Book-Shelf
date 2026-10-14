/**
 * Search benchmark — run against a DB with many books (e.g. pnpm db:seed:bench).
 * Reports p50/p95 latency for /search?q=...
 */
import { performance } from 'node:perf_hooks';
import { loadApiEnv } from '../src/env.js';
import { createSearchService } from '../src/services/search/pgSearchService.js';

const env = loadApiEnv();
const search = createSearchService(env);

const QUERIES = ['River', 'পদ্মজা', 'Humayun', 'River Notes', '987', 'বই'];

function percentile(sorted: number[], p: number) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

async function main() {
  const samples: number[] = [];
  for (let round = 0; round < 3; round++) {
    for (const q of QUERIES) {
      const t0 = performance.now();
      await search.search({ q, limit: 24 });
      samples.push(performance.now() - t0);
    }
  }
  samples.sort((a, b) => a - b);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  console.log(
    JSON.stringify(
      { samples: samples.length, p50Ms: Math.round(p50), p95Ms: Math.round(p95) },
      null,
      2,
    ),
  );
  if (p95 >= 100) {
    console.warn('p95 >= 100ms — report actual numbers in P5 acceptance');
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
