/**
 * Comprehensive Historical Data Backfill Engine
 *
 * Generates 3 years of historical data for ALL database tables to support ML training.
 * Works in stages:
 *
 * Stage 1: RawMarketDaily — Synthetic price data via GBM for all 50 coins
 * Stage 2: RawGlobalDaily — Synthetic global market data
 * Stage 3: CoinDailyScore + CoefficientHistory — Compute daily scores + ML coefficients
 * Stage 4: MarketIndicatorDaily + MarketDailyScore — Aggregate market indicators
 * Stage 5: ScoreHistory — Full hierarchy score history (optional, slow)
 *
 * Performance optimizations:
 * - Skip existing data (idempotent / resumable)
 * - Process in chronological order for proper delta computation
 * - In-memory coefficient cache
 * - Score computation WITHOUT full ScoreHistory for speed
 */

import { db } from '@/lib/db';
import {
  computeAndStoreScores,
  getDimensionDefinitions,
  calculateCryptoScore,
  type CoinInput,
  type CryptoScore,
} from '@/lib/scoring-engine-v2';
import { computeMarketIndicators } from '@/lib/market-indicators';
import { seedHierarchy } from '@/lib/hierarchy-seeder';

// ═══════════════════════════════════════════════════════════════
// DEFAULT COEFFICIENTS (local copy for backfill independence)
// ═══════════════════════════════════════════════════════════════

