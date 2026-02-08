import type { FastifyReply, FastifyRequest } from 'fastify';
import { CacheService } from '../services/cache.service';
import { InjectiveService } from '../services/injective.service';
import {
  buildSignals,
  computeActivityMetrics,
  computeHealthMetrics,
  computeLiquidityMetrics,
  computeVolatilityMetrics
} from '../services/metrics.service';
import { DEFAULT_LOOKBACK, DEFAULT_LIMIT, DEFAULT_WINDOW } from '../config/constants';
import { loadEnv } from '../config/env';
import type { ApiEnvelope, MarketSummaryMetrics, Window } from '../types/market';
import { toIsoTimestamp } from '../utils/formatter';

const injectiveService = new InjectiveService();
const cache = new CacheService(loadEnv().CACHE_TTL_MS);

const validWindows: Window[] = ['1m', '5m', '15m', '1h', '4h', '1d', '7d'];

function parseWindow(value: unknown): Window {
  if (typeof value === 'string' && validWindows.includes(value as Window)) {
    return value as Window;
  }
  return DEFAULT_WINDOW as Window;
}

function parseLookback(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_LOOKBACK;
}

function parseLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_LIMIT;
}

async function buildSummary(
  marketId: string,
  window: Window,
  lookback: number
): Promise<ApiEnvelope<MarketSummaryMetrics> | null> {
  const cacheKey = `summary:${marketId}:${window}:${lookback}`;
  const cached = cache.get<ApiEnvelope<MarketSummaryMetrics>>(cacheKey);
  if (cached) {
    return cached;
  }

  const market = await injectiveService.getMarketById(marketId);
  if (!market) {
    return null;
  }

  const tradeLimit = Math.min(2000, Math.max(60, lookback * 60));
  const [orderbook, trades] = await Promise.all([
    injectiveService.getOrderbook(marketId),
    injectiveService.getRecentTrades(marketId, tradeLimit)
  ]);

  const liquidity = computeLiquidityMetrics(orderbook, trades);
  const volatility = computeVolatilityMetrics(trades);
  const activity = computeActivityMetrics(trades);
  const health = computeHealthMetrics(liquidity, volatility, activity);
  const signals = buildSignals({ liquidity, volatility, activity, health });

  const response: ApiEnvelope<MarketSummaryMetrics> = {
    market_id: market.id,
    symbol: market.symbol,
    timestamp: toIsoTimestamp(),
    window,
    metrics: { liquidity, volatility, activity, health },
    signals
  };

  cache.set(cacheKey, response);
  return response;
}

export async function listMarkets(request: FastifyRequest, reply: FastifyReply) {
  try {
    const markets = await injectiveService.getMarkets();
    return reply.send({ items: markets, count: markets.length });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch markets.' });
  }
}

export async function listActiveMarkets(
  request: FastifyRequest<{ Querystring: { window?: string; limit?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const limit = parseLimit(request.query.limit);
    const markets = await injectiveService.getMarkets();

    const ranked = await Promise.all(
      markets.map(async (market) => {
        const trades = await injectiveService.getRecentTrades(market.id, 120);
        const activity = computeActivityMetrics(trades);
        return {
          market_id: market.id,
          symbol: market.symbol,
          activity_score: activity.score
        };
      })
    );

    ranked.sort((a, b) => b.activity_score - a.activity_score);

    return reply.send({
      timestamp: toIsoTimestamp(),
      window,
      items: ranked.slice(0, limit),
      count: ranked.length
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch active markets.' });
  }
}

export async function getMarketSummary(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string; lookback?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const lookback = parseLookback(request.query.lookback);
    const summary = await buildSummary(request.params.id, window, lookback);

    if (!summary) {
      return reply.code(404).send({ error: 'Market not found.' });
    }

    return reply.send(summary);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch market summary.' });
  }
}

export async function getLiquidity(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string; lookback?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const lookback = parseLookback(request.query.lookback);
    const summary = await buildSummary(request.params.id, window, lookback);

    if (!summary) {
      return reply.code(404).send({ error: 'Market not found.' });
    }

    return reply.send({
      ...summary,
      metrics: summary.metrics.liquidity
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch liquidity metrics.' });
  }
}

export async function getVolatility(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string; lookback?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const lookback = parseLookback(request.query.lookback);
    const summary = await buildSummary(request.params.id, window, lookback);

    if (!summary) {
      return reply.code(404).send({ error: 'Market not found.' });
    }

    return reply.send({
      ...summary,
      metrics: summary.metrics.volatility
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch volatility metrics.' });
  }
}

export async function getHealth(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string; lookback?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const lookback = parseLookback(request.query.lookback);
    const summary = await buildSummary(request.params.id, window, lookback);

    if (!summary) {
      return reply.code(404).send({ error: 'Market not found.' });
    }

    return reply.send({
      ...summary,
      metrics: summary.metrics.health
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch health metrics.' });
  }
}

export async function getInsights(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { window?: string; lookback?: string } }>,
  reply: FastifyReply
) {
  try {
    const window = parseWindow(request.query.window);
    const lookback = parseLookback(request.query.lookback);
    const summary = await buildSummary(request.params.id, window, lookback);

    if (!summary) {
      return reply.code(404).send({ error: 'Market not found.' });
    }

    const insights = summary.signals.map(
      (signal) => `${signal.level.toUpperCase()}: ${signal.message}`
    );

    return reply.send({
      market_id: summary.market_id,
      symbol: summary.symbol,
      timestamp: summary.timestamp,
      window: summary.window,
      metrics: {
        insights
      },
      signals: summary.signals
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Failed to fetch market insights.' });
  }
}
