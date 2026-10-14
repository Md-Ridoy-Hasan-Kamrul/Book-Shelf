#!/usr/bin/env node
/**
 * Local IPN simulator (mock provider). Usage:
 *   pnpm sim:ipn BV-<checkoutId>
 * Optional env: API_URL=http://localhost:4000
 *
 * Real sandbox: expose POST /webhooks/payment/sslcommerz via ngrok/cloudflared and set IPN URL in SSLCommerz panel.
 */
const tranId = process.argv[2];
if (!tranId) {
  console.error('Usage: pnpm sim:ipn <tranId>  (e.g. BV-clxxx from POST /payments/initiate)');
  process.exit(1);
}

const api = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const amount = process.env.IPN_AMOUNT ?? '500.00';

const body = new URLSearchParams({
  status: 'VALID',
  tran_id: tranId,
  val_id: `sim-${Date.now()}`,
  amount,
  currency: 'BDT',
});

const res = await fetch(`${api}/webhooks/payment/mock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
const text = await res.text();
console.log(JSON.stringify({ status: res.status, body: text }, null, 2));
