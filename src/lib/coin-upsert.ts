/**
 * Coin Upsert Utility — Ensures coins exist in the DB when ingesting market data.
 *
 * - Upserts coins by their CoinGecko ID (unique key)
 * - Auto-detects coin type (isL1, isL2, isDefi, isStablecoin) based on known lists
 * - Returns the internal Coin.id for use as FK in other tables
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// KNOWN COIN CLASSIFICATIONS
// These lists are used to auto-tag coins during upsert.
// ═══════════════════════════════════════════════════════════════

const L1_COINS = new Set([
  'bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2', 'near',
  'sui', 'aptos', 'algorand', 'cosmos', 'polkadot', 'tron', 'tezos',
  'stellar', 'hedera-hashgraph', 'internet-computer', 'kaspa', 'sei-network',
  'celestia', 'stacks',
]);

const L2_COINS = new Set([
  'polygon', 'matic-network', 'arbitrum', 'optimism', 'binancecoin',
  'mantle', 'immutable-x', 'metis-token', 'loopring', 'starknet',
  'mantle', 'worldcoin-wld',
]);

const DEFI_COINS = new Set([
  'aave', 'maker', 'uniswap', 'curve-dao-token', 'lido-dao',
  'compound-governance-token', 'synthetix-network-token', 'sushi',
  'pancakeswap-token', '1inch', 'yearn-finance', 'balancer',
  'kyber-network', 'enjincoin', 'chainlink', 'the-graph',
  'injective-protocol', 'render-token', 'pendle', 'jupiter-exchange-solana',
  'ondo-finance',
]);

const STABLECOIN_IDS = new Set([
  'tether', 'usd-coin', 'binance-usd', 'dai', 'true-usd',
  'frax', 'usds', 'first-digital-usd', 'ethena-usde', 'paypal-usd',
  'staked-usde', 'usdb',
]);

// ═══════════════════════════════════════════════════════════════
// COIN TYPE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectCoinTypes(coingeckoId: string): {
  isL1: boolean;
  isL2: boolean;
  isDefi: boolean;
  isStablecoin: boolean;
} {
  return {
    isL1: L1_COINS.has(coingeckoId),
    isL2: L2_COINS.has(coingeckoId),
    isDefi: DEFI_COINS.has(coingeckoId),
    isStablecoin: STABLECOIN_IDS.has(coingeckoId),
  };
}

// ═══════════════════════════════════════════════════════════════
// UPSERT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Upsert a single coin by CoinGecko ID.
 * Returns the internal Coin.id (cuid).
 *
 * - If the coin already exists: updates name, symbol, image, and type flags
 * - If the coin doesn't exist: creates it with detected types
 */
export async function upsertCoin(
  coingeckoId: string,
  symbol: string,
  name: string,
  image?: string
): Promise<string> {
  const types = detectCoinTypes(coingeckoId);

  const coin = await db.coin.upsert({
    where: { coingeckoId },
    update: {
      symbol,
      name,
      ...(image ? { image } : {}),
      isL1: types.isL1,
      isL2: types.isL2,
      isDefi: types.isDefi,
      isStablecoin: types.isStablecoin,
    },
    create: {
      coingeckoId,
      symbol,
      name,
      image: image ?? null,
      isL1: types.isL1,
      isL2: types.isL2,
      isDefi: types.isDefi,
      isStablecoin: types.isStablecoin,
    },
    select: { id: true },
  });

  return coin.id;
}

/**
 * Batch upsert coins from CoinGecko market data.
 * Returns a Map of coingeckoId → Coin.id for use as FK references.
 *
 * More efficient than individual upserts when processing many coins at once.
 */
export async function upsertCoinsFromMarketData(
  marketData: Array<{ id: string; symbol: string; name: string; image: string }>
): Promise<Map<string, string>> {
  const coinIdMap = new Map<string, string>();

  // Process coins sequentially to avoid DB contention with SQLite
  for (const coin of marketData) {
    const dbId = await upsertCoin(coin.id, coin.symbol, coin.name, coin.image);
    coinIdMap.set(coin.id, dbId);
  }

  console.log(`[CoinUpsert] Upserted ${coinIdMap.size} coins`);
  return coinIdMap;
}
