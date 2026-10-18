import type { ApiEnv } from '@bookverse/shared';

export async function listDeadLetterJobs(env: ApiEnv, limit = 30) {
  const [{ getCheckoutQueue }, { getMoneyQueue }, { getCourierQueue }, { getNotificationQueue }] =
    await Promise.all([
      import('../../jobs/checkoutQueue.js'),
      import('../../jobs/moneyQueue.js'),
      import('../../jobs/courierQueue.js'),
      import('../../jobs/notificationQueue.js'),
    ]);

  const queues = [
    { name: 'checkout', q: getCheckoutQueue(env) },
    { name: 'money', q: getMoneyQueue(env) },
    { name: 'courier', q: getCourierQueue(env) },
    { name: 'notifications', q: getNotificationQueue(env) },
  ];

  const items = [];
  for (const { name, q } of queues) {
    const failed = await q.getFailed(0, limit - 1);
    for (const job of failed) {
      items.push({
        queue: name,
        jobId: job.id,
        name: job.name,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      });
    }
  }
  return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
