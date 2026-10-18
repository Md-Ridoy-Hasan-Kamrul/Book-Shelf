import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { releaseDueEscrowEntries } from '../services/money/escrowService.js';
import { reconcileOrdersVsLedger } from '../services/money/reconcileService.js';

const QUEUE_NAME = 'money';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export function getMoneyQueue(env: ApiEnv): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: connection(env) });
  }
  return queue;
}

export async function scheduleMoneyJobs(env: ApiEnv) {
  const q = getMoneyQueue(env);
  await q.add('escrow-release', {}, { repeat: { every: 60 * 60 * 1000 }, jobId: 'escrow-hourly' });
  await q.add(
    'reconcile',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: 'reconcile-daily' },
  );
}

export function startMoneyWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') return;
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'escrow-release') {
        const n = await releaseDueEscrowEntries(env);
        logger.info({ released: n }, 'Escrow release job');
      }
      if (job.name === 'reconcile') {
        const r = await reconcileOrdersVsLedger();
        if (!r.ok) logger.warn({ issues: r.issues.length }, 'Reconcile found issues');
      }
    },
    { connection: connection(env) },
  );
  return worker;
}

export async function closeMoneyQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
