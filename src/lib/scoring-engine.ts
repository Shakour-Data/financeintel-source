/**
 * @deprecated Use scoring-engine-v2.ts instead.
 * This file is kept for reference only. All active scoring uses V2.
 */

/**
 * ML Scoring Engine V3 — 12-Dimension Book-Based Hierarchical Scoring
 * 
 * Based on reference book framework:
 * 🔴 Dimension 1: Fundamental / Blockchain Analysis
 * 🔵 Dimension 2: Technical Analysis
 * 🟢 Dimension 3: On-Chain & Microstructure
 * 🟡 Dimension 4: Market / Investment Psychology
 * 
 * Hierarchy: 12 Dimensions → Sub-dimensions → Aspects → Sub-aspects
 * Coefficients are optimized daily via ML (gradient descent on prediction error).
 * All levels tracked historically for trend analysis.
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
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
        scorer: (coin: CoinInput) => number;
      }[];
    }[];
  }[];
}

interface CoinInput {
  id: string;
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
  // Books: Cryptoassets (Burniske), Blockchain Fundamental Analysis (Garvey),
  //        Digital Assets (Aggarwal), Cryptocurrencies and Tradable Crypto-Tokens (Giannakouros)
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
                scorer: (c) => c.market_cap > 100e9 ? 9.5 : c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 6 : c.market_cap > 100e6 ? 4.5 : 3,
              },
              {
                key: 'fund_val_mcap_rank',
                name: 'Market Cap Rank',
                nameFa: 'Market Cap Rank',
                scorer: (c) => c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8.5 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'fund_val_mcap_dominance',
                name: 'Market Dominance',
                nameFa: 'Market Dominance',
                scorer: (c) => c.market_cap_rank <= 3 ? 9.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 5.5 : 3.5,
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
                scorer: (c) => {
                  if (!c.fully_diluted_valuation || c.fully_diluted_valuation === 0) return 7;
                  const ratio = c.market_cap / c.fully_diluted_valuation;
                  return clamp(normalize(ratio, 0.3, 1));
                },
              },
              {
                key: 'fund_val_fdv_dilution',
                name: 'Dilution Risk',
                nameFa: 'Dilution Risk',
                scorer: (c) => {
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
                scorer: (c) => {
                  const ratio = c.total_supply ? c.circulating_supply / c.total_supply : 0.5;
                  return clamp(normalize(ratio, 0.2, 1));
                },
              },
              {
                key: 'fund_supply_inflation',
                name: 'Inflation Rate',
                nameFa: 'Inflation Rate',
                scorer: (c) => c.max_supply ? 8.5 : c.total_supply ? clamp(normalize(c.circulating_supply / c.total_supply, 0.3, 1)) : 4,
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
                scorer: (c) => c.max_supply ? 8.5 : 4,
              },
              {
                key: 'fund_supply_scarcity',
                name: 'Scarcity Score',
                nameFa: 'Scarcity Score',
                scorer: (c) => {
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
                scorer: (c) => {
                  const established = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'dogecoin', 'cardano', 'polkadot', 'chainlink', 'stellar', 'monero'];
                  return established.includes(c.id) ? 9 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5;
                },
              },
              {
                key: 'fund_project_ecosystem',
                name: 'Ecosystem Size',
                nameFa: 'Ecosystem Size',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  return platforms.includes(c.id) ? 9 : c.market_cap_rank <= 10 ? 7 : 4.5;
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
                scorer: (c) => {
                  const l1 = ['bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche', 'near', 'sui', 'aptos'];
                  const l2 = ['polygon', 'arbitrum', 'optimism', 'binancecoin', 'cosmos', 'polkadot'];
                  if (l1.includes(c.id)) return 9;
                  if (l2.includes(c.id)) return 7.5;
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
  // Books: Technical Analysis of Financial Markets (Murphy),
  //        Japanese Candlestick Charting (Nison), Mastering Crypto 2025,
  //        Algorithmic Trading of Cryptocurrencies (Ernie Chan)
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
                scorer: (c) => {
                  const v = c.price_change_percentage_1h_in_currency ?? 0;
                  return clamp(normalize(v, -3, 3));
                },
              },
              {
                key: 'tech_trend_short_24h',
                name: '24-Hour Direction',
                nameFa: '24-Hour Direction',
                scorer: (c) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'tech_trend_short_acceleration',
                name: 'Price Acceleration',
                nameFa: 'Price Acceleration',
                scorer: (c) => {
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
                scorer: (c) => {
                  const v = c.price_change_percentage_7d_in_currency ?? 0;
                  return clamp(normalize(v, -20, 20));
                },
              },
              {
                key: 'tech_trend_mid_consistency',
                name: 'Trend Consistency',
                nameFa: 'Trend Consistency',
                scorer: (c) => {
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
                scorer: (c) => {
                  if (c.current_price <= 0) return 5;
                  const spread = (c.high_24h - c.low_24h) / c.current_price;
                  return clamp(normalize(-spread, -0.15, 0.15) + 5);
                },
              },
              {
                key: 'tech_pattern_range_position',
                name: 'Price Position in Range',
                nameFa: 'Price Position in Range',
                scorer: (c) => {
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
                scorer: (c) => clamp(normalize(-c.ath_change_percentage, -80, 0)),
              },
              {
                key: 'tech_pattern_ath_breakout',
                name: 'Breakout Potential',
                nameFa: 'Breakout Potential',
                scorer: (c) => c.ath_change_percentage > -10 ? 8.5 : c.ath_change_percentage > -30 ? 6 : c.ath_change_percentage > -50 ? 4.5 : 3,
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
                scorer: (c) => {
                  if (c.current_price <= 0) return 5;
                  const range = (c.high_24h - c.low_24h) / c.current_price;
                  return clamp(normalize(-range, -0.2, 0.02) + 5);
                },
              },
              {
                key: 'tech_risk_vol_stability',
                name: 'Price Stability',
                nameFa: 'Price Stability',
                scorer: (c) => {
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
                scorer: (c) => clamp(normalize(-c.ath_change_percentage, -80, 0)),
              },
              {
                key: 'tech_risk_dd_tail',
                name: 'Tail Risk',
                nameFa: 'Tail Risk',
                scorer: (c) => {
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
  // Books: Handbook of Blockchain Analytics (Chen),
  //        The Evolution of On-Chain Trading (Anderson),
  //        Crypto Market Microstructure (Trex),
  //        Market Microstructure & HFT (Preston),
  //        Mastering Bitcoin (Antonopoulos)
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
                scorer: (c) => c.total_volume > 5e9 ? 9 : c.total_volume > 1e9 ? 7.5 : c.total_volume > 500e6 ? 6 : c.total_volume > 100e6 ? 5 : 3.5,
              },
              {
                key: 'onchain_net_vol_ratio',
                name: 'Vol/MCap Ratio',
                nameFa: 'Vol/MCap Ratio',
                scorer: (c) => {
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
                scorer: (c) => c.market_cap > 50e9 ? 9 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 6 : c.market_cap > 100e6 ? 4.5 : 3,
              },
              {
                key: 'onchain_net_val_dominance',
                name: 'Network Dominance',
                nameFa: 'Network Dominance',
                scorer: (c) => c.market_cap_rank <= 3 ? 9.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 5.5 : 3.5,
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
                scorer: (c) => c.market_cap_rank <= 10 ? 9 : c.market_cap_rank <= 30 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'onchain_micro_liq_spread',
                name: 'Spread Proxy',
                nameFa: 'Spread Proxy',
                scorer: (c) => {
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
                scorer: (c) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'onchain_micro_ord_velocity',
                name: 'Order Velocity',
                nameFa: 'Order Velocity',
                scorer: (c) => {
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
                name: 'TVL Size Proxy',
                nameFa: 'TVL Size Proxy',
                scorer: (c) => {
                  const defiCoins = ['ethereum', 'solana', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'aave', 'maker', 'uniswap', 'curve', 'lido'];
                  return defiCoins.includes(c.id) ? 8.5 : c.market_cap_rank <= 20 ? 6 : 4;
                },
              },
              {
                key: 'onchain_defi_tvl_growth',
                name: 'Activity Growth',
                nameFa: 'Activity Growth',
                scorer: (c) => {
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
  // Books: Crypto Investing Guide (Balina), Trading for a Living (Elder),
  //        Cryptoassets (Burniske), Bitcoin Billionaires (Mezrich)
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
                scorer: (c) => {
                  const v = c.price_change_percentage_24h ?? 0;
                  return clamp(normalize(v, -10, 10));
                },
              },
              {
                key: 'mkt_sent_dir_volume',
                name: 'Volume Sentiment',
                nameFa: 'Volume Sentiment',
                scorer: (c) => {
                  const volRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(volRatio, 0, 0.15));
                },
              },
              {
                key: 'mkt_sent_dir_mcap_trend',
                name: 'MCap Trend',
                nameFa: 'MCap Trend',
                scorer: (c) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
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
                scorer: (c) => c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'mkt_sent_social_momentum',
                name: 'Social Momentum',
                nameFa: 'Social Momentum',
                scorer: (c) => {
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
                scorer: (c) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  const extreme = Math.abs(d) > 10 || Math.abs(w) > 25;
                  const positive = d > 0 && w > 0;
                  if (extreme && positive) return 8.5;  // Greed
                  if (extreme && !positive) return 2.5; // Fear
                  return 5.5; // Neutral
                },
              },
              {
                key: 'mkt_psych_fg_volume',
                name: 'Volume Panic/Euphoria',
                nameFa: 'Volume Panic/Euphoria',
                scorer: (c) => {
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
                scorer: (c) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const absD = Math.abs(d);
                  return absD > 10 ? 2.5 : absD > 5 ? 4 : absD > 2 ? 6.5 : 7.5;
                },
              },
              {
                key: 'mkt_psych_beh_contrarian',
                name: 'Contrarian Signal',
                nameFa: 'Contrarian Signal',
                scorer: (c) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const w = c.price_change_percentage_7d_in_currency ?? 0;
                  // Oversold = contrarian buy
                  if (d < -8 && w < -15) return 8.5;
                  // Overbought = contrarian sell
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
                scorer: (c) => c.market_cap_rank <= 10 ? 9 : c.market_cap_rank <= 30 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
              },
              {
                key: 'mkt_port_liq_slippage',
                name: 'Slippage Risk',
                nameFa: 'Slippage Risk',
                scorer: (c) => {
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
                scorer: (c) => clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10)),
              },
              {
                key: 'mkt_port_mom_mid',
                name: 'Mid-term Momentum',
                nameFa: 'Mid-term Momentum',
                scorer: (c) => clamp(normalize(c.price_change_percentage_7d_in_currency ?? 0, -20, 20)),
              },
              {
                key: 'mkt_port_mom_mcap',
                name: 'MCap Momentum',
                nameFa: 'MCap Momentum',
                scorer: (c) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
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
                scorer: (c) => {
                  // Large price swings + reversal patterns (Kahneman Ch.12-13)
                  const pct24h = Math.abs(c.price_change_percentage_24h ?? 0);
                  const moveScore = pct24h > 5 ? 1 : 0;
                  // Check if price near opposite extreme of daily range (reversal)
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
                scorer: (c) => {
                  // High volume/mcap ratio suggests excessive trading (Montier Ch.1-2)
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcapRatio > 0.05 ? clamp(normalize(volMcapRatio, 0, 0.3))
                    : clamp(normalize(volMcapRatio, 0, 0.05) + 1);
                },
              },
              {
                key: 'mkt_bf_cog_anchoring',
                name: 'Anchoring Bias',
                nameFa: 'Anchoring Bias',
                scorer: (c) => {
                  // Price near ATH, ATL, or round numbers (Ariely Ch.2)
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
                scorer: (c) => {
                  // High volume during price drops + far from ATH (Kahneman Ch.26-28)
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
                scorer: (c) => {
                  // Selling winners early (high vol near ATH) + holding losers (low vol far from ATH) (Shefrin Ch.2)
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
                scorer: (c) => {
                  // Composite sentiment: momentum + volume intensity + volatility + ATH proximity (Tvede Ch.7-8)
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
                scorer: (c) => {
                  // Large synchronized moves = more herding. Score inversely (high herd = low score, bias warning) (Shefrin Ch.4)
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  const volMcapRatio = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  const herdStrength = normalize(absPct, 0, 15) * 0.6 + normalize(volMcapRatio, 0, 0.2) * 0.4;
                  // Invert: more herding = lower score (it's a bias warning)
                  return clamp(10 - herdStrength * 9);
                },
              },
              {
                key: 'mkt_bf_emo_tilt_risk',
                name: 'Tilt Risk',
                nameFa: 'Tilt Risk',
                scorer: (c) => {
                  // Consecutive extreme moves + escalating volume (Tendler Ch.1-3)
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
                scorer: (c) => {
                  // High volume on small-cap coins = emotional trading (Statman Ch.3-4)
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
                scorer: (c) => {
                  // Price acceleration + volume spikes (Steenbarger Ch.5-6)
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
                scorer: (c) => {
                  // Inverse: low volatility + steady trends = high score (Dayton Ch.4-6)
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
                scorer: (c) => {
                  // Recovery after drops: price above mid-range despite declines (Steenbarger 2.0 Ch.7-8)
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
                scorer: (c) => {
                  // Inverse of panic: low volume during moderate declines = high acceptance (Hougaard Ch.2-4)
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
                scorer: (c) => {
                  // Consistency of direction across timeframes (Douglas Ch.8-9)
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
                scorer: (c) => {
                  // Deviation from average using ATH/ATL position as proxy (Shleifer Ch.4-5)
                  const athDist = c.ath > 0 ? (c.current_price - c.ath) / c.ath : 0;
                  const extremePosition = Math.abs(athDist);
                  return clamp(normalize(extremePosition, 0, 0.8));
                },
              },
              {
                key: 'mkt_bf_disc_noise_risk',
                name: 'Noise Trader Risk',
                nameFa: 'Noise Trader Risk',
                scorer: (c) => {
                  // Volatility + small market cap vulnerability (Shleifer Ch.3)
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

  // 🟣 DIMENSION 5: NEWS & SENTIMENT ANALYSIS
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
                scorer: (c) => {
                  const absChange = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absChange > 8 ? 8.5 : absChange > 5 ? 7 : absChange > 2 ? 5.5 : 4;
                },
              },
              {
                key: 'news_mkt_volume_signal',
                name: 'Volume News Signal',
                nameFa: 'Volume News Signal',
                scorer: (c) => {
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
                scorer: (c) => {
                  const regulated = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'cardano', 'solana', 'chainlink', 'polkadot'];
                  return regulated.includes(c.id) ? 8 : c.market_cap_rank <= 20 ? 6.5 : c.market_cap_rank <= 50 ? 5 : 3.5;
                },
              },
              {
                key: 'news_reg_compliance',
                name: 'Compliance Signal',
                nameFa: 'Compliance Signal',
                scorer: (c) => c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7 : c.market_cap > 1e9 ? 5.5 : 3.5,
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
                scorer: (c) => {
                  const d = c.price_change_percentage_24h ?? 0;
                  const absD = Math.abs(d);
                  return absD > 10 ? 8.5 : absD > 5 ? 7 : absD > 2 ? 5.5 : 4;
                },
              },
              {
                key: 'news_social_engagement',
                name: 'Community Engagement',
                nameFa: 'Community Engagement',
                scorer: (c) => c.market_cap_rank <= 5 ? 9.5 : c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
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
                scorer: (c) => {
                  const devCoins = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon'];
                  return devCoins.includes(c.id) ? 9 : c.market_cap_rank <= 10 ? 7 : c.market_cap_rank <= 30 ? 5.5 : 3.5;
                },
              },
              {
                key: 'news_social_dev_maturity',
                name: 'Project Maturity',
                nameFa: 'Project Maturity',
                scorer: (c) => {
                  const mature = ['bitcoin', 'ethereum', 'litecoin', 'ripple', 'dogecoin', 'cardano', 'chainlink', 'stellar'];
                  return mature.includes(c.id) ? 8.5 : c.market_cap_rank <= 20 ? 6.5 : 4;
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
                scorer: (c) => {
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
                scorer: (c) => {
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
                scorer: (c) => {
                  const highAdoption = ['bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink', 'ripple'];
                  return highAdoption.includes(c.id) ? 8.5 : c.market_cap_rank <= 10 ? 7 : c.market_cap_rank <= 30 ? 5.5 : 3.5;
                },
              },
              {
                key: 'news_cat_up_timing',
                name: 'Timing Score',
                nameFa: 'Timing Score',
                scorer: (c) => {
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
                scorer: (c) => c.market_cap > 100e9 ? 8.5 : c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4,
              },
              {
                key: 'macro_int_policy_dir',
                name: 'Policy Direction',
                nameFa: 'Policy Direction',
                scorer: (c) => clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10)),
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
                scorer: (c) => {
                  const r = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(r, 0, 0.15));
                },
              },
              {
                key: 'macro_int_liq_risk',
                name: 'Risk Appetite',
                nameFa: 'Risk Appetite',
                scorer: (c) => {
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
                scorer: (c) => {
                  const btcLike = ['bitcoin', 'ethereum', 'litecoin'];
                  if (btcLike.includes(c.id)) return clamp(normalize(-(c.price_change_percentage_24h ?? 0), -10, 10));
                  return 5;
                },
              },
              {
                key: 'macro_curr_corr',
                name: 'Currency Correlation',
                nameFa: 'Currency Correlation',
                scorer: (c) => c.market_cap_rank <= 5 ? 8.5 : c.market_cap_rank <= 20 ? 6.5 : 4,
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
                scorer: (c) => c.max_supply ? 8 : c.market_cap_rank <= 10 ? 7 : 4.5,
              },
              {
                key: 'macro_curr_real_rate',
                name: 'Real Rate Score',
                nameFa: 'Real Rate Score',
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  const stablecoins = ['tether', 'usd-coin', 'dai', 'binance-usd', 'frax'];
                  if (btcEth.includes(c.id)) return 7.5;
                  if (stablecoins.includes(c.id)) return 4;
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
                scorer: (c) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
              {
                key: 'macro_global_risk',
                name: 'Risk-On/Off',
                nameFa: 'Risk-On/Off',
                scorer: (c) => {
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
                scorer: (c) => c.id === 'bitcoin' ? 8 : c.market_cap_rank <= 5 ? 6.5 : 4,
              },
              {
                key: 'macro_global_diverge',
                name: 'Macro Divergence',
                nameFa: 'Macro Divergence',
                scorer: (c) => {
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
  // Books: Crypto Regulation (Pirrong), Digital Finance (Arner),
  //        Fintech Regulation (Buckley), Cryptoassets & Legal Framework (Giannakouros)
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
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  if (btcEth.includes(c.id)) return 9;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
              {
                key: 'reg_jur_us_comply',
                name: 'US Compliance',
                nameFa: 'US Compliance',
                scorer: (c) => c.market_cap > 50e9 ? 8.5 : c.market_cap > 10e9 ? 7 : c.market_cap > 1e9 ? 5.5 : 3.5,
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
                scorer: (c) => c.market_cap_rank <= 20 ? 8 : c.market_cap_rank <= 50 ? 6 : 4,
              },
              {
                key: 'reg_jur_asia',
                name: 'Asia Regulatory',
                nameFa: 'Asia Regulatory',
                scorer: (c) => {
                  const asiaCoins = ['binancecoin', 'crypto-com-chain', 'okb', 'huobi-token', 'tron'];
                  if (asiaCoins.includes(c.id)) return 8;
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
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  if (btcEth.includes(c.id)) return 9;
                  return c.market_cap_rank <= 10 ? 7 : 4.5;
                },
              },
              {
                key: 'reg_legal_precedent',
                name: 'Legal Precedent',
                nameFa: 'Legal Precedent',
                scorer: (c) => {
                  const established = ['bitcoin', 'ethereum', 'litecoin', 'ripple'];
                  if (established.includes(c.id)) return 8.5;
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
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  const privacyCoins = ['monero', 'zcash', 'dash', 'beam', 'grin'];
                  if (btcEth.includes(c.id)) return 9;
                  if (privacyCoins.includes(c.id)) return 3;
                  return c.market_cap_rank <= 10 ? 7 : 5;
                },
              },
              {
                key: 'reg_legal_penalty',
                name: 'Penalty Risk',
                nameFa: 'Penalty Risk',
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  const privacyCoins = ['monero', 'zcash', 'dash', 'beam', 'grin'];
                  if (btcEth.includes(c.id)) return 9;
                  if (privacyCoins.includes(c.id)) return 3;
                  return c.market_cap_rank <= 10 ? 7 : 5;
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
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 9;
                  if (c.id === 'ethereum') return 8.5;
                  return c.market_cap_rank <= 10 ? 5 : 3;
                },
              },
              {
                key: 'reg_inst_custody',
                name: 'Fund Custody',
                nameFa: 'Fund Custody',
                scorer: (c) => c.market_cap_rank <= 5 ? 9 : c.market_cap_rank <= 20 ? 7 : c.market_cap_rank <= 50 ? 5.5 : 3.5,
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
                scorer: (c) => c.market_cap_rank <= 10 ? 8.5 : c.market_cap_rank <= 30 ? 6.5 : 4,
              },
              {
                key: 'reg_inst_audit',
                name: 'Audit Score',
                nameFa: 'Audit Score',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 3.5,
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🛡️ DIMENSION 8: NETWORK SECURITY
  // Books: Mastering Bitcoin (Antonopoulos), The Blockchain Security (Chen),
  //        Crypto Security (Bonneau), Smart Contract Security (Atzei)
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
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 9.5;
                  if (c.id === 'ethereum') return 9;
                  const posCoins = ['solana', 'cardano', 'polkadot', 'avalanche', 'near', 'cosmos', 'aptos', 'sui'];
                  if (posCoins.includes(c.id)) return 8;
                  return 5;
                },
              },
              {
                key: 'sec_con_staking',
                name: 'Staking Ratio',
                nameFa: 'Staking Ratio',
                scorer: (c) => {
                  const posCoins = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'near', 'cosmos', 'aptos', 'sui', 'algorand', 'tezos'];
                  const powCoins = ['bitcoin', 'litecoin', 'dogecoin', 'monero'];
                  if (powCoins.includes(c.id)) return 7;
                  if (posCoins.includes(c.id)) {
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
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 9.5;
                  if (c.id === 'ethereum') return 9;
                  return c.market_cap_rank <= 10 ? 7 : 4;
                },
              },
              {
                key: 'sec_con_validator',
                name: 'Validator Decentralization',
                nameFa: 'Validator Decentralization',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
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
                scorer: (c) => {
                  const platformCoins = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'near', 'cosmos', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (platformCoins.includes(c.id)) return 8.5;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
              {
                key: 'sec_sc_bounty',
                name: 'Bug Bounty',
                nameFa: 'Bug Bounty',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 3.5,
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
                scorer: (c) => {
                  const neverHacked = ['bitcoin', 'ethereum'];
                  const defiTokens = ['aave', 'maker', 'uniswap', 'curve', 'lido', 'compound', 'synthetix', 'yearn-finance', 'sushi'];
                  if (neverHacked.includes(c.id)) return 9;
                  if (defiTokens.includes(c.id)) return 5.5;
                  return 7;
                },
              },
              {
                key: 'sec_sc_recover',
                name: 'Recovery Score',
                nameFa: 'Recovery Score',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
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
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  const l1s = ['solana', 'cardano', 'avalanche', 'near', 'cosmos', 'aptos', 'sui', 'polkadot'];
                  const l2s = ['arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (btcEth.includes(c.id)) return 9.5;
                  if (l1s.includes(c.id)) return 8;
                  if (l2s.includes(c.id)) return 7;
                  return 5.5;
                },
              },
              {
                key: 'sec_res_finality',
                name: 'Finality Score',
                nameFa: 'Finality Score',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4.5,
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
                scorer: (c) => {
                  const btcEth = ['bitcoin', 'ethereum'];
                  const platforms = ['solana', 'cardano', 'polkadot', 'avalanche', 'near', 'cosmos', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (btcEth.includes(c.id)) return 9;
                  if (platforms.includes(c.id)) return 7.5;
                  return 5;
                },
              },
              {
                key: 'sec_res_governance',
                name: 'Governance',
                nameFa: 'Governance',
                scorer: (c) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 📈 DIMENSION 9: DERIVATIVES
  // Books: Options Futures & Other Derivatives (Hull), Trading Volatility (Natenberg),
  //        Dynamic Hedging (Taleb), Derivatives Markets (McDonald)
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
                scorer: (c) => clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10)),
              },
              {
                key: 'deriv_fund_trend',
                name: 'Funding Trend',
                nameFa: 'Funding Trend',
                scorer: (c) => clamp(normalize(c.price_change_percentage_7d_in_currency ?? 0, -20, 20)),
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
                scorer: (c) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcap > 0.1 ? 7 : volMcap > 0.05 ? 6 : 4;
                },
              },
              {
                key: 'deriv_fund_spread',
                name: 'Spread Score',
                nameFa: 'Spread Score',
                scorer: (c) => {
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
                scorer: (c) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return volMcap > 0.1 ? 8 : volMcap > 0.05 ? 6.5 : 4;
                },
              },
              {
                key: 'deriv_oi_ratio',
                name: 'OI/MCap Ratio',
                nameFa: 'OI/MCap Ratio',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6.5 : 4,
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
                scorer: (c) => {
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absPct > 10 ? 7.5 : absPct > 5 ? 6 : 4.5;
                },
              },
              {
                key: 'deriv_oi_squeeze',
                name: 'Squeeze Potential',
                nameFa: 'Squeeze Potential',
                scorer: (c) => {
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
                scorer: (c) => {
                  const absPct = Math.abs(c.price_change_percentage_24h ?? 0);
                  return absPct < 3 ? 8 : absPct < 7 ? 6 : 3.5;
                },
              },
              {
                key: 'deriv_opt_iv_skew',
                name: 'IV Skew',
                nameFa: 'IV Skew',
                scorer: (c) => {
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
                scorer: (c) => clamp(normalize(c.price_change_percentage_24h ?? 0, -10, 10)),
              },
              {
                key: 'deriv_opt_pc',
                name: 'Put/Call Ratio',
                nameFa: 'Put/Call Ratio',
                scorer: (c) => {
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
  // Books: The Whale and the Squid (Vicky), Market Wizards (Schwager),
  //        Institutional Investing (Pozen), Smart Money (Zweig)
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
                scorer: (c) => c.total_volume > 5e9 ? 8.5 : c.total_volume > 1e9 ? 7 : c.total_volume > 500e6 ? 5.5 : 4,
              },
              {
                key: 'whale_act_freq',
                name: 'Whale Frequency',
                nameFa: 'Whale Frequency',
                scorer: (c) => {
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
                scorer: (c) => {
                  const volMcap = c.market_cap > 0 ? c.total_volume / c.market_cap : 0;
                  return clamp(normalize(volMcap, 0, 0.15));
                },
              },
              {
                key: 'whale_act_net',
                name: 'Net Flow',
                nameFa: 'Net Flow',
                scorer: (c) => {
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
                scorer: (c) => {
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
                scorer: (c) => {
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
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 8;
                  return c.market_cap_rank <= 5 ? 6.5 : 4.5;
                },
              },
              {
                key: 'whale_acc_sell',
                name: 'Miner Selling Pressure',
                nameFa: 'Miner Selling Pressure',
                scorer: (c) => {
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
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 9;
                  if (c.id === 'ethereum') return 8.5;
                  return c.market_cap_rank <= 10 ? 5.5 : 3;
                },
              },
              {
                key: 'whale_inst_score',
                name: 'Institutional Score',
                nameFa: 'Institutional Score',
                scorer: (c) => c.market_cap > 50e9 ? 9 : c.market_cap > 10e9 ? 7.5 : c.market_cap > 1e9 ? 5.5 : 3.5,
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
                scorer: (c) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
              {
                key: 'whale_inst_distrib',
                name: 'Distribution Score',
                nameFa: 'Distribution Score',
                scorer: (c) => {
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
  // Books: DeFi and the Future of Finance (Harvey), The Infinite Machine (Russo),
  //        Web3 (Dixon), Building Ethereum DApps (Dutta)
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
              {
                key: 'eco_defi_tvl_size',
                name: 'TVL Size Score',
                nameFa: 'TVL Size Score',
                scorer: (c) => {
                  const defiPlatforms = ['ethereum', 'solana', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'aave', 'maker', 'uniswap', 'curve', 'lido', 'binancecoin'];
                  if (defiPlatforms.includes(c.id)) return 8.5;
                  return c.market_cap_rank <= 20 ? 6 : 4;
                },
              },
              {
                key: 'eco_defi_tvl_growth',
                name: 'TVL Growth',
                nameFa: 'TVL Growth',
                scorer: (c) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
              },
            ],
          },
          {
            key: 'eco_defi_protocol',
            name: 'Protocol Activity',
            nameFa: 'Protocol Activity',
            subAspects: [
              {
                key: 'eco_defi_active',
                name: 'Active Protocol Score',
                nameFa: 'Active Protocol Score',
                scorer: (c) => {
                  const defiCoins = ['ethereum', 'solana', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'aave', 'maker', 'uniswap', 'curve', 'lido', 'binancecoin'];
                  if (defiCoins.includes(c.id)) return 8;
                  return c.market_cap_rank <= 20 ? 6 : 4;
                },
              },
              {
                key: 'eco_defi_revenue',
                name: 'Revenue Score',
                nameFa: 'Revenue Score',
                scorer: (c) => {
                  const defiPlatforms = ['ethereum', 'solana', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'aave', 'maker', 'uniswap', 'binancecoin'];
                  if (defiPlatforms.includes(c.id)) return 7.5;
                  return 4;
                },
              },
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
              {
                key: 'eco_dev_github',
                name: 'GitHub Activity',
                nameFa: 'GitHub Activity',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (platforms.includes(c.id)) return 9;
                  return c.market_cap_rank <= 20 ? 7 : 4;
                },
              },
              {
                key: 'eco_dev_contrib',
                name: 'Contributor Score',
                nameFa: 'Contributor Score',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (platforms.includes(c.id)) return 8.5;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
            ],
          },
          {
            key: 'eco_dev_breadth',
            name: 'Ecosystem Breadth',
            nameFa: 'Ecosystem Breadth',
            subAspects: [
              {
                key: 'eco_dev_dapp',
                name: 'DApp Count Score',
                nameFa: 'DApp Count Score',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (platforms.includes(c.id)) return 8;
                  return c.market_cap_rank <= 20 ? 6 : 3.5;
                },
              },
              {
                key: 'eco_dev_integrate',
                name: 'Integration Score',
                nameFa: 'Integration Score',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  if (platforms.includes(c.id)) return 8.5;
                  return c.market_cap_rank <= 20 ? 6.5 : 4;
                },
              },
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
              {
                key: 'eco_cross_tvl',
                name: 'Bridge TVL Score',
                nameFa: 'Bridge TVL Score',
                scorer: (c) => {
                  const l1s = ['ethereum', 'solana', 'cardano', 'avalanche', 'near', 'cosmos', 'aptos', 'sui', 'polkadot', 'binancecoin'];
                  const l2s = ['arbitrum', 'optimism', 'polygon'];
                  if (l1s.includes(c.id)) return 8;
                  if (l2s.includes(c.id)) return 7;
                  return 4;
                },
              },
              {
                key: 'eco_cross_volume',
                name: 'Bridge Volume Score',
                nameFa: 'Bridge Volume Score',
                scorer: (c) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4,
              },
            ],
          },
          {
            key: 'eco_cross_stable',
            name: 'Stablecoin Activity',
            nameFa: 'Stablecoin Activity',
            subAspects: [
              {
                key: 'eco_cross_stable_flow',
                name: 'Stablecoin Flow',
                nameFa: 'Stablecoin Flow',
                scorer: (c) => {
                  const defiPlatforms = ['ethereum', 'solana', 'avalanche', 'polygon', 'arbitrum', 'optimism', 'binancecoin', 'tron'];
                  if (defiPlatforms.includes(c.id)) return 8;
                  return c.market_cap_rank <= 20 ? 6 : 4;
                },
              },
              {
                key: 'eco_cross_stable_pair',
                name: 'Stablecoin Pairing',
                nameFa: 'Stablecoin Pairing',
                scorer: (c) => c.market_cap_rank <= 10 ? 8 : c.market_cap_rank <= 30 ? 6 : 4,
              },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 🔗 DIMENSION 12: INTER-MARKET
  // Books: Intermarket Analysis (Murphy), Market Wizards (Schwager),
  //        Technical Analysis of Financial Markets (Murphy),
  //        Relative Strength (Rosenberg)
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
              {
                key: 'inter_str_dom_trend',
                name: 'Dominance Trend',
                nameFa: 'Dominance Trend',
                scorer: (c) => {
                  if (c.id === 'bitcoin') return 9;
                  if (c.id === 'ethereum') return 7.5;
                  return clamp(normalize(11 - c.market_cap_rank, 1, 10));
                },
              },
              {
                key: 'inter_str_alt_season',
                name: 'Alt Season Signal',
                nameFa: 'Alt Season Signal',
                scorer: (c) => {
                  const pricePct = c.price_change_percentage_24h ?? 0;
                  const mcapPct = c.market_cap_change_percentage_24h ?? 0;
                  const divergence = Math.abs(pricePct - mcapPct);
                  return clamp(normalize(divergence, 0, 10));
                },
              },
            ],
          },
          {
            key: 'inter_str_rotation',
            name: 'Sector Rotation',
            nameFa: 'Sector Rotation',
            subAspects: [
              {
                key: 'inter_str_sector',
                name: 'Sector Momentum',
                nameFa: 'Sector Momentum',
                scorer: (c) => {
                  const platforms = ['ethereum', 'solana', 'cardano', 'polkadot', 'avalanche', 'cosmos', 'near', 'aptos', 'sui', 'arbitrum', 'optimism', 'polygon', 'binancecoin'];
                  const rising = (c.price_change_percentage_24h ?? 0) > 0;
                  if (platforms.includes(c.id) && rising) return 8;
                  if (platforms.includes(c.id)) return 5;
                  return rising ? 6.5 : 4.5;
                },
              },
              {
                key: 'inter_str_rotate',
                name: 'Rotation Signal',
                nameFa: 'Rotation Signal',
                scorer: (c) => {
                  const pricePct = c.price_change_percentage_24h ?? 0;
                  const mcapPct = c.market_cap_change_percentage_24h ?? 0;
                  const divergence = pricePct - mcapPct;
                  return clamp(normalize(divergence, -10, 10));
                },
              },
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
              {
                key: 'inter_corr_equity',
                name: 'Equity Correlation',
                nameFa: 'Equity Correlation',
                scorer: (c) => c.market_cap_rank <= 10 ? 7.5 : c.market_cap_rank <= 30 ? 6 : 4.5,
              },
              {
                key: 'inter_corr_gold',
                name: 'Gold Correlation',
                nameFa: 'Gold Correlation',
                scorer: (c) => c.id === 'bitcoin' ? 8 : 4,
              },
            ],
          },
          {
            key: 'inter_corr_crypto',
            name: 'Crypto Internal',
            nameFa: 'Crypto Internal',
            subAspects: [
              {
                key: 'inter_corr_btc',
                name: 'BTC Correlation',
                nameFa: 'BTC Correlation',
                scorer: (c) => c.market_cap_rank <= 5 ? 8 : c.market_cap_rank <= 20 ? 7 : 5,
              },
              {
                key: 'inter_corr_defi',
                name: 'DeFi Correlation',
                nameFa: 'DeFi Correlation',
                scorer: (c) => {
                  const defiCoins = ['ethereum', 'solana', 'avalanche', 'aave', 'maker', 'uniswap', 'curve', 'lido'];
                  if (defiCoins.includes(c.id)) return 8;
                  return 4.5;
                },
              },
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
              {
                key: 'inter_str_vs_btc',
                name: 'vs BTC Score',
                nameFa: 'vs BTC Score',
                scorer: (c) => {
                  const pricePct = c.price_change_percentage_24h ?? 0;
                  const mcapPct = c.market_cap_change_percentage_24h ?? 0;
                  return clamp(normalize(pricePct - mcapPct, -10, 10));
                },
              },
              {
                key: 'inter_str_vs_sector',
                name: 'vs Sector Score',
                nameFa: 'vs Sector Score',
                scorer: (c) => clamp(normalize(c.market_cap_change_percentage_24h ?? 0, -10, 10)),
              },
            ],
          },
          {
            key: 'inter_str_revert',
            name: 'Mean Reversion',
            nameFa: 'Mean Reversion',
            subAspects: [
              {
                key: 'inter_str_deviation',
                name: 'Deviation Score',
                nameFa: 'Deviation Score',
                scorer: (c) => clamp(normalize(Math.abs(c.ath_change_percentage), 0, 80)),
              },
              {
                key: 'inter_str_revert_sig',
                name: 'Reversion Signal',
                nameFa: 'Reversion Signal',
                scorer: (c) => {
                  const athDist = Math.abs(c.ath_change_percentage);
                  return athDist > 60 ? 8.5 : athDist > 40 ? 7 : athDist > 20 ? 5.5 : 3.5;
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 9 + 1;
}

function clamp(score: number): number {
  return Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════
// ML COEFFICIENT OPTIMIZER
// ═══════════════════════════════════════════════════════════════

/**
 * In-memory store of current coefficients.
 * Key format: "dimension" | "dimension.subDim" | "dimension.subDim.aspect"
 * 
 * Default coefficients are equal weights. ML optimizer adjusts them.
 */
