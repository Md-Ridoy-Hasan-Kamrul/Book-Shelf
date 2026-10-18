import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { recomputeBadges } from '../services/points/badgeService.js';

const QUEUE_NAME = 'badges';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export function getBadgeQueue(env: ApiEnv): Queue {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: connection(env) });
  return queue;
}

export async function scheduleNightlyBadges(env: ApiEnv) {
  const q = getBadgeQueue(env);
  await q.add(
    'recompute-badges',
    {},
    { repeat: { pattern: '0 2 * * *' }, jobId: 'badges-nightly' },
  );
}

export function startBadgeWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') return;
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'recompute-badges') {
        const result = await recomputeBadges();
        logger.info(result, 'Badges recomputed');
      }
    },
    { connection: connection(env) },
  );
  return worker;
}

export async function closeBadgeQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
