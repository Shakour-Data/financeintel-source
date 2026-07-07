/**
 * Macro Data API — Comprehensive macroeconomic data for crypto scoring
 *
 * GET /api/macro?forceRefresh=false
 *
 * Returns gold, oil, S&P 500, DXY, VIX, Fear & Greed, BTC Dominance,
 * DeFi TVL, and Fed Funds Rate from multiple free sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMacroData, clearMacroCache } from '@/lib/macro-data';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`[MacroAPI] Fetching macro data (forceRefresh=${forceRefresh})`);

    const data = await fetchMacroData(forceRefresh);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[MacroAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch macro data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * DELETE — Clear macro data cache
 */
export async function DELETE() {
  try {
    clearMacroCache();
    return NextResponse.json({ success: true, message: 'Macro data cache cleared' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
