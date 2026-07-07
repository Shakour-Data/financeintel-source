/**
 * Quick Score — Lightweight scoring for overview page
 * 
 * Computes dimension-level scores without the full 284-node hierarchy.
 * This avoids loading the massive scoring-engine-v2.ts (3836 lines)
 * which causes Turbopack OOM crashes.
 * 
 * Full hierarchy scores are available via /api/crypto/[id] on demand.
 */

export interface QuickDimension {
  key: string;
  name: string;
  color: string;
  icon: string;
  score: number;
  scoreChange: number;
  coefficient: number;
}

export interface QuickCoinScore {
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: QuickDimension[];
}

interface CoinData {
  id: string;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  current_price: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_1h_in_currency?: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  market_cap_change_percentage_24h: number;
  fully_diluted_valuation: number | null;
}

interface ExtCtx {
  fearAndGreed: { value: number; change24h: number } | null;
  defiLlama: { totalTvl: number; chains: Array<{ name: string; tvl: number; change24h: number | null }> } | null;
  macroIndicators: {
    dxy: { value: number; change24h: number } | null;
    sp500: { value: number; change24h: number } | null;
    gold: { value: number; change24h: number } | null;
    oil: { value: number; change24h: number } | null;
    treasury10y: { value: number; change24h: number } | null;
  } | null;
  derivatives: {
    btcFundingRate: number | null;
    btcOpenInterest: number | null;
    btcLongShortRatio: number | null;
    btcTakerBuyRatio: number | null;
  } | null;
}

function clamp(v: number, min = 1, max = 10): number {
  return Math.round(Math.max(min, Math.min(max, v)) * 10) / 10;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 5;
  return ((value - min) / (max - min)) * 9 + 1;
}

// Dimension coefficient weights (sum = 1.0)
const DIM_WEIGHTS: Record<string, number> = {
  fundamental: 0.12,
  technical: 0.12,
  onchain: 0.08,
  market_psychology: 0.10,
  news_sentiment: 0.08,
  macroeconomic: 0.08,
  regulatory: 0.06,
  network_security: 0.06,
  derivatives: 0.10,
  whale_smart_money: 0.08,
  ecosystem_defi: 0.06,
  inter_market: 0.06,
};

const DIM_META: Record<string, { name: string; color: string; icon: string }> = {
  fundamental:      { name: 'Fundamental Analysis',      color: '#ef4444', icon: 'BarChart3' },
  technical:        { name: 'Technical Analysis',         color: '#3b82f6', icon: 'Activity' },
  onchain:          { name: 'On-Chain & Microstructure',  color: '#22c55e', icon: 'Network' },
  market_psychology:{ name: 'Market Psychology',          color: '#eab308', icon: 'Brain' },
  news_sentiment:   { name: 'News & Sentiment',           color: '#8b5cf6', icon: 'Newspaper' },
  macroeconomic:    { name: 'Macroeconomic',              color: '#f97316', icon: 'Globe' },
  regulatory:       { name: 'Regulatory',                 color: '#06b6d4', icon: 'Shield' },
  network_security: { name: 'Network Security',           color: '#64748b', icon: 'Lock' },
  derivatives:      { name: 'Derivatives',                color: '#ec4899', icon: 'CandlestickChart' },
  whale_smart_money:{ name: 'Whale & Smart Money',        color: '#14b8a6', icon: 'Fish' },
  ecosystem_defi:   { name: 'Ecosystem & DeFi',           color: '#a855f7', icon: 'Hexagon' },
  inter_market:     { name: 'Inter-Market',               color: '#84cc16', icon: 'ArrowLeftRight' },
};

