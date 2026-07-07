/**
 * Score History API — V2 (DB-backed)
 *
 * GET /api/scores/history?coinId=bitcoin&nodeKey=fundamental&days=90
 *
 * Returns score trend data for a specific coin and hierarchy node.
 * Special nodeKey="overall" queries CoinDailyScore for the aggregate AI score.
 *
 * Response format: { data: [{ date, score, coefficient? }] }
 */

import { NextResponse } from 'next/server';
import { getCoinScoreHistory, getCoinOverallScoreHistory } from '@/lib/scoring-engine-v2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId');
    const nodeKey = searchParams.get('nodeKey');
    const days = parseInt(searchParams.get('days') ?? '90', 10);

    if (!coinId || !nodeKey) {
      return NextResponse.json(
        { error: 'Missing required params: coinId, nodeKey' },
        { status: 400 }
      );
    }

    // Special case: "overall" nodeKey → query CoinDailyScore for aggregate AI score
    if (nodeKey === 'overall') {
      const data = await getCoinOverallScoreHistory(coinId, days);
      return NextResponse.json({ data });
    }

    const data = await getCoinScoreHistory(coinId, nodeKey, days);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[ScoresHistory] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score history' },
      { status: 500 }
    );
  }
}
