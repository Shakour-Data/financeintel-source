/**
 * Raw Data Ingestion API — Collects raw market data from CoinGecko and stores it in the DB.
 *
 * POST /api/data/ingest
 *
 * Steps:
 * 1. Fetch market data (top 50 coins) and global data from CoinGecko
 * 2. Upsert coins into the Coin table
 * 3. For each coin, create/update a RawMarketDaily record for today's date
 * 4. Create/update a RawGlobalDaily record for today
 * 5. Return counts: { coinsProcessed, globalSaved, date }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData, fetchGlobalData } from '@/lib/crypto-api';
import { upsertCoinsFromMarketData } from '@/lib/coin-upsert';
import { db } from '@/lib/db';

export const maxDuration = 30;

export async function POST(_request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[Ingest] Starting data ingestion for ${today}...`);

    // 1. Fetch data from CoinGecko (or cache/fallback)
    const [marketResult, globalResult] = await Promise.all([
      fetchMarketData(200),
      fetchGlobalData(),
    ]);

    const { data: coins } = marketResult;
    const { data: globalData } = globalResult;

    // 2. Upsert coins
    const coinIdMap = await upsertCoinsFromMarketData(coins);

    // 3. Create/update RawMarketDaily for each coin
    let coinsProcessed = 0;

    for (const coin of coins) {
      const dbCoinId = coinIdMap.get(coin.id);
      if (!dbCoinId) {
        console.warn(`[Ingest] No DB ID for coin ${coin.id}, skipping`);
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

    // 4. Create/update RawGlobalDaily
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

    console.log(
      `[Ingest] Completed: ${coinsProcessed} coins processed, ${globalSaved} global records saved`
    );

    return NextResponse.json({
      success: true,
      coinsProcessed,
      globalSaved,
      date: today,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Ingest] Error during data ingestion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Data ingestion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
