import type { FastifyInstance } from 'fastify';
import { marketsRoutes } from './markets';
import { API_PREFIX } from '../config/constants';
import * as metricsController from '../controllers/metrics.controller';
import * as monitoringController from '../controllers/monitoring.controller';

export function registerRoutes(app: FastifyInstance) {
  // Health check endpoints
  app.get('/health', monitoringController.getHealthCheck);
  app.get('/ready', monitoringController.getReadinessCheck);
  app.get('/live', monitoringController.getLivenessCheck);

  // API metrics
  app.get(`${API_PREFIX}/metrics`, metricsController.getApiMetrics);

  // Market endpoints
  app.register(marketsRoutes, {
    prefix: `${API_PREFIX}/markets`
  });
}