function initDefaultCoefficients(): Record<string, number> {
  const dimensions = getDimensionDefinitions();
  const coefficients: Record<string, number> = {};
  for (const dim of dimensions) {
    coefficients[dim.key] = 1 / dimensions.length;
  }
  return coefficients;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BackfillProgress {
  stage: string;
  stageIndex: number;
  totalStages: number;
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback = (progress: BackfillProgress) => void;

export interface BackfillResult {
  success: boolean;
  stages: {
    rawMarketDaily: { created: number; skipped: number };
    rawGlobalDaily: { created: number; skipped: number };
    coinDailyScore: { created: number; skipped: number };
    coefficientHistory: { created: number; skipped: number };
    scoreHistory: { created: number; skipped: number };
    marketIndicatorDaily: { created: number; skipped: number };
    marketDailyScore: { created: number; skipped: number };
  };
  durationMs: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// VOLATILITY PROFILES
// ═══════════════════════════════════════════════════════════════

interface VolatilityProfile {
  dailyVol: number;
  dailyDrift: number;
  volToMcap: number;
  meanReversion: number;
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
// SEEDED RANDOM + GBM (same as before)
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

function generateSyntheticPrices(endPrice: number, days: number, profile: VolatilityProfile, coinSymbol: string): number[] {
  let hash = 0;
  for (let i = 0; i < coinSymbol.length; i++) hash = ((hash << 5) - hash + coinSymbol.charCodeAt(i)) | 0;
  const rng = mulberry32(Math.abs(hash));
  const prices = new Array<number>(days + 1);
  prices[days] = endPrice;
  const dailyVol = profile.dailyVol / Math.sqrt(365);
  const dailyDrift = profile.dailyDrift / 365;
  const cyclePeriod = 4 * 365;
  const cycleAmplitude = 0.0003;
  let currentPrice = endPrice;
  for (let i = days - 1; i >= 0; i--) {
    const cyclePhase = (2 * Math.PI * i) / cyclePeriod;
    const cycleDrift = cycleAmplitude * Math.sin(cyclePhase);
    const randomShock = seededRandomNormal(rng);
    const logReturn = -(dailyDrift + cycleDrift + dailyVol * randomShock);
    const daysFromEnd = days - i;
    const expectedGrowth = Math.exp(dailyDrift * daysFromEnd);
    const fairPrice = endPrice / expectedGrowth;
    const meanReversionForce = profile.meanReversion * (Math.log(fairPrice) - Math.log(currentPrice));
    currentPrice = currentPrice * Math.exp(logReturn + meanReversionForce);
    currentPrice = Math.max(currentPrice, endPrice * 0.0001);
    prices[i] = currentPrice;
  }
  return prices;
}

function computePriceChangePct(prices: number[], index: number, windowDays: number): number | null {
  const lookbackIndex = index - windowDays;
  if (lookbackIndex < 0) return null;
  const pastPrice = prices[lookbackIndex];
  if (pastPrice <= 0) return null;
  return ((prices[index] - pastPrice) / pastPrice) * 100;
}

// ═══════════════════════════════════════════════════════════════
// KNOWN COIN DATA
// ═══════════════════════════════════════════════════════════════

const KNOWN_COIN_DATA: Record<string, {
  price: number;
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
}> = {
  bitcoin: { price: 95000, marketCap: 1_880_000_000_000, circulatingSupply: 19_800_000, totalSupply: 21_000_000, maxSupply: 21_000_000 },
  ethereum: { price: 3600, marketCap: 433_000_000_000, circulatingSupply: 120_200_000, totalSupply: 120_200_000, maxSupply: null },
  solana: { price: 195, marketCap: 92_000_000_000, circulatingSupply: 470_000_000, totalSupply: 580_000_000, maxSupply: null },
  binancecoin: { price: 690, marketCap: 100_000_000_000, circulatingSupply: 145_000_000, totalSupply: 145_000_000, maxSupply: 200_000_000 },
  ripple: { price: 2.4, marketCap: 137_000_000_000, circulatingSupply: 57_000_000_000, totalSupply: 100_000_000_000, maxSupply: 100_000_000_000 },
  cardano: { price: 0.75, marketCap: 26_500_000_000, circulatingSupply: 35_300_000_000, totalSupply: 45_000_000_000, maxSupply: 45_000_000_000 },
  dogecoin: { price: 0.22, marketCap: 32_000_000_000, circulatingSupply: 144_000_000_000, totalSupply: null, maxSupply: null },
  tron: { price: 0.24, marketCap: 20_800_000_000, circulatingSupply: 86_000_000_000, totalSupply: null, maxSupply: null },
  tether: { price: 1.0, marketCap: 140_000_000_000, circulatingSupply: 140_000_000_000, totalSupply: null, maxSupply: null },
  'usd-coin': { price: 1.0, marketCap: 55_000_000_000, circulatingSupply: 55_000_000_000, totalSupply: null, maxSupply: null },
  avalanche: { price: 38, marketCap: 15_500_000_000, circulatingSupply: 407_000_000, totalSupply: 720_000_000, maxSupply: 720_000_000 },
  chainlink: { price: 18, marketCap: 11_500_000_000, circulatingSupply: 626_000_000, totalSupply: 1_000_000_000, maxSupply: 1_000_000_000 },
  polkadot: { price: 7.5, marketCap: 10_500_000_000, circulatingSupply: 1_400_000_000, totalSupply: 1_400_000_000, maxSupply: null },
  polygon: { price: 0.52, marketCap: 5_000_000_000, circulatingSupply: 9_600_000_000, totalSupply: 10_000_000_000, maxSupply: 10_000_000_000 },
  near: { price: 5.8, marketCap: 6_800_000_000, circulatingSupply: 1_170_000_000, totalSupply: null, maxSupply: null },
  litecoin: { price: 100, marketCap: 7_500_000_000, circulatingSupply: 75_000_000, totalSupply: 84_000_000, maxSupply: 84_000_000 },
  uniswap: { price: 13, marketCap: 7_800_000_000, circulatingSupply: 600_000_000, totalSupply: 1_000_000_000, maxSupply: 1_000_000_000 },
  aave: { price: 280, marketCap: 4_200_000_000, circulatingSupply: 15_000_000, totalSupply: 16_000_000, maxSupply: 16_000_000 },
  maker: { price: 1800, marketCap: 1_700_000_000, circulatingSupply: 940_000, totalSupply: 1_000_000, maxSupply: 1_005_000 },
  cosmos: { price: 9.5, marketCap: 3_700_000_000, circulatingSupply: 390_000_000, totalSupply: null, maxSupply: null },
  stellar: { price: 0.42, marketCap: 12_500_000_000, circulatingSupply: 29_700_000_000, totalSupply: 50_000_000_000, maxSupply: 50_000_000_000 },
  monero: { price: 330, marketCap: 6_100_000_000, circulatingSupply: 18_400_000, totalSupply: null, maxSupply: null },
  sui: { price: 3.5, marketCap: 11_000_000_000, circulatingSupply: 3_100_000_000, totalSupply: 10_000_000_000, maxSupply: 10_000_000_000 },
  aptos: { price: 9.2, marketCap: 4_700_000_000, circulatingSupply: 510_000_000, totalSupply: null, maxSupply: null },
  arbitrum: { price: 0.85, marketCap: 3_800_000_000, circulatingSupply: 4_500_000_000, totalSupply: 10_000_000_000, maxSupply: null },
  optimism: { price: 1.8, marketCap: 2_500_000_000, circulatingSupply: 1_390_000_000, totalSupply: null, maxSupply: null },
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Date formatting
// ═══════════════════════════════════════════════════════════════

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getYesterday(dateStr: string): string {
  return addDays(dateStr, -1);
}

// ═══════════════════════════════════════════════════════════════
// MAIN BACKFILL: Run a specific stage
// ═══════════════════════════════════════════════════════════════

/**
 * Run backfill for a specific date range and stage.
 * This allows chunked processing to avoid timeouts.
 *
 * @param stage - Which stage to run: "raw", "global", "scores", "market-indicators", "score-history"
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param onProgress - Progress callback
 */
export async function runBackfillStage(
  stage: 'raw' | 'global' | 'scores' | 'fast-scores' | 'market-indicators' | 'score-history',
  startDate: string,
  endDate: string,
  onProgress?: ProgressCallback
): Promise<BackfillResult> {
  const startTime = Date.now();
  const result: BackfillResult = {
    success: false,
    stages: {
      rawMarketDaily: { created: 0, skipped: 0 },
      rawGlobalDaily: { created: 0, skipped: 0 },
      coinDailyScore: { created: 0, skipped: 0 },
      coefficientHistory: { created: 0, skipped: 0 },
      scoreHistory: { created: 0, skipped: 0 },
      marketIndicatorDaily: { created: 0, skipped: 0 },
      marketDailyScore: { created: 0, skipped: 0 },
    },
    durationMs: 0,
  };

  try {
    // Pre-flight: ensure hierarchy + coins exist
    await seedHierarchy();
    let coins = await db.coin.findMany();
    if (coins.length === 0) {
      for (const [coingeckoId, _data] of Object.entries(KNOWN_COIN_DATA)) {
        await db.coin.upsert({
          where: { coingeckoId },
          update: {},
          create: {
            coingeckoId,
            symbol: coingeckoId.substring(0, 5),
            name: coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1),
          },
        });
      }
      coins = await db.coin.findMany();
    }

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // ═══════════════════════════════════════════════════════════
    // STAGE: raw — Generate RawMarketDaily
    // ═══════════════════════════════════════════════════════════
    if (stage === 'raw') {
      onProgress?.({ stage: 'RawMarketDaily', stageIndex: 1, totalStages: 1, current: 0, total: coins.length, message: 'Generating synthetic market data...' });

      for (let ci = 0; ci < coins.length; ci++) {
        const coin = coins[ci];
        const knownData = KNOWN_COIN_DATA[coin.coingeckoId];
        const endPrice = knownData?.price ?? 100;
        const endMarketCap = knownData?.marketCap ?? (endPrice * 1_000_000);
        const endCircSupply = knownData?.circulatingSupply ?? (endMarketCap / endPrice);
        const endTotalSupply = knownData?.totalSupply ?? null;
        const endMaxSupply = knownData?.maxSupply ?? null;
        const profile = getVolatilityProfile(coin);

        // Generate from endPrice backwards to startDate
        const prices = generateSyntheticPrices(endPrice, totalDays, profile, coin.symbol);

        for (let i = 0; i <= totalDays; i++) {
          const dateStr = addDays(startDate, i);
          if (dateStr > endDate) break;

          const price = prices[i];
          if (price <= 0) continue;

          const priceChangePct24h = computePriceChangePct(prices, i, 1);
          const priceChangePct7d = computePriceChangePct(prices, i, 7);
          const priceChangePct14d = computePriceChangePct(prices, i, 14);
          const priceChangePct30d = computePriceChangePct(prices, i, 30);
          const priceChangePct60d = computePriceChangePct(prices, i, 60);
          const priceChangePct200d = computePriceChangePct(prices, i, 200);
          const priceChangePct1y = computePriceChangePct(prices, i, 365);

          const volMcapNoise = 1 + (Math.random() - 0.5) * 0.6;
          const volMcapRatio = profile.volToMcap * volMcapNoise;
          const mcapRatio = price / endPrice;
          const marketCap = Math.max(endMarketCap * mcapRatio, 1000);
          const totalVolume = marketCap * volMcapRatio;
          const supplyRatio = endPrice / Math.max(price, 0.0001);
          const circulatingSupply = Math.max(endCircSupply * Math.min(supplyRatio, 10), 1);
          const dailyRange = Math.abs(priceChangePct24h ?? 2) / 100;
          const high24h = price * (1 + dailyRange * 0.5 + Math.random() * dailyRange * 0.3);
          const low24h = price * (1 - dailyRange * 0.5 - Math.random() * dailyRange * 0.3);
          const maxPriceSoFar = Math.max(...prices.slice(0, i + 1));
          const ath = maxPriceSoFar;
          const athChangePct = ((price - ath) / ath) * 100;
          const minPriceSoFar = Math.min(...prices.slice(0, i + 1));
          const atl = minPriceSoFar;
          const atlChangePct = ((price - atl) / atl) * 100;
          const priceChangePct1h = (priceChangePct24h ?? 0) * (0.04 + Math.random() * 0.08);
          const fdv = endMaxSupply ? endMaxSupply * price : endTotalSupply ? endTotalSupply * price : null;

          try {
            await db.rawMarketDaily.upsert({
              where: { coinId_date: { coinId: coin.id, date: dateStr } },
              update: {},
              create: {
                coinId: coin.id, date: dateStr, price, high24h, low24h,
                priceChange24h: priceChangePct24h ? price * (priceChangePct24h / 100) : null,
                priceChangePct1h, priceChangePct24h: priceChangePct24h ?? null,
                priceChangePct7d, priceChangePct14d, priceChangePct30d, priceChangePct60d,
                priceChangePct200d, priceChangePct1y,
                marketCap, marketCapRank: null, marketCapChangePct24h: priceChangePct24h,
                fullyDilutedValuation: fdv, totalVolume, circulatingSupply,
                totalSupply: endTotalSupply, maxSupply: endMaxSupply,
                ath, athChangePct, athDate: null, atl, atlChangePct, atlDate: null,
                sparklineData: null, rawData: null,
              },
            });
            result.stages.rawMarketDaily.created++;
          } catch {
            result.stages.rawMarketDaily.skipped++;
          }
        }

        onProgress?.({ stage: 'RawMarketDaily', stageIndex: 1, totalStages: 1, current: ci + 1, total: coins.length, message: `${coin.symbol} done` });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE: global — Generate RawGlobalDaily
    // ═══════════════════════════════════════════════════════════
    if (stage === 'global') {
      onProgress?.({ stage: 'RawGlobalDaily', stageIndex: 2, totalStages: 1, current: 0, total: totalDays, message: 'Generating global data...' });

      for (let i = 0; i <= totalDays; i++) {
        const dateStr = addDays(startDate, i);
        if (dateStr > endDate) break;

        const dayData = await db.rawMarketDaily.findMany({
          where: { date: dateStr },
          select: { marketCap: true, totalVolume: true },
        });
        if (dayData.length === 0) continue;

        const totalMarketCap = dayData.reduce((s, d) => s + d.marketCap, 0);
        const totalVolume = dayData.reduce((s, d) => s + (d.totalVolume ?? 0), 0);
        const sortedByMcap = [...dayData].sort((a, b) => b.marketCap - a.marketCap);
        const btcDominance = sortedByMcap.length > 0 ? (sortedByMcap[0].marketCap / totalMarketCap) * 100 : null;
        const ethDominance = sortedByMcap.length > 1 ? (sortedByMcap[1].marketCap / totalMarketCap) * 100 : null;

        const yesterdayStr = getYesterday(dateStr);
        const yesterdayGlobal = await db.rawGlobalDaily.findUnique({ where: { date: yesterdayStr } });
        const marketCapChangePct24h = yesterdayGlobal?.totalMarketCapUsd
          ? ((totalMarketCap - yesterdayGlobal.totalMarketCapUsd) / yesterdayGlobal.totalMarketCapUsd) * 100 : null;

        try {
          await db.rawGlobalDaily.upsert({
            where: { date: dateStr },
            update: {},
            create: {
              date: dateStr, activeCryptos: dayData.length + 12000,
              totalMarketCapUsd: totalMarketCap, totalVolumeUsd: totalVolume,
              btcDominance, ethDominance, marketCapChangePct24h, rawData: null,
            },
          });
          result.stages.rawGlobalDaily.created++;
        } catch {
          result.stages.rawGlobalDaily.skipped++;
        }

        if (i % 30 === 0) {
          onProgress?.({ stage: 'RawGlobalDaily', stageIndex: 2, totalStages: 1, current: i, total: totalDays, message: `Day ${i}/${totalDays}` });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE: scores — Compute CoinDailyScore + CoefficientHistory
    // Uses computeAndStoreScores which also creates ScoreHistory
    // ═══════════════════════════════════════════════════════════
    if (stage === 'scores') {
      onProgress?.({ stage: 'Scores', stageIndex: 3, totalStages: 1, current: 0, total: totalDays, message: 'Computing scores...' });

      for (let i = 0; i <= totalDays; i++) {
        const dateStr = addDays(startDate, i);
        if (dateStr > endDate) break;

        // Skip if scores already exist for most coins
        const existingCount = await db.coinDailyScore.count({ where: { date: dateStr } });
        if (existingCount >= coins.length * 0.8) {
          result.stages.coinDailyScore.skipped += existingCount;
          continue;
        }

        // Load raw market data for this date
        const rawMarketData = await db.rawMarketDaily.findMany({
          where: { date: dateStr },
          include: { coin: true },
        });
        if (rawMarketData.length === 0) continue;

        // Build CoinInput
        const coinInputs: CoinInput[] = rawMarketData.map((rmd) => ({
          id: rmd.coin.coingeckoId,
          dbCoinId: rmd.coinId,
          symbol: rmd.coin.symbol,
          name: rmd.coin.name,
          current_price: rmd.price,
          market_cap: rmd.marketCap,
          market_cap_rank: rmd.marketCapRank ?? 50,
          fully_diluted_valuation: rmd.fullyDilutedValuation,
          total_volume: rmd.totalVolume ?? 0,
          high_24h: rmd.high24h ?? rmd.price,
          low_24h: rmd.low24h ?? rmd.price,
          price_change_24h: rmd.priceChange24h ?? 0,
          price_change_percentage_24h: rmd.priceChangePct24h ?? 0,
          market_cap_change_24h: rmd.marketCapChangePct24h ? rmd.marketCap * (rmd.marketCapChangePct24h / 100) : 0,
          market_cap_change_percentage_24h: rmd.marketCapChangePct24h ?? 0,
          circulating_supply: rmd.circulatingSupply ?? 0,
          total_supply: rmd.totalSupply,
          max_supply: rmd.maxSupply,
          ath: rmd.ath ?? rmd.price,
          ath_change_percentage: rmd.athChangePct ?? 0,
          price_change_percentage_1h_in_currency: rmd.priceChangePct1h ?? undefined,
          price_change_percentage_7d_in_currency: rmd.priceChangePct7d ?? undefined,
        }));

        try {
          const cryptoScores = await computeAndStoreScores(coinInputs, dateStr);
          result.stages.coinDailyScore.created += cryptoScores.length;
          result.stages.coefficientHistory.created += 284; // approximate
        } catch (error) {
          console.error(`[Backfill] Score error for ${dateStr}:`, error);
        }

        if (i % 7 === 0) {
          onProgress?.({ stage: 'Scores', stageIndex: 3, totalStages: 1, current: i, total: totalDays, message: `Day ${i}/${totalDays} (${Math.round(i / totalDays * 100)}%)` });
        }
      }

      result.stages.coefficientHistory.created = await db.coefficientHistory.count();
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE: fast-scores — Compute CoinDailyScore ONLY (no ScoreHistory)
    // Much faster than "scores" stage — suitable for 3-year backfill
    // ═══════════════════════════════════════════════════════════
    if (stage === 'fast-scores') {
      onProgress?.({ stage: 'FastScores', stageIndex: 3, totalStages: 1, current: 0, total: totalDays, message: 'Fast computing scores (no ScoreHistory)...' });

      // Load current coefficients from DB or use defaults
      let currentCoefficients = initDefaultCoefficients();
      let currentVersion = 0;

      // Try to load the latest coefficients from DB
      const latestCoeff = await db.coefficientHistory.findFirst({
        orderBy: { date: 'desc' },
      });
      if (latestCoeff) {
        const allCoeffs = await db.coefficientHistory.findMany({
          where: { date: latestCoeff.date },
        });
        for (const row of allCoeffs) {
          currentCoefficients[row.nodeKey] = row.coefficient;
        }
        currentVersion = latestCoeff.version;
      }

      // Dimension key to CoinDailyScore field mapping
      const dimensionFieldMap: Record<string, string> = {
        fundamental: 'fundamentalScore',
        technical: 'technicalScore',
        onchain: 'onchainScore',
        market_psychology: 'marketScore',
        news_sentiment: 'newsSentimentScore',
        macroeconomic: 'macroeconomicScore',
        regulatory: 'regulatoryScore',
        network_security: 'networkSecurityScore',
        derivatives: 'derivativesScore',
        whale_smart_money: 'whaleSmartMoneyScore',
        ecosystem_defi: 'ecosystemDefiScore',
        inter_market: 'interMarketScore',
      };

      for (let i = 0; i <= totalDays; i++) {
        const dateStr = addDays(startDate, i);
        if (dateStr > endDate) break;

        // Skip if scores already exist for most coins on this date
        // AND dimension-level ScoreHistory also exists
        const existingCDS = await db.coinDailyScore.count({ where: { date: dateStr } });
        const existingSH = await db.scoreHistory.count({
          where: { date: dateStr, nodeKey: { in: getDimensionDefinitions().map(d => d.key) } },
        });
        if (existingCDS >= coins.length * 0.8 && existingSH >= coins.length * 10) {
          result.stages.coinDailyScore.skipped += existingCDS;
          continue;
        }

        // Load raw market data for this date
        const rawMarketData = await db.rawMarketDaily.findMany({
          where: { date: dateStr },
          include: { coin: true },
        });
        if (rawMarketData.length === 0) continue;

        // Build CoinInput
        const coinInputs: CoinInput[] = rawMarketData.map((rmd) => ({
          id: rmd.coin.coingeckoId,
          dbCoinId: rmd.coinId,
          symbol: rmd.coin.symbol,
          name: rmd.coin.name,
          current_price: rmd.price,
          market_cap: rmd.marketCap,
          market_cap_rank: rmd.marketCapRank ?? 50,
          fully_diluted_valuation: rmd.fullyDilutedValuation,
          total_volume: rmd.totalVolume ?? 0,
          high_24h: rmd.high24h ?? rmd.price,
          low_24h: rmd.low24h ?? rmd.price,
          price_change_24h: rmd.priceChange24h ?? 0,
          price_change_percentage_24h: rmd.priceChangePct24h ?? 0,
          market_cap_change_24h: rmd.marketCapChangePct24h ? rmd.marketCap * (rmd.marketCapChangePct24h / 100) : 0,
          market_cap_change_percentage_24h: rmd.marketCapChangePct24h ?? 0,
          circulating_supply: rmd.circulatingSupply ?? 0,
          total_supply: rmd.totalSupply,
          max_supply: rmd.maxSupply,
          ath: rmd.ath ?? rmd.price,
          ath_change_percentage: rmd.athChangePct ?? 0,
          price_change_percentage_1h_in_currency: rmd.priceChangePct1h ?? undefined,
          price_change_percentage_7d_in_currency: rmd.priceChangePct7d ?? undefined,
        }));

        // Compute scores using the lightweight function (no DB writes)
        let dayCreated = 0;
        for (const coinInput of coinInputs) {
          try {
            const score: CryptoScore = calculateCryptoScore(coinInput);

            // Get previous score for delta computation
            const yesterdayStr = getYesterday(dateStr);
            const prevScore = await db.coinDailyScore.findUnique({
              where: { coinId_date: { coinId: coinInput.dbCoinId!, date: yesterdayStr } },
            });

            const previousAiScore = prevScore?.aiScore ?? score.aiScore;
            const aiScoreChange = Math.round((score.aiScore - previousAiScore) * 10) / 10;

            // Map dimension scores
            const dimensionScores: Record<string, number> = {};
            for (const dim of score.dimensions) {
              dimensionScores[dim.key] = dim.score;
            }
            const dimensionFields: Record<string, number | null> = {};
            for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
              dimensionFields[fieldName] = dimensionScores[dimKey] ?? null;
            }

            await db.coinDailyScore.upsert({
              where: { coinId_date: { coinId: coinInput.dbCoinId!, date: dateStr } },
              update: {
                previousAiScore,
                aiScoreChange,
                ...dimensionFields,
              },
              create: {
                coinId: coinInput.dbCoinId!,
                date: dateStr,
                aiScore: score.aiScore,
                previousAiScore,
                aiScoreChange,
                confidence: score.confidence,
                coefficientVersion: currentVersion,
                ...dimensionFields,
              },
            });
            dayCreated++;
          } catch (error) {
            // Skip this coin on error
          }
        }

        result.stages.coinDailyScore.created += dayCreated;

        // Also store dimension-level ScoreHistory (12 rows per coin per day)
        // This is needed by computeMarketIndicators()
        for (const coinInput of coinInputs) {
          try {
            const score: CryptoScore = calculateCryptoScore(coinInput);
            const dbCoinId = coinInput.dbCoinId!;

            // Get yesterday's dimension scores for delta computation
            const yesterdayStr = getYesterday(dateStr);
            const prevScores = await db.scoreHistory.findMany({
              where: { coinId: dbCoinId, date: yesterdayStr, nodeKey: { in: score.dimensions.map(d => d.key) } },
              select: { nodeKey: true, score: true },
            });
            const prevScoreMap = new Map(prevScores.map(s => [s.nodeKey, s.score]));

            for (const dim of score.dimensions) {
              const prevDimScore = prevScoreMap.get(dim.key) ?? dim.score;
              const dimChange = Math.round((dim.score - prevDimScore) * 10) / 10;

              await db.scoreHistory.upsert({
                where: { coinId_nodeKey_date: { coinId: dbCoinId, nodeKey: dim.key, date: dateStr } },
                update: {
                  previousScore: prevDimScore !== dim.score ? prevDimScore : null,
                  scoreChange: dimChange !== 0 ? dimChange : null,
                  coefficient: dim.coefficient,
                },
                create: {
                  coinId: dbCoinId,
                  nodeKey: dim.key,
                  date: dateStr,
                  score: dim.score,
                  previousScore: prevDimScore !== dim.score ? prevDimScore : null,
                  scoreChange: dimChange !== 0 ? dimChange : null,
                  coefficient: dim.coefficient,
                },
              });
              result.stages.scoreHistory.created++;
            }
          } catch {
            // Skip dimension score history on error
          }
        }

        // Update coefficients in memory (simplified ML step)
        currentVersion++;
        const allCoeffKeys = Object.keys(currentCoefficients);
        // Deterministic perturbation instead of Math.random
        const dateHash = dateStr.split('').reduce((h, ch) => ((h << 5) - h) + ch.charCodeAt(0) | 0, 0);
        const dateNorm = Math.abs(dateHash % 1000) / 1000;
        for (const nodeKey of allCoeffKeys) {
          const prevCoeff = currentCoefficients[nodeKey];
          const nodeHash = nodeKey.split('').reduce((h, ch) => ((h << 5) - h) + ch.charCodeAt(0) | 0, 0);
          const nodeNorm = Math.abs(nodeHash % 1000) / 1000;
          const perturbation = (dateNorm + nodeNorm - 1) * 0.002;
          const newCoeff = Math.max(0.05, prevCoeff + perturbation);
          currentCoefficients[nodeKey] = newCoeff;
        }

        // Normalize dimension-level coefficients
        const dimKeys = getDimensionDefinitions().map(d => d.key);
        const dimSum = dimKeys.reduce((s, k) => s + (currentCoefficients[k] ?? 0), 0);
        if (dimSum > 0) {
          for (const k of dimKeys) {
            currentCoefficients[k] = (currentCoefficients[k] ?? 0) / dimSum;
          }
        }

        // Only store coefficient history every 7 days to save time
        // (ML can interpolate between stored points)
        if (i % 7 === 0) {
          for (const nodeKey of allCoeffKeys) {
            try {
              await db.coefficientHistory.upsert({
                where: { nodeKey_date: { nodeKey, date: dateStr } },
                update: {},
                create: {
                  nodeKey,
                  date: dateStr,
                  version: currentVersion,
                  coefficient: currentCoefficients[nodeKey],
                  previousCoefficient: currentCoefficients[nodeKey],
                  coefficientChange: 0,
                  predictionError: 0.01,
                },
              });
              result.stages.coefficientHistory.created++;
            } catch {
              result.stages.coefficientHistory.skipped++;
            }
          }
        }

        if (i % 30 === 0) {
          onProgress?.({ stage: 'FastScores', stageIndex: 3, totalStages: 1, current: i, total: totalDays, message: `Day ${i}/${totalDays} (${Math.round(i / totalDays * 100)}%)` });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE: market-indicators
    // ═══════════════════════════════════════════════════════════
    if (stage === 'market-indicators') {
      onProgress?.({ stage: 'MarketIndicators', stageIndex: 4, totalStages: 1, current: 0, total: totalDays, message: 'Computing market indicators...' });

      for (let i = 0; i <= totalDays; i++) {
        const dateStr = addDays(startDate, i);
        if (dateStr > endDate) break;

        // Check if already computed
        const existing = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketIndicatorDaily" WHERE date = ${dateStr}`;
        if (Number(existing[0]?.count ?? 0) > 0) {
          result.stages.marketIndicatorDaily.skipped += Number(existing[0]?.count ?? 0);
          continue;
        }

        try {
          await computeMarketIndicators(dateStr);
          const newIndicators = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketIndicatorDaily" WHERE date = ${dateStr}`;
          result.stages.marketIndicatorDaily.created += Number(newIndicators[0]?.count ?? 0);
          const newDailyScore = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketDailyScore" WHERE date = ${dateStr}`;
          result.stages.marketDailyScore.created += Number(newDailyScore[0]?.count ?? 0);
        } catch (error) {
          console.error(`[Backfill] Market indicator error for ${dateStr}:`, error);
        }

        if (i % 7 === 0) {
          onProgress?.({ stage: 'MarketIndicators', stageIndex: 4, totalStages: 1, current: i, total: totalDays, message: `Day ${i}/${totalDays}` });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STAGE: score-history — Full hierarchy score history (optional)
    // This is the slowest stage - only run if needed
    // ═══════════════════════════════════════════════════════════
    if (stage === 'score-history') {
      // This stage is handled by the "scores" stage already
      // computeAndStoreScores already stores ScoreHistory
      // This stage exists for future optimization if we want to
      // compute score history without CoinDailyScore
      result.stages.scoreHistory.skipped = await db.scoreHistory.count();
    }

    result.success = true;
    result.durationMs = Date.now() - startTime;
    return result;
  } catch (error) {
    result.success = false;
    result.durationMs = Date.now() - startTime;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Backfill] Fatal error:', error);
    return result;
  }
}

/**
 * Run the full 3-year backfill in sequence.
 * Processes all stages one by one.
 */
export async function runFullBackfill(
  days: number = 1095,
  onProgress?: ProgressCallback
): Promise<BackfillResult> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - days);
  const startDate = startDateObj.toISOString().split('T')[0];

  const combinedResult: BackfillResult = {
    success: true,
    stages: {
      rawMarketDaily: { created: 0, skipped: 0 },
      rawGlobalDaily: { created: 0, skipped: 0 },
      coinDailyScore: { created: 0, skipped: 0 },
      coefficientHistory: { created: 0, skipped: 0 },
      scoreHistory: { created: 0, skipped: 0 },
      marketIndicatorDaily: { created: 0, skipped: 0 },
      marketDailyScore: { created: 0, skipped: 0 },
    },
    durationMs: 0,
  };

  const totalStart = Date.now();

  // Stage 1: Raw Market Data
  const r1 = await runBackfillStage('raw', startDate, endDate, (p) => onProgress?.({ ...p, stageIndex: 1, totalStages: 4 }));
  combinedResult.stages.rawMarketDaily = r1.stages.rawMarketDaily;

  // Stage 2: Global Data
  const r2 = await runBackfillStage('global', startDate, endDate, (p) => onProgress?.({ ...p, stageIndex: 2, totalStages: 4 }));
  combinedResult.stages.rawGlobalDaily = r2.stages.rawGlobalDaily;

  // Stage 3: Scores (process in 90-day chunks to avoid timeouts)
  const CHUNK_DAYS = 90;
  let currentStart = startDate;
  while (currentStart < endDate) {
    const chunkEnd = addDays(currentStart, CHUNK_DAYS);
    const actualEnd = chunkEnd > endDate ? endDate : chunkEnd;
    const r3 = await runBackfillStage('scores', currentStart, actualEnd, (p) => onProgress?.({ ...p, stageIndex: 3, totalStages: 4 }));
    combinedResult.stages.coinDailyScore.created += r3.stages.coinDailyScore.created;
    combinedResult.stages.coinDailyScore.skipped += r3.stages.coinDailyScore.skipped;
    combinedResult.stages.coefficientHistory.created += r3.stages.coefficientHistory.created;
    combinedResult.stages.coefficientHistory.skipped += r3.stages.coefficientHistory.skipped;
    combinedResult.stages.scoreHistory.created += r3.stages.scoreHistory.created;
    combinedResult.stages.scoreHistory.skipped += r3.stages.scoreHistory.skipped;
    currentStart = addDays(actualEnd, 1);
  }

  // Stage 4: Market Indicators (process in 90-day chunks)
  currentStart = startDate;
  while (currentStart < endDate) {
    const chunkEnd = addDays(currentStart, CHUNK_DAYS);
    const actualEnd = chunkEnd > endDate ? endDate : chunkEnd;
    const r4 = await runBackfillStage('market-indicators', currentStart, actualEnd, (p) => onProgress?.({ ...p, stageIndex: 4, totalStages: 4 }));
    combinedResult.stages.marketIndicatorDaily.created += r4.stages.marketIndicatorDaily.created;
    combinedResult.stages.marketIndicatorDaily.skipped += r4.stages.marketIndicatorDaily.skipped;
    combinedResult.stages.marketDailyScore.created += r4.stages.marketDailyScore.created;
    combinedResult.stages.marketDailyScore.skipped += r4.stages.marketDailyScore.skipped;
    currentStart = addDays(actualEnd, 1);
  }

  combinedResult.durationMs = Date.now() - totalStart;
  combinedResult.success = true;
  return combinedResult;
}

/**
 * Get a quick status summary of historical data in the database.
 */
export async function getBackfillStatus(): Promise<{
  rawMarketDaily: number;
  rawGlobalDaily: number;
  scoreHistory: number;
  coinDailyScore: number;
  coefficientHistory: number;
  marketIndicatorDaily: number;
  marketDailyScore: number;
  coins: number;
  hierarchyNodes: number;
  dateRange: { earliest: string | null; latest: string | null };
}> {
  const [
    rawMarketDaily, rawGlobalDaily, scoreHistory, coinDailyScore,
    coefficientHistory, coins, hierarchyNodes,
  ] = await Promise.all([
    db.rawMarketDaily.count(),
    db.rawGlobalDaily.count(),
    db.scoreHistory.count(),
    db.coinDailyScore.count(),
    db.coefficientHistory.count(),
    db.coin.count(),
    db.hierarchyNode.count(),
  ]);

  let marketIndicatorDaily = 0;
  let marketDailyScore = 0;
  try {
    const miResult = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketIndicatorDaily"`;
    marketIndicatorDaily = Number(miResult[0]?.count ?? 0);
    const mdsResult = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "MarketDailyScore"`;
    marketDailyScore = Number(mdsResult[0]?.count ?? 0);
  } catch { /* Tables may not exist yet */ }

  const earliestScore = await db.coinDailyScore.findFirst({ orderBy: { date: 'asc' }, select: { date: true } });
  const latestScore = await db.coinDailyScore.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });

  return {
    rawMarketDaily, rawGlobalDaily, scoreHistory, coinDailyScore,
    coefficientHistory, marketIndicatorDaily, marketDailyScore, coins, hierarchyNodes,
    dateRange: { earliest: earliestScore?.date ?? null, latest: latestScore?.date ?? null },
  };
}
