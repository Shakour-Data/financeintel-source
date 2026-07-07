/**
 * Data Initialization API — Seeds the database with hierarchy and market data.
 *
 * POST /api/data/init
 *
 * Steps:
 * 1. Seeds the hierarchy using seedHierarchy()
 * 2. Ingests today's market data (same logic as /api/data/ingest)
 * 3. Returns status info
 */

import { NextResponse } from 'next/server';
import { seedHierarchy } from '@/lib/hierarchy-seeder';
import { fetchMarketData, fetchGlobalData } from '@/lib/crypto-api';
import { upsertCoinsFromMarketData } from '@/lib/coin-upsert';
import { computeAndStoreScores, type CoinInput } from '@/lib/scoring-engine-v2';
import { computeMarketIndicators } from '@/lib/market-indicators';
import { db } from '@/lib/db';

export const maxDuration = 60;

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`[DataInit] Starting initialization for ${today}...`);

    // ── Step 1: Seed hierarchy ──
    console.log('[DataInit] Seeding hierarchy...');
    await seedHierarchy();

    const hierarchyCount = await db.hierarchyNode.count();

    // ── Step 2: Fetch market data ──
    console.log('[DataInit] Fetching market data...');
    const [marketResult, globalResult] = await Promise.all([
      fetchMarketData(200),
      fetchGlobalData(),
    ]);

    const { data: coins } = marketResult;
    const { data: globalData } = globalResult;

    // ── Step 3: Upsert coins ──
    console.log(`[DataInit] Upserting ${coins.length} coins...`);
    const coinIdMap = await upsertCoinsFromMarketData(coins);

    // ── Step 4: Store raw market data (same as /api/data/ingest) ──
    let coinsProcessed = 0;

    for (const coin of coins) {
      const dbCoinId = coinIdMap.get(coin.id);
      if (!dbCoinId) {
        console.warn(`[DataInit] No DB ID for coin ${coin.id}, skipping`);
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

      coinsProcessed++;
    }

    // ── Step 5: Store global data ──
    let globalSaved = 0;

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

      globalSaved = 1;
    }

    // ── Step 6: Compute and store scores ──
    console.log('[DataInit] Computing and storing scores...');
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

    const coefficientVersion = cryptoScores.length > 0
      ? cryptoScores[0].coefficientVersion
      : 0;

    // ── Step 7: Compute market indicators ──
    console.log('[DataInit] Computing market indicators...');
    await computeMarketIndicators(today);

    // Use raw SQL for count since the PrismaClient may not have these models
    const [miCountResult, mdsCountResult] = await Promise.all([
      db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketIndicatorDaily" WHERE date = ${today}`,
      db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketDailyScore" WHERE date = ${today}`,
    ]);
    const marketIndicatorCount = Number(miCountResult[0]?.count ?? 0);
    const marketDailyScoreCount = Number(mdsCountResult[0]?.count ?? 0);

    console.log(
      `[DataInit] Complete: ${hierarchyCount} hierarchy nodes, ${coinsProcessed} coins, ` +
      `${globalSaved} global records, ${cryptoScores.length} scores, ` +
      `${marketIndicatorCount} market indicators, ${marketDailyScoreCount} market daily score, ` +
      `version ${coefficientVersion}`
    );

    return NextResponse.json({
      success: true,
      hierarchyNodes: hierarchyCount,
      coinsProcessed,
      globalSaved,
      scoresComputed: cryptoScores.length,
      marketIndicators: marketIndicatorCount,
      marketDailyScore: marketDailyScoreCount,
      coefficientVersion,
      date: today,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DataInit] Error during initialization:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Data initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
