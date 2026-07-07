/**
 * News Ingestion API — Triggers batch news ingestion for top coins
 *
 * POST /api/news/ingest
 *
 * Fetches and analyzes news for the top 10 major coins using
 * z-ai-web-dev-sdk web search + LLM sentiment analysis.
 * This is designed to be called periodically (cron-like) to keep
 * the news database fresh.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAndAnalyzeNews } from '@/lib/news-sentiment';
import { db } from '@/lib/db';

export const maxDuration = 60; // Allow up to 60 seconds for batch ingestion

// Top 10 major coins for batch ingestion
const TOP_COINS = [
  { id: 'bitcoin', name: 'Bitcoin' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'solana', name: 'Solana' },
  { id: 'binancecoin', name: 'BNB' },
  { id: 'ripple', name: 'XRP' },
  { id: 'cardano', name: 'Cardano' },
  { id: 'dogecoin', name: 'Dogecoin' },
  { id: 'avalanche-2', name: 'Avalanche' },
  { id: 'polkadot', name: 'Polkadot' },
  { id: 'tron', name: 'TRON' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const coinIds: string[] | undefined = body.coinIds;
    const forceRefresh: boolean = body.forceRefresh ?? false;

    // Determine which coins to ingest
    const coinsToIngest = coinIds && coinIds.length > 0
      ? TOP_COINS.filter(c => coinIds.includes(c.id))
      : TOP_COINS;

    if (coinsToIngest.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid coins specified' },
        { status: 400 }
      );
    }

    console.log(`[NewsIngest] Starting batch ingestion for ${coinsToIngest.length} coins`);

    const results: Array<{
      coinId: string;
      coinName: string;
      articlesFound: number;
      aggregateSentiment: number;
      success: boolean;
      error?: string;
    }> = [];

    // Also fetch general market news first
    try {
      console.log('[NewsIngest] Fetching general market news...');
      const marketResult = await fetchAndAnalyzeNews(undefined, undefined, forceRefresh);
      results.push({
        coinId: 'market',
        coinName: 'General Market',
        articlesFound: marketResult.articles.length,
        aggregateSentiment: marketResult.aggregateSentiment,
        success: true,
      });
    } catch (error) {
      console.error('[NewsIngest] Error fetching market news:', error);
      results.push({
        coinId: 'market',
        coinName: 'General Market',
        articlesFound: 0,
        aggregateSentiment: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Fetch news for each coin with a small delay between requests
    // to avoid rate limiting
    for (const coin of coinsToIngest) {
      try {
        console.log(`[NewsIngest] Fetching news for ${coin.name}...`);
        const result = await fetchAndAnalyzeNews(coin.id, coin.name, forceRefresh);
        results.push({
          coinId: coin.id,
          coinName: coin.name,
          articlesFound: result.articles.length,
          aggregateSentiment: result.aggregateSentiment,
          success: true,
        });

        // Delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`[NewsIngest] Error fetching news for ${coin.id}:`, error);
        results.push({
          coinId: coin.id,
          coinName: coin.name,
          articlesFound: 0,
          aggregateSentiment: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Summary
    const totalArticles = results.reduce((sum, r) => sum + r.articlesFound, 0);
    const successCount = results.filter(r => r.success).length;

    console.log(`[NewsIngest] Batch complete: ${successCount}/${results.length} succeeded, ${totalArticles} total articles`);

    // Get total article count in DB
    const totalDbArticles = await db.newsArticle.count();

    return NextResponse.json({
      success: true,
      results,
      summary: {
        coinsProcessed: results.length,
        successCount,
        totalArticlesFound: totalArticles,
        totalArticlesInDb: totalDbArticles,
        ingestedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[NewsIngest] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ingest news',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
