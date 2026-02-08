import type { FastifyReply, FastifyRequest } from 'fastify';
import { InjectiveService } from '../services/injective.service';

const injectiveService = new InjectiveService();

export async function getApiMetrics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const summary = injectiveService.getMetrics();
    const failures = injectiveService.getRecentFailures(10);

    return reply.send({
      timestamp: new Date().toISOString(),
      summary,
      recent_failures: failures
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch API metrics.' });
  }
}
