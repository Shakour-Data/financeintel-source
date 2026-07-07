/**
 * Market Data Refresh API — Force-refresh market-data.json from CoinGecko.
 *
 * POST /api/market/refresh
 *
 * Force-fetches fresh data from CoinGecko, writes it to market-data.json,
 * and returns the fresh data. Can be called manually or on a schedule.
 *
 * Also invalidates the in-memory cache of the overview route so the
 * next request picks up the new data immediately.
 */

import { NextResponse } from 'next/server';
import { refreshMarketDataFile, getFileMtime, type RawMarketFile } from '@/lib/market-data-cache';

export async function POST() {
  try {
    const prevMtime = await getFileMtime();

    console.log('[MarketRefresh] Force-refreshing market data from CoinGecko...');
    const result = await refreshMarketDataFile();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? 'Failed to fetch data from CoinGecko',
          previousMtime: prevMtime,
        },
        { status: 502 }
      );
    }

    const newMtime = await getFileMtime();

    return NextResponse.json({
      success: true,
      message: `Refreshed ${result.data?.coins?.length ?? 0} coins from CoinGecko`,
      previousMtime: prevMtime,
      newMtime,
      meta: result.data?.meta,
    });
  } catch (error) {
    console.error('[MarketRefresh] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market/refresh — Check the current cache status without refreshing.
 */
export async function GET() {
  try {
    const mtime = await getFileMtime();
    const { isMarketDataStale, readMarketDataFile } = await import('@/lib/market-data-cache');
    const stale = await isMarketDataStale();
    const data = await readMarketDataFile();

    return NextResponse.json({
      cacheFile: {
        exists: data !== null,
        lastModified: mtime,
        isStale: stale,
        coinCount: data?.coins?.length ?? 0,
        lastUpdated: data?.meta?.lastUpdated ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
