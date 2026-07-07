/**
 * Coefficient History API — V2 (DB-backed)
 *
 * GET /api/scores/coefficients?nodeKey=fundamental&days=90
 *
 * Returns coefficient history for a hierarchy node over time.
 *
 * Response format: { data: [{ date, coefficient, coefficientChange, predictionError? }] }
 */

import { NextResponse } from 'next/server';
import { getCoefficientHistory } from '@/lib/scoring-engine-v2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeKey = searchParams.get('nodeKey');
    const days = parseInt(searchParams.get('days') ?? '90', 10);

    if (!nodeKey) {
      return NextResponse.json(
        { error: 'Missing required param: nodeKey' },
        { status: 400 }
      );
    }

    const data = await getCoefficientHistory(nodeKey, days);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[CoefficientsHistory] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coefficient history' },
      { status: 500 }
    );
  }
}
