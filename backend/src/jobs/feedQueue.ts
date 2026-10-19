import { Queue, Worker } from 'bullmq';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createBullmqConnection } from '../lib/bullmqConnection.js';
import { rebuildTrendingCache } from '../services/social/feedService.js';

const QUEUE_NAME = 'feed';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return createBullmqConnection(env);
}

export function getFeedQueue(env: ApiEnv): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: connection(env) });
  }
  return queue;
}

export async function scheduleTrendingRebuild(env: ApiEnv) {
  const q = getFeedQueue(env);
  await q.add('rebuild-trending', {}, { repeat: { every: 60_000 }, jobId: 'trending-60s' });
}

export function startFeedWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') return;
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'rebuild-trending') {
        const n = (await rebuildTrendingCache(env)).length;
        logger.info({ posts: n }, 'Trending cache rebuilt');
      }
    },
    { connection: connection(env) },
  );
  return worker;
}

export async function closeFeedQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
