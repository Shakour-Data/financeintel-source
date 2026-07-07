/**
 * Market Data Cache — auto-refreshing file cache for CoinGecko data.
 *
 * Manages the `/public/market-data.json` file:
 * - Checks file age (staleness)
 * - Fetches fresh data from CoinGecko via crypto-api.ts
 * - Writes updated data to the cache file
 * - Reads cached data when available
 *
 * Designed for graceful degradation:
 * - If CoinGecko is rate-limited or fails, serve stale file data
 * - If the file doesn't exist at all, return null
 */

import { promises as fs } from 'fs';
import { join } from 'path';

import { fetchMarketData, fetchGlobalData } from '@/lib/crypto-api';
import type { MarketCoin, GlobalData } from '@/lib/crypto-api';

// ─── Constants ─────────────────────────────────────────────────

const MARKET_DATA_PATH = join(process.cwd(), 'public', 'market-data.json');
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ─────────────────────────────────────────────────────

export interface RawMarketFile {
  coins: Record<string, unknown>[];
  globalData: Record<string, unknown> | null;
  meta?: {
    lastUpdated?: string;
    [key: string]: unknown;
  };
}

export interface RefreshResult {
  success: boolean;
  data: RawMarketFile | null;
  error?: string;
  fromCoinGecko: boolean;
}

// ─── File helpers ──────────────────────────────────────────────

/**
 * Get the absolute path to market-data.json.
 */
export function getMarketDataPath(): string {
  return MARKET_DATA_PATH;
}

/**
 * Check whether market-data.json exists and is older than `maxAgeMs`.
 * Returns `true` if the file is stale (or missing), `false` if fresh.
 */
export async function isMarketDataStale(maxAgeMs = STALE_THRESHOLD_MS): Promise<boolean> {
  try {
    const stat = await fs.stat(MARKET_DATA_PATH);
    const age = Date.now() - stat.mtimeMs;
    return age > maxAgeMs;
  } catch {
    // File doesn't exist → definitely stale
    return true;
  }
}

/**
 * Get the file's last modification time as an ISO string, or null if missing.
 */
export async function getFileMtime(): Promise<string | null> {
  try {
    const stat = await fs.stat(MARKET_DATA_PATH);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

/**
 * Read and parse market-data.json. Returns null on any error.
 */
export async function readMarketDataFile(): Promise<RawMarketFile | null> {
  try {
    const content = await fs.readFile(MARKET_DATA_PATH, 'utf-8');
    return JSON.parse(content) as RawMarketFile;
  } catch {
    return null;
  }
}

/**
 * Fetch fresh data from CoinGecko and write it to market-data.json.
 *
 * Returns a RefreshResult indicating success/failure.
 * On success, `data` contains the freshly written file content.
 * On failure, `data` is null and `error` describes the issue.
 */
export async function refreshMarketDataFile(): Promise<RefreshResult> {
  try {
    console.log('[MarketDataCache] Fetching fresh data from CoinGecko...');

    const [marketResult, globalResult] = await Promise.allSettled([
      fetchMarketData(200),
      fetchGlobalData(),
    ]);

    const marketData = marketResult.status === 'fulfilled' ? marketResult.value : null;
    const globalData = globalResult.status === 'fulfilled' ? globalResult.value : null;

    // We need at least the coins data to proceed
    if (!marketData || !marketData.data || marketData.data.length === 0) {
      const errorMsg = marketResult.status === 'rejected'
        ? marketResult.reason?.message ?? 'Unknown error'
        : 'CoinGecko returned empty market data';
      console.warn(`[MarketDataCache] CoinGecko market data unavailable: ${errorMsg}`);
      return { success: false, data: null, error: errorMsg, fromCoinGecko: false };
    }

    const coins: Record<string, unknown>[] = marketData.data as unknown as Record<string, unknown>[];

    // Unwrap global data (CoinGecko wraps it in a `data` property)
    let globalDataObj: Record<string, unknown> | null = null;
    if (globalData?.data?.data) {
      // CoinGecko returns { data: { data: { ... } } } after our wrapper
      globalDataObj = globalData.data.data as Record<string, unknown>;
    } else if (globalData?.data) {
      globalDataObj = globalData.data as unknown as Record<string, unknown>;
    }

    const fileContent: RawMarketFile = {
      coins,
      globalData: globalDataObj,
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'coingecko',
        fromCache: false,
        isStale: false,
        totalCoins: coins.length,
      },
    };

    // Write to file (atomic-ish: write then rename pattern not needed for
    // JSON cache files — worst case a concurrent read gets the old version)
    await fs.writeFile(MARKET_DATA_PATH, JSON.stringify(fileContent, null, 0), 'utf-8');

    console.log(`[MarketDataCache] Wrote ${coins.length} coins to market-data.json`);

    return { success: true, data: fileContent, fromCoinGecko: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[MarketDataCache] Refresh failed: ${errorMsg}`);
    return { success: false, data: null, error: errorMsg, fromCoinGecko: false };
  }
}

/**
 * Try to auto-refresh market-data.json if it's older than `maxAgeMs`.
 *
 * - If the file is fresh, does nothing and returns null.
 * - If the file is stale, attempts a CoinGecko refresh.
 * - If CoinGecko fails, falls back to the existing file data.
 *
 * Returns the RefreshResult only if a refresh was attempted,
 * or null if the file was already fresh.
 */
export async function tryAutoRefresh(maxAgeMs = STALE_THRESHOLD_MS): Promise<RefreshResult | null> {
  const stale = await isMarketDataStale(maxAgeMs);
  if (!stale) {
    return null; // File is fresh, no refresh needed
  }

  console.log(`[MarketDataCache] market-data.json is older than ${maxAgeMs / 1000}s, attempting refresh...`);
  const result = await refreshMarketDataFile();

  if (!result.success) {
    console.warn('[MarketDataCache] Auto-refresh failed, will use existing file data');
  }

  return result;
}
