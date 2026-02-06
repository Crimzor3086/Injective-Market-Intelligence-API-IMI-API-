import { clamp, normalize, stdDev, ewma } from '../utils/math';
import { round } from '../utils/formatter';
import type {
  ActivityMetrics,
  HealthMetrics,
  LiquidityMetrics,
  Orderbook,
  Trade,
  VolatilityMetrics,
  Signal
} from '../types/market';

export function computeSpreadBps(orderbook: Orderbook): number {
  const bestBid = orderbook.bids[0]?.[0];
  const bestAsk = orderbook.asks[0]?.[0];

  if (!bestBid || !bestAsk) {
    return 0;
  }

  const mid = (bestBid + bestAsk) / 2;
  return ((bestAsk - bestBid) / mid) * 10_000;
}

export function computeDepthAtBps(orderbook: Orderbook, bps: number): number {
  const bestBid = orderbook.bids[0]?.[0];
  const bestAsk = orderbook.asks[0]?.[0];

  if (!bestBid || !bestAsk) {
    return 0;
  }

  const mid = (bestBid + bestAsk) / 2;
  const bidFloor = mid * (1 - bps / 10_000);
  const askCeil = mid * (1 + bps / 10_000);

  const bidDepth = orderbook.bids
    .filter(([price]) => price >= bidFloor)
    .reduce((sum, [, size]) => sum + size, 0);

  const askDepth = orderbook.asks
    .filter(([price]) => price <= askCeil)
    .reduce((sum, [, size]) => sum + size, 0);

  return bidDepth + askDepth;
}

export function computeOrderbookImbalance(orderbook: Orderbook, bps = 25): number {
  const bestBid = orderbook.bids[0]?.[0];
  const bestAsk = orderbook.asks[0]?.[0];

  if (!bestBid || !bestAsk) {
    return 0;
  }

  const mid = (bestBid + bestAsk) / 2;
  const bidFloor = mid * (1 - bps / 10_000);
  const askCeil = mid * (1 + bps / 10_000);

  const bidDepth = orderbook.bids
    .filter(([price]) => price >= bidFloor)
    .reduce((sum, [, size]) => sum + size, 0);

  const askDepth = orderbook.asks
    .filter(([price]) => price <= askCeil)
    .reduce((sum, [, size]) => sum + size, 0);

  if (bidDepth + askDepth === 0) {
    return 0;
  }

  return (bidDepth - askDepth) / (bidDepth + askDepth);
}

export function computeLiquidityMetrics(orderbook: Orderbook, trades: Trade[]): LiquidityMetrics {
  const spreadBps = computeSpreadBps(orderbook);
  const depth25 = computeDepthAtBps(orderbook, 25);
  const imbalance = computeOrderbookImbalance(orderbook, 25);
  const volume = trades.reduce((sum, trade) => sum + trade.size, 0);
  const turnover = depth25 > 0 ? volume / depth25 : 0;

  const spreadScore = 1 - normalize(spreadBps, 5, 50);
  const depthScore = normalize(depth25, 5_000, 200_000);
  const turnoverScore = normalize(turnover, 0.05, 1.2);
  const imbalanceScore = 1 - Math.abs(imbalance);

  const score = Math.round(
    100 * clamp(0.35 * spreadScore + 0.35 * depthScore + 0.2 * turnoverScore + 0.1 * imbalanceScore, 0, 1)
  );

  return {
    spread_bps: round(spreadBps, 2),
    depth_25bps: round(depth25, 2),
    turnover: round(turnover, 4),
    imbalance: round(imbalance, 4),
    score
  };
}

function logReturns(prices: number[]): number[] {
  if (prices.length < 2) {
    return [];
  }

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const prev = prices[i - 1];
    const current = prices[i];
    if (prev <= 0 || current <= 0) {
      continue;
    }
    returns.push(Math.log(current / prev));
  }

  return returns;
}

export function computeRealizedVol(prices: number[]): number {
  const returns = logReturns(prices);
  return stdDev(returns);
}

export function computeEwmaVol(prices: number[], lambda = 0.94): number {
  const returns = logReturns(prices);
  const squared = returns.map((value) => value ** 2);
  return Math.sqrt(ewma(squared, lambda));
}

export function computeVolatilityMetrics(trades: Trade[], baselineVol?: number): VolatilityMetrics {
  const prices = trades.map((trade) => trade.price);
  const realized = computeRealizedVol(prices);
  const ewmaVol = computeEwmaVol(prices);
  const baseline = baselineVol ?? (realized > 0 ? realized * 0.8 : 0);
  const trend = baseline > 0 ? realized / baseline : 1;

  const score = Math.round(100 * clamp(1 - normalize(trend, 1, 3), 0, 1));

  return {
    realized: round(realized, 6),
    ewma: round(ewmaVol, 6),
    trend: round(trend, 4),
    score
  };
}

export function computeActivityMetrics(trades: Trade[]): ActivityMetrics {
  const volumeQuote = trades.reduce((sum, trade) => sum + trade.price * trade.size, 0);
  const tradesCount = trades.length;
  const avgTradeSize = tradesCount > 0 ? volumeQuote / tradesCount : 0;

  const volumeScore = normalize(volumeQuote, 10_000, 5_000_000);
  const tradeScore = normalize(tradesCount, 10, 2_000);
  const score = Math.round(100 * clamp(0.6 * volumeScore + 0.4 * tradeScore, 0, 1));

  return {
    volume_quote: round(volumeQuote, 2),
    trades: tradesCount,
    avg_trade_size: round(avgTradeSize, 2),
    score
  };
}

export function computeHealthMetrics(
  liquidity: LiquidityMetrics,
  volatility: VolatilityMetrics,
  activity: ActivityMetrics
): HealthMetrics {
  const score = Math.round(0.45 * liquidity.score + 0.35 * volatility.score + 0.2 * activity.score);
  return { score };
}

export function buildSignals(metrics: {
  liquidity: LiquidityMetrics;
  volatility: VolatilityMetrics;
  activity: ActivityMetrics;
  health: HealthMetrics;
}): Signal[] {
  const signals: Signal[] = [];

  if (metrics.liquidity.spread_bps > 25) {
    signals.push({
      code: 'LIQ_SPREAD_WIDE',
      level: 'warn',
      message: 'Spread above 25 bps.'
    });
  }

  if (metrics.liquidity.depth_25bps < 20_000) {
    signals.push({
      code: 'LIQ_DEPTH_THIN',
      level: 'warn',
      message: 'Depth inside 25 bps is thin.'
    });
  }

  if (metrics.volatility.trend > 1.8) {
    signals.push({
      code: 'VOL_TREND_UP',
      level: 'warn',
      message: 'Volatility trending up vs baseline.'
    });
  }

  if (metrics.activity.score < 30) {
    signals.push({
      code: 'ACTIVITY_LOW',
      level: 'warn',
      message: 'Activity score below 30.'
    });
  }

  if (metrics.health.score < 40) {
    signals.push({
      code: 'HEALTH_DETERIORATING',
      level: 'critical',
      message: 'Market health score below 40.'
    });
  }

  if (signals.length === 0) {
    signals.push({
      code: 'HEALTH_OK',
      level: 'info',
      message: 'No material degradation detected.'
    });
  }

  return signals;
}
