import Fastify from 'fastify';
import { registerRoutes } from './routes';
import { buildLogger } from './utils/logger';
import { loadEnv } from './config/env';

export function buildApp() {
  const env = loadEnv();
  const app = Fastify({ logger: buildLogger(env) });

  // Add CORS support and handle OPTIONS requests
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (request.method === 'OPTIONS') {
      reply.code(200).send();
    }
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
      statusCode: error.statusCode || 500
    });
  });

  registerRoutes(app);

  return app;
}
