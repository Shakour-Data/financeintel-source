/**
 * Hierarchy Seeder — Seeds the HierarchyNode table from the 4-level scoring hierarchy.
 *
 * Reads the HIERARCHY definition from scoring-engine.ts and creates DB entries
 * for all 4 levels: Dimension → SubDimension → Aspect → SubAspect.
 *
 * Total: 12 Dimensions + 40 SubDimensions + 80 Aspects + 173 SubAspects = 305 nodes
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// HIERARCHY DEFINITION (mirrors scoring-engine.ts HIERARCHY)
// We duplicate the structure here to avoid importing scorer functions
// which are not needed for DB seeding and would bloat the server bundle.
// ═══════════════════════════════════════════════════════════════

interface SubAspectDef {
  key: string;
  name: string;
  nameFa: string;
}

interface AspectDef {
  key: string;
  name: string;
  nameFa: string;
  subAspects: SubAspectDef[];
}

interface SubDimensionDef {
  key: string;
  name: string;
  nameFa: string;
  aspects: AspectDef[];
}

interface DimensionDef {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  references: string[];
  subDimensions: SubDimensionDef[];
}

const HIERARCHY: DimensionDef[] = [
  // 🔴 DIMENSION 1: FUNDAMENTAL / BLOCKCHAIN ANALYSIS
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
              { key: 'fund_val_mcap_size', name: 'Market Cap Size', nameFa: 'Market Cap Size' },
              { key: 'fund_val_mcap_rank', name: 'Market Cap Rank', nameFa: 'Market Cap Rank' },
              { key: 'fund_val_mcap_dominance', name: 'Market Dominance', nameFa: 'Market Dominance' },
            ],
          },
          {
            key: 'fund_val_fdv',
            name: 'FDV Analysis',
            nameFa: 'FDV Analysis',
            subAspects: [
              { key: 'fund_val_fdv_ratio', name: 'MCap/FDV Ratio', nameFa: 'MCap/FDV Ratio' },
              { key: 'fund_val_fdv_dilution', name: 'Dilution Risk', nameFa: 'Dilution Risk' },
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
              { key: 'fund_supply_circ_ratio', name: 'Circ/Total Ratio', nameFa: 'Circ/Total Ratio' },
              { key: 'fund_supply_inflation', name: 'Inflation Rate', nameFa: 'Inflation Rate' },
            ],
          },
          {
            key: 'fund_supply_model',
            name: 'Supply Model',
            nameFa: 'Supply Model',
            subAspects: [
              { key: 'fund_supply_deflationary', name: 'Deflationary Model', nameFa: 'Deflationary Model' },
              { key: 'fund_supply_scarcity', name: 'Scarcity Score', nameFa: 'Scarcity Score' },
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
              { key: 'fund_project_established', name: 'Establishment Level', nameFa: 'Establishment Level' },
              { key: 'fund_project_ecosystem', name: 'Ecosystem Size', nameFa: 'Ecosystem Size' },
            ],
          },
          {
            key: 'fund_project_platform',
            name: 'Platform Status',
            nameFa: 'Platform Status',
            subAspects: [
              { key: 'fund_project_platform_tier', name: 'Platform Tier', nameFa: 'Platform Tier' },
            ],
          },
        ],
      },
    ],
  },

  // 🔵 DIMENSION 2: TECHNICAL ANALYSIS
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
              { key: 'tech_trend_short_1h', name: '1-Hour Momentum', nameFa: '1-Hour Momentum' },
              { key: 'tech_trend_short_24h', name: '24-Hour Direction', nameFa: '24-Hour Direction' },
              { key: 'tech_trend_short_acceleration', name: 'Price Acceleration', nameFa: 'Price Acceleration' },
            ],
          },
          {
            key: 'tech_trend_mid',
            name: 'Mid-term Trend',
            nameFa: 'Mid-term Trend',
            subAspects: [
              { key: 'tech_trend_mid_7d', name: '7-Day Trend', nameFa: '7-Day Trend' },
              { key: 'tech_trend_mid_consistency', name: 'Trend Consistency', nameFa: 'Trend Consistency' },
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
              { key: 'tech_pattern_range_spread', name: 'HL Spread', nameFa: 'HL Spread' },
              { key: 'tech_pattern_range_position', name: 'Price Position in Range', nameFa: 'Price Position in Range' },
            ],
          },
          {
            key: 'tech_pattern_ath',
            name: 'ATH Analysis',
            nameFa: 'ATH Analysis',
            subAspects: [
              { key: 'tech_pattern_ath_distance', name: 'ATH Distance', nameFa: 'ATH Distance' },
              { key: 'tech_pattern_ath_breakout', name: 'Breakout Potential', nameFa: 'Breakout Potential' },
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
              { key: 'tech_risk_vol_24h', name: '24h Volatility', nameFa: '24h Volatility' },
              { key: 'tech_risk_vol_stability', name: 'Price Stability', nameFa: 'Price Stability' },
            ],
          },
          {
            key: 'tech_risk_drawdown',
            name: 'Drawdown Risk',
            nameFa: 'Drawdown Risk',
            subAspects: [
              { key: 'tech_risk_dd_ath', name: 'ATH Drawdown', nameFa: 'ATH Drawdown' },
              { key: 'tech_risk_dd_tail', name: 'Tail Risk', nameFa: 'Tail Risk' },
            ],
          },
        ],
      },
    ],
  },

  // 🟢 DIMENSION 3: ON-CHAIN & MICROSTRUCTURE
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
              { key: 'onchain_net_vol_abs', name: 'Absolute Volume', nameFa: 'Absolute Volume' },
              { key: 'onchain_net_vol_ratio', name: 'Vol/MCap Ratio', nameFa: 'Vol/MCap Ratio' },
            ],
          },
          {
            key: 'onchain_net_value',
            name: 'Network Value',
            nameFa: 'Network Value',
            subAspects: [
              { key: 'onchain_net_val_mcap', name: 'Network Valuation', nameFa: 'Network Valuation' },
              { key: 'onchain_net_val_dominance', name: 'Network Dominance', nameFa: 'Network Dominance' },
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
              { key: 'onchain_micro_liq_depth', name: 'Depth Tier', nameFa: 'Depth Tier' },
              { key: 'onchain_micro_liq_spread', name: 'Spread Proxy', nameFa: 'Spread Proxy' },
            ],
          },
          {
            key: 'onchain_micro_orders',
            name: 'Order Flow',
            nameFa: 'Order Flow',
            subAspects: [
              { key: 'onchain_micro_ord_imbalance', name: 'Buy/Sell Imbalance', nameFa: 'Buy/Sell Imbalance' },
              { key: 'onchain_micro_ord_velocity', name: 'Order Velocity', nameFa: 'Order Velocity' },
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
              { key: 'onchain_defi_tvl_size', name: 'TVL Size Proxy', nameFa: 'TVL Size Proxy' },
              { key: 'onchain_defi_tvl_growth', name: 'Activity Growth', nameFa: 'Activity Growth' },
            ],
          },
        ],
      },
    ],
  },

  // 🟡 DIMENSION 4: MARKET / INVESTMENT PSYCHOLOGY
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
              { key: 'mkt_sent_dir_bull', name: 'Bull/Bear Signal', nameFa: 'Bull/Bear Signal' },
              { key: 'mkt_sent_dir_volume', name: 'Volume Sentiment', nameFa: 'Volume Sentiment' },
              { key: 'mkt_sent_dir_mcap_trend', name: 'MCap Trend', nameFa: 'MCap Trend' },
            ],
          },
          {
            key: 'mkt_sent_social',
            name: 'Social Signals',
            nameFa: 'Social Signals',
            subAspects: [
              { key: 'mkt_sent_social_tier', name: 'Community Tier', nameFa: 'Community Tier' },
              { key: 'mkt_sent_social_momentum', name: 'Social Momentum', nameFa: 'Social Momentum' },
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
              { key: 'mkt_psych_fg_price', name: 'Price Momentum Signal', nameFa: 'Price Momentum Signal' },
              { key: 'mkt_psych_fg_volume', name: 'Volume Panic/Euphoria', nameFa: 'Volume Panic/Euphoria' },
            ],
          },
          {
            key: 'mkt_psych_behavior',
            name: 'Behavioral Patterns',
            nameFa: 'Behavioral Patterns',
            subAspects: [
              { key: 'mkt_psych_beh_herd', name: 'Herd Indicator', nameFa: 'Herd Indicator' },
              { key: 'mkt_psych_beh_contrarian', name: 'Contrarian Signal', nameFa: 'Contrarian Signal' },
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
              { key: 'mkt_port_liq_access', name: 'Exchange Access', nameFa: 'Exchange Access' },
              { key: 'mkt_port_liq_slippage', name: 'Slippage Risk', nameFa: 'Slippage Risk' },
            ],
          },
          {
            key: 'mkt_port_momentum',
            name: 'Portfolio Momentum',
            nameFa: 'Portfolio Momentum',
            subAspects: [
              { key: 'mkt_port_mom_short', name: 'Short-term Momentum', nameFa: 'Short-term Momentum' },
              { key: 'mkt_port_mom_mid', name: 'Mid-term Momentum', nameFa: 'Mid-term Momentum' },
              { key: 'mkt_port_mom_mcap', name: 'MCap Momentum', nameFa: 'MCap Momentum' },
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
              { key: 'mkt_bf_cog_overreaction', name: 'Overreaction Bias', nameFa: 'Overreaction Bias' },
              { key: 'mkt_bf_cog_overconfidence', name: 'Overconfidence Bias', nameFa: 'Overconfidence Bias' },
              { key: 'mkt_bf_cog_anchoring', name: 'Anchoring Bias', nameFa: 'Anchoring Bias' },
              { key: 'mkt_bf_cog_loss_aversion', name: 'Loss Aversion', nameFa: 'Loss Aversion' },
              { key: 'mkt_bf_cog_disposition', name: 'Disposition Effect', nameFa: 'Disposition Effect' },
            ],
          },
          {
            key: 'mkt_bf_emotional',
            name: 'Emotional Biases',
            nameFa: 'Emotional Biases',
            subAspects: [
              { key: 'mkt_bf_emo_fear_greed', name: 'Fear & Greed', nameFa: 'Fear & Greed' },
              { key: 'mkt_bf_emo_herding', name: 'Herding Behavior', nameFa: 'Herding Behavior' },
              { key: 'mkt_bf_emo_tilt_risk', name: 'Tilt Risk', nameFa: 'Tilt Risk' },
              { key: 'mkt_bf_emo_emotional_util', name: 'Emotional Utility', nameFa: 'Emotional Utility' },
              { key: 'mkt_bf_emo_state_depend', name: 'State Dependence', nameFa: 'State Dependence' },
            ],
          },
          {
            key: 'mkt_bf_discipline',
            name: 'Trading Discipline',
            nameFa: 'Trading Discipline',
            subAspects: [
              { key: 'mkt_bf_disc_mindfulness', name: 'Mindfulness Score', nameFa: 'Mindfulness Score' },
              { key: 'mkt_bf_disc_resilience', name: 'Market Resilience', nameFa: 'Market Resilience' },
              { key: 'mkt_bf_disc_loss_accept', name: 'Loss Acceptance', nameFa: 'Loss Acceptance' },
              { key: 'mkt_bf_disc_momentum_persist', name: 'Momentum Persistence', nameFa: 'Momentum Persistence' },
              { key: 'mkt_bf_disc_mean_revert', name: 'Mean Reversion Signal', nameFa: 'Mean Reversion Signal' },
              { key: 'mkt_bf_disc_noise_risk', name: 'Noise Trader Risk', nameFa: 'Noise Trader Risk' },
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
              { key: 'news_mkt_volatility_signal', name: 'Volatility News Signal', nameFa: 'Volatility News Signal' },
              { key: 'news_mkt_volume_signal', name: 'Volume News Signal', nameFa: 'Volume News Signal' },
            ],
          },
          {
            key: 'news_regulatory',
            name: 'Regulatory Climate',
            nameFa: 'Regulatory Climate',
            subAspects: [
              { key: 'news_reg_establishment', name: 'Regulatory Establishment', nameFa: 'Regulatory Establishment' },
              { key: 'news_reg_compliance', name: 'Compliance Signal', nameFa: 'Compliance Signal' },
              { key: 'news_reg_sentiment', name: 'Regulatory Sentiment', nameFa: 'Regulatory Sentiment' },
              { key: 'news_reg_risk', name: 'Regulatory Risk', nameFa: 'Regulatory Risk' },
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
              { key: 'news_social_momentum', name: 'Social Momentum', nameFa: 'Social Momentum' },
              { key: 'news_social_engagement', name: 'Community Engagement', nameFa: 'Community Engagement' },
            ],
          },
          {
            key: 'news_social_dev',
            name: 'Developer Activity',
            nameFa: 'Developer Activity',
            subAspects: [
              { key: 'news_social_dev_ecosystem', name: 'Dev Ecosystem', nameFa: 'Dev Ecosystem' },
              { key: 'news_social_dev_maturity', name: 'Project Maturity', nameFa: 'Project Maturity' },
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
              { key: 'news_cat_price_catalyst', name: 'Price Catalyst Signal', nameFa: 'Price Catalyst Signal' },
              { key: 'news_cat_volume_catalyst', name: 'Volume Catalyst', nameFa: 'Volume Catalyst' },
            ],
          },
          {
            key: 'news_catalyst_upcoming',
            name: 'Upcoming Catalysts',
            nameFa: 'Upcoming Catalysts',
            subAspects: [
              { key: 'news_cat_up_adoption', name: 'Adoption Potential', nameFa: 'Adoption Potential' },
              { key: 'news_cat_up_timing', name: 'Timing Score', nameFa: 'Timing Score' },
            ],
          },
        ],
      },
    ],
  },

  // 🟣 DIMENSION 6: MACROECONOMIC
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
              { key: 'macro_int_policy_env', name: 'Rate Environment', nameFa: 'Rate Environment' },
              { key: 'macro_int_policy_dir', name: 'Policy Direction', nameFa: 'Policy Direction' },
            ],
          },
          {
            key: 'macro_int_liquidity',
            name: 'Liquidity Conditions',
            nameFa: 'Liquidity Conditions',
            subAspects: [
              { key: 'macro_int_liq_market', name: 'Market Liquidity', nameFa: 'Market Liquidity' },
              { key: 'macro_int_liq_risk', name: 'Risk Appetite', nameFa: 'Risk Appetite' },
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
              { key: 'macro_curr_dxy', name: 'DXY Impact', nameFa: 'DXY Impact' },
              { key: 'macro_curr_corr', name: 'Currency Correlation', nameFa: 'Currency Correlation' },
            ],
          },
          {
            key: 'macro_curr_inflation',
            name: 'Inflation Impact',
            nameFa: 'Inflation Impact',
            subAspects: [
              { key: 'macro_curr_cpi', name: 'CPI Pressure', nameFa: 'CPI Pressure' },
              { key: 'macro_curr_real_rate', name: 'Real Rate Score', nameFa: 'Real Rate Score' },
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
              { key: 'macro_global_spx', name: 'SPX Correlation', nameFa: 'SPX Correlation' },
              { key: 'macro_global_risk', name: 'Risk-On/Off', nameFa: 'Risk-On/Off' },
            ],
          },
          {
            key: 'macro_global_commodity',
            name: 'Commodity Link',
            nameFa: 'Commodity Link',
            subAspects: [
              { key: 'macro_global_gold', name: 'Gold Correlation', nameFa: 'Gold Correlation' },
              { key: 'macro_global_diverge', name: 'Macro Divergence', nameFa: 'Macro Divergence' },
            ],
          },
        ],
      },
    ],
  },

  // 🏛️ DIMENSION 7: REGULATORY
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
              { key: 'reg_jur_us_sec', name: 'SEC Classification', nameFa: 'SEC Classification' },
              { key: 'reg_jur_us_comply', name: 'US Compliance', nameFa: 'US Compliance' },
            ],
          },
          {
            key: 'reg_jur_global',
            name: 'Global Regulation',
            nameFa: 'Global Regulation',
            subAspects: [
              { key: 'reg_jur_eu', name: 'EU MiCA Score', nameFa: 'EU MiCA Score' },
              { key: 'reg_jur_asia', name: 'Asia Regulatory', nameFa: 'Asia Regulatory' },
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
              { key: 'reg_legal_classify', name: 'Classification Clarity', nameFa: 'Classification Clarity' },
              { key: 'reg_legal_precedent', name: 'Legal Precedent', nameFa: 'Legal Precedent' },
            ],
          },
          {
            key: 'reg_legal_enforce',
            name: 'Enforcement Risk',
            nameFa: 'Enforcement Risk',
            subAspects: [
              { key: 'reg_legal_history', name: 'Enforcement History', nameFa: 'Enforcement History' },
              { key: 'reg_legal_penalty', name: 'Penalty Risk', nameFa: 'Penalty Risk' },
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
              { key: 'reg_inst_etf', name: 'ETF Availability', nameFa: 'ETF Availability' },
              { key: 'reg_inst_custody', name: 'Fund Custody', nameFa: 'Fund Custody' },
            ],
          },
          {
            key: 'reg_inst_compliance',
            name: 'Compliance Infrastructure',
            nameFa: 'Compliance Infrastructure',
            subAspects: [
              { key: 'reg_inst_aml', name: 'AML/KYC Score', nameFa: 'AML/KYC Score' },
              { key: 'reg_inst_audit', name: 'Audit Score', nameFa: 'Audit Score' },
            ],
          },
        ],
      },
    ],
  },

  // 🛡️ DIMENSION 8: NETWORK SECURITY
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
              { key: 'sec_con_hash_rate', name: 'Hash Rate Score', nameFa: 'Hash Rate Score' },
              { key: 'sec_con_staking', name: 'Staking Ratio', nameFa: 'Staking Ratio' },
            ],
          },
          {
            key: 'sec_con_attack',
            name: 'Attack Resistance',
            nameFa: 'Attack Resistance',
            subAspects: [
              { key: 'sec_con_51', name: '51% Attack Cost', nameFa: '51% Attack Cost' },
              { key: 'sec_con_validator', name: 'Validator Decentralization', nameFa: 'Validator Decentralization' },
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
              { key: 'sec_sc_audit', name: 'Audit Status', nameFa: 'Audit Status' },
              { key: 'sec_sc_bounty', name: 'Bug Bounty', nameFa: 'Bug Bounty' },
            ],
          },
          {
            key: 'sec_sc_exploit',
            name: 'Exploit History',
            nameFa: 'Exploit History',
            subAspects: [
              { key: 'sec_sc_hack', name: 'Hack Penalty', nameFa: 'Hack Penalty' },
              { key: 'sec_sc_recover', name: 'Recovery Score', nameFa: 'Recovery Score' },
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
              { key: 'sec_res_up', name: 'Uptime Score', nameFa: 'Uptime Score' },
              { key: 'sec_res_finality', name: 'Finality Score', nameFa: 'Finality Score' },
            ],
          },
          {
            key: 'sec_res_decentral',
            name: 'Decentralization',
            nameFa: 'Decentralization',
            subAspects: [
              { key: 'sec_res_nodes', name: 'Node Distribution', nameFa: 'Node Distribution' },
              { key: 'sec_res_governance', name: 'Governance', nameFa: 'Governance' },
            ],
          },
        ],
      },
    ],
  },

  // 📈 DIMENSION 9: DERIVATIVES
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
              { key: 'deriv_fund_rate', name: 'Funding Rate Signal', nameFa: 'Funding Rate Signal' },
              { key: 'deriv_fund_trend', name: 'Funding Trend', nameFa: 'Funding Trend' },
            ],
          },
          {
            key: 'deriv_fund_basis',
            name: 'Basis & Spread',
            nameFa: 'Basis & Spread',
            subAspects: [
              { key: 'deriv_fund_basis_sig', name: 'Basis Signal', nameFa: 'Basis Signal' },
              { key: 'deriv_fund_spread', name: 'Spread Score', nameFa: 'Spread Score' },
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
              { key: 'deriv_oi_trend', name: 'OI Trend', nameFa: 'OI Trend' },
              { key: 'deriv_oi_ratio', name: 'OI/MCap Ratio', nameFa: 'OI/MCap Ratio' },
            ],
          },
          {
            key: 'deriv_oi_liq',
            name: 'Liquidation Levels',
            nameFa: 'Liquidation Levels',
            subAspects: [
              { key: 'deriv_oi_heat', name: 'Liquidation Heat', nameFa: 'Liquidation Heat' },
              { key: 'deriv_oi_squeeze', name: 'Squeeze Potential', nameFa: 'Squeeze Potential' },
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
              { key: 'deriv_opt_iv_level', name: 'IV Level', nameFa: 'IV Level' },
              { key: 'deriv_opt_iv_skew', name: 'IV Skew', nameFa: 'IV Skew' },
            ],
          },
          {
            key: 'deriv_opt_position',
            name: 'Market Positioning',
            nameFa: 'Market Positioning',
            subAspects: [
              { key: 'deriv_opt_ls', name: 'Long/Short Ratio', nameFa: 'Long/Short Ratio' },
              { key: 'deriv_opt_pc', name: 'Put/Call Ratio', nameFa: 'Put/Call Ratio' },
            ],
          },
        ],
      },
    ],
  },

  // ⚓ DIMENSION 10: WHALE & SMART MONEY
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
              { key: 'whale_act_volume', name: 'Whale Volume', nameFa: 'Whale Volume' },
              { key: 'whale_act_freq', name: 'Whale Frequency', nameFa: 'Whale Frequency' },
            ],
          },
          {
            key: 'whale_act_exchange',
            name: 'Exchange Flows',
            nameFa: 'Exchange Flows',
            subAspects: [
              { key: 'whale_act_inflow', name: 'Inflow/Outflow', nameFa: 'Inflow/Outflow' },
              { key: 'whale_act_net', name: 'Net Flow', nameFa: 'Net Flow' },
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
              { key: 'whale_acc_signal', name: 'Accumulation Signal', nameFa: 'Accumulation Signal' },
              { key: 'whale_acc_dist', name: 'Distribution Signal', nameFa: 'Distribution Signal' },
            ],
          },
          {
            key: 'whale_acc_miner',
            name: 'Miner Activity',
            nameFa: 'Miner Activity',
            subAspects: [
              { key: 'whale_acc_reserve', name: 'Miner Reserve', nameFa: 'Miner Reserve' },
              { key: 'whale_acc_sell', name: 'Miner Selling Pressure', nameFa: 'Miner Selling Pressure' },
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
              { key: 'whale_inst_etf', name: 'ETF Flow', nameFa: 'ETF Flow' },
              { key: 'whale_inst_score', name: 'Institutional Score', nameFa: 'Institutional Score' },
            ],
          },
          {
            key: 'whale_inst_wallet',
            name: 'Wallet Concentration',
            nameFa: 'Wallet Concentration',
            subAspects: [
              { key: 'whale_inst_top', name: 'Top Holder Score', nameFa: 'Top Holder Score' },
              { key: 'whale_inst_distrib', name: 'Distribution Score', nameFa: 'Distribution Score' },
            ],
          },
        ],
      },
    ],
  },

  // 🧬 DIMENSION 11: ECOSYSTEM & DEFI
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
              { key: 'eco_defi_tvl_size', name: 'TVL Size Score', nameFa: 'TVL Size Score' },
              { key: 'eco_defi_tvl_growth', name: 'TVL Growth', nameFa: 'TVL Growth' },
            ],
          },
          {
            key: 'eco_defi_protocol',
            name: 'Protocol Activity',
            nameFa: 'Protocol Activity',
            subAspects: [
              { key: 'eco_defi_active', name: 'Active Protocol Score', nameFa: 'Active Protocol Score' },
              { key: 'eco_defi_revenue', name: 'Revenue Score', nameFa: 'Revenue Score' },
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
              { key: 'eco_dev_github', name: 'GitHub Activity', nameFa: 'GitHub Activity' },
              { key: 'eco_dev_contrib', name: 'Contributor Score', nameFa: 'Contributor Score' },
            ],
          },
          {
            key: 'eco_dev_breadth',
            name: 'Ecosystem Breadth',
            nameFa: 'Ecosystem Breadth',
            subAspects: [
              { key: 'eco_dev_dapp', name: 'DApp Count Score', nameFa: 'DApp Count Score' },
              { key: 'eco_dev_integrate', name: 'Integration Score', nameFa: 'Integration Score' },
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
              { key: 'eco_cross_tvl', name: 'Bridge TVL Score', nameFa: 'Bridge TVL Score' },
              { key: 'eco_cross_volume', name: 'Bridge Volume Score', nameFa: 'Bridge Volume Score' },
            ],
          },
          {
            key: 'eco_cross_stable',
            name: 'Stablecoin Activity',
            nameFa: 'Stablecoin Activity',
            subAspects: [
              { key: 'eco_cross_stable_flow', name: 'Stablecoin Flow', nameFa: 'Stablecoin Flow' },
              { key: 'eco_cross_stable_pair', name: 'Stablecoin Pairing', nameFa: 'Stablecoin Pairing' },
            ],
          },
        ],
      },
    ],
  },

  // 🔗 DIMENSION 12: INTER-MARKET
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
              { key: 'inter_str_dom_trend', name: 'Dominance Trend', nameFa: 'Dominance Trend' },
              { key: 'inter_str_alt_season', name: 'Alt Season Signal', nameFa: 'Alt Season Signal' },
            ],
          },
          {
            key: 'inter_str_rotation',
            name: 'Sector Rotation',
            nameFa: 'Sector Rotation',
            subAspects: [
              { key: 'inter_str_sector', name: 'Sector Momentum', nameFa: 'Sector Momentum' },
              { key: 'inter_str_rotate', name: 'Rotation Signal', nameFa: 'Rotation Signal' },
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
              { key: 'inter_corr_equity', name: 'Equity Correlation', nameFa: 'Equity Correlation' },
              { key: 'inter_corr_gold', name: 'Gold Correlation', nameFa: 'Gold Correlation' },
            ],
          },
          {
            key: 'inter_corr_crypto',
            name: 'Crypto Internal',
            nameFa: 'Crypto Internal',
            subAspects: [
              { key: 'inter_corr_btc', name: 'BTC Correlation', nameFa: 'BTC Correlation' },
              { key: 'inter_corr_defi', name: 'DeFi Correlation', nameFa: 'DeFi Correlation' },
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
              { key: 'inter_str_vs_btc', name: 'vs BTC Score', nameFa: 'vs BTC Score' },
              { key: 'inter_str_vs_sector', name: 'vs Sector Score', nameFa: 'vs Sector Score' },
            ],
          },
          {
            key: 'inter_str_revert',
            name: 'Mean Reversion',
            nameFa: 'Mean Reversion',
            subAspects: [
              { key: 'inter_str_deviation', name: 'Deviation Score', nameFa: 'Deviation Score' },
              { key: 'inter_str_revert_sig', name: 'Reversion Signal', nameFa: 'Reversion Signal' },
            ],
          },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// SEEDER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Seeds the HierarchyNode table with the full 4-level hierarchy.
 * Skips nodes that already exist (by key) for idempotency.
 *
 * Hierarchy:
 * - Level 0: 12 Dimensions
 * - Level 1: 40 SubDimensions
 * - Level 2: 80 Aspects
 * - Level 3: 173 SubAspects
 * Total: 305 nodes
 */
