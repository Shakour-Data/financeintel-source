/**
 * ML Scoring Engine V4 — Database-Backed 12-Dimension Hierarchical Scoring
 *
 * Based on reference book framework:
 * 🔴 Dimension 1: Fundamental / Blockchain Analysis
 * 🔵 Dimension 2: Technical Analysis
 * 🟢 Dimension 3: On-Chain & Microstructure
 * 🟡 Dimension 4: Market / Investment Psychology
 *
 * Hierarchy: 12 Dimensions → Sub-dimensions → Aspects → Sub-aspects
 * Coefficients are optimized daily via ML (gradient descent on prediction error).
 * All scores, coefficients, and historical data are persisted to the database.
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// EXTERNAL DATA CONTEXT
// ═══════════════════════════════════════════════════════════════

export interface ExternalDataContext {
  fearAndGreed: {
    value: number;        // 0-100
    classification: string;
    previousValue: number;
    change24h: number;
  } | null;
  defiLlama: {
    chains: Array<{
      name: string;
      tvl: number;
      change24h: number | null;
      change7d: number | null;
    }>;
    totalTvl: number;
  } | null;
  macroIndicators: {
    dxy: { value: number; change24h: number } | null;
    sp500: { value: number; change24h: number } | null;
    gold: { value: number; change24h: number } | null;
    oil: { value: number; change24h: number } | null;
    treasury10y: { value: number; change24h: number } | null;
    btcYfinance: { value: number; change24h: number } | null;
  } | null;
  derivatives: {
    btcFundingRate: number | null;
    ethFundingRate: number | null;
    btcOpenInterest: number | null;
    ethOpenInterest: number | null;
    btcLongShortRatio: number | null;
    ethLongShortRatio: number | null;
    btcTakerBuyRatio: number | null;
  } | null;
  perSymbolDerivatives?: {
    [symbolKey: string]: {
      symbol: string;
      fundingRate: number | null;
      openInterest: number | null;
      longShortRatio: number | null;
      takerBuyRatio: number | null;
    };
  } | null;
  additionalMacro?: {
    vix: { value: number; change24h: number } | null;
    nasdaq: { value: number; change24h: number } | null;
    russell2000: { value: number; change24h: number } | null;
    copper: { value: number; change24h: number } | null;
  } | null;
  coinglass?: {
    btcLiquidation24h: number | null;
    ethLiquidation24h: number | null;
  } | null;
  historicalPrices?: {
    [symbolKey: string]: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  } | null;
  cryptoCompareSocial?: {
    btc: {
      reddit_active_users: number | null;
      reddit_posts_24h: number | null;
      twitter_followers: number | null;
      code_repo_stars: number | null;
      code_repo_contributors: number | null;
      code_repo_commits_30d: number | null;
    } | null;
  } | null;
  newsSentiment?: {
    aggregateSentiment: number; // -1 to 1
    averageImpactScore: number; // 0 to 10
    articleCount: number;
    coinSpecificSentiment: Record<string, {
      sentiment: number;
      impact: number;
      count: number;
    }>;
  } | null;
}

/** Empty external data context used as fallback when no external APIs are available */
export const EMPTY_EXTERNAL_DATA: ExternalDataContext = {
  fearAndGreed: null,
  defiLlama: null,
  macroIndicators: null,
  derivatives: null,
  perSymbolDerivatives: null,
  additionalMacro: null,
  coinglass: null,
  historicalPrices: null,
  cryptoCompareSocial: null,
  newsSentiment: null,
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR DATA ACCESS & PROPERTY-BASED SCORING
// ═══════════════════════════════════════════════════════════════

/** Get TVL for a coin's chain from DeFiLlama data */
function getTVLForCoin(coin: CoinInput, ctx: ExternalDataContext): number | null {
  if (!ctx.defiLlama?.chains) return null;
  const chainMap: Record<string, string> = {
    'bitcoin': 'Bitcoin', 'ethereum': 'Ethereum', 'binancecoin': 'BSC',
    'solana': 'Solana', 'avalanche-2': 'Avalanche', 'polkadot': 'Polkadot',
    'cardano': 'Cardano', 'ripple': 'XRP', 'chainlink': 'Ethereum',
    'dogecoin': 'Dogecoin', 'tron': 'Tron', 'matic-network': 'Polygon',
    'shiba-inu': 'Ethereum', 'litecoin': 'Litecoin', 'uniswap': 'Ethereum',
    'near': 'NEAR Protocol', 'aptos': 'Aptos', 'sui': 'Sui',
    'stellar': 'Stellar', 'cosmos': 'Cosmos',
  };
  const chainName = chainMap[coin.id];
  if (!chainName) return null;
  const chain = ctx.defiLlama.chains.find(c =>
    c.name.toLowerCase() === chainName.toLowerCase()
  );
  return chain?.tvl ?? null;
}

/** Get per-symbol derivatives data for a coin */
function getDerivativesForCoin(coin: CoinInput, ctx: ExternalDataContext) {
  if (!ctx.perSymbolDerivatives) return null;
  const symbolKey = coin.symbol?.toUpperCase();
  return ctx.perSymbolDerivatives[symbolKey] ?? null;
}

/** Get news sentiment for a specific coin */
function getNewsSentimentForCoin(coin: CoinInput, ctx: ExternalDataContext) {
  if (!ctx.newsSentiment?.coinSpecificSentiment) return null;
  return ctx.newsSentiment.coinSpecificSentiment[coin.id]
    ?? ctx.newsSentiment.coinSpecificSentiment[coin.symbol?.toLowerCase()]
    ?? null;
}

/** Market cap tier score (replaces hardcoded lists) */
function mcapTierScore(coin: CoinInput): number {
  const mcap = coin.market_cap || 0;
  if (mcap > 100e9) return 9.5;
  if (mcap > 50e9) return 9;
  if (mcap > 20e9) return 8.5;
  if (mcap > 10e9) return 8;
  if (mcap > 5e9) return 7;
  if (mcap > 2e9) return 6;
  if (mcap > 1e9) return 5;
  if (mcap > 500e6) return 4;
  return 3;
}

/** Volume quality score (replaces rank-based proxies) */
function volumeQualityScore(coin: CoinInput): number {
  const vol = coin.total_volume || 0;
  const mcap = coin.market_cap || 1;
  const ratio = vol / mcap;
  if (ratio > 0.3) return 9;
  if (ratio > 0.15) return 8;
  if (ratio > 0.08) return 7;
  if (ratio > 0.04) return 6;
  if (ratio > 0.02) return 5;
  return 4;
}

/** Compute realized volatility from historical prices (annualized) */
function computeRealizedVolatility(prices: Array<{ close: number }>): number | null {
  if (prices.length < 7) return null;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1].close;
    if (prev <= 0) continue;
    returns.push(Math.log(prices[i].close / prev));
  }
  if (returns.length < 5) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  // Annualize: daily vol * sqrt(365)
  return Math.sqrt(variance) * Math.sqrt(365);
}

