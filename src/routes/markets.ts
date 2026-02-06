import type { FastifyInstance } from 'fastify';
import * as marketsController from '../controllers/markets.controller';

export async function marketsRoutes(app: FastifyInstance) {
  app.get('/', marketsController.listMarkets);
  app.get('/active', marketsController.listActiveMarkets);
  app.get('/:id/summary', marketsController.getMarketSummary);
  app.get('/:id/liquidity', marketsController.getLiquidity);
  app.get('/:id/volatility', marketsController.getVolatility);
  app.get('/:id/health', marketsController.getHealth);
  app.get('/:id/insights', marketsController.getInsights);
}
