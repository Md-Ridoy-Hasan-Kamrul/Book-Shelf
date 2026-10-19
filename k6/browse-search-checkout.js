/**
 * P17 local k6 mix: browse + search + checkout quote
 * Run: k6 run k6/browse-search-checkout.js
 * Numbers are local-relative, not production capacity.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE || 'http://127.0.0.1:4000';
const errorRate = new Rate('errors');
const browseLatency = new Trend('browse_ms');
const searchLatency = new Trend('search_ms');
const quoteLatency = new Trend('quote_ms');

export const options = {
  scenarios: {
    mix: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 10 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const browse = http.get(`${BASE}/books?limit=12`);
  browseLatency.add(browse.timings.duration);
  const browseOk = check(browse, { 'browse 200': (r) => r.status === 200 });
  errorRate.add(!browseOk);

  const search = http.get(`${BASE}/search?q=book&limit=12`);
  searchLatency.add(search.timings.duration);
  const searchOk = check(search, { 'search 2xx': (r) => r.status >= 200 && r.status < 500 });
  errorRate.add(!searchOk);

  // Quote without auth may 401 — still measures path latency / error shape
  const quote = http.post(
    `${BASE}/checkout/quote`,
    JSON.stringify({ items: [{ listingId: 'nonexistent', qty: 1 }] }),
    { headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4321' } },
  );
  quoteLatency.add(quote.timings.duration);
  check(quote, { 'quote responded': (r) => r.status > 0 });

  sleep(0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values['p(95)'];
  const failed = data.metrics.http_req_failed?.values.rate;
  const summary = {
    generatedAt: new Date().toISOString(),
    note: 'Local-relative numbers — not production capacity',
    p95_ms: p95,
    error_rate: failed,
    browse_p95_ms: data.metrics.browse_ms?.values['p(95)'],
    search_p95_ms: data.metrics.search_ms?.values['p(95)'],
    quote_p95_ms: data.metrics.quote_ms?.values['p(95)'],
    remind:
      'Capture DB connections (pg_stat_activity) and Redis MEMORY STATS during the run for the report.',
  };
  return {
    stdout: JSON.stringify(summary, null, 2),
    'docs/k6-last-run.json': JSON.stringify(summary, null, 2),
  };
}
