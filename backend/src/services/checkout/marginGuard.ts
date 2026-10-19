import { fromPaisa } from '@bookverse/shared';
import { AppError } from '../../lib/appError.js';
import { getSystemSetting } from '../settings/systemSettingsService.js';

/**
 * Appendix C — commissionAmount must never fall below estimated gateway fee + minimum margin.
 * Integer paisa; round-half-up via +5000/10000.
 */
export async function assertCommissionCoversFeeAndMargin(
  lineTotalPaisa: bigint,
  commissionPaisa: bigint,
): Promise<void> {
  const feeBps = await getSystemSetting<number>('payment_fee_bps', 150);
  const minMarginBps = await getSystemSetting<number>('min_platform_margin_bps', 100);
  const feePaisa = (lineTotalPaisa * BigInt(feeBps) + 5000n) / 10000n;
  const minMarginPaisa = (lineTotalPaisa * BigInt(minMarginBps) + 5000n) / 10000n;
  const floor = feePaisa + minMarginPaisa;
  if (commissionPaisa < floor) {
    throw new AppError(
      'MARGIN_GUARD',
      `Commission ${fromPaisa(commissionPaisa)} BDT below fee+margin floor ${fromPaisa(floor)} BDT`,
      400,
    );
  }
}
