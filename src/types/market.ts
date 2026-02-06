export type Window = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '7d';

export interface MarketInfo {
  id: string;
  symbol: string;
  base: string;
  quote: string;
}

export type OrderbookLevel = [number, number];

export interface Orderbook {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

export interface Trade {
  price: number;
  size: number;
  timestamp: string;
}

export interface LiquidityMetrics {
  spread_bps: number;
  depth_25bps: number;
  turnover: number;
  imbalance: number;
  score: number;
}

export interface VolatilityMetrics {
  realized: number;
  ewma: number;
  trend: number;
  score: number;
}

export interface ActivityMetrics {
  volume_quote: number;
  trades: number;
  avg_trade_size: number;
  score: number;
}

export interface HealthMetrics {
  score: number;
}

export interface MarketSummaryMetrics {
  liquidity: LiquidityMetrics;
  volatility: VolatilityMetrics;
  activity: ActivityMetrics;
  health: HealthMetrics;
}

export type SignalLevel = 'info' | 'warn' | 'critical';

export interface Signal {
  code: string;
  level: SignalLevel;
  message: string;
}

export interface ApiEnvelope<T> {
  market_id: string;
  symbol: string;
  timestamp: string;
  window: Window;
  metrics: T;
  signals: Signal[];
}
