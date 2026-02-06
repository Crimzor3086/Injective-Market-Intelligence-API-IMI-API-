import { InjectiveService } from '../src/services/injective.service';
import {
  computeActivityMetrics,
  computeHealthMetrics,
  computeLiquidityMetrics,
  computeVolatilityMetrics
} from '../src/services/metrics.service';

async function warmCache() {
  const injectiveService = new InjectiveService();
  const markets = await injectiveService.getMarkets();

  for (const market of markets) {
    const [orderbook, trades] = await Promise.all([
      injectiveService.getOrderbook(market.id),
      injectiveService.getRecentTrades(market.id, 120)
    ]);

    const liquidity = computeLiquidityMetrics(orderbook, trades);
    const volatility = computeVolatilityMetrics(trades);
    const activity = computeActivityMetrics(trades);
    const health = computeHealthMetrics(liquidity, volatility, activity);

    console.log(
      `Warmed ${market.symbol}: health=${health.score}, liquidity=${liquidity.score}, activity=${activity.score}`
    );
  }
}

warmCache().catch((error) => {
  console.error('Warm cache failed:', error);
  process.exit(1);
});
