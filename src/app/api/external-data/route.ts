/**
 * External Data API — Fetches and caches external market data
 *
 * GET /api/external-data
 *
 * Called periodically by the frontend to refresh external data
 * (Fear & Greed, DeFiLlama, Yahoo Finance, Binance).
 * Results are cached in the market/overview route module.
 */

import { NextResponse } from 'next/server';

export const maxDuration = 15;

export async function GET() {
  try {
    const { fetchAllExternalData } = await import('@/lib/external-data');

    const result = await Promise.race([
      fetchAllExternalData(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);

    if (!result) {
      return NextResponse.json({ status: 'timeout', sources: {} }, { status: 504 });
    }

    // Cache the external data for the market overview route
    const externalCtx = {
      fearAndGreed: result.fearAndGreed,
      defiLlama: result.defiLlama,
      macroIndicators: result.macroIndicators,
      derivatives: result.derivatives,
    };

    // Update the cache in the market overview module
    try {
      const overviewModule = await import('../market/overview/route') as typeof import('../market/overview/route') & {
        setExternalDataCache?: (data: unknown) => void;
      };
      if (overviewModule.setExternalDataCache) {
        overviewModule.setExternalDataCache(externalCtx);
      }
    } catch { /* Cache update failed - non-critical */ }

    return NextResponse.json({
      status: 'ok',
      sources: {
        fearAndGreed: result.fearAndGreed !== null,
        defiLlama: result.defiLlama !== null,
        macroIndicators: result.macroIndicators?.dxy != null,
        derivatives: result.derivatives?.btcFundingRate != null,
      },
      data: {
        fearAndGreed: result.fearAndGreed ? {
          value: result.fearAndGreed.value,
          classification: result.fearAndGreed.classification,
          change24h: result.fearAndGreed.change24h,
        } : null,
        totalTvl: result.defiLlama?.totalTvl ?? null,
        dxy: result.macroIndicators?.dxy ?? null,
        btcFundingRate: result.derivatives?.btcFundingRate ?? null,
        btcOpenInterest: result.derivatives?.btcOpenInterest ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 503 }
    );
  }
}
