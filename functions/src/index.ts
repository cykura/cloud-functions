import * as functions from "firebase-functions";


exports.addPrices = functions.pubsub.schedule('every 5 seconds').onRun((context) => {
  console.log('This will be run every 5 seconds!');
  return null;
});
