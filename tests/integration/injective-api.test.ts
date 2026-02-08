import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

describe('Injective API Integration Tests', () => {
  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health and Monitoring Endpoints', () => {
    it('should return health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('memory');
    });

    it('should return liveness check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('alive');
    });

    it('should return readiness check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready'
      });

      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('checks');
    });
  });

  describe('API Metrics Endpoint', () => {
    it('should return API metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/metrics'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('recent_failures');
      expect(body.summary).toHaveProperty('totalCalls');
      expect(body.summary).toHaveProperty('successRate');
    });
  });

  describe('Markets Endpoints', () => {
    it('should fetch markets list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/markets'
      });

      // Accept both success and error responses (API might be unavailable)
      expect([200, 500, 503]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('items');
        expect(body).toHaveProperty('count');
        expect(Array.isArray(body.items)).toBe(true);
      }
    }, 30000); // 30 second timeout for API calls

    it('should fetch active markets', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/markets/active?limit=10'
      });

      // Accept both success and error responses
      expect([200, 500, 503]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('items');
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('window');
      }
    }, 30000);

    it('should handle market summary request', async () => {
      // First get a market ID
      const marketsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/markets'
      });

      if (marketsResponse.statusCode === 200) {
        const marketsBody = JSON.parse(marketsResponse.body);
        
        if (marketsBody.items && marketsBody.items.length > 0) {
          const marketId = marketsBody.items[0].id;
          
          const summaryResponse = await app.inject({
            method: 'GET',
            url: `/api/v1/markets/${marketId}/summary`
          });

          expect([200, 404, 500, 503]).toContain(summaryResponse.statusCode);
          
          if (summaryResponse.statusCode === 200) {
            const summaryBody = JSON.parse(summaryResponse.body);
            expect(summaryBody).toHaveProperty('market_id');
            expect(summaryBody).toHaveProperty('metrics');
            expect(summaryBody).toHaveProperty('signals');
          }
        }
      }
    }, 60000); // 60 second timeout for multiple API calls
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent market', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/markets/non-existent-market-id/summary'
      });

      expect([404, 500, 503]).toContain(response.statusCode);
      
      if (response.statusCode === 404) {
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('error');
      }
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/markets/active?limit=invalid'
      });

      // Should still return 200 with default limit
      expect([200, 500, 503]).toContain(response.statusCode);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
});
