/**
 * Market Overview API — V12 (Auto-refreshing market data + full scoring engine)
 *
 * GET /api/market/overview
 *
 * Pipeline:
 * 1. Check if market-data.json is stale (>5 min). If so, try CoinGecko refresh.
 * 2. Read coin data from /public/market-data.json (freshly updated or cached)
 * 3. Fetch external data (Fear & Greed, DeFiLlama, Yahoo Finance, etc.)
 * 4. Compute full 12-dimension scores using the scoring engine V2
 * 5. Return enriched data with real scores and external data context
 *
 * Memory-safe: serves all 200 coins from market-data.json, uses in-memory
 * caching (3-min TTL), external data layer has its own per-source caching.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

import { calculateCryptoScore, EMPTY_EXTERNAL_DATA } from '@/lib/scoring-engine-v2';
import type { CoinInput, ExternalDataContext, CryptoScore } from '@/lib/scoring-engine-v2';
import { fetchAllExternalData } from '@/lib/external-data';
import type { ExternalMarketData } from '@/lib/external-data';
import { fetchAndAnalyzeNews } from '@/lib/news-sentiment';
import { tryAutoRefresh, readMarketDataFile } from '@/lib/market-data-cache';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY RESPONSE CACHE
// ═══════════════════════════════════════════════════════════════

let cachedResponse: string | null = null;
let cachedTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// Serve all 200 coins — the user explicitly wants full coverage of 200
// high-transaction cryptocurrencies.
const MAX_COINS = 200;

// ═══════════════════════════════════════════════════════════════
// EXTERNAL DATA ADAPTER
// ═══════════════════════════════════════════════════════════════

/**
 * Convert ExternalMarketData (from external-data.ts) to ExternalDataContext
 * (expected by scoring engine V2). The structures are mostly identical;
 * we just pick the fields the scoring engine uses.
 */
