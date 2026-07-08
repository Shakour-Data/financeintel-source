/**
 * Market Indicator Computation Engine
 *
 * Computes aggregate market-level scores at each hierarchy node.
 * These are NEW indicators that represent the overall health of the crypto market.
 *
 * Algorithm:
 * 1. Get all coins' scores from ScoreHistory for the given date
 * 2. Get all coins' market caps from RawMarketDaily for the given date
 * 3. For each hierarchy node (88 total), compute:
 *    - aggregateScore: Market-cap weighted average score
 *    - equalWeightScore: Simple average across all coins
 *    - medianScore: Median score
 *    - coinsAboveNeutral: Count of coins with score > 5
 *    - coinsBelowNeutral: Count of coins with score < 5
 *    - bullBearRatio: coinsAboveNeutral / max(coinsBelowNeutral, 1)
 * 4. Get coefficient data from CoefficientHistory for the same date
 * 5. Upsert into MarketIndicatorDaily table
 * 6. Compute and upsert MarketDailyScore (overall market AI score)
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// DATABASE ACCESS HELPER
// ═══════════════════════════════════════════════════════════════
// The dev server may have a stale PrismaClient that doesn't know about
// MarketDailyScore and MarketIndicatorDaily models. We check for this
// and fall back to raw SQL queries if the models aren't available.

const hasMarketModels = typeof (db as unknown as Record<string, unknown>).marketDailyScore !== 'undefined';

/**
 * Safely access the marketDailyScore model. Falls back to raw SQL if needed.
 */
