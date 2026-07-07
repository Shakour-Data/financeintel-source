/**
 * Behavioral Finance Analysis API
 *
 * GET /api/behavioral-finance
 * 
 * Computes real-time behavioral finance analysis using market data.
 * Detects 16 cognitive biases based on 16 authoritative reference books.
 * Uses cached market data from market-data.json to avoid extra API calls.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeBehavioralFinance, BEHAVIORAL_FINANCE_BOOKS } from '@/lib/behavioral-finance';

export const maxDuration = 15;

// Cache the response for 3 minutes
let cachedResponse: string | null = null;
let cachedTime = 0;
const CACHE_TTL = 3 * 60 * 1000;

function readMarketDataFile(): any[] {
  try {
    const filePath = join(process.cwd(), 'public', 'market-data.json');
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed.coins || [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedResponse && (now - cachedTime) < CACHE_TTL) {
      return new Response(cachedResponse, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=180' },
      });
    }

    // Read from cached market data file instead of re-fetching from CoinGecko
    const marketCoins = readMarketDataFile();

    if (!marketCoins || marketCoins.length === 0) {
      return NextResponse.json(
        { success: true, data: { coinScores: {}, signals: [], computedAt: new Date().toISOString() }, books: [], meta: { coinsAnalyzed: 0, biasesDetected: 0, computedAt: new Date().toISOString() } },
        { status: 200 }
      );
    }

    // Compute behavioral finance analysis
    const result = computeBehavioralFinance(marketCoins);

    // Add reference books metadata
    const books = BEHAVIORAL_FINANCE_BOOKS.map(book => ({
      id: book.id,
      title: book.title,
      titleFa: book.titleFa,
      author: book.author,
      authorFa: book.authorFa,
      nobelPrize: 'nobelPrize' in book && book.nobelPrize,
      keyConcepts: book.keyConcepts,
      detectedBiases: book.detectedBiases,
    }));

    const responseBody = JSON.stringify({
      success: true,
      data: result,
      books,
      meta: {
        coinsAnalyzed: marketCoins.length,
        biasesDetected: result.signals.length,
        computedAt: result.computedAt,
      },
    });

    cachedResponse = responseBody;
    cachedTime = now;

    return new Response(responseBody, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=180' },
    });
  } catch (error) {
    console.error('[BehavioralFinance API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute behavioral finance analysis' },
      { status: 500 }
    );
  }
}
