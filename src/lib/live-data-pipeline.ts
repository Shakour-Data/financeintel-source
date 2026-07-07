/**
 * Live Data Pipeline — Real-time data ingestion and score computation.
 *
 * This module is the central hub for the real-time data pipeline:
 * 1. Stores today's raw market data from CoinGecko into RawMarketDaily
 * 2. Stores today's global market data into RawGlobalDaily
 * 3. Computes scores with REAL previous-day deltas from CoinDailyScore
 * 4. Only processes data from CoinGecko (not fallback data)
 *
 * Called by the market overview API after each successful CoinGecko fetch.
 */

import { db } from '@/lib/db';
import { upsertCoinsFromMarketData } from '@/lib/coin-upsert';
import {
  computeAndStoreScores,
  type CoinInput,
} from '@/lib/scoring-engine-v2';
import type { MarketCoin, GlobalData } from '@/lib/crypto-api';

// ═══════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════

export interface IngestResult {
  rawMarketDailyStored: number;
  rawGlobalDailyStored: number;
  scoresComputed: number;
  date: string;
  isRealData: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN INGEST FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Ingest live market data into the database.
 *
 * Steps:
 * 1. Upsert coins (ensures Coin table has all current coins)
 * 2. Store RawMarketDaily for each coin
 * 3. Store RawGlobalDaily for today
 * 4. Compute and store scores with real previous-day deltas
 *
 * @param coins - Market data from CoinGecko (or fallback)
 * @param globalData - Global market data from CoinGecko (or fallback)
 * @param today - YYYY-MM-DD date string
 * @param isRealData - Whether the data came from CoinGecko (not fallback)
 */
export async function ingestLiveData(
  coins: MarketCoin[],
  globalData: GlobalData | null,
  today: string,
  isRealData: boolean = true
): Promise<IngestResult> {
  if (!isRealData) {
    console.log('[LiveDataPipeline] Skipping ingestion — data is from fallback, not CoinGecko');
    return {
      rawMarketDailyStored: 0,
      rawGlobalDailyStored: 0,
      scoresComputed: 0,
      date: today,
      isRealData: false,
    };
  }

  console.log(`[LiveDataPipeline] Starting ingestion for ${today} with ${coins.length} coins...`);

  // ── Step 1: Upsert coins ──
  const coinIdMap = await upsertCoinsFromMarketData(coins);

  // ── Step 2: Store RawMarketDaily for each coin ──
  let rawMarketDailyStored = 0;

  for (const coin of coins) {
    const dbCoinId = coinIdMap.get(coin.id);
    if (!dbCoinId) {
      console.warn(`[LiveDataPipeline] No DB ID for coin ${coin.id}, skipping raw data storage`);
      continue;
    }

    const rawRecord = {
      coinId: dbCoinId,
      date: today,
      price: coin.current_price,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      priceChange24h: coin.price_change_24h,
      priceChangePct1h: coin.price_change_percentage_1h_in_currency ?? null,
      priceChangePct24h: coin.price_change_percentage_24h,
      priceChangePct7d: coin.price_change_percentage_7d_in_currency ?? null,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      marketCapChangePct24h: coin.market_cap_change_percentage_24h ?? null,
      fullyDilutedValuation: coin.fully_diluted_valuation ?? null,
      totalVolume: coin.total_volume,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply ?? null,
      maxSupply: coin.max_supply ?? null,
      ath: coin.ath,
      athChangePct: coin.ath_change_percentage,
      athDate: coin.ath_date ?? null,
      atl: coin.atl,
      atlChangePct: coin.atl_change_percentage,
      atlDate: coin.atl_date ?? null,
      sparklineData: coin.sparkline_in_7d
        ? JSON.stringify(coin.sparkline_in_7d.price)
        : null,
      rawData: JSON.stringify(coin),
    };

    await db.rawMarketDaily.upsert({
      where: {
        coinId_date: { coinId: dbCoinId, date: today },
      },
      update: rawRecord,
      create: rawRecord,
    });

    rawMarketDailyStored++;
  }

  // ── Step 3: Store RawGlobalDaily ──
  let rawGlobalDailyStored = 0;

  if (globalData?.data) {
    const gd = globalData.data;
    const globalRecord = {
      date: today,
      activeCryptos: gd.active_cryptocurrencies ?? null,
      totalMarketCapUsd: gd.total_market_cap?.usd ?? null,
      totalVolumeUsd: gd.total_volume?.usd ?? null,
      btcDominance: gd.market_cap_percentage?.btc ?? null,
      ethDominance: gd.market_cap_percentage?.eth ?? null,
      marketCapChangePct24h: gd.market_cap_change_percentage_24h_usd ?? null,
      rawData: JSON.stringify(globalData),
    };

    await db.rawGlobalDaily.upsert({
      where: { date: today },
      update: globalRecord,
      create: globalRecord,
    });

    rawGlobalDailyStored = 1;
  }

  // ── Step 4: Compute and store scores ──
  const coinInputs: CoinInput[] = coins.map((coin) => ({
    id: coin.id,
    dbCoinId: coinIdMap.get(coin.id),
    symbol: coin.symbol,
    name: coin.name,
    current_price: coin.current_price,
    market_cap: coin.market_cap,
    market_cap_rank: coin.market_cap_rank,
    fully_diluted_valuation: coin.fully_diluted_valuation,
    total_volume: coin.total_volume,
    high_24h: coin.high_24h,
    low_24h: coin.low_24h,
    price_change_24h: coin.price_change_24h,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    market_cap_change_24h: coin.market_cap_change_24h,
    market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply,
    max_supply: coin.max_supply,
    ath: coin.ath,
    ath_change_percentage: coin.ath_change_percentage,
    price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency,
    price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency,
  }));

  const cryptoScores = await computeAndStoreScores(coinInputs, today);

  // ── Step 5: Patch CoinDailyScore with REAL previous-day deltas ──
  // The scoring engine computes previousAiScore from yesterday's ScoreHistory,
  // but we want to use the ACTUAL previous CoinDailyScore record for the
  // previousAiScore / aiScoreChange / aiScoreChangePct fields.
  const yesterday = getYesterday(today);

  // Get all yesterday's CoinDailyScore records in one query
  const dbCoinIds = Array.from(coinIdMap.values());
  const yesterdayScores = await db.coinDailyScore.findMany({
    where: {
      coinId: { in: dbCoinIds },
      date: yesterday,
    },
    select: {
      coinId: true,
      aiScore: true,
    },
  });

  const yesterdayScoreMap = new Map<string, number>();
  for (const ys of yesterdayScores) {
    yesterdayScoreMap.set(ys.coinId, ys.aiScore);
  }

  // Patch today's CoinDailyScore records with real deltas
  let patched = 0;
  for (const score of cryptoScores) {
    const dbCoinId = coinIdMap.get(score.coinId);
    if (!dbCoinId) continue;

    const yesterdayAiScore = yesterdayScoreMap.get(dbCoinId);

    if (yesterdayAiScore !== undefined) {
      // We have a real previous day score — update the CoinDailyScore
      const realPreviousAiScore = yesterdayAiScore;
      const realAiScoreChange = Math.round((score.aiScore - realPreviousAiScore) * 100) / 100;
      const realAiScoreChangePct = realPreviousAiScore !== 0
        ? Math.round((realAiScoreChange / realPreviousAiScore) * 1000) / 10
        : 0;

      await db.coinDailyScore.update({
        where: {
          coinId_date: { coinId: dbCoinId, date: today },
        },
        data: {
          previousAiScore: realPreviousAiScore,
          aiScoreChange: realAiScoreChange,
        },
      });

      // Also update the CryptoScore object for the API response
      score.previousAiScore = realPreviousAiScore;
      score.aiScoreChange = realAiScoreChange;
      score.aiScoreChangePct = realAiScoreChangePct;
      patched++;
    }
    // If no yesterday score exists, the values from computeAndStoreScores remain
    // (which may have previousAiScore from ScoreHistory or default equal values)
  }

  if (patched > 0) {
    console.log(`[LiveDataPipeline] Patched ${patched}/${cryptoScores.length} scores with real previous-day deltas`);
  }

  console.log(
    `[LiveDataPipeline] Ingestion complete: ${rawMarketDailyStored} raw market records, ` +
    `${rawGlobalDailyStored} global records, ${cryptoScores.length} scores computed, ` +
    `${patched} score deltas patched`
  );

  return {
    rawMarketDailyStored,
    rawGlobalDailyStored,
    scoresComputed: cryptoScores.length,
    date: today,
    isRealData: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}
