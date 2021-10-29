import axios from "axios";
import express from 'express';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { Metadata } from "./types";
import { BN } from "@project-serum/anchor";
import { Market } from "@project-serum/serum";
import { Connection, PublicKey } from "@solana/web3.js";


const firebaseConfig = {
  apiKey: "AIzaSyBN1Fu7yLJGsVUMAJhOGg2UusenNAledoc",
  authDomain: "cyclos-finance.firebaseapp.com",
  projectId: "cyclos-finance",
  storageBucket: "cyclos-finance.appspot.com",
  messagingSenderId: "709533259346",
  appId: "1:709533259346:web:9fc2cb7b437f9a2e51f18b",
  measurementId: "G-TY69DV6K77",
};


// Initialize Firebase
initializeApp(firebaseConfig);
const db = getFirestore();


const app = express();
const PORT = 8000;

app.get('/', async (req, res) => {
  const querySnapshot = await getDocs(collection(db, "nft-example"));
  const nfts: { id: String, data: Metadata }[] = [];
  querySnapshot.forEach((doc) => {
    // doc.data() is never undefined for query doc snapshots
    const id = doc.id;
    const data: Metadata = JSON.parse(doc.data().data);
    nfts.push({ id, data });
  });
  console.log(nfts);

  return res.json(nfts);
});

app.get('/nft', async (req, res) => {
  console.log(req.query.mint);

  if (!req.query.mint) {
    return res.json({ data: null, error: "No mint query found" });
  }

  const query = {
    query: `query getPositionQuery($mint: String!) {
      positions_by_pk(mint: $mint) {
        coin_lots
        market
        mint
        pc_lots
        price_lot_range_div_100
      }
    }`,
    variables: {
      mint: req.query.mint
    }
  };

  const nftResponse = await axios.post("https://cyclos.me/v1/graphql", query, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const nft = nftResponse.data.data.positions_by_pk;
  const CONNECTION: Connection = new Connection("https://dawn-red-log.solana-mainnet.quiknode.pro/ff88020a7deb8e7d855ad7c5125f489ef1e9db71/");

  const marketClient = await Market.load(
    CONNECTION,
    new PublicKey(nft?.market),
    {},
    new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin")
  );

  // for coin
  const coin = marketClient.baseSizeLotsToNumber(new BN(nft.coin_lots))
  // for pc
  const pc = marketClient.quoteSizeLotsToNumber(new BN(nft.pc_lots))

  const range = nft.price_lot_range_div_100.split(",");
  const minPrice = marketClient?.priceLotsToNumber(
    new BN(+range[0]?.slice(1) * 100 ?? 0)
  );
  const maxPrice = marketClient?.priceLotsToNumber(
    new BN(+range[1]?.slice(0, -1) * 100 ?? 0)
  );

  const data = {
    market: nft.market,
    mint: nft.mint,
    coin, pc, minPrice, maxPrice
  }

  return res.json(data);
});


app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});