/**
 * Market Indicator History API — Returns trend data for market indicators
 *
 * GET /api/market/indicators/history?nodeKey=fundamental&days=90
 *
 * Query params:
 * - nodeKey (optional): Specific hierarchy node key. If not specified, returns all 4 dimension indicators.
 * - days (optional): Number of days of history. Default: 90.
 *
 * Returns time series data for charts.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMarketIndicatorHistory,
  getMarketDailyScoreHistory,
  getDimensionKeys,
} from '@/lib/market-indicators';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeKey = searchParams.get('nodeKey') || null;
    const days = parseInt(searchParams.get('days') || '90', 10);

    // Clamp days to reasonable range
    const clampedDays = Math.max(1, Math.min(365, days));

    if (nodeKey) {
      // Return history for a specific node
      const history = await getMarketIndicatorHistory(nodeKey, clampedDays);
      return NextResponse.json({
        nodeKey,
        days: clampedDays,
        data: history,
      });
    }

    // No nodeKey specified: return all 4 dimension indicators + overall market score
    const dimensionKeys = getDimensionKeys();

    const [dimensionHistories, marketScoreHistory] = await Promise.all([
      Promise.all(
        dimensionKeys.map(async (key) => {
          const history = await getMarketIndicatorHistory(key, clampedDays);
          return { key, history };
        })
      ),
      getMarketDailyScoreHistory(clampedDays),
    ]);

    // Build the response object
    const result: Record<string, typeof dimensionHistories[0]['history']> = {};
    for (const { key, history } of dimensionHistories) {
      result[key] = history;
    }

    return NextResponse.json({
      dimensions: result,
      marketScore: marketScoreHistory,
      days: clampedDays,
    });
  } catch (error) {
    console.error('[MarketIndicatorHistory] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch market indicator history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