export async function seedHierarchy(): Promise<void> {
  console.log('[HierarchySeeder] Starting hierarchy seeding...');

  // Check existing nodes
  const existingNodes = await db.hierarchyNode.findMany({
    select: { key: true },
  });
  const existingKeys = new Set(existingNodes.map((n) => n.key));

  if (existingKeys.size >= 305) {
    console.log(`[HierarchySeeder] All ${existingKeys.size} nodes already exist. Skipping.`);
    return;
  }

  const nodesToCreate: Array<{
    key: string;
    level: number;
    name: string;
    nameFa: string;
    parentKey: string | null;
    dimensionKey: string;
    color: string | null;
    icon: string | null;
    sortOrder: number;
    references: string | null;
  }> = [];

  let sortOrder = 0;

  for (const dim of HIERARCHY) {
    // Level 0: Dimension
    const dimKey = dim.key;
    if (!existingKeys.has(dimKey)) {
      nodesToCreate.push({
        key: dimKey,
        level: 0,
        name: dim.name,
        nameFa: dim.nameFa,
        parentKey: null,
        dimensionKey: dimKey,
        color: dim.color,
        icon: dim.icon,
        sortOrder: sortOrder++,
        references: JSON.stringify(dim.references),
      });
    } else {
      sortOrder++;
    }

    for (const subDim of dim.subDimensions) {
      // Level 1: SubDimension
      const subDimKey = `${dim.key}.${subDim.key}`;
      if (!existingKeys.has(subDimKey)) {
        nodesToCreate.push({
          key: subDimKey,
          level: 1,
          name: subDim.name,
          nameFa: subDim.nameFa,
          parentKey: dimKey,
          dimensionKey: dimKey,
          color: null,
          icon: null,
          sortOrder: sortOrder++,
          references: null,
        });
      } else {
        sortOrder++;
      }

      for (const aspect of subDim.aspects) {
        // Level 2: Aspect
        const aspectKey = `${dim.key}.${subDim.key}.${aspect.key}`;
        if (!existingKeys.has(aspectKey)) {
          nodesToCreate.push({
            key: aspectKey,
            level: 2,
            name: aspect.name,
            nameFa: aspect.nameFa,
            parentKey: subDimKey,
            dimensionKey: dimKey,
            color: null,
            icon: null,
            sortOrder: sortOrder++,
            references: null,
          });
        } else {
          sortOrder++;
        }

        for (const subAspect of aspect.subAspects) {
          // Level 3: SubAspect
          const saKey = `${dim.key}.${subDim.key}.${aspect.key}.${subAspect.key}`;
          if (!existingKeys.has(saKey)) {
            nodesToCreate.push({
              key: saKey,
              level: 3,
              name: subAspect.name,
              nameFa: subAspect.nameFa,
              parentKey: aspectKey,
              dimensionKey: dimKey,
              color: null,
              icon: null,
              sortOrder: sortOrder++,
              references: null,
            });
          } else {
            sortOrder++;
          }
        }
      }
    }
  }

  if (nodesToCreate.length === 0) {
    console.log('[HierarchySeeder] No new nodes to create.');
    return;
  }

  // Batch create nodes
  for (const node of nodesToCreate) {
    await db.hierarchyNode.create({ data: node });
  }

  console.log(`[HierarchySeeder] Created ${nodesToCreate.length} hierarchy nodes.`);
  console.log(
    `[HierarchySeeder] Breakdown: ${nodesToCreate.filter((n) => n.level === 0).length} Dimensions, ` +
    `${nodesToCreate.filter((n) => n.level === 1).length} SubDimensions, ` +
    `${nodesToCreate.filter((n) => n.level === 2).length} Aspects, ` +
    `${nodesToCreate.filter((n) => n.level === 3).length} SubAspects`
  );
}
