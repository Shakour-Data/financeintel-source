/**
 * Predictions API — Generate ML predictions and retrieve accuracy data
 *
 * GET /api/predictions
 * Query params:
 *   action=generate           — Generate predictions from DB historical scores
 *   action=latest             — Get latest predictions (default)
 *   action=accuracy           — Get prediction accuracy metrics
 *   action=comparison         — Get prediction vs actual for a specific coin+node
 *   action=comparison-dims    — Get comparison data for ALL dimensions of a coin
 *   action=confidence-cal     — Get confidence calibration data
 *   action=summary            — Get overall prediction summary (default)
 *   action=generate-historical — Generate retroactive predictions for comparison charts
 *   coinId=xxx                — DB coin ID (for comparison/comparison-dims)
 *   nodeKey=xxx               — Filter by node key (for comparison)
 *   days=30                   — Number of days for accuracy/comparison
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generatePredictions,
  getLatestPredictions,
  getPredictionAccuracy,
  getPredictionComparison,
  getPredictionSummary,
  getDimensionComparisons,
  getConfidenceCalibration,
  generateHistoricalComparisons,
} from '@/lib/prediction-engine';
import { type CoinInput, EMPTY_EXTERNAL_DATA } from '@/lib/scoring-engine-v2';
import { db } from '@/lib/db';

export const maxDuration = 120;

// Limit generate to top N coins for performance
const MAX_COINS_FOR_GENERATE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action') || 'summary';
    const coinId = searchParams.get('coinId') || undefined;
    const nodeKey = searchParams.get('nodeKey') || undefined;
    const days = parseInt(searchParams.get('days') || '30', 10);

    switch (action) {
      case 'generate': {
        // Generate predictions using only DB data — no external API calls
        console.log('[Predictions] Starting generation...');

        const coins = await db.coin.findMany({
          orderBy: { createdAt: 'asc' },
          take: MAX_COINS_FOR_GENERATE,
          select: {
            id: true,
            coingeckoId: true,
            symbol: true,
            name: true,
          },
        });

        if (coins.length === 0) {
          return NextResponse.json({
            action: 'generate',
            predictionsCount: 0,
            backfilledCount: 0,
            message: 'No coins in database. Load market data first via /api/market/overview',
          });
        }

        // Build minimal CoinInput array from DB data
        const coinInputs: CoinInput[] = [];

        for (const dbCoin of coins) {
          // Get latest raw market data for this coin
          const latestRaw = await db.rawMarketDaily.findFirst({
            where: { coinId: dbCoin.id },
            orderBy: { date: 'desc' },
          });

          if (latestRaw) {
            coinInputs.push({
              id: dbCoin.coingeckoId,
              dbCoinId: dbCoin.id,
              symbol: dbCoin.symbol,
              name: dbCoin.name,
              current_price: latestRaw.price,
              market_cap: latestRaw.marketCap ?? 0,
              market_cap_rank: latestRaw.marketCapRank ?? 100,
              fully_diluted_valuation: latestRaw.fullyDilutedValuation ?? 0,
              total_volume: latestRaw.totalVolume ?? 0,
              high_24h: latestRaw.high24h ?? latestRaw.price,
              low_24h: latestRaw.low24h ?? latestRaw.price,
              price_change_24h: latestRaw.priceChange24h ?? 0,
              price_change_percentage_24h: latestRaw.priceChangePct24h ?? 0,
              market_cap_change_24h: 0,
              market_cap_change_percentage_24h: latestRaw.marketCapChangePct24h ?? 0,
              circulating_supply: latestRaw.circulatingSupply ?? 0,
              total_supply: latestRaw.totalSupply ?? 0,
              max_supply: latestRaw.maxSupply ?? 0,
              ath: latestRaw.ath ?? latestRaw.price,
              ath_change_percentage: latestRaw.athChangePct ?? 0,
            });
          }
        }

        if (coinInputs.length === 0) {
          return NextResponse.json({
            action: 'generate',
            predictionsCount: 0,
            backfilledCount: 0,
            message: 'No market data available. Load market data first.',
          });
        }

        console.log(`[Predictions] Generating for ${coinInputs.length} coins...`);
        const result = await generatePredictions(coinInputs, EMPTY_EXTERNAL_DATA);
        console.log(`[Predictions] Done: ${result.predictions.length} predictions, ${result.backfilledCount} backfilled`);

        return NextResponse.json({
          action: 'generate',
          predictionsCount: result.predictions.length,
          backfilledCount: result.backfilledCount,
          message: `Generated predictions for ${result.predictions.length} coins, backfilled ${result.backfilledCount} actuals`,
        });
      }

      case 'latest': {
        const predictions = await getLatestPredictions(coinId);
        return NextResponse.json({ action: 'latest', predictions });
      }

      case 'accuracy': {
        const accuracy = await getPredictionAccuracy(days);
        return NextResponse.json({ action: 'accuracy', accuracy, days });
      }

      case 'comparison': {
        if (!coinId) {
          return NextResponse.json({ error: 'coinId is required for comparison' }, { status: 400 });
        }
        // coinId can be the DB coin ID directly
        const targetNodeKey = nodeKey || 'total';
        const comparison = await getPredictionComparison(coinId, targetNodeKey, days);
        return NextResponse.json({ action: 'comparison', coinId, nodeKey: targetNodeKey, comparison });
      }

      case 'comparison-dims': {
        if (!coinId) {
          return NextResponse.json({ error: 'coinId is required for comparison-dims' }, { status: 400 });
        }
        const dimComparisons = await getDimensionComparisons(coinId, days);
        return NextResponse.json({ action: 'comparison-dims', coinId, days, dimensions: dimComparisons });
      }

      case 'confidence-cal': {
        const calibration = await getConfidenceCalibration(days);
        return NextResponse.json({ action: 'confidence-cal', calibration, days });
      }

      case 'generate-historical': {
        // Generate retroactive predictions for comparison data
        if (!coinId) {
          // Do it for all coins (limited)
          const coins = await db.coin.findMany({
            orderBy: { createdAt: 'asc' },
            take: 5,
            select: { id: true },
          });
          let totalCreated = 0;
          for (const c of coins) {
            totalCreated += await generateHistoricalComparisons(c.id, days);
          }
          return NextResponse.json({
            action: 'generate-historical',
            coinsProcessed: coins.length,
            comparisonsCreated: totalCreated,
            message: `Created ${totalCreated} historical comparisons for ${coins.length} coins`,
          });
        }

        const created = await generateHistoricalComparisons(coinId, days);
        return NextResponse.json({
          action: 'generate-historical',
          coinId,
          comparisonsCreated: created,
        });
      }

      case 'summary': {
        const summary = await getPredictionSummary();
        return NextResponse.json({ action: 'summary', ...summary });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[Predictions API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process prediction request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
