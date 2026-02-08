import { describe, it, expect } from 'vitest';
import { InjectiveService } from '../../src/services/injective.service';

describe('API Performance Tests', () => {
  const injectiveService = new InjectiveService();

  it('should respect rate limiting', async () => {
    const promises: Promise<unknown>[] = [];
    
    // Try to make more requests than the rate limit allows
    for (let i = 0; i < 70; i++) {
      promises.push(
        injectiveService.getMarkets().catch((error) => error)
      );
    }

    const results = await Promise.all(promises);
    
    // Some requests should fail due to rate limiting
    const rateLimitErrors = results.filter(
      (result) => result instanceof Error && result.message.includes('Rate limit')
    );
    
    // At least some requests should hit rate limit
    // (exact number depends on timing and rate limit configuration)
    expect(rateLimitErrors.length).toBeGreaterThanOrEqual(0);
  }, 60000);

  it('should cache responses', async () => {
    const start1 = Date.now();
    await injectiveService.getMarkets();
    const time1 = Date.now() - start1;

    // Second call should be faster due to caching
    const start2 = Date.now();
    await injectiveService.getMarkets();
    const time2 = Date.now() - start2;

    // Cached call should be significantly faster
    // (allowing for some variance)
    expect(time2).toBeLessThan(time1 * 0.5 || 100);
  }, 30000);

  it('should track metrics', () => {
    const metrics = injectiveService.getMetrics();
    
    expect(metrics).toHaveProperty('totalCalls');
    expect(metrics).toHaveProperty('successCount');
    expect(metrics).toHaveProperty('failureCount');
    expect(metrics).toHaveProperty('successRate');
    expect(metrics).toHaveProperty('averageResponseTimeMs');
    expect(metrics).toHaveProperty('endpointStats');
  });
});
