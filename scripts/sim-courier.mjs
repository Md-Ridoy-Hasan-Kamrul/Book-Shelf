#!/usr/bin/env node
/**
 * Local mock courier webhook simulator.
 *   pnpm sim:courier <consignmentId> <status>
 * Status examples: IN_TRANSIT, DELIVERED, RETURNED, COD_REMIT
 *
 * Env: API_URL, MOCK_COURIER_WEBHOOK_SECRET (must match API)
 *   SIM_BAD_SIG=1  → send wrong signature
 *   SIM_DUPLICATE=1 → reuse same updated_at for duplicate test
 */
const consignmentId = process.argv[2];
const status = process.argv[3];
if (!consignmentId || !status) {
  console.error('Usage: pnpm sim:courier <consignmentId> <status>');
  process.exit(1);
}

const api = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const secret = process.env.MOCK_COURIER_WEBHOOK_SECRET ?? 'local-mock-courier-secret';
const updatedAt =
  process.env.SIM_DUPLICATE === '1' ? '2020-01-01T00:00:00.000Z' : new Date().toISOString();

const body = {
  consignment_id: consignmentId,
  status,
  updated_at: updatedAt,
  tracking_message: `Simulated ${status}`,
};

const headers = {
  'Content-Type': 'application/json',
  'x-mock-signature': process.env.SIM_BAD_SIG === '1' ? 'wrong' : secret,
};

const res = await fetch(`${api}/webhooks/courier/mock`, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(JSON.stringify({ status: res.status, body: text }, null, 2));
