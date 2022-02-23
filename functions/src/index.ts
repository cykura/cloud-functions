import axios from "axios";
import { tokenToColorHex, scale, getCircleCoord,generateSVG, getParams } from "./svg";
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

exports.svg = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      try {
        const mint = req.query.mint as string
        let devnet = Boolean(req.query?.devnet) ?? false
        if (!mint) {
          res.status(200).send("Please provide a mint address")
          return 
        }
        if (req.query?.devnet?.toString()?.toLowerCase() === "false") {
          devnet = false
        }

        const p = await getParams(mint, devnet)
        if (!p) {
          res.status(200).send("Mint address invalid")
          return 
        }
        const tokenId = p.TOKEN_ID
        const quoteToken = p.TOKEN1
        const baseToken = p.TOKEN0
        const obj = {
          quoteToken,
          baseToken,
          poolAddress: p.POOL,
          quoteTokenSymbol: p.TOKEN1SYM,
          baseTokenSymbol: p.TOKEN0SYM,
          feeTier: +p.FEE / 10000,
          tickLower: +p.TICK_LOWER,
          tickUpper: +p.TICK_UPPER,
          tickSpacing: +p.TICK_SPACING,
          overRange: +p.OVER_RANGE,
          tokenId,
          color0: tokenToColorHex(quoteToken, 137),
          color1: tokenToColorHex(baseToken, 137),
          color2: tokenToColorHex(quoteToken, 20),
          color3: tokenToColorHex(baseToken, 20),
          x1: scale(getCircleCoord(quoteToken, 16, tokenId), 0, 255, 16, 274),
          y1: scale(getCircleCoord(baseToken, 16, tokenId), 0, 255, 100, 484),
          x2: scale(getCircleCoord(quoteToken, 32, tokenId), 0, 255, 16, 274),
          y2: scale(getCircleCoord(baseToken, 32, tokenId), 0, 255, 100, 484),
          x3: scale(getCircleCoord(quoteToken, 48, tokenId), 0, 255, 16, 274),
          y3: scale(getCircleCoord(baseToken, 48, tokenId), 0, 255, 100, 484)
        }
        const SVG = generateSVG(obj)

        res.status(200).send(SVG)  
      } catch (err) {
        res.status(200).send("Something went wrong")
      }  
      return  
    })
  });

exports.encodedSvg = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      try {
        const mint = req.query.mint as string
        let devnet = Boolean(req.query?.devnet) ?? false
        if (!mint) {
          res.status(200).send("Please provide a mint address")
          return 
        }
        if (req.query?.devnet?.toString()?.toLowerCase() === "false") {
          devnet = false
        }

        const p = await getParams(mint, devnet)
        if (!p) {
          res.status(200).send("Mint address invalid")
          return 
        }
        const tokenId = p.TOKEN_ID
        const quoteToken = p.TOKEN1
        const baseToken = p.TOKEN0
        const obj = {
          quoteToken,
          baseToken,
          poolAddress: p.POOL,
          quoteTokenSymbol: p.TOKEN1SYM,
          baseTokenSymbol: p.TOKEN0SYM,
          feeTier: +p.FEE / 10000,
          tickLower: +p.TICK_LOWER,
          tickUpper: +p.TICK_UPPER,
          tickSpacing: +p.TICK_SPACING,
          overRange: +p.OVER_RANGE,
          tokenId,
          color0: tokenToColorHex(quoteToken, 137),
          color1: tokenToColorHex(baseToken, 137),
          color2: tokenToColorHex(quoteToken, 20),
          color3: tokenToColorHex(baseToken, 20),
          x1: scale(getCircleCoord(quoteToken, 16, tokenId), 0, 255, 16, 274),
          y1: scale(getCircleCoord(baseToken, 16, tokenId), 0, 255, 100, 484),
          x2: scale(getCircleCoord(quoteToken, 32, tokenId), 0, 255, 16, 274),
          y2: scale(getCircleCoord(baseToken, 32, tokenId), 0, 255, 100, 484),
          x3: scale(getCircleCoord(quoteToken, 48, tokenId), 0, 255, 16, 274),
          y3: scale(getCircleCoord(baseToken, 48, tokenId), 0, 255, 100, 484)
        }
        const SVG = generateSVG(obj)

        res.status(200).send(`data:image/svg+xml;base64,${base64.encodeString(SVG)}`)  
      } catch (err) {
        res.status(200).send("Something went wrong")
      }  
      return  
    })
  });


