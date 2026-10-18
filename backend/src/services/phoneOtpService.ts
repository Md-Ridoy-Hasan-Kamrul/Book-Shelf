import { randomInt, randomUUID } from 'node:crypto';
import type { ApiEnv } from '@bookverse/shared';
import type { SmsProvider } from '../providers/sms/types.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/appError.js';

const OTP_TTL_MS = 10 * 60 * 1000;

function otpIdentifier(phone: string) {
  return `phone:${phone}`;
}

export function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export async function sendPhoneOtp(env: ApiEnv, sms: SmsProvider, phone: string) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const identifier = otpIdentifier(phone);

  await prisma.verification.deleteMany({ where: { identifier } });
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier,
      value: code,
      expiresAt,
    },
  });

  await sms.sendOtp(phone, code);
  return { sent: true, expiresAt };
}

export async function verifyPhoneOtp(userId: string, phone: string, code: string) {
  const identifier = otpIdentifier(phone);
  const record = await prisma.verification.findFirst({
    where: { identifier },
    orderBy: { expiresAt: 'desc' },
  });
  if (!record || record.expiresAt < new Date() || record.value !== code) {
    throw new AppError('VALIDATION_ERROR', 'Invalid or expired OTP', 400);
  }

  const taken = await prisma.user.findFirst({
    where: { phone, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) {
    throw new AppError('CONFLICT', 'Phone already in use', 409);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    }),
    prisma.verification.deleteMany({ where: { identifier } }),
  ]);

  return { phoneVerified: true };
}
