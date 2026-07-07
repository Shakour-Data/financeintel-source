/**
 * Macroeconomic Data Service — Fetches real data from free sources
 *
 * Data Sources:
 * - Alternative.me: Crypto Fear & Greed Index (FREE, no key)
 * - DeFiLlama: DeFi TVL & chain data (FREE, no key)
 * - Yahoo Finance v8: Gold, Oil, S&P 500, DXY, VIX prices (FREE, no key)
 * - CoinGecko (via crypto-api.ts): BTC Dominance, Market Cap
 * - FRED (or hardcoded fallback): Federal Funds Rate
 *
 * Strategy:
 * - Parallel fetching with graceful fallbacks (one source failure doesn't break others)
 * - In-memory cache with 15-minute TTL
 * - Detailed logging for debugging
 *
 * NOTE: This module does NOT use z-ai-web-dev-sdk or any LLM.
 *       All data is fetched algorithmically from free public APIs.
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface MacroData {
  // Commodities
  gold: { price: number; change24h: number; change7d: number } | null;
  oil: { price: number; change24h: number; type: 'WTI' | 'Brent' } | null;

  // Indices
  sp500: { value: number; change24h: number } | null;
  dxy: { value: number; change24h: number } | null;
  vix: { value: number; change24h: number } | null;

  // Crypto-specific
  fearGreed: {
    value: number;
    label: string;
    yesterday: number;
    lastWeek: number;
    history: { value: number; date: string }[];
  } | null;
  btcDominance: { value: number; change24h: number } | null;
  defiTvl: {
    total: number;
    change24h: number;
    change7d: number;
    topChains: { name: string; tvl: number }[];
  } | null;

  // Interest rates
  fedFundsRate: { value: number; lastChange: string } | null;

  // Metadata
  lastUpdated: string;
  sources: { name: string; status: 'live' | 'cached' | 'failed' }[];
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let cachedMacroData: { data: MacroData; timestamp: number } | null = null;

// ═══════════════════════════════════════════════════════════════
// FETCH HELPERS
// ═══════════════════════════════════════════════════════════════

async function fetchWithTimeout(url: string, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// FEAR & GREED INDEX (Alternative.me — FREE, no key)
// ═══════════════════════════════════════════════════════════════

interface FearGreedResult {
  value: number;
  label: string;
  yesterday: number;
  lastWeek: number;
  history: { value: number; date: string }[];
}

async function fetchFearGreedIndex(): Promise<FearGreedResult> {
  console.log('[MacroData] Fetching Fear & Greed Index from Alternative.me...');

  const response = await fetchWithTimeout(
    'https://api.alternative.me/fng/?limit=30&format=json',
    10000
  );

  if (!response.ok) {
    throw new Error(`Alternative.me returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Invalid Fear & Greed data format');
  }

  const current = data.data[0];
  const yesterday = data.data[1];
  const lastWeek = data.data[6];

  const result: FearGreedResult = {
    value: parseInt(current.value),
    label: current.value_classification,
    yesterday: yesterday ? parseInt(yesterday.value) : parseInt(current.value),
    lastWeek: lastWeek ? parseInt(lastWeek.value) : parseInt(current.value),
    history: data.data.map((d: { value: string; timestamp: string }) => ({
      value: parseInt(d.value),
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().split('T')[0],
    })),
  };

  console.log(`[MacroData] Fear & Greed: ${result.value} (${result.label})`);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// DEFI TVL (DeFiLlama — FREE, no key)
// ═══════════════════════════════════════════════════════════════

interface DefiTvlResult {
  total: number;
  change24h: number;
  change7d: number;
  topChains: { name: string; tvl: number }[];
}

async function fetchDefiTvl(): Promise<DefiTvlResult> {
  console.log('[MacroData] Fetching DeFi TVL from DeFiLlama...');

  // Fetch historical total TVL and current chain data in parallel
  const [tvlRes, chainsRes] = await Promise.all([
    fetchWithTimeout('https://api.llama.fi/v2/historicalChainTvl', 15000),
    fetchWithTimeout('https://api.llama.fi/v2/chains', 10000),
  ]);

  if (!tvlRes.ok) {
    throw new Error(`DeFiLlama historical TVL returned ${tvlRes.status}`);
  }
  if (!chainsRes.ok) {
    throw new Error(`DeFiLlama chains returned ${chainsRes.status}`);
  }

  const tvlData = await tvlRes.json();
  const chainsData = await chainsRes.json();

  // Historical TVL is an array of {date: timestamp, tvl: number}
  if (!Array.isArray(tvlData) || tvlData.length === 0) {
    throw new Error('Invalid historical TVL data format');
  }

  // Get latest, 24h ago, and 7d ago TVL
  const latestTvl = tvlData[tvlData.length - 1];
  const now = latestTvl.date;
  const oneDayMs = 86400 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  // Find closest entries to 24h and 7d ago
  const tvl24hAgo = findClosestEntry(tvlData, now - oneDayMs / 1000);
  const tvl7dAgo = findClosestEntry(tvlData, now - sevenDaysMs / 1000);

  const totalTvl = latestTvl.tvl ?? 0;
  const change24h = tvl24hAgo
    ? ((totalTvl - tvl24hAgo.tvl) / tvl24hAgo.tvl) * 100
    : 0;
  const change7d = tvl7dAgo
    ? ((totalTvl - tvl7dAgo.tvl) / tvl7dAgo.tvl) * 100
    : 0;

  // Top chains by TVL
  const topChains = Array.isArray(chainsData)
    ? chainsData
        .filter((c: { tvl?: number }) => c.tvl && c.tvl > 0)
        .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
        .slice(0, 5)
        .map((c: { name: string; tvl: number }) => ({ name: c.name, tvl: c.tvl }))
    : [];

  const result: DefiTvlResult = {
    total: totalTvl,
    change24h: Math.round(change24h * 100) / 100,
    change7d: Math.round(change7d * 100) / 100,
    topChains,
  };

  console.log(
    `[MacroData] DeFi TVL: $${(result.total / 1e9).toFixed(2)}B (24h: ${result.change24h}%, 7d: ${result.change7d}%)`
  );
  return result;
}

function findClosestEntry(
  data: Array<{ date: number; tvl: number }>,
  targetTimestamp: number
): { date: number; tvl: number } | null {
  let closest = data[0];
  let minDiff = Math.abs(data[0].date - targetTimestamp);

  for (const entry of data) {
    const diff = Math.abs(entry.date - targetTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  return closest;
}

// ═══════════════════════════════════════════════════════════════
// COMMODITY & INDEX PRICES (Yahoo Finance v8 — FREE, no key)
// ═══════════════════════════════════════════════════════════════

interface CommodityPrices {
  gold: { price: number; change24h: number; change7d: number } | null;
  oil: { price: number; change24h: number; type: 'WTI' | 'Brent' } | null;
  sp500: { value: number; change24h: number } | null;
  dxy: { value: number; change24h: number } | null;
  vix: { value: number; change24h: number } | null;
  fedFundsRate: { value: number; lastChange: string } | null;
}

// Yahoo Finance v8 chart response structure
interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
        }>;
      };
    }>;
    error?: unknown;
  };
}

/**
 * Extract current price and percentage changes from a Yahoo Finance chart response.
 * Returns { currentPrice, change24h, change7d } or null if data is insufficient.
 */
