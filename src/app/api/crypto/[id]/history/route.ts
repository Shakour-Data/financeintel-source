/**
 * Crypto Coin History API — V2 (DB-backed)
 *
 * GET /api/crypto/[id]/history?days=30
 *
 * Returns historical score and coefficient data for a specific coin.
 * The [id] parameter is the CoinGecko identifier (e.g. "bitcoin").
 *
 * Response format:
 * {
 *   scores: [{ date, aiScore, dimensions: { fundamental, technical, ... } }],
 *   coefficients: [{ date, fundamental, technical, ... }]
 * }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: coingeckoId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    // Resolve coingeckoId to DB coin id
    const dbCoin = await db.coin.findUnique({
      where: { coingeckoId },
      select: { id: true },
    });

    if (!dbCoin) {
      return NextResponse.json(
        { error: `Coin "${coingeckoId}" not found in database` },
        { status: 404 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch CoinDailyScore rows for the time range
    const dailyScores = await db.coinDailyScore.findMany({
      where: {
        coinId: dbCoin.id,
        date: { gte: startDateStr },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        aiScore: true,
        fundamentalScore: true,
        technicalScore: true,
        onchainScore: true,
        marketScore: true,
        newsSentimentScore: true,
        macroeconomicScore: true,
        regulatoryScore: true,
        networkSecurityScore: true,
        derivativesScore: true,
        whaleSmartMoneyScore: true,
        ecosystemDefiScore: true,
        interMarketScore: true,
      },
    });

    // Build scores array
    const scores = dailyScores.map((row) => ({
      date: row.date,
      aiScore: row.aiScore / 10, // Convert 0-100 to 0-10 scale
      dimensions: {
        fundamental: row.fundamentalScore,
        technical: row.technicalScore,
        onchain: row.onchainScore,
        market_psychology: row.marketScore,
        news_sentiment: row.newsSentimentScore,
        macroeconomic: row.macroeconomicScore,
        regulatory: row.regulatoryScore,
        network_security: row.networkSecurityScore,
        derivatives: row.derivativesScore,
        whale_smart_money: row.whaleSmartMoneyScore,
        ecosystem_defi: row.ecosystemDefiScore,
        inter_market: row.interMarketScore,
      },
    }));

    // Fetch CoefficientHistory for dimension-level nodes over the time range
    const dimensionKeys = [
      'fundamental',
      'technical',
      'onchain',
      'market_psychology',
      'news_sentiment',
      'macroeconomic',
      'regulatory',
      'network_security',
      'derivatives',
      'whale_smart_money',
      'ecosystem_defi',
      'inter_market',
    ];

    const coeffRows = await db.coefficientHistory.findMany({
      where: {
        nodeKey: { in: dimensionKeys },
        date: { gte: startDateStr },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        nodeKey: true,
        coefficient: true,
      },
    });

    // Group coefficient data by date
    const coeffByDate = new Map<string, Record<string, number>>();
    for (const row of coeffRows) {
      if (!coeffByDate.has(row.date)) {
        coeffByDate.set(row.date, {});
      }
      coeffByDate.get(row.date)![row.nodeKey] = row.coefficient;
    }

    // Build coefficients array
    const coefficients = Array.from(coeffByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dims]) => ({
        date,
        ...dims,
      }));

    return NextResponse.json({
      scores,
      coefficients,
      meta: {
        coinId: coingeckoId,
        days,
        dataPoints: scores.length,
        coefficientDataPoints: coefficients.length,
      },
    });
  } catch (error) {
    console.error('[CryptoHistory] Error:', error);
    const { id } = await params;
    return NextResponse.json(
      { error: `Failed to fetch history for "${id}"` },
      { status: 500 }
    );
  }
}
