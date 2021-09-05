import { ApolloClient, InMemoryCache, createHttpLink, gql } from "@apollo/client";
import { fetch } from 'cross-fetch'
require("dotenv").config();

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

export { apolloClient, INSERT_PRICES };