// Quick dimension scorers — one function per dimension using real data where available
function scoreFundamental(c: CoinData, _ctx: ExtCtx): number {
  const mcapScore = c.market_cap > 100e9 ? 9.5 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 6 : 4.5;
  const rankScore = c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8.5 : c.market_cap_rank <= 20 ? 7 : 5.5;
  const supplyScore = c.max_supply ? 8 : c.total_supply ? clamp(normalize(c.circulating_supply / c.total_supply!, 0.3, 1)) : 4;
  const fdvScore = c.fully_diluted_valuation && c.fully_diluted_valuation > 0
    ? clamp(normalize(c.market_cap / c.fully_diluted_valuation, 0.3, 1))
    : 7;
  return (mcapScore * 0.3 + rankScore * 0.3 + supplyScore * 0.2 + fdvScore * 0.2);
}

function scoreTechnical(c: CoinData, _ctx: ExtCtx): number {
  const h1 = c.price_change_percentage_1h_in_currency ?? 0;
  const d24 = c.price_change_percentage_24h ?? 0;
  const d7 = c.price_change_percentage_7d_in_currency ?? 0;
  const shortScore = clamp(normalize(h1, -3, 3));
  const midScore = clamp(normalize(d24, -10, 10));
  const longScore = clamp(normalize(d7, -20, 20));
  const consistency = (h1 > 0 && d24 > 0 && d7 > 0) ? 8.5 : (h1 < 0 && d24 < 0 && d7 < 0) ? 2.5 : 5;
  const range = c.current_price > 0 ? (c.high_24h - c.low_24h) / c.current_price : 0;
  const rangeScore = clamp(normalize(-range, -0.15, 0.15) + 5);
  return (shortScore * 0.2 + midScore * 0.2 + longScore * 0.2 + consistency * 0.2 + rangeScore * 0.2);
}

function scoreOnchain(c: CoinData, _ctx: ExtCtx): number {
  const volScore = c.total_volume > 5e9 ? 9 : c.total_volume > 1e9 ? 7.5 : c.total_volume > 500e6 ? 6 : 4;
  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
  const volRatioScore = volMcap > 0.15 ? 9 : volMcap > 0.05 ? 7 : volMcap > 0.01 ? 5 : 3;
  const nvtScore = c.market_cap_rank <= 3 ? 9.5 : c.market_cap_rank <= 10 ? 7.5 : 5.5;
  return (volScore * 0.35 + volRatioScore * 0.35 + nvtScore * 0.3);
}

function scoreMarketPsychology(c: CoinData, ctx: ExtCtx): number {
  if (ctx.fearAndGreed) {
    const fgScore = clamp(normalize(ctx.fearAndGreed.value, 0, 100));
    const fgChange = clamp(normalize(ctx.fearAndGreed.change24h, -20, 20));
    const momentum = clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10));
    return (fgScore * 0.4 + fgChange * 0.3 + momentum * 0.3);
  }
  // Fallback: use price action as psychology proxy
  const pricePct = c.price_change_percentage_24h ?? 0;
  const mcapPct = c.market_cap_change_percentage_24h ?? 0;
  return clamp(normalize((pricePct + mcapPct) / 2, -10, 10));
}

function scoreNewsSentiment(c: CoinData, _ctx: ExtCtx): number {
  // Without real news sentiment API, use market cap rank and volume as proxy
  const rankScore = c.market_cap_rank <= 5 ? 8 : c.market_cap_rank <= 10 ? 7 : c.market_cap_rank <= 20 ? 6 : 4;
  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
  const attentionScore = volMcap > 0.1 ? 8 : volMcap > 0.05 ? 6.5 : 4;
  return (rankScore * 0.5 + attentionScore * 0.5);
}

function scoreMacroeconomic(c: CoinData, ctx: ExtCtx): number {
  if (!ctx.macroIndicators) {
    // Fallback: use price change as macro proxy
    return clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10));
  }
  let score = 5;
  const { dxy, sp500, treasury10y } = ctx.macroIndicators;
  // Lower DXY is good for crypto
  if (dxy) score += normalize(-dxy.change24h, -3, 3) * 0.15;
  // Higher SPX is good for crypto
  if (sp500) score += normalize(sp500.change24h, -5, 5) * 0.15;
  // Lower treasury is good for crypto
  if (treasury10y) score += normalize(10 - treasury10y.value, 0, 10) * 0.1;
  return clamp(score);
}

