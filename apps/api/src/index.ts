import { createApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
	console.log(`BookVerse API running at http://localhost:${env.PORT}`);
});
