import Fastify from 'fastify';
import { registerRoutes } from './routes';
import { buildLogger } from './utils/logger';
import { loadEnv } from './config/env';

export function buildApp() {
  const env = loadEnv();
  const app = Fastify({ logger: buildLogger(env) });

  registerRoutes(app);

  return app;
}