function toExternalDataContext(ext: ExternalMarketData, newsSentiment?: ExternalDataContext['newsSentiment']): ExternalDataContext {
  return {
    fearAndGreed: ext.fearAndGreed,
    defiLlama: ext.defiLlama,
    macroIndicators: ext.macroIndicators,
    derivatives: ext.derivatives,
    perSymbolDerivatives: ext.perSymbolDerivatives ?? null,
    additionalMacro: ext.additionalMacro ?? null,
    coinglass: ext.coinglass ? { btcLiquidation24h: null, ethLiquidation24h: null } : null,
    historicalPrices: ext.historicalPrices ?? null,
    cryptoCompareSocial: ext.cryptoCompareSocial ? { btc: { reddit_active_users: null, reddit_posts_24h: null, twitter_followers: null, code_repo_stars: null, code_repo_contributors: null, code_repo_commits_30d: null } } : null,
    newsSentiment: newsSentiment ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// COIN DATA ADAPTER
// ═══════════════════════════════════════════════════════════════

/**
 * Extract CoinInput from a raw coin data object (CoinGecko format or
 * previously enriched format). Only picks the fields the scoring engine needs.
 */
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

// ═══════════════════════════════════════════════════════════════
// READ RAW MARKET DATA FILE (sync fallback for hot path)
// ═══════════════════════════════════════════════════════════════

interface RawMarketFile {
  coins: Record<string, unknown>[];
  globalData: Record<string, unknown> | null;
  meta?: {
    lastUpdated?: string;
    [key: string]: unknown;
  };
}

function readRawMarketData(): RawMarketFile | null {
  try {
    const filePath = join(process.cwd(), 'public', 'market-data.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent) as RawMarketFile;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// BUILD ENRICHED RESPONSE
// ═══════════════════════════════════════════════════════════════

function buildEnrichedCoin(coin: Record<string, unknown>, score: CryptoScore) {
  // Strip sub-dimensions/aspects/sub-aspects from the overview to reduce
  // response size from ~11MB to ~1MB. Full hierarchy is available via the
  // crypto detail API (/api/crypto/[id]).
  const lightDimensions = score.dimensions.map(dim => ({
    key: dim.key,
    name: dim.name,
    nameFa: dim.nameFa,
    color: dim.color,
    icon: dim.icon,
    coefficient: dim.coefficient,
    score: dim.score,
    previousScore: dim.previousScore,
    scoreChange: dim.scoreChange,
    scoreChangePct: dim.scoreChangePct,
  }));

  return {
    // Preserve raw CoinGecko fields for the frontend
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
    current_price: coin.current_price,
    market_cap: coin.market_cap,
    market_cap_rank: coin.market_cap_rank,
    total_volume: coin.total_volume,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency,
    price_change_percentage_1h_in_currency: coin.price_change_percentage_1h_in_currency,
    high_24h: coin.high_24h,
    low_24h: coin.low_24h,
    ath: coin.ath,
    ath_change_percentage: coin.ath_change_percentage,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply,
    max_supply: coin.max_supply,
    fully_diluted_valuation: coin.fully_diluted_valuation,

    // Scoring engine output (light version - dimension scores only)
    aiScore: score.aiScore,
    previousAiScore: score.previousAiScore,
    aiScoreChange: score.aiScoreChange,
    aiScoreChangePct: score.aiScoreChangePct,
    confidence: score.confidence,
    dimensions: lightDimensions,
  };
}

// ═══════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const now = Date.now();

    // ── Serve from memory cache if fresh ──
    if (cachedResponse && (now - cachedTime) < CACHE_TTL) {
      return new Response(cachedResponse, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=180',
        },
      });
    }

    // ── Step 0: Auto-refresh market-data.json if stale (>5 min) ──
    try {
      const refreshResult = await tryAutoRefresh(5 * 60 * 1000);
      if (refreshResult) {
        if (refreshResult.success) {
          console.log('[MarketOverview] Auto-refreshed market-data.json from CoinGecko');
        } else {
          console.warn(`[MarketOverview] Auto-refresh failed (${refreshResult.error}), using existing file`);
        }
      }
    } catch (err) {
      console.warn('[MarketOverview] Auto-refresh error, continuing with existing file:', err);
    }

    // ── Step 1: Read coin data from file (may have just been updated) ──
    const rawData = readRawMarketData();
    if (!rawData || !rawData.coins || rawData.coins.length === 0) {
      // Return stale cache if available
      if (cachedResponse) {
        return new Response(cachedResponse, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return NextResponse.json(
        { error: 'Market data is being loaded. Please refresh in a moment.' },
        { status: 503 }
      );
    }

    // Limit coins to prevent memory issues
    const rawCoins = rawData.coins.slice(0, MAX_COINS);
    console.log(`[MarketOverview] Processing ${rawCoins.length} coins from market-data.json`);

    // ── Step 2: Fetch external data + news sentiment ──
    let externalCtx: ExternalDataContext = EMPTY_EXTERNAL_DATA;
    try {
      const [externalData, newsResult] = await Promise.allSettled([
        fetchAllExternalData(),
        fetchAndAnalyzeNews().catch(() => null),
      ]);

      const ext = externalData.status === 'fulfilled' ? externalData.value : null;
      const news = newsResult.status === 'fulfilled' ? newsResult.value : null;

      if (ext) {
        // Build news sentiment context for scoring engine
        const newsSentiment = news ? {
          aggregateSentiment: news.aggregateSentiment,
          averageImpactScore: news.averageImpactScore,
          articleCount: news.articles.length,
          coinSpecificSentiment: Object.fromEntries(
            Object.entries(news.coinSpecificSentiment).map(([k, v]) => [k, {
              sentiment: v.score,
              impact: news.averageImpactScore,
              count: v.count,
            }])
          ),
        } : null;
        externalCtx = toExternalDataContext(ext, newsSentiment);
      }

      const sources = [
        externalCtx.fearAndGreed ? 'F&G' : '',
        externalCtx.defiLlama ? 'DeFi' : '',
        externalCtx.macroIndicators ? 'Macro' : '',
        externalCtx.derivatives ? 'Deriv' : '',
        externalCtx.perSymbolDerivatives ? 'PerSym' : '',
        externalCtx.additionalMacro ? 'AddMacro' : '',
        externalCtx.newsSentiment ? 'News' : '',
        externalCtx.historicalPrices ? 'HistPrice' : '',
      ].filter(Boolean).join(', ');
      console.log(`[MarketOverview] External data sources active: ${sources || 'none'}`);
    } catch (err) {
      console.warn('[MarketOverview] External data fetch failed, using empty context:', err);
    }

    // ── Step 3: Compute full 12-dimension scores ──
    const enrichedCoins = [];
    for (const rawCoin of rawCoins) {
      try {
        const coinInput = toCoinInput(rawCoin);
        const score = calculateCryptoScore(coinInput, externalCtx);
        const enriched = buildEnrichedCoin(rawCoin, score);
        enrichedCoins.push(enriched);
      } catch (err) {
        console.warn(`[MarketOverview] Scoring failed for ${rawCoin.id}:`, err);
        // Skip coins that fail scoring rather than crashing the whole request
      }
    }

    console.log(`[MarketOverview] Scored ${enrichedCoins.length}/${rawCoins.length} coins`);

    // ── Step 4: Compute globalData if missing ──
    let globalData = rawData.globalData;
    if (!globalData || !globalData.total_market_cap) {
      // Compute from coins if the file doesn't have global data
      const totalMarketCap = enrichedCoins.reduce((sum, c) => sum + ((c.market_cap as number) || 0), 0);
      const totalVolume = enrichedCoins.reduce((sum, c) => sum + ((c.total_volume as number) || 0), 0);
      const avgChange24h = enrichedCoins.length > 0
        ? enrichedCoins.reduce((sum, c) => sum + ((c.price_change_percentage_24h as number) || 0), 0) / enrichedCoins.length
        : 0;
      globalData = {
        active_cryptocurrencies: enrichedCoins.length,
        total_market_cap: { usd: totalMarketCap },
        total_volume: { usd: totalVolume },
        market_cap_change_percentage_24h_usd: avgChange24h,
      };
    }

    // ── Step 5: Build final response ──
    const result = {
      coins: enrichedCoins,
      globalData,
      meta: {
        fromCache: false,
        isStale: false,
        totalCoins: enrichedCoins.length,
        lastUpdated: new Date().toISOString(),
        coefficientVersion: 1,
        hierarchyStats: {
          dimensions: 12,
          subDimensions: 37,
          aspects: 74,
          subAspects: 161,
          totalCoefficients: 284,
        },
        externalDataSources: {
          fearAndGreed: externalCtx.fearAndGreed !== null,
          defiLlama: externalCtx.defiLlama !== null,
          macroIndicators: externalCtx.macroIndicators !== null,
          derivatives: externalCtx.derivatives !== null,
          perSymbolDerivatives: externalCtx.perSymbolDerivatives !== null,
          additionalMacro: externalCtx.additionalMacro !== null,
          newsSentiment: externalCtx.newsSentiment !== null,
          historicalPrices: externalCtx.historicalPrices !== null,
        },
      },
    };

    const responseBody = JSON.stringify(result);

    // ── Cache in memory ──
    cachedResponse = responseBody;
    cachedTime = now;

    return new Response(responseBody, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=180',
      },
    });
  } catch (error) {
    console.error('[MarketOverview] Unexpected error:', error);

    // Return stale cache if available
    if (cachedResponse) {
      return new Response(cachedResponse, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(
      { error: 'Failed to compute market data. Please try again.' },
      { status: 500 }
    );
  }
}
