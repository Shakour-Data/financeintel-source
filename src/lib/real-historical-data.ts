/**
 * Real Historical Data Fetcher — Fetches actual market data from CoinGecko
 *
 * Replaces the GBM (Geometric Brownian Motion) simulation with REAL historical data.
 * Uses CoinGecko's /coins/{id}/market_chart endpoint to get up to 3 years of:
 * - Daily prices
 * - Daily market caps
 * - Daily volumes
 *
 * Rate limiting: Respects CoinGecko free tier (~10-30 calls/min)
 * Retries: Exponential backoff on 429/5xx errors
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DailyMarketData {
  date: string; // YYYY-MM-DD
  price: number;
  marketCap: number;
  totalVolume: number;
}

export interface CoinHistoricalData {
  coingeckoId: string;
  data: DailyMarketData[];
  fetchedAt: string;
}

export interface FetchProgress {
  current: number;
  total: number;
  coinId: string;
  status: 'fetching' | 'processing' | 'done' | 'error';
  error?: string;
}

export type ProgressCallback = (progress: FetchProgress) => void;

// ═══════════════════════════════════════════════════════════════
// COINGECKO API CALLS
// ═══════════════════════════════════════════════════════════════

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_DELAY_MS = 3500; // ~17 calls/min to stay under rate limit
const MAX_RETRIES = 4;
const BASE_RETRY_DELAY = 5000;

/**
 * Fetch with exponential backoff and rate-limit handling
 */
async function fetchWithBackoff(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeout);

      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`[RealHistorical] Rate limited (429), waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        if (attempt < retries) {
          await sleep(Math.min(waitMs, 60000));
          continue;
        }
      }

      if (response.status >= 500 && attempt < retries) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`[RealHistorical] Server error (${response.status}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // For 4xx errors (not 429), don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const body = await response.text().catch(() => '');
        throw new Error(`API returned ${response.status}: ${body.slice(0, 200)}`);
      }

      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (attempt < retries && err instanceof Error && err.name !== 'AbortError') {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`[RealHistorical] Fetch error, retrying in ${delay}ms:`, err.message);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch historical market chart data for a single coin from CoinGecko.
 * Returns daily price, market cap, and volume for up to `days` days.
 */
