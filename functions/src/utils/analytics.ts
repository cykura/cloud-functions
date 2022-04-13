import axios from "axios"

export const PROGRAMADDRESS = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8"

export const getFirstNtxs = async (limit: number, beforeHash: string) => {
  const txList = await (await axios.get(`https://public-api.solscan.io/account/transactions?account=${PROGRAMADDRESS}&beforeHash=${beforeHash}&limit=${limit}`)).data
  return txList
}

export const getBeforeNtimeTxs = async (milliseconds: number) => {
  let beforeHash = ""
  let nxtPage = true
  const currentTime = new Date().getTime()
  let lastDayHashList: any = []
  const LIMIT = 20
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