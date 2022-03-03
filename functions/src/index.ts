import axios from "axios"
import { tokenToColorHex, scale, getCircleCoord, generateSVG, getParams } from "./utils/svg"
import { base64 } from "@firebase/util"
import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
admin.initializeApp()
const db = admin.firestore()

import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { Market, Orderbook } from "@project-serum/serum"
import { BN } from "@project-serum/anchor"
import { getBeforeNtimeTxs } from "./utils/analytics"
import * as anchor from '@project-serum/anchor'
import { Program, web3 } from '@project-serum/anchor'
import idl from "./utils/idl.json"

const cors = require('cors')({
  origin: true,
})

const CONNECTION: Connection = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/")
// Serum DEX program ID
const PROGRAMADDRESS: PublicKey =
  new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")

const PROGRAM_ID = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8"

const keypair = Keypair.fromSecretKey(
  Uint8Array.from([
    252, 26, 11, 109, 164, 158, 158, 132, 63, 237, 103, 133, 199, 61, 192,
    224, 190, 12, 205, 115, 133, 30, 76, 120, 93, 68, 115, 238, 88, 133, 142,
    240, 228, 84, 108, 18, 194, 149, 219, 241, 174, 188, 83, 138, 11, 218, 68,
    31, 8, 90, 186, 27, 102, 127, 153, 30, 154, 9, 66, 71, 177, 154, 242, 255,
  ])
)

const wallet = new anchor.Wallet(keypair)
const connection = new web3.Connection('https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/')
const provider = new anchor.Provider(connection, wallet, {})
const cyclosCore = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider)

exports.addSerumPrices1 = functions
  .region('asia-south1')
  .pubsub
  .schedule("*/15 * * * *").onRun(async () => {

    async function getMarkets() {
      try {
        let mrktResp: any = await axios.get("https://cdn.jsdelivr.net/gh/solana-labs/token-list/src/tokens/solana.tokenlist.json")
        let mrktData: any = await mrktResp.data
        return mrktData.tokens.filter((f: any) => f.extensions?.serumV3Usdc || f.extensions?.serumV3Usdt)
      } catch (err) {
        console.log(err)
        return []
      }
    }


    async function getLatestPrice(
      marketAddress: PublicKey
    ): Promise<number> {
      const market: Market = await Market.load(
        CONNECTION,
        marketAddress, {},
        PROGRAMADDRESS
      )

      // Fetching orderbooks
      const bids: Orderbook = await market.loadBids(CONNECTION)
      const asks: Orderbook = await market.loadAsks(CONNECTION)
      // L2 orderbook data
      const high_bid: number = bids.getL2(1)?.[0]?.[0]
      const low_ask: number = asks.getL2(1)?.[0]?.[0]

      if (high_bid && low_ask) {
        return (high_bid + low_ask) / 2
      } else {
        throw ("Could not fetch price")
      }
    }

    const time = admin.firestore.Timestamp.now()

    const filteredMarkets = await getMarkets()

    await Promise.all(filteredMarkets.map(async (m: any) => {
      try {
        const price = await getLatestPrice(new PublicKey(m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt))
        db.collection("serum-prices-1").doc(m.symbol).set({
          address: m.extensions?.serumV3Usdc ?? m.extensions?.serumV3Usdt,
          prices: admin.firestore.FieldValue.arrayUnion({ price, time }),
        }, { merge: true })
        console.log(`ADDED: ${m.symbol} @ ${price},  ${time.toDate()}`)
      } catch (error) {
        console.error(`\nFAILED ${m.symbol} => ${error}\n`)
      }
    }))
    return
  })

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
          name: "Cykura Positions NFT-V1",
          symbol: "CYS-POS",
          image: `data:image/svg+xml;base64,${base64.encodeString(SVG)}`,
          external_url: "https://cykura.io/",
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
  })

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
  })

exports.logTxs = functions
  .runWith({
    // Ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 500,
    // memory: "1GB",
  })
  .region('asia-south1')
  .pubsub
  .schedule("every 2 hours synchronized")
  .onRun(async () => {
    try {
      // const tokenPrices = await (await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=solana%2Ccyclos%2Ctether%2Cusd-coin&vs_currencies=usd`)).data
      // const lastHrTx = await getBeforeNtimeTxs(30 * 60 * 1000)
      const lastHrTx = await getBeforeNtimeTxs(86400_000)
      for (const txObj of lastHrTx) {
        try {
          const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txObj.txHash}`)).data
          const encodedEvent = (detailedInfo?.logMessage?.[detailedInfo?.logMessage?.length - 3]).slice(13)
          const decodedEvent: any = cyclosCore.coder.events.decode(encodedEvent)
          if (decodedEvent?.name === "SwapEvent") {
            const firstToken = detailedInfo.tokenBalanes[0] // NOTE : tokenBalanes (typo in api) !
            let tokenPrice = 0
            if (firstToken) {
              try {
                tokenPrice = await (await axios.get(`https://public-api.solscan.io/market/token/${firstToken?.token?.tokenAddress}`)).data?.priceUsdt ?? 0
              } catch (err) {
                console.log("Cant fetch token price", err)
              }
              const balanceChange = firstToken.amount.preAmount - firstToken.amount.postAmount
              const tokenChange = {
                change: balanceChange,
                decimals: firstToken?.token?.decimals
              }
              const valueInUSD = Math.abs((tokenChange.change / Math.pow(10, tokenChange.decimals)) * +tokenPrice)
              db.collection("swap-logs").doc(txObj.txHash).set({
                ...detailedInfo,
                poolState: decodedEvent.data.poolState.toString(),
                tradeValue: valueInUSD
              }, { merge: true })
            }
          }
        } catch (err) {
          continue
        }
      }
    } catch (err) {
      console.log('Error', err)
    }
    return
  })

exports.stats = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      let last24hrVolume = 0
      const volumePerPool = {}
      const analyticsRef = db.collection("swap-logs")
      try {
        let lastNsec = 86400_000
        let user = null
        if (req.query?.lastNsec) {
          lastNsec = parseInt(req.query.lastNsec as string) * 1000
        }
        if (req.query?.user) {
          user = req.query.user as string
        }
        const docs = user ?
          lastNsec ?
            await analyticsRef
              .where("blockTime", ">", (new Date().getTime() - lastNsec) / 1000)
              .where('signer', 'array-contains-any', [user])
              .get()
            :
            await analyticsRef
              .where('signer', 'array-contains-any', [user])
              .get()
          : lastNsec ?
            await analyticsRef
              .where("blockTime", ">", (new Date().getTime() - lastNsec) / 1000)
              .get()
            :
            await analyticsRef.get()

        docs.forEach(doc => {
          const txData = doc.data()
          const poolAddress = txData.poolState
          volumePerPool[poolAddress] = volumePerPool[poolAddress] ? volumePerPool[poolAddress] + txData.tradeValue : txData.tradeValue
          last24hrVolume += txData.tradeValue
        })
        res.status(200).send({ last24hrVolume, volumePerPool })
      } catch (err) {
        res.status(200).send("Something went wrong")
      }
      return
    })
  })