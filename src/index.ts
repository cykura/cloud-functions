import { MARKETS } from '@project-serum/serum';
import { ApolloServer } from 'apollo-server';
require('dotenv').config()


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

// const url = 'http://hasuragraphqlapi-loadbalancer-336945920.ap-southeast-1.elb.amazonaws.com/v1/graphql'
server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
