import { Connection, PublicKey } from "@solana/web3.js"
import axios from "axios"

// const CONNECTION = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/")
const PROGRAMADDRESS = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8"

const getFirstNtxs = async (limit: number, beforeHash: string) => {
  const txList = await (await axios.get(`https://public-api.solscan.io/account/transactions?account=${PROGRAMADDRESS}&beforeHash=${beforeHash}&limit=${limit}`)).data
  return txList
}

const getBeforeNtimeTxs = async (milliseconds: number) => {
  let beforeHash = ""
  let nxtPage = true
  const currentTime = new Date().getTime()
  let lastDayHashList: any = []
  const LIMIT = 5
  let txList = await getFirstNtxs(LIMIT, "")
  while (nxtPage) {
    if (beforeHash) {
      txList = await getFirstNtxs(LIMIT, beforeHash);
    }
    beforeHash = ''
    for (const [idx, txObj] of txList.entries()) {
      const blockTime = txObj.blockTime * 1000
      if (idx === LIMIT - 1) {
        beforeHash = txObj.txHash
      }
      if ((currentTime - blockTime) <= milliseconds) {
        lastDayHashList.push(txObj)
      } else {
        nxtPage = false
      }
    }
  }
  return lastDayHashList
}

(async () => {
  try {
    const tx24hrs = await getBeforeNtimeTxs(86400_000 * 2) //24 hours * 2 days
    console.log(tx24hrs.length)
    
    tx24hrs.forEach(async (txObj: any) => {
      const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txObj.txHash}`)).data
      console.log(detailedInfo.tokenBalanes); // NOTE : tokenBalanes (typo in api) !
    })
  } catch (err) {
    console.log('Error', err)
  }
})()
