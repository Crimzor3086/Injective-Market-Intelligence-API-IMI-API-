import { buildApp } from './app';
import { loadEnv } from './config/env';

async function startServer() {
  const env = loadEnv();
  const app = buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();
