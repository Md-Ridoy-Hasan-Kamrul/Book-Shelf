/**
 * Page-wise horizontal overflow audit across required breakpoints.
 * Run twice (pass 1 / pass 2) for double-check as requested.
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:4321';

const BREAKPOINTS = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'LaptopL', width: 1440, height: 900 },
  { name: 'Laptop', width: 1020, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'MobileL', width: 425, height: 800 },
  { name: 'MobileM', width: 375, height: 812 },
  { name: 'MobileS', width: 320, height: 568 },
];

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/mood',
  '/feed',
  '/search',
  '/bookshelf',
  '/checkout',
  '/account',
  '/design',
  '/points',
  '/used',
  '/orders',
  '/legal/terms',
  '/legal/privacy',
  '/legal/refund',
  '/legal/seller',
  '/books/padma-nodir-majhi',
  '/publisher/pathak-samabesh',
  '/writers/manik-bandopadhyay',
  '/admin/dashboard',
  '/seller/dashboard',
  '/forgot-password',
  '/verify-email',
  '/verify-phone',
];

const ROLE_COOKIES = {
  '/admin/dashboard': 'ADMIN',
  '/seller/dashboard': 'VENDOR',
};

function cookieDomain(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return 'localhost';
  }
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = doc.clientWidth;
    const overflowX = scrollW - clientW;
    const offenders = [];
    if (overflowX > 1) {
      const all = document.querySelectorAll('body *');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width > clientW + 1 && r.right > clientW + 1) {
          const tag = el.tagName.toLowerCase();
          const cls = typeof el.className === 'string' ? el.className.slice(0, 80) : '';
          offenders.push({
            tag,
            cls,
            width: Math.round(r.width),
            right: Math.round(r.right),
          });
          if (offenders.length >= 8) break;
        }
      }
    }
    return {
      clientW,
      scrollW,
      overflowX: Math.max(0, overflowX),
      offenders,
    };
  });
}

async function runPass(passLabel) {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const bp of BREAKPOINTS) {
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const role = ROLE_COOKIES[route];
      if (role) {
        await context.addCookies([
          {
            name: 'bv_mock_role',
            value: role,
            domain: cookieDomain(BASE),
            path: '/',
          },
        ]);
      }

      const url = `${BASE}${route}`;
      let status = 'ok';
      let http = 0;
      let measure = { clientW: bp.width, scrollW: bp.width, overflowX: 0, offenders: [] };
      let error = null;

      try {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        http = res?.status() ?? 0;
        await page.waitForTimeout(400);
        measure = await measureOverflow(page);
        if (http >= 400) status = 'http_error';
        else if (measure.overflowX > 2) status = 'overflow';
      } catch (e) {
        status = 'nav_error';
        error = e instanceof Error ? e.message : String(e);
      }

      results.push({
        pass: passLabel,
        breakpoint: bp.name,
        width: bp.width,
        route,
        http,
        status,
        overflowX: measure.overflowX,
        scrollW: measure.scrollW,
        offenders: measure.offenders,
        error,
      });
    }

    await context.close();
  }

  await browser.close();
  return results;
}

function summarize(results) {
  const fails = results.filter((r) => r.status !== 'ok');
  const byRoute = new Map();
  for (const r of results) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, []);
    byRoute.get(r.route).push(r);
  }
  return { fails, byRoute, total: results.length };
}

const pass1 = await runPass(1);
const pass2 = await runPass(2);
const all = [...pass1, ...pass2];

const outPath = resolve(process.cwd(), 'responsive-audit-report.json');
writeFileSync(
  outPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), results: all }, null, 2),
);

const s1 = summarize(pass1);
const s2 = summarize(pass2);

console.log(`\n=== Responsive audit (double pass) ===`);
console.log(`Pass1: ${s1.total - s1.fails.length}/${s1.total} OK · fails ${s1.fails.length}`);
console.log(`Pass2: ${s2.total - s2.fails.length}/${s2.total} OK · fails ${s2.fails.length}`);

const failKey = (r) => `${r.route}@${r.breakpoint}:${r.status}:${r.overflowX}`;
const p1Keys = new Set(s1.fails.map(failKey));
const p2Keys = new Set(s2.fails.map(failKey));
const stableFails = [...p1Keys].filter((k) => p2Keys.has(k));

console.log(`\nStable fails (both passes): ${stableFails.length}`);
for (const k of stableFails) console.log(`  - ${k}`);

const flaky = [...p1Keys]
  .filter((k) => !p2Keys.has(k))
  .concat([...p2Keys].filter((k) => !p1Keys.has(k)));
if (flaky.length) {
  console.log(`\nFlaky (one pass only): ${flaky.length}`);
  for (const k of flaky) console.log(`  ~ ${k}`);
}

console.log(`\nReport: ${outPath}`);

// Exit non-zero if stable overflow/http issues
process.exit(stableFails.length ? 1 : 0);
