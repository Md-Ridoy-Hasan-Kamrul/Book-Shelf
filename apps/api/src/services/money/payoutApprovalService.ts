import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { writeAdminAudit } from '../admin/adminAuditService.js';

export async function approvePayout(adminId: string, payoutId: string) {
  await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new AppError('NOT_FOUND', 'Payout not found', 404);
    if (payout.status !== 'PENDING') {
      throw new AppError('CONFLICT', 'Payout is not pending approval', 409);
    }
    const before = payout;
    const after = await tx.payout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await tx.ledgerEntry.updateMany({
      where: { payoutId },
      data: { status: 'PAID' },
    });
    await writeAdminAudit(adminId, 'APPROVE', 'Payout', payoutId, before, after, tx);
  });
}
