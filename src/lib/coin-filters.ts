// Shared coin filtering helpers — used by crypto-table.tsx and page.tsx
// so the FilterBar's "filteredCount" matches the table's actual filtering.

export type McapTier = 'all' | 'large' | 'mid' | 'small' | 'micro';

export interface CoinFilterable {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  aiScore: number;
}

export interface ExternalFilters {
  categories?: string[];
  scoreMin?: number;
  scoreMax?: number;
  mcapTier?: string;
}

/** Detect coin categories by id/symbol/name heuristics. */
export function detectCategories(coin: CoinFilterable): string[] {
  const cats: string[] = [];
  const id = coin.id.toLowerCase();
  const sym = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();

  // Stablecoins
  if (
    ['usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'frax', 'usds'].includes(sym) ||
    name.includes('usd') ||
    id === 'tether' ||
    id === 'usd-coin'
  ) {
    cats.push('stablecoin');
  }

  // Layer 1
  if (
    [
      'bitcoin', 'ethereum', 'solana', 'avalanche-2', 'cardano', 'algorand',
      'tezos', 'near', 'cosmos', 'polkadot', 'tron', 'eos', 'flow',
      'internet-computer', 'aptos', 'sui', 'sei-network', 'celestia', 'kaspa',
    ].includes(id)
  ) {
    cats.push('l1');
  }

  // Layer 2
  if (
    [
      'polygon', 'polygon-ecosystem-token', 'arbitrum', 'optimism', 'matic',
      'starknet', 'zksync', 'loopring', 'mantle', 'blast', 'scroll',
      'immutable-x', 'mantapacific',
    ].some((x) => id.includes(x))
  ) {
    cats.push('l2');
  }

  // DeFi
  if (
    [
      'uniswap', 'aave', 'maker', 'compound', 'sushiswap', 'curve-dao-token',
      'pancakeswap-token', 'lido', 'rocket-pool', 'dydx', 'thorchain', 'beth',
      'jupiter-exchange-solana', 'injective-protocol', 'frax-share',
    ].includes(id) ||
    ['uni', 'aave', 'mkr', 'comp', 'sushi', 'crv', 'cake', 'ldo', 'rpl', 'dxd', 'rune', 'jup', 'inj', 'fxs'].includes(sym)
  ) {
    cats.push('defi');
  }

  // Meme
  if (
    ['dogecoin', 'shiba-inu', 'pepe', 'doge', 'shib', 'floki', 'bonk', 'wif', 'meme', 'book-of-meme', 'mog-coin'].some(
      (x) => id.includes(x) || sym.includes(x)
    )
  ) {
    cats.push('meme');
  }

  // Privacy
  if (
    ['monero', 'zcash', 'dash', 'secret', 'oasis-network'].includes(id) ||
    ['xmr', 'zec', 'dash', 'scrt', 'rose'].includes(sym)
  ) {
    cats.push('privacy');
  }

  // Oracle
  if (
    ['chainlink', 'pyth-network', 'api3', 'band-protocol'].includes(id) ||
    ['link', 'pyth', 'api3', 'band'].includes(sym)
  ) {
    cats.push('oracle');
  }

  // AI
  if (
    [
      'fetch-ai', 'singularitynet', 'ocean-protocol', 'render-token',
      'bittensor', 'the-graph', 'numeraire', 'render', 'akash-network',
    ].includes(id) ||
    ['fet', 'agi', 'ocean', 'rndr', 'tao', 'grt', 'nmr', 'akt'].includes(sym)
  ) {
    cats.push('ai');
  }

  // Gaming
  if (
    [
      'axie-infinity', 'the-sandbox', 'decentraland', 'gala', 'immutable-x',
      'gods-unchained', 'illuvium', 'gala-2',
    ].includes(id) ||
    ['axs', 'sand', 'mana', 'gala', 'imx', 'gods', 'ilv'].includes(sym)
  ) {
    cats.push('gaming');
  }

  // Exchange token
  if (
    ['binancecoin', 'okb', 'crypto-com-chain', 'kucoin-shares', 'ftx-token'].includes(id) ||
    ['bnb', 'okb', 'cro', 'kcs', 'ftt'].includes(sym)
  ) {
    cats.push('exchange');
  }

  // RWA (Real World Assets)
  if (
    ['ondo-finance', 'polymesh', 'centrifuge', 'mantra-dao', 'realio-network', 'maple', 'clearpool', 'goldfinch', 'truefi'].includes(id) ||
    ['ondo', 'polyx', 'cfg', 'om', 'rio', 'mpl', 'cpool', 'gfi', 'tru'].includes(sym)
  ) {
    cats.push('rwa');
  }

  // LST (Liquid Staking Tokens)
  if (
    ['lido-dao', 'rocket-pool', 'jito-governance-token', 'marlin', 'stafi', 'anker', 'swingby'].includes(id) ||
    ['ldo', 'rpl', 'jito', 'ankr', 'lseq', 'wsteth', 'cbeth', 'reth', 'sfrxeth'].includes(sym) ||
    id.includes('staked') || id.includes('liquid-staking')
  ) {
    cats.push('lst');
  }

  // If no category detected, mark as other
  if (cats.length === 0) cats.push('other');

  return cats;
}

/** Map a market cap to its tier. */
export function mcapTierOf(mcap: number): McapTier {
  if (mcap >= 10e9) return 'large'; // >$10B
  if (mcap >= 1e9) return 'mid'; // $1B–$10B
  if (mcap >= 100e6) return 'small'; // $100M–$1B
  return 'micro'; // <$100M
}

/** Apply external filters to a coin list and return the filtered list. */
export function applyExternalFilters<T extends CoinFilterable>(
  coins: T[],
  filters: ExternalFilters | undefined
): T[] {
  if (!filters) return coins;
  const { categories, scoreMin, scoreMax, mcapTier: tier } = filters;
  const hasCategoryFilter = categories && categories.length > 0;
  const hasScoreFilter =
    (scoreMin !== undefined && scoreMin > 1) ||
    (scoreMax !== undefined && scoreMax < 10);
  const hasTierFilter = tier && tier !== 'all';

  if (!hasCategoryFilter && !hasScoreFilter && !hasTierFilter) return coins;

  return coins.filter((c) => {
    if (hasCategoryFilter) {
      const cats = detectCategories(c);
      if (!categories!.some((cat) => cats.includes(cat))) return false;
    }
    if (hasScoreFilter) {
      const min = scoreMin ?? 1;
      const max = scoreMax ?? 10;
      if (c.aiScore < min || c.aiScore > max) return false;
    }
    if (hasTierFilter) {
      if (mcapTierOf(c.market_cap) !== tier) return false;
    }
    return true;
  });
}
