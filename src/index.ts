import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { Market, MARKETS, Orderbook } from '@project-serum/serum';

const CONNECTION: Connection = new Connection(clusterApiUrl('mainnet-beta'));
// Serum DEX program ID
const PROGRAMADDRESS: PublicKey = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");


async function getLatestPrice(marketAddress: PublicKey): Promise<number> {
  let market: Market = await Market.load(CONNECTION, marketAddress, {}, PROGRAMADDRESS);

  // Fetching orderbooks
  let bids: Orderbook = await market.loadBids(CONNECTION);
  let asks: Orderbook = await market.loadAsks(CONNECTION);
  // L2 orderbook data
  let high_bid: number = bids.getL2(1)?.[0]?.[0];
  let low_ask: number = asks.getL2(1)?.[0]?.[0];

  if (high_bid && low_ask) {
    return (high_bid + low_ask) / 2;
  } else {
    throw ('Could not fetch price');
  }
}

(async () => {
  const time = new Date().toISOString();
  MARKETS
    .filter(m => !m.deprecated && m.name.split("/")[1] === "USDC")
    .map(async (m) => {
      try {
        const price = await getLatestPrice(m.address);
        // Inserting prices

        console.log(`ADDED: ${m.name} @ ${price}`);
      } catch (error) {
        console.error(`\nFAILED ${m.name} => ${error}\n`);
      }
    });
  return "success";
})();