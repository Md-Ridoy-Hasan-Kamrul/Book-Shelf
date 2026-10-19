import { Queue, Worker } from 'bullmq';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createBullmqConnection } from '../lib/bullmqConnection.js';
import {
  deliverNotification,
  type NotificationJobPayload,
} from '../services/retention/notificationDeliveryService.js';

const QUEUE_NAME = 'notifications';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return createBullmqConnection(env);
}

export function getNotificationQueue(env: ApiEnv): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: connection(env),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
      },
    });
  }
  return queue;
}

export async function enqueueNotification(env: ApiEnv, payload: NotificationJobPayload) {
  const q = getNotificationQueue(env);
  await q.add('deliver', payload, { jobId: payload.dedupeKey });
}

export function startNotificationWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') return;
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'deliver') {
        await deliverNotification(env, logger, job.data as NotificationJobPayload);
      }
    },
    { connection: connection(env) },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, queue: QUEUE_NAME }, 'Notification job failed');
  });

  return worker;
}

export async function closeNotificationQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}

export async function listFailedNotificationJobs(env: ApiEnv, limit = 20) {
  const q = getNotificationQueue(env);
  return q.getFailed(0, limit - 1);
}
