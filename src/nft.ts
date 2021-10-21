import express from 'express';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { Metadata } from "./types";


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


app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});