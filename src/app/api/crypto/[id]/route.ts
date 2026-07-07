/**
 * Crypto Detail API — V3 (Full hierarchy scoring)
 *
 * GET /api/crypto/[id]
 *
 * Returns full coin detail with complete 4-level scoring hierarchy
 * (dimensions → subDimensions → aspects → subAspects).
 * This is the ONLY API that returns the full hierarchy; the overview
 * API returns light dimension scores only.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  calculateCryptoScore,
  EMPTY_EXTERNAL_DATA,
  type CoinInput,
  type CryptoScore,
} from '@/lib/scoring-engine-v2';

// Cache for individual coin details (5 min TTL)
const detailCache = new Map<string, { data: CryptoScore; time: number }>();
const DETAIL_CACHE_TTL = 5 * 60 * 1000;

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

function toCoinInput(coin: Record<string, unknown>): CoinInput {
  return {
    id: coin.id as string,
    symbol: coin.symbol as string,
    name: coin.name as string,
    current_price: coin.current_price as number,
    market_cap: coin.market_cap as number,
    market_cap_rank: coin.market_cap_rank as number,
    fully_diluted_valuation: (coin.fully_diluted_valuation as number) ?? null,
    total_volume: coin.total_volume as number,
    high_24h: coin.high_24h as number,
    low_24h: coin.low_24h as number,
    price_change_24h: (coin.price_change_24h as number) ?? 0,
    price_change_percentage_24h: (coin.price_change_percentage_24h as number) ?? 0,
    market_cap_change_24h: (coin.market_cap_change_24h as number) ?? 0,
    market_cap_change_percentage_24h: (coin.market_cap_change_percentage_24h as number) ?? 0,
    circulating_supply: (coin.circulating_supply as number) ?? 0,
    total_supply: (coin.total_supply as number) ?? null,
    max_supply: (coin.max_supply as number) ?? null,
    ath: (coin.ath as number) ?? 0,
    ath_change_percentage: (coin.ath_change_percentage as number) ?? 0,
    price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency as number | undefined,
    price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency as number | undefined,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check cache first
    const cached = detailCache.get(id);
    if (cached && (Date.now() - cached.time) < DETAIL_CACHE_TTL) {
      return NextResponse.json({
        score: cached.data,
        meta: { fromCache: true, isStale: false, lastUpdated: new Date(cached.time).toISOString() },
      });
    }

    // Find coin in market-data.json
    const allCoins = readMarketDataFile();
    const rawCoin = allCoins.find((c: any) => c.id === id);

    if (!rawCoin) {
      return NextResponse.json(
        { error: `Coin "${id}" not found in market data` },
        { status: 404 }
      );
    }

    // Compute full 12-dimension score with COMPLETE hierarchy
    const coinInput = toCoinInput(rawCoin);
    const score = calculateCryptoScore(coinInput, EMPTY_EXTERNAL_DATA);

    // Cache the result
    detailCache.set(id, { data: score, time: Date.now() });

    return NextResponse.json({
      score,
      meta: {
        fromCache: false,
        isStale: false,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[CryptoDetail] Error:', error);
    try {
      const { id } = await params;
      return NextResponse.json(
        { error: `Failed to fetch data for "${id}". Please try again.` },
        { status: 503 }
      );
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch coin detail.' },
        { status: 503 }
      );
    }
  }
}
