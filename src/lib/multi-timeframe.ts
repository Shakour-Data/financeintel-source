/**
 * Multi-Timeframe Scoring Engine
 *
 * Fetches Binance klines at different intervals (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M),
 * computes technical indicators per timeframe, and produces per-timeframe 12-dimension scores.
 * The overall AI score comes from a weighted combination of all timeframe scores.
 *
 * Dimensions that CHANGE with timeframe: Technical, Market Psychology, Derivatives, Whale & Smart Money
 * Dimensions that are STRUCTURAL (same across TFs): Fundamental, On-Chain, News Sentiment, Macroeconomic,
 *   Regulatory, Network Security, Ecosystem & DeFi, Inter-Market
 */

import { getBinanceSymbol } from '@/lib/binance-historical';
import { getLatestScores } from '@/lib/scoring-engine-v2';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface TimeFrameScore {
  timeFrame: TimeFrame;
  weight: number;
  aiScore: number; // 0-100
  dimensions: Array<{
    key: string;
    name: string;
    score: number; // 1-10
    signal: 'bullish' | 'bearish' | 'neutral';
  }>;
  trend: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  momentum: number; // -1 to 1
  volatility: 'low' | 'medium' | 'high';
}

export interface MultiTimeFrameResult {
  coinId: string;
  symbol: string;
  overallScore: number; // Weighted combination of all TF scores
  overallSignal: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  timeFrames: TimeFrameScore[];
  consensus: {
    bullCount: number;
    bearCount: number;
    neutralCount: number;
    alignment: 'aligned_bull' | 'aligned_bear' | 'mixed' | 'neutral';
  };
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// TIMEFRAME WEIGHTS
// ═══════════════════════════════════════════════════════════════

const TIMEFRAME_WEIGHTS: Record<TimeFrame, number> = {
  '1m': 0.05,   // Very short term - noise
  '5m': 0.05,   // Short term scalp
  '15m': 0.10,  // Short term swing
  '1h': 0.15,   // Intraday trend
  '4h': 0.20,   // Medium term
  '1d': 0.25,   // Daily (most important)
  '1w': 0.15,   // Weekly trend
  '1M': 0.05,   // Monthly macro view
};

const ALL_TIMEFRAMES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

// ═══════════════════════════════════════════════════════════════
// KLINE CACHE
// ═══════════════════════════════════════════════════════════════

interface CachedKlines {
  data: KlineData[];
  fetchedAt: number;
}

const klineCache = new Map<string, CachedKlines>();

function getCacheTTL(tf: TimeFrame): number {
  switch (tf) {
    case '1m':
    case '5m':
    case '15m':
      return 60_000; // 1 minute
    case '1h':
    case '4h':
      return 300_000; // 5 minutes
    case '1d':
    case '1w':
    case '1M':
      return 3_600_000; // 1 hour
  }
}

interface ScoreCacheEntry {
  result: MultiTimeFrameResult;
  fetchedAt: number;
}

const scoreCache = new Map<string, ScoreCacheEntry>();

function getScoreCacheTTL(tfSet: TimeFrame[]): number {
  // Use the shortest TTL among the requested timeframes
  const ttls = tfSet.map(getCacheTTL);
  return Math.min(...ttls);
}

// ═══════════════════════════════════════════════════════════════
// KLINEDATA TYPE
// ═══════════════════════════════════════════════════════════════

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
}

// ═══════════════════════════════════════════════════════════════
// BINANCE API FETCHER
// ═══════════════════════════════════════════════════════════════

const BINANCE_BASE = 'https://api.binance.com/api/v3';

