/**
 * Auto-seed helper — ensures the database always has data after a reset.
 *
 * If the Coin table is empty AND market-data.json exists (or can be fetched
 * from CoinGecko), this module re-runs the full seed pipeline:
 *   1. Seed the 286-node hierarchy
 *   2. Fetch market data (from file cache or CoinGecko)
 *   3. Upsert coins
 *   4. Store raw market daily + global daily
 *   5. Compute & store 12-dimension scores
 *   6. Compute market indicators + daily score
 *
 * This makes the dashboard resilient to PostgreSQL data directory resets
 * (which happen when the sandbox environment is recycled).
 *
 * The check is cheap: a single `db.coin.count()` query. If count > 0, the
 * function returns immediately without doing any work.
 */

import { db } from '@/lib/db';
import { seedHierarchy } from '@/lib/hierarchy-seeder';
import { fetchMarketData, fetchGlobalData } from '@/lib/crypto-api';
import { upsertCoinsFromMarketData } from '@/lib/coin-upsert';
import { computeAndStoreScores, type CoinInput } from '@/lib/scoring-engine-v2';
import { computeMarketIndicators } from '@/lib/market-indicators';
import { readMarketDataFile } from '@/lib/market-data-cache';

let seedingPromise: Promise<boolean> | null = null;

/**
 * Returns true if the database needs seeding (Coin table is empty).
 * Cheap: single COUNT query.
 */
export async function needsSeed(): Promise<boolean> {
  try {
    const count = await db.coin.count();
    return count === 0;
  } catch {
    // If the query fails (e.g. table doesn't exist yet), assume seeding needed
    return true;
  }
}

/**
 * Run the full seed pipeline. Idempotent — safe to call multiple times.
 * Returns true on success, false on failure.
 *
 * This function is memoized via `seedingPromise` so concurrent callers
 * share the same in-flight seed operation.
 */
export async function ensureSeeded(): Promise<boolean> {
  // If a seed is already in flight, wait for it
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      const needs = await needsSeed();
      if (!needs) {
        console.log('[AutoSeed] Database already has data, skipping seed.');
        return true;
      }

      console.log('[AutoSeed] Coin table is empty — starting auto-seed...');
      const today = new Date().toISOString().split('T')[0];

      // Step 1: Seed hierarchy (286 nodes)
      console.log('[AutoSeed] Step 1/6: Seeding hierarchy...');
      await seedHierarchy();

      // Step 2: Get market data — prefer cached file, fall back to CoinGecko
      console.log('[AutoSeed] Step 2/6: Loading market data...');
      let coins: Awaited<ReturnType<typeof fetchMarketData>>['data'] = [];
      let globalData: Awaited<ReturnType<typeof fetchGlobalData>>['data'] = null;

      // Try the cached file first (fast, no API call)
      const cached = await readMarketDataFile();
      if (cached && cached.coins && cached.coins.length > 0) {
        console.log(`[AutoSeed] Using cached market-data.json (${cached.coins.length} coins)`);
        coins = cached.coins as unknown as typeof coins;
        globalData = cached.globalData as unknown as typeof globalData;
      } else {
        // Fall back to CoinGecko live fetch
        console.log('[AutoSeed] No cache — fetching from CoinGecko...');
        const [marketResult, globalResult] = await Promise.all([
          fetchMarketData(200),
          fetchGlobalData(),
        ]);
        coins = marketResult.data;
        globalData = globalResult.data;
      }

      if (coins.length === 0) {
        console.warn('[AutoSeed] No market data available — cannot seed.');
        return false;
      }

      // Step 3: Upsert coins
      console.log(`[AutoSeed] Step 3/6: Upserting ${coins.length} coins...`);
      const coinIdMap = await upsertCoinsFromMarketData(coins);

      // Step 4: Store raw market daily + global daily
      console.log('[AutoSeed] Step 4/6: Storing raw market data...');
      for (const coin of coins) {
        const dbCoinId = coinIdMap.get(coin.id);
        if (!dbCoinId) continue;

        await db.rawMarketDaily.upsert({
          where: { coinId_date: { coinId: dbCoinId, date: today } },
          update: {
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
            rawData: coin as unknown as Record<string, unknown>,
          },
          create: {
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
            rawData: coin as unknown as Record<string, unknown>,
          },
        });
      }

      if (globalData?.data) {
        const gd = globalData.data;
        await db.rawGlobalDaily.upsert({
          where: { date: today },
          update: {
            activeCryptos: gd.active_cryptocurrencies ?? null,
            totalMarketCapUsd: gd.total_market_cap?.usd ?? null,
            totalVolumeUsd: gd.total_volume?.usd ?? null,
            btcDominance: gd.market_cap_percentage?.btc ?? null,
            ethDominance: gd.market_cap_percentage?.eth ?? null,
            marketCapChangePct24h: gd.market_cap_change_percentage_24h_usd ?? null,
            rawData: globalData as unknown as Record<string, unknown>,
          },
          create: {
            date: today,
            activeCryptos: gd.active_cryptocurrencies ?? null,
            totalMarketCapUsd: gd.total_market_cap?.usd ?? null,
            totalVolumeUsd: gd.total_volume?.usd ?? null,
            btcDominance: gd.market_cap_percentage?.btc ?? null,
            ethDominance: gd.market_cap_percentage?.eth ?? null,
            marketCapChangePct24h: gd.market_cap_change_percentage_24h_usd ?? null,
            rawData: globalData as unknown as Record<string, unknown>,
          },
        });
      }

      // Step 5: Compute & store scores
      console.log(`[AutoSeed] Step 5/6: Computing scores for ${coins.length} coins...`);
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
      await computeAndStoreScores(coinInputs, today);

      // Step 6: Compute market indicators
      console.log('[AutoSeed] Step 6/6: Computing market indicators...');
      await computeMarketIndicators(today);

      const finalCount = await db.coin.count();
      console.log(`[AutoSeed] ✅ Seed complete: ${finalCount} coins in database.`);
      return true;
    } catch (err) {
      console.error('[AutoSeed] ❌ Seed failed:', err);
      return false;
    } finally {
      // Allow future re-seed attempts if this one failed
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}