async function findLatestMarketDailyScore(): Promise<{
  date: string;
  marketAiScore: number;
  previousMarketAiScore: number | null;
  marketAiScoreChange: number | null;
  fundamentalScore: number | null;
  technicalScore: number | null;
  onchainScore: number | null;
  marketScore: number | null;
  previousFundamentalScore: number | null;
  previousTechnicalScore: number | null;
  previousOnchainScore: number | null;
  previousMarketScore: number | null;
  bullCoins: number | null;
  bearCoins: number | null;
  neutralCoins: number | null;
  marketBreadth: number | null;
  coefficientVersion: number;
} | null> {
  if (hasMarketModels) {
    return (db as unknown as Record<string, unknown>).marketDailyScore &&
      typeof (db as unknown as Record<string, { findFirst: (...args: any[]) => Promise<any> }>).marketDailyScore?.findFirst === 'function'
      ? await (db as any).marketDailyScore.findFirst({ orderBy: { date: 'desc' } })
      : null;
  }
  // Fallback: use raw SQL
  const rows = await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketDailyScore" ORDER BY date DESC LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

async function findMarketDailyScoreByDate(date: string) {
  if (hasMarketModels) {
    return await (db as any).marketDailyScore.findUnique({ where: { date } });
  }
  const rows = await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketDailyScore" WHERE date = ${date} LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

async function findMarketIndicatorsByDate(date: string) {
  if (hasMarketModels) {
    return await (db as any).marketIndicatorDaily.findMany({ where: { date } });
  }
  const rows = await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketIndicatorDaily" WHERE date = ${date}
  `;
  return rows;
}

async function findMarketIndicatorsByNodeKeyAndDateRange(nodeKey: string, startDate: string, endDate: string) {
  if (hasMarketModels) {
    return await (db as any).marketIndicatorDaily.findMany({
      where: { nodeKey, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }
  return await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketIndicatorDaily" 
    WHERE nodeKey = ${nodeKey} AND date >= ${startDate} AND date <= ${endDate}
    ORDER BY date ASC
  `;
}

async function findMarketDailyScoresByDateRange(startDate: string, endDate: string) {
  if (hasMarketModels) {
    return await (db as any).marketDailyScore.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }
  return await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketDailyScore" 
    WHERE date >= ${startDate} AND date <= ${endDate}
    ORDER BY date ASC
  `;
}

async function findYesterdayMarketIndicators(date: string) {
  if (hasMarketModels) {
    return await (db as any).marketIndicatorDaily.findMany({ where: { date } });
  }
  return await db.$queryRaw<Array<any>>`
    SELECT * FROM "MarketIndicatorDaily" WHERE date = ${date}
  `;
}

async function upsertMarketIndicator(data: {
  nodeKey: string;
  date: string;
  aggregateScore: number;
  previousAggregateScore: number | null;
  aggregateScoreChange: number | null;
  equalWeightScore: number;
  medianScore: number;
  coefficient: number | null;
  previousCoefficient: number | null;
  coefficientChange: number | null;
  coefficientVersion: number;
  coinsAboveNeutral: number;
  coinsBelowNeutral: number;
  bullBearRatio: number;
  predictionError: number | null;
  optimizationDelta: number | null;
}) {
  if (hasMarketModels) {
    return await (db as any).marketIndicatorDaily.upsert({
      where: { nodeKey_date: { nodeKey: data.nodeKey, date: data.date } },
      update: data,
      create: data,
    });
  }
  // Raw SQL upsert for SQLite
  await db.$executeRaw`
    INSERT INTO "MarketIndicatorDaily" (id, nodeKey, date, aggregateScore, previousAggregateScore, aggregateScoreChange, 
      equalWeightScore, medianScore, coefficient, previousCoefficient, coefficientChange, coefficientVersion,
      coinsAboveNeutral, coinsBelowNeutral, bullBearRatio, predictionError, optimizationDelta, createdAt)
    VALUES (${crypto.randomUUID()}, ${data.nodeKey}, ${data.date}, ${data.aggregateScore}, ${data.previousAggregateScore}, 
      ${data.aggregateScoreChange}, ${data.equalWeightScore}, ${data.medianScore}, ${data.coefficient}, 
      ${data.previousCoefficient}, ${data.coefficientChange}, ${data.coefficientVersion}, ${data.coinsAboveNeutral}, 
      ${data.coinsBelowNeutral}, ${data.bullBearRatio}, ${data.predictionError}, ${data.optimizationDelta}, NOW())
    ON CONFLICT(nodeKey, date) DO UPDATE SET
      aggregateScore = ${data.aggregateScore},
      previousAggregateScore = ${data.previousAggregateScore},
      aggregateScoreChange = ${data.aggregateScoreChange},
      equalWeightScore = ${data.equalWeightScore},
      medianScore = ${data.medianScore},
      coefficient = ${data.coefficient},
      previousCoefficient = ${data.previousCoefficient},
      coefficientChange = ${data.coefficientChange},
      coefficientVersion = ${data.coefficientVersion},
      coinsAboveNeutral = ${data.coinsAboveNeutral},
      coinsBelowNeutral = ${data.coinsBelowNeutral},
      bullBearRatio = ${data.bullBearRatio},
      predictionError = ${data.predictionError},
      optimizationDelta = ${data.optimizationDelta}
  `;
}

async function upsertMarketDailyScore(data: {
  date: string;
  marketAiScore: number;
  previousMarketAiScore: number | null;
  marketAiScoreChange: number | null;
  fundamentalScore: number | null;
  technicalScore: number | null;
  onchainScore: number | null;
  marketScore: number | null;
  previousFundamentalScore: number | null;
  previousTechnicalScore: number | null;
  previousOnchainScore: number | null;
  previousMarketScore: number | null;
  bullCoins: number;
  bearCoins: number;
  neutralCoins: number;
  marketBreadth: number | null;
  coefficientVersion: number;
}) {
  if (hasMarketModels) {
    return await (db as any).marketDailyScore.upsert({
      where: { date: data.date },
      update: data,
      create: data,
    });
  }
  // Raw SQL upsert for SQLite
  await db.$executeRaw`
    INSERT INTO "MarketDailyScore" (id, date, marketAiScore, previousMarketAiScore, marketAiScoreChange,
      fundamentalScore, technicalScore, onchainScore, marketScore,
      previousFundamentalScore, previousTechnicalScore, previousOnchainScore, previousMarketScore,
      bullCoins, bearCoins, neutralCoins, marketBreadth, coefficientVersion, createdAt)
    VALUES (${crypto.randomUUID()}, ${data.date}, ${data.marketAiScore}, ${data.previousMarketAiScore}, 
      ${data.marketAiScoreChange}, ${data.fundamentalScore}, ${data.technicalScore}, ${data.onchainScore}, 
      ${data.marketScore}, ${data.previousFundamentalScore}, ${data.previousTechnicalScore}, 
      ${data.previousOnchainScore}, ${data.previousMarketScore}, ${data.bullCoins}, ${data.bearCoins}, 
      ${data.neutralCoins}, ${data.marketBreadth}, ${data.coefficientVersion}, NOW())
    ON CONFLICT(date) DO UPDATE SET
      marketAiScore = ${data.marketAiScore},
      previousMarketAiScore = ${data.previousMarketAiScore},
      marketAiScoreChange = ${data.marketAiScoreChange},
      fundamentalScore = ${data.fundamentalScore},
      technicalScore = ${data.technicalScore},
      onchainScore = ${data.onchainScore},
      marketScore = ${data.marketScore},
      previousFundamentalScore = ${data.previousFundamentalScore},
      previousTechnicalScore = ${data.previousTechnicalScore},
      previousOnchainScore = ${data.previousOnchainScore},
      previousMarketScore = ${data.previousMarketScore},
      bullCoins = ${data.bullCoins},
      bearCoins = ${data.bearCoins},
      neutralCoins = ${data.neutralCoins},
      marketBreadth = ${data.marketBreadth},
      coefficientVersion = ${data.coefficientVersion}
  `;
}

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface MarketIndicatorDailyOutput {
  nodeKey: string;
  date: string;
  aggregateScore: number;
  previousAggregateScore: number | null;
  aggregateScoreChange: number | null;
  equalWeightScore: number;
  medianScore: number;
  coefficient: number | null;
  previousCoefficient: number | null;
  coefficientChange: number | null;
  coefficientVersion: number;
  coinsAboveNeutral: number;
  coinsBelowNeutral: number;
  bullBearRatio: number;
  predictionError: number | null;
  optimizationDelta: number | null;
}

export interface MarketDailyScoreOutput {
  date: string;
  marketAiScore: number;
  previousMarketAiScore: number | null;
  marketAiScoreChange: number | null;
  fundamentalScore: number | null;
  technicalScore: number | null;
  onchainScore: number | null;
  marketScore: number | null;
  previousFundamentalScore: number | null;
  previousTechnicalScore: number | null;
  previousOnchainScore: number | null;
  previousMarketScore: number | null;
  bullCoins: number;
  bearCoins: number;
  neutralCoins: number;
  marketBreadth: number | null;
  coefficientVersion: number;
}

export interface MarketIndicatorHistoryPoint {
  date: string;
  nodeKey: string;
  aggregateScore: number;
  equalWeightScore: number | null;
  medianScore: number | null;
  coinsAboveNeutral: number | null;
  coinsBelowNeutral: number | null;
  bullBearRatio: number | null;
  coefficient: number | null;
  coefficientChange: number | null;
  predictionError: number | null;
}

export interface MarketDailyScoreHistoryPoint {
  date: string;
  marketAiScore: number;
  fundamentalScore: number | null;
  technicalScore: number | null;
  onchainScore: number | null;
  marketScore: number | null;
  bullCoins: number | null;
  bearCoins: number | null;
  neutralCoins: number | null;
  marketBreadth: number | null;
}

// ═══════════════════════════════════════════════════════════════
// HIERARCHY DEFINITION (mirrored from scoring-engine-v2)
// ═══════════════════════════════════════════════════════════════

const DIMENSION_KEYS = [
  'fundamental', 'technical', 'onchain', 'market_psychology',
  'news_sentiment', 'macroeconomic', 'regulatory', 'network_security',
  'derivatives', 'whale_smart_money', 'ecosystem_defi', 'inter_market',
] as const;

const HIERARCHY_NODES: Record<string, string[]> = {
  fundamental: [
    'fundamental.fund_valuation',
    'fundamental.fund_supply',
    'fundamental.fund_project',
  ],
  'fundamental.fund_valuation': [
    'fundamental.fund_valuation.fund_val_mcap',
    'fundamental.fund_valuation.fund_val_fdv',
  ],
  'fundamental.fund_supply': [
    'fundamental.fund_supply.fund_supply_circulation',
    'fundamental.fund_supply.fund_supply_model',
  ],
  'fundamental.fund_project': [
    'fundamental.fund_project.fund_project_maturity',
    'fundamental.fund_project.fund_project_platform',
  ],
  'fundamental.fund_valuation.fund_val_mcap': [
    'fundamental.fund_valuation.fund_val_mcap.fund_val_mcap_size',
    'fundamental.fund_valuation.fund_val_mcap.fund_val_mcap_rank',
    'fundamental.fund_valuation.fund_val_mcap.fund_val_mcap_dominance',
  ],
  'fundamental.fund_valuation.fund_val_fdv': [
    'fundamental.fund_valuation.fund_val_fdv.fund_val_fdv_ratio',
    'fundamental.fund_valuation.fund_val_fdv.fund_val_fdv_dilution',
  ],
  'fundamental.fund_supply.fund_supply_circulation': [
    'fundamental.fund_supply.fund_supply_circulation.fund_supply_circ_ratio',
    'fundamental.fund_supply.fund_supply_circulation.fund_supply_inflation',
  ],
  'fundamental.fund_supply.fund_supply_model': [
    'fundamental.fund_supply.fund_supply_model.fund_supply_deflationary',
    'fundamental.fund_supply.fund_supply_model.fund_supply_scarcity',
  ],
  'fundamental.fund_project.fund_project_maturity': [
    'fundamental.fund_project.fund_project_maturity.fund_project_established',
    'fundamental.fund_project.fund_project_maturity.fund_project_ecosystem',
  ],
  'fundamental.fund_project.fund_project_platform': [
    'fundamental.fund_project.fund_project_platform.fund_project_platform_tier',
  ],
  technical: [
    'technical.tech_trend',
    'technical.tech_pattern',
    'technical.tech_risk',
  ],
  'technical.tech_trend': [
    'technical.tech_trend.tech_trend_short',
    'technical.tech_trend.tech_trend_mid',
  ],
  'technical.tech_pattern': [
    'technical.tech_pattern.tech_pattern_range',
    'technical.tech_pattern.tech_pattern_ath',
  ],
  'technical.tech_risk': [
    'technical.tech_risk.tech_risk_volatility',
    'technical.tech_risk.tech_risk_drawdown',
  ],
  'technical.tech_trend.tech_trend_short': [
    'technical.tech_trend.tech_trend_short.tech_trend_short_1h',
    'technical.tech_trend.tech_trend_short.tech_trend_short_24h',
    'technical.tech_trend.tech_trend_short.tech_trend_short_acceleration',
  ],
  'technical.tech_trend.tech_trend_mid': [
    'technical.tech_trend.tech_trend_mid.tech_trend_mid_7d',
    'technical.tech_trend.tech_trend_mid.tech_trend_mid_consistency',
  ],
  'technical.tech_pattern.tech_pattern_range': [
    'technical.tech_pattern.tech_pattern_range.tech_pattern_range_spread',
    'technical.tech_pattern.tech_pattern_range.tech_pattern_range_position',
  ],
  'technical.tech_pattern.tech_pattern_ath': [
    'technical.tech_pattern.tech_pattern_ath.tech_pattern_ath_distance',
    'technical.tech_pattern.tech_pattern_ath.tech_pattern_ath_breakout',
  ],
  'technical.tech_risk.tech_risk_volatility': [
    'technical.tech_risk.tech_risk_volatility.tech_risk_vol_24h',
    'technical.tech_risk.tech_risk_volatility.tech_risk_vol_stability',
  ],
  'technical.tech_risk.tech_risk_drawdown': [
    'technical.tech_risk.tech_risk_drawdown.tech_risk_dd_ath',
    'technical.tech_risk.tech_risk_drawdown.tech_risk_dd_tail',
  ],
  onchain: [
    'onchain.onchain_network',
    'onchain.onchain_microstructure',
    'onchain.onchain_defi',
  ],
  'onchain.onchain_network': [
    'onchain.onchain_network.onchain_net_volume',
    'onchain.onchain_network.onchain_net_value',
  ],
  'onchain.onchain_microstructure': [
    'onchain.onchain_microstructure.onchain_micro_liquidity',
    'onchain.onchain_microstructure.onchain_micro_orders',
  ],
  'onchain.onchain_defi': [
    'onchain.onchain_defi.onchain_defi_tvl',
  ],
  'onchain.onchain_network.onchain_net_volume': [
    'onchain.onchain_network.onchain_net_volume.onchain_net_vol_abs',
    'onchain.onchain_network.onchain_net_volume.onchain_net_vol_ratio',
  ],
  'onchain.onchain_network.onchain_net_value': [
    'onchain.onchain_network.onchain_net_value.onchain_net_val_mcap',
    'onchain.onchain_network.onchain_net_value.onchain_net_val_dominance',
  ],
  'onchain.onchain_microstructure.onchain_micro_liquidity': [
    'onchain.onchain_microstructure.onchain_micro_liquidity.onchain_micro_liq_depth',
    'onchain.onchain_microstructure.onchain_micro_liquidity.onchain_micro_liq_spread',
  ],
  'onchain.onchain_microstructure.onchain_micro_orders': [
    'onchain.onchain_microstructure.onchain_micro_orders.onchain_micro_ord_imbalance',
    'onchain.onchain_microstructure.onchain_micro_orders.onchain_micro_ord_velocity',
  ],
  'onchain.onchain_defi.onchain_defi_tvl': [
    'onchain.onchain_defi.onchain_defi_tvl.onchain_defi_tvl_size',
    'onchain.onchain_defi.onchain_defi_tvl.onchain_defi_tvl_growth',
  ],
  market_psychology: [
    'market_psychology.mkt_sentiment',
    'market_psychology.mkt_psychology',
    'market_psychology.mkt_portfolio',
  ],
  'market_psychology.mkt_sentiment': [
    'market_psychology.mkt_sentiment.mkt_sent_direction',
    'market_psychology.mkt_sentiment.mkt_sent_social',
  ],
  'market_psychology.mkt_psychology': [
    'market_psychology.mkt_psychology.mkt_psych_fear_greed',
    'market_psychology.mkt_psychology.mkt_psych_behavior',
  ],
  'market_psychology.mkt_portfolio': [
    'market_psychology.mkt_portfolio.mkt_port_liquidity',
    'market_psychology.mkt_portfolio.mkt_port_momentum',
  ],
  'market_psychology.mkt_sentiment.mkt_sent_direction': [
    'market_psychology.mkt_sentiment.mkt_sent_direction.mkt_sent_dir_bull',
    'market_psychology.mkt_sentiment.mkt_sent_direction.mkt_sent_dir_volume',
    'market_psychology.mkt_sentiment.mkt_sent_direction.mkt_sent_dir_mcap_trend',
  ],
  'market_psychology.mkt_sentiment.mkt_sent_social': [
    'market_psychology.mkt_sentiment.mkt_sent_social.mkt_sent_social_tier',
    'market_psychology.mkt_sentiment.mkt_sent_social.mkt_sent_social_momentum',
  ],
  'market_psychology.mkt_psychology.mkt_psych_fear_greed': [
    'market_psychology.mkt_psychology.mkt_psych_fear_greed.mkt_psych_fg_price',
    'market_psychology.mkt_psychology.mkt_psych_fear_greed.mkt_psych_fg_volume',
  ],
  'market_psychology.mkt_psychology.mkt_psych_behavior': [
    'market_psychology.mkt_psychology.mkt_psych_behavior.mkt_psych_beh_herd',
    'market_psychology.mkt_psychology.mkt_psych_behavior.mkt_psych_beh_contrarian',
  ],
  'market_psychology.mkt_portfolio.mkt_port_liquidity': [
    'market_psychology.mkt_portfolio.mkt_port_liquidity.mkt_port_liq_access',
    'market_psychology.mkt_portfolio.mkt_port_liquidity.mkt_port_liq_slippage',
  ],
  'market_psychology.mkt_portfolio.mkt_port_momentum': [
    'market_psychology.mkt_portfolio.mkt_port_momentum.mkt_port_mom_short',
    'market_psychology.mkt_portfolio.mkt_port_momentum.mkt_port_mom_mid',
    'market_psychology.mkt_portfolio.mkt_port_momentum.mkt_port_mom_mcap',
  ],
  // ═══════════════════════════════════════════════════════════════
  // 8 NEW DIMENSIONS (6-12)
  // ═══════════════════════════════════════════════════════════════
  news_sentiment: [
    'news_sentiment.news_impact',
    'news_sentiment.news_social',
    'news_sentiment.news_catalyst',
  ],
  macroeconomic: [
    'macroeconomic.macro_interest',
    'macroeconomic.macro_currency',
    'macroeconomic.macro_global',
  ],
  regulatory: [
    'regulatory.reg_jurisdiction',
    'regulatory.reg_legal',
    'regulatory.reg_institutional',
  ],
  network_security: [
    'network_security.sec_consensus',
    'network_security.sec_smart_contract',
    'network_security.sec_resilience',
  ],
  derivatives: [
    'derivatives.deriv_funding',
    'derivatives.deriv_oi',
    'derivatives.deriv_options',
  ],
  whale_smart_money: [
    'whale_smart_money.whale_activity',
    'whale_smart_money.whale_accumulation',
    'whale_smart_money.whale_institutional',
  ],
  ecosystem_defi: [
    'ecosystem_defi.eco_defi',
    'ecosystem_defi.eco_developer',
    'ecosystem_defi.eco_crosschain',
  ],
  inter_market: [
    'inter_market.inter_structure',
    'inter_market.inter_correlation',
    'inter_market.inter_strength',
  ],
  // News sub-dims
  'news_sentiment.news_impact': [
    'news_sentiment.news_impact.news_market_events',
    'news_sentiment.news_impact.news_regulatory',
  ],
  'news_sentiment.news_social': [
    'news_sentiment.news_social.news_social_buzz',
    'news_sentiment.news_social.news_social_dev',
  ],
  'news_sentiment.news_catalyst': [
    'news_sentiment.news_catalyst.news_catalyst_recent',
    'news_sentiment.news_catalyst.news_catalyst_upcoming',
  ],
  // Macro sub-dims
  'macroeconomic.macro_interest': [
    'macroeconomic.macro_interest.macro_int_policy',
    'macroeconomic.macro_interest.macro_int_liquidity',
  ],
  'macroeconomic.macro_currency': [
    'macroeconomic.macro_currency.macro_curr_dollar',
    'macroeconomic.macro_currency.macro_curr_inflation',
  ],
  'macroeconomic.macro_global': [
    'macroeconomic.macro_global.macro_global_equity',
    'macroeconomic.macro_global.macro_global_commodity',
  ],
  // Regulatory sub-dims
  'regulatory.reg_jurisdiction': [
    'regulatory.reg_jurisdiction.reg_jur_us',
    'regulatory.reg_jurisdiction.reg_jur_global',
  ],
  'regulatory.reg_legal': [
    'regulatory.reg_legal.reg_legal_clarity',
    'regulatory.reg_legal.reg_legal_enforce',
  ],
  'regulatory.reg_institutional': [
    'regulatory.reg_institutional.reg_inst_access',
    'regulatory.reg_institutional.reg_inst_compliance',
  ],
  // Network Security sub-dims
  'network_security.sec_consensus': [
    'network_security.sec_consensus.sec_con_hash',
    'network_security.sec_consensus.sec_con_attack',
  ],
  'network_security.sec_smart_contract': [
    'network_security.sec_smart_contract.sec_sc_code',
    'network_security.sec_smart_contract.sec_sc_exploit',
  ],
  'network_security.sec_resilience': [
    'network_security.sec_resilience.sec_res_uptime',
    'network_security.sec_resilience.sec_res_decentral',
  ],
  // Derivatives sub-dims
  'derivatives.deriv_funding': [
    'derivatives.deriv_funding.deriv_fund_perp',
    'derivatives.deriv_funding.deriv_fund_basis',
  ],
  'derivatives.deriv_oi': [
    'derivatives.deriv_oi.deriv_oi_dyn',
    'derivatives.deriv_oi.deriv_oi_liq',
  ],
  'derivatives.deriv_options': [
    'derivatives.deriv_options.deriv_opt_iv',
    'derivatives.deriv_options.deriv_opt_position',
  ],
  // Whale sub-dims
  'whale_smart_money.whale_activity': [
    'whale_smart_money.whale_activity.whale_act_large',
    'whale_smart_money.whale_activity.whale_act_exchange',
  ],
  'whale_smart_money.whale_accumulation': [
    'whale_smart_money.whale_accumulation.whale_acc_smart',
    'whale_smart_money.whale_accumulation.whale_acc_miner',
  ],
  'whale_smart_money.whale_institutional': [
    'whale_smart_money.whale_institutional.whale_inst_fund',
    'whale_smart_money.whale_institutional.whale_inst_wallet',
  ],
  // Ecosystem sub-dims
  'ecosystem_defi.eco_defi': [
    'ecosystem_defi.eco_defi.eco_defi_tvl',
    'ecosystem_defi.eco_defi.eco_defi_protocol',
  ],
  'ecosystem_defi.eco_developer': [
    'ecosystem_defi.eco_developer.eco_dev_activity',
    'ecosystem_defi.eco_developer.eco_dev_breadth',
  ],
  'ecosystem_defi.eco_crosschain': [
    'ecosystem_defi.eco_crosschain.eco_cross_bridge',
    'ecosystem_defi.eco_crosschain.eco_cross_stable',
  ],
  // Inter-Market sub-dims
  'inter_market.inter_structure': [
    'inter_market.inter_structure.inter_str_dominance',
    'inter_market.inter_structure.inter_str_rotation',
  ],
  'inter_market.inter_correlation': [
    'inter_market.inter_correlation.inter_corr_trad',
    'inter_market.inter_correlation.inter_corr_crypto',
  ],
  'inter_market.inter_strength': [
    'inter_market.inter_strength.inter_str_comp',
    'inter_market.inter_strength.inter_str_revert',
  ],
};

/**
 * Get all hierarchy node keys by flattening the hierarchy map.
 */
export function getAllNodeKeys(): string[] {
  const keys = new Set<string>();
  for (const parentKey of Object.keys(HIERARCHY_NODES)) {
    keys.add(parentKey);
    for (const childKey of HIERARCHY_NODES[parentKey]) {
      keys.add(childKey);
    }
  }
  return Array.from(keys).sort();
}

/**
 * Get only the 4 dimension-level node keys.
 */
export function getDimensionKeys(): string[] {
  return [...DIMENSION_KEYS];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Date utilities
// ═══════════════════════════════════════════════════════════════

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// CORE: Compute Market Indicators
// ═══════════════════════════════════════════════════════════════

/**
 * Compute market-level indicators for all hierarchy nodes for a given date.
 *
 * 1. Get all coins' scores from ScoreHistory for the given date
 * 2. Get all coins' market caps from RawMarketDaily for the given date
 * 3. For each hierarchy node (88 total), compute aggregate indicators
 * 4. Upsert into MarketIndicatorDaily table
 * 5. Compute and upsert MarketDailyScore
 */
export async function computeMarketIndicators(date: string): Promise<void> {
  console.log(`[MarketIndicators] Computing market indicators for ${date}...`);

  // ── Step 1: Get all scores for the date ──
  const scores = await db.scoreHistory.findMany({
    where: { date },
    select: {
      coinId: true,
      nodeKey: true,
      score: true,
    },
  });

  if (scores.length === 0) {
    console.warn(`[MarketIndicators] No scores found for ${date}, skipping.`);
    return;
  }

  // Build a map: nodeKey → Map<coinId, score>
  const scoreMap = new Map<string, Map<string, number>>();
  for (const row of scores) {
    if (!scoreMap.has(row.nodeKey)) {
      scoreMap.set(row.nodeKey, new Map());
    }
    scoreMap.get(row.nodeKey)!.set(row.coinId, row.score);
  }

  // ── Step 2: Get market caps ──
  const marketCaps = await db.rawMarketDaily.findMany({
    where: { date },
    select: {
      coinId: true,
      marketCap: true,
    },
  });

  // Build a map: coinId → marketCap
  const marketCapMap = new Map<string, number>();
  for (const row of marketCaps) {
    if (row.marketCap != null) {
      marketCapMap.set(row.coinId, row.marketCap);
    }
  }

  // ── Step 3: Get yesterday's MarketIndicatorDaily for delta computation ──
  const yesterday = getYesterday(date);
  const yesterdayIndicators = await findYesterdayMarketIndicators(yesterday);
  const yesterdayMap = new Map<string, typeof yesterdayIndicators[0]>();
  for (const row of yesterdayIndicators) {
    yesterdayMap.set(row.nodeKey, row);
  }

  // ── Step 4: Get coefficient data for the date ──
  const coefficients = await db.coefficientHistory.findMany({
    where: { date },
  });
  const coefficientMap = new Map<string, typeof coefficients[0]>();
  for (const row of coefficients) {
    coefficientMap.set(row.nodeKey, row);
  }

  // Determine coefficient version
  let coefficientVersion = 1;
  if (coefficients.length > 0) {
    coefficientVersion = Math.max(...coefficients.map(c => c.version));
  }

  // ── Step 5: Compute indicators for each node ──
  const allNodeKeys = getAllNodeKeys();

  for (const nodeKey of allNodeKeys) {
    const nodeScores = scoreMap.get(nodeKey);
    if (!nodeScores || nodeScores.size === 0) continue;

    // Collect (coinId, score, marketCap) triples
    const triples: Array<{ coinId: string; score: number; marketCap: number }> = [];
    for (const [coinId, score] of nodeScores) {
      const mc = marketCapMap.get(coinId);
      if (mc !== undefined && mc > 0) {
        triples.push({ coinId, score, marketCap: mc });
      }
    }

    if (triples.length === 0) continue;

    // aggregateScore: market-cap weighted average
    const totalMarketCap = triples.reduce((sum, t) => sum + t.marketCap, 0);
    const aggregateScore = totalMarketCap > 0
      ? triples.reduce((sum, t) => sum + t.score * t.marketCap, 0) / totalMarketCap
      : 0;

    // equalWeightScore: simple average
    const equalWeightScore = triples.reduce((sum, t) => sum + t.score, 0) / triples.length;

    // medianScore
    const sortedScores = triples.map(t => t.score).sort((a, b) => a - b);
    const mid = Math.floor(sortedScores.length / 2);
    const medianScore = sortedScores.length % 2 !== 0
      ? sortedScores[mid]
      : (sortedScores[mid - 1] + sortedScores[mid]) / 2;

    // Market breadth
    const coinsAboveNeutral = triples.filter(t => t.score > 5).length;
    const coinsBelowNeutral = triples.filter(t => t.score < 5).length;
    const bullBearRatio = coinsAboveNeutral / Math.max(coinsBelowNeutral, 1);

    // Delta from yesterday
    const yesterdayData = yesterdayMap.get(nodeKey);
    const previousAggregateScore = yesterdayData?.aggregateScore ?? null;
    const aggregateScoreChange = previousAggregateScore !== null
      ? Math.round((aggregateScore - previousAggregateScore) * 10000) / 10000
      : null;

    // Coefficient data for this node
    const coeffData = coefficientMap.get(nodeKey);
    const coefficient = coeffData?.coefficient ?? null;
    const previousCoefficient = coeffData?.previousCoefficient ?? null;
    const coefficientChange = coeffData?.coefficientChange ?? null;
    const predictionError = coeffData?.predictionError ?? null;

    // Compute optimization delta (total absolute coefficient change at children level)
    let optimizationDelta: number | null = null;
    const children = HIERARCHY_NODES[nodeKey];
    if (children && children.length > 0) {
      let totalDelta = 0;
      for (const childKey of children) {
        const childCoeff = coefficientMap.get(childKey);
        if (childCoeff?.coefficientChange !== null && childCoeff?.coefficientChange !== undefined) {
          totalDelta += Math.abs(childCoeff.coefficientChange);
        }
      }
      optimizationDelta = Math.round(totalDelta * 10000) / 10000;
    }

    // Upsert MarketIndicatorDaily
    await upsertMarketIndicator({
      nodeKey,
      date,
      aggregateScore: Math.round(aggregateScore * 100) / 100,
      previousAggregateScore,
      aggregateScoreChange,
      equalWeightScore: Math.round(equalWeightScore * 100) / 100,
      medianScore: Math.round(medianScore * 100) / 100,
      coefficient,
      previousCoefficient,
      coefficientChange,
      coefficientVersion,
      coinsAboveNeutral,
      coinsBelowNeutral,
      bullBearRatio: Math.round(bullBearRatio * 100) / 100,
      predictionError,
      optimizationDelta,
    });
  }

  // ── Step 6: Compute MarketDailyScore ──
  await computeMarketDailyScore(date, coefficientVersion);

  console.log(`[MarketIndicators] Computed market indicators for ${date}: ${allNodeKeys.length} nodes.`);
}

// ═══════════════════════════════════════════════════════════════
// MARKET DAILY SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the overall MarketDailyScore for a given date.
 *
 * - marketAiScore: Overall market AI score (0-100), computed from dimension-level aggregate scores
 * - fundamentalScore, technicalScore, onchainScore, marketScore: From dimension-level MarketIndicatorDaily
 * - bullCoins, bearCoins, neutralCoins: Based on CoinDailyScore.aiScore thresholds
 * - marketBreadth: (bullCoins - bearCoins) / totalCoins
 * - Delta values from yesterday
 */
async function computeMarketDailyScore(date: string, coefficientVersion: number): Promise<void> {
  // Get dimension-level indicators
  const dimensionIndicators = await findMarketIndicatorsByDate(date);
  const dimIndicators = dimensionIndicators.filter((r: any) => DIMENSION_KEYS.includes(r.nodeKey));

  const dimMap = new Map<string, any>();
  for (const row of dimIndicators) {
    dimMap.set(row.nodeKey, row);
  }

  // Get dimension coefficients for weighted average
  const dimCoefficients = await db.coefficientHistory.findMany({
    where: {
      date,
      nodeKey: { in: [...DIMENSION_KEYS] },
    },
  });
  const dimCoeffMap = new Map<string, number>();
  for (const row of dimCoefficients) {
    dimCoeffMap.set(row.nodeKey, row.coefficient);
  }

  // Compute marketAiScore: weighted average of dimension aggregate scores
  // Each dimension aggregate score is on 1-10 scale, convert to 0-100
  let marketAiScore = 50; // default
  const fundamentalIndicator = dimMap.get('fundamental');
  const technicalIndicator = dimMap.get('technical');
  const onchainIndicator = dimMap.get('onchain');
  const marketPsychIndicator = dimMap.get('market_psychology');

  const dimScores: Array<{ key: string; aggregateScore: number; coefficient: number }> = [];

  for (const key of DIMENSION_KEYS) {
    const indicator = dimMap.get(key);
    const coeff = dimCoeffMap.get(key) ?? 0.25;
    if (indicator) {
      dimScores.push({
        key,
        aggregateScore: indicator.aggregateScore,
        coefficient: coeff,
      });
    }
  }

  if (dimScores.length > 0) {
    // Weighted average of dimension scores (1-10 scale) → convert to 0-100
    const weightedSum = dimScores.reduce((sum, d) => sum + d.aggregateScore * d.coefficient, 0);
    // Score is on 1-10 scale, map to 0-100: (score - 1) / 9 * 100
    marketAiScore = Math.round(((weightedSum - 1) / 9) * 100 * 10) / 10;
    marketAiScore = Math.max(0, Math.min(100, marketAiScore));
  }

  // Dimension scores (1-10 → 0-100)
  const fundamentalScore = fundamentalIndicator
    ? Math.round(((fundamentalIndicator.aggregateScore - 1) / 9) * 100 * 10) / 10
    : null;
  const technicalScore = technicalIndicator
    ? Math.round(((technicalIndicator.aggregateScore - 1) / 9) * 100 * 10) / 10
    : null;
  const onchainScore = onchainIndicator
    ? Math.round(((onchainIndicator.aggregateScore - 1) / 9) * 100 * 10) / 10
    : null;
  const marketScore = marketPsychIndicator
    ? Math.round(((marketPsychIndicator.aggregateScore - 1) / 9) * 100 * 10) / 10
    : null;

  // Bull/Bear/Neutral coins based on CoinDailyScore.aiScore
  const coinDailyScores = await db.coinDailyScore.findMany({
    where: { date },
    select: { aiScore: true },
  });

  // aiScore is on 1-10 scale. Bull = >6, Bear = <4, Neutral = 4-6
  const bullCoins = coinDailyScores.filter(c => c.aiScore > 6).length;
  const bearCoins = coinDailyScores.filter(c => c.aiScore < 4).length;
  const neutralCoins = coinDailyScores.length - bullCoins - bearCoins;
  const totalCoins = coinDailyScores.length;
  const marketBreadth = totalCoins > 0
    ? Math.round(((bullCoins - bearCoins) / totalCoins) * 10000) / 10000
    : null;

  // Delta from yesterday
  const yesterday = getYesterday(date);
  const yesterdayScore = await findMarketDailyScoreByDate(yesterday);

  const previousMarketAiScore = yesterdayScore?.marketAiScore ?? null;
  const marketAiScoreChange = previousMarketAiScore !== null
    ? Math.round((marketAiScore - previousMarketAiScore) * 100) / 100
    : null;

  const previousFundamentalScore = yesterdayScore?.fundamentalScore ?? null;
  const previousTechnicalScore = yesterdayScore?.technicalScore ?? null;
  const previousOnchainScore = yesterdayScore?.onchainScore ?? null;
  const previousMarketScore = yesterdayScore?.marketScore ?? null;

  // Upsert MarketDailyScore
  await upsertMarketDailyScore({
    date,
    marketAiScore,
    previousMarketAiScore,
    marketAiScoreChange,
    fundamentalScore,
    technicalScore,
    onchainScore,
    marketScore,
    previousFundamentalScore,
    previousTechnicalScore,
    previousOnchainScore,
    previousMarketScore,
    bullCoins,
    bearCoins,
    neutralCoins,
    marketBreadth,
    coefficientVersion,
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Market Indicator History
// ═══════════════════════════════════════════════════════════════

/**
 * Get trend data for a specific hierarchy node over time.
 * Returns sorted by date ascending.
 */
export async function getMarketIndicatorHistory(
  nodeKey: string,
  days: number = 90
): Promise<MarketIndicatorHistoryPoint[]> {
  // Calculate start date
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const rows = await findMarketIndicatorsByNodeKeyAndDateRange(nodeKey, startDateStr, endDateStr);

  return rows.map((row: any) => ({
    date: row.date,
    nodeKey: row.nodeKey,
    aggregateScore: row.aggregateScore,
    equalWeightScore: row.equalWeightScore ?? null,
    medianScore: row.medianScore ?? null,
    coinsAboveNeutral: row.coinsAboveNeutral ?? null,
    coinsBelowNeutral: row.coinsBelowNeutral ?? null,
    bullBearRatio: row.bullBearRatio ?? null,
    coefficient: row.coefficient ?? null,
    coefficientChange: row.coefficientChange ?? null,
    predictionError: row.predictionError ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Market Daily Score History
// ═══════════════════════════════════════════════════════════════

/**
 * Get the overall market health score over time.
 */
export async function getMarketDailyScoreHistory(
  days: number = 90
): Promise<MarketDailyScoreHistoryPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const rows = await findMarketDailyScoresByDateRange(startDateStr, endDateStr);

  return rows.map((row: any) => ({
    date: row.date,
    marketAiScore: row.marketAiScore,
    fundamentalScore: row.fundamentalScore ?? null,
    technicalScore: row.technicalScore ?? null,
    onchainScore: row.onchainScore ?? null,
    marketScore: row.marketScore ?? null,
    bullCoins: row.bullCoins ?? null,
    bearCoins: row.bearCoins ?? null,
    neutralCoins: row.neutralCoins ?? null,
    marketBreadth: row.marketBreadth ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get Latest Market Indicators
// ═══════════════════════════════════════════════════════════════

/**
 * Get the most recent market indicators (overall + per-dimension).
 * Returns the latest MarketDailyScore and all MarketIndicatorDaily rows.
 */
export async function getLatestMarketIndicators(): Promise<{
  dailyScore: MarketDailyScoreOutput | null;
  indicators: Map<string, MarketIndicatorDailyOutput>;
}> {
  // Get the latest MarketDailyScore
  const dailyScore = await findLatestMarketDailyScore();

  // Get the latest date's indicators
  const latestDate = dailyScore?.date;
  let indicators = new Map<string, MarketIndicatorDailyOutput>();

  if (latestDate) {
    const rows = await findMarketIndicatorsByDate(latestDate);

    for (const row of rows as any[]) {
      indicators.set(row.nodeKey, {
        nodeKey: row.nodeKey,
        date: row.date,
        aggregateScore: row.aggregateScore,
        previousAggregateScore: row.previousAggregateScore ?? null,
        aggregateScoreChange: row.aggregateScoreChange ?? null,
        equalWeightScore: row.equalWeightScore ?? 0,
        medianScore: row.medianScore ?? 0,
        coefficient: row.coefficient ?? null,
        previousCoefficient: row.previousCoefficient ?? null,
        coefficientChange: row.coefficientChange ?? null,
        coefficientVersion: row.coefficientVersion ?? 1,
        coinsAboveNeutral: row.coinsAboveNeutral ?? 0,
        coinsBelowNeutral: row.coinsBelowNeutral ?? 0,
        bullBearRatio: row.bullBearRatio ?? 0,
        predictionError: row.predictionError ?? null,
        optimizationDelta: row.optimizationDelta ?? null,
      });
    }
  }

  const dailyScoreOutput: MarketDailyScoreOutput | null = dailyScore
    ? {
        date: dailyScore.date,
        marketAiScore: dailyScore.marketAiScore,
        previousMarketAiScore: dailyScore.previousMarketAiScore ?? null,
        marketAiScoreChange: dailyScore.marketAiScoreChange ?? null,
        fundamentalScore: dailyScore.fundamentalScore ?? null,
        technicalScore: dailyScore.technicalScore ?? null,
        onchainScore: dailyScore.onchainScore ?? null,
        marketScore: dailyScore.marketScore ?? null,
        previousFundamentalScore: dailyScore.previousFundamentalScore ?? null,
        previousTechnicalScore: dailyScore.previousTechnicalScore ?? null,
        previousOnchainScore: dailyScore.previousOnchainScore ?? null,
        previousMarketScore: dailyScore.previousMarketScore ?? null,
        bullCoins: dailyScore.bullCoins ?? 0,
        bearCoins: dailyScore.bearCoins ?? 0,
        neutralCoins: dailyScore.neutralCoins ?? 0,
        marketBreadth: dailyScore.marketBreadth ?? null,
        coefficientVersion: dailyScore.coefficientVersion ?? 1,
      }
    : null;

  return { dailyScore: dailyScoreOutput, indicators };
}

/**
 * Get the latest MarketDailyScore only.
 */
export async function getLatestMarketDailyScore(): Promise<MarketDailyScoreOutput | null> {
  const dailyScore = await findLatestMarketDailyScore();

  if (!dailyScore) return null;

  return {
    date: dailyScore.date,
    marketAiScore: dailyScore.marketAiScore,
    previousMarketAiScore: dailyScore.previousMarketAiScore ?? null,
    marketAiScoreChange: dailyScore.marketAiScoreChange ?? null,
    fundamentalScore: dailyScore.fundamentalScore ?? null,
    technicalScore: dailyScore.technicalScore ?? null,
    onchainScore: dailyScore.onchainScore ?? null,
    marketScore: dailyScore.marketScore ?? null,
    previousFundamentalScore: dailyScore.previousFundamentalScore ?? null,
    previousTechnicalScore: dailyScore.previousTechnicalScore ?? null,
    previousOnchainScore: dailyScore.previousOnchainScore ?? null,
    previousMarketScore: dailyScore.previousMarketScore ?? null,
    bullCoins: dailyScore.bullCoins ?? 0,
    bearCoins: dailyScore.bearCoins ?? 0,
    neutralCoins: dailyScore.neutralCoins ?? 0,
    marketBreadth: dailyScore.marketBreadth ?? null,
    coefficientVersion: dailyScore.coefficientVersion ?? 1,
  };
}
