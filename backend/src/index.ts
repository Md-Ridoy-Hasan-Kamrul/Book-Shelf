import { loadApiEnv } from './env.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';

const env = loadApiEnv();
const logger = createLogger(env);
const app = createApp(env, logger);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, providers: app.get('providers') }, 'BookVerse API listening');
});
