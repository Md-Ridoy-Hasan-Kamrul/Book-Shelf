import type { ApiEnv } from '@bookverse/shared';
import { prisma } from '../../lib/prisma.js';
import { createEmailProvider } from '../../providers/email/index.js';
import type { Logger } from '../../lib/logger.js';
import { isChannelEnabled } from './notificationPreferenceService.js';

export type NotificationJobPayload = {
  userId: string;
  dedupeKey: string;
  title: string;
  body: string;
  emailSubject?: string;
  emailText?: string;
};

export async function deliverNotification(
  env: ApiEnv,
  logger: Logger,
  payload: NotificationJobPayload,
): Promise<'sent' | 'skipped_duplicate'> {
  const inApp = await isChannelEnabled(payload.userId, 'IN_APP');
  const email = await isChannelEnabled(payload.userId, 'EMAIL');

  let created = 0;

  if (inApp) {
    try {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          channel: 'IN_APP',
          title: payload.title,
          body: payload.body,
          dedupeKey: payload.dedupeKey,
        },
      });
      created += 1;
    } catch {
      return 'skipped_duplicate';
    }
  }

  if (email && payload.emailSubject && payload.emailText) {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user?.email) {
      const emailKey = `${payload.dedupeKey}:email`;
      const exists = await prisma.notification.findFirst({
        where: { userId: payload.userId, dedupeKey: emailKey },
      });
      if (!exists) {
        const mailer = createEmailProvider(env);
        await mailer.send({
          to: user.email,
          subject: payload.emailSubject,
          text: payload.emailText,
        });
        await prisma.notification.create({
          data: {
            userId: payload.userId,
            channel: 'EMAIL',
            title: payload.emailSubject,
            body: payload.emailText,
            dedupeKey: emailKey,
          },
        });
        created += 1;
      }
    }
  }

  if (created === 0) return 'skipped_duplicate';

  logger.info({ userId: payload.userId, dedupeKey: payload.dedupeKey }, 'Notification delivered');
  return 'sent';
}
