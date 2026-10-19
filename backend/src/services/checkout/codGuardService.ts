import { toPaisa } from '@bookverse/shared';
import type { User } from '@prisma/client';
import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { getMoneySetting, getSystemSetting } from '../settings/systemSettingsService.js';

export async function assertCodAllowed(user: User, orderTotalBdt: string): Promise<void> {
  const reasons: string[] = [];

  if (!user.phoneVerified) {
    reasons.push('Phone number must be verified for COD');
  }

  const trustMin = await getSystemSetting<number>('cod_min_trust', 30);
  if (user.trustScore < trustMin) {
    reasons.push(`Trust score must be at least ${trustMin} (prepaid only below threshold)`);
  }

  if (user.rtoCount >= 3) {
    reasons.push('COD disabled after 3 return-to-origin deliveries');
  }

  const codMax = await getMoneySetting('cod_max_bdt', '5000.00');
  if (toPaisa(orderTotalBdt) > toPaisa(codMax)) {
    reasons.push(`COD maximum order total is ${codMax} BDT`);
  }

  const priorOrders = await prisma.order.count({
    where: {
      buyerId: user.id,
      status: { notIn: ['CANCELLED'] },
    },
  });
  const newUserMax = await getMoneySetting('cod_new_user_cap', '1500.00');
  if (priorOrders === 0 && toPaisa(orderTotalBdt) > toPaisa(newUserMax)) {
    reasons.push(`First COD order cannot exceed ${newUserMax} BDT`);
  }

  if (reasons.length > 0) {
    throw new AppError('COD_UNAVAILABLE', reasons.join('. '), 403, [
      { suggestPrepaid: true, reasons },
    ]);
  }
}
