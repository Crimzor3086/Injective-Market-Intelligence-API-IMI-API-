/**
 * InjectiveService - Real-time integration with Injective Exchange API
 * 
 * This service fetches live market data from the Injective Protocol exchange API.
 * Features:
 * - Response caching to reduce API calls
 * - Rate limiting to protect against API limits
 * - Metrics tracking for monitoring
 * - Endpoint verification with fallback options
 * 
 * Endpoints used (with fallbacks):
 * - GET /api/exchange/v1/markets or /markets
 * - GET /api/exchange/v1/orderbooks/{marketId} or /orderbook/{marketId}
 * - GET /api/exchange/v1/trades/{marketId} or /trades/{marketId}
 * 
 * Configuration via environment variables:
 * - INJECTIVE_API_URL: Base URL for Injective API (default: https://api.injective.exchange)
 * - INJECTIVE_API_TIMEOUT_MS: Request timeout in milliseconds (default: 10000)
 * - INJECTIVE_API_CACHE_TTL_MS: Cache TTL for API responses (default: 5000)
 * - INJECTIVE_API_RATE_LIMIT_PER_MINUTE: Max requests per minute (default: 60)
 * - ENABLE_API_METRICS: Enable metrics tracking (default: true)
 */
import { loadEnv } from '../config/env';
import { round } from '../utils/formatter';
import { CacheService } from './cache.service';
import { ApiMetricsService } from './api-metrics.service';
import type { MarketInfo, Orderbook, OrderbookLevel, Trade } from '../types/market';

interface InjectiveMarketResponse {
  market?: {
    marketId: string;
    ticker: string;
    baseDenom: string;
    quoteDenom: string;
    baseTokenMeta?: {
      name: string;
      symbol: string;
    };
    quoteTokenMeta?: {
      name: string;
      symbol: string;
    };
  };
  markets?: Array<{
    marketId: string;
    ticker: string;
    baseDenom: string;
    quoteDenom: string;
    baseTokenMeta?: {
      name: string;
      symbol: string;
    };
    quoteTokenMeta?: {
      name: string;
      symbol: string;
    };
  }>;
}

interface InjectiveOrderbookResponse {
  buys?: Array<{
    price: string;
    quantity: string;
  }>;
  sells?: Array<{
    price: string;
    quantity: string;
  }>;
  bids?: Array<{
    price: string;
    quantity: string;
  }>;
  asks?: Array<{
    price: string;
    quantity: string;
  }>;
}

interface InjectiveTradeResponse {
  trades?: Array<{
    price: string;
    quantity: string;
    timestamp: string;
    executedAt?: number;
  }>;
}

export class InjectiveService {
  private apiUrl: string;
  private timeout: number;
  private cache: CacheService;
  private metrics: ApiMetricsService;
  private rateLimitPerMinute: number;
  private rateLimitTracker: Map<string, number[]> = new Map();
  private enableMetrics: boolean;
  private endpointVariants: Record<string, string[]> = {
    markets: ['/api/exchange/v1/markets', '/markets', '/api/v1/markets'],
    orderbook: ['/api/exchange/v1/orderbooks', '/orderbook', '/api/v1/orderbook'],
    trades: ['/api/exchange/v1/trades', '/trades', '/api/v1/trades']
  };

  constructor() {
    const env = loadEnv();
    this.apiUrl = env.INJECTIVE_API_URL;
    this.timeout = env.INJECTIVE_API_TIMEOUT_MS;
    this.cache = new CacheService(env.INJECTIVE_API_CACHE_TTL_MS);
    this.metrics = new ApiMetricsService();
    this.rateLimitPerMinute = env.INJECTIVE_API_RATE_LIMIT_PER_MINUTE;
    this.enableMetrics = env.ENABLE_API_METRICS;
  }

