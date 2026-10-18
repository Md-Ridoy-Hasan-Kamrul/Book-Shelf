import { getSystemSetting } from '../settings/systemSettingsService.js';

/** 100 points = 10 BDT → 10 points = 1 BDT */
export async function pointsPerBdt(): Promise<number> {
  return getSystemSetting<number>('points_per_bdt', 10);
}

export async function pointsForDeliveredOrder(orderTotalBdt: number): Promise<number> {
  const per100 = await getSystemSetting<number>('points_per_100_bdt', 1);
  return Math.floor(orderTotalBdt / 100) * per100;
}

export async function pointsForFirstReview(): Promise<number> {
  return getSystemSetting<number>('points_first_review', 20);
}

export async function pointsForFinishBook(): Promise<number> {
  return getSystemSetting<number>('points_finish_book', 15);
}

export async function pointsForGoalComplete(): Promise<number> {
  return getSystemSetting<number>('points_goal_complete', 50);
}

export async function pointsForHelpfulVote(): Promise<number> {
  return getSystemSetting<number>('points_helpful_vote', 2);
}

export async function helpfulVoteDailyCap(): Promise<number> {
  return getSystemSetting<number>('points_helpful_daily_cap', 20);
}

/** Max redemption as fraction of order (default 10% = 1000 bps). Seed had 2000; P12 says 10%. */
export async function redemptionCapBps(): Promise<number> {
  return getSystemSetting<number>('point_redemption_cap_bps', 1000);
}

export function pointsToBdtPaisa(points: number, ptsPerBdt: number): bigint {
  // points / ptsPerBdt BDT → paisa = points * 100 / ptsPerBdt
  return (BigInt(points) * 100n) / BigInt(ptsPerBdt);
}
