/**
 * News Sentiment API — Fetches and analyzes crypto news with algorithmic NLP
 *
 * GET /api/news/sentiment?coinId=bitcoin&forceRefresh=false
 *
 * Returns aggregated sentiment data and individual articles with NLP analysis.
 * NO LLM — all analysis is done algorithmically using lexicon-based NLP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAndAnalyzeNews } from '@/lib/news-sentiment';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId') ?? undefined;
    const coinName = searchParams.get('coinName') ?? undefined;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log(`[NewsSentiment] Fetching news for: ${coinId ?? 'general market'}`);

    const result = await fetchAndAnalyzeNews(coinId, coinName, forceRefresh);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[NewsSentiment] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch and analyze news',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
