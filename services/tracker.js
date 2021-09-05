const { Connection, PublicKey } = require("@solana/web3.js")
const { Market, MARKETS } = require("@project-serum/serum")
const { ApolloClient, InMemoryCache, createHttpLink, gql } = require("@apollo/client");
const { fetch } = require('cross-fetch');
require("dotenv").config();

exports.func = async () => {
  const CONNECTION = new Connection('https://solana-api.projectserum.com');
  // Serum DEX program ID
  const PROGRAMADDRESS = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

  const apolloClient = new ApolloClient({
    link: createHttpLink({
      uri: process.env.GRAPHQL_ENDPOINT,
      fetch,
      headers: {
        "x-hasura-admin-secret": process.env.HASURA_SECRET,
      },
    }),
    cache: new InMemoryCache(),
  });

  // Structure of GQL API
  const INSERT_PRICES = gql`
    mutation InsertPrices($price: float8!, $time: timestamptz!, $Market_ID: String!) {
      insert_prices_one(
        object: { price: $price, time: $time, Market_ID: $Market_ID }
      ) {
        price
        time
        Market_ID
      }
    }
  `;

  async function getLatestPrice(marketAddress) {
    let market = await Market.load(CONNECTION, marketAddress, {}, PROGRAMADDRESS);

    // Fetching orderbooks
    let bids = await market.loadBids(CONNECTION);
    let asks = await market.loadAsks(CONNECTION);
    // L2 orderbook data
    let high_bid = bids.getL2(1)?.[0]?.[0];
    let low_ask = asks.getL2(1)?.[0]?.[0];

    if (high_bid && low_ask) {
      return (high_bid + low_ask) / 2;
    } else {
      throw ('Could not fetch price');
    }
  }

  const time = new Date().toISOString();

  const filteredMarkets = MARKETS.filter(m => !m.deprecated && m.name.split("/")[1] === 'USDC')
  
  await Promise.all(filteredMarkets.map(async (m) => {
    try {
      const price = await getLatestPrice(m.address);
      const resp = await apolloClient.mutate({
        mutation: INSERT_PRICES,
        variables: {
          price: `${price}`,
          time: time,
          Market_ID: `${m.name}`,
        },
      });
      console.log(`ADDED: ${resp?.data?.insert_prices_one?.Market_ID} @ ${resp?.data?.insert_prices_one?.price}`);
    } catch (error) {
      console.error(`\nFAILED ${m.name} => ${error}\n`);
      throw error;
    }
  }));

  console.log("Program Ended");
  return "success";
}