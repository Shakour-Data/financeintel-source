/**
 * Multi-Timeframe Scoring API
 *
 * GET /api/market/multi-timeframe
 *
 * Query params:
 * - coinId: Get multi-timeframe scores for a specific coin (e.g., ?coinId=bitcoin)
 * - all: Get multi-timeframe scores for all top coins, summary only (e.g., ?all=true)
 * - timeframes: Comma-separated list of timeframes (e.g., ?timeframes=1h,4h,1d)
 *
 * Returns per-timeframe dimension scores, combined overall score, and trend direction per TF.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  computeMultiTimeframeScores,
  computeMultiTimeframeSummary,
  getTopCoinsForMTF,
  type TimeFrame,
} from '@/lib/multi-timeframe';

export const maxDuration = 60;

const VALID_TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

function parseTimeframes(param: string | null): TimeFrame[] | undefined {
  if (!param) return undefined;
  const parts = param.split(',').map(s => s.trim());
  const valid = parts.filter((p): p is TimeFrame => VALID_TIMEFRAMES.includes(p as TimeFrame));
  return valid.length > 0 ? valid : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId');
    const all = searchParams.get('all') === 'true';
    const timeframes = parseTimeframes(searchParams.get('timeframes'));

    if (coinId) {
      // Single coin — return full multi-timeframe result
      const result = await computeMultiTimeframeScores(coinId, timeframes);
      return NextResponse.json(result);
    }

    if (all) {
      // All top coins — return summary
      const topCoins = await getTopCoinsForMTF();
      const summary = await computeMultiTimeframeSummary(topCoins, timeframes);
      return NextResponse.json({
        coins: summary,
        meta: {
          totalCoins: summary.length,
          timeframes: timeframes ?? VALID_TIMEFRAMES,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // No valid params — return usage info
    return NextResponse.json(
      {
        error: 'Please provide either ?coinId=bitcoin or ?all=true',
        validTimeframes: VALID_TIMEFRAMES,
        usage: {
          singleCoin: '/api/market/multi-timeframe?coinId=bitcoin',
          allCoins: '/api/market/multi-timeframe?all=true',
          customTimeframes: '/api/market/multi-timeframe?coinId=bitcoin&timeframes=1h,4h,1d',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MultiTimeframeAPI] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to compute multi-timeframe scores.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