async function fetchKlinesFromBinance(
  symbol: string,
  interval: string,
  limit: number = 500
): Promise<KlineData[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: limit.toString(),
  });

  const url = `${BINANCE_BASE}/klines?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('Invalid symbol')) {
        throw new Error(`Invalid Binance symbol: ${symbol}`);
      }
      throw new Error(`Binance API returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(`Invalid klines response for ${symbol}: not an array`);
    }

    const result: KlineData[] = [];
    for (const kline of data as unknown[][]) {
      const close = parseFloat(kline[4] as string);
      if (close > 0) {
        result.push({
          openTime: Number(kline[0]),
          open: parseFloat(kline[1] as string),
          high: parseFloat(kline[2] as string),
          low: parseFloat(kline[3] as string),
          close,
          volume: parseFloat(kline[5] as string),
          closeTime: Number(kline[6]),
          quoteVolume: parseFloat(kline[7] as string),
        });
      }
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch klines with caching
 */
async function fetchCachedKlines(
  symbol: string,
  interval: TimeFrame,
  limit: number = 500
): Promise<KlineData[]> {
  const cacheKey = `${symbol}_${interval}`;
  const cached = klineCache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < getCacheTTL(interval)) {
    return cached.data;
  }

  const data = await fetchKlinesFromBinance(symbol, interval, limit);

  klineCache.set(cacheKey, { data, fetchedAt: Date.now() });

  return data;
}

// ═══════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════

/**
 * RSI (Relative Strength Index)
 */
function computeRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * EMA (Exponential Moving Average)
 */
function computeEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return values[values.length - 1];

  const multiplier = 2 / (period + 1);

  // Start with SMA for the first `period` values
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += values[i];
  }
  ema /= period;

  // Apply EMA formula for remaining values
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
function computeMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = computeEMA(closes, 12);
  const ema26 = computeEMA(closes, 26);

  // Compute MACD line series for signal calculation
  const macdLine: number[] = [];
  // We need to compute EMA12 and EMA26 at each point to get MACD series
  const mult12 = 2 / 13;
  const mult26 = 2 / 27;

  let e12 = 0;
  for (let i = 0; i < 12; i++) e12 += closes[i];
  e12 /= 12;

  let e26 = 0;
  for (let i = 0; i < 26; i++) e26 += closes[i];
  e26 /= 26;

  for (let i = 26; i < closes.length; i++) {
    e12 = (closes[i] - e12) * mult12 + e12;
    e26 = (closes[i] - e26) * mult26 + e26;
    macdLine.push(e12 - e26);
  }

  const macd = ema12 - ema26;
  const signal = macdLine.length >= 9 ? computeEMA(macdLine, 9) : macd;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Bollinger Bands
 */
function computeBollingerBands(
  closes: number[],
  period: number = 20
): { upper: number; middle: number; lower: number; width: number } {
  if (closes.length < period) {
    const last = closes[closes.length - 1] ?? 0;
    return { upper: last * 1.02, middle: last, lower: last * 0.98, width: 0.04 };
  }

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  const upper = middle + 2 * stdDev;
  const lower = middle - 2 * stdDev;
  const width = middle > 0 ? (upper - lower) / middle : 0;

  return { upper, middle, lower, width };
}

/**
 * ATR (Average True Range)
 */
function computeATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  // Use EMA-like smoothing for ATR
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trueRanges[i];
  }
  atr /= period;

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * Volume Trend — compares recent volume to historical average
 */
function computeVolumeTrend(volumes: number[], period: number = 20): number {
  if (volumes.length < period) return 0;

  const recent = volumes.slice(-period);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / period;

  // Compare to a longer-term average
  const longerPeriod = Math.min(period * 3, volumes.length);
  const longer = volumes.slice(-longerPeriod);
  const longerAvg = longer.reduce((a, b) => a + b, 0) / longerPeriod;

  if (longerAvg === 0) return 0;

  return (recentAvg - longerAvg) / longerAvg;
}

/**
 * Simple OBV-like analysis — volume direction
 */
