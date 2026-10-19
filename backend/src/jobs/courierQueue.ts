import { Queue, Worker } from 'bullmq';
import type { ApiEnv } from '@bookverse/shared';
import type { Logger } from '../lib/logger.js';
import { createBullmqConnection } from '../lib/bullmqConnection.js';
import { createCourierProvider } from '../providers/courier/index.js';
import { applyTrackingPoll } from '../services/courier/courierWebhookService.js';
import { createShipmentForOrder } from '../services/courier/shipmentService.js';
import { prisma } from '../lib/prisma.js';

const QUEUE_NAME = 'courier';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection(env: ApiEnv) {
  return createBullmqConnection(env);
}

export function getCourierQueue(env: ApiEnv): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: connection(env) });
  }
  return queue;
}

export async function scheduleCreateShipment(env: ApiEnv, orderId: string) {
  const q = getCourierQueue(env);
  await q.add(
    'create-shipment',
    { orderId },
    {
      jobId: `shipment-${orderId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: true,
    },
  );
}

export async function scheduleCourierPoll(env: ApiEnv) {
  const q = getCourierQueue(env);
  await q.add(
    'poll-shipments',
    {},
    { repeat: { every: 30 * 60 * 1000 }, jobId: 'courier-poll-30m' },
  );
}

export function startCourierWorker(env: ApiEnv, logger: Logger) {
  if (env.NODE_ENV === 'test') return;
  if (worker) return worker;

  const courier = createCourierProvider(env);

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === 'create-shipment') {
        const orderId = job.data.orderId as string;
        await createShipmentForOrder(env, courier, orderId);
        logger.info({ orderId }, 'Create shipment job finished');
      }
      if (job.name === 'poll-shipments') {
        const due = await prisma.shipment.findMany({
          where: {
            pollAfter: { lte: new Date() },
            order: { status: { in: ['PACKED', 'SHIPPED'] } },
          },
          take: 50,
        });
        for (const row of due) {
          try {
            await applyTrackingPoll(env, courier, row.id);
          } catch (err) {
            logger.warn({ err, shipmentId: row.id }, 'Courier poll failed');
          }
        }
        logger.info({ polled: due.length }, 'Courier poll job');
      }
    },
    { connection: connection(env) },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, name: job?.name }, 'Courier worker job failed');
  });

  return worker;
}

export async function closeCourierQueue() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
