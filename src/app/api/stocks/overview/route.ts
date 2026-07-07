import { NextRequest, NextResponse } from 'next/server';
import { fetchCountryStocks, fetchAllCountriesStocks, getAllMarketSummaries, type StockQuote } from '@/lib/stock-data-engine';
import { calculateStockScore, STOCK_DIMENSIONS, type StockScoreResult } from '@/lib/stock-scoring-engine';

// Cache for 3 minutes
let cachedResponse: { data: any; timestamp: number; cacheKey: string } | null = null;
const CACHE_TTL = 3 * 60 * 1000;

interface StockWithScore extends StockQuote {
  aiScore: number;
  confidence: 'high' | 'medium' | 'low';
  scoreResult: StockScoreResult;
  profitabilityScore: number;
  valuationScore: number;
  growthScore: number;
  financialHealthScore: number;
  dividendScore: number;
  technicalScore: number;
  momentumScore: number;
  analystScore: number;
  institutionalScore: number;
  marketSentimentScore: number;
  sectorRotationScore: number;
  macroScore: number;
}

function enrichStockWithScore(stock: StockQuote, country: string): StockWithScore {
  const scoreResult = calculateStockScore(stock, country);
  return {
    ...stock,
    aiScore: scoreResult.aiScore,
    confidence: scoreResult.confidence,
    scoreResult,
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
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country'); // US, JP, GB, DE, FR, IN
  const mode = searchParams.get('mode') || 'single'; // single, all, summaries

  // Check cache
  const cacheKey = `${country || 'all'}-${mode}`;
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL && cachedResponse.data.cacheKey === cacheKey) {
    return NextResponse.json(cachedResponse.data);
  }

  try {
    if (mode === 'summaries') {
      const summaries = await getAllMarketSummaries();
      const response = {
        summaries,
        meta: {
          totalCountries: summaries.length,
          lastUpdated: new Date().toISOString(),
          scoringDimensions: 12,
          dimensions: STOCK_DIMENSIONS.map(d => ({ key: d.key, name: d.name })),
        },
      };
      cachedResponse = { data: { ...response, cacheKey }, timestamp: Date.now(), cacheKey };
      return NextResponse.json(response);
    }

    if (mode === 'all') {
      const allStocksByCountry = await fetchAllCountriesStocks();
      // Flatten the Record<string, StockQuote[]> into a single array
      const allStocks: StockQuote[] = Object.values(allStocksByCountry).flat();
      // Enrich each stock with scores — group by country
      const enrichedStocks = allStocks.map(stock => enrichStockWithScore(stock, stock.country));
      const response = {
        stocks: enrichedStocks,
        meta: {
          totalCountries: 6,
          totalStocks: enrichedStocks.length,
          lastUpdated: new Date().toISOString(),
          scoringDimensions: 12,
          dimensions: STOCK_DIMENSIONS.map(d => ({ key: d.key, name: d.name })),
        },
      };
      cachedResponse = { data: { ...response, cacheKey }, timestamp: Date.now(), cacheKey };
      return NextResponse.json(response);
    }

    // Single country (default)
    const countryCode = country || 'US';
    const stocks = await fetchCountryStocks(countryCode as 'US' | 'JP' | 'GB' | 'DE' | 'FR' | 'IN');
    const enrichedStocks = stocks.map(stock => enrichStockWithScore(stock, countryCode));
    const response = {
      stocks: enrichedStocks,
      countries: [{ code: countryCode }],
      meta: {
        totalStocks: enrichedStocks.length,
        lastUpdated: new Date().toISOString(),
        scoringDimensions: 12,
        defaultCountry: countryCode,
        dimensions: STOCK_DIMENSIONS.map(d => ({ key: d.key, name: d.name })),
      },
    };
    cachedResponse = { data: { ...response, cacheKey }, timestamp: Date.now(), cacheKey };
    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Stocks Overview API] Error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch stock data', details: message },
      { status: 500 }
    );
  }
}
