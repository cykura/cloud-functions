import { MARKETS } from './price-indexer.js';
const { ApolloServer, gql } = require('apollo-server');
require('dotenv').config()

console.log(MARKETS);

// type defs
const typeDefs = `gql
  type Market {
    name: String,
    price: Number
  }
  type Query {
    Markets: [Market]
  }`
;

// resolvers
const resolvers = {
    Query: {
    Markets: () => MARKETS,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

url = 'http://hasuragraphqlapi-loadbalancer-336945920.ap-southeast-1.elb.amazonaws.com/v1/graphql'
server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});