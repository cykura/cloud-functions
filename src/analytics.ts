import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { Keypair } from "@solana/web3.js"
import axios from "axios"
import { initializeApp } from "firebase/app"
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore"
import idl from "./idl.json"
import { getBeforeNtimeTxs, getFirstNtxs } from "../functions/src/utils/analytics"


const firebaseConfig = {
  apiKey: "AIzaSyBN1Fu7yLJGsVUMAJhOGg2UusenNAledoc",
  authDomain: "cyclos-finance.firebaseapp.com",
  projectId: "cyclos-finance",
  storageBucket: "cyclos-finance.appspot.com",
  messagingSenderId: "709533259346",
  appId: "1:709533259346:web:9fc2cb7b437f9a2e51f18b",
  measurementId: "G-TY69DV6K77",
}


// Initialize Firebase
initializeApp(firebaseConfig)
const db = getFirestore()

// const CONNECTION = new Connection("https://ssc-dao.genesysgo.net")
const PROGRAMADDRESS = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8";

(async () => {
  const wallet = new anchor.Wallet(new Keypair())
  const connection = new web3.Connection('https://ssc-dao.genesysgo.net')
  const provider = new anchor.Provider(connection, wallet, {})
  anchor.setProvider(provider)
  const cyclosCore = new anchor.Program(idl as anchor.Idl, PROGRAMADDRESS, provider)

  let beforeHash = ""
  const LIMIT = 10
  while (true) {
    let txList = []
    try {
      txList = await getFirstNtxs(LIMIT, beforeHash)
    } catch (err) {
      continue
    }
    for (const txObj of txList) {
      const txHash = txObj.txHash
      const docRef = doc(db, "swap-logs", txHash)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) { continue }
      try {
        let decodedEvents: any = []
        const detailedInfo = await (await axios.get(`https://public-api.solscan.io/transaction/${txHash}`)).data
        if (detailedInfo.status === "Fail") { continue }
        for (const log of detailedInfo?.logMessage) {
          let decodedMessage = null
          if (log.slice(0, 13) === "Program data:") {
            decodedMessage = cyclosCore.coder.events.decode(log.slice(14))
          }
          if (log.slice(0, 12) === "Program log:") {
            decodedMessage = cyclosCore.coder.events.decode(log.slice(13))
          }
          if (decodedMessage !== null) {
            decodedEvents.push(decodedMessage)
          }
        }
        const poolState = []
        for (const decodedEvent of decodedEvents) {
          if (decodedEvent?.name === "SwapEvent") {
            poolState.push(decodedEvent.data.poolState.toString())
          }
        }
        if (poolState.length !== 0) {
          await setDoc(doc(db, "swap-logs", txHash), {
            blockTime: detailedInfo.blockTime,
            logMessage: detailedInfo.logMessage,
            txHash: detailedInfo.txHash,
            status: detailedInfo.status,
            signer: detailedInfo.signer,
            tokenBalanes: detailedInfo.tokenBalanes,
            poolState,
          }, { merge: true })
          console.log("✅", txHash)
        }
      } catch (err) {
        continue
      }
    }
    beforeHash = txList[txList.length - 1].txHash
    console.log("💾")
  }
})()