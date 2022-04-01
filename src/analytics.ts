import { Connection, PublicKey } from "@solana/web3.js"
import axios from "axios"

// const CONNECTION = new Connection("https://ssc-dao.genesysgo.net")
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
  const LIMIT = 10
  let txList = await getFirstNtxs(LIMIT, "")
  while (nxtPage) {
    if (beforeHash) {
      txList = await getFirstNtxs(LIMIT, beforeHash)
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
  let volume = 0
  try {
    const tx24hrs = await getBeforeNtimeTxs(86400_000) //24 hours * 2 days
    for (const txObj of tx24hrs) {
      const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txObj.txHash}`)).data
      console.log(detailedInfo)
      // if (detailedInfo?.logMessage?.[3] !== "Program log: in swap") {
      //   continue
      // }
      // const firstToken = detailedInfo.tokenBalanes[0] // NOTE : tokenBalanes (typo in api) !
      // let tokenPrice = 0
      // if (firstToken) {
      //   tokenPrice = await (await axios.get(`https://public-api.solscan.io/market/token/${firstToken?.token?.tokenAddress}`)).data?.priceUsdt ?? 0
      //   const balanceChange = firstToken.amount.preAmount - firstToken.amount.postAmount
      //   const tokenChange = {
      //     change: balanceChange,
      //     decimals: detailedInfo.tokenBalanes?.[0]?.token?.decimals
      //   }
      //   const valueInUSD = Math.abs((tokenChange.change / Math.pow(10, tokenChange.decimals)) * +tokenPrice)
      //   console.log("VI", valueInUSD);
      //   volume += valueInUSD
      // }
    }
  } catch (err) {
    console.log('Error', err)
  }
  console.log('Total Volume : ', volume)
})()
