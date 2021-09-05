import { Connection, PublicKey } from '@solana/web3.js';
import { Market, MARKETS, Orderbook } from '@project-serum/serum';
import { apolloClient, INSERT_PRICES } from "./graphql";

const CONNECTION: Connection = new Connection('https://solana-api.projectserum.com');
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

  const run = async () => {
    MARKETS.filter(
      (m: typeof MARKETS[0]) => !m.deprecated && m.name.split("/")[1] === "USDC"
    ).map(async (m: typeof MARKETS[0]) => {
      try {
        const price = await getLatestPrice(m.address);
        console.log(`${m.name}: ${price}`);
      } catch (error) {
        console.error(`\nFAILED ${m.name} => ${error}\n`);
      }

      // Inserting prices
      await apolloClient.mutate({
        mutation: INSERT_PRICES,
        variables: {
          // Price Undefined
          price: `${price}`,
          time: Date.now(),
          Market_ID: `${m.name}`,
        },
      });
    });
    return "success";
  };
  run();