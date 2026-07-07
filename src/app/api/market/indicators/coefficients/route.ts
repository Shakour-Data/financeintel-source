/**
 * Market Indicator Coefficients API — Returns coefficient evolution over time
 *
 * GET /api/market/indicators/coefficients?nodeKey=fundamental&days=365
 *
 * Query params:
 * - nodeKey (required): Hierarchy node key to get coefficient evolution for
 * - days (optional): Number of days of history. Default: 365.
 *
 * Returns coefficient trend showing how ML has evolved the coefficient over time,
 * as well as prediction error trend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeKey = searchParams.get('nodeKey');

    if (!nodeKey) {
      return NextResponse.json(
        { error: 'nodeKey query parameter is required' },
        { status: 400 }
      );
    }

    const days = parseInt(searchParams.get('days') || '365', 10);
    const clampedDays = Math.max(1, Math.min(1095, days));

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - clampedDays);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get coefficient history for this node
    const coefficientHistory = await db.coefficientHistory.findMany({
      where: {
        nodeKey,
        date: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        coefficient: true,
        previousCoefficient: true,
        coefficientChange: true,
        predictionError: true,
        version: true,
      },
    });

    // Also get the market indicator daily for this node (for aggregate score context)
    // Use raw SQL since the PrismaClient may not have the model
    const marketIndicators = await db.$queryRaw<Array<{
      date: string;
      aggregateScore: number;
      bullBearRatio: number | null;
      coinsAboveNeutral: number | null;
      coinsBelowNeutral: number | null;
    }>>`
      SELECT date, aggregateScore, bullBearRatio, coinsAboveNeutral, coinsBelowNeutral
      FROM "MarketIndicatorDaily"
      WHERE nodeKey = ${nodeKey} AND date >= ${startDateStr} AND date <= ${endDateStr}
      ORDER BY date ASC
    `;

    // Merge the two datasets by date
    const indicatorMap = new Map<string, typeof marketIndicators[0]>();
    for (const row of marketIndicators) {
      indicatorMap.set(row.date, row);
    }

    const data = coefficientHistory.map((row) => {
      const indicator = indicatorMap.get(row.date);
      return {
        date: row.date,
        coefficient: row.coefficient,
        previousCoefficient: row.previousCoefficient,
        coefficientChange: row.coefficientChange,
        predictionError: row.predictionError,
        version: row.version,
        // Context from market indicators
        aggregateScore: indicator?.aggregateScore ?? null,
        bullBearRatio: indicator?.bullBearRatio ?? null,
        coinsAboveNeutral: indicator?.coinsAboveNeutral ?? null,
        coinsBelowNeutral: indicator?.coinsBelowNeutral ?? null,
      };
    });

    // Compute summary statistics
    const coefficients = coefficientHistory.map(r => r.coefficient);
    const minCoeff = coefficients.length > 0 ? Math.min(...coefficients) : 0;
    const maxCoeff = coefficients.length > 0 ? Math.max(...coefficients) : 0;
    const avgCoeff = coefficients.length > 0
      ? coefficients.reduce((s, v) => s + v, 0) / coefficients.length
      : 0;

    const predictionErrors = coefficientHistory
      .map(r => r.predictionError)
      .filter((v): v is number => v !== null);
    const avgPredictionError = predictionErrors.length > 0
      ? predictionErrors.reduce((s, v) => s + v, 0) / predictionErrors.length
      : null;

    const totalCoefficientChange = coefficientHistory.length > 0
      ? coefficientHistory[coefficientHistory.length - 1].coefficient -
        coefficientHistory[0].coefficient
      : 0;

    return NextResponse.json({
      nodeKey,
      days: clampedDays,
      data,
      summary: {
        totalDataPoints: data.length,
        coefficientRange: {
          min: Math.round(minCoeff * 10000) / 10000,
          max: Math.round(maxCoeff * 10000) / 10000,
          avg: Math.round(avgCoeff * 10000) / 10000,
        },
        totalChange: Math.round(totalCoefficientChange * 10000) / 10000,
        avgPredictionError: avgPredictionError !== null
          ? Math.round(avgPredictionError * 10000) / 10000
          : null,
        latestVersion: coefficientHistory.length > 0
          ? coefficientHistory[coefficientHistory.length - 1].version
          : 0,
      },
    });
  } catch (error) {
    console.error('[MarketIndicatorCoefficients] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch coefficient evolution',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
