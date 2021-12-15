
export interface Metadata {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  animation_url: string;
  external_url: string;
  attributes: Attribute[];
  collection: Collection;
  properties: Properties;
}


export interface Attribute {
  trait_type: string;
  value: string;
}

export interface Collection {
  name: string;
  family: string;
}

export interface File {
  uri: string;
  type: string;
  cdn?: boolean;
}

export interface Creator {
  address: string;
  share: number;
}

export interface Properties {
  files: File[];
  category: string;
  creators: Creator[];
}

// generate svg
export interface SVGparamsTypes {
  quoteToken: string;
  baseToken: string;
  poolAddress: string;
  quoteTokenSymbol: string;
  baseTokenSymbol: string;
  feeTier: string;
  tickLower: number;
  tickUpper: number;
  tickSpacing: number;
  overRange: number;
  tokenId: string;
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  x3: string;
  y3: string;
};