exports.nft = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      try {
        const mint = req.query.mint as string
        let devnet = Boolean(req.query?.devnet) ?? false
        if (!mint) {
          res.status(200).send("Please provide a mint address")
          return 
        }
        if (req.query?.devnet?.toString()?.toLowerCase() === "false") {
          devnet = false
        }
        const p = await getParams(mint, devnet)
        if (!p) {
          res.status(200).send("Mint address invalid")
          return 
        }
        const tokenId = p.TOKEN_ID
        const quoteToken = p.TOKEN1
        const baseToken = p.TOKEN0
        const obj = {
          quoteToken,
          baseToken,
          poolAddress: p.POOL,
          quoteTokenSymbol: p.TOKEN1SYM,
          baseTokenSymbol: p.TOKEN0SYM,
          feeTier: +p.FEE / 10000,
          tickLower: +p.TICK_LOWER,
          tickUpper: +p.TICK_UPPER,
          tickSpacing: +p.TICK_SPACING,
          overRange: +p.OVER_RANGE,
          tokenId,
          color0: tokenToColorHex(quoteToken, 137),
          color1: tokenToColorHex(baseToken, 137),
          color2: tokenToColorHex(quoteToken, 20),
          color3: tokenToColorHex(baseToken, 20),
          x1: scale(getCircleCoord(quoteToken, 16, tokenId), 0, 255, 16, 274),
          y1: scale(getCircleCoord(baseToken, 16, tokenId), 0, 255, 100, 484),
          x2: scale(getCircleCoord(quoteToken, 32, tokenId), 0, 255, 16, 274),
          y2: scale(getCircleCoord(baseToken, 32, tokenId), 0, 255, 100, 484),
          x3: scale(getCircleCoord(quoteToken, 48, tokenId), 0, 255, 16, 274),
          y3: scale(getCircleCoord(baseToken, 48, tokenId), 0, 255, 100, 484)
        }
        const SVG = generateSVG(obj)
        const metaData = {
          name: "Cyclos Positions NFT-V1",
          symbol: "CYS-POS",
          image: `data:image/svg+xml;base64,${base64.encodeString(SVG)}`,
          external_url: "https://www.cyclos.io/",
          description: "NFT ticket representing your Liquidity Position",
          properties: {
            files: [
              {
                uri: `https://asia-south1-cyclos-finance.cloudfunctions.net/svg?mint=${mint}&devnet=${devnet}`,
                type: "image/svg+xml"
              }
            ],
            category: "html",
          },
          attributes: [
            {
              "trait_type": "Fee Tier",
              "value": p.FEE
            },
            {
              "trait_type": "Base Token",
              "value": p.TOKEN0SYM
           },
           {
              "trait_type": "Quote Token",
              "value": p.TOKEN1SYM
            },
            {
              "trait_type": "Tick Lower",
              "value": p.TICK_LOWER
           },
           {
              "trait_type": "Tick Upper",
              "value": p.TICK_UPPER
            }
          ]
        }
        res.status(200).send(metaData) 
      } catch (err) {
        res.status(200).send("Something went wrong")
      }  
      return  
    })
  });

// exports.getLocalSVG = functions
//   .region('asia-south1')
//   .https.onRequest((req, res) => {
//     if (req.method !== 'GET') {
//       res.status(403).send('Forbidden!')
//       return
//     }
//     cors(req, res, async () => {
//       const Q = req.query
//       try {
//         const mint = Q.mint as string
//         const quoteToken = Q.qt as string
//         const baseToken = Q.bt as string
//         const quoteTokenSymbol = Q.qts as string
//         const baseTokenSymbol = Q.bts as string
//         const poolAddress = Q.pa as string
//         const feeTier = Q.ft as string
//         const tickLower = Q.tl as string
//         const tickUpper = Q.tu as string
//         const tickSpacing = Q.ts as string
//         const overRange = Q.or as string

//         const params = {
//           quoteToken,
//           baseToken,
//           poolAddress,
//           quoteTokenSymbol,
//           baseTokenSymbol,
//           feeTier: +feeTier,
//           tickLower: +tickLower, 
//           tickUpper: +tickUpper,
//           tickSpacing: +tickSpacing,
//           overRange: +overRange,
//           tokenId: mint,
//           color0: tokenToColorHex(quoteToken, 137),
//           color1: tokenToColorHex(baseToken, 137),
//           color2: tokenToColorHex(quoteToken, 20),
//           color3: tokenToColorHex(baseToken, 20),
//           x1: scale(getCircleCoord(quoteToken, 16, mint), 0, 255, 16, 274),
//           y1: scale(getCircleCoord(baseToken, 16, mint), 0, 255, 100, 484),
//           x2: scale(getCircleCoord(quoteToken, 32, mint), 0, 255, 16, 274),
//           y2: scale(getCircleCoord(baseToken, 32, mint), 0, 255, 100, 484),
//           x3: scale(getCircleCoord(quoteToken, 48, mint), 0, 255, 16, 274),
//           y3: scale(getCircleCoord(baseToken, 48, mint), 0, 255, 100, 484)
//         }

//         const SVG = generateSVG(params)

//         res.status(200).send(`data:image/svg+xml;base64,${base64.encodeString(SVG)}`)  
//       } catch (err) {
//         res.status(404).send("");
//       }   
//     })
//   });