function computeOBVSignal(closes: number[], volumes: number[]): number {
  if (closes.length < 2) return 0;

  let obv = 0;
  const startIdx = Math.max(0, closes.length - 20);

  for (let i = startIdx + 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
  }

  const totalVolume = volumes.slice(startIdx).reduce((a, b) => a + b, 0);
  if (totalVolume === 0) return 0;

  return obv / totalVolume; // -1 to 1
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface DimensionDef {
  key: string;
  name: string;
  isTimeframeDependent: boolean;
}

const DIMENSION_DEFS: DimensionDef[] = [
  { key: 'fundamental', name: 'Fundamental Analysis', isTimeframeDependent: false },
  { key: 'technical', name: 'Technical Analysis', isTimeframeDependent: true },
  { key: 'onchain', name: 'On-Chain & Microstructure', isTimeframeDependent: false },
  { key: 'market_psychology', name: 'Market & Investment Psychology', isTimeframeDependent: true },
  { key: 'news_sentiment', name: 'News & Sentiment Analysis', isTimeframeDependent: false },
  { key: 'macroeconomic', name: 'Macroeconomic', isTimeframeDependent: false },
  { key: 'regulatory', name: 'Regulatory', isTimeframeDependent: false },
  { key: 'network_security', name: 'Network Security', isTimeframeDependent: false },
  { key: 'derivatives', name: 'Derivatives', isTimeframeDependent: true },
  { key: 'whale_smart_money', name: 'Whale & Smart Money', isTimeframeDependent: true },
  { key: 'ecosystem_defi', name: 'Ecosystem & DeFi', isTimeframeDependent: false },
  { key: 'inter_market', name: 'Inter-Market', isTimeframeDependent: false },
];

// ═══════════════════════════════════════════════════════════════
// TIMEFRAME-SPECIFIC SCORING
// ═══════════════════════════════════════════════════════════════

interface TechIndicators {
  rsi: number;
  emaShort: number;
  emaLong: number;
  macd: { macd: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number; width: number };
  atr: number;
  atrPct: number;
  volumeTrend: number;
  obvSignal: number;
  priceVsEmaShort: number; // percentage
  priceVsEmaLong: number; // percentage
  emaCross: 'golden' | 'death' | 'none';
  priceVsBollinger: number; // 0=lower, 0.5=middle, 1=upper
  closePrice: number;
}

/**
 * Compute all technical indicators from kline data for a specific timeframe
 */
function computeTechIndicators(klines: KlineData[], tf: TimeFrame): TechIndicators {
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const volumes = klines.map(k => k.volume);

  const lastClose = closes[closes.length - 1] || 0;

  // EMA periods depend on timeframe
  const emaShortPeriod = tf === '1M' ? 3 : tf === '1w' ? 5 : tf === '1d' ? 9 : 9;
  const emaLongPeriod = tf === '1M' ? 6 : tf === '1w' ? 13 : tf === '1d' ? 21 : 21;

  const emaShort = computeEMA(closes, emaShortPeriod);
  const emaLong = computeEMA(closes, emaLongPeriod);

  const priceVsEmaShort = emaShort > 0 ? ((lastClose - emaShort) / emaShort) * 100 : 0;
  const priceVsEmaLong = emaLong > 0 ? ((lastClose - emaLong) / emaLong) * 100 : 0;

  // EMA crossover detection
  let emaCross: 'golden' | 'death' | 'none' = 'none';
  if (closes.length >= emaLongPeriod + 2) {
    const prevCloses = closes.slice(0, -1);
    const prevEmaShort = computeEMA(prevCloses, emaShortPeriod);
    const prevEmaLong = computeEMA(prevCloses, emaLongPeriod);
    const currDiff = emaShort - emaLong;
    const prevDiff = prevEmaShort - prevEmaLong;
    if (prevDiff <= 0 && currDiff > 0) emaCross = 'golden';
    if (prevDiff >= 0 && currDiff < 0) emaCross = 'death';
  }

  const rsi = computeRSI(closes);
  const macd = computeMACD(closes);
  const bollingerBands = computeBollingerBands(closes);
  const atr = computeATR(highs, lows, closes);
  const atrPct = lastClose > 0 ? (atr / lastClose) * 100 : 0;

  const priceVsBollinger = bollingerBands.width > 0 && (bollingerBands.upper - bollingerBands.lower) > 0
    ? (lastClose - bollingerBands.lower) / (bollingerBands.upper - bollingerBands.lower)
    : 0.5;

  const volumeTrend = computeVolumeTrend(volumes);
  const obvSignal = computeOBVSignal(closes, volumes);

  return {
    rsi,
    emaShort,
    emaLong,
    macd,
    bollingerBands,
    atr,
    atrPct,
    volumeTrend,
    obvSignal,
    priceVsEmaShort,
    priceVsEmaLong,
    emaCross,
    priceVsBollinger,
    closePrice: lastClose,
  };
}

/**
 * Score Technical dimension based on timeframe-specific indicators
 */
function scoreTechnicalDimension(indicators: TechIndicators): number {
  let score = 5;

  // RSI scoring
  if (indicators.rsi > 70) score -= 1; // Overbought
  else if (indicators.rsi > 55) score += 1.5;
  else if (indicators.rsi > 45) score += 0.5;
  else if (indicators.rsi < 30) score += 1; // Oversold bounce potential
  else if (indicators.rsi < 40) score -= 0.5;

  // Price vs EMA
  if (indicators.priceVsEmaShort > 3) score += 1;
  else if (indicators.priceVsEmaShort > 0) score += 0.5;
  else if (indicators.priceVsEmaShort < -3) score -= 1;
  else if (indicators.priceVsEmaShort < 0) score -= 0.5;

  // EMA crossover
  if (indicators.emaCross === 'golden') score += 1.5;
  if (indicators.emaCross === 'death') score -= 1.5;

  // MACD histogram
  if (indicators.macd.histogram > 0) score += 0.5;
  else score -= 0.5;

  return Math.max(1, Math.min(10, score));
}

/**
 * Score Market Psychology dimension based on timeframe-specific indicators
 */
function scoreMarketPsychologyDimension(indicators: TechIndicators): number {
  let score = 5;

  // RSI as fear/greed proxy
  if (indicators.rsi > 75) score += 0.5; // Greed (but risky)
  else if (indicators.rsi > 60) score += 1.5; // Optimism
  else if (indicators.rsi > 40) score += 0.5; // Neutral
  else if (indicators.rsi < 25) score -= 1; // Extreme fear
  else score -= 0.5; // Fear

  // Bollinger Band position — extreme positions suggest sentiment extremes
  if (indicators.priceVsBollinger > 0.85) score += 0.5; // Euphoria zone (but topping risk)
  else if (indicators.priceVsBollinger > 0.5) score += 1;
  else if (indicators.priceVsBollinger < 0.15) score -= 0.5;
  else score += 0.5;

  // Volatility as fear indicator
  if (indicators.atrPct > 5) score -= 1; // High volatility = fear
  else if (indicators.atrPct > 3) score -= 0.5;
  else if (indicators.atrPct < 1) score += 1; // Calm = confidence
  else score += 0.5;

  // Volume trend as conviction
  if (indicators.volumeTrend > 0.3) score += 0.5;
  else if (indicators.volumeTrend < -0.3) score -= 0.5;

  return Math.max(1, Math.min(10, score));
}

/**
 * Score Derivatives dimension based on timeframe-specific indicators
 */
function scoreDerivativesDimension(indicators: TechIndicators): number {
  let score = 5;

  // Volume trend indicates derivatives activity
  if (indicators.volumeTrend > 0.5) score += 1.5;
  else if (indicators.volumeTrend > 0.2) score += 1;
  else if (indicators.volumeTrend < -0.5) score -= 1.5;
  else if (indicators.volumeTrend < -0.2) score -= 1;

  // OBV signal for derivative positioning
  if (indicators.obvSignal > 0.3) score += 1;
  else if (indicators.obvSignal < -0.3) score -= 1;

  // High volatility suggests active derivatives market
  if (indicators.atrPct > 4) score += 0.5;
  else if (indicators.atrPct > 2) score += 0.3;

  // MACD momentum
  if (indicators.macd.histogram > 0 && indicators.macd.macd > 0) score += 0.5;
  else if (indicators.macd.histogram < 0 && indicators.macd.macd < 0) score -= 0.5;

  return Math.max(1, Math.min(10, score));
}

/**
 * Score Whale & Smart Money dimension based on timeframe-specific indicators
 */
function scoreWhaleDimension(indicators: TechIndicators): number {
  let score = 5;

  // OBV divergence — strong directional volume = smart money
  if (indicators.obvSignal > 0.4) score += 1.5;
  else if (indicators.obvSignal > 0.15) score += 0.5;
  else if (indicators.obvSignal < -0.4) score -= 1.5;
  else if (indicators.obvSignal < -0.15) score -= 0.5;

  // Volume spike detection — unusual volume = whale activity
  if (indicators.volumeTrend > 0.5) score += 1;
  else if (indicators.volumeTrend > 0.2) score += 0.5;
  else if (indicators.volumeTrend < -0.3) score -= 0.5;

  // Price stability with rising volume = accumulation
  if (Math.abs(indicators.priceVsEmaShort) < 1 && indicators.volumeTrend > 0) score += 1;

  return Math.max(1, Math.min(10, score));
}

/**
 * Determine trend direction from indicators
 */
function determineTrend(indicators: TechIndicators): 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear' {
  let bullPoints = 0;
  let bearPoints = 0;

  // Price vs EMA
  if (indicators.priceVsEmaShort > 2) bullPoints += 2;
  else if (indicators.priceVsEmaShort > 0) bullPoints += 1;
  else if (indicators.priceVsEmaShort < -2) bearPoints += 2;
  else bearPoints += 1;

  if (indicators.priceVsEmaLong > 5) bullPoints += 2;
  else if (indicators.priceVsEmaLong > 0) bullPoints += 1;
  else if (indicators.priceVsEmaLong < -5) bearPoints += 2;
  else bearPoints += 1;

  // RSI
  if (indicators.rsi > 60) bullPoints += 1;
  else if (indicators.rsi < 40) bearPoints += 1;

  // MACD
  if (indicators.macd.histogram > 0) bullPoints += 1;
  else bearPoints += 1;

  // EMA cross
  if (indicators.emaCross === 'golden') bullPoints += 2;
  if (indicators.emaCross === 'death') bearPoints += 2;

  // OBV
  if (indicators.obvSignal > 0.2) bullPoints += 1;
  else if (indicators.obvSignal < -0.2) bearPoints += 1;

  const diff = bullPoints - bearPoints;
  if (diff >= 5) return 'strong_bull';
  if (diff >= 2) return 'bull';
  if (diff <= -5) return 'strong_bear';
  if (diff <= -2) return 'bear';
  return 'neutral';
}

