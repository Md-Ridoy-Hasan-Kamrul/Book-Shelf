import type { NotificationChannel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const DEFAULTS: Array<{ channel: NotificationChannel; enabled: boolean }> = [
  { channel: 'IN_APP', enabled: true },
  { channel: 'EMAIL', enabled: false },
  { channel: 'SMS', enabled: false },
  { channel: 'PUSH', enabled: false },
];

export async function ensureNotificationPreferences(userId: string): Promise<void> {
  for (const row of DEFAULTS) {
    await prisma.notificationPreference.upsert({
      where: { userId_channel: { userId, channel: row.channel } },
      create: { userId, channel: row.channel, enabled: row.enabled },
      update: {},
    });
  }
}

export async function isChannelEnabled(
  userId: string,
  channel: NotificationChannel,
): Promise<boolean> {
  await ensureNotificationPreferences(userId);
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_channel: { userId, channel } },
  });
  return pref?.enabled ?? false;
}