/** Compute RSI from historical closes */
function computeRSI(prices: Array<{ close: number }>, period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i].close - prices[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/** Compute maximum drawdown from historical prices */
function computeMaxDrawdown(prices: Array<{ close: number }>): number | null {
  if (prices.length < 2) return null;
  let peak = prices[0].close;
  let maxDD = 0;
  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    if (peak <= 0) continue; // guard against zero/negative peak — avoid NaN
    const dd = (peak - p.close) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

/** Get historical prices for a coin from context */
function getHistoricalPrices(coin: CoinInput, ctx: ExternalDataContext): Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> | null {
  if (!ctx.historicalPrices) return null;
  const symbolKey = coin.symbol?.toUpperCase();
  const prices = ctx.historicalPrices[symbolKey];
  if (!prices || prices.length < 5) return null;
  return prices;
}

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS (same as V3 for frontend compatibility)
// ═══════════════════════════════════════════════════════════════

export interface SubAspect {
  key: string;
  name: string;
  nameFa: string;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
}

export interface Aspect {
  key: string;
  name: string;
  nameFa: string;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
  subAspects: SubAspect[];
}

export interface SubDimension {
  key: string;
  name: string;
  nameFa: string;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
  aspects: Aspect[];
}

export interface Dimension {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
  subDimensions: SubDimension[];
  /** Reference books for this dimension */
  references: string[];
}

export interface CryptoScore {
  coinId: string;
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  dimensions: Dimension[];
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
  coefficientVersion: number;
}

export interface CoefficientSnapshot {
  version: number;
  date: string;
  coefficients: Record<string, number>;
  predictionError: number;
}

// ═══════════════════════════════════════════════════════════════
// HIERARCHY DEFINITION
// ═══════════════════════════════════════════════════════════════

interface HierarchyDef {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  references: string[];
  subDimensions: {
    key: string;
    name: string;
    nameFa: string;
    aspects: {
      key: string;
      name: string;
      nameFa: string;
      subAspects: {
        key: string;
        name: string;
        nameFa: string;
        scorer: (coin: CoinInput, ctx: ExternalDataContext) => number;
      }[];
    }[];
  }[];
}

export interface CoinInput {
  id: string;
  dbCoinId?: string; // Internal DB id (Coin.id)
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

// ═══════════════════════════════════════════════════════════════
// FULL 12-DIMENSION HIERARCHY WITH SCORERS
// Based on reference book framework
// ═══════════════════════════════════════════════════════════════

const HIERARCHY: HierarchyDef[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🔴 DIMENSION 1: FUNDAMENTAL / BLOCKCHAIN ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'fundamental',
    name: 'Fundamental Analysis',
    nameFa: 'Fundamental Analysis',
    color: '#ef4444',
    icon: 'BarChart3',
    references: [
      'Cryptoassets — Burniske & Tatar',
      'Blockchain Fundamental Analysis — Garvey',
      'Digital Assets — Aggarwal & Tasca',
      'The Infinite Machine — Russo',
    ],
    subDimensions: [
      {
        key: 'fund_valuation',
        name: 'Valuation Metrics',
        nameFa: 'Valuation Metrics',
        aspects: [
          {
            key: 'fund_val_mcap',
            name: 'Market Cap Analysis',
            nameFa: 'Market Cap Analysis',
            subAspects: [
              {
                key: 'fund_val_mcap_size',
                name: 'Market Cap Size',
                nameFa: 'Market Cap Size',
                scorer: (c, _ctx) => c.market_cap > 100e9 ? 9.5 : c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 6 : c.market_cap > 100e6 ? 4.5 : 3,
              },
              {
                key: 'fund_val_mcap_rank',
                name: 'Market Cap Rank',
                nameFa: 'Market Cap Rank',
                scorer: (c, _ctx) => c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8.5 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'fund_val_mcap_dominance',
                name: 'Market Dominance',
                nameFa: 'Market Dominance',
                scorer: (c, _ctx) => c.market_cap_rank <= 3 ? 9.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 5.5 : 3.5,
              },
            ],
          },
          {
            key: 'fund_val_fdv',
            name: 'FDV Analysis',
            nameFa: 'FDV Analysis',
            subAspects: [
              {
                key: 'fund_val_fdv_ratio',
                name: 'MCap/FDV Ratio',
                nameFa: 'MCap/FDV Ratio',
                scorer: (c, _ctx) => {
                  if (!c.fully_diluted_valuation || c.fully_diluted_valuation === 0) return 7;
                  const ratio = c.market_cap / c.fully_diluted_valuation;
                  return clamp(normalize(ratio, 0.3, 1));
                },
              },
              {
                key: 'fund_val_fdv_dilution',
                name: 'Dilution Risk',
                nameFa: 'Dilution Risk',
                scorer: (c, _ctx) => {
                  if (!c.fully_diluted_valuation || c.fully_diluted_valuation === 0) return 6;
                  const ratio = c.market_cap / c.fully_diluted_valuation;
                  return ratio > 0.8 ? 8.5 : ratio > 0.5 ? 6.5 : ratio > 0.3 ? 4.5 : 3;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'fund_supply',
        name: 'Supply Dynamics',
        nameFa: 'Supply Dynamics',
        aspects: [
          {
            key: 'fund_supply_circulation',
            name: 'Circulating Supply',
            nameFa: 'Circulating Supply',
            subAspects: [
              {
                key: 'fund_supply_circ_ratio',
                name: 'Circ/Total Ratio',
                nameFa: 'Circ/Total Ratio',
                scorer: (c, _ctx) => {
                  const ratio = c.total_supply ? c.circulating_supply / c.total_supply : 0.5;
                  return clamp(normalize(ratio, 0.2, 1));
                },
              },
              {
                key: 'fund_supply_inflation',
                name: 'Inflation Rate',
                nameFa: 'Inflation Rate',
                scorer: (c, _ctx) => c.max_supply ? 8.5 : c.total_supply ? clamp(normalize(c.circulating_supply / c.total_supply, 0.3, 1)) : 4,
              },
            ],
          },
          {
            key: 'fund_supply_model',
            name: 'Supply Model',
            nameFa: 'Supply Model',
            subAspects: [
              {
                key: 'fund_supply_deflationary',
                name: 'Deflationary Model',
                nameFa: 'Deflationary Model',
                scorer: (c, _ctx) => c.max_supply ? 8.5 : 4,
              },
              {
                key: 'fund_supply_scarcity',
                name: 'Scarcity Score',
                nameFa: 'Scarcity Score',
                scorer: (c, _ctx) => {
                  if (!c.max_supply) return 4;
                  const scarcity = c.circulating_supply / c.max_supply;
                  return clamp(normalize(scarcity, 0.5, 1));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'fund_project',
        name: 'Project Quality',
        nameFa: 'Project Quality',
        aspects: [
          {
            key: 'fund_project_maturity',
            name: 'Project Maturity',
            nameFa: 'Project Maturity',
            subAspects: [
              {
                key: 'fund_project_established',
                name: 'Establishment Level',
                nameFa: 'Establishment Level',
                scorer: (c, _ctx) => {
                  // Property-based: market cap as establishment proxy
                  const mcap = c.market_cap || 0;
                  const mcapTier = mcap > 100e9 ? 9.5 : mcap > 50e9 ? 9 : mcap > 20e9 ? 8 : mcap > 10e9 ? 7 : mcap > 5e9 ? 6 : mcap > 1e9 ? 5 : 3.5;
                  // Volume quality reinforces establishment signal
                  const vq = volumeQualityScore(c);
                  return clamp(mcapTier * 0.7 + vq * 0.3);
                },
              },
              {
                key: 'fund_project_ecosystem',
                name: 'Ecosystem Size',
                nameFa: 'Ecosystem Size',
                scorer: (c, ctx) => {
                  // Property-based: TVL as ecosystem size proxy (platforms have high TVL)
                  const tvl = getTVLForCoin(c, ctx);
                  if (tvl !== null) {
                    return tvl > 20e9 ? 9 : tvl > 5e9 ? 8 : tvl > 1e9 ? 7 : tvl > 500e6 ? 5.5 : 4;
                  }
                  // Fallback: market cap + volume as ecosystem proxy
                  const mcap = c.market_cap || 0;
                  const vq = volumeQualityScore(c);
                  const mcapScore = mcap > 50e9 ? 8.5 : mcap > 10e9 ? 7.5 : mcap > 1e9 ? 6 : 4.5;
                  return clamp(mcapScore * 0.6 + vq * 0.4);
                },
              },
            ],
          },
          {
            key: 'fund_project_platform',
            name: 'Platform Status',
            nameFa: 'Platform Status',
            subAspects: [
              {
                key: 'fund_project_platform_tier',
                name: 'Platform Tier',
                nameFa: 'Platform Tier',
                scorer: (c, ctx) => {
                  // Property-based: TVL + market cap as platform tier proxy
                  const tvl = getTVLForCoin(c, ctx);
                  const mcap = c.market_cap || 0;
                  if (tvl !== null) {
                    // High TVL = top-tier platform
                    if (tvl > 20e9 && mcap > 20e9) return 9;
                    if (tvl > 5e9 && mcap > 5e9) return 8;
                    if (tvl > 1e9) return 7;
                    return 5.5;
                  }
                  // Fallback: market cap as tier proxy
                  if (mcap > 50e9) return 9;
                  if (mcap > 10e9) return 7.5;
                  return c.market_cap_rank <= 30 ? 5.5 : 3.5;
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🔵 DIMENSION 2: TECHNICAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'technical',
    name: 'Technical Analysis',
    nameFa: 'Technical Analysis',
    color: '#3b82f6',
    icon: 'Activity',
    references: [
      'Technical Analysis of Financial Markets — Murphy',
      'Japanese Candlestick Charting — Nison',
      'Mastering Crypto 2025 Edition',
      'Algorithmic Trading of Cryptocurrencies — Chan',
    ],
    subDimensions: [
      {
        key: 'tech_trend',
        name: 'Trend Analysis',
        nameFa: 'Trend Analysis',
        aspects: [
          {
            key: 'tech_trend_short',
            name: 'Short-term Trend',
            nameFa: 'Short-term Trend',
            subAspects: [
              {
                key: 'tech_trend_short_1h',
                name: '1-Hour Momentum',
                nameFa: '1-Hour Momentum',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_1h_in_currency ?? 0;
                  return clamp(normalize(v, -3, 3));
                },
              },
              {
                key: 'tech_trend_short_24h',
                name: '24-Hour Direction',
                nameFa: '24-Hour Direction',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'tech_trend_short_acceleration',
                name: 'Price Acceleration',
                nameFa: 'Price Acceleration',
                scorer: (c, _ctx) => {
                  const h = c.price_change_percentage_1h_in_currency ?? 0;
                  const d = c.price_change_percentage_24h ?? 0;
                  const accel = h - d / 24;
                  return clamp(normalize(accel, -2, 2));
                },
              },
            ],
          },
          {
            key: 'tech_trend_mid',
            name: 'Mid-term Trend',
            nameFa: 'Mid-term Trend',
            subAspects: [
              {
                key: 'tech_trend_mid_7d',
                name: '7-Day Trend',
                nameFa: '7-Day Trend',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_7d_in_currency ?? 0;
                  return clamp(normalize(v, -20, 20));
                },
              },
              {
                key: 'tech_trend_mid_consistency',
                name: 'Trend Consistency',
                nameFa: 'Trend Consistency',
                scorer: (c, _ctx) => {
                  const h = c.price_change_percentage_1h_in_currency ?? 0;
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  const allPositive = h > 0 && d > 0 && w > 0;
                  const allNegative = h < 0 && d < 0 && w < 0;
                  if (allPositive) return 8.5;
                  if (allNegative) return 2.5;
                  if ((h > 0 && d > 0) || (d > 0 && w > 0)) return 6.5;
                  return 4;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'tech_pattern',
        name: 'Pattern Recognition',
        nameFa: 'Pattern Recognition',
        aspects: [
          {
            key: 'tech_pattern_range',
            name: 'Price Range Analysis',
            nameFa: 'Price Range Analysis',
            subAspects: [
              {
                key: 'tech_pattern_range_spread',
                name: 'HL Spread',
                nameFa: 'HL Spread',
                scorer: (c, _ctx) => {
                  if (c.current_price <= 0) return 5;
                  const spread = (c.high_24h - c.low_24h) / c.current_price;
                  return clamp(normalize(-spread, -0.15, 0.15) + 5);
                },
              },
              {
                key: 'tech_pattern_range_position',
                name: 'Price Position in Range',
                nameFa: 'Price Position in Range',
                scorer: (c, _ctx) => {
                  const range = c.high_24h - c.low_24h;
                  if (range <= 0) return 5;
                  const pos = (c.current_price - c.low_24h) / range;
                  return clamp(normalize(pos, 0, 1));
                },
              },
            ],
          },
          {
            key: 'tech_pattern_ath',
            name: 'ATH Analysis',
            nameFa: 'ATH Analysis',
            subAspects: [
              {
                key: 'tech_pattern_ath_distance',
                name: 'ATH Distance',
                nameFa: 'ATH Distance',
                scorer: (c, _ctx) => clamp(normalize(-c.ath_change_percentage, -80, 0)),
              },
              {
                key: 'tech_pattern_ath_breakout',
                name: 'Breakout Potential',
                nameFa: 'Breakout Potential',
                scorer: (c, _ctx) => c.ath_change_percentage > -10 ? 8.5 : c.ath_change_percentage > -30 ? 6 : c.ath_change_percentage > -50 ? 4.5 : 3,
              },
            ],
          },
        ],
      },
      {
        key: 'tech_risk',
        name: 'Risk Management',
        nameFa: 'Risk Management',
        aspects: [
          {
            key: 'tech_risk_volatility',
            name: 'Volatility Assessment',
            nameFa: 'Volatility Assessment',
            subAspects: [
              {
                key: 'tech_risk_vol_24h',
                name: '24h Volatility',
                nameFa: '24h Volatility',
                scorer: (c, ctx) => {
                  // Use historical realized volatility when available
                  const histPrices = getHistoricalPrices(c, ctx);
                  if (histPrices) {
                    const rv = computeRealizedVolatility(histPrices);
                    if (rv !== null) {
                      // Annualized vol: <0.5 = very stable, 0.5-1 = moderate, >1.5 = very volatile
                      return clamp(normalize(-rv, -0.5, 2) + 5);
                    }
                  }
                  // Fallback: intraday range
                  if (c.current_price <= 0) return 5;
                  const range = (c.high_24h - c.low_24h) / c.current_price;
                  return clamp(normalize(-range, -0.2, 0.02) + 5);
                },
              },
              {
                key: 'tech_risk_vol_stability',
                name: 'Price Stability',
                nameFa: 'Price Stability',
                scorer: (c, ctx) => {
                  // Use historical RSI + volatility when available
                  const histPrices = getHistoricalPrices(c, ctx);
                  if (histPrices) {
                    const rsi = computeRSI(histPrices);
                    if (rsi !== null) {
                      // RSI near 50 = stable; extreme RSI = unstable
                      const deviation = Math.abs(rsi - 50);
                      return clamp(normalize(-deviation, -50, 0) + 5);
                    }
                  }
                  const absChange = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absChange < 1 ? 9 : absChange < 3 ? 7 : absChange < 7 ? 5 : absChange < 15 ? 3 : 1.5;
                },
              },
            ],
          },
          {
            key: 'tech_risk_drawdown',
            name: 'Drawdown Risk',
            nameFa: 'Drawdown Risk',
            subAspects: [
              {
                key: 'tech_risk_dd_ath',
                name: 'ATH Drawdown',
                nameFa: 'ATH Drawdown',
                scorer: (c, ctx) => {
                  // Use historical max drawdown when available
                  const histPrices = getHistoricalPrices(c, ctx);
                  if (histPrices) {
                    const maxDD = computeMaxDrawdown(histPrices);
                    if (maxDD !== null) {
                      // Max DD: 0 = no drawdown (score 10), 0.8+ = severe drawdown (score 1)
                      return clamp(normalize(-maxDD, -0.8, 0));
                    }
                  }
                  return clamp(normalize(-c.ath_change_percentage, -80, 0));
                },
              },
              {
                key: 'tech_risk_dd_tail',
                name: 'Tail Risk',
                nameFa: 'Tail Risk',
                scorer: (c, _ctx) => {
                  const absChange = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absChange > 10 ? 2 : absChange > 5 ? 4 : 7;
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟢 DIMENSION 3: ON-CHAIN & MICROSTRUCTURE
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'onchain',
    name: 'On-Chain & Microstructure',
    nameFa: 'On-Chain & Microstructure',
    color: '#22c55e',
    icon: 'Network',
    references: [
      'Handbook of Blockchain Analytics — Chen',
      'The Evolution of On-Chain Trading — Anderson',
      'Crypto Market Microstructure — Trex',
      'Market Microstructure & HFT — Preston',
      'Mastering Bitcoin — Antonopoulos',
    ],
    subDimensions: [
      {
        key: 'onchain_network',
        name: 'Network Activity',
        nameFa: 'Network Activity',
        aspects: [
          {
            key: 'onchain_net_volume',
            name: 'Transaction Volume',
            nameFa: 'Transaction Volume',
            subAspects: [
              {
                key: 'onchain_net_vol_abs',
                name: 'Absolute Volume',
                nameFa: 'Absolute Volume',
                scorer: (c, _ctx) => c.total_volume > 5e9 ? 9 : c.total_volume > 1e9 ? 7.5 : c.total_volume > 500e6 ? 6 : c.total_volume > 100e6 ? 5 : 3.5,
              },
              {
                key: 'onchain_net_vol_ratio',
                name: 'Vol/MCap Ratio',
                nameFa: 'Vol/MCap Ratio',
                scorer: (c, _ctx) => {
                  const r = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return r > 0.15 ? 9 : r > 0.08 ? 7.5 : r > 0.03 ? 6 : r > 0.01 ? 4.5 : 3;
                },
              },
            ],
          },
          {
            key: 'onchain_net_value',
            name: 'Network Value',
            nameFa: 'Network Value',
            subAspects: [
              {
                key: 'onchain_net_val_mcap',
                name: 'Network Valuation',
                nameFa: 'Network Valuation',
                scorer: (c, _ctx) => c.market_cap > 50e9 ? 9 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 6 : c.market_cap > 100e6 ? 4.5 : 3,
              },
              {
                key: 'onchain_net_val_dominance',
                name: 'Network Dominance',
                nameFa: 'Network Dominance',
                scorer: (c, _ctx) => c.market_cap_rank <= 3 ? 9.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 5.5 : 3.5,
              },
            ],
          },
        ],
      },
      {
        key: 'onchain_microstructure',
        name: 'Market Microstructure',
        nameFa: 'Market Microstructure',
        aspects: [
          {
            key: 'onchain_micro_liquidity',
            name: 'Liquidity Depth',
            nameFa: 'Liquidity Depth',
            subAspects: [
              {
                key: 'onchain_micro_liq_depth',
                name: 'Depth Tier',
                nameFa: 'Depth Tier',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 9 : c.market_cap_rank <= 30 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'onchain_micro_liq_spread',
                name: 'Spread Proxy',
                nameFa: 'Spread Proxy',
                scorer: (c, _ctx) => {
                  if (c.current_price <= 0) return 5;
                  const spread = (c.high_24h - c.low_24h) / c.current_price;
                  return spread < 0.02 ? 9 : spread < 0.05 ? 7 : spread < 0.1 ? 5 : 3;
                },
              },
            ],
          },
          {
            key: 'onchain_micro_orders',
            name: 'Order Flow',
            nameFa: 'Order Flow',
            subAspects: [
              {
                key: 'onchain_micro_ord_imbalance',
                name: 'Buy/Sell Imbalance',
                nameFa: 'Buy/Sell Imbalance',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'onchain_micro_ord_velocity',
                name: 'Order Velocity',
                nameFa: 'Order Velocity',
                scorer: (c, _ctx) => {
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volRatio > 0.1 ? 8 : volRatio > 0.05 ? 6.5 : volRatio > 0.02 ? 5 : 3.5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'onchain_defi',
        name: 'DeFi Activity',
        nameFa: 'DeFi Activity',
        aspects: [
          {
            key: 'onchain_defi_tvl',
            name: 'TVL Proxy',
            nameFa: 'TVL Proxy',
            subAspects: [
              {
                key: 'onchain_defi_tvl_size',
                name: 'TVL Size Score',
                nameFa: 'TVL Size Score',
                scorer: (c, ctx) => {
                  // Use real DeFiLlama TVL data when available
                  const chainTvl = findChainTvl(c.id, ctx);
                  if (chainTvl) {
                    return chainTvl.tvl > 50e9 ? 9 : chainTvl.tvl > 10e9 ? 8 : chainTvl.tvl > 1e9 ? 6.5 : 4;
                  }
                  // Fallback: TVL from helper + mcap as DeFi proxy
                  const tvl = getTVLForCoin(c, ctx);
                  if (tvl !== null) {
                    return tvl > 20e9 ? 8.5 : tvl > 5e9 ? 7.5 : tvl > 1e9 ? 6 : 4.5;
                  }
                  return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5);
                },
              },
              {
                key: 'onchain_defi_tvl_growth',
                name: 'Activity Growth',
                nameFa: 'Activity Growth',
                scorer: (c, ctx) => {
                  // Use real DeFiLlama TVL growth when available
                  const chainTvl = findChainTvl(c.id, ctx);
                  if (chainTvl && chainTvl.change24h !== null) {
                    return clamp(normalize(chainTvl.change24h, -10, 10));
                  }
                  // Fallback: market cap change as proxy
                  const v = c.market_cap_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟡 DIMENSION 4: MARKET / INVESTMENT PSYCHOLOGY
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'market_psychology',
    name: 'Market & Investment Psychology',
    nameFa: 'Market & Investment Psychology',
    color: '#f59e0b',
    icon: 'Brain',
    references: [
      'Crypto Investing Guide — Balina',
      'Trading for a Living — Elder',
      'Cryptoassets — Burniske & Tatar',
      'Bitcoin Billionaires — Mezrich',
      'Thinking, Fast and Slow — Kahneman',
      'Beyond Greed and Fear — Shefrin',
      'Trading in the Zone — Douglas',
      'Behavioural Investing — Montier',
      'Inefficient Markets — Shleifer',
      'The Psychology of Finance — Tvede',
      'The Disciplined Trader — Douglas',
      'Nudge — Thaler & Sunstein',
      'The Mind of the Market — Shermer',
      'Predictably Irrational — Ariely',
      'What Investors Really Want — Statman',
      'The Psychology of Trading — Steenbarger',
      'Trade Mindfully — Dayton',
      'Trading Psychology 2.0 — Steenbarger',
      'Best Loser Wins — Hougaard',
      'The Mental Game of Trading — Tendler',
    ],
    subDimensions: [
      {
        key: 'mkt_sentiment',
        name: 'Market Sentiment',
        nameFa: 'Market Sentiment',
        aspects: [
          {
            key: 'mkt_sent_direction',
            name: 'Directional Bias',
            nameFa: 'Directional Bias',
            subAspects: [
              {
                key: 'mkt_sent_dir_bull',
                name: 'Bull/Bear Signal',
                nameFa: 'Bull/Bear Signal',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'mkt_sent_dir_volume',
                name: 'Volume Sentiment',
                nameFa: 'Volume Sentiment',
                scorer: (c, _ctx) => {
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(volRatio, 0, 0.15));
                },
              },
              {
                key: 'mkt_sent_dir_mcap_trend',
                name: 'MCap Trend',
                nameFa: 'MCap Trend',
                scorer: (c, _ctx) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
              },
            ],
          },
          {
            key: 'mkt_sent_social',
            name: 'Social Signals',
            nameFa: 'Social Signals',
            subAspects: [
              {
                key: 'mkt_sent_social_tier',
                name: 'Community Tier',
                nameFa: 'Community Tier',
                scorer: (c, _ctx) => c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'mkt_sent_social_momentum',
                name: 'Social Momentum',
                nameFa: 'Social Momentum',
                scorer: (c, _ctx) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return v > 5 ? 8.5 : v > 0 ? 6.5 : v > -5 ? 4.5 : 2.5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'mkt_psychology',
        name: 'Investor Psychology',
        nameFa: 'Investor Psychology',
        aspects: [
          {
            key: 'mkt_psych_fear_greed',
            name: 'Fear/Greed Proxy',
            nameFa: 'Fear/Greed Proxy',
            subAspects: [
              {
                key: 'mkt_psych_fg_price',
                name: 'Price Momentum Signal',
                nameFa: 'Price Momentum Signal',
                scorer: (c, ctx) => {
                  // Use real Fear & Greed Index when available
                  if (ctx.fearAndGreed?.value != null) {
                    const fg = ctx.fearAndGreed.value; // 0-100 scale
                    // Map F&G to 1-10: Extreme Fear(0-25)→2-3, Fear(25-45)→3-5, Neutral(45-55)→5-6, Greed(55-75)→6-8, Extreme Greed(75-100)→8-9
                    return clamp(1 + (fg / 100) * 9);
                  }
                  // Fallback: use price momentum as proxy
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  const extreme = Math.abs(d) > 10 || Math.abs(w) > 25;
                  const positive = d > 0 && w > 0;
                  if (extreme && positive) return 8.5;
                  if (extreme && !positive) return 2.5;
                  return 5.5;
                },
              },
              {
                key: 'mkt_psych_fg_volume',
                name: 'Volume Panic/Euphoria',
                nameFa: 'Volume Panic/Euphoria',
                scorer: (c, ctx) => {
                  // Use real Fear & Greed Index classification
                  if (ctx.fearAndGreed?.value != null) {
                    const fg = ctx.fearAndGreed.value;
                    const classification = ctx.fearAndGreed.classification?.toLowerCase() ?? '';
                    if (classification.includes('extreme fear') || fg < 20) return 2.5;
                    if (classification.includes('fear') || fg < 40) return 3.5;
                    if (classification.includes('greed') || fg > 70) return 8;
                    if (classification.includes('extreme greed') || fg > 85) return 9;
                    return 5.5;
                  }
                  // Fallback: volume ratio as proxy
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volRatio > 0.2 ? 3 : volRatio > 0.1 ? 6 : volRatio > 0.03 ? 7 : 4;
                },
              },
            ],
          },
          {
            key: 'mkt_psych_behavior',
            name: 'Behavioral Patterns',
            nameFa: 'Behavioral Patterns',
            subAspects: [
              {
                key: 'mkt_psych_beh_herd',
                name: 'Herd Indicator',
                nameFa: 'Herd Indicator',
                scorer: (c, _ctx) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const absD = Math.abs(d);
                  return absD > 10 ? 2.5 : absD > 5 ? 4 : absD > 2 ? 6.5 : 7.5;
                },
              },
              {
                key: 'mkt_psych_beh_contrarian',
                name: 'Contrarian Signal',
                nameFa: 'Contrarian Signal',
                scorer: (c, _ctx) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  if (d < -8 && w < -15) return 8.5;
                  if (d > 8 && w > 15) return 3;
                  return 5.5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'mkt_portfolio',
        name: 'Portfolio Strategy',
        nameFa: 'Portfolio Strategy',
        aspects: [
          {
            key: 'mkt_port_liquidity',
            name: 'Liquidity Analysis',
            nameFa: 'Liquidity Analysis',
            subAspects: [
              {
                key: 'mkt_port_liq_access',
                name: 'Exchange Access',
                nameFa: 'Exchange Access',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 9 : c.market_cap_rank <= 30 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'mkt_port_liq_slippage',
                name: 'Slippage Risk',
                nameFa: 'Slippage Risk',
                scorer: (c, _ctx) => {
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volRatio > 0.1 ? 8.5 : volRatio > 0.05 ? 7 : volRatio > 0.02 ? 5.5 : 3;
                },
              },
            ],
          },
          {
            key: 'mkt_port_momentum',
            name: 'Portfolio Momentum',
            nameFa: 'Portfolio Momentum',
            subAspects: [
              {
                key: 'mkt_port_mom_short',
                name: 'Short-term Momentum',
                nameFa: 'Short-term Momentum',
                scorer: (c, _ctx) => clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10)),
              },
              {
                key: 'mkt_port_mom_mid',
                name: 'Mid-term Momentum',
                nameFa: 'Mid-term Momentum',
                scorer: (c, _ctx) => clamp(normalize(c.price_change_percentage_7d_in_currency ?? 0, -20, 20)),
              },
              {
                key: 'mkt_port_mom_mcap',
                name: 'MCap Momentum',
                nameFa: 'MCap Momentum',
                scorer: (c, _ctx) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
              },
            ],
          },
        ],
      },
      {
        key: 'mkt_behavioral_finance',
        name: 'Behavioral Finance',
        nameFa: 'Behavioral Finance',
        aspects: [
          {
            key: 'mkt_bf_cognitive',
            name: 'Cognitive Biases',
            nameFa: 'Cognitive Biases',
            subAspects: [
              {
                key: 'mkt_bf_cog_overreaction',
                name: 'Overreaction Bias',
                nameFa: 'Overreaction Bias',
                scorer: (c, _ctx) => {
                  // Large price swings + reversal patterns (Kahneman Ch.12-13)
                  const pct24h = Math.abs(c.price_change_percentage_24h ?? 0);
                  const moveScore = pct24h > 5 ? 1 : 0;
                  const range = c.high_24h - c.low_24h;
                  const pricePos = range > 0 ? (c.current_price - c.low_24h) / range : 0.5;
                  const isUp = (c.price_change_percentage_24h ?? 0) > 0;
                  const reversal = (isUp && pricePos < 0.3) || (!isUp && pricePos > 0.7);
                  const reversalBonus = reversal ? 0.3 : 0;
                  return clamp(normalize(pct24h, 0, 20) + moveScore * 2 + reversalBonus * 10);
                },
              },
              {
                key: 'mkt_bf_cog_overconfidence',
                name: 'Overconfidence Bias',
                nameFa: 'Overconfidence Bias',
                scorer: (c, _ctx) => {
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcapRatio > 0.05 ? clamp(normalize(volMcapRatio, 0, 0.3))
                    : clamp(normalize(volMcapRatio, 0, 0.05) + 1);
                },
              },
              {
                key: 'mkt_bf_cog_anchoring',
                name: 'Anchoring Bias',
                nameFa: 'Anchoring Bias',
                scorer: (c, _ctx) => {
                  const price = c.current_price;
                  const roundLevels = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
                  let nearRound = false;
                  for (const level of roundLevels) {
                    if (level > 0 && Math.abs(price - level) / level < 0.03) {
                      nearRound = true;
                      break;
                    }
                  }
                  const nearATH = Math.abs(c.ath_change_percentage) < 10;
                  const anchoringScore = (nearRound ? 0.4 : 0) + (nearATH ? 0.4 : 0) + (c.ath_change_percentage > -20 && c.ath_change_percentage < 0 ? 0.2 : 0);
                  return clamp(normalize(anchoringScore, 0, 1));
                },
              },
              {
                key: 'mkt_bf_cog_loss_aversion',
                name: 'Loss Aversion',
                nameFa: 'Loss Aversion',
                scorer: (c, _ctx) => {
                  const pct24h = c.price_change_percentage_24h ?? 0;
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const isDeclining = pct24h < 0;
                  const declineVolume = isDeclining ? volMcapRatio : 0;
                  const athDist = Math.abs(c.ath_change_percentage);
                  return clamp(normalize(declineVolume * 5 + (athDist > 30 ? 0.3 : 0), 0, 1));
                },
              },
              {
                key: 'mkt_bf_cog_disposition',
                name: 'Disposition Effect',
                nameFa: 'Disposition Effect',
                scorer: (c, _ctx) => {
                  const athDist = Math.abs(c.ath_change_percentage);
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const nearATH = athDist < 20;
                  const farFromATH = athDist > 50;
                  const sellingWinners = nearATH ? volMcapRatio * 5 : 0;
                  const holdingLosers = farFromATH ? (1 - volMcapRatio * 10) * 0.3 : 0;
                  return clamp(normalize(sellingWinners + holdingLosers, 0, 1));
                },
              },
            ],
          },
          {
            key: 'mkt_bf_emotional',
            name: 'Emotional Biases',
            nameFa: 'Emotional Biases',
            subAspects: [
              {
                key: 'mkt_bf_emo_fear_greed',
                name: 'Fear & Greed',
                nameFa: 'Fear & Greed',
                scorer: (c, ctx) => {
                  // Use real Fear & Greed Index for behavioral analysis
                  if (ctx.fearAndGreed?.value != null) {
                    const fg = ctx.fearAndGreed.value; // 0-100
                    // Extreme fear → high fear bias (low score), Extreme greed → high greed bias (high score)
                    // Middle range → more balanced, better score
                    const deviation = Math.abs(fg - 50) / 50; // 0 at neutral, 1 at extremes
                    // When market is at extremes, behavioral bias is stronger (lower score)
                    // When market is balanced, bias is lower (higher score)
                    return clamp(10 - deviation * 8);
                  }
                  // Fallback: price/volume heuristic
                  const pct24h = c.price_change_percentage_24h ?? 0;
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const range = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.low_24h * 100 : 3;
                  const athProximity = 1 - normalize(Math.abs(c.ath_change_percentage), 0, 50);
                  const momentum = normalize(pct24h, -10, 10);
                  const volumeDir = pct24h > 0 ? normalize(volMcapRatio, 0, 0.2) : (1 - normalize(volMcapRatio, 0, 0.2));
                  const volFear = 1 - normalize(range, 0, 15);
                  return clamp(momentum * 0.3 + volumeDir * 0.25 + volFear * 0.2 + athProximity * 0.25);
                },
              },
              {
                key: 'mkt_bf_emo_herding',
                name: 'Herding Behavior',
                nameFa: 'Herding Behavior',
                scorer: (c, _ctx) => {
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const herdStrength = normalize(absPct, 0, 15) * 0.6 + normalize(volMcapRatio, 0, 0.2) * 0.4;
                  return clamp(10 - herdStrength * 9);
                },
              },
              {
                key: 'mkt_bf_emo_tilt_risk',
                name: 'Tilt Risk',
                nameFa: 'Tilt Risk',
                scorer: (c, _ctx) => {
                  const pct24h = Math.abs(c.price_change_percentage_24h ?? 0);
                  const pct7d = Math.abs(c.price_change_percentage_7d_in_currency ?? 0);
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const range = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.low_24h * 100 : 3;
                  const bothExtreme = pct24h > 5 && pct7d > 10;
                  const consecutive = bothExtreme ? 0.7 : (pct24h > 5 ? 0.4 : 0.1);
                  const escalating = normalize(volMcapRatio, 0, 0.2);
                  const volTilt = normalize(range, 0, 15);
                  return clamp(normalize(consecutive + escalating * 0.5 + volTilt * 0.3, 0, 1));
                },
              },
              {
                key: 'mkt_bf_emo_emotional_util',
                name: 'Emotional Utility',
                nameFa: 'Emotional Utility',
                scorer: (c, _ctx) => {
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const range = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.low_24h * 100 : 3;
                  const smallCapBonus = c.market_cap < 1e9 ? 0.3 : (c.market_cap < 1e10 ? 0.15 : 0);
                  const pctAbs = Math.abs(c.price_change_percentage_24h ?? 0);
                  const total = normalize(volMcapRatio, 0, 0.25) * 0.3 + normalize(range, 0, 15) * 0.3 + normalize(pctAbs, 0, 20) * 0.2 + smallCapBonus;
                  return clamp(normalize(total, 0, 1));
                },
              },
              {
                key: 'mkt_bf_emo_state_depend',
                name: 'State Dependence',
                nameFa: 'State Dependence',
                scorer: (c, _ctx) => {
                  const pct24h = c.price_change_percentage_24h ?? 0;
                  const pct7d = c.price_change_percentage_7d_in_currency ?? pct24h;
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const dailyAvg7d = Math.abs(pct7d) / 7;
                  const acceleration = dailyAvg7d > 0 ? Math.abs(pct24h) / dailyAvg7d : 1;
                  const volumeSpike = normalize(volMcapRatio, 0, 0.2);
                  const dirChange = Math.sign(pct24h) !== Math.sign(pct7d) ? 0.4 : 0.1;
                  return clamp(normalize(normalize(acceleration, 1, 5) * 0.3 + volumeSpike * 0.25 + normalize(Math.abs(pct24h), 0, 15) * 0.25 + dirChange, 0, 1));
                },
              },
            ],
          },
          {
            key: 'mkt_bf_discipline',
            name: 'Trading Discipline',
            nameFa: 'Trading Discipline',
            subAspects: [
              {
                key: 'mkt_bf_disc_mindfulness',
                name: 'Mindfulness Score',
                nameFa: 'Mindfulness Score',
                scorer: (c, _ctx) => {
                  const range = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.low_24h * 100 : 3;
                  const pctAbs = Math.abs(c.price_change_percentage_24h ?? 0);
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const lowVol = 1 - normalize(range, 0, 15);
                  const steady = 1 - normalize(pctAbs, 0, 10);
                  const orderly = 1 - normalize(volMcapRatio, 0, 0.2);
                  return clamp(normalize(lowVol * 0.3 + steady * 0.3 + orderly * 0.4, 0, 1));
                },
              },
              {
                key: 'mkt_bf_disc_resilience',
                name: 'Market Resilience',
                nameFa: 'Market Resilience',
                scorer: (c, _ctx) => {
                  const pct24h = c.price_change_percentage_24h ?? 0;
                  const range = c.high_24h - c.low_24h;
                  const pricePos = range > 0 ? (c.current_price - c.low_24h) / range : 0.5;
                  const isDeclining = pct24h < 0;
                  const bounce = isDeclining && pricePos > 0.6 ? 0.7 : (isDeclining && pricePos > 0.4 ? 0.4 : 0.1);
                  const pct7d = c.price_change_percentage_7d_in_currency ?? pct24h;
                  const weeklyRecovery = isDeclining && pct7d > 0 ? 0.6 : 0.1;
                  return clamp(normalize(bounce * 0.5 + weeklyRecovery * 0.3 + (pricePos > 0.5 ? 0.2 : 0), 0, 1));
                },
              },
              {
                key: 'mkt_bf_disc_loss_accept',
                name: 'Loss Acceptance',
                nameFa: 'Loss Acceptance',
                scorer: (c, _ctx) => {
                  const pct24h = c.price_change_percentage_24h ?? 0;
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const isDeclining = pct24h < 0;
                  const declineAccept = isDeclining ? 1 - normalize(volMcapRatio, 0, 0.2) : 0.5;
                  const orderly = isDeclining ? 1 - normalize(Math.abs(pct24h), 0, 15) : 0.7;
                  return clamp(normalize(declineAccept * 0.5 + orderly * 0.3 + (isDeclining ? 0.2 : 0.5), 0, 1));
                },
              },
              {
                key: 'mkt_bf_disc_momentum_persist',
                name: 'Momentum Persistence',
                nameFa: 'Momentum Persistence',
                scorer: (c, _ctx) => {
                  const h = c.price_change_percentage_1h_in_currency ?? 0;
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  const allPositive = h > 0 && d > 0 && w > 0;
                  const allNegative = h < 0 && d < 0 && w < 0;
                  if (allPositive) return 8.5;
                  if (allNegative) return 7;
                  if ((h > 0 && d > 0) || (d > 0 && w > 0)) return 6;
                  if ((h < 0 && d < 0) || (d < 0 && w < 0)) return 5;
                  return 4;
                },
              },
              {
                key: 'mkt_bf_disc_mean_revert',
                name: 'Mean Reversion Signal',
                nameFa: 'Mean Reversion Signal',
                scorer: (c, _ctx) => {
                  const athDist = c.ath > 0 ? (c.current_price - c.ath) / c.ath : 0;
                  const extremePosition = Math.abs(athDist);
                  return clamp(normalize(extremePosition, 0, 0.8));
                },
              },
              {
                key: 'mkt_bf_disc_noise_risk',
                name: 'Noise Trader Risk',
                nameFa: 'Noise Trader Risk',
                scorer: (c, _ctx) => {
                  const range = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.low_24h * 100 : 3;
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const mcapVuln = 1 - normalize(c.market_cap, 1e8, 1e12);
                  return clamp(normalize(normalize(range, 0, 15) * 0.35 + normalize(volMcapRatio, 0, 0.2) * 0.3 + mcapVuln * 0.35, 0, 1));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟣 DIMENSION 5: NEWS & SENTIMENT ANALYSIS
  // Based on: Algorithmic NLP sentiment analysis + news data
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'news_sentiment',
    name: 'News & Sentiment Analysis',
    nameFa: 'News & Sentiment Analysis',
    color: '#8b5cf6',
    icon: 'Newspaper',
    references: [
      'Crypto Sentiment Analysis — Abraham & Cheng',
      'The Wisdom of Crowds in Financial Markets — Surowiecki',
      'News and Asset Prices — Tetlock',
      'Social Media and Crypto Markets — Phillips & Gorse',
    ],
    subDimensions: [
      {
        key: 'news_impact',
        name: 'News Impact',
        nameFa: 'News Impact',
        aspects: [
          {
            key: 'news_market_events',
            name: 'Market News Events',
            nameFa: 'Market News Events',
            subAspects: [
              {
                key: 'news_mkt_volatility_signal',
                name: 'Volatility News Signal',
                nameFa: 'Volatility News Signal',
                scorer: (c, ctx) => {
                  // Use news impact score + sentiment volatility when available
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // High impact + volatile sentiment = strong news-driven volatility signal
                    const impactFactor = normalize(coinNews.impact, 0, 10);
                    const sentimentAbs = Math.abs(coinNews.sentiment);
                    const sentimentFactor = normalize(sentimentAbs, 0, 1);
                    return clamp(impactFactor * 0.6 + sentimentFactor * 0.4);
                  }
                  if (ctx.newsSentiment?.averageImpactScore != null) {
                    const avgImpact = normalize(ctx.newsSentiment.averageImpactScore, 0, 10);
                    const aggAbs = Math.abs(ctx.newsSentiment.aggregateSentiment);
                    const aggFactor = normalize(aggAbs, 0, 1);
                    return clamp(avgImpact * 0.6 + aggFactor * 0.4);
                  }
                  // Fallback: price-based proxy
                  const absChange = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absChange > 8 ? 8.5 : absChange > 5 ? 7 : absChange > 2 ? 5.5 : 4;
                },
              },
              {
                key: 'news_mkt_volume_signal',
                name: 'Volume News Signal',
                nameFa: 'Volume News Signal',
                scorer: (c, ctx) => {
                  // Use article count + average impact as news-driven activity
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // More articles + higher impact = stronger news-driven volume signal
                    const countFactor = normalize(coinNews.count, 0, 20);
                    const impactFactor = normalize(coinNews.impact, 0, 10);
                    return clamp(countFactor * 0.5 + impactFactor * 0.5);
                  }
                  if (ctx.newsSentiment) {
                    const countFactor = normalize(ctx.newsSentiment.articleCount, 0, 50);
                    const impactFactor = normalize(ctx.newsSentiment.averageImpactScore, 0, 10);
                    return clamp(countFactor * 0.5 + impactFactor * 0.5);
                  }
                  // Fallback: volume ratio as proxy
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volRatio > 0.2 ? 8 : volRatio > 0.1 ? 6.5 : volRatio > 0.05 ? 5 : 3.5;
                },
              },
            ],
          },
          {
            key: 'news_regulatory',
            name: 'Regulatory Climate',
            nameFa: 'Regulatory Climate',
            subAspects: [
              {
                key: 'news_reg_establishment',
                name: 'Regulatory Establishment',
                nameFa: 'Regulatory Establishment',
                scorer: (c, ctx) => {
                  // Use news coverage breadth as establishment proxy
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // More news coverage = more established in regulatory eyes
                    const coverageFactor = normalize(coinNews.count, 0, 15);
                    const mcapFactor = mcapTierScore(c) / 10;
                    return clamp(coverageFactor * 0.5 + mcapFactor * 0.5);
                  }
                  // Fallback: mcap-based establishment proxy
                  const mcap = c.market_cap || 0;
                  return mcap > 50e9 ? 8.5 : mcap > 10e9 ? 7.5 : mcap > 1e9 ? 6 : mcap > 100e6 ? 4.5 : 3.5;
                },
              },
              {
                key: 'news_reg_compliance',
                name: 'Compliance Signal',
                nameFa: 'Compliance Signal',
                scorer: (c, ctx) => {
                  // Use news sentiment for regulatory compliance scoring
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // Positive sentiment = better compliance perception
                    const sentimentFactor = normalize(coinNews.sentiment, -1, 1);
                    const mcapFactor = mcapTierScore(c) / 10;
                    return clamp(sentimentFactor * 0.4 + mcapFactor * 0.6);
                  }
                  if (ctx.newsSentiment) {
                    const aggSentFactor = normalize(ctx.newsSentiment.aggregateSentiment, -1, 1);
                    const mcapFactor = mcapTierScore(c) / 10;
                    return clamp(aggSentFactor * 0.3 + mcapFactor * 0.7);
                  }
                  // Fallback: market cap as compliance proxy
                  return c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7 : c.market_cap > 1e9 ? 5.5 : 3.5;
                },
              },
              {
                key: 'news_reg_sentiment',
                name: 'Regulatory Sentiment',
                nameFa: 'Regulatory Sentiment',
                scorer: (c, ctx) => {
                  // Use aggregate sentiment for regulatory sentiment
                  if (ctx.newsSentiment) {
                    return clamp(normalize(ctx.newsSentiment.aggregateSentiment, -1, 1));
                  }
                  // Fallback: price change as sentiment proxy
                  const d = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(d, -10, 10));
                },
              },
              {
                key: 'news_reg_risk',
                name: 'Regulatory Risk',
                nameFa: 'Regulatory Risk',
                scorer: (c, ctx) => {
                  // Use negative sentiment proportion
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // Strong negative sentiment = higher regulatory risk (lower score)
                    const negRisk = coinNews.sentiment < -0.3 ? 2 : coinNews.sentiment < -0.1 ? 4 : coinNews.sentiment < 0.1 ? 6 : 8;
                    const mcapFactor = mcapTierScore(c) / 10;
                    return clamp(negRisk * 0.5 + mcapFactor * 5 * 0.5);
                  }
                  if (ctx.newsSentiment) {
                    const aggNeg = ctx.newsSentiment.aggregateSentiment;
                    const negRisk = aggNeg < -0.3 ? 3 : aggNeg < -0.1 ? 5 : aggNeg < 0.1 ? 6 : 8;
                    return clamp(negRisk * 0.4 + mcapTierScore(c) * 0.6);
                  }
                  // Fallback
                  return clamp(mcapTierScore(c) * 0.7 + volumeQualityScore(c) * 0.3);
                },
              },
            ],
          },
        ],
      },
      {
        key: 'news_social',
        name: 'Social Sentiment',
        nameFa: 'Social Sentiment',
        aspects: [
          {
            key: 'news_social_buzz',
            name: 'Market Buzz',
            nameFa: 'Market Buzz',
            subAspects: [
              {
                key: 'news_social_momentum',
                name: 'Social Momentum',
                nameFa: 'Social Momentum',
                scorer: (c, ctx) => {
                  // Use sentiment trend (aggregate vs per-coin)
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews && ctx.newsSentiment) {
                    // Coin sentiment vs aggregate = momentum relative to market
                    const coinSent = normalize(coinNews.sentiment, -1, 1);
                    const aggSent = normalize(ctx.newsSentiment.aggregateSentiment, -1, 1);
                    // If coin sentiment > aggregate, positive momentum
                    return clamp(coinSent * 0.6 + aggSent * 0.4);
                  }
                  if (ctx.newsSentiment) {
                    return clamp(normalize(ctx.newsSentiment.aggregateSentiment, -1, 1));
                  }
                  // Fallback: Fear & Greed or price proxy
                  if (ctx.fearAndGreed) {
                    return clamp(normalize(ctx.fearAndGreed.value, 0, 100));
                  }
                  const d = c.price_change_percentage_24h ?? 0;
                  return d > 5 ? 8.5 : d > 0 ? 6.5 : d > -5 ? 4.5 : 2.5;
                },
              },
              {
                key: 'news_social_engagement',
                name: 'Community Engagement',
                nameFa: 'Community Engagement',
                scorer: (c, ctx) => {
                  // Use article count per coin as engagement proxy
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    return clamp(normalize(coinNews.count, 0, 20));
                  }
                  if (ctx.newsSentiment) {
                    const globalFactor = normalize(ctx.newsSentiment.articleCount, 0, 50);
                    const mcapFactor = mcapTierScore(c) / 10;
                    return clamp(globalFactor * 0.4 + mcapFactor * 0.6);
                  }
                  // Fallback: volume quality as engagement proxy
                  return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5);
                },
              },
            ],
          },
          {
            key: 'news_social_dev',
            name: 'Developer Activity',
            nameFa: 'Developer Activity',
            subAspects: [
              {
                key: 'news_social_dev_ecosystem',
                name: 'Dev Ecosystem',
                nameFa: 'Dev Ecosystem',
                scorer: (c, ctx) => {
                  // Use news volume + positive sentiment + TVL as ecosystem proxy
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  const tvl = getTVLForCoin(c, ctx);
                  let score = mcapTierScore(c) * 0.4;
                  if (coinNews) {
                    const newsFactor = normalize(coinNews.count, 0, 15);
                    const sentFactor = normalize(coinNews.sentiment, -1, 1);
                    score += newsFactor * 0.3 + sentFactor * 0.3;
                  } else {
                    score += volumeQualityScore(c) * 0.6;
                  }
                  if (tvl !== null) {
                    const tvlFactor = tvl > 20e9 ? 9 : tvl > 5e9 ? 7.5 : tvl > 1e9 ? 6 : 4;
                    score = score * 0.6 + tvlFactor * 0.4;
                  }
                  return clamp(score);
                },
              },
              {
                key: 'news_social_dev_maturity',
                name: 'Project Maturity',
                nameFa: 'Project Maturity',
                scorer: (c, ctx) => {
                  // Use sustained news coverage + market cap as maturity proxy
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  const mcapScore = mcapTierScore(c);
                  if (coinNews) {
                    // More articles = more sustained coverage = more mature
                    const coverageFactor = normalize(coinNews.count, 0, 20);
                    return clamp(mcapScore * 0.5 + coverageFactor * 0.5);
                  }
                  if (ctx.newsSentiment) {
                    const globalCoverage = normalize(ctx.newsSentiment.articleCount, 0, 50);
                    return clamp(mcapScore * 0.6 + globalCoverage * 0.4);
                  }
                  // Fallback: market cap + volume as maturity proxy
                  return clamp(mcapScore * 0.6 + volumeQualityScore(c) * 0.4);
                },
              },
            ],
          },
        ],
      },
      {
        key: 'news_catalyst',
        name: 'Event & Catalyst',
        nameFa: 'Event & Catalyst',
        aspects: [
          {
            key: 'news_catalyst_recent',
            name: 'Recent Catalysts',
            nameFa: 'Recent Catalysts',
            subAspects: [
              {
                key: 'news_cat_price_catalyst',
                name: 'Price Catalyst Signal',
                nameFa: 'Price Catalyst Signal',
                scorer: (c, ctx) => {
                  // Use news impact * sentiment direction as price catalyst
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  if (coinNews) {
                    // Impact * sentiment direction = catalyst strength
                    const impactDir = coinNews.impact * (coinNews.sentiment > 0 ? 1 : -0.5);
                    return clamp(normalize(impactDir, -5, 10));
                  }
                  if (ctx.newsSentiment) {
                    const impactDir = ctx.newsSentiment.averageImpactScore * (ctx.newsSentiment.aggregateSentiment > 0 ? 1 : -0.5);
                    const priceSignal = normalize(c.price_change_percentage_24h ?? 0, -10, 10);
                    return clamp(normalize(impactDir, -5, 10) * 0.6 + priceSignal * 0.4);
                  }
                  // Fallback: price move as catalyst proxy
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  const combined = Math.abs(d) + Math.abs(w) * 0.5;
                  return combined > 15 ? 8.5 : combined > 8 ? 7 : combined > 3 ? 5.5 : 4;
                },
              },
              {
                key: 'news_cat_volume_catalyst',
                name: 'Volume Catalyst',
                nameFa: 'Volume Catalyst',
                scorer: (c, ctx) => {
                  // Use article count * impact score as volume catalyst
                  if (ctx.newsSentiment) {
                    const catalytic = ctx.newsSentiment.articleCount * ctx.newsSentiment.averageImpactScore / 10;
                    const coinNews = getNewsSentimentForCoin(c, ctx);
                    if (coinNews) {
                      const coinCatalytic = coinNews.count * coinNews.impact / 10;
                      return clamp(normalize(coinCatalytic + catalytic * 0.3, 0, 15));
                    }
                    return clamp(normalize(catalytic, 0, 20));
                  }
                  // Fallback: volume ratio as catalyst proxy
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volRatio > 0.15 ? 8.5 : volRatio > 0.08 ? 7 : volRatio > 0.04 ? 5.5 : 3.5;
                },
              },
            ],
          },
          {
            key: 'news_catalyst_upcoming',
            name: 'Upcoming Catalysts',
            nameFa: 'Upcoming Catalysts',
            subAspects: [
              {
                key: 'news_cat_up_adoption',
                name: 'Adoption Potential',
                nameFa: 'Adoption Potential',
                scorer: (c, ctx) => {
                  // Use positive news volume + market cap as adoption proxy
                  const coinNews = getNewsSentimentForCoin(c, ctx);
                  const mcapScore = mcapTierScore(c);
                  if (coinNews && coinNews.sentiment > 0) {
                    // Positive news volume = adoption signal
                    const posNewsFactor = normalize(coinNews.count * coinNews.sentiment, 0, 10);
                    return clamp(posNewsFactor * 0.5 + mcapScore * 0.5);
                  }
                  if (ctx.newsSentiment && ctx.newsSentiment.aggregateSentiment > 0) {
                    const posVol = ctx.newsSentiment.articleCount * ctx.newsSentiment.aggregateSentiment;
                    return clamp(normalize(posVol, 0, 20) * 0.4 + mcapScore * 0.6);
                  }
                  // Fallback: market cap as adoption proxy
                  return clamp(mcapScore * 0.7 + volumeQualityScore(c) * 0.3);
                },
              },
              {
                key: 'news_cat_up_timing',
                name: 'Timing Score',
                nameFa: 'Timing Score',
                scorer: (c, ctx) => {
                  // Use sentiment momentum (current aggregate sentiment)
                  if (ctx.newsSentiment) {
                    const sentMomentum = ctx.newsSentiment.aggregateSentiment;
                    const coinNews = getNewsSentimentForCoin(c, ctx);
                    let score = normalize(sentMomentum, -1, 1);
                    if (coinNews) {
                      // If coin-specific sentiment is positive and aligned with market
                      const aligned = (coinNews.sentiment > 0 && sentMomentum > 0) || (coinNews.sentiment < 0 && sentMomentum < 0);
                      score = score * 0.6 + normalize(coinNews.sentiment, -1, 1) * 0.4 + (aligned ? 0.5 : 0);
                    }
                    return clamp(score);
                  }
                  // Fallback: price direction alignment
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  if (d > 2 && w > 5) return 8;
                  if (d > 0 && w > 0) return 6.5;
                  if (d < -2 && w < -5) return 3;
                  return 5;
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟣 DIMENSION 6: MACROECONOMIC
  // Books: Macroeconomics (Mankiw), Principles of Economics (Samuelson),
  //        Currency Wars (Rickards), The Alchemy of Finance (Soros)
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'macroeconomic',
    name: 'Macroeconomic',
    nameFa: 'Macroeconomic',
    color: '#a855f7',
    icon: 'Globe',
    references: [
      'Macroeconomics — Mankiw',
      'Principles of Economics — Samuelson',
      'Currency Wars — Rickards',
      'The Alchemy of Finance — Soros',
    ],
    subDimensions: [
      {
        key: 'macro_interest',
        name: 'Interest Rates & Monetary Policy',
        nameFa: 'Interest Rates & Monetary Policy',
        aspects: [
          {
            key: 'macro_int_policy',
            name: 'Fed Policy Impact',
            nameFa: 'Fed Policy Impact',
            subAspects: [
              {
                key: 'macro_int_policy_env',
                name: 'Rate Environment',
                nameFa: 'Rate Environment',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.treasury10y) {
                    // Lower rates = better for crypto; map 10Y rate inversely
                    return clamp(normalize(10 - ctx.macroIndicators.treasury10y.value, 0, 10));
                  }
                  return c.market_cap > 100e9 ? 8.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4;
                },
              },
              {
                key: 'macro_int_policy_dir',
                name: 'Policy Direction',
                nameFa: 'Policy Direction',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.treasury10y) {
                    // Falling rates = bullish for crypto
                    return clamp(normalize(-ctx.macroIndicators.treasury10y.change24h, -5, 5));
                  }
                  return clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10));
                },
              },
            ],
          },
          {
            key: 'macro_int_liquidity',
            name: 'Liquidity Conditions',
            nameFa: 'Liquidity Conditions',
            subAspects: [
              {
                key: 'macro_int_liq_market',
                name: 'Market Liquidity',
                nameFa: 'Market Liquidity',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.dxy) {
                    // Falling DXY = more liquidity for risk assets
                    return clamp(normalize(-ctx.macroIndicators.dxy.change24h, -3, 3));
                  }
                  const r = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(r, 0, 0.15));
                },
              },
              {
                key: 'macro_int_liq_risk',
                name: 'Risk Appetite',
                nameFa: 'Risk Appetite',
                scorer: (c, ctx) => {
                  // Use VIX for risk appetite when available
                  if (ctx.additionalMacro?.vix) {
                    const vix = ctx.additionalMacro.vix.value;
                    // VIX < 15 = low fear = high risk appetite, VIX > 30 = high fear = low risk appetite
                    return vix < 15 ? 8.5 : vix < 20 ? 7 : vix < 25 ? 5.5 : vix < 35 ? 3.5 : 2;
                  }
                  if (ctx.macroIndicators?.sp500) {
                    const spxChange = ctx.macroIndicators.sp500.change24h;
                    return spxChange > 1 ? 8 : spxChange > -1 ? 6 : 3;
                  }
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absPct < 3 ? 8 : absPct < 7 ? 6 : 3;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'macro_currency',
        name: 'Currency & Inflation',
        nameFa: 'Currency & Inflation',
        aspects: [
          {
            key: 'macro_curr_dollar',
            name: 'Dollar Strength Impact',
            nameFa: 'Dollar Strength Impact',
            subAspects: [
              {
                key: 'macro_curr_dxy',
                name: 'DXY Impact',
                nameFa: 'DXY Impact',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.dxy) {
                    // Lower DXY = bullish for crypto; DXY range typically 90-120
                    return clamp(normalize(120 - ctx.macroIndicators.dxy.value, 90, 120));
                  }
                  // Fallback: high mcap coins have stronger DXY inverse correlation
                  const mcap = c.market_cap || 0;
                  if (mcap > 50e9) return clamp(normalize(-(c.price_change_percentage_24h ?? 0), -10, 10));
                  return 5;
                },
              },
              {
                key: 'macro_curr_corr',
                name: 'Currency Correlation',
                nameFa: 'Currency Correlation',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.dxy) {
                    // Higher mcap coins have stronger inverse correlation with DXY
                    return c.market_cap > 100e9 ? 8 : c.market_cap > 10e9 ? 6 : 4.5;
                  }
                  return c.market_cap_rank <= 5 ? 8.5 : c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
            ],
          },
          {
            key: 'macro_curr_inflation',
            name: 'Inflation Impact',
            nameFa: 'Inflation Impact',
            subAspects: [
              {
                key: 'macro_curr_cpi',
                name: 'CPI Pressure',
                nameFa: 'CPI Pressure',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.treasury10y) {
                    // Higher rates = higher inflation pressure; crypto as inflation hedge
                    const rate = ctx.macroIndicators.treasury10y.value;
                    return rate > 4 ? 7 : rate > 2 ? 6 : 4.5;
                  }
                  return c.max_supply ? 8 : c.market_cap_rank <= 10 ? 7 : 4.5;
                },
              },
              {
                key: 'macro_curr_real_rate',
                name: 'Real Rate Score',
                nameFa: 'Real Rate Score',
                scorer: (c, ctx) => {
                  // Property-based: mcap as risk sensitivity proxy, price stability as stablecoin proxy
                  const isStablecoin = c.current_price > 0 && Math.abs(c.price_change_percentage_24h ?? 0) < 0.5 && c.market_cap > 1e9 && c.market_cap < 200e9;
                  if (ctx.macroIndicators?.treasury10y) {
                    // Low real rates favor risk assets like crypto
                    const rate = ctx.macroIndicators.treasury10y.value;
                    if (isStablecoin) return 4;
                    // Higher mcap = more rate-sensitive
                    if (c.market_cap > 50e9) return rate < 2 ? 8 : rate < 4 ? 7 : 5;
                    return rate < 2 ? 6.5 : rate < 4 ? 5.5 : 4;
                  }
                  if (isStablecoin) return 4;
                  if (c.market_cap > 50e9) return 7.5;
                  return 5.5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'macro_global',
        name: 'Global Markets Correlation',
        nameFa: 'Global Markets Correlation',
        aspects: [
          {
            key: 'macro_global_equity',
            name: 'Equity Correlation',
            nameFa: 'Equity Correlation',
            subAspects: [
              {
                key: 'macro_global_spx',
                name: 'SPX Correlation',
                nameFa: 'SPX Correlation',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.sp500) {
                    return clamp(normalize(ctx.macroIndicators.sp500.change24h, -5, 5));
                  }
                  return c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5;
                },
              },
              {
                key: 'macro_global_risk',
                name: 'Risk-On/Off',
                nameFa: 'Risk-On/Off',
                scorer: (c, ctx) => {
                  // Use NASDAQ + Russell 2000 + SPX for risk-on/off assessment
                  let riskScore = 5; // neutral baseline
                  let sources = 0;
                  if (ctx.macroIndicators?.sp500) {
                    riskScore += ctx.macroIndicators.sp500.change24h > 0 ? 1.5 : -1;
                    sources++;
                  }
                  if (ctx.additionalMacro?.nasdaq) {
                    riskScore += ctx.additionalMacro.nasdaq.change24h > 0 ? 1.5 : -1;
                    sources++;
                  }
                  if (ctx.additionalMacro?.russell2000) {
                    // Russell 2000 = small cap risk appetite
                    riskScore += ctx.additionalMacro.russell2000.change24h > 0 ? 1.5 : -1.5;
                    sources++;
                  }
                  if (sources > 0) return clamp(riskScore);
                  // Fallback: use VIX if available
                  if (ctx.additionalMacro?.vix) {
                    const vix = ctx.additionalMacro.vix.value;
                    return vix < 15 ? 8.5 : vix < 20 ? 7 : vix < 25 ? 5.5 : vix < 35 ? 3.5 : 2;
                  }
                  // Fallback: price-based proxy
                  if (ctx.macroIndicators?.sp500) {
                    return ctx.macroIndicators.sp500.change24h > 0 ? 7 : 3.5;
                  }
                  const v = c.price_change_percentage_24h ?? 0;
                  return v > 0 ? clamp(normalize(v, 0, 10) / 2 + 5) : clamp(normalize(v, -10, 0) / 2);
                },
              },
            ],
          },
          {
            key: 'macro_global_commodity',
            name: 'Commodity Link',
            nameFa: 'Commodity Link',
            subAspects: [
              {
                key: 'macro_global_gold',
                name: 'Gold Correlation',
                nameFa: 'Gold Correlation',
                scorer: (c, ctx) => {
                  if (ctx.macroIndicators?.gold) {
                    return clamp(normalize(ctx.macroIndicators.gold.change24h, -5, 5));
                  }
                  return c.market_cap > 500e9 ? 8 : c.market_cap_rank <= 5 ? 6.5 : 4;
                },
              },
              {
                key: 'macro_global_diverge',
                name: 'Macro Divergence',
                nameFa: 'Macro Divergence',
                scorer: (c, ctx) => {
                  // Use Copper, Oil correlations for divergence detection
                  let divergenceScore = 0;
                  let sources = 0;
                  const coinPct = c.price_change_percentage_24h ?? 0;
                  // Check divergence between crypto and commodities
                  if (ctx.macroIndicators?.gold) {
                    const goldDiff = Math.abs(coinPct - ctx.macroIndicators.gold.change24h);
                    divergenceScore += normalize(goldDiff, 0, 15);
                    sources++;
                  }
                  if (ctx.additionalMacro?.copper) {
                    // Copper = industrial demand proxy; divergence from copper = macro divergence
                    const copperDiff = Math.abs(coinPct - ctx.additionalMacro.copper.change24h);
                    divergenceScore += normalize(copperDiff, 0, 15);
                    sources++;
                  }
                  if (ctx.macroIndicators?.oil) {
                    // Oil = energy/inflation proxy; divergence from oil = macro divergence
                    const oilDiff = Math.abs(coinPct - ctx.macroIndicators.oil.change24h);
                    divergenceScore += normalize(oilDiff, 0, 15);
                    sources++;
                  }
                  if (sources > 0) return clamp(divergenceScore / sources);
                  // Fallback: price vs mcap divergence
                  const pricePct = c.price_change_percentage_24h ?? 0;
                  const mcapPct = c.market_cap_change_percentage_24h ?? 0;
                  const divergence = Math.abs(pricePct - mcapPct);
                  return clamp(normalize(divergence, 0, 10));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏛️ DIMENSION 7: REGULATORY
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'regulatory',
    name: 'Regulatory',
    nameFa: 'Regulatory',
    color: '#94a3b8',
    icon: 'Landmark',
    references: [
      'Crypto Regulation — Pirrong',
      'Digital Finance — Arner & Barberis',
      'Fintech Regulation — Buckley & Webster',
      'Cryptoassets & Legal Framework — Giannakouros',
    ],
    subDimensions: [
      {
        key: 'reg_jurisdiction',
        name: 'Jurisdiction Risk',
        nameFa: 'Jurisdiction Risk',
        aspects: [
          {
            key: 'reg_jur_us',
            name: 'US Regulatory',
            nameFa: 'US Regulatory',
            subAspects: [
              {
                key: 'reg_jur_us_sec',
                name: 'SEC Classification',
                nameFa: 'SEC Classification',
                scorer: (c, _ctx) => {
                  // Property-based: market cap as SEC classification clarity proxy
                  const mcap = c.market_cap || 0;
                  if (mcap > 100e9) return 9; // BTC/ETH-tier clarity
                  if (mcap > 10e9) return 7;
                  if (mcap > 1e9) return 5.5;
                  return 4;
                },
              },
              {
                key: 'reg_jur_us_comply',
                name: 'US Compliance',
                nameFa: 'US Compliance',
                scorer: (c, _ctx) => c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7 : c.market_cap > 1e9 ? 5.5 : 3.5,
              },
            ],
          },
          {
            key: 'reg_jur_global',
            name: 'Global Regulation',
            nameFa: 'Global Regulation',
            subAspects: [
              {
                key: 'reg_jur_eu',
                name: 'EU MiCA Score',
                nameFa: 'EU MiCA Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 20 ? 8 : c.market_cap_rank <= 50 ? 6 : 4,
              },
              {
                key: 'reg_jur_asia',
                name: 'Asia Regulatory',
                nameFa: 'Asia Regulatory',
                scorer: (c, _ctx) => {
                  // Property-based: high mcap + low volatility suggests Asia exchange listing
                  const mcap = c.market_cap || 0;
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  const highVolOnAsiaExchange = mcap > 5e9 && absPct < 10;
                  if (highVolOnAsiaExchange && mcap > 20e9) return 8;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'reg_legal',
        name: 'Legal Framework',
        nameFa: 'Legal Framework',
        aspects: [
          {
            key: 'reg_legal_clarity',
            name: 'Legal Clarity',
            nameFa: 'Legal Clarity',
            subAspects: [
              {
                key: 'reg_legal_classify',
                name: 'Classification Clarity',
                nameFa: 'Classification Clarity',
                scorer: (c, _ctx) => {
                  // Property-based: market cap as classification clarity proxy
                  const mcap = c.market_cap || 0;
                  if (mcap > 100e9) return 9;
                  if (mcap > 10e9) return 7;
                  return 4.5;
                },
              },
              {
                key: 'reg_legal_precedent',
                name: 'Legal Precedent',
                nameFa: 'Legal Precedent',
                scorer: (c, _ctx) => {
                  // Property-based: market cap + age proxy as legal precedent
                  const mcap = c.market_cap || 0;
                  if (mcap > 50e9) return 8.5;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
            ],
          },
          {
            key: 'reg_legal_enforce',
            name: 'Enforcement Risk',
            nameFa: 'Enforcement Risk',
            subAspects: [
              {
                key: 'reg_legal_history',
                name: 'Enforcement History',
                nameFa: 'Enforcement History',
                scorer: (c, _ctx) => {
                  // Property-based: mcap as enforcement history proxy; very low mcap + high volatility = risk
                  const mcap = c.market_cap || 0;
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  if (mcap > 100e9) return 9; // BTC/ETH: clear regulatory status
                  if (mcap < 500e6 && volRatio > 0.3) return 3; // Small + high volume = speculative risk
                  return mcap > 10e9 ? 7 : 5;
                },
              },
              {
                key: 'reg_legal_penalty',
                name: 'Penalty Risk',
                nameFa: 'Penalty Risk',
                scorer: (c, _ctx) => {
                  // Property-based: mcap as enforcement history proxy; very low mcap + high volatility = risk
                  const mcap = c.market_cap || 0;
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  if (mcap > 100e9) return 9; // BTC/ETH: clear regulatory status
                  if (mcap < 500e6 && volRatio > 0.3) return 3; // Small + high volume = speculative risk
                  return mcap > 10e9 ? 7 : 5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'reg_institutional',
        name: 'Institutional Access',
        nameFa: 'Institutional Access',
        aspects: [
          {
            key: 'reg_inst_access',
            name: 'ETF & Fund Access',
            nameFa: 'ETF & Fund Access',
            subAspects: [
              {
                key: 'reg_inst_etf',
                name: 'ETF Availability',
                nameFa: 'ETF Availability',
                scorer: (c, _ctx) => {
                  // Property-based: ETF availability based on mcap tier
                  const mcap = c.market_cap || 0;
                  if (mcap > 500e9) return 9;      // BTC-tier
                  if (mcap > 200e9) return 8.5;    // ETH-tier
                  if (mcap > 20e9) return 5;        // Possible future ETFs
                  return 3;
                },
              },
              {
                key: 'reg_inst_custody',
                name: 'Fund Custody',
                nameFa: 'Fund Custody',
                scorer: (c, _ctx) => c.market_cap_rank <= 5 ? 9 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
            ],
          },
          {
            key: 'reg_inst_compliance',
            name: 'Compliance Infrastructure',
            nameFa: 'Compliance Infrastructure',
            subAspects: [
              {
                key: 'reg_inst_aml',
                name: 'AML/KYC Score',
                nameFa: 'AML/KYC Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8.5 : c.market_cap_rank <= 30 ? 6.5 : 4,
              },
              {
                key: 'reg_inst_audit',
                name: 'Audit Score',
                nameFa: 'Audit Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 3.5,
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🛡️ DIMENSION 8: NETWORK SECURITY
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'network_security',
    name: 'Network Security',
    nameFa: 'Network Security',
    color: '#ea580c',
    icon: 'Shield',
    references: [
      'Mastering Bitcoin — Antonopoulos',
      'The Blockchain Security — Chen',
      'Crypto Security — Bonneau et al.',
      'Smart Contract Security — Atzei',
    ],
    subDimensions: [
      {
        key: 'sec_consensus',
        name: 'Consensus Security',
        nameFa: 'Consensus Security',
        aspects: [
          {
            key: 'sec_con_hash',
            name: 'Hash Rate / Staking',
            nameFa: 'Hash Rate / Staking',
            subAspects: [
              {
                key: 'sec_con_hash_rate',
                name: 'Hash Rate Score',
                nameFa: 'Hash Rate Score',
                scorer: (c, _ctx) => {
                  // Property-based: mcap as hash rate/staking security proxy
                  const mcap = c.market_cap || 0;
                  if (mcap > 500e9) return 9.5;  // BTC-tier PoW
                  if (mcap > 100e9) return 9;    // ETH-tier PoS
                  if (mcap > 5e9) return 8;      // Major PoS chains
                  return 5;
                },
              },
              {
                key: 'sec_con_staking',
                name: 'Staking Ratio',
                nameFa: 'Staking Ratio',
                scorer: (c, _ctx) => {
                  // Property-based: supply model + mcap as staking proxy
                  const mcap = c.market_cap || 0;
                  // Coins with max supply and high mcap (like BTC) have PoW staking equivalent
                  if (mcap > 500e9 && c.max_supply) return 7;
                  // Large cap PoS coins: use vol/mcap as participation ratio proxy
                  if (mcap > 5e9) {
                    const proxy = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                    return clamp(normalize(proxy, 0, 0.15));
                  }
                  return 5;
                },
              },
            ],
          },
          {
            key: 'sec_con_attack',
            name: 'Attack Resistance',
            nameFa: 'Attack Resistance',
            subAspects: [
              {
                key: 'sec_con_51',
                name: '51% Attack Cost',
                nameFa: '51% Attack Cost',
                scorer: (c, _ctx) => {
                  // Property-based: mcap as 51% attack cost proxy
                  const mcap = c.market_cap || 0;
                  if (mcap > 500e9) return 9.5;
                  if (mcap > 100e9) return 9;
                  return mcap > 10e9 ? 7 : 4;
                },
              },
              {
                key: 'sec_con_validator',
                name: 'Validator Decentralization',
                nameFa: 'Validator Decentralization',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
              },
            ],
          },
        ],
      },
      {
        key: 'sec_smart_contract',
        name: 'Smart Contract Security',
        nameFa: 'Smart Contract Security',
        aspects: [
          {
            key: 'sec_sc_code',
            name: 'Code Security',
            nameFa: 'Code Security',
            subAspects: [
              {
                key: 'sec_sc_audit',
                name: 'Audit Status',
                nameFa: 'Audit Status',
                scorer: (c, ctx) => {
                  // Property-based: TVL + mcap as audit status proxy (platforms with TVL have audits)
                  const tvl = getTVLForCoin(c, ctx);
                  const mcap = c.market_cap || 0;
                  if (tvl !== null && tvl > 1e9) return 8.5; // Platforms with TVL have audits
                  if (mcap > 10e9) return 6.5;
                  return 4;
                },
              },
              {
                key: 'sec_sc_bounty',
                name: 'Bug Bounty',
                nameFa: 'Bug Bounty',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 3.5,
              },
            ],
          },
          {
            key: 'sec_sc_exploit',
            name: 'Exploit History',
            nameFa: 'Exploit History',
            subAspects: [
              {
                key: 'sec_sc_hack',
                name: 'Hack Penalty',
                nameFa: 'Hack Penalty',
                scorer: (c, _ctx) => {
                  // Property-based: mcap + DeFi exposure as hack risk proxy
                  const mcap = c.market_cap || 0;
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  // Very large cap protocols (BTC/ETH) have never been hacked at protocol level
                  if (mcap > 100e9) return 9;
                  // DeFi tokens (high vol/mcap) have higher exploit risk
                  if (volRatio > 0.1 && mcap < 10e9) return 5.5;
                  return 7;
                },
              },
              {
                key: 'sec_sc_recover',
                name: 'Recovery Score',
                nameFa: 'Recovery Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
              },
            ],
          },
        ],
      },
      {
        key: 'sec_resilience',
        name: 'Network Resilience',
        nameFa: 'Network Resilience',
        aspects: [
          {
            key: 'sec_res_uptime',
            name: 'Uptime & Performance',
            nameFa: 'Uptime & Performance',
            subAspects: [
              {
                key: 'sec_res_up',
                name: 'Uptime Score',
                nameFa: 'Uptime Score',
                scorer: (c, ctx) => {
                  // Property-based: TVL + mcap as uptime proxy (larger networks = more uptime)
                  const mcap = c.market_cap || 0;
                  const tvl = getTVLForCoin(c, ctx);
                  if (mcap > 100e9) return 9.5;  // BTC/ETH-tier
                  if (tvl !== null && tvl > 1e9) return 8;  // L1s with TVL
                  if (tvl !== null && tvl > 100e6) return 7; // L2s with some TVL
                  return mcap > 5e9 ? 6 : 5.5;
                },
              },
              {
                key: 'sec_res_finality',
                name: 'Finality Score',
                nameFa: 'Finality Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
              },
            ],
          },
          {
            key: 'sec_res_decentral',
            name: 'Decentralization',
            nameFa: 'Decentralization',
            subAspects: [
              {
                key: 'sec_res_nodes',
                name: 'Node Distribution',
                nameFa: 'Node Distribution',
                scorer: (c, ctx) => {
                  // Property-based: TVL + mcap as node distribution proxy
                  const mcap = c.market_cap || 0;
                  const tvl = getTVLForCoin(c, ctx);
                  if (mcap > 100e9) return 9;
                  if (tvl !== null && tvl > 1e9) return 7.5;
                  return mcap > 5e9 ? 6 : 5;
                },
              },
              {
                key: 'sec_res_governance',
                name: 'Governance',
                nameFa: 'Governance',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 📈 DIMENSION 9: DERIVATIVES
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'derivatives',
    name: 'Derivatives',
    nameFa: 'Derivatives',
    color: '#06b6d4',
    icon: 'TrendingUp',
    references: [
      'Options Futures & Other Derivatives — Hull',
      'Trading Volatility — Natenberg',
      'Dynamic Hedging — Taleb',
      'Derivatives Markets — McDonald',
    ],
    subDimensions: [
      {
        key: 'deriv_funding',
        name: 'Funding Rates',
        nameFa: 'Funding Rates',
        aspects: [
          {
            key: 'deriv_fund_perp',
            name: 'Perpetual Funding',
            nameFa: 'Perpetual Funding',
            subAspects: [
              {
                key: 'deriv_fund_rate',
                name: 'Funding Rate Signal',
                nameFa: 'Funding Rate Signal',
                // High positive funding = overleveraged longs = bearish → score LOWER
                // Negative funding = overleveraged shorts = bullish → score HIGHER
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.fundingRate != null) {
                    return clamp(normalize(-deriv.fundingRate * 1000, -5, 5));
                  }
                  return clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10));
                },
              },
              {
                key: 'deriv_fund_trend',
                name: 'Funding Trend',
                nameFa: 'Funding Trend',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.fundingRate != null) {
                    // Use funding rate as trend proxy — sustained negative funding is bullish
                    return clamp(normalize(-deriv.fundingRate * 1000, -5, 5));
                  }
                  return clamp(normalize(c.price_change_percentage_7d_in_currency ?? 0, -20, 20));
                },
              },
            ],
          },
          {
            key: 'deriv_fund_basis',
            name: 'Basis & Spread',
            nameFa: 'Basis & Spread',
            subAspects: [
              {
                key: 'deriv_fund_basis_sig',
                name: 'Basis Signal',
                nameFa: 'Basis Signal',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.openInterest != null) {
                    return deriv.openInterest > 10e9 ? 8 : deriv.openInterest > 1e9 ? 6.5 : 4.5;
                  }
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcap > 0.1 ? 7 : volMcap > 0.05 ? 6 : 4;
                },
              },
              {
                key: 'deriv_fund_spread',
                name: 'Spread Score',
                nameFa: 'Spread Score',
                scorer: (c, _ctx) => {
                  if (c.current_price <= 0) return 5;
                  const spread = c.high_24h > 0 && c.low_24h > 0 ? (c.high_24h - c.low_24h) / c.current_price : 1;
                  return c.current_price > 1 && spread < 0.05 ? 8 : 5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'deriv_oi',
        name: 'Open Interest',
        nameFa: 'Open Interest',
        aspects: [
          {
            key: 'deriv_oi_dyn',
            name: 'OI Dynamics',
            nameFa: 'OI Dynamics',
            subAspects: [
              {
                key: 'deriv_oi_trend',
                name: 'OI Trend',
                nameFa: 'OI Trend',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.openInterest != null) {
                    return clamp(normalize(deriv.openInterest / 1e9, 0, 30));
                  }
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcap > 0.1 ? 8 : volMcap > 0.05 ? 6.5 : 4;
                },
              },
              {
                key: 'deriv_oi_ratio',
                name: 'OI/MCap Ratio',
                nameFa: 'OI/MCap Ratio',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.openInterest != null && c.market_cap > 0) {
                    const oiMcapRatio = deriv.openInterest / c.market_cap;
                    return clamp(normalize(oiMcapRatio, 0, 0.3));
                  }
                  return c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4;
                },
              },
            ],
          },
          {
            key: 'deriv_oi_liq',
            name: 'Liquidation Levels',
            nameFa: 'Liquidation Levels',
            subAspects: [
              {
                key: 'deriv_oi_heat',
                name: 'Liquidation Heat',
                nameFa: 'Liquidation Heat',
                scorer: (c, ctx) => {
                  // Use actual Coinglass liquidation data when available
                  if (ctx.coinglass) {
                    const symbolKey = c.symbol?.toUpperCase();
                    const liq = symbolKey === 'BTC' ? ctx.coinglass.btcLiquidation24h
                      : symbolKey === 'ETH' ? ctx.coinglass.ethLiquidation24h
                      : null;
                    if (liq !== null) {
                      // High liquidation volume = high heat
                      return liq > 500e6 ? 8.5 : liq > 200e6 ? 7.5 : liq > 100e6 ? 6 : liq > 50e6 ? 5 : 4;
                    }
                  }
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.fundingRate != null) {
                    const rate = Math.abs(deriv.fundingRate);
                    return rate > 0.001 ? 7.5 : rate > 0.0005 ? 6 : 4.5;
                  }
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absPct > 10 ? 7.5 : absPct > 5 ? 6 : 4.5;
                },
              },
              {
                key: 'deriv_oi_squeeze',
                name: 'Squeeze Potential',
                nameFa: 'Squeeze Potential',
                scorer: (c, ctx) => {
                  // Use liquidation volume as squeeze indicator when available
                  if (ctx.coinglass) {
                    const symbolKey = c.symbol?.toUpperCase();
                    const liq = symbolKey === 'BTC' ? ctx.coinglass.btcLiquidation24h
                      : symbolKey === 'ETH' ? ctx.coinglass.ethLiquidation24h
                      : null;
                    if (liq !== null && c.market_cap > 0) {
                      // High liq/mcap ratio = high squeeze potential
                      const liqRatio = liq / c.market_cap;
                      return clamp(normalize(liqRatio * 100, 0, 5));
                    }
                  }
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.fundingRate != null && deriv?.openInterest != null) {
                    const fundingExt = Math.abs(deriv.fundingRate) * 1000;
                    const oiLevel = deriv.openInterest / 1e9;
                    return clamp(normalize(fundingExt * oiLevel, 0, 15));
                  }
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  const raw = volMcap * absPct;
                  return clamp(normalize(raw, 0, 1.5));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'deriv_options',
        name: 'Options & Greeks',
        nameFa: 'Options & Greeks',
        aspects: [
          {
            key: 'deriv_opt_iv',
            name: 'Implied Volatility',
            nameFa: 'Implied Volatility',
            subAspects: [
              {
                key: 'deriv_opt_iv_level',
                name: 'IV Level',
                nameFa: 'IV Level',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.fundingRate != null) {
                    const absRate = Math.abs(deriv.fundingRate) * 1000;
                    return absRate < 1 ? 8 : absRate < 3 ? 6 : 3.5;
                  }
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absPct < 3 ? 8 : absPct < 7 ? 6 : 3.5;
                },
              },
              {
                key: 'deriv_opt_iv_skew',
                name: 'IV Skew',
                nameFa: 'IV Skew',
                scorer: (c, _ctx) => {
                  const range = c.high_24h - c.low_24h;
                  const pricePos = range > 0 ? (c.current_price - c.low_24h) / range : 0.5;
                  const skew = Math.abs(pricePos - 0.5) * 2;
                  return clamp(normalize(skew, 0, 1));
                },
              },
            ],
          },
          {
            key: 'deriv_opt_position',
            name: 'Market Positioning',
            nameFa: 'Market Positioning',
            subAspects: [
              {
                key: 'deriv_opt_ls',
                name: 'Long/Short Ratio',
                nameFa: 'Long/Short Ratio',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.longShortRatio != null) {
                    return clamp(normalize(deriv.longShortRatio - 0.5, -1, 1));
                  }
                  return clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10));
                },
              },
              {
                key: 'deriv_opt_pc',
                name: 'Put/Call Ratio',
                nameFa: 'Put/Call Ratio',
                scorer: (c, ctx) => {
                  const deriv = findDerivatives(c.id, ctx);
                  if (deriv?.takerBuyRatio != null) {
                    return clamp(normalize(deriv.takerBuyRatio - 0.5, -0.5, 0.5));
                  }
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const fearScore = absPct * volMcap;
                  return clamp(10 - normalize(fearScore, 0, 1.5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚓ DIMENSION 10: WHALE & SMART MONEY
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'whale_smart_money',
    name: 'Whale & Smart Money',
    nameFa: 'Whale & Smart Money',
    color: '#1e40af',
    icon: 'Anchor',
    references: [
      'The Whale and the Squid — Vicky',
      'Market Wizards — Schwager',
      'Institutional Investing — Pozen',
      'Smart Money — Zweig',
    ],
    subDimensions: [
      {
        key: 'whale_activity',
        name: 'Whale Activity',
        nameFa: 'Whale Activity',
        aspects: [
          {
            key: 'whale_act_large',
            name: 'Large Transactions',
            nameFa: 'Large Transactions',
            subAspects: [
              {
                key: 'whale_act_volume',
                name: 'Whale Volume',
                nameFa: 'Whale Volume',
                scorer: (c, _ctx) => c.total_volume > 5e9 ? 8.5 : c.total_volume > 1e9 ? 7 : c.total_volume > 500e6 ? 5.5 : 4,
              },
              {
                key: 'whale_act_freq',
                name: 'Whale Frequency',
                nameFa: 'Whale Frequency',
                scorer: (c, _ctx) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcap > 0.1 ? 8 : volMcap > 0.05 ? 6.5 : 4;
                },
              },
            ],
          },
          {
            key: 'whale_act_exchange',
            name: 'Exchange Flows',
            nameFa: 'Exchange Flows',
            subAspects: [
              {
                key: 'whale_act_inflow',
                name: 'Inflow/Outflow',
                nameFa: 'Inflow/Outflow',
                scorer: (c, _ctx) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(volMcap, 0, 0.15));
                },
              },
              {
                key: 'whale_act_net',
                name: 'Net Flow',
                nameFa: 'Net Flow',
                scorer: (c, _ctx) => {
                  const dir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                  const volNorm = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(dir * volNorm, -0.15, 0.15));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'whale_accumulation',
        name: 'Accumulation Patterns',
        nameFa: 'Accumulation Patterns',
        aspects: [
          {
            key: 'whale_acc_smart',
            name: 'Smart Money',
            nameFa: 'Smart Money',
            subAspects: [
              {
                key: 'whale_acc_signal',
                name: 'Accumulation Signal',
                nameFa: 'Accumulation Signal',
                scorer: (c, _ctx) => {
                  const pct = c.price_change_percentage_24h ?? 0;
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const declining = pct < 0;
                  const lowVol = volMcap < 0.05;
                  if (declining && lowVol) return 7;
                  if (!declining && !lowVol) return 4;
                  return 5.5;
                },
              },
              {
                key: 'whale_acc_dist',
                name: 'Distribution Signal',
                nameFa: 'Distribution Signal',
                scorer: (c, _ctx) => {
                  const pct = c.price_change_percentage_24h ?? 0;
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const rising = pct > 0;
                  const highVol = volMcap > 0.05;
                  if (rising && highVol) return 7;
                  return 5;
                },
              },
            ],
          },
          {
            key: 'whale_acc_miner',
            name: 'Miner Activity',
            nameFa: 'Miner Activity',
            subAspects: [
              {
                key: 'whale_acc_reserve',
                name: 'Miner Reserve',
                nameFa: 'Miner Reserve',
                scorer: (c, _ctx) => {
                  if (c.market_cap > 500e9) return 8;  // BTC has miner reserve
                  return c.market_cap_rank <= 5 ? 6.5 : 4.5;
                },
              },
              {
                key: 'whale_acc_sell',
                name: 'Miner Selling Pressure',
                nameFa: 'Miner Selling Pressure',
                scorer: (c, _ctx) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(10 - normalize(volMcap, 0, 0.15));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'whale_institutional',
        name: 'Institutional Flow',
        nameFa: 'Institutional Flow',
        aspects: [
          {
            key: 'whale_inst_fund',
            name: 'Fund Flows',
            nameFa: 'Fund Flows',
            subAspects: [
              {
                key: 'whale_inst_etf',
                name: 'ETF Flow',
                nameFa: 'ETF Flow',
                scorer: (c, _ctx) => {
                  // Property-based: ETF availability based on mcap tier
                  const mcap = c.market_cap || 0;
                  if (mcap > 500e9) return 9;
                  if (mcap > 200e9) return 8.5;
                  return c.market_cap_rank <= 10 ? 5.5 : 3;
                },
              },
              {
                key: 'whale_inst_score',
                name: 'Institutional Score',
                nameFa: 'Institutional Score',
                scorer: (c, _ctx) => c.market_cap > 50e9 ? 9 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 5.5 : 3.5,
              },
            ],
          },
          {
            key: 'whale_inst_wallet',
            name: 'Wallet Concentration',
            nameFa: 'Wallet Concentration',
            subAspects: [
              {
                key: 'whale_inst_top',
                name: 'Top Holder Score',
                nameFa: 'Top Holder Score',
                scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
              {
                key: 'whale_inst_distrib',
                name: 'Distribution Score',
                nameFa: 'Distribution Score',
                scorer: (c, _ctx) => {
                  if (c.max_supply && c.total_supply && c.circulating_supply / c.total_supply > 0.8) return 8;
                  return 5;
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🧬 DIMENSION 11: ECOSYSTEM & DEFI
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'ecosystem_defi',
    name: 'Ecosystem & DeFi',
    nameFa: 'Ecosystem & DeFi',
    color: '#10b981',
    icon: 'Layers',
    references: [
      'DeFi and the Future of Finance — Harvey et al.',
      'The Infinite Machine — Russo',
      'Web3 — Dixon',
      'Building Ethereum DApps — Dutta',
    ],
    subDimensions: [
      {
        key: 'eco_defi',
        name: 'DeFi Activity',
        nameFa: 'DeFi Activity',
        aspects: [
          {
            key: 'eco_defi_tvl',
            name: 'TVL Analysis',
            nameFa: 'TVL Analysis',
            subAspects: [
              { key: 'eco_defi_tvl_size', name: 'TVL Size Score', nameFa: 'TVL Size Score', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl) return chainTvl.tvl > 50e9 ? 9 : chainTvl.tvl > 10e9 ? 8 : chainTvl.tvl > 1e9 ? 6.5 : 4; return c.market_cap_rank <= 20 ? 6 : 4; } },
              { key: 'eco_defi_tvl_growth', name: 'TVL Growth', nameFa: 'TVL Growth', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl && chainTvl.change24h !== null) return clamp(normalize(chainTvl.change24h, -10, 10)); return clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)); } },
            ],
          },
          {
            key: 'eco_defi_protocol',
            name: 'Protocol Activity',
            nameFa: 'Protocol Activity',
            subAspects: [
              { key: 'eco_defi_active', name: 'Active Protocol Score', nameFa: 'Active Protocol Score', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl) return chainTvl.tvl > 5e9 ? 8.5 : chainTvl.tvl > 1e9 ? 7 : 5; const tvl = getTVLForCoin(c, ctx); if (tvl !== null) return tvl > 5e9 ? 8 : tvl > 1e9 ? 7 : 5; return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5); } },
              { key: 'eco_defi_revenue', name: 'Revenue Score', nameFa: 'Revenue Score', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl) return chainTvl.tvl > 10e9 ? 7.5 : chainTvl.tvl > 1e9 ? 6 : 4.5; const tvl = getTVLForCoin(c, ctx); if (tvl !== null) return tvl > 10e9 ? 7.5 : tvl > 1e9 ? 6 : 4.5; return clamp(mcapTierScore(c) * 0.4 + volumeQualityScore(c) * 0.6); } },
            ],
          },
        ],
      },
      {
        key: 'eco_developer',
        name: 'Developer Ecosystem',
        nameFa: 'Developer Ecosystem',
        aspects: [
          {
            key: 'eco_dev_activity',
            name: 'Development Activity',
            nameFa: 'Development Activity',
            subAspects: [
              { key: 'eco_dev_github', name: 'GitHub Activity', nameFa: 'GitHub Activity', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); if (tvl !== null && tvl > 1e9) return 9; return clamp(mcapTierScore(c) * 0.6 + volumeQualityScore(c) * 0.4); } },
              { key: 'eco_dev_contrib', name: 'Contributor Score', nameFa: 'Contributor Score', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); if (tvl !== null && tvl > 1e9) return 8.5; return clamp(mcapTierScore(c) * 0.6 + volumeQualityScore(c) * 0.4); } },
            ],
          },
          {
            key: 'eco_dev_breadth',
            name: 'Ecosystem Breadth',
            nameFa: 'Ecosystem Breadth',
            subAspects: [
              { key: 'eco_dev_dapp', name: 'DApp Count Score', nameFa: 'DApp Count Score', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); if (tvl !== null && tvl > 1e9) return 8; return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5); } },
              { key: 'eco_dev_integrate', name: 'Integration Score', nameFa: 'Integration Score', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); if (tvl !== null && tvl > 1e9) return 8.5; return clamp(mcapTierScore(c) * 0.6 + volumeQualityScore(c) * 0.4); } },
            ],
          },
        ],
      },
      {
        key: 'eco_crosschain',
        name: 'Cross-Chain Activity',
        nameFa: 'Cross-Chain Activity',
        aspects: [
          {
            key: 'eco_cross_bridge',
            name: 'Bridge Activity',
            nameFa: 'Bridge Activity',
            subAspects: [
              { key: 'eco_cross_tvl', name: 'Bridge TVL Score', nameFa: 'Bridge TVL Score', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl) return chainTvl.tvl > 10e9 ? 8.5 : chainTvl.tvl > 1e9 ? 7 : 4.5; const tvl = getTVLForCoin(c, ctx); if (tvl !== null) return tvl > 10e9 ? 8 : tvl > 1e9 ? 7 : 4.5; return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5); } },
              { key: 'eco_cross_volume', name: 'Bridge Volume Score', nameFa: 'Bridge Volume Score', scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4 },
            ],
          },
          {
            key: 'eco_cross_stable',
            name: 'Stablecoin Activity',
            nameFa: 'Stablecoin Activity',
            subAspects: [
              { key: 'eco_cross_stable_flow', name: 'Stablecoin Flow', nameFa: 'Stablecoin Flow', scorer: (c, ctx) => { const chainTvl = findChainTvl(c.id, ctx); if (chainTvl) return chainTvl.tvl > 5e9 ? 8.5 : chainTvl.tvl > 1e9 ? 7 : 4.5; const tvl = getTVLForCoin(c, ctx); if (tvl !== null) return tvl > 5e9 ? 8 : tvl > 1e9 ? 7 : 4.5; return clamp(mcapTierScore(c) * 0.5 + volumeQualityScore(c) * 0.5); } },
              { key: 'eco_cross_stable_pair', name: 'Stablecoin Pairing', nameFa: 'Stablecoin Pairing', scorer: (c, _ctx) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 4 },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🔗 DIMENSION 12: INTER-MARKET
  // ═══════════════════════════════════════════════════════════════
  {
    key: 'inter_market',
    name: 'Inter-Market',
    nameFa: 'Inter-Market',
    color: '#64748b',
    icon: 'Link',
    references: [
      'Intermarket Analysis — Murphy',
      'Market Wizards — Schwager',
      'Technical Analysis of Financial Markets — Murphy',
      'Relative Strength — Rosenberg',
    ],
    subDimensions: [
      {
        key: 'inter_structure',
        name: 'Market Structure',
        nameFa: 'Market Structure',
        aspects: [
          {
            key: 'inter_str_dominance',
            name: 'BTC Dominance',
            nameFa: 'BTC Dominance',
            subAspects: [
              { key: 'inter_str_dom_trend', name: 'Dominance Trend', nameFa: 'Dominance Trend', scorer: (c, _ctx) => { if (c.market_cap > 500e9) return 9; if (c.market_cap > 100e9) return 7.5; return clamp(normalize(11 - c.market_cap_rank, 1, 10)); } },
              { key: 'inter_str_alt_season', name: 'Alt Season Signal', nameFa: 'Alt Season Signal', scorer: (c, _ctx) => { const pp = c.price_change_percentage_24h ?? 0; const mp = c.market_cap_change_percentage_24h ?? 0; return clamp(normalize(Math.abs(pp - mp), 0, 10)); } },
            ],
          },
          {
            key: 'inter_str_rotation',
            name: 'Sector Rotation',
            nameFa: 'Sector Rotation',
            subAspects: [
              { key: 'inter_str_sector', name: 'Sector Momentum', nameFa: 'Sector Momentum', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); const isPlatform = tvl !== null && tvl > 500e6; if (ctx.macroIndicators?.sp500) { const spxUp = ctx.macroIndicators.sp500.change24h > 0; return isPlatform && spxUp ? 8 : isPlatform ? 5 : spxUp ? 6.5 : 4.5; } const r = (c.price_change_percentage_24h ?? 0) > 0; return isPlatform && r ? 8 : isPlatform ? 5 : r ? 6.5 : 4.5; } },
              { key: 'inter_str_rotate', name: 'Rotation Signal', nameFa: 'Rotation Signal', scorer: (c, _ctx) => { const pp = c.price_change_percentage_24h ?? 0; const mp = c.market_cap_change_percentage_24h ?? 0; return clamp(normalize(pp - mp, -10, 10)); } },
            ],
          },
        ],
      },
      {
        key: 'inter_correlation',
        name: 'Correlation Analysis',
        nameFa: 'Correlation Analysis',
        aspects: [
          {
            key: 'inter_corr_trad',
            name: 'Traditional Markets',
            nameFa: 'Traditional Markets',
            subAspects: [
              { key: 'inter_corr_equity', name: 'Equity Correlation', nameFa: 'Equity Correlation', scorer: (c, ctx) => {
                  // Use NASDAQ, Russell 2000 data for equity correlation
                  let corrScore = 5;
                  let sources = 0;
                  if (ctx.macroIndicators?.sp500) {
                    // If S&P up and coin up → positive equity correlation
                    const spxDir = ctx.macroIndicators.sp500.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    corrScore += (spxDir === coinDir ? 1.5 : -1);
                    sources++;
                  }
                  if (ctx.additionalMacro?.nasdaq) {
                    const nasdaqDir = ctx.additionalMacro.nasdaq.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    corrScore += (nasdaqDir === coinDir ? 1.5 : -1);
                    sources++;
                  }
                  if (ctx.additionalMacro?.russell2000) {
                    const russellDir = ctx.additionalMacro.russell2000.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    corrScore += (russellDir === coinDir ? 1 : -0.5);
                    sources++;
                  }
                  if (sources > 0) return clamp(corrScore);
                  // Fallback: mcap-based correlation proxy
                  const mcap = c.market_cap || 0;
                  return mcap > 50e9 ? 7.5 : mcap > 10e9 ? 6.5 : mcap > 1e9 ? 5.5 : 4;
                } },
              { key: 'inter_corr_gold', name: 'Gold Correlation', nameFa: 'Gold Correlation', scorer: (c, ctx) => {
                  // Use Gold, Copper, Oil data for commodity correlation
                  let corrScore = 5;
                  let sources = 0;
                  if (ctx.macroIndicators?.gold) {
                    const goldDir = ctx.macroIndicators.gold.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    // BTC has stronger gold correlation than other coins
                    const weight = c.market_cap > 100e9 ? 1.5 : 1;
                    corrScore += (goldDir === coinDir ? weight : -weight * 0.5);
                    sources++;
                  }
                  if (ctx.additionalMacro?.copper) {
                    const copperDir = ctx.additionalMacro.copper.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    corrScore += (copperDir === coinDir ? 0.8 : -0.4);
                    sources++;
                  }
                  if (ctx.macroIndicators?.oil) {
                    const oilDir = ctx.macroIndicators.oil.change24h > 0 ? 1 : -1;
                    const coinDir = (c.price_change_percentage_24h ?? 0) > 0 ? 1 : -1;
                    corrScore += (oilDir === coinDir ? 0.7 : -0.3);
                    sources++;
                  }
                  if (sources > 0) return clamp(corrScore);
                  // Fallback: BTC has stronger gold correlation
                  return c.market_cap > 100e9 ? 7.5 : c.market_cap > 10e9 ? 5.5 : 4;
                } },
            ],
          },
          {
            key: 'inter_corr_crypto',
            name: 'Crypto Internal',
            nameFa: 'Crypto Internal',
            subAspects: [
              { key: 'inter_corr_btc', name: 'BTC Correlation', nameFa: 'BTC Correlation', scorer: (c, _ctx) => c.market_cap_rank <= 5 ? 8 : c.market_cap_rank <= 20 ? 7 : 5 },
              { key: 'inter_corr_defi', name: 'DeFi Correlation', nameFa: 'DeFi Correlation', scorer: (c, ctx) => { const tvl = getTVLForCoin(c, ctx); if (tvl !== null && tvl > 1e9) return 8; return c.market_cap > 5e9 ? 6 : 4.5; } },
            ],
          },
        ],
      },
      {
        key: 'inter_strength',
        name: 'Relative Strength',
        nameFa: 'Relative Strength',
        aspects: [
          {
            key: 'inter_str_comp',
            name: 'Comparative Performance',
            nameFa: 'Comparative Performance',
            subAspects: [
              { key: 'inter_str_vs_btc', name: 'vs BTC Score', nameFa: 'vs BTC Score', scorer: (c, ctx) => { if (ctx.macroIndicators?.btcYfinance) { const btcChange = ctx.macroIndicators.btcYfinance.change24h; const coinChange = c.price_change_percentage_24h ?? 0; return clamp(normalize(coinChange - btcChange, -15, 15)); } const pp = c.price_change_percentage_24h ?? 0; const mp = c.market_cap_change_percentage_24h ?? 0; return clamp(normalize(pp - mp, -10, 10)); } },
              { key: 'inter_str_vs_sector', name: 'vs Sector Score', nameFa: 'vs Sector Score', scorer: (c, _ctx) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)) },
            ],
          },
          {
            key: 'inter_str_revert',
            name: 'Mean Reversion',
            nameFa: 'Mean Reversion',
            subAspects: [
              { key: 'inter_str_deviation', name: 'Deviation Score', nameFa: 'Deviation Score', scorer: (c, _ctx) => clamp(normalize(Math.abs(c.ath_change_percentage), 0, 80)) },
              { key: 'inter_str_revert_sig', name: 'Reversion Signal', nameFa: 'Reversion Signal', scorer: (c, _ctx) => { const d = Math.abs(c.ath_change_percentage); return d > 60 ? 8.5 : d > 40 ? 7 : d > 20 ? 5.5 : 3.5; } },
            ],
          },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// COIN-TO-CHAIN MAPPING (for DeFiLlama TVL lookup)
// ═══════════════════════════════════════════════════════════════

const COIN_TO_CHAIN_NAMES: Record<string, string[]> = {
  bitcoin: ['Bitcoin'],
  ethereum: ['Ethereum'],
  solana: ['Solana'],
  avalanche: ['Avalanche'],
  binancecoin: ['BSC'],
  polygon: ['Polygon'],
  arbitrum: ['Arbitrum'],
  optimism: ['Optimism'],
  sui: ['Sui'],
  cardano: ['Cardano'],
  polkadot: ['Polkadot'],
  cosmos: ['Cosmos'],
  near: ['NEAR Protocol', 'Aurora'],
  aptos: ['Aptos'],
  tron: ['Tron'],
  fantom: ['Fantom'],
  base: ['Base'],
};

// COIN-TO-DERIVATIVES MAPPING (for per-symbol Binance Futures data)
const COIN_TO_DERIV_SYMBOL: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  binancecoin: 'BNB',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  polkadot: 'DOT',
  'avalanche-2': 'AVAX',
  'matic-network': 'POL',
  chainlink: 'LINK',
  uniswap: 'UNI',
};

/**
 * Find the DeFiLlama chain TVL data for a given coin ID.
 */
function findChainTvl(coinId: string, ctx: ExternalDataContext): { tvl: number; change24h: number | null; change7d: number | null } | null {
  if (!ctx.defiLlama) return null;
  const chainNames = COIN_TO_CHAIN_NAMES[coinId];
  if (!chainNames) return null;
  for (const name of chainNames) {
    const chain = ctx.defiLlama.chains.find(ch => ch.name === name);
    if (chain) return chain;
  }
  return null;
}

/**
 * Find per-symbol derivatives data for a given coin ID.
 * Returns funding rate, open interest, long/short ratio, and taker buy ratio.
 */
function findDerivatives(coinId: string, ctx: ExternalDataContext): { fundingRate: number | null; openInterest: number | null; longShortRatio: number | null; takerBuyRatio: number | null } | null {
  // First check per-symbol derivatives data
  if (ctx.perSymbolDerivatives) {
    const derivSymbol = COIN_TO_DERIV_SYMBOL[coinId];
    if (derivSymbol && ctx.perSymbolDerivatives[derivSymbol]) {
      return ctx.perSymbolDerivatives[derivSymbol];
    }
  }
  // Fallback to BTC/ETH-specific data from original derivatives source
  if (coinId === 'bitcoin' && ctx.derivatives?.btcFundingRate != null) {
    return {
      fundingRate: ctx.derivatives.btcFundingRate,
      openInterest: ctx.derivatives.btcOpenInterest ?? null,
      longShortRatio: ctx.derivatives.btcLongShortRatio ?? null,
      takerBuyRatio: ctx.derivatives.btcTakerBuyRatio ?? null,
    };
  }
  if (coinId === 'ethereum' && ctx.derivatives?.ethFundingRate != null) {
    return {
      fundingRate: ctx.derivatives.ethFundingRate,
      openInterest: ctx.derivatives.ethOpenInterest ?? null,
      longShortRatio: null, // ETH long/short not available in original data
      takerBuyRatio: null,
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 5; // neutral score when range is zero — avoid NaN
  return ((value - min) / (max - min)) * 9 + 1;
}

function clamp(score: number): number {
  // Guard against NaN: if score is NaN, return neutral 5
  if (Number.isNaN(score) || !Number.isFinite(score)) return 5;
  return Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
}

/**
 * Calculate percentage change: ((current - previous) / previous) * 100
 * Returns 0 if previous is 0 to avoid division by zero.
 *
 * IMPORTANT: Returns a PERCENTAGE value (e.g., 24 means 24%, not 0.24).
 * Used for aiScoreChangePct, scoreChangePct at all hierarchy levels.
 * Frontend displays this directly with a "%" suffix — do NOT multiply by 100 again.
 */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  const result = Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  // Guard against NaN/Infinity
  if (Number.isNaN(result) || !Number.isFinite(result)) return 0;
  return result;
}

/**
 * Get yesterday's date string in YYYY-MM-DD format.
 */
function getYesterday(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT COEFFICIENTS
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize default equal-weight coefficients for all hierarchy nodes.
 */
function initDefaultCoefficients(): Record<string, number> {
  const coefficients: Record<string, number> = {};

  for (const dim of HIERARCHY) {
    coefficients[dim.key] = 1 / (HIERARCHY.length || 1);

    for (const subDim of dim.subDimensions) {
      const subDimKey = `${dim.key}.${subDim.key}`;
      coefficients[subDimKey] = 1 / (dim.subDimensions.length || 1);

      for (const aspect of subDim.aspects) {
        const aspectKey = `${dim.key}.${subDim.key}.${aspect.key}`;
        coefficients[aspectKey] = 1 / (subDim.aspects.length || 1);

        for (const subAspect of aspect.subAspects) {
          const saKey = `${dim.key}.${subDim.key}.${aspect.key}.${subAspect.key}`;
          coefficients[saKey] = 1 / (aspect.subAspects.length || 1);
        }
      }
    }
  }

  return coefficients;
}

/**
 * Get all hierarchy node keys at all levels.
 */
function getAllNodeKeys(): string[] {
  const keys: string[] = [];

  for (const dim of HIERARCHY) {
    keys.push(dim.key);

    for (const subDim of dim.subDimensions) {
      const subDimKey = `${dim.key}.${subDim.key}`;
      keys.push(subDimKey);

      for (const aspect of subDim.aspects) {
        const aspectKey = `${dim.key}.${subDim.key}.${aspect.key}`;
        keys.push(aspectKey);

        for (const subAspect of aspect.subAspects) {
          const saKey = `${dim.key}.${subDim.key}.${aspect.key}.${subAspect.key}`;
          keys.push(saKey);
        }
      }
    }
  }

  return keys;
}

// ═══════════════════════════════════════════════════════════════
// DB-Backed ML COEFFICIENT OPTIMIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Read yesterday's scores from ScoreHistory table.
 * Returns a map of "coinId.nodeKey" → score.
 */
async function readYesterdayScores(coinIds: string[], date: string): Promise<Map<string, number>> {
  const yesterday = getYesterday(date);
  const scoreMap = new Map<string, number>();

  if (coinIds.length === 0) return scoreMap;

  const rows = await db.scoreHistory.findMany({
    where: {
      date: yesterday,
      coinId: { in: coinIds },
    },
    select: {
      coinId: true,
      nodeKey: true,
      score: true,
    },
  });

  for (const row of rows) {
    scoreMap.set(`${row.coinId}.${row.nodeKey}`, row.score);
  }

  return scoreMap;
}

/**
 * ML Gradient Descent Coefficient Optimizer (DB-backed version).
 *
 * Same algorithm as V3 but reads/writes from database:
 * 1. For each hierarchy level, calculate correlation between score and actual price movement
 * 2. Apply gradient descent with learning rate proportional to correlation
 * 3. Constrain daily change to ±5% for stability
 * 4. Normalize dimension coefficients to sum to 1
 * 5. Store new coefficients in CoefficientHistory with incremented version
 */
async function optimizeCoefficientsDB(
  coins: CoinInput[],
  previousScores: Map<string, number>,
  currentCoefficients: Record<string, number>,
  currentVersion: number,
  date: string
): Promise<{ coefficients: Record<string, number>; predictionError: number; version: number }> {
  const newCoefficients = { ...currentCoefficients };
  let totalError = 0;

  const optimizeLevel = (
    keys: string[],
    _parentKey: string,
    learningRate: number
  ) => {
    let sum = 0;
    for (const key of keys) {
      let correlation = 0;
      let count = 0;

      for (const coin of coins) {
        const coinLookupId = coin.dbCoinId ?? coin.id;
        const prevScore = previousScores.get(`${coinLookupId}.${key}`);
        const actualMove = coin.price_change_percentage_24h ?? 0;

        if (prevScore !== undefined) {
          const predicted = prevScore > 5 ? 1 : prevScore < 5 ? -1 : 0;
          const actual = actualMove > 0 ? 1 : actualMove < 0 ? -1 : 0;
          correlation += predicted * actual;
          count++;
        }
      }

      if (count > 0) {
        correlation /= count;
        const gradient = correlation * learningRate;
        const currentWeight = newCoefficients[key] ?? 0.25;

        // Apply gradient with ±5% daily cap
        const maxDelta = currentWeight * 0.05;
        const delta = Math.max(-maxDelta, Math.min(maxDelta, gradient));
        newCoefficients[key] = Math.max(0.05, currentWeight + delta);
      }

      sum += newCoefficients[key] ?? 0;
      totalError += Math.abs(correlation);
    }

    // Normalize coefficients within this level to sum to 1
    if (sum > 0) {
      for (const key of keys) {
        newCoefficients[key] = (newCoefficients[key] ?? 0) / sum;
      }
    }
  };

  // Optimize each level
  for (const dim of HIERARCHY) {
    // Sub-dimension level
    const subDimKeys = dim.subDimensions.map(sd => `${dim.key}.${sd.key}`);
    optimizeLevel(subDimKeys, dim.key, 0.02);

    for (const subDim of dim.subDimensions) {
      // Aspect level
      const aspectKeys = subDim.aspects.map(a => `${dim.key}.${subDim.key}.${a.key}`);
      optimizeLevel(aspectKeys, `${dim.key}.${subDim.key}`, 0.015);

      for (const aspect of subDim.aspects) {
        // Sub-aspect level
        const saKeys = aspect.subAspects.map(sa => `${dim.key}.${subDim.key}.${aspect.key}.${sa.key}`);
        optimizeLevel(saKeys, `${dim.key}.${subDim.key}.${aspect.key}`, 0.01);
      }
    }
  }

  // Normalize dimension coefficients to sum to 1
  const dimSum = HIERARCHY.reduce((s, d) => s + (newCoefficients[d.key] ?? 0), 0);
  if (dimSum > 0) {
    for (const dim of HIERARCHY) {
      newCoefficients[dim.key] = (newCoefficients[dim.key] ?? 0) / dimSum;
    }
  }

  const newVersion = currentVersion + 1;

  // Store new coefficients in CoefficientHistory
  const yesterday = getYesterday(date);
  const allKeys = getAllNodeKeys();

  const coefficientRows = allKeys.map(nodeKey => ({
    nodeKey,
    date,
    version: newVersion,
    coefficient: newCoefficients[nodeKey] ?? 0.25,
    previousCoefficient: currentCoefficients[nodeKey] ?? null,
    coefficientChange: Math.round(((newCoefficients[nodeKey] ?? 0.25) - (currentCoefficients[nodeKey] ?? 0.25)) * 10000) / 10000,
    predictionError: totalError / HIERARCHY.length,
  }));

  // Batch upsert coefficients
  for (const row of coefficientRows) {
    await db.coefficientHistory.upsert({
      where: {
        nodeKey_date: { nodeKey: row.nodeKey, date: row.date },
      },
      update: {
        version: row.version,
        coefficient: row.coefficient,
        previousCoefficient: row.previousCoefficient,
        coefficientChange: row.coefficientChange,
        predictionError: row.predictionError,
      },
      create: row,
    });
  }

  return {
    coefficients: newCoefficients,
    predictionError: totalError / HIERARCHY.length,
    version: newVersion,
  };
}

// ═══════════════════════════════════════════════════════════════
// CORE SCORING LOGIC (pure computation, no DB)
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate full hierarchical score for a coin using provided coefficients.
 * This is the pure computation function — no side effects.
 */
function calculateCryptoScoreWithCoefficients(
  coin: CoinInput,
  coefficients: Record<string, number>,
  previousCoefficients: Record<string, number>,
  previousScores: Map<string, number>,
  version: number,
  externalData: ExternalDataContext = EMPTY_EXTERNAL_DATA
): CryptoScore {
  const coinLookupId = coin.dbCoinId ?? coin.id;

  const dimensions: Dimension[] = HIERARCHY.map((dimDef) => {
    const dimCoefficient = coefficients[dimDef.key] ?? (1 / (HIERARCHY.length || 1));
    const prevDimCoeff = previousCoefficients[dimDef.key] ?? dimCoefficient;

    const subDimensions: SubDimension[] = dimDef.subDimensions.map((subDef) => {
      const subCoeff = coefficients[`${dimDef.key}.${subDef.key}`] ?? (1 / (dimDef.subDimensions.length || 1));
      const prevSubCoeff = previousCoefficients[`${dimDef.key}.${subDef.key}`] ?? subCoeff;

      const aspects: Aspect[] = subDef.aspects.map((aspDef) => {
        const aspCoeff = coefficients[`${dimDef.key}.${subDef.key}.${aspDef.key}`] ?? (1 / (subDef.aspects.length || 1));
        const prevAspCoeff = previousCoefficients[`${dimDef.key}.${subDef.key}.${aspDef.key}`] ?? aspCoeff;

        const subAspects: SubAspect[] = aspDef.subAspects.map((saDef) => {
          const saNodeKey = `${dimDef.key}.${subDef.key}.${aspDef.key}.${saDef.key}`;
          const score = saDef.scorer(coin, externalData);
          const prevScore = previousScores.get(`${coinLookupId}.${saNodeKey}`) ?? score;
          const change = Math.round((score - prevScore) * 10) / 10;
          return {
            key: saDef.key,
            name: saDef.name,
            nameFa: saDef.nameFa,
            score,
            previousScore: Math.round(prevScore * 10) / 10,
            scoreChange: change,
            scoreChangePct: pctChange(score, prevScore),
          };
        });

        // Aspect score = weighted average of sub-aspects
        const saCount = aspDef.subAspects.length || 1; // guard against empty sub-aspects
        const aspectScore = subAspects.reduce((sum, sa) => {
          const saWeight = coefficients[`${dimDef.key}.${subDef.key}.${aspDef.key}.${sa.key}`] ?? (1 / saCount);
          return sum + sa.score * saWeight;
        }, 0);
        const aspNodeKey = `${dimDef.key}.${subDef.key}.${aspDef.key}`;
        const prevAspScore = previousScores.get(`${coinLookupId}.${aspNodeKey}`) ?? clamp(aspectScore);

        const aspScore = clamp(aspectScore);
        const aspChange = Math.round((aspScore - prevAspScore) * 10) / 10;
        return {
          key: aspDef.key,
          name: aspDef.name,
          nameFa: aspDef.nameFa,
          coefficient: Math.round(aspCoeff * 1000) / 1000,
          previousCoefficient: Math.round(prevAspCoeff * 1000) / 1000,
          coefficientChange: Math.round((aspCoeff - prevAspCoeff) * 10000) / 10000,
          score: aspScore,
          previousScore: Math.round(prevAspScore * 10) / 10,
          scoreChange: aspChange,
          scoreChangePct: pctChange(aspScore, prevAspScore),
          subAspects,
        };
      });

      // Sub-dimension score = weighted average of aspects
      const subDimScore = aspects.reduce((sum, asp) => sum + asp.score * asp.coefficient, 0);
      const subDimNodeKey = `${dimDef.key}.${subDef.key}`;
      const prevSubDimScore = previousScores.get(`${coinLookupId}.${subDimNodeKey}`) ?? clamp(subDimScore);

      const sdScore = clamp(subDimScore);
      const sdChange = Math.round((sdScore - prevSubDimScore) * 10) / 10;
      return {
        key: subDef.key,
        name: subDef.name,
        nameFa: subDef.nameFa,
        coefficient: Math.round(subCoeff * 1000) / 1000,
        previousCoefficient: Math.round(prevSubCoeff * 1000) / 1000,
        coefficientChange: Math.round((subCoeff - prevSubCoeff) * 10000) / 10000,
        score: sdScore,
        previousScore: Math.round(prevSubDimScore * 10) / 10,
        scoreChange: sdChange,
        scoreChangePct: pctChange(sdScore, prevSubDimScore),
        aspects,
      };
    });

    // Dimension score = weighted average of sub-dimensions
    const dimScore = subDimensions.reduce((sum, sd) => sum + sd.score * sd.coefficient, 0);
    const prevDimScore = previousScores.get(`${coinLookupId}.${dimDef.key}`) ?? clamp(dimScore);

    const dScore = clamp(dimScore);
    const dChange = Math.round((dScore - prevDimScore) * 10) / 10;
    return {
      key: dimDef.key,
      name: dimDef.name,
      nameFa: dimDef.nameFa,
      color: dimDef.color,
      icon: dimDef.icon,
      coefficient: Math.round(dimCoefficient * 1000) / 1000,
      previousCoefficient: Math.round(prevDimCoeff * 1000) / 1000,
      coefficientChange: Math.round((dimCoefficient - prevDimCoeff) * 10000) / 10000,
      score: dScore,
      previousScore: Math.round(prevDimScore * 10) / 10,
      scoreChange: dChange,
      scoreChangePct: pctChange(dScore, prevDimScore),
      subDimensions,
      references: dimDef.references,
    };
  });

  // Final AI Score = weighted sum of dimension scores × dimension coefficients
  let aiScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * dim.coefficient, 0) * 10
  ) / 10;

  // Clamp to valid 1-10 range (guard against floating-point drift)
  aiScore = Math.max(1, Math.min(10, aiScore));
  if (Number.isNaN(aiScore) || !Number.isFinite(aiScore)) aiScore = 5;

  let previousAiScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.previousScore * dim.previousCoefficient, 0) * 10
  ) / 10;

  // Clamp previous score too
  previousAiScore = Math.max(1, Math.min(10, previousAiScore));
  if (Number.isNaN(previousAiScore) || !Number.isFinite(previousAiScore)) previousAiScore = aiScore;

  const confidence: 'high' | 'medium' | 'low' =
    coin.market_cap_rank <= 10 ? 'high' :
    coin.market_cap_rank <= 30 ? 'medium' : 'low';

  return {
    coinId: coin.id,
    aiScore,
    previousAiScore,
    aiScoreChange: Math.round((aiScore - previousAiScore) * 10) / 10,
    aiScoreChangePct: pctChange(aiScore, previousAiScore),
    dimensions,
    confidence,
    lastUpdated: new Date().toISOString(),
    coefficientVersion: version,
  };
}

// ═══════════════════════════════════════════════════════════════
// DB-BACKED PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * A. Compute scores for all coins, optimize coefficients via ML,
 *    and persist everything to the database.
 *
 *    Steps:
 *    1. Read yesterday's coefficients from CoefficientHistory (or defaults)
 *    2. Read yesterday's scores from ScoreHistory
 *    3. Run ML coefficient optimization
 *    4. Compute today's scores using the new coefficients
 *    5. Store results in ScoreHistory, CoinDailyScore, CoefficientHistory
 *    6. Return CryptoScore array for frontend compatibility
 */
export async function computeAndStoreScores(
  coinInput: CoinInput[],
  date: string,
  externalData: ExternalDataContext = EMPTY_EXTERNAL_DATA
): Promise<CryptoScore[]> {
  // ── Step 1: Resolve coin DB IDs ──
  const coinIdMap = new Map<string, string>(); // coingeckoId → dbCoinId

  for (const coin of coinInput) {
    if (coin.dbCoinId) {
      coinIdMap.set(coin.id, coin.dbCoinId);
    } else {
      const dbCoin = await db.coin.findUnique({
        where: { coingeckoId: coin.id },
        select: { id: true },
      });
      if (dbCoin) {
        coinIdMap.set(coin.id, dbCoin.id);
        coin.dbCoinId = dbCoin.id;
      } else {
        // Create the coin if it doesn't exist yet
        const newCoin = await db.coin.create({
          data: {
            coingeckoId: coin.id,
            symbol: coin.symbol,
            name: coin.name,
          },
        });
        coinIdMap.set(coin.id, newCoin.id);
        coin.dbCoinId = newCoin.id;
      }
    }
  }

  // ── Step 2: Read yesterday's coefficients ──
  const yesterday = getYesterday(date);
  const coeffRows = await db.coefficientHistory.findMany({
    where: { date: yesterday },
  });

  let currentCoefficients: Record<string, number>;
  let currentVersion: number;

  if (coeffRows.length > 0) {
    currentCoefficients = initDefaultCoefficients(); // start with defaults
    let maxVersion = 0;
    for (const row of coeffRows) {
      currentCoefficients[row.nodeKey] = row.coefficient;
      if (row.version > maxVersion) maxVersion = row.version;
    }
    currentVersion = maxVersion;
  } else {
    currentCoefficients = initDefaultCoefficients();
    currentVersion = 0;
  }

  // ── Step 3: Read yesterday's scores ──
  const dbCoinIds = Array.from(coinIdMap.values());
  const previousScores = await readYesterdayScores(dbCoinIds, date);

  // ── Step 4: ML coefficient optimization ──
  const optimizationResult = await optimizeCoefficientsDB(
    coinInput,
    previousScores,
    currentCoefficients,
    currentVersion,
    date
  );

  const { coefficients: newCoefficients, version: newVersion } = optimizationResult;

  // ── Step 5: Compute today's scores using new coefficients ──
  const cryptoScores: CryptoScore[] = [];

  for (const coin of coinInput) {
    const score = calculateCryptoScoreWithCoefficients(
      coin,
      newCoefficients,
      currentCoefficients,
      previousScores,
      newVersion,
      externalData
    );
    cryptoScores.push(score);

    // ── Step 6a: Store ScoreHistory rows ──
    const dbCoinId = coinIdMap.get(coin.id)!;

    // Collect all score rows for this coin
    const scoreRows: Array<{
      coinId: string;
      nodeKey: string;
      date: string;
      score: number;
      previousScore: number | null;
      scoreChange: number | null;
      coefficient: number | null;
    }> = [];

    for (const dim of score.dimensions) {
      // Dimension level
      scoreRows.push({
        coinId: dbCoinId,
        nodeKey: dim.key,
        date,
        score: dim.score,
        previousScore: dim.previousScore !== dim.score ? dim.previousScore : null,
        scoreChange: dim.scoreChange !== 0 ? dim.scoreChange : null,
        coefficient: dim.coefficient,
      });

      for (const subDim of dim.subDimensions) {
        const subDimNodeKey = `${dim.key}.${subDim.key}`;
        scoreRows.push({
          coinId: dbCoinId,
          nodeKey: subDimNodeKey,
          date,
          score: subDim.score,
          previousScore: subDim.previousScore !== subDim.score ? subDim.previousScore : null,
          scoreChange: subDim.scoreChange !== 0 ? subDim.scoreChange : null,
          coefficient: subDim.coefficient,
        });

        for (const asp of subDim.aspects) {
          const aspNodeKey = `${dim.key}.${subDim.key}.${asp.key}`;
          scoreRows.push({
            coinId: dbCoinId,
            nodeKey: aspNodeKey,
            date,
            score: asp.score,
            previousScore: asp.previousScore !== asp.score ? asp.previousScore : null,
            scoreChange: asp.scoreChange !== 0 ? asp.scoreChange : null,
            coefficient: asp.coefficient,
          });

          for (const sa of asp.subAspects) {
            const saNodeKey = `${dim.key}.${subDim.key}.${asp.key}.${sa.key}`;
            scoreRows.push({
              coinId: dbCoinId,
              nodeKey: saNodeKey,
              date,
              score: sa.score,
              previousScore: sa.previousScore !== sa.score ? sa.previousScore : null,
              scoreChange: sa.scoreChange !== 0 ? sa.scoreChange : null,
              coefficient: null, // sub-aspects don't have their own coefficient stored here
            });
          }
        }
      }
    }

    // Batch upsert score history using createMany for performance
    if (scoreRows.length > 0) {
      try {
        await db.scoreHistory.createMany({
          data: scoreRows,
          skipDuplicates: true,
        });
      } catch {
        // Fall back to individual upserts if createMany fails
        for (const row of scoreRows) {
          await db.scoreHistory.upsert({
            where: {
              coinId_nodeKey_date: {
                coinId: row.coinId,
                nodeKey: row.nodeKey,
                date: row.date,
              },
            },
            update: {
              score: row.score,
              previousScore: row.previousScore,
              scoreChange: row.scoreChange,
              coefficient: row.coefficient,
            },
            create: row,
          });
        }
      }
    }

    // ── Step 6b: Store CoinDailyScore ──
    const dimensionScores: Record<string, number> = {};
    for (const dim of score.dimensions) {
      dimensionScores[dim.key] = dim.score;
    }

    // Map of dimension keys to CoinDailyScore fields
    const dimensionFieldMap: Record<string, string> = {
      fundamental: 'fundamentalScore',
      technical: 'technicalScore',
      onchain: 'onchainScore',
      market_psychology: 'marketScore',
      news_sentiment: 'newsSentimentScore',
      macroeconomic: 'macroeconomicScore',
      regulatory: 'regulatoryScore',
      network_security: 'networkSecurityScore',
      derivatives: 'derivativesScore',
      whale_smart_money: 'whaleSmartMoneyScore',
      ecosystem_defi: 'ecosystemDefiScore',
      inter_market: 'interMarketScore',
    };

    const dimensionFields: Record<string, number | null> = {};
    for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
      dimensionFields[fieldName] = dimensionScores[dimKey] ?? null;
    }

    await db.coinDailyScore.upsert({
      where: {
        coinId_date: { coinId: dbCoinId, date },
      },
      update: {
        aiScore: score.aiScore,
        previousAiScore: score.previousAiScore,
        aiScoreChange: score.aiScoreChange,
        confidence: score.confidence,
        coefficientVersion: newVersion,
        ...dimensionFields,
      },
      create: {
        coinId: dbCoinId,
        date,
        aiScore: score.aiScore,
        previousAiScore: score.previousAiScore,
        aiScoreChange: score.aiScoreChange,
        confidence: score.confidence,
        coefficientVersion: newVersion,
        ...dimensionFields,
      },
    });
  }

  // CoefficientHistory already stored in optimizeCoefficientsDB

  return cryptoScores;
}

/**
 * B. Get score history for a specific coin and hierarchy node.
 *    Returns sorted by date ascending.
 */
export async function getCoinScoreHistory(
  coinId: string,
  nodeKey: string,
  days: number
): Promise<Array<{ date: string; score: number; coefficient: number }>> {
  // Resolve coinId to DB id
  const dbCoin = await db.coin.findUnique({
    where: { coingeckoId: coinId },
    select: { id: true },
  });

  if (!dbCoin) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rows = await db.scoreHistory.findMany({
    where: {
      coinId: dbCoin.id,
      nodeKey,
      date: { gte: startDateStr },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      score: true,
      coefficient: true,
    },
  });

  return rows.map(r => ({
    date: r.date,
    score: r.score,
    coefficient: r.coefficient ?? 0,
  }));
}

/**
 * B2. Get overall AI score history for a specific coin from CoinDailyScore.
 *     Used when nodeKey="overall" to show the top-level score trend.
 *     Returns sorted by date ascending.
 */
export async function getCoinOverallScoreHistory(
  coinId: string,
  days: number
): Promise<Array<{ date: string; score: number }>> {
  // Resolve coinId to DB id
  const dbCoin = await db.coin.findUnique({
    where: { coingeckoId: coinId },
    select: { id: true },
  });

  if (!dbCoin) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rows = await db.coinDailyScore.findMany({
    where: {
      coinId: dbCoin.id,
      date: { gte: startDateStr },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      aiScore: true,
    },
  });

  // aiScore is already in 1-10 scale (weighted sum of 1-10 dimension scores)
  return rows.map(r => ({
    date: r.date,
    score: r.aiScore,
  }));
}

/**
 * C. Get coefficient history for a hierarchy node.
 *    Returns sorted by date ascending.
 */
export async function getCoefficientHistory(
  nodeKey: string,
  days: number
): Promise<Array<{ date: string; coefficient: number; coefficientChange: number; predictionError: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rows = await db.coefficientHistory.findMany({
    where: {
      nodeKey,
      date: { gte: startDateStr },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      coefficient: true,
      coefficientChange: true,
      predictionError: true,
    },
  });

  return rows.map(r => ({
    date: r.date,
    coefficient: r.coefficient,
    coefficientChange: r.coefficientChange,
    predictionError: r.predictionError ?? 0,
  }));
}

/**
 * D. Get the most recent scores from the database.
 *    Reconstructs the full Dimension[] structure from ScoreHistory rows.
 *    Used by the overview API to avoid recomputing scores every time.
 */
export async function getLatestScores(
  coinIds: string[]
): Promise<Map<string, CryptoScore>> {
  const result = new Map<string, CryptoScore>();

  if (coinIds.length === 0) return result;

  // Resolve coingeckoIds to DB coin ids
  const coins = await db.coin.findMany({
    where: { coingeckoId: { in: coinIds } },
    select: { id: true, coingeckoId: true, symbol: true, name: true },
  });

  const coinById = new Map(coins.map(c => [c.id, c]));
  const dbCoinIds = coins.map(c => c.id);

  if (dbCoinIds.length === 0) return result;

  // Get the most recent date from CoinDailyScore that is NOT in the future
  const today = new Date().toISOString().split('T')[0];
  const latestEntry = await db.coinDailyScore.findFirst({
    where: {
      coinId: { in: dbCoinIds },
      date: { lte: today },
    },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latestEntry) return result;

  const latestDate = latestEntry.date;

  // Also get the previous date for proper delta computation
  const previousDate = await db.coinDailyScore.findFirst({
    where: {
      coinId: { in: dbCoinIds },
      date: { lt: latestDate },
    },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  // Get all CoinDailyScore rows for this date
  const dailyScores = await db.coinDailyScore.findMany({
    where: {
      coinId: { in: dbCoinIds },
      date: latestDate,
    },
  });

  // Get all ScoreHistory rows for this date
  const scoreHistories = await db.scoreHistory.findMany({
    where: {
      coinId: { in: dbCoinIds },
      date: latestDate,
    },
  });

  // Get coefficient history for this date
  const coeffHistories = await db.coefficientHistory.findMany({
    where: { date: latestDate },
  });

  // Build coefficient map
  const coeffMap = new Map<string, { coefficient: number; previousCoefficient: number | null; coefficientChange: number }>();
  for (const ch of coeffHistories) {
    coeffMap.set(ch.nodeKey, {
      coefficient: ch.coefficient,
      previousCoefficient: ch.previousCoefficient,
      coefficientChange: ch.coefficientChange,
    });
  }

  // Build score map per coin: nodeKey → { score, previousScore, scoreChange, coefficient }
  const scoreMapByCoin = new Map<string, Map<string, { score: number; previousScore: number | null; scoreChange: number | null; coefficient: number | null }>>();

  for (const sh of scoreHistories) {
    if (!scoreMapByCoin.has(sh.coinId)) {
      scoreMapByCoin.set(sh.coinId, new Map());
    }
    scoreMapByCoin.get(sh.coinId)!.set(sh.nodeKey, {
      score: sh.score,
      previousScore: sh.previousScore,
      scoreChange: sh.scoreChange,
      coefficient: sh.coefficient,
    });
  }

  // Reconstruct CryptoScore for each coin
  for (const dailyScore of dailyScores) {
    const coinInfo = coinById.get(dailyScore.coinId);
    if (!coinInfo) continue;

    const coinScores = scoreMapByCoin.get(dailyScore.coinId);
    if (!coinScores) continue;

    const dimensions: Dimension[] = HIERARCHY.map(dimDef => {
      const dimData = coinScores.get(dimDef.key);
      const dimCoeff = coeffMap.get(dimDef.key);

      const subDimensions: SubDimension[] = dimDef.subDimensions.map(subDef => {
        const subDimKey = `${dimDef.key}.${subDef.key}`;
        const subDimData = coinScores.get(subDimKey);
        const subDimCoeff = coeffMap.get(subDimKey);

        const aspects: Aspect[] = subDef.aspects.map(aspDef => {
          const aspKey = `${dimDef.key}.${subDef.key}.${aspDef.key}`;
          const aspData = coinScores.get(aspKey);
          const aspCoeff = coeffMap.get(aspKey);

          const subAspects: SubAspect[] = aspDef.subAspects.map(saDef => {
            const saKey = `${dimDef.key}.${subDef.key}.${aspDef.key}.${saDef.key}`;
            const saData = coinScores.get(saKey);
            const saScore = saData?.score ?? 5;
            const saPrevScore = saData?.previousScore ?? saScore;
            const saChange = saData?.scoreChange ?? 0;
            return {
              key: saDef.key,
              name: saDef.name,
              nameFa: saDef.nameFa,
              score: saScore,
              previousScore: saPrevScore,
              scoreChange: saChange,
              scoreChangePct: pctChange(saScore, saPrevScore),
            };
          });

          const aspScore = aspData?.score ?? 5;
          const aspPrevScore = aspData?.previousScore ?? aspScore;
          const aspChange = aspData?.scoreChange ?? 0;
          return {
            key: aspDef.key,
            name: aspDef.name,
            nameFa: aspDef.nameFa,
            coefficient: aspCoeff?.coefficient ?? aspData?.coefficient ?? 0.25,
            previousCoefficient: aspCoeff?.previousCoefficient ?? aspCoeff?.coefficient ?? 0.25,
            coefficientChange: aspCoeff?.coefficientChange ?? 0,
            score: aspScore,
            previousScore: aspPrevScore,
            scoreChange: aspChange,
            scoreChangePct: pctChange(aspScore, aspPrevScore),
            subAspects,
          };
        });

        const sdScore = subDimData?.score ?? 5;
        const sdPrevScore = subDimData?.previousScore ?? sdScore;
        const sdChange = subDimData?.scoreChange ?? 0;
        return {
          key: subDef.key,
          name: subDef.name,
          nameFa: subDef.nameFa,
          coefficient: subDimCoeff?.coefficient ?? subDimData?.coefficient ?? 0.25,
          previousCoefficient: subDimCoeff?.previousCoefficient ?? subDimCoeff?.coefficient ?? 0.25,
          coefficientChange: subDimCoeff?.coefficientChange ?? 0,
          score: sdScore,
          previousScore: sdPrevScore,
          scoreChange: sdChange,
          scoreChangePct: pctChange(sdScore, sdPrevScore),
          aspects,
        };
      });

      const dScore = dimData?.score ?? 5;
      const dPrevScore = dimData?.previousScore ?? dScore;
      const dChange = dimData?.scoreChange ?? 0;
      return {
        key: dimDef.key,
        name: dimDef.name,
        nameFa: dimDef.nameFa,
        color: dimDef.color,
        icon: dimDef.icon,
        coefficient: dimCoeff?.coefficient ?? dimData?.coefficient ?? 0.25,
        previousCoefficient: dimCoeff?.previousCoefficient ?? dimCoeff?.coefficient ?? 0.25,
        coefficientChange: dimCoeff?.coefficientChange ?? 0,
        score: dScore,
        previousScore: dPrevScore,
        scoreChange: dChange,
        scoreChangePct: pctChange(dScore, dPrevScore),
        subDimensions,
        references: dimDef.references,
      };
    });

    const aiScore = dailyScore.aiScore;

    // Try to get the actual previous day's score for better delta computation
    let prevAiScore = dailyScore.previousAiScore ?? aiScore;
    let aiScoreChange = dailyScore.aiScoreChange ?? 0;

    // If the stored delta is 0, try to compute from the previous day's record
    if (aiScoreChange === 0 && previousDate) {
      const prevDayScore = await db.coinDailyScore.findUnique({
        where: { coinId_date: { coinId: dailyScore.coinId, date: previousDate.date } },
        select: { aiScore: true },
      });
      if (prevDayScore && prevDayScore.aiScore !== aiScore) {
        prevAiScore = prevDayScore.aiScore;
        aiScoreChange = Math.round((aiScore - prevAiScore) * 100) / 100;
      }
    }

    const aiScoreChangePct = pctChange(aiScore, prevAiScore);

    result.set(coinInfo.coingeckoId, {
      coinId: coinInfo.coingeckoId,
      aiScore,
      previousAiScore: prevAiScore,
      aiScoreChange,
      aiScoreChangePct,
      dimensions,
      confidence: dailyScore.confidence as 'high' | 'medium' | 'low',
      lastUpdated: latestDate,
      coefficientVersion: dailyScore.coefficientVersion,
    });
  }

  return result;
}

/**
 * E. Get the latest score and coefficient with their delta values for a specific node.
 */
export async function getScoreDelta(
  coinId: string,
  nodeKey: string
): Promise<{
  score: number;
  previousScore: number;
  scoreChange: number;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
}> {
  // Resolve coinId
  const dbCoin = await db.coin.findUnique({
    where: { coingeckoId: coinId },
    select: { id: true },
  });

  if (!dbCoin) {
    return {
      score: 0,
      previousScore: 0,
      scoreChange: 0,
      coefficient: 0,
      previousCoefficient: 0,
      coefficientChange: 0,
    };
  }

  // Get latest score entry
  const latestScore = await db.scoreHistory.findFirst({
    where: { coinId: dbCoin.id, nodeKey },
    orderBy: { date: 'desc' },
  });

  // Get latest coefficient entry
  const latestCoeff = await db.coefficientHistory.findFirst({
    where: { nodeKey },
    orderBy: { date: 'desc' },
  });

  return {
    score: latestScore?.score ?? 0,
    previousScore: latestScore?.previousScore ?? latestScore?.score ?? 0,
    scoreChange: latestScore?.scoreChange ?? 0,
    coefficient: latestCoeff?.coefficient ?? 0,
    previousCoefficient: latestCoeff?.previousCoefficient ?? latestCoeff?.coefficient ?? 0,
    coefficientChange: latestCoeff?.coefficientChange ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY EXPORTS (same interface as V3)
// ═══════════════════════════════════════════════════════════════

/**
 * Get dimension definitions for UI.
 */
export function getDimensionDefinitions(): Array<{
  key: string;
  name: string;
  nameFa: string;
  coefficient: number;
  color: string;
  icon: string;
  references: string[];
}> {
  const defaults = initDefaultCoefficients();
  return HIERARCHY.map((dim) => ({
    key: dim.key,
    name: dim.name,
    nameFa: dim.nameFa,
    coefficient: defaults[dim.key],
    color: dim.color,
    icon: dim.icon,
    references: dim.references,
  }));
}

/**
 * Get the full hierarchy definition.
 */
export function getFullHierarchy(): HierarchyDef[] {
  return HIERARCHY;
}

/**
 * Count total nodes in the hierarchy at each level.
 */
export function getHierarchyStats(): {
  dimensions: number;
  subDimensions: number;
  aspects: number;
  subAspects: number;
  totalCoefficients: number;
} {
  let subDimensions = 0;
  let aspects = 0;
  let subAspects = 0;

  for (const dim of HIERARCHY) {
    subDimensions += dim.subDimensions.length;
    for (const subDim of dim.subDimensions) {
      aspects += subDim.aspects.length;
      for (const aspect of subDim.aspects) {
        subAspects += aspect.subAspects.length;
      }
    }
  }

  return {
    dimensions: HIERARCHY.length,
    subDimensions,
    aspects,
    subAspects,
    totalCoefficients: getAllNodeKeys().length,
  };
}

/**
 * Synchronous score calculation (for backward compatibility / fallback).
 * Uses default coefficients and simulates previous values.
 */
export function calculateCryptoScore(coin: CoinInput, externalData: ExternalDataContext = EMPTY_EXTERNAL_DATA): CryptoScore {
  const coefficients = initDefaultCoefficients();
  const previousScores = new Map<string, number>();
  return calculateCryptoScoreWithCoefficients(coin, coefficients, coefficients, previousScores, 1, externalData);
}

/**
 * Calculate scores for multiple coins at once (synchronous fallback).
 */
export function calculateBatchScores(coins: CoinInput[], externalData: ExternalDataContext = EMPTY_EXTERNAL_DATA): Map<string, CryptoScore> {
  const scores = new Map<string, CryptoScore>();
  for (const coin of coins) {
    scores.set(coin.id, calculateCryptoScore(coin, externalData));
  }
  return scores;
}
