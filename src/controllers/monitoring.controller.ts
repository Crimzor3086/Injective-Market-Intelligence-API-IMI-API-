import type { FastifyReply, FastifyRequest } from 'fastify';
import { InjectiveService } from '../services/injective.service';
import { loadEnv } from '../config/env';
import { toIsoTimestamp } from '../utils/formatter';

const injectiveService = new InjectiveService();

export async function getHealthCheck(request: FastifyRequest, reply: FastifyReply) {
  const env = loadEnv();
  
  return reply.send({
    status: 'healthy',
    timestamp: toIsoTimestamp(),
    version: '0.1.0',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  });
}

export async function getReadinessCheck(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check if we can reach the Injective API
    const markets = await injectiveService.getMarkets();
    
    return reply.send({
      status: 'ready',
      timestamp: toIsoTimestamp(),
      checks: {
        injective_api: 'connected',
        markets_available: markets.length > 0
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(503).send({
      status: 'not_ready',
      timestamp: toIsoTimestamp(),
      checks: {
        injective_api: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

export async function getLivenessCheck(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    status: 'alive',
    timestamp: toIsoTimestamp()
  });
}