export async function fetchCoinMarketChart(
  coinId: string,
  days: number = 1095 // 3 years
): Promise<CoinHistoricalData> {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

  console.log(`[RealHistorical] Fetching ${coinId} market chart (${days} days)...`);
  const response = await fetchWithBackoff(url);
  const data = await response.json();

  if (!data.prices || !Array.isArray(data.prices)) {
    throw new Error(`Invalid market_chart response for ${coinId}: no prices array`);
  }

  // Aggregate to daily data
  // CoinGecko returns hourly data for recent periods, daily for older
  // We need to aggregate to daily (YYYY-MM-DD)
  const dailyMap = new Map<string, { prices: number[]; mcaps: number[]; volumes: number[] }>();

  // Process prices
  for (const [timestamp, price] of data.prices as [number, number][]) {
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { prices: [], mcaps: [], volumes: [] });
    }
    dailyMap.get(date)!.prices.push(price);
  }

  // Process market caps
  if (data.market_caps && Array.isArray(data.market_caps)) {
    for (const [timestamp, mcap] of data.market_caps as [number, number][]) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      const entry = dailyMap.get(date);
      if (entry) entry.mcaps.push(mcap);
    }
  }

  // Process volumes
  if (data.total_volumes && Array.isArray(data.total_volumes)) {
    for (const [timestamp, vol] of data.total_volumes as [number, number][]) {
      const date = new Date(timestamp).toISOString().split('T')[0];
      const entry = dailyMap.get(date);
      if (entry) entry.volumes.push(vol);
    }
  }

  // Convert to daily data array, sorted by date
  const dailyData: DailyMarketData[] = [];
  const sortedDates = [...dailyMap.keys()].sort();

  for (const date of sortedDates) {
    const entry = dailyMap.get(date)!;
    // Use the LAST value of the day (closest to midnight UTC)
    const price = entry.prices[entry.prices.length - 1];
    const marketCap = entry.mcaps.length > 0 ? entry.mcaps[entry.mcaps.length - 1] : 0;
    const totalVolume = entry.volumes.length > 0
      ? entry.volumes.reduce((s, v) => s + v, 0) / entry.volumes.length // Average volume for the day
      : 0;

    if (price > 0) {
      dailyData.push({ date, price, marketCap, totalVolume });
    }
  }

  console.log(`[RealHistorical] Got ${dailyData.length} days of data for ${coinId} (${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]})`);

  return {
    coingeckoId: coinId,
    data: dailyData,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch current coin detail from CoinGecko to get supply, ATH, ATL data.
 */
export async function fetchCoinDetailData(coinId: string): Promise<{
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number;
  athChangePct: number;
  athDate: string | null;
  atl: number;
  atlChangePct: number;
  atlDate: string | null;
  high24h: number;
  low24h: number;
  priceChangePct1h: number | null;
  priceChangePct24h: number | null;
  priceChangePct7d: number | null;
  priceChangePct14d: number | null;
  priceChangePct30d: number | null;
  priceChangePct200d: number | null;
  priceChangePct1y: number | null;
  marketCapChangePct24h: number | null;
  fdv: number | null;
}> {
  const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const response = await fetchWithBackoff(url);
  const data = await response.json();

  const md = data.market_data || {};

  return {
    circulatingSupply: md.circulating_supply ?? 0,
    totalSupply: md.total_supply ?? null,
    maxSupply: md.max_supply ?? null,
    ath: md.ath?.usd ?? 0,
    athChangePct: md.ath_change_percentage?.usd ?? 0,
    athDate: md.ath_date?.usd ?? null,
    atl: md.atl?.usd ?? 0,
    atlChangePct: md.atl_change_percentage?.usd ?? 0,
    atlDate: md.atl_date?.usd ?? null,
    high24h: md.high_24h?.usd ?? 0,
    low24h: md.low_24h?.usd ?? 0,
    priceChangePct1h: md.price_change_percentage_1h_in_currency ?? null,
    priceChangePct24h: md.price_change_percentage_24h ?? null,
    priceChangePct7d: md.price_change_percentage_7d_in_currency ?? null,
    priceChangePct14d: md.price_change_percentage_14d_in_currency ?? null,
    priceChangePct30d: md.price_change_percentage_30d_in_currency ?? null,
    priceChangePct200d: md.price_change_percentage_200d_in_currency ?? null,
    priceChangePct1y: md.price_change_percentage_1y_in_currency ?? null,
    marketCapChangePct24h: md.market_cap_change_percentage_24h ?? null,
    fdv: md.fully_diluted_valuation?.usd ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE STORAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Store real historical data into RawMarketDaily.
 * Computes derived fields from the price series (changes, ATH/ATL, etc.)
 */
export async function storeRealMarketData(
  coinDbId: string,
  coingeckoId: string,
  dailyData: DailyMarketData[],
  coinDetail?: Awaited<ReturnType<typeof fetchCoinDetailData>>
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Pre-compute price series for derived metrics
  const priceByDate = new Map<string, number>();
  const mcapByDate = new Map<string, number>();
  for (const d of dailyData) {
    priceByDate.set(d.date, d.price);
    mcapByDate.set(d.date, d.marketCap);
  }

  // Compute ATH/ATL from the entire series
  let ath = 0;
  let athDate: string | null = null;
  let atl = Infinity;
  let atlDate: string | null = null;

  for (const d of dailyData) {
    if (d.price > ath) {
      ath = d.price;
      athDate = d.date;
    }
    if (d.price < atl) {
      atl = d.price;
      atlDate = d.date;
    }
  }

  // Override with coin detail if available (more accurate ATH/ATL)
  if (coinDetail) {
    if (coinDetail.ath > 0) ath = coinDetail.ath;
    if (coinDetail.atl > 0) atl = coinDetail.atl;
  }

  if (atl === Infinity) atl = 0;

  // Get current supply ratios from coin detail (to estimate historical supply)
  const currentSupply = coinDetail?.circulatingSupply ?? 0;
  const currentPrice = dailyData.length > 0 ? dailyData[dailyData.length - 1].price : 1;
  const totalSupply = coinDetail?.totalSupply ?? null;
  const maxSupply = coinDetail?.maxSupply ?? null;
  const fdv = coinDetail?.fdv ?? null;

  // Process each day
  for (let i = 0; i < dailyData.length; i++) {
    const d = dailyData[i];
    const { date, price, marketCap, totalVolume } = d;

    if (price <= 0) {
      skipped++;
      continue;
    }

    // Compute price change percentages
    const priceChangePct1h = null; // Not available from daily data
    const priceChangePct24h = computeChangePct(priceByDate, date, 1);
    const priceChangePct7d = computeChangePct(priceByDate, date, 7);
    const priceChangePct14d = computeChangePct(priceByDate, date, 14);
    const priceChangePct30d = computeChangePct(priceByDate, date, 30);
    const priceChangePct60d = computeChangePct(priceByDate, date, 60);
    const priceChangePct200d = computeChangePct(priceByDate, date, 200);
    const priceChangePct1y = computeChangePct(priceByDate, date, 365);

    // Estimate high/low from surrounding days (we don't have intraday data)
    // Use the day's price ± small range based on 24h change
    const absChangePct = Math.abs(priceChangePct24h ?? 2);
    const rangeFactor = absChangePct / 100 * 1.5; // Slightly wider than the actual change
    const high24h = price * (1 + rangeFactor * 0.6);
    const low24h = price * (1 - rangeFactor * 0.6);

    // Estimate circulating supply based on current supply and price ratio
    // This is approximate - real historical supply data isn't available from CoinGecko
    const supplyRatio = currentPrice > 0 ? price / currentPrice : 1;
    const circulatingSupply = marketCap > 0 && price > 0
      ? marketCap / price
      : currentSupply * Math.min(supplyRatio, 5);

    const mcapChangePct24h = computeChangePct(mcapByDate, date, 1);

    // ATH/ATL change from the running ATH/ATL up to this date
    let runningAth = 0;
    let runningAtl = Infinity;
    for (let j = 0; j <= i; j++) {
      if (dailyData[j].price > runningAth) runningAth = dailyData[j].price;
      if (dailyData[j].price < runningAtl) runningAtl = dailyData[j].price;
    }
    if (runningAtl === Infinity) runningAtl = 0;
    const athChangePct = runningAth > 0 ? ((price - runningAth) / runningAth) * 100 : 0;
    const atlChangePct = runningAtl > 0 ? ((price - runningAtl) / runningAtl) * 100 : 0;

    try {
      const existing = await db.rawMarketDaily.findUnique({
        where: { coinId_date: { coinId: coinDbId, date } },
        select: { id: true },
      });

      if (existing) {
        // Update with real data
        await db.rawMarketDaily.update({
          where: { id: existing.id },
          data: {
            price,
            high24h,
            low24h,
            priceChange24h: priceChangePct24h ? price * (priceChangePct24h / 100) : null,
            priceChangePct1h,
            priceChangePct24h,
            priceChangePct7d,
            priceChangePct14d,
            priceChangePct30d,
            priceChangePct60d,
            priceChangePct200d,
            priceChangePct1y,
            marketCap,
            marketCapChangePct24h: mcapChangePct24h,
            fullyDilutedValuation: maxSupply ? maxSupply * price : totalSupply ? totalSupply * price : fdv,
            totalVolume,
            circulatingSupply,
            totalSupply,
            maxSupply,
            ath: runningAth,
            athChangePct,
            athDate,
            atl: runningAtl,
            atlChangePct,
            atlDate,
          },
        });
        updated++;
      } else {
        await db.rawMarketDaily.create({
          data: {
            coinId: coinDbId,
            date,
            price,
            high24h,
            low24h,
            priceChange24h: priceChangePct24h ? price * (priceChangePct24h / 100) : null,
            priceChangePct1h,
            priceChangePct24h,
            priceChangePct7d,
            priceChangePct14d,
            priceChangePct30d,
            priceChangePct60d,
            priceChangePct200d,
            priceChangePct1y,
            marketCap,
            marketCapChangePct24h: mcapChangePct24h,
            fullyDilutedValuation: maxSupply ? maxSupply * price : totalSupply ? totalSupply * price : fdv,
            totalVolume,
            circulatingSupply,
            totalSupply,
            maxSupply,
            ath: runningAth,
            athChangePct,
            athDate,
            atl: runningAtl,
            atlChangePct,
            atlDate,
            sparklineData: null,
            rawData: null,
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`[RealHistorical] Error storing ${coingeckoId} ${date}:`, err);
      skipped++;
    }
  }

  return { created, updated, skipped };
}

/**
 * Compute percentage change between a date and N days prior.
 */
function computeChangePct(
  dataMap: Map<string, number>,
  dateStr: string,
  lookbackDays: number
): number | null {
  const current = dataMap.get(dateStr);
  if (current === undefined || current === 0) return null;

  const pastDate = addDays(dateStr, -lookbackDays);
  const past = dataMap.get(pastDate);
  if (past === undefined || past === 0) return null;

  return ((current - past) / past) * 100;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Generate RawGlobalDaily from real market data.
 */
export async function computeGlobalDailyFromRealData(
  startDate?: string,
  endDate?: string
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  // Get all dates that have raw market data
  const dates = await db.rawMarketDaily.findMany({
    where: {
      ...(startDate ? { date: { gte: startDate } } : {}),
      ...(endDate ? { date: { lte: endDate } } : {}),
    },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });

  console.log(`[RealHistorical] Computing global data for ${dates.length} dates`);

  for (const { date } of dates) {
    const dayData = await db.rawMarketDaily.findMany({
      where: { date },
      include: { coin: { select: { coingeckoId: true } } },
    });

    if (dayData.length === 0) continue;

    const totalMarketCap = dayData.reduce((s, d) => s + (d.marketCap ?? 0), 0);
    const totalVolume = dayData.reduce((s, d) => s + (d.totalVolume ?? 0), 0);

    // Find BTC and ETH dominance
    const btcData = dayData.find(d => d.coin.coingeckoId === 'bitcoin');
    const ethData = dayData.find(d => d.coin.coingeckoId === 'ethereum');
    const btcDominance = btcData && totalMarketCap > 0 ? ((btcData.marketCap ?? 0) / totalMarketCap) * 100 : null;
    const ethDominance = ethData && totalMarketCap > 0 ? ((ethData.marketCap ?? 0) / totalMarketCap) * 100 : null;

    // Compute 24h change
    const yesterday = addDays(date, -1);
    const yesterdayGlobal = await db.rawGlobalDaily.findUnique({ where: { date: yesterday } });
    const marketCapChangePct24h = yesterdayGlobal?.totalMarketCapUsd
      ? ((totalMarketCap - yesterdayGlobal.totalMarketCapUsd) / yesterdayGlobal.totalMarketCapUsd) * 100
      : null;

    try {
      const existing = await db.rawGlobalDaily.findUnique({ where: { date } });
      if (existing) {
        await db.rawGlobalDaily.update({
          where: { date },
          data: {
            activeCryptos: dayData.length + 12000, // Approximate
            totalMarketCapUsd: totalMarketCap,
            totalVolumeUsd: totalVolume,
            btcDominance,
            ethDominance,
            marketCapChangePct24h,
          },
        });
        updated++;
      } else {
        await db.rawGlobalDaily.create({
          data: {
            date,
            activeCryptos: dayData.length + 12000,
            totalMarketCapUsd: totalMarketCap,
            totalVolumeUsd: totalVolume,
            btcDominance,
            ethDominance,
            marketCapChangePct24h,
          },
        });
        created++;
      }
    } catch (err) {
      console.error(`[RealHistorical] Error storing global data for ${date}:`, err);
    }
  }

  return { created, updated };
}

/**
 * Delete all GBM-simulated data from the database.
 * Call this before running the real data backfill.
 */
export async function clearSimulatedData(): Promise<void> {
  console.log('[RealHistorical] Clearing simulated data...');

  // Delete in dependency order (child tables first)
  try {
    await db.$executeRaw`DELETE FROM "MarketDailyScore"`;
    console.log('[RealHistorical] Cleared MarketDailyScore');
  } catch { /* Table may not exist */ }

  try {
    await db.$executeRaw`DELETE FROM "MarketIndicatorDaily"`;
    console.log('[RealHistorical] Cleared MarketIndicatorDaily');
  } catch { /* Table may not exist */ }

  const deletedScores = await db.scoreHistory.deleteMany();
  console.log(`[RealHistorical] Cleared ScoreHistory (${deletedScores.count} rows)`);

  const deletedCoeff = await db.coefficientHistory.deleteMany();
  console.log(`[RealHistorical] Cleared CoefficientHistory (${deletedCoeff.count} rows)`);

  const deletedDaily = await db.coinDailyScore.deleteMany();
  console.log(`[RealHistorical] Cleared CoinDailyScore (${deletedDaily.count} rows)`);

  const deletedRaw = await db.rawMarketDaily.deleteMany();
  console.log(`[RealHistorical] Cleared RawMarketDaily (${deletedRaw.count} rows)`);

  const deletedGlobal = await db.rawGlobalDaily.deleteMany();
  console.log(`[RealHistorical] Cleared RawGlobalDaily (${deletedGlobal.count} rows)`);

  console.log('[RealHistorical] All simulated data cleared');
}

/**
 * Get status of the real data backfill.
 */
export async function getRealDataStatus(): Promise<{
  totalCoins: number;
  coinsWithData: number;
  totalDays: number;
  dateRange: { earliest: string | null; latest: string | null };
  avgDaysPerCoin: number;
  isRealData: boolean;
}> {
  const totalCoins = await db.coin.count();
  const coinsWithData = await db.rawMarketDaily.findMany({
    select: { coinId: true },
    distinct: ['coinId'],
  });

  const earliest = await db.rawMarketDaily.findFirst({
    orderBy: { date: 'asc' },
    select: { date: true },
  });

  const latest = await db.rawMarketDaily.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  const totalDays = await db.rawMarketDaily.findMany({
    select: { date: true },
    distinct: ['date'],
  });

  // Check if data looks real (not GBM) by checking if the last date is today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = addDays(today, -1);
  const isRealData = latest?.date === today || latest?.date === yesterday;

  return {
    totalCoins,
    coinsWithData: coinsWithData.length,
    totalDays: totalDays.length,
    dateRange: {
      earliest: earliest?.date ?? null,
      latest: latest?.date ?? null,
    },
    avgDaysPerCoin: totalCoins > 0 ? Math.round(await db.rawMarketDaily.count() / totalCoins) : 0,
    isRealData,
  };
}
