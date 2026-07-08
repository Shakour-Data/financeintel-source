/**
 * Real Historical Data Backfill API
 *
 * POST /api/data/backfill-real
 *
 * Fetches up to 3 years of REAL historical data from CoinGecko
 * and replaces all GBM-simulated data.
 *
 * Query params:
 * - days: Number of days to fetch (default: 1095 = 3 years)
 * - clearFirst: Whether to clear existing data first (default: true)
 * - skipGlobal: Skip global data computation (default: false)
 * - skipScores: Skip score computation (default: false)
 *
 * Stages:
 * 1. Clear simulated data (if clearFirst=true)
 * 2. Ensure coins exist in DB
 * 3. Fetch real market chart data from CoinGecko for each coin
 * 4. Store in RawMarketDaily
 * 5. Compute RawGlobalDaily
 * 6. Compute CoinDailyScore + ScoreHistory + CoefficientHistory
 * 7. Compute MarketIndicatorDaily + MarketDailyScore
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  fetchCoinMarketChart,
  fetchCoinDetailData,
  storeRealMarketData,
  computeGlobalDailyFromRealData,
  clearSimulatedData,
  type ProgressCallback,
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

export const maxDuration = 300; // 5 minutes max

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '1095');
    const clearFirst = searchParams.get('clearFirst') !== 'false';
    const skipGlobal = searchParams.get('skipGlobal') === 'true';
    const skipScores = searchParams.get('skipScores') === 'true';

    console.log(`[BackfillReal] Starting real data backfill (days=${days}, clearFirst=${clearFirst})`);

    // ── Stage 0: Ensure hierarchy exists ──
    const hierarchyCount = await db.hierarchyNode.count();
    if (hierarchyCount === 0) {
      console.log('[BackfillReal] Seeding hierarchy...');
      await seedHierarchy();
    }

    // ── Stage 1: Clear simulated data ──
    if (clearFirst) {
      console.log('[BackfillReal] Clearing simulated data...');
      await clearSimulatedData();
    }

    // ── Stage 2: Ensure coins exist ──
    // Get the list of coins we want to fetch data for
    const KNOWN_COINS = [
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
      { id: 'render', symbol: 'rndr', name: 'Render' },
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

    // Upsert coins to get their DB IDs
    const coinDbIdMap = new Map<string, string>(); // coingeckoId → dbCoinId
    for (const coin of KNOWN_COINS) {
      const dbId = await upsertCoin(coin.id, coin.symbol, coin.name);
      coinDbIdMap.set(coin.id, dbId);
    }
    console.log(`[BackfillReal] Upserted ${coinDbIdMap.size} coins`);

    // ── Stage 3: Fetch real market chart data ──
    console.log('[BackfillReal] Fetching real market chart data...');
    const fetchResults: Array<{
      coinId: string;
      days: number;
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < KNOWN_COINS.length; i++) {
      const coin = KNOWN_COINS[i];
      const dbCoinId = coinDbIdMap.get(coin.id);
      if (!dbCoinId) continue;

      try {
        // Fetch market chart data
        const historicalData = await fetchCoinMarketChart(coin.id, days);

        // Try to fetch coin detail for supply/ATH data (non-critical)
        let coinDetail: Awaited<ReturnType<typeof fetchCoinDetailData>> | undefined;
        try {
          coinDetail = await fetchCoinDetailData(coin.id);
        } catch {
          console.warn(`[BackfillReal] Could not fetch detail for ${coin.id}, proceeding without it`);
        }

        // Store in database
        const result = await storeRealMarketData(dbCoinId, coin.id, historicalData.data, coinDetail);

        fetchResults.push({
          coinId: coin.id,
          days: historicalData.data.length,
          success: true,
        });

        console.log(`[BackfillReal] ${coin.id}: ${historicalData.data.length} days stored (${result.created} new, ${result.updated} updated)`);

        // Rate limiting: wait between requests
        if (i < KNOWN_COINS.length - 1) {
          const delayMs = 3500; // ~17 calls/min
          await new Promise(r => setTimeout(r, delayMs));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[BackfillReal] Error fetching ${coin.id}:`, errorMsg);
        fetchResults.push({
          coinId: coin.id,
          days: 0,
          success: false,
          error: errorMsg,
        });
      }
    }

    const successCount = fetchResults.filter(r => r.success).length;
    const totalDaysFetched = fetchResults.reduce((s, r) => s + r.days, 0);
    console.log(`[BackfillReal] Fetched real data for ${successCount}/${KNOWN_COINS.length} coins (${totalDaysFetched} total days)`);

    // ── Stage 4: Compute RawGlobalDaily ──
    if (!skipGlobal) {
      console.log('[BackfillReal] Computing global daily data...');
      const globalResult = await computeGlobalDailyFromRealData();
      console.log(`[BackfillReal] Global data: ${globalResult.created} created, ${globalResult.updated} updated`);
    }

    // ── Stage 5: Compute scores from real data ──
    if (!skipScores) {
      console.log('[BackfillReal] Computing scores from real data...');
      const scoreResult = await computeScoresFromRealData();
      console.log(`[BackfillReal] Scores: ${scoreResult.coinDailyScores} coin daily scores, ${scoreResult.scoreHistories} score histories, ${scoreResult.coefficientHistories} coefficient histories`);
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      durationMs,
      fetchResults,
      summary: {
        coinsFetched: successCount,
        totalCoins: KNOWN_COINS.length,
        totalDaysFetched,
        errors: fetchResults.filter(r => !r.success).map(r => ({ coin: r.coinId, error: r.error })),
      },
    });
  } catch (error) {
    console.error('[BackfillReal] Fatal error:', error);
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
 * GET endpoint to check the status of real data in the database.
 */
