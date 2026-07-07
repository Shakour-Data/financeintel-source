/**
 * Binance Historical Data Fetcher — Fetches daily OHLCV data from Binance API
 *
 * Extends our data coverage from 1 year (CoinGecko free) to 3 years.
 * Binance provides up to 1000 daily klines per request, no API key needed.
 *
 * We use Binance ONLY for dates that don't already have CoinGecko data,
 * since CoinGecko data is more accurate for recent dates (includes market cap, etc.)
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BinanceDailyData {
  date: string;        // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;       // Use as the daily price
  volume: number;      // Base asset volume
  quoteVolume: number; // USD volume
}

export interface BinanceFetchResult {
  coinId: string;
  binanceSymbol: string;
  daysFetched: number;
  daysStored: number;
  daysSkipped: number; // already had CoinGecko data
  dateRange: { earliest: string | null; latest: string | null };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// BINANCE SYMBOL MAPPING
// CoinGecko ID → Binance trading pair symbol
// ═══════════════════════════════════════════════════════════════

const BINANCE_SYMBOL_MAP: Record<string, string | null> = {
  'bitcoin': 'BTCUSDT',
  'ethereum': 'ETHUSDT',
  'binancecoin': 'BNBUSDT',
  'solana': 'SOLUSDT',
  'ripple': 'XRPUSDT',
  'cardano': 'ADAUSDT',
  'dogecoin': 'DOGEUSDT',
  'avalanche-2': 'AVAXUSDT',
  'tron': 'TRXUSDT',
  'polkadot': 'DOTUSDT',
  'chainlink': 'LINKUSDT',
  'polygon': 'MATICUSDT',
  'shiba-inu': 'SHIBUSDT',
  'litecoin': 'LTCUSDT',
  'uniswap': 'UNIUSDT',
  'cosmos': 'ATOMUSDT',
  'stellar': 'XLMUSDT',
  'monero': 'XMRUSDT',
  'ethereum-classic': 'ETCUSDT',
  'filecoin': 'FILUSDT',
  'aptos': 'APTUSDT',
  'near': 'NEARUSDT',
  'arbitrum': 'ARBUSDT',
  'optimism': 'OPUSDT',
  'sui': 'SUIUSDT',
  'aave': 'AAVEUSDT',
  'maker': 'MKRUSDT',
  'render-token': 'RNDRUSDT',
  'injective-protocol': 'INJUSDT',
  'vechain': 'VETUSDT',
  'the-graph': 'GRTUSDT',
  'algorand': 'ALGOUSDT',
  'tezos': 'XTZUSDT',
  'fantom': 'FTMUSDT',
  'pepe': 'PEPEUSDT',
  'bonk': 'BONKUSDT',
  'celestia': 'TIAUSDT',
  'sei-network': 'SEIUSDT',
  'stacks': 'STXUSDT',
  'kaspa': 'KASUSDT',
  'theta-token': 'THETAUSDT',
  'hedera-hashgraph': 'HBARUSDT',
  'immutable-x': 'IMXUSDT',
  'mantle': 'MNTUSDT',
  'pendle': 'PENDLEUSDT',
  'worldcoin-wld': 'WLDUSDT',
  'jupiter-exchange-solana': 'JUPUSDT',
  'ondo-finance': 'ONDOUSDT',
  // Stablecoins don't have useful Binance pairs
  'tether': null,
  'usd-coin': null,
};

/**
 * Get the Binance symbol for a CoinGecko ID
 */
export function getBinanceSymbol(coingeckoId: string): string | null {
  return BINANCE_SYMBOL_MAP[coingeckoId] ?? null;
}

/**
 * Get all CoinGecko IDs that have Binance symbols
 */
export function getBinanceSupportedCoins(): string[] {
  return Object.entries(BINANCE_SYMBOL_MAP)
    .filter(([, symbol]) => symbol !== null)
    .map(([id]) => id);
}

// ═══════════════════════════════════════════════════════════════
// BINANCE API CALLS
// ═══════════════════════════════════════════════════════════════

