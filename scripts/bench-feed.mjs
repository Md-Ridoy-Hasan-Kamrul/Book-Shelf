/**
 * Feed latency bench (local). Requires migrated DB + optional BENCH_POSTS=60000 seed.
 * Usage: node scripts/bench-feed.mjs
 */
import { performance } from 'node:perf_hooks';

const API = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';
const RUNS = Number(process.env.BENCH_RUNS ?? 50);

const samples = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = performance.now();
  const res = await fetch(`${API}/posts/feed?mode=mixed&limit=15`);
  const json = await res.json();
  const t1 = performance.now();
  if (!json.success) {
    console.error('Feed failed', json);
    process.exit(1);
  }
  samples.push(t1 - t0);
  if (i === 0) {
    console.log('queryCount (first request):', json.meta?.queryCount);
  }
}

samples.sort((a, b) => a - b);
const p95 = samples[Math.floor(samples.length * 0.95) - 1];
console.log(`Feed p95 over ${RUNS} runs: ${p95.toFixed(1)} ms`);
if (p95 >= 200) {
  console.warn('WARN: p95 >= 200ms (acceptance target is <200ms with 60k posts)');
}