/**
 * Compute momentum from -1 to 1
 */
function computeMomentum(indicators: TechIndicators): number {
  let momentum = 0;

  // RSI contribution (centered at 50)
  momentum += (indicators.rsi - 50) / 100;

  // MACD histogram contribution (normalized)
  const macdNorm = indicators.macd.histogram !== 0 && indicators.closePrice > 0
    ? Math.sign(indicators.macd.histogram) * Math.min(Math.abs(indicators.macd.histogram) / indicators.closePrice * 100, 0.3)
    : 0;
  momentum += macdNorm;

  // OBV contribution
  momentum += indicators.obvSignal * 0.3;

  // Price vs EMA
  momentum += Math.sign(indicators.priceVsEmaShort) * Math.min(Math.abs(indicators.priceVsEmaShort) / 10, 0.3);

  return Math.max(-1, Math.min(1, momentum));
}

/**
 * Classify volatility
 */
function classifyVolatility(atrPct: number): 'low' | 'medium' | 'high' {
  if (atrPct > 4) return 'high';
  if (atrPct > 1.5) return 'medium';
  return 'low';
}

/**
 * Get signal from score
 */
function scoreToSignal(score: number): 'bullish' | 'bearish' | 'neutral' {
  if (score >= 6.5) return 'bullish';
  if (score <= 3.5) return 'bearish';
  return 'neutral';
}

