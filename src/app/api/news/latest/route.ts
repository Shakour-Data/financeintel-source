/**
 * Latest News API — Returns cached news articles
 *
 * GET /api/news/latest?coinId=bitcoin&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestNews } from '@/lib/news-sentiment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') ?? '20');

    let articles: Awaited<ReturnType<typeof getLatestNews>> = [];
    try {
      articles = await getLatestNews(coinId, Math.min(limit, 50));
    } catch (dbError) {
      console.warn('[NewsLatest] Database query failed, returning empty:', dbError);
      articles = [];
    }

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
    });
  } catch (error) {
    console.error('[NewsLatest] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch latest news',
        articles: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