function parseYahooChart(
  response: YahooChartResponse | null
): { currentPrice: number; change24h: number; change7d: number } | null {
  if (!response?.chart?.result?.[0]) return null;

  const result = response.chart.result[0];
  const meta = result.meta;
  const closes = result.indicators?.quote?.[0]?.close;
  const timestamps = result.timestamp;

  // Get current price from meta (most reliable)
  const currentPrice = meta?.regularMarketPrice ?? null;
  const previousClose = meta?.previousClose ?? null;

  if (currentPrice == null) return null;

  // Calculate 24h change
  let change24h = 0;
  if (previousClose != null && previousClose !== 0) {
    change24h = ((currentPrice - previousClose) / previousClose) * 100;
  } else if (closes && closes.length >= 2) {
    // Fallback: find last two non-null closes
    const lastTwo = findLastNonNullCloses(closes, 2);
    if (lastTwo.length === 2 && lastTwo[0] !== 0) {
      change24h = ((currentPrice - lastTwo[0]) / lastTwo[0]) * 100;
    }
  }

  // Calculate 7d change if we have enough data
  let change7d = 0;
  if (closes && timestamps && closes.length >= 2) {
    // Find the close from ~7 days ago (or earliest available)
    const now = timestamps[timestamps.length - 1] ?? 0;
    const sevenDaysAgo = now - 7 * 86400;
    const sevenDayPrice = findClosestPrice(timestamps, closes, sevenDaysAgo);
    if (sevenDayPrice !== null && sevenDayPrice !== 0) {
      change7d = ((currentPrice - sevenDayPrice) / sevenDayPrice) * 100;
    }
  }

  return {
    currentPrice,
    change24h: Math.round(change24h * 100) / 100,
    change7d: Math.round(change7d * 100) / 100,
  };
}

/**
 * Find the last N non-null close values from a close array.
 * Returns them in order from oldest to newest (excluding the current price).
 */
function findLastNonNullCloses(closes: (number | null)[], count: number): number[] {
  const result: number[] = [];
  for (let i = closes.length - 1; i >= 0 && result.length < count; i--) {
    if (closes[i] != null) {
      result.unshift(closes[i]!);
    }
  }
  return result;
}