const BINANCE_BASE = 'https://api.binance.com/api/v3';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Fetch with retry logic for Binance API
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeout);

      if (response.ok) return response;

      // Binance rate limit: 429 or 418
      if ((response.status === 429 || response.status === 418) && attempt < retries) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[BinanceHistorical] Rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(Math.min(waitMs, 30000));
        continue;
      }

      if (response.status >= 500 && attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[BinanceHistorical] Server error (${response.status}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // For 4xx errors, check if it's a bad symbol
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text().catch(() => '');
        // If the symbol doesn't exist, don't retry
        if (body.includes('Invalid symbol')) {
          throw new Error(`Invalid Binance symbol: ${url}`);
        }
        throw new Error(`Binance API returned ${response.status}: ${body.slice(0, 200)}`);
      }

      throw new Error(`Binance API returned ${response.status}: ${response.statusText}`);
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (attempt < retries && err instanceof Error && err.name !== 'AbortError') {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[BinanceHistorical] Fetch error, retrying in ${delay}ms:`, err.message);
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded for Binance API');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch daily klines (OHLCV) from Binance.
 *
 * Binance returns max 1000 klines per request.
 * For 3 years (~1095 days), we need 2 requests.
 *
 * Kline format: [
 *   openTime, open, high, low, close, volume,
 *   closeTime, quoteAssetVolume, numberOfTrades,
 *   takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignore
 * ]
 */
export async function fetchBinanceKlines(
  symbol: string,
  interval: string = '1d',
  limit: number = 1000,
  startTime?: number, // ms timestamp
  endTime?: number    // ms timestamp
): Promise<BinanceDailyData[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: limit.toString(),
  });

  if (startTime) params.set('startTime', startTime.toString());
  if (endTime) params.set('endTime', endTime.toString());

  const url = `${BINANCE_BASE}/klines?${params.toString()}`;

  console.log(`[BinanceHistorical] Fetching ${symbol} klines (limit=${limit}, start=${startTime ? new Date(startTime).toISOString() : 'n/a'}, end=${endTime ? new Date(endTime).toISOString() : 'n/a'})`);

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`Invalid klines response for ${symbol}: not an array`);
  }

  const result: BinanceDailyData[] = [];

  for (const kline of data as unknown[][]) {
    const openTime = Number(kline[0]);
    const open = parseFloat(kline[1] as string);
    const high = parseFloat(kline[2] as string);
    const low = parseFloat(kline[3] as string);
    const close = parseFloat(kline[4] as string);
    const volume = parseFloat(kline[5] as string);
    const quoteVolume = parseFloat(kline[7] as string);

    const date = new Date(openTime).toISOString().split('T')[0];

    if (close > 0) {
      result.push({
        date,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume,
      });
    }
  }

  console.log(`[BinanceHistorical] Got ${result.length} klines for ${symbol} (${result[0]?.date ?? 'n/a'} to ${result[result.length - 1]?.date ?? 'n/a'})`);

  return result;
}

/**
 * Fetch 3 years of daily klines from Binance.
 * Makes 2 requests: first 1000 days, then the remaining ~95 days.
 */
export async function fetchBinance3Years(
  symbol: string
): Promise<BinanceDailyData[]> {
  const now = Date.now();
  const threeYearsAgo = now - (3 * 365 + 1) * 24 * 60 * 60 * 1000;

  // First request: most recent 1000 days
  const recentData = await fetchBinanceKlines(symbol, '1d', 1000, threeYearsAgo, now);

  // Check if we need more data (if the first request doesn't go back 3 years)
  const earliestDate = recentData[0]?.date;
  const targetDate = new Date(threeYearsAgo).toISOString().split('T')[0];

  if (earliestDate && earliestDate > targetDate) {
    // We need older data — fetch from before the earliest we got
    const earliestMs = new Date(earliestDate + 'T00:00:00Z').getTime();
    const olderStartTime = threeYearsAgo;
    const olderEndTime = earliestMs - 1;

    if (olderEndTime > olderStartTime) {
      console.log(`[BinanceHistorical] Fetching older data for ${symbol} from ${new Date(olderStartTime).toISOString()} to ${new Date(olderEndTime).toISOString()}`);
      const olderData = await fetchBinanceKlines(symbol, '1d', 1000, olderStartTime, olderEndTime);

      // Merge and deduplicate (older data first, then recent)
      const dateSet = new Set<string>();
      const merged: BinanceDailyData[] = [];

      for (const d of [...olderData, ...recentData]) {
        if (!dateSet.has(d.date)) {
          dateSet.add(d.date);
          merged.push(d);
        }
      }

      // Sort by date
      merged.sort((a, b) => a.date.localeCompare(b.date));
      return merged;
    }
  }

  return recentData;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE STORAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Store Binance kline data into RawMarketDaily.
 *
 * IMPORTANT: Only stores dates that DON'T already have data.
 * CoinGecko data is more accurate (includes market cap, proper supply, etc.)
 * so we never overwrite existing records.
 */
export async function storeBinanceData(
  coinDbId: string,
  coingeckoId: string,
  klineData: BinanceDailyData[]
): Promise<{ created: number; skipped: number; errors: number }> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  if (klineData.length === 0) {
    console.log(`[BinanceHistorical] No data to store for ${coingeckoId}`);
    return { created, skipped, errors };
  }

  // Find which dates already have data — we NEVER overwrite CoinGecko data
  const existingRecords = await db.rawMarketDaily.findMany({
    where: { coinId: coinDbId },
    select: { date: true },
  });
  const existingDateSet = new Set(existingRecords.map(r => r.date));

  // Build price series for computing derived metrics (price changes, running ATH/ATL)
  // Include existing data for accurate lookbacks
  const existingPrices = await db.rawMarketDaily.findMany({
    where: { coinId: coinDbId },
    select: { date: true, price: true },
    orderBy: { date: 'asc' },
  });

  const priceByDate = new Map<string, number>();
  for (const ep of existingPrices) {
    priceByDate.set(ep.date, ep.price);
  }
  // Add Binance data to the map
  for (const kd of klineData) {
    if (!existingDateSet.has(kd.date)) {
      priceByDate.set(kd.date, kd.close);
    }
  }

  // Get current circulating supply from the most recent CoinGecko record
  const latestRecord = await db.rawMarketDaily.findFirst({
    where: { coinId: coinDbId },
    orderBy: { date: 'desc' },
    select: { circulatingSupply: true, totalSupply: true, maxSupply: true },
  });

  const currentSupply = latestRecord?.circulatingSupply ?? 0;
  const totalSupply = latestRecord?.totalSupply ?? null;
  const maxSupply = latestRecord?.maxSupply ?? null;

  // Pre-compute running ATH/ATL for the full price series
  const allDates = [...priceByDate.keys()].sort();
  const runningAthByDate = new Map<string, number>();
  const runningAtlByDate = new Map<string, number>();
  {
    let rAth = 0;
    let rAtl = Infinity;
    for (const date of allDates) {
      const price = priceByDate.get(date) ?? 0;
      if (price > rAth) rAth = price;
      if (price < rAtl && price > 0) rAtl = price;
      runningAthByDate.set(date, rAth);
      runningAtlByDate.set(date, rAtl === Infinity ? 0 : rAtl);
    }
  }

  // Filter to only dates that need data
  const newKlineData = klineData
    .filter(d => !existingDateSet.has(d.date) && d.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`[BinanceHistorical] ${coingeckoId}: ${klineData.length} klines, ${existingDateSet.size} existing dates, ${newKlineData.length} new dates to store`);

  if (newKlineData.length === 0) {
    return { created: 0, skipped: klineData.length, errors: 0 };
  }

  // Build all rows in memory first
  const rowsToCreate: Array<{
    coinId: string; date: string; price: number; high24h: number; low24h: number;
    priceChange24h: number | null; priceChangePct1h: null; priceChangePct24h: number | null;
    priceChangePct7d: number | null; priceChangePct14d: number | null;
    priceChangePct30d: number | null; priceChangePct60d: number | null;
    priceChangePct200d: number | null; priceChangePct1y: number | null;
    marketCap: number; marketCapChangePct24h: number | null;
    fullyDilutedValuation: number | null; totalVolume: number;
    circulatingSupply: number; totalSupply: number | null; maxSupply: number | null;
    ath: number; athChangePct: number; athDate: string | null;
    atl: number; atlChangePct: number; atlDate: string | null;
    sparklineData: null; rawData: null;
  }> = [];

  for (const kd of newKlineData) {
    const { date, close: price, high, low, quoteVolume } = kd;

    if (price <= 0) {
      skipped++;
      continue;
    }

    // Compute price change percentages from the full price series
    const priceChangePct24h = computeChangePct(priceByDate, date, 1);
    const priceChangePct7d = computeChangePct(priceByDate, date, 7);
    const priceChangePct14d = computeChangePct(priceByDate, date, 14);
    const priceChangePct30d = computeChangePct(priceByDate, date, 30);
    const priceChangePct60d = computeChangePct(priceByDate, date, 60);
    const priceChangePct200d = computeChangePct(priceByDate, date, 200);
    const priceChangePct1y = computeChangePct(priceByDate, date, 365);

    // Estimate market cap from price * circulating supply
    // For older dates, we estimate supply as slightly less (coins are gradually mined/released)
    const supplyEstimate = currentSupply > 0 ? currentSupply : 0;
    const marketCap = supplyEstimate > 0 ? price * supplyEstimate : 0;

    const fullyDilutedValuation = maxSupply
      ? maxSupply * price
      : totalSupply
        ? totalSupply * price
        : null;

    // Use Binance high/low directly (real OHLCV data!)
    const high24h = high;
    const low24h = low;

    // Compute market cap change from yesterday
    const yesterday = addDays(date, -1);
    const yesterdayPrice = priceByDate.get(yesterday);
    const marketCapChangePct24h = yesterdayPrice && supplyEstimate > 0
      ? ((marketCap - yesterdayPrice * supplyEstimate) / (yesterdayPrice * supplyEstimate)) * 100
      : null;

    // Use pre-computed running ATH/ATL
    const runningAth = runningAthByDate.get(date) ?? price;
    const runningAtl = runningAtlByDate.get(date) ?? price;
    const athChangePct = runningAth > 0 ? ((price - runningAth) / runningAth) * 100 : 0;
    const atlChangePct = runningAtl > 0 ? ((price - runningAtl) / runningAtl) * 100 : 0;

    rowsToCreate.push({
      coinId: coinDbId,
      date,
      price,
      high24h,
      low24h,
      priceChange24h: priceChangePct24h ? price * (priceChangePct24h / 100) : null,
      priceChangePct1h: null,
      priceChangePct24h,
      priceChangePct7d,
      priceChangePct14d,
      priceChangePct30d,
      priceChangePct60d,
      priceChangePct200d,
      priceChangePct1y,
      marketCap,
      marketCapChangePct24h,
      fullyDilutedValuation,
      totalVolume: quoteVolume,
      circulatingSupply: supplyEstimate,
      totalSupply,
      maxSupply,
      ath: runningAth,
      athChangePct,
      athDate: null,
      atl: runningAtl,
      atlChangePct,
      atlDate: null,
      sparklineData: null,
      rawData: null,
    });
  }

  // Batch create in chunks
  const CREATE_CHUNK = 50;
  for (let i = 0; i < rowsToCreate.length; i += CREATE_CHUNK) {
    const chunk = rowsToCreate.slice(i, i + CREATE_CHUNK);
    try {
      await db.$transaction(
        chunk.map(row => db.rawMarketDaily.create({ data: row }))
      );
      created += chunk.length;
    } catch {
      // Fallback: insert one by one
      console.warn(`[BinanceHistorical] Batch create failed for ${coingeckoId}, falling back to individual inserts`);
      for (const row of chunk) {
        try {
          await db.rawMarketDaily.create({ data: row });
          created++;
        } catch {
          errors++;
        }
      }
    }
  }

  console.log(`[BinanceHistorical] Stored ${coingeckoId}: ${created} created, ${skipped} skipped, ${errors} errors`);
  return { created, skipped, errors };
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
