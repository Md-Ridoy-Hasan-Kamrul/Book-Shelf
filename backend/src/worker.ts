import { loadApiEnv } from './env.js';
import { createLogger } from './lib/logger.js';
import { getCheckoutQueue, startCheckoutWorker, closeCheckoutQueue } from './jobs/checkoutQueue.js';
import {
  getMoneyQueue,
  startMoneyWorker,
  scheduleMoneyJobs,
  closeMoneyQueue,
} from './jobs/moneyQueue.js';
import {
  getCourierQueue,
  startCourierWorker,
  scheduleCourierPoll,
  closeCourierQueue,
} from './jobs/courierQueue.js';
import {
  getNotificationQueue,
  startNotificationWorker,
  closeNotificationQueue,
} from './jobs/notificationQueue.js';
import {
  getFeedQueue,
  startFeedWorker,
  scheduleTrendingRebuild,
  closeFeedQueue,
} from './jobs/feedQueue.js';
import {
  getBadgeQueue,
  startBadgeWorker,
  scheduleNightlyBadges,
  closeBadgeQueue,
} from './jobs/badgeQueue.js';

const env = loadApiEnv();
const logger = createLogger(env);

if (env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA) {
  logger.info('Worker skipped (test + HEALTH_SKIP_INFRA)');
  process.exit(0);
}

getCheckoutQueue(env);
getMoneyQueue(env);
getCourierQueue(env);
getNotificationQueue(env);
getFeedQueue(env);
getBadgeQueue(env);

startCheckoutWorker(env, logger);
startMoneyWorker(env, logger);
void scheduleMoneyJobs(env);
startCourierWorker(env, logger);
void scheduleCourierPoll(env);
startNotificationWorker(env, logger);
startFeedWorker(env, logger);
void scheduleTrendingRebuild(env);
startBadgeWorker(env, logger);
void scheduleNightlyBadges(env);

logger.info('BookVerse worker process started (BullMQ)');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Worker graceful shutdown');
  await closeBadgeQueue();
  await closeFeedQueue();
  await closeNotificationQueue();
  await closeCourierQueue();
  await closeMoneyQueue();
  await closeCheckoutQueue();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