/**
 * Find the price closest to a target timestamp from Yahoo chart data.
 */
function findClosestPrice(
  timestamps: number[],
  closes: (number | null)[],
  targetTimestamp: number
): number | null {
  let closestIdx = -1;
  let minDiff = Infinity;

  for (let i = 0; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - targetTimestamp);
    if (diff < minDiff && closes[i] != null) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx >= 0 ? closes[closestIdx] : null;
}

/**
 * Fetch a single indicator from Yahoo Finance v8 chart API.
 * Returns parsed data with current price and changes, or null on failure.
 */
async function fetchYahooIndicator(
  symbol: string
): Promise<{ currentPrice: number; change24h: number; change7d: number } | null> {
  try {
    // Do NOT encodeURIComponent — Yahoo symbols with %5E (^) should be passed as-is
    // encodeURIComponent would double-encode %5E to %255E
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;

    const response = await fetchWithTimeout(url, 10000);

    if (!response.ok) {
      console.warn(`[MacroData] Yahoo Finance returned ${response.status} for ${symbol}`);
      return null;
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart?.error) {
      console.warn(`[MacroData] Yahoo Finance error for ${symbol}:`, data.chart.error);
      return null;
    }

    return parseYahooChart(data);
  } catch (error) {
    console.warn(`[MacroData] Yahoo Finance fetch failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch Fed Funds Rate.
 *
 * The Federal Funds Rate is set by the FOMC and changes infrequently (8 meetings/year).
 * FRED API requires an API key, so we use a reasonable hardcoded recent value
 * as the fallback. The rate can be updated manually or via environment variable.
 *
 * Current target range as of early 2025: 4.25%–4.50% (effective rate ~4.33%)
 * Set FED_FUNDS_RATE env var to override.
 */
function fetchFedFundsRate(): { value: number; lastChange: string } {
  // Allow override via environment variable
  const envRate = process.env.FED_FUNDS_RATE;
  if (envRate) {
    const parsed = parseFloat(envRate);
    if (!isNaN(parsed) && parsed > 0 && parsed < 25) {
      return { value: parsed, lastChange: 'env override' };
    }
  }

  // Hardcoded recent value — update when FOMC changes the rate
  // As of Dec 2024 FOMC meeting: target range 4.25%–4.50%
  // Effective Federal Funds Rate ≈ 4.33%
  return {
    value: 4.33,
    lastChange: '2024-12-18',
  };
}

/**
 * Fetch commodity and index prices from Yahoo Finance in parallel.
 * Replaces the previous LLM-based extraction with direct API calls.
 */
async function fetchCommodityPrices(): Promise<CommodityPrices> {
  console.log('[MacroData] Fetching commodity & index prices from Yahoo Finance...');

  // Fetch all Yahoo Finance indicators in parallel
  const [goldData, oilData, sp500Data, dxyData, vixData] = await Promise.all([
    fetchYahooIndicator('GC=F'),       // Gold futures
    fetchYahooIndicator('CL=F'),       // WTI Oil futures
    fetchYahooIndicator('%5EGSPC'),    // S&P 500 (^GSPC) — URL-encoded form
    fetchYahooIndicator('DX-Y.NYB'),   // US Dollar Index
    fetchYahooIndicator('%5EVIX'),     // CBOE VIX (^VIX) — URL-encoded form
  ]);

  // Get Fed Funds Rate (hardcoded with env override)
  const fedFundsRate = fetchFedFundsRate();

  const result: CommodityPrices = {
    gold: goldData
      ? { price: goldData.currentPrice, change24h: goldData.change24h, change7d: goldData.change7d }
      : null,
    oil: oilData
      ? { price: oilData.currentPrice, change24h: oilData.change24h, type: 'WTI' as const }
      : null,
    sp500: sp500Data
      ? { value: sp500Data.currentPrice, change24h: sp500Data.change24h }
      : null,
    dxy: dxyData
      ? { value: dxyData.currentPrice, change24h: dxyData.change24h }
      : null,
    vix: vixData
      ? { value: vixData.currentPrice, change24h: vixData.change24h }
      : null,
    fedFundsRate,
  };

  console.log('[MacroData] Yahoo Finance prices:', {
    gold: result.gold?.price ?? 'N/A',
    oil: result.oil?.price ?? 'N/A',
    sp500: result.sp500?.value ?? 'N/A',
    dxy: result.dxy?.value ?? 'N/A',
    vix: result.vix?.value ?? 'N/A',
    fedFundsRate: result.fedFundsRate?.value ?? 'N/A',
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// BTC DOMINANCE (from CoinGecko global data)
// ═══════════════════════════════════════════════════════════════

interface BtcDominanceResult {
  value: number;
  change24h: number;
}

async function fetchBtcDominance(): Promise<BtcDominanceResult> {
  console.log('[MacroData] Fetching BTC Dominance from CoinGecko...');

  try {
    const response = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/global',
      10000
    );

    if (!response.ok) {
      throw new Error(`CoinGecko global returned ${response.status}`);
    }

    const data = await response.json();

    if (!data?.data?.market_cap_percentage?.btc) {
      throw new Error('Invalid CoinGecko global data format');
    }

    const btcDominance = data.data.market_cap_percentage.btc;
    const marketCapChange = data.data.market_cap_change_percentage_24h_usd ?? 0;

    // Use market cap change as a proxy for dominance change if exact change not available
    const result: BtcDominanceResult = {
      value: Math.round(btcDominance * 100) / 100,
      change24h: Math.round(marketCapChange * 100) / 100,
    };

    console.log(`[MacroData] BTC Dominance: ${result.value}%`);
    return result;
  } catch (error) {
    console.error('[MacroData] CoinGecko BTC dominance error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch comprehensive macroeconomic data from multiple free sources.
 *
 * - Returns cached data if within TTL (15 min)
 * - Fetches all sources in parallel with graceful fallbacks
 * - Each source failure is tracked in `sources` metadata
 */
export async function fetchMacroData(forceRefresh = false): Promise<MacroData> {
  // Check cache first
  if (!forceRefresh && cachedMacroData && Date.now() - cachedMacroData.timestamp < CACHE_DURATION) {
    console.log('[MacroData] Returning cached data (age: ' + Math.round((Date.now() - cachedMacroData.timestamp) / 1000) + 's)');
    return {
      ...cachedMacroData.data,
      sources: cachedMacroData.data.sources.map((s) => ({
        ...s,
        status: 'cached' as const,
      })),
    };
  }

  console.log('[MacroData] Fetching fresh macro data from all sources...');

  // Fetch all data in parallel with fallbacks
  const [fearGreedResult, defiTvlResult, commodityResult, btcDominanceResult] =
    await Promise.allSettled([
      fetchFearGreedIndex(),
      fetchDefiTvl(),
      fetchCommodityPrices(),
      fetchBtcDominance(),
    ]);

  // Track source statuses
  const sources: { name: string; status: 'live' | 'cached' | 'failed' }[] = [];

  // Process Fear & Greed
  const fearGreed =
    fearGreedResult.status === 'fulfilled' ? fearGreedResult.value : null;
  sources.push({
    name: 'Alternative.me (Fear & Greed)',
    status: fearGreed ? 'live' : 'failed',
  });
  if (fearGreedResult.status === 'rejected') {
    console.error('[MacroData] Fear & Greed failed:', fearGreedResult.reason);
  }

  // Process DeFi TVL
  const defiTvl = defiTvlResult.status === 'fulfilled' ? defiTvlResult.value : null;
  sources.push({
    name: 'DeFiLlama (TVL)',
    status: defiTvl ? 'live' : 'failed',
  });
  if (defiTvlResult.status === 'rejected') {
    console.error('[MacroData] DeFi TVL failed:', defiTvlResult.reason);
  }

  // Process Commodity Prices
  const commodities =
    commodityResult.status === 'fulfilled' ? commodityResult.value : null;
  sources.push({
    name: 'Yahoo Finance (Gold/Oil/S&P/DXY/VIX)',
    status: commodities ? 'live' : 'failed',
  });
  if (commodityResult.status === 'rejected') {
    console.error('[MacroData] Commodity prices failed:', commodityResult.reason);
  }

  // Process BTC Dominance
  const btcDominance =
    btcDominanceResult.status === 'fulfilled' ? btcDominanceResult.value : null;
  sources.push({
    name: 'CoinGecko (BTC Dominance)',
    status: btcDominance ? 'live' : 'failed',
  });
  if (btcDominanceResult.status === 'rejected') {
    console.error('[MacroData] BTC Dominance failed:', btcDominanceResult.reason);
  }

  // Build result
  const result: MacroData = {
    gold: commodities?.gold ?? null,
    oil: commodities?.oil ?? null,
    sp500: commodities?.sp500 ?? null,
    dxy: commodities?.dxy ?? null,
    vix: commodities?.vix ?? null,
    fearGreed,
    btcDominance,
    defiTvl,
    fedFundsRate: commodities?.fedFundsRate ?? null,
    lastUpdated: new Date().toISOString(),
    sources,
  };

  // Cache and return
  cachedMacroData = { data: result, timestamp: Date.now() };

  const successCount = sources.filter((s) => s.status === 'live').length;
  console.log(
    `[MacroData] Fetched macro data: ${successCount}/${sources.length} sources succeeded`
  );

  return result;
}

/**
 * Clear the macro data cache (useful for force refresh)
 */
export function clearMacroCache(): void {
  cachedMacroData = null;
  console.log('[MacroData] Cache cleared');
}
