import { base64 } from "@firebase/util"
import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import * as SPLToken from '@solana/spl-token'
import { Keypair } from "@solana/web3.js"
import axios from "axios"
import * as admin from "firebase-admin"
import * as functions from "firebase-functions"
import { getBeforeNtimeTxs } from "./utils/analytics"
import idl from "./utils/idl.json"
import { generateSVG, getCircleCoord, getParams, scale, tokenToColorHex } from "./utils/svg"
admin.initializeApp()
const db = admin.firestore()


const cors = require('cors')({
  origin: true,
})

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
const connection = new web3.Connection('https://solana-api.projectserum.com')
const provider = new anchor.Provider(connection, wallet, {})
const cyclosCore = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider)


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
    timeoutSeconds: 540,
    memory: "8GB",
  })
  .region('asia-south1')
  .pubsub
  .schedule("*/1 * * * *")
  .onRun(async () => {
    try {
      let latestTxn = (await db.collection("stats-cache").doc("latest").get()).data().latestTxn || ""
      const lastHrTx = await getBeforeNtimeTxs(latestTxn)
      functions.logger.log("no. of txns till ", latestTxn, " : ", lastHrTx.length)
      for (const txHash of lastHrTx) {
        // console.log(txHash)
        let docSnap = await db.collection("swap-logs").doc(txHash).get()
        // console.log("exists: ", docSnap.exists)
        if (docSnap.exists) { continue }
        try {
          let decodedEvents: any = []
          const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txHash}`)).data
          // console.log('detailedInfo', new Date(detailedInfo.blockTime * 1000))
          detailedInfo?.logMessage?.forEach((log: any) => {
            let decodedMessage = null
            if (log.slice(0, 13) === "Program data:") {
              decodedMessage = cyclosCore.coder.events.decode(log.slice(14))
            }
            if (log.slice(0, 12) === "Program log:") {
              decodedMessage = cyclosCore.coder.events.decode(log.slice(13))
            }
            if (decodedMessage !== null && decodedMessage?.name === "SwapEvent") {
              decodedEvents.push({
                name: decodedMessage?.name,
                poolState: decodedMessage?.data.poolState.toString()
              })
            }
          })
          // console.log('decodedEvents', decodedEvents)
          const poolState = []
          for (const decodedEvent of decodedEvents) {
            poolState.push(decodedEvent.poolState)
          }
          // console.log('poolState', poolState)
          if (poolState.length !== 0) {
            await db.collection("swap-logs").doc(txHash).set({
              blockTime: detailedInfo.blockTime,
              logMessage: detailedInfo.logMessage,
              txHash: detailedInfo.txHash,
              status: detailedInfo.status,
              signer: detailedInfo.signer,
              tokenBalanes: detailedInfo.tokenBalanes,
              poolState,
            }, { merge: true })
          }
        } catch (err) {
          functions.logger.error("❌", txHash)
          await db.collection("indexer-fails").doc(txHash).set({
            error: err.message
          }, { merge: true })
          continue
        }
      }
      await db.collection("stats-cache").doc("latest").set({
        latestTxn: lastHrTx[0] ?? latestTxn,
      }, { merge: true })
      functions.logger.log("db write done 💾")
    } catch (err) {
      functions.logger.error("Error : ❌", err)
    }
    return
  })

exports.statsCache = functions
  .runWith({
    // Ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 540,
    memory: "8GB",
  })
  .region('asia-south1')
  .pubsub
  .schedule("*/10 * * * *")
  .onRun(async () => {
    let last24hrVolume = 0
    let TVL = 0
    const volumePerPool = {}
    const volumePerToken = {}
    const analyticsRef = db.collection("swap-logs")
    try {
      const last24hrsTxns = await analyticsRef
        .where("blockTime", ">", (new Date().getTime() - 86400_000) / 1000)
        // .where("blockTime", "<=", (new Date().getTime() - 86400_000 / 2) / 1000)
        .get()

      const poolStates: any = await cyclosCore.account.poolState.all()
      const tokenTVL: any = {}
      const poolDetails: any = {}
      const tokenDetails: any = {}

      for (const pool of poolStates) {
        const { token0, token1 } = pool.account

        const ata0 = await SPLToken.Token.getAssociatedTokenAddress(
          SPLToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          SPLToken.TOKEN_PROGRAM_ID,
          token0,
          pool.publicKey,
          true
        )
        const ata1 = await SPLToken.Token.getAssociatedTokenAddress(
          SPLToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          SPLToken.TOKEN_PROGRAM_ID,
          token1,
          pool.publicKey,
          true
        )

        const ata0Info = await connection.getTokenAccountBalance(ata0)
        const ata1Info = await connection.getTokenAccountBalance(ata1)

        const poolAddress = pool.publicKey.toString()

        poolDetails[poolAddress] = {
          fee: pool.account.fee,
          tick: pool.account.tick,
          tickSpacing: pool.account.tickSpacing,
          token0: pool.account.token0.toString(),
          token1: pool.account.token1.toString(),
          liqudity: pool.account.liquidity.toString(),
          sqrtPriceX32: pool.account.sqrtPriceX32.toString(),
          feeGrowthGlobal0X32: pool.account.feeGrowthGlobal0X32.toString(),
          feeGrowthGlobal1X32: pool.account.feeGrowthGlobal1X32.toString(),
          protocolFeesToken0: pool.account.protocolFeesToken0.toString(),
          protocolFeesToken1: pool.account.protocolFeesToken1.toString(),
          token0amount: ata0Info.value.uiAmount,
          token1amount: ata1Info.value.uiAmount,
        }

        tokenTVL[token0] = tokenTVL[token0] ? tokenTVL[token0] + ata0Info.value.uiAmount : ata0Info.value.uiAmount
        tokenTVL[token1] = tokenTVL[token1] ? tokenTVL[token1] + ata1Info.value.uiAmount : ata1Info.value.uiAmount
      }

      const coingekoEndpointArray = []

      for (const token of Object.keys(tokenTVL)) {
        try {
          const tokenMeta = await (await axios.get(`https://public-api.solscan.io/token/meta?tokenAddress=${token}`))?.data
          tokenDetails[token] = {
            symbol: tokenMeta.symbol,
            name: tokenMeta.name,
            icon: tokenMeta.icon,
            decimals: tokenMeta.decimals,
            coingeckoId: tokenMeta.coingeckoId ? tokenMeta.coingeckoId : null,
            tvl: tokenTVL[token],
          }
          coingekoEndpointArray.push(tokenMeta.coingeckoId)
        } catch (err) {
          functions.logger.error(err)
        }
      }

      const coingeckoData = await (await axios.get(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${coingekoEndpointArray.join("%2C")}`)).data

      for (const token of Object.keys(tokenDetails)) {
        const priceinUSD = coingeckoData[tokenDetails[token].coingeckoId]?.usd ?? 0
        const tvlinUSD = tokenDetails[token].tvl * priceinUSD
        tokenDetails[token] = {
          ...tokenDetails[token],
          priceinUSD,
          tvlinUSD,
        }
        TVL += tvlinUSD
      }

      for (const pool of Object.keys(poolDetails)) {
        const data = poolDetails[pool]
        poolDetails[pool] = {
          ...data,
          tvlinUSD: data.token0amount * (tokenDetails?.[data.token0.toString()]?.priceinUSD ?? 0)
            + data.token1amount * (tokenDetails?.[data.token1.toString()]?.priceinUSD ?? 0)
        }
      }

      last24hrsTxns.forEach(async doc => {
        const txData = doc.data()
        let poolAddresses = txData.poolState
        if (typeof txData.poolState === "string") {
          poolAddresses = [txData.poolState]
        }
        let tradeValue = 0
        for (const tkn of txData.tokenBalanes) {
          if (!tokenDetails[tkn?.token?.tokenAddress]?.priceinUSD) { continue }
          const balanceChange = tkn?.amount?.preAmount - tkn?.amount?.postAmount
          const balanceInUSD = Math.abs(
            (balanceChange / Math.pow(10, tkn?.token?.decimals ?? 0))
            * +tokenDetails[tkn?.token?.tokenAddress]?.priceinUSD
          ) || 0
          // dont consider any dust value
          if (balanceInUSD >= 0.1) {
            tradeValue = balanceInUSD
            break
          }
        }

        for (const poolAddress of poolAddresses) {
          const poolInfo: any = poolDetails[poolAddress]
          if (poolInfo) {
            const token0 = poolInfo.token0.toString()
            const token1 = poolInfo.token1.toString()
            volumePerToken[token0] = volumePerToken[token0] ?
              volumePerToken[token0] + tradeValue : tradeValue

            volumePerToken[token1] = volumePerToken[token1] ?
              volumePerToken[token1] + tradeValue : tradeValue
          }
          volumePerPool[poolAddress] = volumePerPool[poolAddress] ? volumePerPool[poolAddress] + tradeValue : tradeValue
          last24hrVolume += tradeValue
        }
        if (tradeValue > (txData?.tradeValue || 0)) {
          await db.collection("swap-logs").doc(txData.txHash).set({
            tradeValue
          }, { merge: true })
        }
      })
      await db.collection("stats-cache").doc("latest").set({
        last24hrVolume, volumePerPool, volumePerToken, poolDetails, tokenDetails, TVL
      }, { merge: true })
      functions.logger.log("DONE ✅")
    } catch (err) {
      functions.logger.error("Error : ❌", err)
    }
  })

exports.cumulativeVolume = functions
  .runWith({
    // Ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 500,
    // memory: "1GB",
  })
  .region('asia-south1')
  .pubsub
  .schedule("*/30 * * * *")
  .onRun(async () => {
    try {
      let allTimeVolume = (await db.collection("stats-cache").doc("latest").get()).data().allTimeVolume
      let CVlastUpdated = (await db.collection("stats-cache").doc("latest").get()).data().CVlastUpdated
      const data = await db.collection("swap-logs")
        .where("blockTime", ">", CVlastUpdated)
        .get()
      data.forEach(doc => {
        allTimeVolume += doc.data().tradeValue || 0
        CVlastUpdated = (doc.data().blockTime > CVlastUpdated) ? doc.data().blockTime : CVlastUpdated
      })
      await db.collection("stats-cache").doc("latest").set({
        allTimeVolume, CVlastUpdated
      }, { merge: true })
    } catch (err) {
      functions.logger.error(err)
    }
  })

exports.indexerFailsReRuns = functions
  .runWith({
    // Ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 540,
    // memory: "1GB",
  })
  .region('asia-south1')
  .pubsub
  .schedule("*/10 * * * *")
  .onRun(async () => {
    try {
      const failedTxns = await db.collection("indexer-fails").get()
      for (const doc of failedTxns.docs) {
        try {
          const txHash = doc.id
          let docSnap = await db.collection("swap-logs").doc(txHash).get()
          // console.log("exists: ", docSnap.exists)
          if (docSnap.exists) {
            db.collection("indexer-fails").doc(txHash).delete().then(() => {
              console.log("Document successfully deleted!", txHash)
            }).catch((error) => {
              console.error("Error removing document: ", error)
            })
            continue;
          }
          let decodedEvents: any = []
          const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txHash}`)).data
          // console.log('detailedInfo', new Date(detailedInfo.blockTime * 1000))
          detailedInfo?.logMessage?.forEach((log: any) => {
            let decodedMessage = null
            if (log.slice(0, 13) === "Program data:") {
              decodedMessage = cyclosCore.coder.events.decode(log.slice(14))
            }
            if (log.slice(0, 12) === "Program log:") {
              decodedMessage = cyclosCore.coder.events.decode(log.slice(13))
            }
            if (decodedMessage !== null && decodedMessage?.name === "SwapEvent") {
              decodedEvents.push({
                name: decodedMessage?.name,
                poolState: decodedMessage?.data.poolState.toString()
              })
            }
          })
          // console.log('decodedEvents', decodedEvents)
          const poolState = []
          for (const decodedEvent of decodedEvents) {
            if (decodedEvent?.name === "SwapEvent") {
              poolState.push(decodedEvent.poolState)
            }
          }
          // console.log('poolState', poolState)
          if (poolState.length !== 0) {
            await db.collection("swap-logs").doc(txHash).set({
              blockTime: detailedInfo.blockTime,
              logMessage: detailedInfo.logMessage,
              txHash: detailedInfo.txHash,
              status: detailedInfo.status,
              signer: detailedInfo.signer,
              tokenBalanes: detailedInfo.tokenBalanes,
              poolState,
            }, { merge: true })
          }
          // console.log(txHash)
        } catch (err) {
          console.log(err.message, err.response?.data)
        }
      }
    } catch (err) {
      functions.logger.error(err.message)
    }
  })

