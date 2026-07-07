/**
 * Market Indicators API — Returns the latest market indicators (overall + per-dimension)
 *
 * GET /api/market/indicators
 *
 * Returns:
 * - marketScore: Overall market AI score with change, dimension breakdown, breadth
 * - indicators: Per-dimension aggregate indicators from MarketIndicatorDaily
 * - date: The date of the latest data
 * - coefficientVersion: Current ML coefficient version
 */

import { NextResponse } from 'next/server';
import {
  getLatestMarketIndicators,
  getLatestMarketDailyScore,
  getDimensionKeys,
} from '@/lib/market-indicators';

export async function GET() {
  try {
    const { dailyScore, indicators } = await getLatestMarketIndicators();

    if (!dailyScore) {
      return NextResponse.json({
        marketScore: null,
        indicators: {},
        date: null,
        coefficientVersion: 0,
        message: 'No market indicators computed yet. Run /api/data/init first.',
      });
    }

    // Build dimension-level indicators from the map
    const dimensionIndicators: Record<string, {
      aggregateScore: number;
      equalWeightScore: number;
      medianScore: number;
      coefficient: number | null;
      coefficientChange: number | null;
      coinsAboveNeutral: number;
      coinsBelowNeutral: number;
      bullBearRatio: number;
      predictionError: number | null;
    }> = {};

    for (const dimKey of getDimensionKeys()) {
      const indicator = indicators.get(dimKey);
      if (indicator) {
        dimensionIndicators[dimKey] = {
          aggregateScore: indicator.aggregateScore,
          equalWeightScore: indicator.equalWeightScore,
          medianScore: indicator.medianScore,
          coefficient: indicator.coefficient,
          coefficientChange: indicator.coefficientChange,
          coinsAboveNeutral: indicator.coinsAboveNeutral,
          coinsBelowNeutral: indicator.coinsBelowNeutral,
          bullBearRatio: indicator.bullBearRatio,
          predictionError: indicator.predictionError,
        };
      }
    }

    // Build market score object
    const marketScore = {
      marketAiScore: dailyScore.marketAiScore,
      change: dailyScore.marketAiScoreChange,
      dimensions: {
        fundamental: dailyScore.fundamentalScore,
        technical: dailyScore.technicalScore,
        onchain: dailyScore.onchainScore,
        market_psychology: dailyScore.marketScore,
      },
      previousDimensions: {
        fundamental: dailyScore.previousFundamentalScore,
        technical: dailyScore.previousTechnicalScore,
        onchain: dailyScore.previousOnchainScore,
        market_psychology: dailyScore.previousMarketScore,
      },
      breadth: {
        bullCoins: dailyScore.bullCoins ?? 0,
        bearCoins: dailyScore.bearCoins ?? 0,
        neutralCoins: dailyScore.neutralCoins ?? 0,
        total: (dailyScore.bullCoins ?? 0) + (dailyScore.bearCoins ?? 0) + (dailyScore.neutralCoins ?? 0),
        marketBreadth: dailyScore.marketBreadth,
      },
    };

    return NextResponse.json({
      marketScore,
      indicators: dimensionIndicators,
      date: dailyScore.date,
      coefficientVersion: dailyScore.coefficientVersion,
    });
  } catch (error) {
    console.error('[MarketIndicators] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch market indicators',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
