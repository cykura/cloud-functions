import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp()
const db = admin.firestore();

import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { Market, MARKETS, Orderbook } from "@project-serum/serum";



exports.addPrices = functions
  .pubsub
  .schedule("*/1 * * * *").onRun(async () => {
    const CONNECTION: Connection = new Connection(clusterApiUrl('mainnet-beta'));
    // Serum DEX program ID
    const PROGRAMADDRESS: PublicKey =
      new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

    async function getLatestPrice(
      marketAddress: PublicKey
    ): Promise<number> {
      const market: Market = await Market.load(
        CONNECTION,
        marketAddress, {},
        PROGRAMADDRESS
      );

      // Fetching orderbooks
      const bids: Orderbook = await market.loadBids(CONNECTION);
      const asks: Orderbook = await market.loadAsks(CONNECTION);
      // L2 orderbook data
      const high_bid: number = bids.getL2(1)?.[0]?.[0];
      const low_ask: number = asks.getL2(1)?.[0]?.[0];

      if (high_bid && low_ask) {
        return (high_bid + low_ask) / 2;
      } else {
        throw ("Could not fetch price");
      }
    }

    const time = admin.firestore.Timestamp.now();

    const filteredMarkets = MARKETS.filter((m) =>
      !m.deprecated && m.name.split("/")[1] === "USDC"
    ).splice(0, 5);

    await Promise.all(filteredMarkets.map(async (m) => {
      try {
        const price = await getLatestPrice(m.address);
        console.log(`ADDED: ${m.name} @ ${price},  ${time.toDate()}`);
      } catch (error) {
        console.error(`\nFAILED ${m.name} => ${error}\n`);
        throw error;
      }
    }));
    return "success";
  });
