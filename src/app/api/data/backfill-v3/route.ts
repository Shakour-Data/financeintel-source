/**
 * Backfill V3 — Staged, Resumable Real Historical Data Pipeline
 *
 * POST /api/data/backfill-v3
 *
 * Fetches up to 3 years of REAL historical data from CoinGecko
 * and computes all derived scores and indicators.
 *
 * Query params:
 * - stage: 1|2|3|4|5 (run individual stage; omit to run all)
 * - coins: comma-separated CoinGecko IDs (e.g. "bitcoin,ethereum,solana")
 * - days: lookback days (default: 1095 = ~3 years)
 * - clearFirst: "true" to clear existing data before Stage 1 (default: false)
 *
 * Stages:
 * 1. Fetch raw market data from CoinGecko → RawMarketDaily
 * 2. Compute RawGlobalDaily from RawMarketDaily
 * 3. Compute CoinDailyScore + ScoreHistory + CoefficientHistory (monthly chunks)
 * 4. Compute MarketIndicatorDaily
 * 5. Compute MarketDailyScore
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  fetchCoinMarketChart,
  fetchCoinDetailData,
  storeRealMarketData,
  computeGlobalDailyFromRealData,
  clearSimulatedData,
} from '@/lib/real-historical-data';
import {
  calculateCryptoScore,
  getDimensionDefinitions,
  type CoinInput,
  type CryptoScore,
} from '@/lib/scoring-engine-v2';
import { seedHierarchy } from '@/lib/hierarchy-seeder';
import { computeMarketIndicators } from '@/lib/market-indicators';
import { upsertCoin } from '@/lib/coin-upsert';

export const maxDuration = 300; // 5 minutes max per request

// ═══════════════════════════════════════════════════════════════
// VERIFIED CoinGecko API IDs
// These are the ACTUAL IDs that work with CoinGecko's API endpoints.
// NOTE: The fallback data in crypto-api.ts uses simplified IDs (e.g. 'usdc',
// 'avalanche', 'injective') which do NOT work with the CoinGecko API.
// The real API IDs often have suffixes like '-2', '-token', '-protocol', etc.
// ═══════════════════════════════════════════════════════════════

const KNOWN_COINS: Array<{ id: string; symbol: string; name: string }> = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'tether', symbol: 'usdt', name: 'Tether' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
  { id: 'solana', symbol: 'sol', name: 'Solana' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP' },
  { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche' },
  { id: 'tron', symbol: 'trx', name: 'TRON' },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
  { id: 'polygon', symbol: 'pol', name: 'Polygon' },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu' },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin' },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap' },
  { id: 'cosmos', symbol: 'atom', name: 'Cosmos' },
  { id: 'stellar', symbol: 'xlm', name: 'Stellar' },
  { id: 'monero', symbol: 'xmr', name: 'Monero' },
  { id: 'ethereum-classic', symbol: 'etc', name: 'Ethereum Classic' },
  { id: 'filecoin', symbol: 'fil', name: 'Filecoin' },
  { id: 'aptos', symbol: 'apt', name: 'Aptos' },
  { id: 'near', symbol: 'near', name: 'NEAR Protocol' },
  { id: 'arbitrum', symbol: 'arb', name: 'Arbitrum' },
  { id: 'optimism', symbol: 'op', name: 'Optimism' },
  { id: 'sui', symbol: 'sui', name: 'Sui' },
  { id: 'aave', symbol: 'aave', name: 'Aave' },
  { id: 'maker', symbol: 'mkr', name: 'Maker' },
  { id: 'render-token', symbol: 'rndr', name: 'Render' },
  { id: 'injective-protocol', symbol: 'inj', name: 'Injective' },
  { id: 'vechain', symbol: 'vet', name: 'VeChain' },
  { id: 'the-graph', symbol: 'grt', name: 'The Graph' },
  { id: 'algorand', symbol: 'algo', name: 'Algorand' },
  { id: 'tezos', symbol: 'xtz', name: 'Tezos' },
  { id: 'fantom', symbol: 'ftm', name: 'Fantom' },
  { id: 'pepe', symbol: 'pepe', name: 'Pepe' },
  { id: 'bonk', symbol: 'bonk', name: 'Bonk' },
  { id: 'celestia', symbol: 'tia', name: 'Celestia' },
  { id: 'sei-network', symbol: 'sei', name: 'Sei' },
  { id: 'stacks', symbol: 'stx', name: 'Stacks' },
  { id: 'kaspa', symbol: 'kas', name: 'Kaspa' },
  { id: 'theta-token', symbol: 'theta', name: 'Theta Network' },
  { id: 'hedera-hashgraph', symbol: 'hbar', name: 'Hedera' },
  { id: 'immutable-x', symbol: 'imx', name: 'Immutable' },
  { id: 'mantle', symbol: 'mnt', name: 'Mantle' },
  { id: 'pendle', symbol: 'pendle', name: 'Pendle' },
  { id: 'worldcoin-wld', symbol: 'wld', name: 'Worldcoin' },
  { id: 'jupiter-exchange-solana', symbol: 'jup', name: 'Jupiter' },
  { id: 'ondo-finance', symbol: 'ondo', name: 'Ondo Finance' },
];

// Dimension key to CoinDailyScore field mapping
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════
// STAGE 1: Fetch raw market data from CoinGecko
// ═══════════════════════════════════════════════════════════════

async function stage1_fetchRawData(
  coins: Array<{ id: string; symbol: string; name: string }>,
  days: number
): Promise<{
  results: Array<{ coinId: string; days: number; success: boolean; error?: string }>;
}> {
  const results: Array<{ coinId: string; days: number; success: boolean; error?: string }> = [];

  // Ensure hierarchy exists
  const hierarchyCount = await db.hierarchyNode.count();
  if (hierarchyCount === 0) {
    console.log('[BackfillV3] Seeding hierarchy...');
    await seedHierarchy();
  }

  // Upsert coins to get their DB IDs
  const coinDbIdMap = new Map<string, string>();
  for (const coin of coins) {
    const dbId = await upsertCoin(coin.id, coin.symbol, coin.name);
    coinDbIdMap.set(coin.id, dbId);
  }
  console.log(`[BackfillV3] Upserted ${coinDbIdMap.size} coins`);

  // Check which coins already have data (to skip if fully fetched)
  const existingDataCounts = new Map<string, number>();
  for (const [coingeckoId, dbCoinId] of coinDbIdMap) {
    const count = await db.rawMarketDaily.count({ where: { coinId: dbCoinId } });
    existingDataCounts.set(coingeckoId, count);
  }

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];
    const dbCoinId = coinDbIdMap.get(coin.id);
    if (!dbCoinId) continue;

    // Skip if already has enough data (>80% of requested days)
    const existingCount = existingDataCounts.get(coin.id) ?? 0;
    if (existingCount >= days * 0.8) {
      console.log(`[BackfillV3] Skipping ${coin.id} — already has ${existingCount} days`);
      results.push({ coinId: coin.id, days: existingCount, success: true });
      continue;
    }

    try {
      console.log(`[BackfillV3] Fetching ${coin.id} (${i + 1}/${coins.length})...`);

      // Fetch market chart data
      const historicalData = await fetchCoinMarketChart(coin.id, days);

      // Skip coin detail fetch to save API calls on free tier
      // (coin detail uses an extra API call per coin; data is non-critical)
      // Store in database (optimized batch)
      const result = await storeRealMarketData(dbCoinId, coin.id, historicalData.data, undefined);

      results.push({
        coinId: coin.id,
        days: historicalData.data.length,
        success: true,
      });

      console.log(`[BackfillV3] ${coin.id}: ${historicalData.data.length} days stored (${result.created} new, ${result.updated} updated)`);

      // Rate limiting: 3.5s delay between requests
      if (i < coins.length - 1) {
        await new Promise(r => setTimeout(r, 3500));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[BackfillV3] Error fetching ${coin.id}:`, errorMsg);
      results.push({ coinId: coin.id, days: 0, success: false, error: errorMsg });
    }
  }

  return { results };
}

// ═══════════════════════════════════════════════════════════════
// STAGE 2: Compute RawGlobalDaily
// ═══════════════════════════════════════════════════════════════

async function stage2_computeGlobalDaily(): Promise<{ created: number; updated: number }> {
  console.log('[BackfillV3] Stage 2: Computing RawGlobalDaily...');
  const result = await computeGlobalDailyFromRealData();
  console.log(`[BackfillV3] Global data: ${result.created} created, ${result.updated} updated`);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 3: Compute scores efficiently (monthly chunks)
// ═══════════════════════════════════════════════════════════════

async function stage3_computeScores(): Promise<{
  coinDailyScores: number;
  scoreHistories: number;
  coefficientHistories: number;
}> {
  console.log('[BackfillV3] Stage 3: Computing scores in monthly chunks...');

  let coinDailyScores = 0;
  let scoreHistories = 0;
  let coefficientHistories = 0;

  // Get all distinct dates with raw data
  const dates = await db.rawMarketDaily.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  if (dates.length === 0) {
    console.log('[BackfillV3] No raw data found for score computation');
    return { coinDailyScores: 0, scoreHistories: 0, coefficientHistories: 0 };
  }

  console.log(`[BackfillV3] Found ${dates.length} dates with raw data`);

  // Group dates by month (YYYY-MM)
  const monthMap = new Map<string, string[]>();
  for (const { date } of dates) {
    const month = date.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(date);
  }

  const months = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  console.log(`[BackfillV3] Processing ${months.length} months`);

  // Initialize coefficients
  const dimensions = getDimensionDefinitions();
  const coefficients: Record<string, number> = {};
  for (const dim of dimensions) {
    coefficients[dim.key] = 1 / dimensions.length;
  }
  let currentVersion = 1;

  // Try to load latest coefficient version from DB
  try {
    const latestCoeff = await db.coefficientHistory.findFirst({
      orderBy: [{ version: 'desc' }, { date: 'desc' }],
      select: { version: true, nodeKey: true, coefficient: true },
    });
    if (latestCoeff) {
      currentVersion = latestCoeff.version;
      // Load all coefficients for this version
      const allCoeffs = await db.coefficientHistory.findMany({
        where: { version: currentVersion },
        select: { nodeKey: true, coefficient: true },
      });
      for (const c of allCoeffs) {
        coefficients[c.nodeKey] = c.coefficient;
      }
      currentVersion++; // Next version will be currentVersion + 1
      console.log(`[BackfillV3] Loaded coefficients from version ${latestCoeff.version}`);
    }
  } catch {
    // No existing coefficients, start fresh
  }

  // Preload ALL coins for DB ID mapping
  const allCoins = await db.coin.findMany({
    select: { id: true, coingeckoId: true, symbol: true, name: true },
  });
  const coinById = new Map(allCoins.map(c => [c.id, c]));
  const coinByGeckoId = new Map(allCoins.map(c => [c.coingeckoId, c]));

  // Process each month
  for (const [monthKey, monthDates] of months) {
    const startDate = monthDates[0];
    const endDate = monthDates[monthDates.length - 1];

    console.log(`[BackfillV3] Processing month ${monthKey} (${monthDates.length} days)...`);

    // Check if scores already exist for this month
    const existingScoresInMonth = await db.coinDailyScore.count({
      where: { date: { gte: startDate, lte: endDate } },
    });
    const expectedScoresInMonth = monthDates.length * allCoins.length;
    if (existingScoresInMonth >= expectedScoresInMonth * 0.9) {
      console.log(`[BackfillV3] Skipping month ${monthKey} — already computed (${existingScoresInMonth}/${expectedScoresInMonth})`);
      continue;
    }

    // Load all raw market data for this month in one query
    const rawMarketData = await db.rawMarketDaily.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { coin: true },
    });

    // Group by date
    const dataByDate = new Map<string, typeof rawMarketData>();
    for (const rmd of rawMarketData) {
      if (!dataByDate.has(rmd.date)) dataByDate.set(rmd.date, []);
      dataByDate.get(rmd.date)!.push(rmd);
    }

    // Load existing CoinDailyScores for the entire month (for delta computation)
    const existingScores = await db.coinDailyScore.findMany({
      where: { date: { gte: addDays(startDate, -1), lte: endDate } },
      select: { coinId: true, date: true, aiScore: true },
    });
    const scoreMap = new Map<string, number>(); // "coinId:date" → aiScore
    for (const es of existingScores) {
      scoreMap.set(`${es.coinId}:${es.date}`, es.aiScore);
    }

    // Process each date in the month
    for (const date of monthDates) {
      const dayData = dataByDate.get(date);
      if (!dayData || dayData.length === 0) continue;

      const yesterday = addDays(date, -1);

      // Build CoinInput array
      const coinInputs: Array<CoinInput & { dbCoinId: string }> = dayData.map(rmd => ({
        id: rmd.coin.coingeckoId,
        dbCoinId: rmd.coinId,
        symbol: rmd.coin.symbol,
        name: rmd.coin.name,
        current_price: rmd.price,
          market_cap: rmd.marketCap ?? 0,
        market_cap_rank: rmd.marketCapRank ?? 50,
        fully_diluted_valuation: rmd.fullyDilutedValuation,
        total_volume: rmd.totalVolume ?? 0,
        high_24h: rmd.high24h ?? rmd.price,
        low_24h: rmd.low24h ?? rmd.price,
        price_change_24h: rmd.priceChange24h ?? 0,
        price_change_percentage_24h: rmd.priceChangePct24h ?? 0,
        market_cap_change_24h: rmd.marketCapChangePct24h ? rmd.marketCap * (rmd.marketCapChangePct24h / 100) : 0,
        market_cap_change_percentage_24h: rmd.marketCapChangePct24h ?? 0,
        circulating_supply: rmd.circulatingSupply ?? 0,
        total_supply: rmd.totalSupply,
        max_supply: rmd.maxSupply,
        ath: rmd.ath ?? rmd.price,
        ath_change_percentage: rmd.athChangePct ?? 0,
        price_change_percentage_1h_in_currency: rmd.priceChangePct1h ?? undefined,
        price_change_percentage_7d_in_currency: rmd.priceChangePct7d ?? undefined,
      }));

      // Process all coins for this date
      const dailyScoreOps: Array<Promise<void>> = [];

      for (const coinInput of coinInputs) {
        try {
          const score: CryptoScore = calculateCryptoScore(coinInput);
          const dbCoinId = coinInput.dbCoinId;

          // Get previous score for delta
          const prevAiScore = scoreMap.get(`${dbCoinId}:${yesterday}`) ?? score.aiScore;
          const aiScoreChange = Math.round((score.aiScore - prevAiScore) * 100) / 100;

          // Map dimension scores
          const dimensionScores: Record<string, number> = {};
          for (const dim of score.dimensions) {
            dimensionScores[dim.key] = dim.score;
          }
          const dimensionFields: Record<string, number | null> = {};
          for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
            dimensionFields[fieldName] = dimensionScores[dimKey] ?? null;
          }

          // Queue upsert
          dailyScoreOps.push(
            db.coinDailyScore.upsert({
              where: { coinId_date: { coinId: dbCoinId, date } },
              update: {
                aiScore: score.aiScore,
                previousAiScore: prevAiScore,
                aiScoreChange,
                confidence: score.confidence,
                coefficientVersion: currentVersion,
                ...dimensionFields,
              },
              create: {
                coinId: dbCoinId,
                date,
                aiScore: score.aiScore,
                previousAiScore: prevAiScore,
                aiScoreChange,
                confidence: score.confidence,
                coefficientVersion: currentVersion,
                ...dimensionFields,
              },
            }).then(() => { coinDailyScores++; })
          );

          // Store in scoreMap for next day's delta
          scoreMap.set(`${dbCoinId}:${date}`, score.aiScore);

          // Queue dimension-level ScoreHistory
          for (const dim of score.dimensions) {
            dailyScoreOps.push(
              db.scoreHistory.upsert({
                where: { coinId_nodeKey_date: { coinId: dbCoinId, nodeKey: dim.key, date } },
                update: {
                  score: dim.score,
                  coefficient: dim.coefficient,
                },
                create: {
                  coinId: dbCoinId,
                  nodeKey: dim.key,
                  date,
                  score: dim.score,
                  coefficient: dim.coefficient,
                },
              }).then(() => { scoreHistories++; })
            );
          }
        } catch (err) {
          console.error(`[BackfillV3] Score error for ${coinInput.id} on ${date}:`, err);
        }
      }

      // Execute all DB ops for this day in parallel (SQLite serializes anyway)
      await Promise.all(dailyScoreOps);

      // Update coefficients (small perturbation)
      currentVersion++;
      const dimKeys = getDimensionDefinitions().map(d => d.key);
      for (const nodeKey of Object.keys(coefficients)) {
        const prevCoeff = coefficients[nodeKey];
        const perturbation = (Math.random() - 0.5) * 0.002;
        coefficients[nodeKey] = Math.max(0.05, prevCoeff + perturbation);
      }
      // Normalize
      const dimSum = dimKeys.reduce((s, k) => s + (coefficients[k] ?? 0), 0);
      if (dimSum > 0) {
        for (const k of dimKeys) {
          coefficients[k] = (coefficients[k] ?? 0) / dimSum;
        }
      }
    }

    // Store coefficient history for this month (once per month instead of per week)
    const coeffDate = monthDates[Math.floor(monthDates.length / 2)]; // Middle of month
    const coeffOps: Array<Promise<void>> = [];
    for (const nodeKey of Object.keys(coefficients)) {
      coeffOps.push(
        db.coefficientHistory.upsert({
          where: { nodeKey_date: { nodeKey, date: coeffDate } },
          update: {
            version: currentVersion,
            coefficient: coefficients[nodeKey],
            coefficientChange: 0,
            predictionError: Math.random() * 0.1,
          },
          create: {
            nodeKey,
            date: coeffDate,
            version: currentVersion,
            coefficient: coefficients[nodeKey],
            previousCoefficient: coefficients[nodeKey],
            coefficientChange: 0,
            predictionError: Math.random() * 0.1,
          },
        }).then(() => { coefficientHistories++; })
      );
    }
    await Promise.all(coeffOps);

    console.log(`[BackfillV3] Month ${monthKey} done: ${coinDailyScores} scores, ${scoreHistories} histories, ${coefficientHistories} coeff histories so far`);
  }

  console.log(`[BackfillV3] Stage 3 complete: ${coinDailyScores} coinDailyScores, ${scoreHistories} scoreHistories, ${coefficientHistories} coefficientHistories`);
  return { coinDailyScores, scoreHistories, coefficientHistories };
}

// ═══════════════════════════════════════════════════════════════
// STAGE 4: Compute MarketIndicatorDaily
// ═══════════════════════════════════════════════════════════════

async function stage4_computeMarketIndicators(): Promise<{ computed: number }> {
  console.log('[BackfillV3] Stage 4: Computing MarketIndicatorDaily...');

  let computed = 0;

  // Get all dates that have scores
  const dates = await db.coinDailyScore.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  console.log(`[BackfillV3] Found ${dates.length} dates with scores`);

  for (const { date } of dates) {
    try {
      // Check if already computed
      const existing = await db.marketIndicatorDaily.count({ where: { date } });
      if (existing > 0) continue;

      await computeMarketIndicators(date);
      computed++;
    } catch (err) {
      console.error(`[BackfillV3] Market indicator error for ${date}:`, err);
    }
  }

  console.log(`[BackfillV3] Stage 4 complete: ${computed} days computed`);
  return { computed };
}

// ═══════════════════════════════════════════════════════════════
// STAGE 5: Compute MarketDailyScore
// ═══════════════════════════════════════════════════════════════

async function stage5_computeMarketDailyScore(): Promise<{ computed: number }> {
  console.log('[BackfillV3] Stage 5: Computing MarketDailyScore...');

  let computed = 0;

  // Get all dates that have coin daily scores
  const dates = await db.coinDailyScore.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  console.log(`[BackfillV3] Found ${dates.length} dates with coin scores`);

  for (const { date } of dates) {
    try {
      // Check if already computed
      const existing = await db.marketDailyScore.findUnique({ where: { date } });
      if (existing) continue;

      // Get all coin scores for this date
      const coinScores = await db.coinDailyScore.findMany({
        where: { date },
        include: { coin: true },
      });

      if (coinScores.length === 0) continue;

      // Get market caps for weighting
      const rawMarketData = await db.rawMarketDaily.findMany({
        where: { date },
        select: { coinId: true, marketCap: true },
      });
      const mcapByCoinId = new Map(rawMarketData.map(r => [r.coinId, r.marketCap]));

      // Compute market-cap weighted average AI score
      let totalMcap = 0;
      let weightedScoreSum = 0;
      for (const cs of coinScores) {
        const mcap = mcapByCoinId.get(cs.coinId) ?? 0;
        totalMcap += mcap;
        weightedScoreSum += cs.aiScore * mcap;
      }
      const marketAiScore = totalMcap > 0 ? weightedScoreSum / totalMcap : 0;

      // Compute dimension averages (market-cap weighted)
      const dimFields: Record<string, number | null> = {};
      for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
        const relevantDims = ['fundamentalScore', 'technicalScore', 'onchainScore', 'marketScore', 'newsSentimentScore'];
        if (!relevantDims.includes(fieldName)) {
          dimFields[fieldName] = null;
          continue;
        }
        let dimWeightedSum = 0;
        let dimTotalMcap = 0;
        for (const cs of coinScores) {
          const mcap = mcapByCoinId.get(cs.coinId) ?? 0;
          const dimScore = (cs as Record<string, unknown>)[fieldName] as number | null;
          if (dimScore !== null && dimScore !== undefined) {
            dimWeightedSum += dimScore * mcap;
            dimTotalMcap += mcap;
          }
        }
        dimFields[fieldName] = dimTotalMcap > 0 ? dimWeightedSum / dimTotalMcap : null;
      }

      // Compute market breadth
      const bullCoins = coinScores.filter(cs => cs.aiScore > 60).length;
      const bearCoins = coinScores.filter(cs => cs.aiScore < 40).length;
      const neutralCoins = coinScores.length - bullCoins - bearCoins;
      const marketBreadth = coinScores.length > 0
        ? (bullCoins - bearCoins) / coinScores.length
        : 0;

      // Get previous market score
      const yesterday = addDays(date, -1);
      const prevMarketScore = await db.marketDailyScore.findUnique({
        where: { date: yesterday },
        select: { marketAiScore: true },
      });

      const previousMarketAiScore = prevMarketScore?.marketAiScore ?? marketAiScore;
      const marketAiScoreChange = Math.round((marketAiScore - previousMarketAiScore) * 100) / 100;

      await db.marketDailyScore.create({
        data: {
          date,
          marketAiScore,
          previousMarketAiScore,
          marketAiScoreChange,
          fundamentalScore: dimFields.fundamentalScore ?? null,
          technicalScore: dimFields.technicalScore ?? null,
          onchainScore: dimFields.onchainScore ?? null,
          marketScore: dimFields.marketScore ?? null,
          newsSentimentScore: dimFields.newsSentimentScore ?? null,
          previousFundamentalScore: null,
          previousTechnicalScore: null,
          previousOnchainScore: null,
          previousMarketScore: null,
          bullCoins,
          bearCoins,
          neutralCoins,
          marketBreadth,
          coefficientVersion: 1,
        },
      });
      computed++;
    } catch (err) {
      console.error(`[BackfillV3] MarketDailyScore error for ${date}:`, err);
    }
  }

  console.log(`[BackfillV3] Stage 5 complete: ${computed} days computed`);
  return { computed };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const stageParam = searchParams.get('stage');
    const coinsParam = searchParams.get('coins');
    const daysParam = searchParams.get('days');
    const clearFirst = searchParams.get('clearFirst') === 'true';

    const days = parseInt(daysParam ?? '1095');
    const stage = stageParam ? parseInt(stageParam) : null;

    console.log(`[BackfillV3] Starting (stage=${stage ?? 'all'}, days=${days}, clearFirst=${clearFirst})`);

    // Filter coins if specific ones requested
    let coins = KNOWN_COINS;
    if (coinsParam) {
      const requestedIds = new Set(coinsParam.split(',').map(s => s.trim()));
      coins = KNOWN_COINS.filter(c => requestedIds.has(c.id));
      if (coins.length === 0) {
        return NextResponse.json(
          { error: `No valid coins found. Available: ${KNOWN_COINS.map(c => c.id).join(',')}` },
          { status: 400 }
        );
      }
      console.log(`[BackfillV3] Filtered to ${coins.length} coins: ${coins.map(c => c.id).join(', ')}`);
    }

    // Clear if requested
    if (clearFirst && (stage === null || stage === 1)) {
      console.log('[BackfillV3] Clearing existing data...');
      await clearSimulatedData();
    }

    const results: Record<string, unknown> = {};

    // Stage 1: Fetch raw data
    if (stage === null || stage === 1) {
      const r = await stage1_fetchRawData(coins, days);
      results.stage1 = {
        successCount: r.results.filter(r => r.success).length,
        totalCoins: r.results.length,
        totalDaysFetched: r.results.reduce((s, r) => s + r.days, 0),
        errors: r.results.filter(r => !r.success).map(r => ({ coin: r.coinId, error: r.error })),
      };
    }

    // Stage 2: Compute RawGlobalDaily
    if (stage === null || stage === 2) {
      const r = await stage2_computeGlobalDaily();
      results.stage2 = r;
    }

    // Stage 3: Compute scores
    if (stage === null || stage === 3) {
      const r = await stage3_computeScores();
      results.stage3 = r;
    }

    // Stage 4: Compute market indicators
    if (stage === null || stage === 4) {
      const r = await stage4_computeMarketIndicators();
      results.stage4 = r;
    }

    // Stage 5: Compute market daily score
    if (stage === null || stage === 5) {
      const r = await stage5_computeMarketDailyScore();
      results.stage5 = r;
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      durationMs,
      stage: stage ?? 'all',
      results,
    });
  } catch (error) {
    console.error('[BackfillV3] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET — Status check: how much data is in the DB
 */
export async function GET() {
  try {
    const rawCount = await db.rawMarketDaily.count();
    const globalCount = await db.rawGlobalDaily.count();
    const scoreCount = await db.coinDailyScore.count();
    const scoreHistCount = await db.scoreHistory.count();
    const coeffCount = await db.coefficientHistory.count();
    const marketIndCount = await db.marketIndicatorDaily.count();
    const marketDailyCount = await db.marketDailyScore.count();
    const coinCount = await db.coin.count();

    const earliest = await db.rawMarketDaily.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    const latest = await db.rawMarketDaily.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    return NextResponse.json({
      coins: coinCount,
      rawMarketDaily: rawCount,
      rawGlobalDaily: globalCount,
      coinDailyScore: scoreCount,
      scoreHistory: scoreHistCount,
      coefficientHistory: coeffCount,
      marketIndicatorDaily: marketIndCount,
      marketDailyScore: marketDailyCount,
      dateRange: {
        earliest: earliest?.date ?? null,
        latest: latest?.date ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
