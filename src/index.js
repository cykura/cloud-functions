import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { Market, MARKETS, Orderbook } from '@project-serum/serum';
import axios from "axios";


const CONNECTION = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/");
// Serum DEX program ID
const PROGRAMADDRESS = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");


async function getLatestPrice(marketAddress) {
  let market = await Market.load(CONNECTION, marketAddress, {}, PROGRAMADDRESS);

  // Fetching orderbooks
  let bids = await market.loadBids(CONNECTION);
  let asks = await market.loadAsks(CONNECTION);
  // L2 orderbook data
  let high_bid = bids.getL2(1)?.[0]?.[0];
  let low_ask = asks.getL2(1)?.[0]?.[0];

  if (high_bid && low_ask) {
    return (high_bid + low_ask) / 2;
  } else {
    throw ('Could not fetch price');
  }
}

async function getMarkets() {
  const mrkt = await (await axios.get("https://cdn.jsdelivr.net/gh/solana-labs/token-list/src/tokens/solana.tokenlist.json")).data;
  return mrkt.tokens.filter((f) => f.extensions?.serumV3Usdc);
}


getMarkets().then(console.log);

(async () => {
  const time = new Date().toISOString();
  const MARKETS = await getMarkets();
  console.log(MARKETS.length);
  MARKETS
    .map(async (m) => {
      try {
        const price = await getLatestPrice(new PublicKey(m.extensions?.serumV3Usdc));
        // Inserting prices
        console.log(`ADDED: ${m.name} @ ${price}`);
      } catch (error) {
        console.error(`\nFAILED ${m.name} => ${error}\n`);
      }
    });
  return "success";
})();