let currentCoefficients: Record<string, number> = {};
let coefficientVersion = 1;
let lastOptimizationDate = '';

// Initialize default coefficients
function initDefaultCoefficients(): void {
  if (Object.keys(currentCoefficients).length > 0) return;

  for (const dim of HIERARCHY) {
    // Dimension coefficient (starts at equal weight = 1/4 = 0.25)
    currentCoefficients[dim.key] = 1 / HIERARCHY.length;

    for (const subDim of dim.subDimensions) {
      const subDimKey = `${dim.key}.${subDim.key}`;
      currentCoefficients[subDimKey] = 1 / dim.subDimensions.length;

      for (const aspect of subDim.aspects) {
        const aspectKey = `${dim.key}.${subDim.key}.${aspect.key}`;
        currentCoefficients[aspectKey] = 1 / subDim.aspects.length;

        for (const subAspect of aspect.subAspects) {
          const saKey = `${dim.key}.${subDim.key}.${aspect.key}.${subAspect.key}`;
          currentCoefficients[saKey] = 1 / aspect.subAspects.length;
        }
      }
    }
  }
}

initDefaultCoefficients();

/**
 * Get the current coefficient for any hierarchy node.
 */
export function getCoefficient(key: string): number {
  return currentCoefficients[key] ?? 0.25;
}