function scoreRegulatory(c: CoinData, _ctx: ExtCtx): number {
  // Proxy: established coins have more regulatory clarity
  const established = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'dogecoin', 'cardano', 'chainlink', 'stellar', 'monero', 'polkadot'];
  if (established.includes(c.id)) return 7.5;
  return c.market_cap_rank <= 20 ? 6.5 : c.market_cap_rank <= 50 ? 5 : 3.5;
}

function scoreNetworkSecurity(c: CoinData, _ctx: ExtCtx): number {
  // Proxy: bigger networks are more secure
  const l1 = ['bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche', 'near', 'sui', 'aptos'];
  if (l1.includes(c.id)) return 9;
  const l2 = ['polygon', 'arbitrum', 'optimism', 'binancecoin', 'cosmos', 'polkadot'];
  if (l2.includes(c.id)) return 7.5;
  return c.market_cap_rank <= 20 ? 6.5 : 4;
}

function scoreDerivatives(c: CoinData, ctx: ExtCtx): number {
  if (!ctx.derivatives || ctx.derivatives.btcFundingRate === null) {
    // Fallback: use volume as proxy for derivatives activity
    const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
    return clamp(normalize(volMcap, 0, 0.15));
  }
  let score = 5;
  const { btcFundingRate, btcOpenInterest, btcLongShortRatio, btcTakerBuyRatio } = ctx.derivatives;
  // Negative funding rate = oversold = potential bounce (contrarian)
  if (btcFundingRate !== null) {
    const rate = btcFundingRate * 1000;
    score += normalize(-rate, -5, 5) * 0.2;
  }
  // High OI = active market
  if (btcOpenInterest) {
    score += normalize(btcOpenInterest / 1e9, 0, 30) * 0.15;
  }
  // Long/short ratio > 1 = bullish sentiment
  if (btcLongShortRatio) {
    score += normalize(btcLongShortRatio - 0.5, -1, 1) * 0.15;
  }
  // Taker buy ratio > 0.5 = buying pressure
  if (btcTakerBuyRatio) {
    score += normalize(btcTakerBuyRatio - 0.5, -0.5, 0.5) * 0.1;
  }
  return clamp(score);
}

function scoreWhaleSmartMoney(c: CoinData, _ctx: ExtCtx): number {
  // Proxy: large volume/mcap ratio suggests institutional activity
  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
  const whaleActivity = volMcap > 0.1 ? 8 : volMcap > 0.05 ? 6.5 : volMcap > 0.02 ? 5 : 3.5;
  const mcapSize = c.market_cap > 50e9 ? 8 : c.market_cap > 10e9 ? 7 : c.market_cap > 1e9 ? 5.5 : 4;
  return (whaleActivity * 0.6 + mcapSize * 0.4);
}

function scoreEcosystemDefi(c: CoinData, ctx: ExtCtx): number {
  if (ctx.defiLlama) {
    // Check if this coin's chain has TVL data
    const chainNames: Record<string, string> = {
      bitcoin: 'Bitcoin', ethereum: 'Ethereum', solana: 'Solana',
      avalanche: 'Avalanche', binancecoin: 'BSC', polygon: 'Polygon',
      arbitrum: 'Arbitrum', optimism: 'Optimism', cardano: 'Cardano',
      cosmos: 'Cosmos', near: 'Near', sui: 'Sui', aptos: 'Aptos',
      tron: 'Tron', fantom: 'Fantom',
    };
    const chainName = chainNames[c.id];
    const chain = chainName ? ctx.defiLlama.chains.find(ch => ch.name === chainName) : null;
    if (chain) {
      const tvlScore = chain.tvl > 10e9 ? 9 : chain.tvl > 1e9 ? 7.5 : chain.tvl > 100e6 ? 6 : 4;
      const changeScore = chain.change24h != null ? clamp(normalize(chain.change24h, -10, 10)) : 5;
      return (tvlScore * 0.6 + changeScore * 0.4);
    }
  }
  // Fallback
  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
  return platforms.includes(c.id) ? 7.5 : c.market_cap_rank <= 10 ? 6 : 4;
}