// ═══════════════════════════════════════════════════════════════
// STRUCTURAL SCORE FETCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Get structural (non-timeframe-dependent) dimension scores from the existing scoring engine.
 * These are the same across all timeframes.
 */
async function getStructuralScores(
  coinId: string
): Promise<Map<string, number>> {
  const scoresMap = await getLatestScores([coinId]);
  const score = scoresMap.get(coinId);

  const result = new Map<string, number>();

  if (score) {
    for (const dim of score.dimensions) {
      result.set(dim.key, dim.score);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute multi-timeframe scores for a single coin.
 *
 * @param coinId CoinGecko ID (e.g., 'bitcoin')
 * @param timeframes Optional subset of timeframes to compute (default: all)
 */
export async function computeMultiTimeframeScores(
  coinId: string,
  timeframes: TimeFrame[] = ALL_TIMEFRAMES
): Promise<MultiTimeFrameResult> {
  // Check score cache
  const cacheKey = `${coinId}_${timeframes.join(',')}`;
  const cached = scoreCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < getScoreCacheTTL(timeframes)) {
    return cached.result;
  }

  const symbol = getBinanceSymbol(coinId);
  if (!symbol) {
    // Return neutral result for coins without Binance support
    return {
      coinId,
      symbol: coinId.toUpperCase(),
      overallScore: 50,
      overallSignal: 'neutral',
      timeFrames: timeframes.map(tf => ({
        timeFrame: tf,
        weight: TIMEFRAME_WEIGHTS[tf],
        aiScore: 50,
        dimensions: DIMENSION_DEFS.map(d => ({
          key: d.key,
          name: d.name,
          score: 5,
          signal: 'neutral' as const,
        })),
        trend: 'neutral' as const,
        momentum: 0,
        volatility: 'medium' as const,
      })),
      consensus: {
        bullCount: 0,
        bearCount: 0,
        neutralCount: timeframes.length,
        alignment: 'neutral' as const,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // Get structural scores from existing scoring engine
  const structuralScores = await getStructuralScores(coinId);

  // Fetch klines and compute scores for each timeframe
  const tfScores: TimeFrameScore[] = [];

  for (const tf of timeframes) {
    try {
      const klines = await fetchCachedKlines(symbol, tf, 500);

      if (klines.length < 10) {
        // Not enough data for this timeframe
        tfScores.push({
          timeFrame: tf,
          weight: TIMEFRAME_WEIGHTS[tf],
          aiScore: 50,
          dimensions: DIMENSION_DEFS.map(d => ({
            key: d.key,
            name: d.name,
            score: structuralScores.get(d.key) ?? 5,
            signal: 'neutral' as const,
          })),
          trend: 'neutral',
          momentum: 0,
          volatility: 'medium',
        });
        continue;
      }

      // Compute technical indicators
      const indicators = computeTechIndicators(klines, tf);

      // Score each dimension
      const dimensions = DIMENSION_DEFS.map(d => {
        let score: number;

        if (d.isTimeframeDependent) {
          // Timeframe-dependent dimensions
          switch (d.key) {
            case 'technical':
              score = scoreTechnicalDimension(indicators);
              break;
            case 'market_psychology':
              score = scoreMarketPsychologyDimension(indicators);
              break;
            case 'derivatives':
              score = scoreDerivativesDimension(indicators);
              break;
            case 'whale_smart_money':
              score = scoreWhaleDimension(indicators);
              break;
            default:
              score = structuralScores.get(d.key) ?? 5;
          }
        } else {
          // Structural dimensions — use score from existing engine
          score = structuralScores.get(d.key) ?? 5;
        }

        return {
          key: d.key,
          name: d.name,
          score,
          signal: scoreToSignal(score),
        };
      });

      // Compute AI score for this timeframe (average of all dimension scores, scaled to 0-100)
      const avgScore = dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length;
      const aiScore = Math.round((avgScore / 10) * 100);

      const trend = determineTrend(indicators);
      const momentum = computeMomentum(indicators);
      const volatility = classifyVolatility(indicators.atrPct);

      tfScores.push({
        timeFrame: tf,
        weight: TIMEFRAME_WEIGHTS[tf],
        aiScore,
        dimensions,
        trend,
        momentum,
        volatility,
      });
    } catch (error) {
      console.error(`[MultiTimeframe] Error computing ${tf} for ${coinId}:`, error);
      // Fallback to neutral
      tfScores.push({
        timeFrame: tf,
        weight: TIMEFRAME_WEIGHTS[tf],
        aiScore: 50,
        dimensions: DIMENSION_DEFS.map(d => ({
          key: d.key,
          name: d.name,
          score: structuralScores.get(d.key) ?? 5,
          signal: 'neutral' as const,
        })),
        trend: 'neutral',
        momentum: 0,
        volatility: 'medium',
      });
    }
  }

  // Compute overall score as weighted combination
  let overallScore = 0;
  let totalWeight = 0;
  for (const tf of tfScores) {
    overallScore += tf.aiScore * tf.weight;
    totalWeight += tf.weight;
  }
  overallScore = totalWeight > 0 ? Math.round(overallScore / totalWeight) : 50;

  // Compute consensus
  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;
  for (const tf of tfScores) {
    if (tf.trend === 'strong_bull' || tf.trend === 'bull') bullCount++;
    else if (tf.trend === 'strong_bear' || tf.trend === 'bear') bearCount++;
    else neutralCount++;
  }

  let alignment: 'aligned_bull' | 'aligned_bear' | 'mixed' | 'neutral';
  if (bullCount >= 6) alignment = 'aligned_bull';
  else if (bearCount >= 6) alignment = 'aligned_bear';
  else if (bullCount >= 5 || bearCount >= 5) alignment = 'mixed';
  else alignment = 'neutral';

  let overallSignal: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  if (overallScore >= 75) overallSignal = 'strong_bull';
  else if (overallScore >= 60) overallSignal = 'bull';
  else if (overallScore <= 25) overallSignal = 'strong_bear';
  else if (overallScore <= 40) overallSignal = 'bear';
  else overallSignal = 'neutral';

  const result: MultiTimeFrameResult = {
    coinId,
    symbol,
    overallScore,
    overallSignal,
    timeFrames: tfScores,
    consensus: {
      bullCount,
      bearCount,
      neutralCount,
      alignment,
    },
    lastUpdated: new Date().toISOString(),
  };

  // Cache the result
  scoreCache.set(cacheKey, { result, fetchedAt: Date.now() });

  return result;
}

/**
 * Get summary multi-timeframe scores for top coins.
 * Returns a condensed version without full dimension breakdown.
 */
export async function computeMultiTimeframeSummary(
  coinIds: string[],
  timeframes: TimeFrame[] = ALL_TIMEFRAMES
): Promise<Array<{
  coinId: string;
  symbol: string;
  overallScore: number;
  overallSignal: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  consensus: {
    bullCount: number;
    bearCount: number;
    neutralCount: number;
    alignment: 'aligned_bull' | 'aligned_bear' | 'mixed' | 'neutral';
  };
  tfScores: Array<{
    timeFrame: TimeFrame;
    aiScore: number;
    trend: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
  }>;
}>> {
  const results: Array<{
    coinId: string;
    symbol: string;
    overallScore: number;
    overallSignal: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
    consensus: {
      bullCount: number;
      bearCount: number;
      neutralCount: number;
      alignment: 'aligned_bull' | 'aligned_bear' | 'mixed' | 'neutral';
    };
    tfScores: Array<{
      timeFrame: TimeFrame;
      aiScore: number;
      trend: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
    }>;
  }> = [];

  for (const coinId of coinIds) {
    try {
      const full = await computeMultiTimeframeScores(coinId, timeframes);
      results.push({
        coinId: full.coinId,
        symbol: full.symbol,
        overallScore: full.overallScore,
        overallSignal: full.overallSignal,
        consensus: full.consensus,
        tfScores: full.timeFrames.map(tf => ({
          timeFrame: tf.timeFrame,
          aiScore: tf.aiScore,
          trend: tf.trend,
        })),
      });

      // Rate limiting: 100ms delay between coins
      if (coinIds.indexOf(coinId) < coinIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[MultiTimeframe] Error computing summary for ${coinId}:`, error);
    }
  }

  return results;
}

/**
 * Get the top 10 coins by market cap for multi-timeframe analysis.
 * Uses the latest RawMarketDaily data to determine market cap rank.
 */
export async function getTopCoinsForMTF(): Promise<string[]> {
  const { db } = await import('@/lib/db');

  // Get the most recent date from RawMarketDaily
  const latestEntry = await db.rawMarketDaily.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (!latestEntry) {
    // Fallback: just return the first 10 coins with Binance symbols
    const supportedCoins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple',
      'cardano', 'dogecoin', 'avalanche-2', 'tron', 'polkadot'];
    return supportedCoins;
  }

  // Get top 10 coins by market cap rank from the latest date
  const topEntries = await db.rawMarketDaily.findMany({
    where: {
      date: latestEntry.date,
      marketCapRank: { not: null },
      coin: { coingeckoId: { not: 'tether' } },
    },
    orderBy: { marketCapRank: 'asc' },
    take: 10,
    select: {
      coin: { select: { coingeckoId: true } },
    },
  });

  return topEntries.map(e => e.coin.coingeckoId).filter(Boolean);
}
