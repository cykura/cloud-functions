import axios from "axios";
import { Metadata } from "./types";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp()
const db = admin.firestore();

import { Connection, PublicKey } from "@solana/web3.js";
import { Market, Orderbook } from "@project-serum/serum";

const cors = require('cors')({
  origin: true,
});

exports.addSerumPrices = functions
  .region('asia-south1')
  .pubsub
  .schedule("*/15 * * * *").onRun(async () => {
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


exports.getNFT = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!');
      return;
    }
    cors(req, res, async () => {
      if (!req.query.mint) {
        res.status(200).send({
          "id": "1",
          "name": "Cyclos Golden Ticket",
          "image": "https://cdn.jsdelivr.net/gh/cyclos-io/assets/Liquidity_Ticket_Gif.gif",
          "external_url": "https://www.cyclos.io/",
          "description": "Access ticket for the Cyclos private launch",
          "attributes": [
            {
              "trait_type": "Tier",
              "value": "Legendary"
            }
          ],
          "properties": {
            "files": [
              {
                "uri": "https://cdn.jsdelivr.net/gh/cyclos-io/assets/Liquidity_Ticket_Gif.gif",
                "type": "image/gif"
              }
            ],
            "category": "image",
          },
          "background_color": "FFFFFF"
        });
      } else {
        const query = {
          query: `query getPositionQuery($mint: String!) {
          positions_by_pk(mint: $mint) {
            coin_lots
            market
            mint
            pc_lots
            price_lot_range_div_100
          }
        }`,
          variables: {
            mint: req.query.mint
          }
        };
        try {
          const nftResponse = await axios.post("https://cyclos.me/v1/graphql", query, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const nft = nftResponse.data.data.positions_by_pk;
          res.status(200).send(nft);
        } catch (e) {
          console.log(e);
          res.status(404).send(e);
        }
      }
    })
  });