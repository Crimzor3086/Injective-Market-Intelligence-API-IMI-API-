/**
 * API Metrics Service - Tracks API call performance and success rates
 */
export interface ApiCallMetrics {
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  responseTimeMs: number;
  timestamp: number;
  error?: string;
}

export interface ApiMetricsSummary {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageResponseTimeMs: number;
  endpointStats: Record<string, {
    calls: number;
    successes: number;
    failures: number;
    avgResponseTime: number;
  }>;
}

export class ApiMetricsService {
  private metrics: ApiCallMetrics[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k calls
  private readonly windowSize = 60 * 1000; // 1 minute window for rate limiting

  recordCall(metrics: ApiCallMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getSummary(windowMs = 5 * 60 * 1000): ApiMetricsSummary {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter((m) => m.timestamp >= cutoff);

    const totalCalls = recent.length;
    const successCount = recent.filter((m) => m.success).length;
    const failureCount = totalCalls - successCount;
    const successRate = totalCalls > 0 ? successCount / totalCalls : 0;
    
    const totalResponseTime = recent.reduce((sum, m) => sum + m.responseTimeMs, 0);
    const averageResponseTimeMs = totalCalls > 0 ? totalResponseTime / totalCalls : 0;

    // Group by endpoint
    const endpointStats: Record<string, {
      calls: number;
      successes: number;
      failures: number;
      avgResponseTime: number;
    }> = {};

    recent.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = {
          calls: 0,
          successes: 0,
          failures: 0,
          avgResponseTime: 0,
          totalResponseTime: 0
        } as any;
      }
      
      const stat = endpointStats[key];
      stat.calls += 1;
      if (metric.success) {
        stat.successes += 1;
      } else {
        stat.failures += 1;
      }
      (stat as any).totalResponseTime += metric.responseTimeMs;
    });

    // Calculate averages
    Object.keys(endpointStats).forEach((key) => {
      const stat = endpointStats[key];
      stat.avgResponseTime = stat.calls > 0 ? (stat as any).totalResponseTime / stat.calls : 0;
      delete (stat as any).totalResponseTime;
    });

    return {
      totalCalls,
      successCount,
      failureCount,
      successRate,
      averageResponseTimeMs,
      endpointStats
    };
  }

  getRecentFailures(limit = 10): ApiCallMetrics[] {
    return this.metrics
      .filter((m) => !m.success)
      .slice(-limit)
      .reverse();
  }

  getCallRate(endpoint: string, windowMs = this.windowSize): number {
    const cutoff = Date.now() - windowMs;
    const recent = this.metrics.filter(
      (m) => m.endpoint === endpoint && m.timestamp >= cutoff
    );
    return recent.length;
  }

  clear(): void {
    this.metrics = [];
  }
}
