import { NextRequest, NextResponse } from 'next/server';
import { fetchCountryStocks, type StockQuote } from '@/lib/stock-data-engine';
import { calculateStockScore, STOCK_DIMENSIONS, getHierarchyBreakdown, type StockScoreResult } from '@/lib/stock-scoring-engine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const country = searchParams.get('country') || 'US';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  try {
    const stocks = await fetchCountryStocks(country as 'US' | 'JP' | 'GB' | 'DE' | 'FR' | 'IN');
    const stock = stocks.find((s: StockQuote) => s.symbol === symbol);

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const scoreResult = calculateStockScore(stock, country);
    const hierarchyBreakdown = getHierarchyBreakdown();

    return NextResponse.json({
      stock: {
        ...stock,
        aiScore: scoreResult.aiScore,
        confidence: scoreResult.confidence,
        profitabilityScore: scoreResult.profitabilityScore,
        valuationScore: scoreResult.valuationScore,
        growthScore: scoreResult.growthScore,
        financialHealthScore: scoreResult.financialHealthScore,
        dividendScore: scoreResult.dividendScore,
        technicalScore: scoreResult.technicalScore,
        momentumScore: scoreResult.momentumScore,
        analystScore: scoreResult.analystScore,
        institutionalScore: scoreResult.institutionalScore,
        marketSentimentScore: scoreResult.marketSentimentScore,
        sectorRotationScore: scoreResult.sectorRotationScore,
        macroScore: scoreResult.macroScore,
      },
      scoreResult,
      dimensions: STOCK_DIMENSIONS,
      hierarchyBreakdown,
      meta: {
        lastUpdated: new Date().toISOString(),
        country,
        scoringDimensions: 12,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Stock Detail API] Error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch stock detail', details: message },
      { status: 500 }
    );
  }
}
