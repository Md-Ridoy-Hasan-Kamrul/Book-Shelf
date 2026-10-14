import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { releaseExpiredCheckout } from '../services/checkout/releaseCheckoutService.js';

const QUEUE_NAME = 'checkout';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export function getCheckoutQueue(env: ApiEnv): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: connection(env) });
  }
  return queue;
}

export async function scheduleCheckoutRelease(env: ApiEnv, checkoutId: string, expiresAt: Date) {
  const q = getCheckoutQueue(env);
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  await q.add(
    'release-reservation',
    { checkoutId },
    { jobId: `release-${checkoutId}`, delay, removeOnComplete: true },
  );
}

export function startCheckoutWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') {
    return;
  }
  if (worker) {
    return worker;
  }
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'release-reservation') {
        const checkoutId = job.data.checkoutId as string;
        const released = await releaseExpiredCheckout(checkoutId);
        logger.info({ checkoutId, released }, 'Checkout reservation release job');
      }
    },
    { connection: connection(env) },
  );
  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Checkout worker job failed');
  });
  return worker;
}

export async function closeCheckoutQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
