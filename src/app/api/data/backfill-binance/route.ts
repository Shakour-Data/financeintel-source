/**
 * Binance Historical Data Backfill API
 *
 * POST /api/data/backfill-binance
 *
 * Fetches 3 years of daily OHLCV data from Binance API
 * for coins that don't already have CoinGecko data for those dates.
 *
 * Binance provides up to 1000 days of daily klines for free (no API key).
 * This extends our data from 1 year (CoinGecko free) to 3 years.
 *
 * Features:
 * - Only stores dates NOT already covered by CoinGecko data
 * - Computes price changes, running ATH/ATL from the full price series
 * - Uses Binance's real OHLCV data (high/low/volume are accurate)
 * - Triggers score recomputation for new dates after storage
 *
 * Query params:
 * - coins: comma-separated CoinGecko IDs (default: all Binance-supported coins)
 * - skipScores: "true" to skip score recomputation (default: false)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  fetchBinance3Years,
  storeBinanceData,
  getBinanceSymbol,
  getBinanceSupportedCoins,
  type BinanceFetchResult,
} from '@/lib/binance-historical';
import { upsertCoin } from '@/lib/coin-upsert';

export const maxDuration = 300; // 5 minutes max per request

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const coinsParam = searchParams.get('coins');
    const skipScores = searchParams.get('skipScores') === 'true';

    // Determine which coins to fetch
    const requestedCoins = coinsParam
      ? coinsParam.split(',').map(c => c.trim()).filter(Boolean)
      : getBinanceSupportedCoins();

    // Filter to only coins with Binance symbols
    const coinsToFetch = requestedCoins.filter(id => getBinanceSymbol(id) !== null);

    console.log(`[BackfillBinance] Starting Binance backfill for ${coinsToFetch.length} coins`);

    // ── Step 1: Ensure coins exist in DB ──
    const coinDbIdMap = new Map<string, string>(); // coingeckoId → dbCoinId

    // Coin name/symbol data for upsert
    const COIN_META: Record<string, { symbol: string; name: string }> = {
      'bitcoin': { symbol: 'btc', name: 'Bitcoin' },
      'ethereum': { symbol: 'eth', name: 'Ethereum' },
      'binancecoin': { symbol: 'bnb', name: 'BNB' },
      'solana': { symbol: 'sol', name: 'Solana' },
      'ripple': { symbol: 'xrp', name: 'XRP' },
      'cardano': { symbol: 'ada', name: 'Cardano' },
      'dogecoin': { symbol: 'doge', name: 'Dogecoin' },
      'avalanche-2': { symbol: 'avax', name: 'Avalanche' },
      'tron': { symbol: 'trx', name: 'TRON' },
      'polkadot': { symbol: 'dot', name: 'Polkadot' },
      'chainlink': { symbol: 'link', name: 'Chainlink' },
      'polygon': { symbol: 'pol', name: 'Polygon' },
      'shiba-inu': { symbol: 'shib', name: 'Shiba Inu' },
      'litecoin': { symbol: 'ltc', name: 'Litecoin' },
      'uniswap': { symbol: 'uni', name: 'Uniswap' },
      'cosmos': { symbol: 'atom', name: 'Cosmos' },
      'stellar': { symbol: 'xlm', name: 'Stellar' },
      'monero': { symbol: 'xmr', name: 'Monero' },
      'ethereum-classic': { symbol: 'etc', name: 'Ethereum Classic' },
      'filecoin': { symbol: 'fil', name: 'Filecoin' },
      'aptos': { symbol: 'apt', name: 'Aptos' },
      'near': { symbol: 'near', name: 'NEAR Protocol' },
      'arbitrum': { symbol: 'arb', name: 'Arbitrum' },
      'optimism': { symbol: 'op', name: 'Optimism' },
      'sui': { symbol: 'sui', name: 'Sui' },
      'aave': { symbol: 'aave', name: 'Aave' },
      'maker': { symbol: 'mkr', name: 'Maker' },
      'render-token': { symbol: 'rndr', name: 'Render' },
      'injective-protocol': { symbol: 'inj', name: 'Injective' },
      'vechain': { symbol: 'vet', name: 'VeChain' },
      'the-graph': { symbol: 'grt', name: 'The Graph' },
      'algorand': { symbol: 'algo', name: 'Algorand' },
      'tezos': { symbol: 'xtz', name: 'Tezos' },
      'fantom': { symbol: 'ftm', name: 'Fantom' },
      'pepe': { symbol: 'pepe', name: 'Pepe' },
      'bonk': { symbol: 'bonk', name: 'Bonk' },
      'celestia': { symbol: 'tia', name: 'Celestia' },
      'sei-network': { symbol: 'sei', name: 'Sei' },
      'stacks': { symbol: 'stx', name: 'Stacks' },
      'kaspa': { symbol: 'kas', name: 'Kaspa' },
      'theta-token': { symbol: 'theta', name: 'Theta Network' },
      'hedera-hashgraph': { symbol: 'hbar', name: 'Hedera' },
      'immutable-x': { symbol: 'imx', name: 'Immutable' },
      'mantle': { symbol: 'mnt', name: 'Mantle' },
      'pendle': { symbol: 'pendle', name: 'Pendle' },
      'worldcoin-wld': { symbol: 'wld', name: 'Worldcoin' },
      'jupiter-exchange-solana': { symbol: 'jup', name: 'Jupiter' },
      'ondo-finance': { symbol: 'ondo', name: 'Ondo Finance' },
    };

    for (const coinId of coinsToFetch) {
      const meta = COIN_META[coinId];
      if (meta) {
        const dbId = await upsertCoin(coinId, meta.symbol, meta.name);
        coinDbIdMap.set(coinId, dbId);
      } else {
        // Try to find existing coin in DB
        const existing = await db.coin.findUnique({ where: { coingeckoId: coinId } });
        if (existing) {
          coinDbIdMap.set(coinId, existing.id);
        } else {
          console.warn(`[BackfillBinance] No metadata or DB record for ${coinId}, skipping`);
        }
      }
    }

    console.log(`[BackfillBinance] Upserted/found ${coinDbIdMap.size} coins`);

    // ── Step 2: Fetch Binance data and store ──
    const results: BinanceFetchResult[] = [];

    for (let i = 0; i < coinsToFetch.length; i++) {
      const coinId = coinsToFetch[i];
      const binanceSymbol = getBinanceSymbol(coinId);
      const dbCoinId = coinDbIdMap.get(coinId);

      if (!binanceSymbol || !dbCoinId) {
        results.push({
          coinId,
          binanceSymbol: binanceSymbol ?? 'N/A',
          daysFetched: 0,
          daysStored: 0,
          daysSkipped: 0,
          dateRange: { earliest: null, latest: null },
          error: 'No Binance symbol or DB coin ID',
        });
        continue;
      }

      try {
        console.log(`[BackfillBinance] Fetching ${coinId} (${binanceSymbol}) [${i + 1}/${coinsToFetch.length}]`);

        // Fetch 3 years of daily klines
        const klineData = await fetchBinance3Years(binanceSymbol);

        if (klineData.length === 0) {
          results.push({
            coinId,
            binanceSymbol,
            daysFetched: 0,
            daysStored: 0,
            daysSkipped: 0,
            dateRange: { earliest: null, latest: null },
            error: 'No kline data returned',
          });
          continue;
        }

        // Store in database (only for dates not already covered)
        const storeResult = await storeBinanceData(dbCoinId, coinId, klineData);

        results.push({
          coinId,
          binanceSymbol,
          daysFetched: klineData.length,
          daysStored: storeResult.created,
          daysSkipped: storeResult.skipped,
          dateRange: {
            earliest: klineData[0]?.date ?? null,
            latest: klineData[klineData.length - 1]?.date ?? null,
          },
        });

        console.log(`[BackfillBinance] ${coinId}: ${klineData.length} fetched, ${storeResult.created} stored, ${storeResult.skipped} skipped`);

        // Small delay between requests to be respectful
        if (i < coinsToFetch.length - 1) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[BackfillBinance] Error fetching ${coinId}:`, errorMsg);
        results.push({
          coinId,
          binanceSymbol,
          daysFetched: 0,
          daysStored: 0,
          daysSkipped: 0,
          dateRange: { earliest: null, latest: null },
          error: errorMsg,
        });
      }
    }

    // ── Step 3: Recompute RawGlobalDaily for new dates ──
    let globalDaysUpdated = 0;
    try {
      console.log('[BackfillBinance] Recomputing global daily data for new dates...');

      // Find new dates that don't have global data yet
      const allRawDates = await db.rawMarketDaily.findMany({
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'asc' },
      });

      const existingGlobalDates = await db.rawGlobalDaily.findMany({
        select: { date: true },
      });
      const existingGlobalSet = new Set(existingGlobalDates.map(r => r.date));

      const newDates = allRawDates.filter(d => !existingGlobalSet.has(d.date));

      for (const { date } of newDates) {
        try {
          const dayData = await db.rawMarketDaily.findMany({
            where: { date },
            include: { coin: { select: { coingeckoId: true } } },
          });

          if (dayData.length === 0) continue;

          const totalMarketCap = dayData.reduce((s, d) => s + (d.marketCap ?? 0), 0);
          const totalVolume = dayData.reduce((s, d) => s + (d.totalVolume ?? 0), 0);

          const btcData = dayData.find(d => d.coin.coingeckoId === 'bitcoin');
          const ethData = dayData.find(d => d.coin.coingeckoId === 'ethereum');
          const btcDominance = btcData && totalMarketCap > 0 ? ((btcData.marketCap ?? 0) / totalMarketCap) * 100 : null;
          const ethDominance = ethData && totalMarketCap > 0 ? ((ethData.marketCap ?? 0) / totalMarketCap) * 100 : null;

          const yesterday = addDays(date, -1);
          const yesterdayGlobal = await db.rawGlobalDaily.findUnique({ where: { date: yesterday } });
          const marketCapChangePct24h = yesterdayGlobal?.totalMarketCapUsd
            ? ((totalMarketCap - yesterdayGlobal.totalMarketCapUsd) / yesterdayGlobal.totalMarketCapUsd) * 100
            : null;

          await db.rawGlobalDaily.upsert({
            where: { date },
            update: {
              activeCryptos: dayData.length + 12000,
              totalMarketCapUsd: totalMarketCap,
              totalVolumeUsd: totalVolume,
              btcDominance,
              ethDominance,
              marketCapChangePct24h,
            },
            create: {
              date,
              activeCryptos: dayData.length + 12000,
              totalMarketCapUsd: totalMarketCap,
              totalVolumeUsd: totalVolume,
              btcDominance,
              ethDominance,
              marketCapChangePct24h,
            },
          });

          globalDaysUpdated++;
        } catch {
          // Skip on error
        }
      }

      console.log(`[BackfillBinance] Updated global data for ${globalDaysUpdated} new dates`);
    } catch (err) {
      console.error('[BackfillBinance] Error computing global data:', err);
    }

    // ── Step 4: Recompute scores for new dates ──
    let scoresComputed = 0;
    if (!skipScores) {
      try {
        console.log('[BackfillBinance] Recomputing scores for new dates...');
        const scoreResult = await recomputeScoresForNewDates();
        scoresComputed = scoreResult;
        console.log(`[BackfillBinance] Computed ${scoresComputed} coin-day scores`);
      } catch (err) {
        console.error('[BackfillBinance] Error computing scores:', err);
      }
    }

    const durationMs = Date.now() - startTime;
    const totalFetched = results.reduce((s, r) => s + r.daysFetched, 0);
    const totalStored = results.reduce((s, r) => s + r.daysStored, 0);
    const totalSkipped = results.reduce((s, r) => s + r.daysSkipped, 0);
    const errors = results.filter(r => r.error);

    return NextResponse.json({
      success: true,
      durationMs,
      summary: {
        coinsProcessed: coinsToFetch.length,
        coinsWithErrors: errors.length,
        totalKlinesFetched: totalFetched,
        totalDaysStored: totalStored,
        totalDaysSkipped: totalSkipped,
        globalDaysUpdated,
        scoresComputed,
      },
      results,
    });
  } catch (error) {
    console.error('[BackfillBinance] Fatal error:', error);
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
 * GET endpoint to check Binance data coverage.
 */
