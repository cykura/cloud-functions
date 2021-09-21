import axios from "axios";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp()
const db = admin.firestore();

import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { Market, MARKETS, Orderbook } from "@project-serum/serum";

exports.addPrices = functions
  .pubsub
  .schedule("*/15 * * * *").onRun(async () => {
    const CONNECTION: Connection = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/");
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
      !m.deprecated && (
        m.name.split("/")[1] === "USDC"
      )
    );

    await Promise.all(filteredMarkets.map(async (m) => {
      try {
        const price = await getLatestPrice(m.address);
        db.collection("serum-price-indexer").doc(m.name.split("/")[0]).set({
          address: m.address.toString(),
          prices: admin.firestore.FieldValue.arrayUnion({ price, time }),
        }, { merge: true })
        console.log(`ADDED: ${m.name} @ ${price},  ${time.toDate()}`);
      } catch (error) {
        console.error(`\nFAILED ${m.name} => ${error}\n`);
      }
    }));
    return;
  });


exports.addSerumPrices = functions
  .pubsub
  .schedule("*/5 * * * *").onRun(async () => {
    const CONNECTION: Connection = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/");
    // Serum DEX program ID
    const PROGRAMADDRESS: PublicKey =
      new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

    async function getMarkets() {
      try {
        let mrktResp: any = await axios.get("https://cdn.jsdelivr.net/gh/solana-labs/token-list/src/tokens/solana.tokenlist.json");
        let mrktData: any = await mrktResp.data;
        return mrktData.tokens.filter((f: any) => f.extensions?.serumV3Usdc || f.extensions?.serumV3Usdt);
      } catch (err) {
        console.log(err);
        return [];
      }
    }


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

    const filteredMarkets = await getMarkets();

    await Promise.all(filteredMarkets.map(async (m: any) => {
      try {
        const price = await getLatestPrice(new PublicKey(m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt));
        db.collection("serum-prices").doc(m.symbol).set({
          address: m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt,
          prices: admin.firestore.FieldValue.arrayUnion({ price, time }),
        }, { merge: true })
        console.log(`ADDED: ${m.symbol} @ ${price},  ${time.toDate()}`);
      } catch (error) {
        console.error(`\nFAILED ${m.symbol} => ${error}\n`);
      }
    }));
    return;
  });
