import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { Keypair, PublicKey } from "@solana/web3.js"
import axios from "axios"
import { getRecentTxns, getTxInfo } from "../functions/src/utils/analytics"
import idl from "./idl.json"

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
const connection = new web3.Connection('https://ssc-dao.genesysgo.net')
const provider = new anchor.Provider(connection, wallet, {})
const cyclosCore = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider)


const cronFn = async () => {
  try {
    // read latest logged txn
    const latestReadTxn = undefined
    const lastTxs = await getRecentTxns(latestReadTxn)
    const lastTxsArray = lastTxs.map(txn => txn.signature)
    for (const txHash of lastTxsArray) {
      try {
        let decodedEvents: any = []
        const txInfo = await getTxInfo(txHash);
        if (!txInfo) { throw new Error("txInfo is null") }
        txInfo?.meta?.logMessages?.forEach((log: any) => {
          let decodedMessage = null
          if (log.slice(0, 13) === "Program data:") {
            decodedMessage = cyclosCore.coder.events.decode(log.slice(14))
          }
          if (log.slice(0, 12) === "Program log:") {
            decodedMessage = cyclosCore.coder.events.decode(log.slice(13))
          }
          if (decodedMessage !== null && decodedMessage?.name === "SwapEvent") {
            decodedEvents.push(decodedMessage)
          }
        })
        for (const decodedMessage of decodedEvents) {
          const pool_addr = decodedMessage?.data?.poolState?.toString()
          const amount0 = decodedMessage?.data?.amount0?.toString()
          const amount1 = decodedMessage?.data?.amount1?.toString()
          const tokenAccount0 = decodedMessage?.data?.tokenAccount0?.toString()
          const tokenAccount1 = decodedMessage?.data?.tokenAccount1?.toString()

          const poolState: any = await cyclosCore.account.poolState.fetch(new PublicKey(pool_addr))
          const tk0 = poolState?.token0.toString() ?? null;
          const tk1 = poolState?.token1.toString() ?? null;

          // const tk0Info: any = (await connection.getParsedAccountInfo(new PublicKey(tokenAccount0))).value?.data
          // const tk1Info: any = (await connection.getParsedAccountInfo(new PublicKey(tokenAccount1))).value?.data
          // const tk0Decimals = +tk0Info?.parsed.info.tokenAmount?.decimals ?? 0;
          // const tk1Decimals = +tk1Info?.parsed.info.tokenAmount?.decimals ?? 0;
          // let volume = 0
          // let tk0Price = 0
          // let tk1Price = 0
          // try {
          //   tk0Price = await (await axios.get(`https://public-api.solscan.io/market/token/${tk0}`)).data?.priceUsdt
          //   tk1Price = await (await axios.get(`https://public-api.solscan.io/market/token/${tk1}`)).data?.priceUsdt
          // } catch (err: any) {
          //   console.log(err?.message);
          // }
          // if (tk0Info && tk0Price) {
          //   volume = Math.abs((amount0 / Math.pow(10, tk0Decimals))) * tk0Price
          // } else {
          //   volume = Math.abs((amount1 / Math.pow(10, tk1Decimals))) * tk1Price ?? 0
          // }

          const poolData = {
            amount0,
            amount1,
            pool_addr,
            sender: decodedMessage?.data?.sender?.toString(),
            tokenAccount0,
            tokenAccount1,
            token0: tk0,
            token1: tk1,
            txn_block_time: txInfo.blockTime,
            txn_block_time_local: txInfo.blockTime ? new Date(txInfo.blockTime * 1000).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) : null,
            tx_hash: txHash,
            tx_slot: txInfo.slot,
            volume: 0
          }
          const resp = await axios.post(
            'https://cykura-analytics.hasura.app/v1/graphql',
            {
              query: getAddTxnQuery(poolData)
            }, {
            headers: {
              "Content-Type": "application/json",
              "x-hasura-admin-secret": "iQDakTzEDOal3519hRYZe0QXg4VWxr02ro0wjqx6qsIo068oVlyM7DWynXbR30Yr"
            },
          })
          console.log(resp?.status, resp?.statusText, resp?.data);
        }
      } catch (err: any) {
        console.error(err?.message);
        const resp = await axios.post(
          'https://cykura-analytics.hasura.app/v1/graphql',
          {
            query: getAddFailedTxnQuery(txHash, err?.message)
          }, {
          headers: {
            "Content-Type": "application/json",
            "x-hasura-admin-secret": "iQDakTzEDOal3519hRYZe0QXg4VWxr02ro0wjqx6qsIo068oVlyM7DWynXbR30Yr"
          },
        })
        console.log(resp?.status, resp?.statusText, resp?.data);
        continue
      }
    }
    // add latest logged txn
  } catch (err) {
    console.error("Error : ❌", err)
  }
}

cronFn()
const getAddTxnQuery = (poolData: any) => {
  return `
    mutation MyMutation {
      insert_indexer_one(object: {
        amount0: "${poolData.amount0}", 
        amount1: "${poolData.amount1}",
        pool_addr: "${poolData.pool_addr}",
        sender: "${poolData.sender}",
        token0: "${poolData.token0}",
        token1: "${poolData.token1}",, 
        tokenAccount0: "${poolData.tokenAccount0}",
        tokenAccount1: "${poolData.tokenAccount1}", 
        tx_hash: "${poolData.tx_hash}", 
        tx_slot: "${poolData.tx_slot}",
        txn_block_time: "${poolData.txn_block_time}",
        txn_block_time_local: "${poolData.txn_block_time_local}",
        volume: "${poolData.volume}"
      }) {
        tx_hash
        txn_block_time_local
        volume
      }
    }
  `
}

const getAddFailedTxnQuery = (txHash: any, err: any) => {
  return `
    mutation MyMutation {
      insert_failedTxns_one(object: {
        tx_hash: "${txHash}", 
        err: "${err}"
      }) {
        tx_hash
      }
    }
  `
}