export async function GET() {
  try {
    // Get all coins with data
    const coinsWithData = await db.rawMarketDaily.findMany({
      select: { coinId: true, date: true },
      distinct: ['coinId'],
    });

    // Get date range
    const earliest = await db.rawMarketDaily.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    const latest = await db.rawMarketDaily.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    // Count total days of data
    const totalDays = await db.rawMarketDaily.findMany({
      select: { date: true },
      distinct: ['date'],
    });

    // Count per-coin days
    const coinDayCounts = await db.$queryRaw<Array<{ coinId: string; count: bigint }>>`
      SELECT coinId, COUNT(*) as count FROM "RawMarketDaily" GROUP BY coinId
    `;

    const avgDays = coinDayCounts.length > 0
      ? Math.round(coinDayCounts.reduce((s, c) => s + Number(c.count), 0) / coinDayCounts.length)
      : 0;

    const minDays = coinDayCounts.length > 0
      ? Math.min(...coinDayCounts.map(c => Number(c.count)))
      : 0;

    const maxDays = coinDayCounts.length > 0
      ? Math.max(...coinDayCounts.map(c => Number(c.count)))
      : 0;

    // Check Binance support
    const supportedCoins = getBinanceSupportedCoins();
    const allCoins = await db.coin.findMany({ select: { coingeckoId: true } });

    return NextResponse.json({
      dataCoverage: {
        coinsWithData: coinsWithData.length,
        totalCoins: allCoins.length,
        dateRange: {
          earliest: earliest?.date ?? null,
          latest: latest?.date ?? null,
        },
        totalUniqueDays: totalDays.length,
        avgDaysPerCoin: avgDays,
        minDaysPerCoin: minDays,
        maxDaysPerCoin: maxDays,
      },
      binanceSupport: {
        supportedCoinCount: supportedCoins.length,
        supportedCoins,
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
// SCORE RECOMPUTATION
// ═══════════════════════════════════════════════════════════════

async function recomputeScoresForNewDates(): Promise<number> {
  const { calculateCryptoScore, getDimensionDefinitions } = await import('@/lib/scoring-engine-v2');

  // Find dates that have raw data but no scores
  const rawDates = await db.rawMarketDaily.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  const scoreDates = await db.coinDailyScore.findMany({
    select: { date: true },
    distinct: ['date'],
  });
  const scoreDateSet = new Set(scoreDates.map(d => d.date));

  const newDates = rawDates.filter(d => !scoreDateSet.has(d.date));

  if (newDates.length === 0) {
    console.log('[BackfillBinance] No new dates need score computation');
    return 0;
  }

  console.log(`[BackfillBinance] Computing scores for ${newDates.length} new dates`);

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

  let totalScores = 0;
  let currentVersion = 1;

  // Get latest coefficient version
  const latestCoeff = await db.coefficientHistory.findFirst({
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  if (latestCoeff) {
    currentVersion = latestCoeff.version + 1;
  }

  // Process in chunks of 7 days
  const CHUNK_SIZE = 7;
  for (let chunkStart = 0; chunkStart < newDates.length; chunkStart += CHUNK_SIZE) {
    const chunkDates = newDates.slice(chunkStart, chunkStart + CHUNK_SIZE);

    for (const { date } of chunkDates) {
      const rawMarketData = await db.rawMarketDaily.findMany({
        where: { date },
        include: { coin: true },
      });

      if (rawMarketData.length === 0) continue;

      const yesterday = addDays(date, -1);

      for (const rmd of rawMarketData) {
        try {
          const coinInput = {
            id: rmd.coin.coingeckoId,
            dbCoinId: rmd.coinId,
            symbol: rmd.coin.symbol,
            name: rmd.coin.name,
            current_price: rmd.price,
            market_cap: rmd.marketCap ?? 0,
            market_cap_rank: 50,
            fully_diluted_valuation: rmd.fullyDilutedValuation,
            total_volume: rmd.totalVolume ?? 0,
            high_24h: rmd.high24h ?? rmd.price,
            low_24h: rmd.low24h ?? rmd.price,
            price_change_24h: rmd.priceChange24h ?? 0,
            price_change_percentage_24h: rmd.priceChangePct24h ?? 0,
            market_cap_change_24h: rmd.marketCapChangePct24h ? (rmd.marketCap ?? 0) * (rmd.marketCapChangePct24h / 100) : 0,
            market_cap_change_percentage_24h: rmd.marketCapChangePct24h ?? 0,
            circulating_supply: rmd.circulatingSupply ?? 0,
            total_supply: rmd.totalSupply,
            max_supply: rmd.maxSupply,
            ath: rmd.ath ?? rmd.price,
            ath_change_percentage: rmd.athChangePct ?? 0,
            price_change_percentage_1h_in_currency: rmd.priceChangePct1h ?? undefined,
            price_change_percentage_7d_in_currency: rmd.priceChangePct7d ?? undefined,
          };

          const score = calculateCryptoScore(coinInput);
          const dbCoinId = rmd.coinId;

          // Get previous score
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
            where: { coinId_date: { coinId: dbCoinId, date } },
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
              date,
              aiScore: score.aiScore,
              previousAiScore,
              aiScoreChange,
              confidence: score.confidence,
              coefficientVersion: currentVersion,
              ...dimensionFields,
            },
          });

          // Store dimension-level ScoreHistory
          const prevScores = await db.scoreHistory.findMany({
            where: { coinId: dbCoinId, date: yesterday, nodeKey: { in: score.dimensions.map(d => d.key) } },
            select: { nodeKey: true, score: true },
          });
          const prevScoreMap = new Map(prevScores.map(s => [s.nodeKey, s.score]));

          for (const dim of score.dimensions) {
            const prevDimScore = prevScoreMap.get(dim.key);
            const dimChange = prevDimScore !== undefined
              ? Math.round((dim.score - prevDimScore) * 100) / 100
              : 0;

            await db.scoreHistory.upsert({
              where: { coinId_nodeKey_date: { coinId: dbCoinId, nodeKey: dim.key, date } },
              update: {
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
              create: {
                coinId: dbCoinId,
                nodeKey: dim.key,
                date,
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
            });
          }

          totalScores++;
        } catch (err) {
          // Skip this coin on error
          console.error(`[BackfillBinance] Score error for ${rmd.coin.coingeckoId} on ${date}:`, err);
        }
      }
    }

    console.log(`[BackfillBinance] Scored chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}/${Math.ceil(newDates.length / CHUNK_SIZE)} (${totalScores} scores so far)`);
  }

  return totalScores;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
