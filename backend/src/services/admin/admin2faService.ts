import { AppError } from '../../lib/appError.js';
import { prisma } from '../../lib/prisma.js';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../../lib/totp.js';

const verifiedUntil = new Map<string, number>();
const VERIFY_TTL_MS = 12 * 60 * 60 * 1000;

export function markAdmin2faVerified(userId: string) {
  verifiedUntil.set(userId, Date.now() + VERIFY_TTL_MS);
}

export function isAdmin2faVerified(userId: string): boolean {
  const until = verifiedUntil.get(userId);
  return Boolean(until && until > Date.now());
}

export async function setupAdmin2fa(userId: string, role: string) {
  if (role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Admin only', 403);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpEnabled: false },
  });
  return {
    secret,
    otpauthUrl: otpauthUri(secret, user.email),
    enabled: false,
  };
}

export async function confirmAdmin2fa(userId: string, role: string, token: string) {
  if (role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Admin only', 403);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpSecret) throw new AppError('VALIDATION_ERROR', 'Run setup first', 400);
  if (!verifyTotp(user.totpSecret, token)) {
    throw new AppError('FORBIDDEN', 'Invalid TOTP code', 403);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
  markAdmin2faVerified(userId);
  return { enabled: true };
}

export async function verifyAdmin2faSession(userId: string, role: string, token: string) {
  if (role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Admin only', 403);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpEnabled || !user.totpSecret) {
    throw new AppError('VALIDATION_ERROR', '2FA not enabled — complete setup', 400);
  }
  if (!verifyTotp(user.totpSecret, token)) {
    throw new AppError('FORBIDDEN', 'Invalid TOTP code', 403);
  }
  markAdmin2faVerified(userId);
  return { verified: true };
}

export async function assertAdmin2fa(userId: string, role: string, envNode: string) {
  if (role !== 'ADMIN') return;
  if (envNode === 'test') return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  // Local hardening: once enrolled, require periodic verify. Before enroll, allow with warning path.
  if (user?.totpEnabled && !isAdmin2faVerified(userId)) {
    throw new AppError('FORBIDDEN', 'Admin 2FA verification required', 403);
  }
}
