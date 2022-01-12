import * as anchor from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import { Keypair, PublicKey } from "@solana/web3.js"
import idl from "./idl.json"

const MINT = "7vA9bFYHm5aGSyWY1aamaVDtkqrLYc5BjznVhMVYBw56"
export const USDC_LOCAL = 'GyH7fsFCvD1Wt8DbUGEk6Hzt68SVqwRKDHSvyBS16ZHm'
export const USDT_LOCAL = '7HvgZSj1VqsGADkpb8jLXCVqyzniDHP5HzQCymHnrn1t'
export const SOL_LOCAL = 'EC1x3JZ1PBW4MqH711rqfERaign6cxLTBNb3mi5LK9vP'

const getTokenSymbol = (tokenAddress: string) => {
  return tokenAddress === USDC_LOCAL ? 'USDC' : tokenAddress === USDT_LOCAL ? 'USDT' : 'wSOL'
}

export const getParams = async (tokenId: string) => {
  const POSITION_SEED = Buffer.from('ps')
  const PROGRAM_ID = "cysonxupBUVurvLe3Kz9mYrwmNfh43gEP4MgXwHmsUk"
  // Create a test wallet to listen to
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from([
      252, 26, 11, 109, 164, 158, 158, 132, 63, 237, 103, 133, 199, 61, 192,
      224, 190, 12, 205, 115, 133, 30, 76, 120, 93, 68, 115, 238, 88, 133, 142,
      240, 228, 84, 108, 18, 194, 149, 219, 241, 174, 188, 83, 138, 11, 218, 68,
      31, 8, 90, 186, 27, 102, 127, 153, 30, 154, 9, 66, 71, 177, 154, 242, 255,
    ])
  );

  const wallet = new anchor.Wallet(keypair)
  const owner = wallet.publicKey
  const connection = new web3.Connection('http://127.0.0.1:8899')
  const provider = new anchor.Provider(connection, wallet, {})
  const cyclosCore = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider)

  try {
    const [tokenizedPositionState, _] = await PublicKey.findProgramAddress(
      [POSITION_SEED, new PublicKey(tokenId).toBuffer()],
      cyclosCore.programId
    )
    const tokenizedPositionData: any = await cyclosCore.account.tokenizedPositionState.fetch(tokenizedPositionState)
    const poolId = tokenizedPositionData.poolId
    const poolState: any = await cyclosCore.account.poolState.fetch(poolId)

    const TICK_LOWER: number = tokenizedPositionData.tickLower
    const TICK_UPPER: number = tokenizedPositionData.tickUpper
    const POOL: string = tokenizedPositionData.poolId.toString()
    const FEE: number = poolState.fee
    const TICK_SPACING: number = poolState.tickSpacing
    const TOKEN0: string = poolState.token0.toString()
    const TOKEN1: string = poolState.token1.toString()
    const TOKEN0SYM: string = getTokenSymbol(TOKEN0)
    const TOKEN1SYM: string = getTokenSymbol(TOKEN1)
    const TOKEN_ID: string = tokenId

    const below = poolState && typeof TICK_LOWER === 'number' ? poolState.tick < TICK_LOWER : undefined
    const above = poolState && typeof TICK_UPPER === 'number' ? poolState.tick >= TICK_UPPER : undefined
    const OVER_RANGE = above ? -1 : below ? 1 : 0

    return {
      TOKEN_ID,
      TICK_LOWER,
      TICK_UPPER,
      POOL,
      FEE,
      TICK_SPACING,
      TOKEN0,
      TOKEN1,
      TOKEN0SYM,
      TOKEN1SYM,
      OVER_RANGE,
    }
  } catch (e) {
    console.error(e)
  }
  return null
}

getParams(MINT).then(console.log)