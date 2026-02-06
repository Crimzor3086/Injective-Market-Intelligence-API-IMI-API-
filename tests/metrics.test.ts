import { describe, it, expect } from 'vitest';
import { computeSpreadBps, computeRealizedVol } from '../src/services/metrics.service';
import type { Orderbook } from '../src/types/market';

describe('metrics', () => {
  it('computes spread in bps', () => {
    const orderbook: Orderbook = {
      bids: [[100, 5]],
      asks: [[101, 5]]
    };

    const spread = computeSpreadBps(orderbook);
    expect(spread).toBeCloseTo(99.5, 1);
  });

  it('realized volatility is zero for flat prices', () => {
    const prices = [100, 100, 100, 100];
    const realized = computeRealizedVol(prices);
    expect(realized).toBe(0);
  });
});