export async function GET() {
  try {
    const { getRealDataStatus } = await import('@/lib/real-historical-data');
    const status = await getRealDataStatus();

    // Also get score status
    const latestScore = await db.coinDailyScore.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, aiScore: true, aiScoreChange: true },
    });

    const today = new Date().toISOString().split('T')[0];
    const todayScores = await db.coinDailyScore.count({
      where: { date: today },
    });

    return NextResponse.json({
      ...status,
      scores: {
        latestDate: latestScore?.date ?? null,
        todayScoreCount: todayScores,
        latestAiScoreChange: latestScore?.aiScoreChange ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// SCORE COMPUTATION FROM REAL DATA
// ═══════════════════════════════════════════════════════════════

async function computeScoresFromRealData(): Promise<{
  coinDailyScores: number;
  scoreHistories: number;
  coefficientHistories: number;
}> {
  let coinDailyScores = 0;
  let scoreHistories = 0;
  let coefficientHistories = 0;

  // Get all dates with raw data
  const dates = await db.rawMarketDaily.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  console.log(`[BackfillReal] Computing scores for ${dates.length} dates`);

  // Initialize coefficients
  const dimensions = getDimensionDefinitions();
  const coefficients: Record<string, number> = {};
  for (const dim of dimensions) {
    coefficients[dim.key] = 1 / dimensions.length;
  }
  let currentVersion = 1;

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

  // Process in chunks to avoid memory issues
  const CHUNK_SIZE = 30; // Process 30 days at a time
  for (let chunkStart = 0; chunkStart < dates.length; chunkStart += CHUNK_SIZE) {
    const chunkDates = dates.slice(chunkStart, chunkStart + CHUNK_SIZE);

    for (const { date } of chunkDates) {
      // Skip if scores already exist for most coins on this date
      const existingCount = await db.coinDailyScore.count({ where: { date: date } });
      const totalCoins = await db.coin.count();

      if (existingCount >= totalCoins * 0.8) {
        continue; // Skip already computed dates
      }

      // Load raw market data for this date
      const rawMarketData = await db.rawMarketDaily.findMany({
        where: { date: date },
        include: { coin: true },
      });

      if (rawMarketData.length === 0) continue;

      // Build CoinInput array
      const coinInputs: CoinInput[] = rawMarketData.map(rmd => ({
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

      // Compute and store scores for each coin
      const yesterday = addDays(date, -1);

      for (const coinInput of coinInputs) {
        try {
          const score: CryptoScore = calculateCryptoScore(coinInput);
          const dbCoinId = coinInput.dbCoinId!;

          // Get previous score for delta computation
          const prevScore = await db.coinDailyScore.findUnique({
            where: { coinId_date: { coinId: dbCoinId, date: yesterday } },
          });

          const previousAiScore = prevScore?.aiScore ?? score.aiScore;
          const aiScoreChange = Math.round((score.aiScore - previousAiScore) * 100) / 100;

          // Map dimension scores
          const dimensionScores: Record<string, number> = {};
          for (const dim of score.dimensions) {
            dimensionScores[dim.key] = dim.score;
          }
          const dimensionFields: Record<string, number | null> = {};
          for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
            dimensionFields[fieldName] = dimensionScores[dimKey] ?? null;
          }

          await db.coinDailyScore.upsert({
            where: { coinId_date: { coinId: dbCoinId, date: date } },
            update: {
              aiScore: score.aiScore,
              previousAiScore,
              aiScoreChange,
              confidence: score.confidence,
              coefficientVersion: currentVersion,
              ...dimensionFields,
            },
            create: {
              coinId: dbCoinId,
              date: date,
              aiScore: score.aiScore,
              previousAiScore,
              aiScoreChange,
              confidence: score.confidence,
              coefficientVersion: currentVersion,
              ...dimensionFields,
            },
          });
          coinDailyScores++;

          // Store dimension-level ScoreHistory (12 rows per coin per day)
          const prevScores = await db.scoreHistory.findMany({
            where: { coinId: dbCoinId, date: yesterday, nodeKey: { in: score.dimensions.map(d => d.key) } },
            select: { nodeKey: true, score: true },
          });
          const prevScoreMap = new Map(prevScores.map(s => [s.nodeKey, s.score]));

          for (const dim of score.dimensions) {
            const prevDimScore = prevScoreMap.get(dim.key);
            // Only use prevDimScore if it exists; otherwise, don't store previousScore
            const dimChange = prevDimScore !== undefined
              ? Math.round((dim.score - prevDimScore) * 100) / 100
              : 0;

            await db.scoreHistory.upsert({
              where: { coinId_nodeKey_date: { coinId: dbCoinId, nodeKey: dim.key, date: date } },
              update: {
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
              create: {
                coinId: dbCoinId,
                nodeKey: dim.key,
                date: date,
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
            });
            scoreHistories++;
          }
        } catch (err) {
          // Skip this coin on error
          console.error(`[BackfillReal] Score error for ${coinInput.id} on ${date}:`, err);
        }
      }

      // Update coefficients — deterministic perturbation based on score direction
      // (replaces Math.random with reproducible adjustments)
      currentVersion++;
      const dimKeys = getDimensionDefinitions().map(d => d.key);
      // Use a simple hash-based perturbation instead of Math.random
      const dateHash = date.split('').reduce((h, ch) => ((h << 5) - h) + ch.charCodeAt(0) | 0, 0);
      const dateNorm = Math.abs(dateHash % 1000) / 1000; // 0..1 deterministic
      for (const nodeKey of Object.keys(coefficients)) {
        const prevCoeff = coefficients[nodeKey];
        // Deterministic perturbation: slight drift based on date + node hash
        const nodeHash = nodeKey.split('').reduce((h, ch) => ((h << 5) - h) + ch.charCodeAt(0) | 0, 0);
        const nodeNorm = Math.abs(nodeHash % 1000) / 1000;
        const perturbation = (dateNorm + nodeNorm - 1) * 0.002; // -0.002 to +0.002
        coefficients[nodeKey] = Math.max(0.05, prevCoeff + perturbation);
      }
      // Normalize
      const dimSum = dimKeys.reduce((s, k) => s + (coefficients[k] ?? 0), 0);
      if (dimSum > 0) {
        for (const k of dimKeys) {
          coefficients[k] = (coefficients[k] ?? 0) / dimSum;
        }
      }

      // Store coefficient history every 7 days
      if (dates.indexOf(dates.find(d => d.date === date)!) % 7 === 0) {
        for (const nodeKey of Object.keys(coefficients)) {
          try {
            await db.coefficientHistory.upsert({
              where: { nodeKey_date: { nodeKey, date: date } },
              update: {},
              create: {
                nodeKey,
                date: date,
                version: currentVersion,
                coefficient: coefficients[nodeKey],
                previousCoefficient: coefficients[nodeKey],
                coefficientChange: 0,
                predictionError: 0.01,
              },
            });
            coefficientHistories++;
          } catch { /* skip */ }
        }
      }
    }

    console.log(`[BackfillReal] Processed chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}/${Math.ceil(dates.length / CHUNK_SIZE)} (${coinDailyScores} scores so far)`);
  }

  // ── Stage 6: Compute Market Indicators ──
  console.log('[BackfillReal] Computing market indicators...');
  let marketIndicators = 0;
  for (const { date } of dates) {
    try {
      const existing = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketIndicatorDaily" WHERE date = ${date}`;
      if (Number(existing[0]?.count ?? 0) > 0) continue;

      await computeMarketIndicators(date);
      marketIndicators++;
    } catch (err) {
      // Skip on error
    }
  }
  console.log(`[BackfillReal] Computed ${marketIndicators} market indicator days`);

  return { coinDailyScores, scoreHistories, coefficientHistories };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
