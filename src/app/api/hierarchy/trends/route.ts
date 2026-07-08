/**
 * Hierarchy Trends API
 *
 * GET /api/hierarchy/trends?nodeKey=fundamental&days=90
 * GET /api/hierarchy/trends?nodeKey=fund_valuation&level=sub-dimension&days=90
 * GET /api/hierarchy/trends?nodeKey=fund_val_mcap&level=aspect&days=90
 *
 * Returns aggregate trend data for a specific hierarchy node across all coins.
 * Supports dimensions, sub-dimensions, aspects, and sub-aspects.
 *
 * Response format: {
 *   data: [
 *     {
 *       date: string (YYYY-MM-DD),
 *       score: number (1-10),
 *       coefficient: number,
 *       volatility: number,
 *       coinCount: number,
 *       trend: 'up' | 'down' | 'stable'
 *     }
 *   ],
 *   metadata: {
 *     nodeKey: string,
 *     level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect',
 *     daysRequested: number,
 *     pointsReturned: number
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeKey = searchParams.get('nodeKey');
    const level = searchParams.get('level') ?? 'dimension';
    const days = parseInt(searchParams.get('days') ?? '90', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 10000);

    if (!nodeKey) {
      return NextResponse.json(
        { error: 'Missing required param: nodeKey' },
        { status: 400 }
      );
    }

    // Validate level parameter
    const validLevels = ['dimension', 'sub-dimension', 'aspect', 'sub-aspect'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // Build the date filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Query MarketIndicatorDaily for aggregate hierarchy node data
    // This table stores aggregate scores per hierarchy node per day
    const trendData = await db.marketIndicatorDaily.findMany({
      where: {
        hierarchyNode: {
          key: nodeKey,
          level: level,
        },
        date: {
          gte: new Date(cutoffDateStr),
        },
      },
      select: {
        date: true,
        averageScore: true,
        coefficient: true,
        volatility: true,
        numCoinsIncluded: true,
      },
      orderBy: { date: 'asc' },
      take: limit,
    });

    // If no data from MarketIndicatorDaily, try to compute from ScoreHistory
    if (trendData.length === 0) {
      const scoreHistory = await db.scoreHistory.findMany({
        where: {
          hierarchyNode: {
            key: nodeKey,
            level: level,
          },
          date: {
            gte: new Date(cutoffDateStr),
          },
        },
        select: {
          date: true,
          score: true,
          coefficient: true,
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate by date
      const aggregated = new Map<string, { scores: number[]; coefficients: number[] }>();

      for (const record of scoreHistory) {
        const dateStr = record.date.toISOString().split('T')[0];
        if (!aggregated.has(dateStr)) {
          aggregated.set(dateStr, { scores: [], coefficients: [] });
        }
        const bucket = aggregated.get(dateStr)!;
        bucket.scores.push(record.score);
        bucket.coefficients.push(record.coefficient);
      }

      // Convert to response format with statistics
      const formattedData = Array.from(aggregated.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([date, { scores, coefficients }]) => {
          const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const avgCoeff = coefficients.length > 0 ? coefficients.reduce((a, b) => a + b, 0) / coefficients.length : 0;

          // Calculate volatility (standard deviation of scores)
          const variance =
            scores.length > 0
              ? scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
              : 0;
          const volatility = Math.sqrt(variance);

          // Determine trend (simple: compare to previous average)
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgScore > 5.5) {
            trend = 'up';
          } else if (avgScore < 4.5) {
            trend = 'down';
          }

          return {
            date,
            score: parseFloat(avgScore.toFixed(2)),
            coefficient: parseFloat(avgCoeff.toFixed(2)),
            volatility: parseFloat(volatility.toFixed(2)),
            coinCount: scores.length,
            trend,
          };
        });

      return NextResponse.json({
        data: formattedData,
        metadata: {
          nodeKey,
          level,
          daysRequested: days,
          pointsReturned: formattedData.length,
          source: 'aggregated-from-score-history',
        },
      });
    }

    // Format response from MarketIndicatorDaily
    const formattedData = trendData
      .map((record) => {
        // Determine trend based on score
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (record.averageScore > 5.5) {
          trend = 'up';
        } else if (record.averageScore < 4.5) {
          trend = 'down';
        }

        return {
          date: record.date.toISOString().split('T')[0],
          score: parseFloat(record.averageScore.toFixed(2)),
          coefficient: parseFloat(record.coefficient.toFixed(2)),
          volatility: parseFloat((record.volatility || 0).toFixed(2)),
          coinCount: record.numCoinsIncluded,
          trend,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      data: formattedData,
      metadata: {
        nodeKey,
        level,
        daysRequested: days,
        pointsReturned: formattedData.length,
        source: 'market-indicator-daily',
      },
    });
  } catch (error) {
    console.error('[HierarchyTrends] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hierarchy trends', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
