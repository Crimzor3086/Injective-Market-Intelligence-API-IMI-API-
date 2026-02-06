import { InjectiveService } from '../src/services/injective.service';

async function fetchMarkets() {
  const injectiveService = new InjectiveService();
  const markets = await injectiveService.getMarkets();
  console.log(JSON.stringify(markets, null, 2));
}

fetchMarkets().catch((error) => {
  console.error('Fetch markets failed:', error);
  process.exit(1);
});
