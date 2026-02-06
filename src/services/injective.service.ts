import { round } from '../utils/formatter';
import type { MarketInfo, Orderbook, OrderbookLevel, Trade } from '../types/market';

const mockMarkets: MarketInfo[] = [
  { id: 'inj-usdt', symbol: 'INJ/USDT', base: 'INJ', quote: 'USDT' },
  { id: 'atom-usdt', symbol: 'ATOM/USDT', base: 'ATOM', quote: 'USDT' },
  { id: 'eth-usdt', symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT' }
];

const marketMidPrices: Record<string, number> = {
  'inj-usdt': 28.4,
  'atom-usdt': 9.7,
  'eth-usdt': 2400
};

function buildOrderbook(mid: number): Orderbook {
  const spread = mid * 0.0008;
  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];

  for (let i = 0; i < 10; i += 1) {
    const step = mid * 0.0005 * i;
    const size = 800 - i * 40;
    bids.push([round(mid - spread - step, 4), round(size, 4)]);
    asks.push([round(mid + spread + step, 4), round(size, 4)]);
  }

  return { bids, asks };
}

function buildTrades(mid: number, limit: number): Trade[] {
  const now = Date.now();
  const trades: Trade[] = [];

  for (let i = 0; i < limit; i += 1) {
    const drift = Math.sin(i / 6) * mid * 0.0015;
    const price = round(mid + drift, 4);
    const size = round(1 + (i % 5) * 0.4, 4);
    const timestamp = new Date(now - (limit - i) * 30_000).toISOString();
    trades.push({ price, size, timestamp });
  }

  return trades;
}

export class InjectiveService {
  async getMarkets(): Promise<MarketInfo[]> {
    return mockMarkets;
  }

  async getMarketById(id: string): Promise<MarketInfo | null> {
    return mockMarkets.find((market) => market.id === id) ?? null;
  }

  async getOrderbook(marketId: string): Promise<Orderbook> {
    const mid = marketMidPrices[marketId] ?? 10;
    return buildOrderbook(mid);
  }

  async getRecentTrades(marketId: string, limit = 120): Promise<Trade[]> {
    const mid = marketMidPrices[marketId] ?? 10;
    return buildTrades(mid, limit);
  }
}