  private checkRateLimit(endpoint: string): void {
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window
    
    if (!this.rateLimitTracker.has(endpoint)) {
      this.rateLimitTracker.set(endpoint, []);
    }
    
    const timestamps = this.rateLimitTracker.get(endpoint)!;
    // Remove timestamps outside the window
    const recent = timestamps.filter((ts) => ts > windowStart);
    
    if (recent.length >= this.rateLimitPerMinute) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Max ${this.rateLimitPerMinute} requests per minute.`);
    }
    
    recent.push(now);
    this.rateLimitTracker.set(endpoint, recent);
  }

  private async fetchWithTimeout(
    url: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const startTime = Date.now();
    
    // Check rate limit
    this.checkRateLimit(endpoint);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      // Record metrics
      if (this.enableMetrics) {
        this.metrics.recordCall({
          endpoint,
          method: options.method || 'GET',
          success: response.ok,
          statusCode: response.status,
          responseTimeMs: responseTime,
          timestamp: Date.now(),
          error: response.ok ? undefined : `${response.status} ${response.statusText}`
        });
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      // Record metrics for failures
      if (this.enableMetrics) {
        this.metrics.recordCall({
          endpoint,
          method: options.method || 'GET',
          success: false,
          responseTimeMs: responseTime,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private async tryEndpoints(
    endpointType: 'markets' | 'orderbook' | 'trades',
    pathSuffix: string = ''
  ): Promise<Response> {
    const variants = this.endpointVariants[endpointType];
    let lastError: Error | null = null;
    
    for (const variant of variants) {
      const url = `${this.apiUrl}${variant}${pathSuffix}`;
      const endpoint = `${endpointType}${pathSuffix}`;
      
      try {
        const response = await this.fetchWithTimeout(url, endpoint);
        
        if (response.ok) {
          return response;
        }
        
        // If 404, try next variant
        if (response.status === 404) {
          continue;
        }
        
        // For other errors, throw
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        // Continue to next variant on network/timeout errors
        if (lastError.message.includes('timeout') || lastError.message.includes('fetch')) {
          continue;
        }
        // For rate limit errors, throw immediately
        if (lastError.message.includes('Rate limit')) {
          throw lastError;
        }
      }
    }
    
    // If all variants failed, throw the last error
    throw lastError || new Error(`All endpoint variants failed for ${endpointType}`);
  }

  private parseMarketId(marketId: string): string {
    // Injective market IDs are typically in format like "0x..." or base-quote format
    // Handle both formats
    return marketId;
  }

  async getMarkets(): Promise<MarketInfo[]> {
    try {
      const cacheKey = 'injective:markets';
      const cached = this.cache.get<MarketInfo[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.tryEndpoints('markets');
      const data: InjectiveMarketResponse = await response.json();
      const markets = data.markets || [];

      const result = markets.map((market) => {
        const baseSymbol = market.baseTokenMeta?.symbol || market.baseDenom.split('/').pop() || market.baseDenom;
        const quoteSymbol = market.quoteTokenMeta?.symbol || market.quoteDenom.split('/').pop() || market.quoteDenom;
        const symbol = `${baseSymbol}/${quoteSymbol}`;
        
        // Create a normalized market ID from the marketId or ticker
        const marketId = market.marketId || market.ticker.toLowerCase().replace('/', '-');

        return {
          id: marketId,
          symbol,
          base: baseSymbol,
          quote: quoteSymbol
        };
      });

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch markets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMarketById(id: string): Promise<MarketInfo | null> {
    try {
      const markets = await this.getMarkets();
      return markets.find((market) => market.id === id || market.id === this.parseMarketId(id)) ?? null;
    } catch (error) {
      throw new Error(`Failed to fetch market by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrderbook(marketId: string): Promise<Orderbook> {
    try {
      const parsedMarketId = this.parseMarketId(marketId);
      const cacheKey = `injective:orderbook:${parsedMarketId}`;
      
      const cached = this.cache.get<Orderbook>(cacheKey);
      if (cached) {
        return cached;
      }

      const pathSuffix = `/${encodeURIComponent(parsedMarketId)}`;
      const response = await this.tryEndpoints('orderbook', pathSuffix);

      const data: InjectiveOrderbookResponse = await response.json();
      
      // Handle different response formats
      const bids = (data.bids || data.buys || []).map((level) => [
        round(Number.parseFloat(level.price), 8),
        round(Number.parseFloat(level.quantity), 8)
      ] as OrderbookLevel);

      const asks = (data.asks || data.sells || []).map((level) => [
        round(Number.parseFloat(level.price), 8),
        round(Number.parseFloat(level.quantity), 8)
      ] as OrderbookLevel);

      // Sort bids descending (highest first) and asks ascending (lowest first)
      bids.sort((a, b) => b[0] - a[0]);
      asks.sort((a, b) => a[0] - b[0]);

      const result = { bids, asks };
      
      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch orderbook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecentTrades(marketId: string, limit = 120): Promise<Trade[]> {
    try {
      const parsedMarketId = this.parseMarketId(marketId);
      const cacheKey = `injective:trades:${parsedMarketId}:${limit}`;
      
      const cached = this.cache.get<Trade[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const pathSuffix = `/${encodeURIComponent(parsedMarketId)}?limit=${limit}`;
      const response = await this.tryEndpoints('trades', pathSuffix);

      const data: InjectiveTradeResponse = await response.json();
      const trades = data.trades || [];

      const result = trades
        .map((trade) => {
          const price = Number.parseFloat(trade.price);
          const size = Number.parseFloat(trade.quantity);
          const timestamp = trade.timestamp || (trade.executedAt ? new Date(trade.executedAt).toISOString() : new Date().toISOString());

          return {
            price: round(price, 8),
            size: round(size, 8),
            timestamp
          };
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get API metrics summary
   */
  getMetrics() {
    return this.metrics.getSummary();
  }

  /**
   * Get recent API failures
   */
  getRecentFailures(limit = 10) {
    return this.metrics.getRecentFailures(limit);
  }
}