/**
 * Get all current coefficients.
 */
export function getAllCoefficients(): Record<string, number> {
  return { ...currentCoefficients };
}

/**
 * Get coefficient version.
 */
export function getCoefficientVersion(): number {
  return coefficientVersion;
}

/**
 * ML Gradient Descent Coefficient Optimizer
 * 
 * Optimizes coefficients based on how well each dimension's score
 * predicted the next-day price movement.
 * 
 * Algorithm:
 * 1. For each hierarchy level, calculate correlation between score and actual price movement
 * 2. Apply gradient descent with learning rate proportional to correlation
 * 3. Constrain daily change to ±5% for stability
 * 4. Normalize dimension coefficients to sum to 1
 * 5. Normalize sub-level coefficients within their parent to sum to 1
 */
export function optimizeCoefficients(
  coins: CoinInput[],
  previousScores: Map<string, number>,
  _previousCoefficients: Record<string, number>
): { coefficients: Record<string, number>; predictionError: number } {
  const newCoefficients = { ...currentCoefficients };
  let totalError = 0;

  const optimizeLevel = (
    keys: string[],
    parentKey: string,
    learningRate: number
  ) => {
    let sum = 0;
    for (const key of keys) {
      let correlation = 0;
      let count = 0;

      for (const coin of coins) {
        const prevScore = previousScores.get(`${coin.id}.${key}`);
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
    // Dimension level
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
  for (const dim of HIERARCHY) {
    newCoefficients[dim.key] = (newCoefficients[d.key] ?? 0) / dimSum;
  }

  // Update global state
  currentCoefficients = newCoefficients;
  coefficientVersion++;
  lastOptimizationDate = new Date().toISOString();

  return {
    coefficients: newCoefficients,
    predictionError: totalError / HIERARCHY.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Deterministic hash for simulating consistent previous values.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * @deprecated Use real historical data from ScoreHistory table instead.
 * This function generates deterministic fake "previous" scores.
 * Only used by the V3 calculateCryptoScore for backward compatibility.
 */
function simulatePreviousScore(currentScore: number, seed: string): number {
  const hashMod = (simpleHash(seed) % 1000) / 1000;
  const variation = (hashMod - 0.5) * 1.2;
  return clamp(currentScore + variation);
}

/**
 * @deprecated Use real historical data from CoefficientHistory table instead.
 * This function generates deterministic fake "previous" coefficients.
 * Only used by the V3 calculateCryptoScore for backward compatibility.
 */
function simulatePreviousCoefficient(currentCoeff: number, seed: string): number {
  const hashMod = (simpleHash(seed + '_coeff') % 1000) / 1000;
  const variation = (hashMod - 0.5) * currentCoeff * 0.1;
  return Math.max(0.01, currentCoeff + variation);
}

/**
 * Calculate full hierarchical score for a coin.
 */
export function calculateCryptoScore(coin: CoinInput): CryptoScore {
  const dimensions: Dimension[] = HIERARCHY.map((dimDef) => {
    const dimCoefficient = getCoefficient(dimDef.key);
    const prevDimCoeff = simulatePreviousCoefficient(dimCoefficient, `${coin.id}.${dimDef.key}`);

    const subDimensions: SubDimension[] = dimDef.subDimensions.map((subDef) => {
      const subCoeff = getCoefficient(`${dimDef.key}.${subDef.key}`);
      const prevSubCoeff = simulatePreviousCoefficient(subCoeff, `${coin.id}.${dimDef.key}.${subDef.key}`);

      const aspects: Aspect[] = subDef.aspects.map((aspDef) => {
        const aspCoeff = getCoefficient(`${dimDef.key}.${subDef.key}.${aspDef.key}`);
        const prevAspCoeff = simulatePreviousCoefficient(aspCoeff, `${coin.id}.${dimDef.key}.${subDef.key}.${aspDef.key}`);

        const subAspects: SubAspect[] = aspDef.subAspects.map((saDef) => {
          const score = saDef.scorer(coin);
          const prevScore = simulatePreviousScore(score, `${coin.id}.${dimDef.key}.${subDef.key}.${aspDef.key}.${saDef.key}`);
          return {
            key: saDef.key,
            name: saDef.name,
            nameFa: saDef.nameFa,
            score,
            previousScore: prevScore,
            scoreChange: Math.round((score - prevScore) * 10) / 10,
          };
        });

        // Aspect score = weighted average of sub-aspects
        const aspectScore = subAspects.reduce((sum, sa) => {
          const saWeight = getCoefficient(`${dimDef.key}.${subDef.key}.${aspDef.key}.${sa.key}`);
          return sum + sa.score * saWeight;
        }, 0);
        const prevAspScore = simulatePreviousScore(aspectScore, `${coin.id}.${dimDef.key}.${subDef.key}.${aspDef.key}`);

        return {
          key: aspDef.key,
          name: aspDef.name,
          nameFa: aspDef.nameFa,
          coefficient: Math.round(aspCoeff * 1000) / 1000,
          previousCoefficient: Math.round(prevAspCoeff * 1000) / 1000,
          coefficientChange: Math.round((aspCoeff - prevAspCoeff) * 10000) / 10000,
          score: clamp(aspectScore),
          previousScore: prevAspScore,
          scoreChange: Math.round((clamp(aspectScore) - prevAspScore) * 10) / 10,
          subAspects,
        };
      });

      // Sub-dimension score = weighted average of aspects (coefficients sum to 1, no division needed)
      const subDimScore = aspects.reduce((sum, asp) => sum + asp.score * asp.coefficient, 0);
      const prevSubDimScore = simulatePreviousScore(subDimScore, `${coin.id}.${dimDef.key}.${subDef.key}`);

      return {
        key: subDef.key,
        name: subDef.name,
        nameFa: subDef.nameFa,
        coefficient: Math.round(subCoeff * 1000) / 1000,
        previousCoefficient: Math.round(prevSubCoeff * 1000) / 1000,
        coefficientChange: Math.round((subCoeff - prevSubCoeff) * 10000) / 10000,
        score: clamp(subDimScore),
        previousScore: prevSubDimScore,
        scoreChange: Math.round((clamp(subDimScore) - prevSubDimScore) * 10) / 10,
        aspects,
      };
    });

    // Dimension score = weighted average of sub-dimensions (coefficients sum to 1, no division needed)
    const dimScore = subDimensions.reduce((sum, sd) => sum + sd.score * sd.coefficient, 0);
    const prevDimScore = simulatePreviousScore(dimScore, `${coin.id}.${dimDef.key}`);

    return {
      key: dimDef.key,
      name: dimDef.name,
      nameFa: dimDef.nameFa,
      color: dimDef.color,
      icon: dimDef.icon,
      coefficient: Math.round(dimCoefficient * 1000) / 1000,
      previousCoefficient: Math.round(prevDimCoeff * 1000) / 1000,
      coefficientChange: Math.round((dimCoefficient - prevDimCoeff) * 10000) / 10000,
      score: clamp(dimScore),
      previousScore: prevDimScore,
      scoreChange: Math.round((clamp(dimScore) - prevDimScore) * 10) / 10,
      subDimensions,
      references: dimDef.references,
    };
  });

  // Final AI Score = weighted sum of dimension scores × dimension coefficients
  const aiScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.score * dim.coefficient, 0) * 10
  ) / 10;

  const previousAiScore = Math.round(
    dimensions.reduce((sum, dim) => sum + dim.previousScore * dim.previousCoefficient, 0) * 10
  ) / 10;

  const confidence: 'high' | 'medium' | 'low' =
    coin.market_cap_rank <= 10 ? 'high' :
    coin.market_cap_rank <= 30 ? 'medium' : 'low';

  return {
    coinId: coin.id,
    aiScore,
    previousAiScore,
    aiScoreChange: Math.round((aiScore - previousAiScore) * 10) / 10,
    dimensions,
    confidence,
    lastUpdated: new Date().toISOString(),
    coefficientVersion,
  };
}

/**
 * Calculate scores for multiple coins at once.
 */
export function calculateBatchScores(
  coins: CoinInput[]
): Map<string, CryptoScore> {
  const scores = new Map<string, CryptoScore>();
  for (const coin of coins) {
    scores.set(coin.id, calculateCryptoScore(coin));
  }
  return scores;
}

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
  return HIERARCHY.map((dim) => ({
    key: dim.key,
    name: dim.name,
    nameFa: dim.nameFa,
    coefficient: getCoefficient(dim.key),
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
 * @deprecated Use real historical data from ScoreHistory table via
 * getCoinScoreHistory() in scoring-engine-v2.ts instead.
 * This function generates deterministic fake trend data using sine waves.
 * DO NOT use this for displaying trend data to users.
 */
export function generateTrendData(
  currentScore: number,
  days: number = 30,
  keySeed?: string
): Array<{ date: string; score: number }> {
  const data: Array<{ date: string; score: number }> = [];
  const now = new Date();
  const seedHash = keySeed ? simpleHash(keySeed) : 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const daySeed = (seedHash + i * 7) % 1000 / 1000;
    const noise = (Math.sin(i * 0.7 + daySeed * 3) * 0.8 + Math.cos(i * 1.3 + daySeed * 2) * 0.5);
    const trend = (currentScore - 5) * (1 - i / days) * 0.3;
    const score = clamp(currentScore + noise + trend - (currentScore > 5 ? 0.3 : -0.3));
    data.push({
      date: date.toISOString().split('T')[0],
      score,
    });
  }

  // Last point is the actual current score
  data[data.length - 1].score = currentScore;

  return data;
}

/**
 * @deprecated Use real historical data from CoefficientHistory table via
 * getCoefficientHistory() in scoring-engine-v2.ts instead.
 * This function generates deterministic fake coefficient trend data.
 * DO NOT use this for displaying trend data to users.
 */
export function generateCoefficientTrendData(
  currentCoeff: number,
  days: number = 30,
  keySeed?: string
): Array<{ date: string; coefficient: number }> {
  const data: Array<{ date: string; coefficient: number }> = [];
  const now = new Date();
  const seedHash = keySeed ? simpleHash(keySeed + '_c') : 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const daySeed = (seedHash + i * 11) % 1000 / 1000;
    const noise = (Math.sin(i * 0.5 + daySeed * 2) * 0.005 + Math.cos(i * 1.1 + daySeed * 3) * 0.003);
    const trend = (currentCoeff - 0.25) * (1 - i / days) * 0.5;
    const coeff = Math.max(0.01, Math.round((currentCoeff + noise + trend) * 1000) / 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      coefficient: coeff,
    });
  }

  data[data.length - 1].coefficient = currentCoeff;

  return data;
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
    totalCoefficients: Object.keys(currentCoefficients).length,
  };
}