function scoreInterMarket(c: CoinData, ctx: ExtCtx): number {
  if (!ctx.macroIndicators) {
    // Fallback: use price change relative to market
    return clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10));
  }
  let score = 5;
  const { dxy, sp500, gold, btcYfinance } = ctx.macroIndicators as any;
  // DXY inverse correlation
  if (dxy) score += normalize(120 - dxy.value, 90, 120) * 0.1;
  // SPX correlation
  if (sp500) score += normalize(sp500.change24h, -5, 5) * 0.1;
  // Gold correlation (BTC as digital gold)
  if (gold) score += normalize(gold.change24h, -5, 5) * 0.05;
  // BTC dominance effect
  if (btcYfinance) {
    const coinChange = c.price_change_percentage_24h ?? 0;
    score += normalize(coinChange - btcYfinance.change24h, -15, 15) * 0.1;
  }
  return clamp(score);
}

// Main scoring function
export function quickScoreCoin(coin: CoinData, ctx: ExtCtx): QuickCoinScore {
  const scorers: Record<string, (c: CoinData, ctx: ExtCtx) => number> = {
    fundamental: scoreFundamental,
    technical: scoreTechnical,
    onchain: scoreOnchain,
    market_psychology: scoreMarketPsychology,
    news_sentiment: scoreNewsSentiment,
    macroeconomic: scoreMacroeconomic,
    regulatory: scoreRegulatory,
    network_security: scoreNetworkSecurity,
    derivatives: scoreDerivatives,
    whale_smart_money: scoreWhaleSmartMoney,
    ecosystem_defi: scoreEcosystemDefi,
    inter_market: scoreInterMarket,
  };

  const dimensions: QuickDimension[] = Object.entries(scorers).map(([key, scorer]) => {
    const rawScore = scorer(coin, ctx);
    const score = clamp(rawScore);
    const weight = DIM_WEIGHTS[key] ?? 0.08;
    const meta = DIM_META[key];
    return {
      key,
      name: meta.name,
      color: meta.color,
      icon: meta.icon,
      score,
      scoreChange: 0, // Will be computed from price change
      coefficient: Math.round(weight * 1000) / 1000,
    };
  });

  // Calculate AI score as weighted average (1-10 scale → multiply by 10 for 0-100)
  const aiScore10 = dimensions.reduce((sum, dim) => sum + dim.score * dim.coefficient, 0);
  const aiScore = Math.round(aiScore10 * 10) / 10;

  // Derive change from price change
  const pricePct = coin.price_change_percentage_24h ?? 0;
  const aiScoreChangePct = Math.round(pricePct * 0.6 * 100) / 100;
  const previousAiScore = Math.round((aiScore / (1 + Math.max(-15, Math.min(15, aiScoreChangePct)) / 100)) * 10) / 10;
  const aiScoreChange = Math.round((aiScore - previousAiScore) * 10) / 10;

  // Update dimension scoreChanges based on price change
  dimensions.forEach(dim => {
    dim.scoreChange = Math.round(pricePct * dim.coefficient * 0.6 * 10) / 10;
  });

  const confidence: 'high' | 'medium' | 'low' =
    coin.market_cap_rank <= 10 ? 'high' :
    coin.market_cap_rank <= 30 ? 'medium' : 'low';

  return {
    aiScore,
    previousAiScore,
    aiScoreChange,
    aiScoreChangePct,
    confidence,
    dimensions,
  };
}

export function quickScoreBatch(coins: CoinData[], ctx: ExtCtx): Map<string, QuickCoinScore> {
  const result = new Map<string, QuickCoinScore>();
  for (const coin of coins) {
    result.set(coin.id, quickScoreCoin(coin, ctx));
  }
  return result;
}

// Hierarchy stats (matches scoring-engine-v2 for UI compatibility)
export function getQuickHierarchyStats() {
  return {
    dimensions: 12,
    subDimensions: 37,
    aspects: 74,
    subAspects: 161,
    totalCoefficients: 284,
  };
}
