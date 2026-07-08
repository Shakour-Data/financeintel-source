/**
 * Historical Data Backfill API — Generates synthetic historical data for coins.
 *
 * POST /api/data/backfill
 * Body: { coinId: string, days: number }
 *
 * Since CoinGecko free API doesn't provide 3 years of daily history,
 * we generate synthetic data using geometric Brownian motion (GBM)
 * that simulates realistic price movements working backwards from
 * the current live price.
 *
 * Features:
 * - Different volatility profiles per coin type (L1, L2, DeFi, stablecoin)
 * - Realistic market cap, volume, supply derived from price
 * - Price change percentages for 1h, 24h, 7d, 14d, 30d, 60d, 200d, 1y windows
 * - Sine wave overlay to simulate market cycles (bull/bear)
 * - Mean reversion to prevent unrealistic long-term drift
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upsertCoin } from '@/lib/coin-upsert';

export const maxDuration = 60;

// ═══════════════════════════════════════════════════════════════
// VOLATILITY PROFILES BY COIN TYPE
// ═══════════════════════════════════════════════════════════════

interface VolatilityProfile {
  dailyVol: number;    // Annualized daily volatility (std dev of log returns)
  dailyDrift: number;  // Annualized drift (expected return)
  volToMcap: number;   // Typical volume/market_cap ratio
  meanReversion: number; // Strength of mean reversion (0-1)
}

const VOLATILITY_PROFILES: Record<string, VolatilityProfile> = {
  stablecoin: { dailyVol: 0.005, dailyDrift: 0.0, volToMcap: 0.1, meanReversion: 0.95 },
  l1: { dailyVol: 0.65, dailyDrift: 0.15, volToMcap: 0.04, meanReversion: 0.02 },
  l2: { dailyVol: 0.80, dailyDrift: 0.20, volToMcap: 0.05, meanReversion: 0.015 },
  defi: { dailyVol: 0.90, dailyDrift: 0.10, volToMcap: 0.06, meanReversion: 0.01 },
  default: { dailyVol: 0.75, dailyDrift: 0.12, volToMcap: 0.05, meanReversion: 0.015 },
};

function getVolatilityProfile(coin: {
  isL1: boolean;
  isL2: boolean;
  isDefi: boolean;
  isStablecoin: boolean;
}): VolatilityProfile {
  if (coin.isStablecoin) return VOLATILITY_PROFILES.stablecoin;
  if (coin.isL1) return VOLATILITY_PROFILES.l1;
  if (coin.isL2) return VOLATILITY_PROFILES.l2;
  if (coin.isDefi) return VOLATILITY_PROFILES.defi;
  return VOLATILITY_PROFILES.default;
}

// ═══════════════════════════════════════════════════════════════
// BOX-MULLER NORMAL DISTRIBUTION
// ═══════════════════════════════════════════════════════════════

function randomNormal(): number {
  // Box-Muller transform for standard normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ═══════════════════════════════════════════════════════════════
// SEeded RANDOM FOR REPRODUCIBILITY (per coin)
// Simple mulberry32 PRNG
// ═══════════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRandomNormal(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// ═══════════════════════════════════════════════════════════════
// GENERATE SYNTHETIC PRICE SERIES
// Uses geometric Brownian motion with:
// - Drift term (expected return)
// - Volatility term (random shocks)
// - Mean reversion (prevents unrealistic long-term drift)
// - Market cycle overlay (sine wave for bull/bear cycles)
// Works backwards from current price
// ═══════════════════════════════════════════════════════════════

function generateSyntheticPrices(
  endPrice: number,
  days: number,
  profile: VolatilityProfile,
  coinSymbol: string
): number[] {
  // Seed based on coin symbol for reproducibility
  let hash = 0;
  for (let i = 0; i < coinSymbol.length; i++) {
    hash = ((hash << 5) - hash + coinSymbol.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(Math.abs(hash));

  const prices = new Array<number>(days + 1);
  prices[days] = endPrice; // Today's price is the end point

  // Convert annualized params to daily
  const dailyVol = profile.dailyVol / Math.sqrt(365);
  const dailyDrift = profile.dailyDrift / 365;

  // Market cycle: ~4 year crypto cycle
  const cyclePeriod = 4 * 365; // 4 years in days
  const cycleAmplitude = 0.0003; // Subtle daily bias from cycle

  // Work backwards from end price
  let currentPrice = endPrice;

  for (let i = days - 1; i >= 0; i--) {
    // How far from "today" (in days) — used for cycle phase
    const daysFromEnd = days - i;

    // Market cycle component (4-year cycle)
    const cyclePhase = (2 * Math.PI * i) / cyclePeriod;
    const cycleDrift = cycleAmplitude * Math.sin(cyclePhase);

    // Reverse GBM: from day i+1 to day i (going backwards)
    // In forward GBM: P(t+1) = P(t) * exp(drift + vol * N(0,1))
    // So backwards: P(t) = P(t+1) * exp(-(drift + vol * N(0,1)))
    // But we add mean reversion to keep prices realistic

    const randomShock = seededRandomNormal(rng);

    // Mean reversion: gently pull towards a "fair value" that ensures
    // the price path connects reasonably to the start
    const logReturn = -(dailyDrift + cycleDrift + dailyVol * randomShock);

    // Add mean reversion towards a reasonable starting price
    // The further we go back, the more we expect the price to differ
    const expectedGrowth = Math.exp(dailyDrift * daysFromEnd);
    const fairPrice = endPrice / expectedGrowth;
    const meanReversionForce = profile.meanReversion * (Math.log(fairPrice) - Math.log(currentPrice));

    const adjustedLogReturn = logReturn + meanReversionForce;

    currentPrice = currentPrice * Math.exp(adjustedLogReturn);

    // Floor at a very small positive value
    currentPrice = Math.max(currentPrice, endPrice * 0.0001);

    prices[i] = currentPrice;
  }

  return prices;
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE PRICE CHANGE PERCENTAGES FOR VARIOUS WINDOWS
// ═══════════════════════════════════════════════════════════════

function computePriceChangePct(prices: number[], index: number, windowDays: number): number | null {
  const lookbackIndex = index - windowDays;
  if (lookbackIndex < 0) return null;
  const pastPrice = prices[lookbackIndex];
  if (pastPrice <= 0) return null;
  return ((prices[index] - pastPrice) / pastPrice) * 100;
}

// ═══════════════════════════════════════════════════════════════
// MAIN BACKFILL HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const coinId = body.coinId as string | undefined;
    const days = (body.days as number) || 1095; // Default 3 years

    if (!coinId) {
      return NextResponse.json(
        { error: 'coinId is required. Provide the CoinGecko ID (e.g. "bitcoin")' },
        { status: 400 }
      );
    }

    if (days < 1 || days > 3650) {
      return NextResponse.json(
        { error: 'days must be between 1 and 3650' },
        { status: 400 }
      );
    }

    console.log(`[Backfill] Starting backfill for ${coinId}, ${days} days...`);

    // 1. Find the coin in DB, or try to upsert it
    let coin = await db.coin.findUnique({
      where: { coingeckoId: coinId },
    });

    if (!coin) {
      // Try to create from basic info
      // We need at least symbol and name — try to find in recent market data
      console.log(`[Backfill] Coin ${coinId} not found in DB, attempting to create...`);

      // Use the upsertCoin function with basic info
      const dbCoinId = await upsertCoin(coinId, coinId, coinId);
      coin = await db.coin.findUnique({ where: { id: dbCoinId } });

      if (!coin) {
        return NextResponse.json(
          { error: `Failed to create coin record for ${coinId}` },
          { status: 500 }
        );
      }
    }

    // 2. Get current live data for this coin (end point for backfill)
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = await db.rawMarketDaily.findUnique({
      where: { coinId_date: { coinId: coin.id, date: today } },
    });

    // Determine end price — use live data if available, or a reasonable default
    let endPrice: number;
    let endMarketCap: number;
    let endCirculatingSupply: number;
    let endTotalSupply: number | null;
    let endMaxSupply: number | null;

    if (todayRecord) {
      endPrice = todayRecord.price;
      endMarketCap = todayRecord.marketCap ?? 0;
      endCirculatingSupply = todayRecord.circulatingSupply ?? endMarketCap / endPrice;
      endTotalSupply = todayRecord.totalSupply;
      endMaxSupply = todayRecord.maxSupply;
    } else {
      // Fallback: try to fetch from CoinGecko API
      console.log(`[Backfill] No live data for ${coinId}, using fallback values...`);
      endPrice = 100; // Will be overridden for known coins
      endMarketCap = 1_000_000_000;
      endCirculatingSupply = endMarketCap / endPrice;
      endTotalSupply = null;
      endMaxSupply = null;

      // Try to get approximate values for known coins
      const knownPrices: Record<string, number> = {
        bitcoin: 67250, ethereum: 3450, solana: 172, cardano: 0.48,
        binancecoin: 605, ripple: 0.62, dogecoin: 0.165, polkadot: 7.25,
        avalanche: 38.5, chainlink: 14.8, polygon: 0.72, near: 7.12,
        sui: 1.45, aptos: 9.45, arbitrum: 1.18, optimism: 2.35,
        tether: 1.0, 'usd-coin': 1.0, aave: 95, maker: 2850,
        uniswap: 7.85, cosmos: 9.12, stellar: 0.115, monero: 165,
        litecoin: 84.5, tron: 0.125,
      };

      if (knownPrices[coinId]) {
        endPrice = knownPrices[coinId];
        endMarketCap = endPrice * 1_000_000; // Rough estimate
        endCirculatingSupply = endMarketCap / endPrice;
      }
    }

    if (endPrice <= 0) {
      return NextResponse.json(
        { error: `Invalid end price (${endPrice}) for ${coinId}` },
        { status: 400 }
      );
    }

    // 3. Get volatility profile for this coin
    const profile = getVolatilityProfile(coin);

    // 4. Generate synthetic prices
    const prices = generateSyntheticPrices(endPrice, days, profile, coin.symbol);

    // 5. Generate daily records and store in DB
    let daysGenerated = 0;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];

    // Batch process — create records for each day
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const price = prices[i];
      if (price <= 0) continue;

      // Skip if record already exists (don't overwrite real data)
      const existing = await db.rawMarketDaily.findUnique({
        where: { coinId_date: { coinId: coin.id, date: dateStr } },
      });

      if (existing) {
        continue; // Preserve real data
      }

      // Derive market data from price with realistic ratios
      const priceChangePct24h = computePriceChangePct(prices, i, 1);
      const priceChangePct7d = computePriceChangePct(prices, i, 7);
      const priceChangePct14d = computePriceChangePct(prices, i, 14);
      const priceChangePct30d = computePriceChangePct(prices, i, 30);
      const priceChangePct60d = computePriceChangePct(prices, i, 60);
      const priceChangePct200d = computePriceChangePct(prices, i, 200);
      const priceChangePct1y = computePriceChangePct(prices, i, 365);

      // Volume/market cap ratio with some randomness
      const volMcapBase = profile.volToMcap;
      const volMcapNoise = 1 + (Math.random() - 0.5) * 0.6; // ±30% noise
      const volMcapRatio = volMcapBase * volMcapNoise;

      // Market cap scales with price relative to end price
      const mcapRatio = price / endPrice;
      const marketCap = Math.max(endMarketCap * mcapRatio, 1000);
      const totalVolume = marketCap * volMcapRatio;

      // Supply remains relatively stable
      const supplyRatio = endPrice / Math.max(price, 0.0001);
      const circulatingSupply = Math.max(
        endCirculatingSupply * Math.min(supplyRatio, 10),
        1
      );

      // High/Low based on 24h volatility
      const dailyRange = Math.abs(priceChangePct24h ?? 2) / 100;
      const high24h = price * (1 + dailyRange * 0.5 + Math.random() * dailyRange * 0.3);
      const low24h = price * (1 - dailyRange * 0.5 - Math.random() * dailyRange * 0.3);

      // ATH: track the maximum price so far
      const maxPriceSoFar = Math.max(...prices.slice(0, i + 1));
      const ath = maxPriceSoFar;
      const athChangePct = ((price - ath) / ath) * 100;

      // ATL: track the minimum price so far
      const minPriceSoFar = Math.min(...prices.slice(0, i + 1));
      const atl = minPriceSoFar;
      const atlChangePct = ((price - atl) / atl) * 100;

      // 1h change: simulate as a fraction of 24h change
      const priceChangePct1h = (priceChangePct24h ?? 0) * (0.04 + Math.random() * 0.08);

      // Market cap change tracks price change
      const marketCapChangePct24h = priceChangePct24h;

      // FDV
      const fdv = endMaxSupply
        ? endMaxSupply * price
        : endTotalSupply
          ? endTotalSupply * price
          : null;

      // ATH/ATL dates
      const athDateIndex = prices.slice(0, i + 1).indexOf(ath);
      const athDate = new Date(startDate);
      athDate.setDate(athDate.getDate() + athDateIndex);
      const athDateStr = athDate.toISOString().split('T')[0];

      const atlDateIndex = prices.slice(0, i + 1).indexOf(atl);
      const atlDate = new Date(startDate);
      atlDate.setDate(atlDate.getDate() + atlDateIndex);
      const atlDateStr = atlDate.toISOString().split('T')[0];

      await db.rawMarketDaily.create({
        data: {
          coinId: coin.id,
          date: dateStr,
          price,
          high24h,
          low24h,
          priceChange24h: priceChangePct24h ? price * (priceChangePct24h / 100) : null,
          priceChangePct1h,
          priceChangePct24h: priceChangePct24h ?? null,
          priceChangePct7d,
          priceChangePct14d,
          priceChangePct30d,
          priceChangePct60d,
          priceChangePct200d,
          priceChangePct1y,
          marketCap,
          marketCapRank: null, // Would need cross-coin comparison
          marketCapChangePct24h,
          fullyDilutedValuation: fdv,
          totalVolume,
          circulatingSupply,
          totalSupply: endTotalSupply,
          maxSupply: endMaxSupply,
          ath,
          athChangePct,
          athDate: athDateStr,
          atl,
          atlChangePct,
          atlDate: atlDateStr,
          sparklineData: null, // Don't generate sparkline for historical data
          rawData: null, // Synthetic data, not raw API response
        },
      });

      daysGenerated++;
    }

    console.log(
      `[Backfill] Completed: ${daysGenerated} days generated for ${coinId} (${startDateStr} to ${endDateStr})`
    );

    return NextResponse.json({
      success: true,
      coinId,
      daysGenerated,
      startDate: startDateStr,
      endDate: endDateStr,
      startPrice: prices[0],
      endPrice: prices[prices.length - 1],
      totalReturn: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
    });
  } catch (error) {
    console.error('[Backfill] Error during backfill:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
