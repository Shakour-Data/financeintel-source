/**
 * Score Delta API — V2 (DB-backed)
 *
 * GET /api/scores/delta?coinId=bitcoin&nodeKey=fundamental
 *
 * Returns the latest score and coefficient with their delta values
 * for a specific coin and hierarchy node.
 */

import { NextResponse } from 'next/server';
import { getScoreDelta } from '@/lib/scoring-engine-v2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId');
    const nodeKey = searchParams.get('nodeKey');

    if (!coinId || !nodeKey) {
      return NextResponse.json(
        { error: 'Missing required params: coinId, nodeKey' },
        { status: 400 }
      );
    }

    const delta = await getScoreDelta(coinId, nodeKey);

    return NextResponse.json(delta);
  } catch (error) {
    console.error('[ScoreDelta] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score delta' },
      { status: 500 }
    );
  }
}
