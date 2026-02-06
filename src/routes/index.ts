import type { FastifyInstance } from 'fastify';
import { marketsRoutes } from './markets';
import { API_PREFIX } from '../config/constants';

export function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  app.register(marketsRoutes, {
    prefix: `${API_PREFIX}/markets`
  });
}