exports.stats = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      try {
        const analyticsRef = db.collection("stats-cache")
        const docs = await analyticsRef.doc("latest").get()
        const data = docs.data()
        res.status(200).send(data)
      } catch (err) {
        functions.logger.error("Error : ❌", err)
        res.status(200).send("Something went wrong")
      }
      return
    })
  })

exports.pools = functions
  .region('asia-south1')
  .https.onRequest((req, res) => {
    if (req.method !== 'GET') {
      res.status(403).send('Forbidden!')
      return
    }
    cors(req, res, async () => {
      try {
        const blacklistedPools = ["85SZLB3yBzBo49AhAHzFjFikH2QN8KuUSD6bjH4X6EDb"]
        const poolStates: any = await cyclosCore.account.poolState.all()
        const data = poolStates.reduce((result: any, pool: any) => {
          if (!blacklistedPools.includes(pool.publicKey.toString())) {
            result.push(
              {
                poolAddress: pool.publicKey.toString(),
                fee: pool.account.fee,
                token0: pool.account.token0.toString(),
                token1: pool.account.token1.toString()
              }
            )
          }
          return result
        }, [])
        res.status(200).send(data)
      } catch (err) {
        functions.logger.error("Error : ❌", err)
        res.status(200).send("Something went wrong")
      }
      return
    })
  })