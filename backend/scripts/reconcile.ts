/**
 * P17 — money ledger reconcile + points balance check
 */
import { reconcileOrdersVsLedger } from '../src/services/money/reconcileService.js';
import { prisma } from '../src/lib/prisma.js';
import { verifyUserPointBalance } from '../src/services/points/pointHistoryService.js';

const money = await reconcileOrdersVsLedger();
console.log('=== Money ledger ===');
console.log(JSON.stringify(money, null, 2));

console.log('=== Points balances ===');
const users = await prisma.user.findMany({ select: { id: true, email: true } });
let pointsBad = 0;
for (const u of users) {
  const check = await verifyUserPointBalance(u.id);
  if (!check.ok) {
    pointsBad += 1;
    console.error(`FAIL points ${u.email}: balance=${check.pointsBalance} sum=${check.sumDelta}`);
  }
}
if (pointsBad === 0) {
  console.log(`OK: ${users.length} users pointsBalance === SUM(PointLedger.delta)`);
}

await prisma.$disconnect();
const ok = money.ok && pointsBad === 0;
process.exit(ok ? 0 : 1);
