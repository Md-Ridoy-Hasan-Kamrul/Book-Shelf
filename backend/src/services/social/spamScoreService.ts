const URL_RE = /https?:\/\//gi;

export function computeSpamScore(body: string, recentDuplicateCount: number): number {
  let score = 0;
  const urls = body.match(URL_RE)?.length ?? 0;
  if (urls >= 3) score += 40;
  if (body.length > 0 && body.length < 8) score += 15;
  if (recentDuplicateCount >= 2) score += 35;
  return Math.min(100, score);
}

export function shouldFlagSpam(score: number): boolean {
  return score >= 50;
}
