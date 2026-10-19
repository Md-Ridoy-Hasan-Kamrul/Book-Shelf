import { createServer } from 'node:http';
import { loadApiEnv } from './env.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { attachLiveRoom } from './realtime/liveRoom.js';

const env = loadApiEnv();
const logger = createLogger(env);
const app = createApp(env, logger);
const server = createServer(app);

attachLiveRoom(server, env, logger);

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, providers: app.get('providers'), liveEvents: env.FEATURE_LIVE_EVENTS },
    'BookVerse API listening',
  );
});
