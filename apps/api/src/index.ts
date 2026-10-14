import { loadApiEnv } from './env.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { getCheckoutQueue, startCheckoutWorker } from './jobs/checkoutQueue.js';

const env = loadApiEnv();
const logger = createLogger(env);
const app = createApp(env, logger);

if (!(env.NODE_ENV === 'test' && env.HEALTH_SKIP_INFRA)) {
  getCheckoutQueue(env);
  startCheckoutWorker(env, logger);
}

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, providers: app.get('providers') }, 'BookVerse API listening');
});
