import axios from "axios";
import { tokenToColorHex, scale, getCircleCoord,generateSVG } from "./svg";
import { base64 } from "@firebase/util";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp()
const db = admin.firestore();

import { Connection, PublicKey } from "@solana/web3.js";
import { Market, Orderbook } from "@project-serum/serum";
import { BN } from "@project-serum/anchor";

const cors = require('cors')({
  origin: true,
});

const CONNECTION: Connection = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/");
// Serum DEX program ID
const PROGRAMADDRESS: PublicKey =
  new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

const NFT_MetaData = {
  name: "Cyclos Position",
  image: "https://cdn.jsdelivr.net/gh/cyclos-io/assets/Liquidity_Ticket_Gif.gif",
  external_url: "https://www.cyclos.io/",
  description: "NFT ticket representing your Liquidity Position",
  properties: {
    files: [
      {
        uri: "https://cdn.jsdelivr.net/gh/cyclos-io/assets/Liquidity_Ticket_Gif.gif",
        type: "image/gif"
      }
    ],
    category: "image",
  }
}

exports.addSerumPrices1 = functions
  .region('asia-south1')
  .pubsub
  .schedule("*/15 * * * *").onRun(async () => {

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
        db.collection("serum-prices-1").doc(m.symbol).set({
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

exports.getSVG = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      const Q = req.query
      try {
        const mint = Q.mint as string
        const quoteToken = Q.qt as string
        const baseToken = Q.bt as string
        const quoteTokenSymbol = Q.qts as string
        const baseTokenSymbol = Q.bts as string
        const poolAddress = Q.pa as string
        const feeTier = Q.ft as string
        const tickLower = Q.tl as string
        const tickUpper = Q.tu as string
        const tickSpacing = Q.ts as string
        const overRange = Q.or as string

        const params = {
          quoteToken,
          baseToken,
          poolAddress,
          quoteTokenSymbol,
          baseTokenSymbol,
          feeTier,
          tickLower: +tickLower, 
          tickUpper: +tickUpper,
          tickSpacing: +tickSpacing,
          overRange: +overRange,
          tokenId: mint,
          color0: tokenToColorHex(quoteToken, 137),
          color1: tokenToColorHex(baseToken, 137),
          color2: tokenToColorHex(quoteToken, 20),
          color3: tokenToColorHex(baseToken, 20),
          x1: scale(getCircleCoord(quoteToken, 16, mint), 0, 255, 16, 274),
          y1: scale(getCircleCoord(baseToken, 16, mint), 0, 255, 100, 484),
          x2: scale(getCircleCoord(quoteToken, 32, mint), 0, 255, 16, 274),
          y2: scale(getCircleCoord(baseToken, 32, mint), 0, 255, 100, 484),
          x3: scale(getCircleCoord(quoteToken, 48, mint), 0, 255, 16, 274),
          y3: scale(getCircleCoord(baseToken, 48, mint), 0, 255, 100, 484)
        }

        const SVG = generateSVG(params)

        res.status(200).send(`data:image/svg+xml;base64,${base64.encodeString(SVG)}`)  
      } catch (err) {
        res.status(404).send("");
      }   
    })
  });

// exports.addSerumPrices = functions
//   .region('asia-south1')
//   .pubsub
//   .schedule("*/15 * * * *").onRun(async () => {

//     async function getMarkets() {
//       try {
//         let mrktResp: any = await axios.get("https://cdn.jsdelivr.net/gh/solana-labs/token-list/src/tokens/solana.tokenlist.json");
//         let mrktData: any = await mrktResp.data;
//         return mrktData.tokens.filter((f: any) => f.extensions?.serumV3Usdc || f.extensions?.serumV3Usdt);
//       } catch (err) {
//         console.log(err);
//         return [];
//       }
//     }


//     async function getLatestPrice(
//       marketAddress: PublicKey
//     ): Promise<number> {
//       const market: Market = await Market.load(
//         CONNECTION,
//         marketAddress, {},
//         PROGRAMADDRESS
//       );

//       // Fetching orderbooks
//       const bids: Orderbook = await market.loadBids(CONNECTION);
//       const asks: Orderbook = await market.loadAsks(CONNECTION);
//       // L2 orderbook data
//       const high_bid: number = bids.getL2(1)?.[0]?.[0];
//       const low_ask: number = asks.getL2(1)?.[0]?.[0];

//       if (high_bid && low_ask) {
//         return (high_bid + low_ask) / 2;
//       } else {
//         throw ("Could not fetch price");
//       }
//     }

//     const time = admin.firestore.Timestamp.now();

//     const filteredMarkets = await getMarkets();

//     await Promise.all(filteredMarkets.map(async (m: any) => {
//       try {
//         const price = await getLatestPrice(new PublicKey(m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt));
//         db.collection("serum-prices").doc(m.symbol).set({
//           address: m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt,
//           prices: admin.firestore.FieldValue.arrayUnion({ price, time }),
//         }, { merge: true })
//         console.log(`ADDED: ${m.symbol} @ ${price},  ${time.toDate()}`);
//       } catch (error) {
//         console.error(`\nFAILED ${m.symbol} => ${error}\n`);
//       }
//     }));
//     return;
//   });

// exports.getNFT = functions
//   .region('asia-south1')
//   .https.onRequest((req, res) => {
//     if (req.method !== 'GET') {
//       res.status(403).send('Forbidden!');
//       return;
//     }
//     cors(req, res, async () => {
//       if (!req.query.mint) {
//         res.status(200).send(NFT_MetaData);
//       } else {
//         const query = {
//           query: `query getPositionQuery($mint: String!) {
//           positions_by_pk(mint: $mint) {
//             coin_lots
//             market
//             mint
//             pc_lots
//             price_lot_range_div_100
//             liquidity_contributions {
//               is_bid
//               lot_size_in_coin
//               price_lot_div_100
//             }
//           }
//         }`,
//           variables: {
//             mint: req.query.mint
//           }
//         };
//         try {
//           const nftResponse = await axios.post("https://cyclos.me/v1/graphql", query, {
//             headers: {
//               'Content-Type': 'application/json'
//             }
//           });
//           const nft = nftResponse.data.data.positions_by_pk;

//           const marketClient = await Market.load(
//             CONNECTION,
//             new PublicKey(nft.market),
//             {},
//             PROGRAMADDRESS
//           );

//           // for coin
//           const coin = marketClient.baseSizeLotsToNumber(new BN(nft.coin_lots))
//           // for pc
//           const pc = marketClient.quoteSizeLotsToNumber(new BN(nft.pc_lots))

//           const range = nft.price_lot_range_div_100.split(",");
//           const minPrice = marketClient?.priceLotsToNumber(
//             new BN(+range[0]?.slice(1) * 100 ?? 0)
//           );
//           const maxPrice = marketClient?.priceLotsToNumber(
//             new BN(+range[1]?.slice(0, -1) * 100 ?? 0)
//           );

//           const data = {
//             ...NFT_MetaData,
//             attributes: [
//               {
//                 trait_type: "CYS",
//                 value: coin
//               },
//               {
//                 trait_type: "USDC",
//                 value: pc
//               },
//               {
//                 trait_type: "Range",
//                 value: `[${minPrice}, ${maxPrice})`
//               },
//               {
//                 trait_type: "Is Active",
//                 value: `${nft.liquidity_contributions?.length ? "Yes" : "No"}`
//               },
//             ]
//           }
//           res.status(200).send(data);
//         } catch (e) {
//           console.log(e);
//           res.status(200).send(NFT_MetaData);
//         }
//       }
//     })
//   });