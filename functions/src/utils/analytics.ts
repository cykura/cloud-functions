import { web3 } from '@project-serum/anchor'
import { PublicKey } from "@solana/web3.js"
import axios from "axios"

export const PROGRAMADDRESS = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8"

const connection = new web3.Connection('https://ssc-dao.genesysgo.net')

export const getFirstNtxs = async (limit: number, beforeHash: string) => {
  const txList = await (await axios.get(`https://public-api.solscan.io/account/transactions?account=${PROGRAMADDRESS}&beforeHash=${beforeHash ?? ""}&limit=${limit}`)).data
  return txList
}

export const getTxnsBatch = async (beforeHash: string) => {
  let txList = await getFirstNtxs(50, beforeHash)
  return txList.filter((t: any) => t.status === "Success").map((t: any) => t.txHash)
}

export const getBeforeNtimeTxs = async (lastHash: string) => {
  let txList = await getTxnsBatch("")
  let maxBatch = 20
  while (maxBatch--)
    if (txList.includes(lastHash)) {
      return txList
    } else {
      if (txList.length - 1 >= 0) {
        let secondBatch = await getTxnsBatch(txList[txList.length - 1] ?? "")
        txList = [...txList, ...secondBatch]
      }
    }
  return txList
}

export const getRecentTxns = async (until?: string) => {
  const allTxns = await connection.getConfirmedSignaturesForAddress2(new PublicKey(PROGRAMADDRESS), {
    until: until
  })
  const successTxns = allTxns.filter((tx: any) => tx.err === null)
  return successTxns;
}

export const getTxInfo = async (txHash: string) => {
  const tx = await connection.getTransaction(txHash)
  return tx
}