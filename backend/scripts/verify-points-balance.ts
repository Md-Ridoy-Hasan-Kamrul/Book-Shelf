import { prisma } from '../src/lib/prisma.js';
import { verifyUserPointBalance } from '../src/services/points/pointHistoryService.js';

const users = await prisma.user.findMany({ select: { id: true, email: true } });
let bad = 0;
for (const u of users) {
  const check = await verifyUserPointBalance(u.id);
  if (!check.ok) {
    bad += 1;
    console.error(`FAIL ${u.email}: balance=${check.pointsBalance} sum=${check.sumDelta}`);
  }
}
await prisma.$disconnect();
if (bad > 0) {
  console.error(`\n${bad}/${users.length} users mismatched`);
  process.exit(1);
}
console.log(`OK: all ${users.length} users pointsBalance === SUM(delta)`);
