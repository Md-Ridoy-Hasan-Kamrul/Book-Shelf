import { loadApiEnv } from './env.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { getCheckoutQueue, startCheckoutWorker } from './jobs/checkoutQueue.js';
import { getMoneyQueue, scheduleMoneyJobs, startMoneyWorker } from './jobs/moneyQueue.js';
import { getCourierQueue, scheduleCourierPoll, startCourierWorker } from './jobs/courierQueue.js';

const env = loadApiEnv();
const logger = createLogger(env);
const app = createApp(env, logger);

if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
  getCheckoutQueue(env);
  startCheckoutWorker(env, logger);
  getMoneyQueue(env);
  startMoneyWorker(env, logger);
  void scheduleMoneyJobs(env);
  getCourierQueue(env);
  startCourierWorker(env, logger);
  void scheduleCourierPoll(env);
}

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, providers: app.get('providers') }, 'BookVerse API listening');
});
