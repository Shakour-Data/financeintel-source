/**
 * Behavioral Finance Scoring Engine
 * 
 * Based on 16 authoritative reference books:
 * 1. Kahneman — Thinking, Fast and Slow (System 1/System 2, overreaction, loss aversion)
 * 2. Shefrin — Beyond Greed and Fear (disposition effect, herding)
 * 3. Douglas — Trading in the Zone (probability thinking, emotional discipline)
 * 4. Montier — Behavioural Investing (overconfidence, confirmation bias)
 * 5. Shleifer — Inefficient Markets (arbitrage limits, noise trader risk)
 * 6. Tvede — The Psychology of Finance (sentiment cycles, turning points)
 * 7. Douglas — The Disciplined Trader (emotional barriers, discipline)
 * 8. Thaler — Nudge (choice architecture, default effects)
 * 9. Shermer — The Mind of the Market (evolutionary biases, neuroeconomics)
 * 10. Ariely — Predictably Irrational (anchoring, systematic errors)
 * 11. Statman — What Investors Really Want (expressive benefits, emotional utility, behavioral portfolio theory)
 * 12. Steenbarger — The Psychology of Trading (pattern recognition in emotional states, state-dependent trading)
 * 13. Dayton — Trade Mindfully (mindfulness in trading, cognitive defusion, present-moment awareness)
 * 14. Steenbarger — Trading Psychology 2.0 (optimal processes, resilience, best practices vs best processes)
 * 15. Hougaard — Best Loser Wins (loss management, accepting losses, high conviction trading)
 * 16. Tendler — The Mental Game of Trading (mental game classification, tilt detection)
 *
 * This engine detects behavioral biases and market psychology states
 * from observable market data (price, volume, volatility, breadth).
 * All scores are on 1-10 scale.
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface BehavioralBiasScores {
  /** Overreaction: large price swings followed by reversals (Kahneman Ch.12-13) */
  overreaction: number;
  /** Herding: many coins moving in same direction (Shefrin Ch.4, Montier Ch.9) */
  herding: number;
  /** Loss aversion: asymmetric volume response to gains vs losses (Kahneman Ch.26-28) */
  lossAversion: number;
  /** Disposition effect: selling winners early, holding losers (Shefrin Ch.2) */
  dispositionEffect: number;
  /** Overconfidence: excessive trading, high volume/mcap ratio (Montier Ch.1-2) */
  overconfidence: number;
  /** Anchoring: price clustering near round numbers (Ariely Ch.2) */
  anchoring: number;
  /** Fear & Greed: composite sentiment indicator (Tvede Ch.7-8) */
  fearGreed: number;
  /** Mean reversion: distance from moving average (Shleifer Ch.4-5) */
  meanReversion: number;
  /** Momentum persistence: trend continuation strength (Douglas Ch.8-9) */
  momentumPersistence: number;
  /** Noise trader risk: volatility from irrational participants (Shleifer Ch.3) */
  noiseTraderRisk: number;
  /** Emotional utility: trading driven by emotional/expressive benefits rather than rational utility (Statman Ch.3-4) */
  emotionalUtility: number;
  /** State dependence: emotional state affecting decision quality (Steenbarger Ch.5-6) */
  stateDependence: number;
  /** Mindfulness score: how calm/deliberate is the market — 10=most mindful (Dayton Ch.4-6) */
  mindfulnessScore: number;
  /** Resilience: how well market recovers from drops (Steenbarger 2.0 Ch.7-8) */
  resilience: number;
  /** Loss acceptance: how well market accepts losses without panic (Hougaard Ch.2-4) */
  lossAcceptance: number;
  /** Tilt risk: loss of emotional control, escalating behavior (Tendler Ch.1-3) */
  tiltRisk: number;
}

export type MarketRegime = 'panic' | 'fear' | 'neutral' | 'greed' | 'euphoria';

export interface BehavioralFinanceResult {
  /** Per-coin bias scores */
  coinScores: Record<string, BehavioralBiasScores>;
  /** Overall market bias scores (aggregated) */
  marketScores: BehavioralBiasScores;
  /** Detected market regime */
  marketRegime: MarketRegime;
  /** Regime confidence (0-1) */
  regimeConfidence: number;
  /** Fear & Greed Index (0-100, 0=Extreme Fear, 100=Extreme Greed) */
  fearGreedIndex: number;
  /** Behavioral risk level (1-10) */
  behavioralRiskLevel: number;
  /** Key behavioral signals detected */
  signals: BehavioralSignal[];
  /** Timestamp */
  computedAt: string;
}

export interface BehavioralSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  descriptionFa: string;
  affectedCoins: string[];
  reference: string; // Book reference
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5; // neutral when range is zero — avoid NaN
  return clamp((value - min) / (max - min), 0, 1);
}

function toScore(normalized: number): number {
  // Guard against NaN/Infinity — return neutral 5
  if (Number.isNaN(normalized) || !Number.isFinite(normalized)) return 5;
  return Math.round(Math.max(0, Math.min(1, normalized)) * 9 + 1);
}

// ═══════════════════════════════════════════════════════════════
// COIN-LEVEL BIAS DETECTION
// Uses raw market data to detect behavioral patterns
// ═══════════════════════════════════════════════════════════════

interface CoinMarketData {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  total_volume: number;
  market_cap: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  atl: number;
  circulating_supply: number;
  sparkline_in_7d?: { price: number[] };
}

function detectOverreaction(coin: CoinMarketData): number {
  /**
   * Kahneman — Thinking, Fast and Slow, Ch.12-13:
   * Overreaction bias: people overreact to salient/easily available information.
   * Detect: large 24h price moves (>|5%|) combined with price being near
   * the opposite extreme of the day's range (reversal pattern).
   * 
   * Score 1 = no overreaction, 10 = extreme overreaction
   */
  const pct24h = Math.abs(coin.price_change_percentage_24h ?? 0);
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h
    : 0;
  
  // Large daily move indicates potential overreaction
  const moveScore = normalize(pct24h, 0, 20);
  
  // Wide daily range relative to price suggests volatility from emotional trading
  const rangeScore = normalize(dailyRange * 100, 0, 15);
  
  // If price is near daily low but 24h change is positive (or vice versa),
  // it suggests intraday reversal — a sign of overreaction
  const pricePosition = coin.high_24h > coin.low_24h
    ? (coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)
    : 0.5;
  const isDirectionUp = (coin.price_change_percentage_24h ?? 0) > 0;
  const reversalDetected = (isDirectionUp && pricePosition < 0.3) || (!isDirectionUp && pricePosition > 0.7);
  const reversalScore = reversalDetected ? 0.7 : 0.2;
  
  return toScore(moveScore * 0.4 + rangeScore * 0.3 + reversalScore * 0.3);
}

function detectHerding(coin: CoinMarketData, allCoins: CoinMarketData[]): number {
  /**
   * Shefrin — Beyond Greed and Fear, Ch.4:
   * Herding: investors follow the crowd rather than independent analysis.
   * Montier — Behavioural Investing, Ch.9:
   * Groupthink leads to correlated mistakes.
   * 
   * Detect: How correlated is this coin's direction with the market?
   * If most coins move in same direction, herding is high.
   */
  const coinDirection = Math.sign(coin.price_change_percentage_24h ?? 0);
  const sameDirectionCount = allCoins.filter(c =>
    Math.sign(c.price_change_percentage_24h ?? 0) === coinDirection
  ).length;
  const herdRatio = sameDirectionCount / Math.max(allCoins.length, 1);
  
  // High volume relative to market cap suggests crowd following
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  const volumeHerding = normalize(volMcapRatio, 0, 0.2);
  
  return toScore(herdRatio * 0.6 + volumeHerding * 0.4);
}

function detectLossAversion(coin: CoinMarketData): number {
  /**
   * Kahneman — Thinking, Fast and Slow, Ch.26-28:
   * Loss aversion: losses hurt ~2x more than equivalent gains feel good.
   * People hold losers too long and sell winners too quickly.
   * 
   * Detect: Asymmetric volume response — volume increases more during
   * price drops than equivalent rises (panic selling vs calm buying).
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // High volume during price drops = loss aversion in action
  const isDeclining = pct24h < 0;
  const declineVolume = isDeclining ? normalize(volMcapRatio * 3, 0, 1) : 0;
  
  // Distance from ATH — the further below ATH, the more loss aversion kicks in
  const athDist = Math.abs(coin.ath_change_percentage ?? 0);
  const athDistScore = normalize(athDist, 0, 80);
  
  // Steep decline + high volume = strong loss aversion
  const steepness = normalize(Math.abs(pct24h), 0, 15);
  
  return toScore(declineVolume * 0.35 + athDistScore * 0.35 + steepness * 0.3);
}

function detectDispositionEffect(coin: CoinMarketData): number {
  /**
   * Shefrin — Beyond Greed and Fear, Ch.2:
   * Disposition effect: investors sell winners too early and hold losers too long.
   * 
   * Detect: Volume patterns near ATH (selling pressure near highs = 
   * premature profit-taking) vs low volume near ATL (holding losers).
   */
  const athDist = Math.abs(coin.ath_change_percentage ?? 0);
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Near ATH (within 20%) with high volume = selling winners (disposition)
  const nearATH = athDist < 20;
  const athVolumeScore = nearATH ? normalize(volMcapRatio * 2, 0, 0.15) : 0;
  
  // Far from ATH (deep losses) with LOW volume = holding losers
  const farFromATH = athDist > 50;
  const holdingLosers = farFromATH ? (1 - normalize(volMcapRatio, 0, 0.1)) * 0.5 : 0;
  
  return toScore(athVolumeScore * 0.5 + holdingLosers * 0.5);
}

function detectOverconfidence(coin: CoinMarketData): number {
  /**
   * Montier — Behavioural Investing, Ch.1-2:
   * Overconfidence: traders trade too much, overestimating their skill.
   * 
   * Detect: Unusually high volume/market cap ratio (>5% daily turnover)
   * suggests excessive trading activity beyond what fundamentals justify.
   */
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Higher turnover = more overconfidence
  const turnoverScore = normalize(volMcapRatio, 0, 0.3);
  
  // Large price swings with high volume = overconfident directional bets
  const pctAbs = Math.abs(coin.price_change_percentage_24h ?? 0);
  const confidentBetting = pctAbs > 5 && volMcapRatio > 0.05 ? 0.7 : 0.2;
  
  return toScore(turnoverScore * 0.5 + confidentBetting * 0.5);
}

function detectAnchoring(coin: CoinMarketData): number {
  /**
   * Ariely — Predictably Irrational, Ch.2:
   * Anchoring: people fixate on arbitrary reference points (round numbers).
   * 
   * Detect: Price proximity to psychologically significant levels
   * (ATH, ATL, round numbers like $10, $100, $1000, $10000).
   */
  const price = coin.current_price;
  
  // Check proximity to round number levels
  const roundLevels = [0.01, 0.1, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
  let minRoundDist = 1;
  for (const level of roundLevels) {
    if (level > 0) {
      const dist = Math.abs(price - level) / level;
      if (dist < minRoundDist) minRoundDist = dist;
    }
  }
  
  // Near ATH = strong anchor
  const nearATH = Math.abs(coin.ath_change_percentage ?? 100) < 10 ? 0.6 : 0.1;
  
  // Near ATL = strong anchor
  const nearATL = price > 0 && coin.atl > 0
    ? (price - coin.atl) / coin.atl < 0.2 ? 0.5 : 0.1
    : 0.1;
  
  const roundNumberScore = 1 - normalize(minRoundDist, 0, 0.1);
  
  return toScore(roundNumberScore * 0.3 + nearATH * 0.35 + nearATL * 0.35);
}

function detectFearGreed(coin: CoinMarketData): number {
  /**
   * Tvede — The Psychology of Finance, Ch.7-8:
   * Market sentiment cycles between fear and greed extremes.
   * 
   * Composite from:
   * - Price momentum (24h, 7d)
   * - Volume intensity
   * - Volatility (daily range)
   * - ATH proximity
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const pct7d = coin.price_change_percentage_7d_in_currency ?? pct24h * 2;
  
  // Momentum component
  const momentumScore = normalize(pct24h, -10, 10);
  
  // Volume intensity (greed = high volume on up days, fear = high volume on down days)
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  const volumeIntensity = normalize(volMcapRatio, 0, 0.2);
  const volumeDirection = pct24h > 0 ? volumeIntensity : (1 - volumeIntensity);
  
  // Volatility (high vol = fear)
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100
    : 3;
  const volatilityFear = 1 - normalize(dailyRange, 0, 15);
  
  // ATH proximity (near ATH = greed)
  const athProximity = 1 - normalize(Math.abs(coin.ath_change_percentage ?? 50), 0, 50);
  
  return toScore(momentumScore * 0.3 + volumeDirection * 0.25 + volatilityFear * 0.2 + athProximity * 0.25);
}

function detectMeanReversion(coin: CoinMarketData): number {
  /**
   * Shleifer — Inefficient Markets, Ch.4-5:
   * Prices eventually revert to fundamental values, but the process is slow.
   * 
   * Detect: How far price has deviated from recent average.
   * Use sparkline data if available, otherwise use ATH/ATL position.
   */
  if (coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length > 10) {
    const prices = coin.sparkline_in_7d.price;
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const current = prices[prices.length - 1];
    const deviation = avg > 0 ? Math.abs(current - avg) / avg : 0;
    return toScore(normalize(deviation * 100, 0, 20));
  }
  
  // Fallback: use ATH/ATL position
  const range = coin.ath - coin.atl;
  if (range <= 0) return 5;
  const position = (coin.current_price - coin.atl) / range;
  const extremePosition = Math.abs(position - 0.5) * 2; // 0=center, 1=extreme
  
  return toScore(extremePosition);
}

function detectMomentumPersistence(coin: CoinMarketData): number {
  /**
   * Douglas — Trading in the Zone, Ch.8-9:
   * Successful traders think in probabilities, not certainties.
   * Momentum persistence indicates trend strength.
   * 
   * Detect: Consistency of directional movement across timeframes.
   */
  const pct1h = coin.price_change_percentage_24h !== undefined
    ? coin.price_change_percentage_24h * 0.1 // Approximate 1h from 24h
    : 0;
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const pct7d = coin.price_change_percentage_7d_in_currency ?? pct24h;
  
  // Count how many timeframes agree in direction
  const directions = [Math.sign(pct1h), Math.sign(pct24h), Math.sign(pct7d)];
  const positiveCount = directions.filter(d => d > 0).length;
  const negativeCount = directions.filter(d => d < 0).length;
  const agreement = Math.max(positiveCount, negativeCount) / 3;
  
  // Magnitude consistency
  const magnitudes = [Math.abs(pct1h), Math.abs(pct24h), Math.abs(pct7d)];
  const avgMagnitude = magnitudes.reduce((s, m) => s + m, 0) / 3;
  const magnitudeScore = normalize(avgMagnitude, 0, 15);
  
  return toScore(agreement * 0.6 + magnitudeScore * 0.4);
}

function detectNoiseTraderRisk(coin: CoinMarketData): number {
  /**
   * Shleifer — Inefficient Markets, Ch.3:
   * Noise traders create risk through unpredictable, sentiment-driven trades.
   * 
   * Detect: Volatility + volume anomaly (high vol + high range = noise).
   */
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100
    : 3;
  
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Small caps are more susceptible to noise traders
  const mcapVulnerability = 1 - normalize(coin.market_cap, 1e8, 1e12);
  
  const volatilityScore = normalize(dailyRange, 0, 15);
  const volumeScore = normalize(volMcapRatio, 0, 0.2);
  
  return toScore(volatilityScore * 0.35 + volumeScore * 0.3 + mcapVulnerability * 0.35);
}

function detectEmotionalUtility(coin: CoinMarketData): number {
  /**
   * Statman — What Investors Really Want, Ch.3-4:
   * Investors seek expressive and emotional benefits beyond rational utility.
   * Behavioral portfolio theory: people hold portfolios for emotional satisfaction,
   * not just risk-return optimization.
   * 
   * Detect: High volume + high volatility on small-cap coins suggests
   * emotional/expressive trading rather than rational investment.
   * Small-cap coins with extreme activity are driven by emotional utility.
   * 
   * Score 1 = rational trading, 10 = emotionally driven
   */
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100
    : 3;
  
  // Small-cap coins are more susceptible to emotional trading
  const smallCapBonus = coin.market_cap < 1e9 ? 0.3 : (coin.market_cap < 1e10 ? 0.15 : 0);
  
  // High volume on small caps = emotional/expressive benefits driving trades
  const volumeEmotion = normalize(volMcapRatio, 0, 0.25);
  
  // High volatility = excitement-driven trading (lottery-like behavior)
  const volatilityEmotion = normalize(dailyRange, 0, 15);
  
  // Large absolute price moves (lottery ticket preference, Statman Ch.3)
  const pctAbs = Math.abs(coin.price_change_percentage_24h ?? 0);
  const lotteryEffect = normalize(pctAbs, 0, 20);
  
  const total = volumeEmotion * 0.3 + volatilityEmotion * 0.3 + lotteryEffect * 0.2 + smallCapBonus;
  return toScore(clamp(total, 0, 1));
}

function detectStateDependence(coin: CoinMarketData): number {
  /**
   * Steenbarger — The Psychology of Trading, Ch.5-6:
   * Trading decisions are state-dependent: emotional states affect
   * decision quality. Pattern recognition in emotional states shows
   * that traders in distressed states make poor decisions.
   * 
   * Detect: Price acceleration + volume spikes indicate emotionally
   * driven state changes. When price changes accelerate and volume
   * surges, participants are in altered emotional states.
   * 
   * Score 1 = calm/neutral state, 10 = highly state-dependent
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const pct7d = coin.price_change_percentage_7d_in_currency ?? pct24h;
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Price acceleration: 24h move much larger than 7d daily average
  const dailyAvg7d = Math.abs(pct7d) / 7;
  const acceleration = dailyAvg7d > 0 ? Math.abs(pct24h) / dailyAvg7d : 1;
  const accelerationScore = normalize(acceleration, 1, 5);
  
  // Volume spike relative to normal (high vol/mcap = state change)
  const volumeSpike = normalize(volMcapRatio, 0, 0.2);
  
  // Extreme price moves indicate state-dependent decisions
  const extremeMove = normalize(Math.abs(pct24h), 0, 15);
  
  // Direction changes (24h vs 7d direction) = unstable emotional state
  const dirChange = Math.sign(pct24h) !== Math.sign(pct7d) ? 0.4 : 0.1;
  
  const total = accelerationScore * 0.3 + volumeSpike * 0.25 + extremeMove * 0.25 + dirChange;
  return toScore(clamp(total, 0, 1));
}

function detectMindfulnessScore(coin: CoinMarketData): number {
  /**
   * Dayton — Trade Mindfully, Ch.4-6:
   * Mindfulness in trading: cognitive defusion, present-moment awareness,
   * and non-reactive observation of market conditions.
   * 
   * This is an INVERSE metric: higher = more mindful/calm.
   * Low volatility + steady trends = mindful market behavior.
   * Chaotic/jumpy price action = not mindful (reactive, impulsive).
   * 
   * Score 1 = chaotic/reactive, 10 = most mindful/calm
   */
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100
    : 3;
  const pct24h = Math.abs(coin.price_change_percentage_24h ?? 0);
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Low volatility = mindful (inverse)
  const lowVolatility = 1 - normalize(dailyRange, 0, 15);
  
  // Small, steady price moves = mindful (inverse of extreme moves)
  const steadyMove = 1 - normalize(pct24h, 0, 10);
  
  // Orderly volume (not extreme) = mindful
  const orderlyVolume = 1 - normalize(volMcapRatio, 0, 0.2);
  
  // Price near 7d average (if sparkline available) = mindful
  let trendSteadiness = 0.5;
  if (coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length > 10) {
    const prices = coin.sparkline_in_7d.price;
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    // Calculate coefficient of variation (lower = more stable)
    const variance = prices.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / prices.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
    trendSteadiness = 1 - normalize(cv * 100, 0, 10);
  }
  
  return toScore(lowVolatility * 0.3 + steadyMove * 0.2 + orderlyVolume * 0.2 + trendSteadiness * 0.3);
}

function detectResilience(coin: CoinMarketData): number {
  /**
   * Steenbarger — Trading Psychology 2.0, Ch.7-8:
   * Resilience: the ability to recover from setbacks using optimal processes.
   * Best processes vs best practices — focus on what works in recovery.
   * 
   * Detect: How well does the coin recover from drops?
   * Quick bounce after a dip = high resilience.
   * Extended decline with no recovery = low resilience.
   * 
   * Score 1 = no recovery, 10 = strong bounce-back
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const pricePosition = coin.high_24h > coin.low_24h
    ? (coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)
    : 0.5;
  
  // If coin is declining, check how close to daily low vs daily high
  // Near high despite negative 24h = bounced back (resilient)
  const isDeclining = pct24h < 0;
  const bounceFromLow = isDeclining && pricePosition > 0.6 ? 0.7 : 
                        isDeclining && pricePosition > 0.4 ? 0.4 : 0.1;
  
  // If coin is declining but 7d trend is positive = resilient recovery
  const pct7d = coin.price_change_percentage_7d_in_currency ?? pct24h;
  const weeklyRecovery = isDeclining && pct7d > 0 ? 0.6 : 0.1;
  
  // Volume on recovery — higher volume on up days after dips shows resilience
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  const recoveryVolume = !isDeclining ? normalize(volMcapRatio, 0, 0.15) : 0.1;
  
  // Distance from ATL (further from ATL = more resilient historically)
  const atlDistance = coin.atl > 0 && coin.current_price > 0
    ? (coin.current_price - coin.atl) / coin.atl
    : 0;
  const historicalResilience = normalize(Math.log10(Math.max(atlDistance, 1)), 0, 4);
  
  return toScore(bounceFromLow * 0.3 + weeklyRecovery * 0.25 + recoveryVolume * 0.2 + historicalResilience * 0.25);
}

function detectLossAcceptance(coin: CoinMarketData): number {
  /**
   * Hougaard — Best Loser Wins, Ch.2-4:
   * Loss management and acceptance: successful traders accept losses
   * as part of the process. High conviction trading requires the ability
   * to take losses without emotional destabilization.
   * 
   * Detect: How well does the market accept losses?
   * Low panic selling on declines + orderly volume = high acceptance.
   * Panic volume on declines = low acceptance.
   * 
   * Score 1 = panic/low acceptance, 10 = orderly/high acceptance
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  const isDeclining = pct24h < 0;
  
  // If declining, low volume = acceptance (not panic selling)
  // If advancing, this component is neutral (0.5)
  const declineAcceptance = isDeclining
    ? 1 - normalize(volMcapRatio, 0, 0.2) // Low volume on decline = acceptance
    : 0.5;
  
  // Moderate declines (orderly, not crash-like) = acceptance
  const orderlyDecline = isDeclining
    ? 1 - normalize(Math.abs(pct24h), 0, 15) // Small decline = more acceptance
    : 0.7; // Advancing = generally good acceptance
  
  // Price position relative to daily range (near high on down day = holding)
  const pricePosition = coin.high_24h > coin.low_24h
    ? (coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)
    : 0.5;
  const holdingPattern = isDeclining ? normalize(pricePosition, 0, 1) : 0.7;
  
  // ATH distance factor — coins that have accepted prior losses recover
  const athDist = Math.abs(coin.ath_change_percentage ?? 0);
  const priorLossAcceptance = athDist > 30 && athDist < 70 ? 0.5 : 0.3;
  
  const total = declineAcceptance * 0.3 + orderlyDecline * 0.25 + holdingPattern * 0.25 + priorLossAcceptance;
  return toScore(clamp(total, 0, 1));
}

function detectTiltRisk(coin: CoinMarketData): number {
  /**
   * Tendler — The Mental Game of Trading, Ch.1-3:
   * Tilt: when market participants lose emotional control.
   * Mental game classification: anger, fear, motivation, confidence issues.
   * Tilt detection: escalating emotional responses create predictable
   * patterns of increasingly poor decisions.
   * 
   * Detect: Consecutive extreme moves + escalating volume = high tilt risk.
   * When participants are on tilt, they make increasingly emotional,
   * impulsive decisions with escalating commitment.
   * 
   * Score 1 = calm/controlled, 10 = extreme tilt/emotional dysregulation
   */
  const pct24h = coin.price_change_percentage_24h ?? 0;
  const pct7d = coin.price_change_percentage_7d_in_currency ?? pct24h;
  const volMcapRatio = coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0;
  
  // Consecutive extreme moves (24h and 7d both extreme in same direction)
  const bothExtreme = Math.abs(pct24h) > 5 && Math.abs(pct7d) > 10;
  const consecutiveExtremes = bothExtreme ? 0.7 : (Math.abs(pct24h) > 5 ? 0.4 : 0.1);
  
  // Escalating volume (high volume suggests escalating commitment)
  const escalatingVolume = normalize(volMcapRatio, 0, 0.2);
  
  // Accelerating losses (negative 7d + more negative 24h = tilt spiral)
  const isTiltSpiral = pct7d < -5 && pct24h < -3;
  const tiltSpiral = isTiltSpiral ? 0.8 : (pct24h < -5 ? 0.4 : 0.1);
  
  // Volatility spikes (wide daily range = emotional dysregulation)
  const dailyRange = coin.high_24h > 0 && coin.low_24h > 0
    ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100
    : 3;
  const volatilityTilt = normalize(dailyRange, 0, 15);
  
  return toScore(consecutiveExtremes * 0.3 + escalatingVolume * 0.2 + tiltSpiral * 0.3 + volatilityTilt * 0.2);
}

// ═══════════════════════════════════════════════════════════════
// MARKET-LEVEL AGGREGATION
// ═══════════════════════════════════════════════════════════════

function detectMarketHerding(allCoins: CoinMarketData[]): number {
  /** How many coins are moving in the same direction? */
  const directions = allCoins.map(c => Math.sign(c.price_change_percentage_24h ?? 0));
  const positive = directions.filter(d => d > 0).length;
  const negative = directions.filter(d => d < 0).length;
  const total = directions.length || 1;
  const majority = Math.max(positive, negative) / total;
  return toScore(normalize(majority, 0.5, 1));
}

function detectMarketOverreaction(allCoins: CoinMarketData[]): number {
  /** Average magnitude of daily moves across all coins */
  const avgMagnitude = allCoins.reduce((s, c) => s + Math.abs(c.price_change_percentage_24h ?? 0), 0) / (allCoins.length || 1);
  return toScore(normalize(avgMagnitude, 0, 10));
}

function detectMarketFearGreed(allCoins: CoinMarketData[]): { score: number; index: number; regime: MarketRegime; confidence: number } {
  /**
   * Composite Fear & Greed Index based on Tvede's framework:
   * - Market momentum (avg 24h change)
   * - Volume intensity (avg volume/mcap)
   * - Market breadth (% of coins advancing)
   * - Volatility (avg daily range)
   */
  const n = allCoins.length || 1;
  
  // 1. Market Momentum (25%)
  const avgMomentum = allCoins.reduce((s, c) => s + (c.price_change_percentage_24h ?? 0), 0) / n;
  const momentumComponent = normalize(avgMomentum, -5, 5);
  
  // 2. Volume Intensity (20%)
  const avgVolRatio = allCoins.reduce((s, c) => s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / n;
  const volumeComponent = normalize(avgVolRatio, 0, 0.15);
  
  // 3. Market Breadth (30%) — % of coins advancing
  const advancing = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) > 0).length;
  const breadthComponent = advancing / n;
  
  // 4. Volatility (25%) — inverse (low vol = greed comfort, high vol = fear)
  const avgDailyRange = allCoins.reduce((s, c) => {
    const range = c.high_24h > 0 && c.low_24h > 0
      ? (c.high_24h - c.low_24h) / c.low_24h * 100
      : 3;
    return s + range;
  }, 0) / n;
  const volatilityComponent = 1 - normalize(avgDailyRange, 0, 15);
  
  // Composite index (0-100)
  const composite = (momentumComponent * 0.25 + volumeComponent * 0.20 + breadthComponent * 0.30 + volatilityComponent * 0.25);
  const fearGreedIndex = Math.round(composite * 100);
  
  // Score 1-10 (1=Extreme Fear, 10=Extreme Greed)
  const score = toScore(composite);
  
  // Determine regime
  let regime: MarketRegime;
  let confidence: number;
  
  if (fearGreedIndex <= 15) {
    regime = 'panic';
    confidence = normalize(15 - fearGreedIndex, 0, 15);
  } else if (fearGreedIndex <= 35) {
    regime = 'fear';
    confidence = normalize(fearGreedIndex - 15, 0, 20);
  } else if (fearGreedIndex <= 65) {
    regime = 'neutral';
    confidence = 1 - normalize(Math.abs(fearGreedIndex - 50), 0, 15);
  } else if (fearGreedIndex <= 85) {
    regime = 'greed';
    confidence = normalize(fearGreedIndex - 65, 0, 20);
  } else {
    regime = 'euphoria';
    confidence = normalize(fearGreedIndex - 85, 0, 15);
  }
  
  return { score, index: fearGreedIndex, regime, confidence };
}

function detectMarketLossAversion(allCoins: CoinMarketData[]): number {
  /** Average loss aversion across declining coins */
  const declining = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) < 0);
  if (declining.length === 0) return 1;
  
  const avgDeclineVolume = declining.reduce((s, c) => 
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / declining.length;
  const avgAllVolume = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / allCoins.length;
  
  // If declining coins have higher volume than average, loss aversion is present
  const volumeAsymmetry = avgAllVolume > 0 ? avgDeclineVolume / avgAllVolume : 1;
  return toScore(normalize(volumeAsymmetry, 1, 3));
}

function detectMarketOverconfidence(allCoins: CoinMarketData[]): number {
  /** Average volume/mcap ratio across all coins */
  const avgTurnover = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / (allCoins.length || 1);
  return toScore(normalize(avgTurnover, 0, 0.15));
}

function detectMarketNoiseTraderRisk(allCoins: CoinMarketData[]): number {
  /** Average volatility across all coins */
  const avgRange = allCoins.reduce((s, c) => {
    const range = c.high_24h > 0 && c.low_24h > 0
      ? (c.high_24h - c.low_24h) / c.low_24h * 100
      : 3;
    return s + range;
  }, 0) / (allCoins.length || 1);
  return toScore(normalize(avgRange, 0, 12));
}

function detectMarketDispositionEffect(allCoins: CoinMarketData[]): number {
  /** Coins near ATH with high volume vs coins far from ATH with low volume */
  const nearATH = allCoins.filter(c => Math.abs(c.ath_change_percentage ?? 100) < 15);
  const farFromATH = allCoins.filter(c => Math.abs(c.ath_change_percentage ?? 100) > 50);
  
  const nearATHVolume = nearATH.length > 0
    ? nearATH.reduce((s, c) => s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / nearATH.length
    : 0;
  const farFromATHVolume = farFromATH.length > 0
    ? farFromATH.reduce((s, c) => s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / farFromATH.length
    : 0;
  
  // High volume near ATH (selling winners) + low volume far from ATH (holding losers)
  const dispositionSignal = nearATHVolume > 0 ? (nearATHVolume / Math.max(farFromATHVolume, 0.001)) : 1;
  return toScore(normalize(dispositionSignal, 0.5, 3));
}

function detectMarketAnchoring(allCoins: CoinMarketData[]): number {
  /** How many coins are near round number levels */
  const roundLevels = [0.01, 0.1, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];
  let anchoredCount = 0;
  
  for (const coin of allCoins) {
    for (const level of roundLevels) {
      if (level > 0 && Math.abs(coin.current_price - level) / level < 0.03) {
        anchoredCount++;
        break;
      }
    }
  }
  
  return toScore(normalize(anchoredCount / Math.max(allCoins.length, 1), 0, 0.3));
}

function detectMarketMeanReversion(allCoins: CoinMarketData[]): number {
  /** Average mean reversion signal across coins */
  const scores = allCoins.map(coin => {
    if (coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length > 10) {
      const prices = coin.sparkline_in_7d.price;
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      const current = prices[prices.length - 1];
      return avg > 0 ? Math.abs(current - avg) / avg : 0;
    }
    return 0.05; // default small deviation
  });
  
  const avgDeviation = scores.reduce((s, d) => s + d, 0) / (scores.length || 1);
  return toScore(normalize(avgDeviation * 100, 0, 15));
}

function detectMarketMomentumPersistence(allCoins: CoinMarketData[]): number {
  /** Market-wide trend consistency */
  const directions = allCoins.map(c => Math.sign(c.price_change_percentage_24h ?? 0));
  const positive = directions.filter(d => d > 0).length;
  const majority = Math.max(positive, directions.length - positive) / (directions.length || 1);
  return toScore(normalize(majority, 0.5, 1));
}

function detectMarketEmotionalUtility(allCoins: CoinMarketData[]): number {
  /**
   * Statman — What Investors Really Want, Ch.3-4:
   * Market-wide emotional trading: average emotional utility across all coins.
   * Small-cap coins with extreme activity drive market-level emotional utility.
   * 
   * Detect: Average volume/mcap ratio weighted toward small-cap activity
   * indicates market driven by expressive/emotional benefits.
   */
  const n = allCoins.length || 1;
  
  // Average volume/mcap ratio (higher = more emotional trading)
  const avgVolRatio = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / n;
  
  // Small-cap activity ratio (% of volume from small caps)
  const smallCapVolume = allCoins
    .filter(c => c.market_cap < 5e9)
    .reduce((s, c) => s + c.total_volume, 0);
  const totalVolume = allCoins.reduce((s, c) => s + c.total_volume, 0);
  const smallCapRatio = totalVolume > 0 ? smallCapVolume / totalVolume : 0;
  
  // Average daily range (higher = more emotional)
  const avgDailyRange = allCoins.reduce((s, c) => {
    const range = c.high_24h > 0 && c.low_24h > 0
      ? (c.high_24h - c.low_24h) / c.low_24h * 100
      : 3;
    return s + range;
  }, 0) / n;
  
  return toScore(
    normalize(avgVolRatio, 0, 0.15) * 0.35 +
    normalize(smallCapRatio, 0, 0.5) * 0.3 +
    normalize(avgDailyRange, 0, 12) * 0.35
  );
}

function detectMarketStateDependence(allCoins: CoinMarketData[]): number {
  /**
   * Steenbarger — The Psychology of Trading, Ch.5-6:
   * Market-wide state dependence: when the overall market is in an
   * emotionally altered state, decisions across participants degrade.
   * 
   * Detect: Market-wide acceleration in price changes + volume spikes
   * indicate the market is in a state-dependent mode.
   */
  const n = allCoins.length || 1;
  
  // How many coins show acceleration (24h move > 7d daily average)
  const accelerating = allCoins.filter(c => {
    const pct24h = Math.abs(c.price_change_percentage_24h ?? 0);
    const pct7d = Math.abs(c.price_change_percentage_7d_in_currency ?? pct24h * 7);
    const dailyAvg7d = pct7d / 7;
    return dailyAvg7d > 0 && pct24h > dailyAvg7d * 2;
  }).length;
  const accelerationRatio = accelerating / n;
  
  // Average volume intensity
  const avgVolRatio = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / n;
  
  // Direction inconsistency (many direction changes = unstable state)
  const directionChanges = allCoins.filter(c => {
    const pct24h = c.price_change_percentage_24h ?? 0;
    const pct7d = c.price_change_percentage_7d_in_currency ?? pct24h;
    return Math.sign(pct24h) !== Math.sign(pct7d);
  }).length;
  const instabilityRatio = directionChanges / n;
  
  return toScore(
    normalize(accelerationRatio, 0, 0.5) * 0.35 +
    normalize(avgVolRatio, 0, 0.15) * 0.3 +
    normalize(instabilityRatio, 0, 0.4) * 0.35
  );
}

function detectMarketMindfulnessScore(allCoins: CoinMarketData[]): number {
  /**
   * Dayton — Trade Mindfully, Ch.4-6:
   * Market-wide mindfulness: how calm and deliberate is the overall market?
   * Inverse metric: higher = more mindful.
   * 
   * Detect: Low average volatility + low average volume intensity + 
   * steady trends across coins = mindful market.
   */
  const n = allCoins.length || 1;
  
  // Low average volatility = mindful
  const avgDailyRange = allCoins.reduce((s, c) => {
    const range = c.high_24h > 0 && c.low_24h > 0
      ? (c.high_24h - c.low_24h) / c.low_24h * 100
      : 3;
    return s + range;
  }, 0) / n;
  const lowVolatility = 1 - normalize(avgDailyRange, 0, 12);
  
  // Orderly volume = mindful
  const avgVolRatio = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / n;
  const orderlyVolume = 1 - normalize(avgVolRatio, 0, 0.15);
  
  // Small average absolute move = calm/deliberate
  const avgAbsMove = allCoins.reduce((s, c) =>
    s + Math.abs(c.price_change_percentage_24h ?? 0), 0) / n;
  const calmMoves = 1 - normalize(avgAbsMove, 0, 8);
  
  // Consistent direction (majority moving one way steadily)
  const advancing = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) > 0).length;
  const declining = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) < 0).length;
  const neutrality = 1 - Math.abs(advancing - declining) / n;
  
  return toScore(
    lowVolatility * 0.35 +
    orderlyVolume * 0.25 +
    calmMoves * 0.25 +
    neutrality * 0.15
  );
}

function detectMarketResilience(allCoins: CoinMarketData[]): number {
  /**
   * Steenbarger — Trading Psychology 2.0, Ch.7-8:
   * Market-wide resilience: how well the overall market recovers from drops.
   * Focus on optimal recovery processes.
   * 
   * Detect: Coins that are declining but near their daily highs (bounced back)
   * indicate market resilience. Also, positive weekly trend despite daily dips.
   */
  const n = allCoins.length || 1;
  
  // How many declining coins bounced (near daily high despite negative 24h)
  const declining = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) < 0);
  const bouncedBack = declining.filter(c => {
    const pos = c.high_24h > c.low_24h
      ? (c.current_price - c.low_24h) / (c.high_24h - c.low_24h)
      : 0.5;
    return pos > 0.5;
  });
  const bounceRatio = declining.length > 0 ? bouncedBack.length / declining.length : 0.5;
  
  // How many coins have positive 7d despite negative 24h
  const resilientWeekly = allCoins.filter(c =>
    (c.price_change_percentage_24h ?? 0) < 0 &&
    (c.price_change_percentage_7d_in_currency ?? c.price_change_percentage_24h ?? 0) > 0
  ).length;
  const weeklyResilienceRatio = declining.length > 0 ? resilientWeekly / declining.length : 0.5;
  
  // Average distance from ATL (further = more historically resilient)
  const avgAtlDistance = allCoins.reduce((s, c) => {
    const dist = c.atl > 0 && c.current_price > 0
      ? (c.current_price - c.atl) / c.atl
      : 1;
    return s + Math.log10(Math.max(dist, 1));
  }, 0) / n;
  
  return toScore(
    normalize(bounceRatio, 0, 1) * 0.35 +
    normalize(weeklyResilienceRatio, 0, 0.5) * 0.35 +
    normalize(avgAtlDistance, 0, 4) * 0.3
  );
}

function detectMarketLossAcceptance(allCoins: CoinMarketData[]): number {
  /**
   * Hougaard — Best Loser Wins, Ch.2-4:
   * Market-wide loss acceptance: how well does the market handle losses?
   * 
   * Detect: Low panic volume on declining coins + orderly market structure
   * = high loss acceptance. Panic selling = low acceptance.
   */
  const declining = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) < 0);
  const n = allCoins.length || 1;
  
  // Declining coins with low volume relative to advancing coins = acceptance
  const decliningAvgVol = declining.length > 0
    ? declining.reduce((s, c) => s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / declining.length
    : 0.05;
  const advancingAvgVol = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) > 0).reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / Math.max(allCoins.filter(c => (c.price_change_percentage_24h ?? 0) > 0).length, 1);
  
  // If declining volume < advancing volume = acceptance (no panic)
  const volumeAcceptance = advancingAvgVol > 0
    ? 1 - normalize(decliningAvgVol / advancingAvgVol, 0, 3)
    : 0.5;
  
  // Moderate declines (not crashes) = acceptance
  const avgDeclineMagnitude = declining.length > 0
    ? declining.reduce((s, c) => s + Math.abs(c.price_change_percentage_24h ?? 0), 0) / declining.length
    : 0;
  const orderlyDeclines = 1 - normalize(avgDeclineMagnitude, 0, 10);
  
  // Overall market calmness
  const avgAbsMove = allCoins.reduce((s, c) =>
    s + Math.abs(c.price_change_percentage_24h ?? 0), 0) / n;
  const marketCalmness = 1 - normalize(avgAbsMove, 0, 8);
  
  return toScore(
    volumeAcceptance * 0.4 +
    orderlyDeclines * 0.3 +
    marketCalmness * 0.3
  );
}

function detectMarketTiltRisk(allCoins: CoinMarketData[]): number {
  /**
   * Tendler — The Mental Game of Trading, Ch.1-3:
   * Market-wide tilt risk: when the overall market loses emotional control.
   * Tilt is characterized by escalating emotional responses and
   * increasingly poor collective decision-making.
   * 
   * Detect: Many coins with consecutive extreme moves + escalating
   * market-wide volume = high tilt risk across the market.
   */
  const n = allCoins.length || 1;
  
  // How many coins show extreme moves (|24h| > 5%)
  const extremeMovers = allCoins.filter(c =>
    Math.abs(c.price_change_percentage_24h ?? 0) > 5
  ).length;
  const extremeRatio = extremeMovers / n;
  
  // How many coins show tilt spiral (negative 7d + negative 24h accelerating)
  const tiltSpirals = allCoins.filter(c => {
    const pct24h = c.price_change_percentage_24h ?? 0;
    const pct7d = c.price_change_percentage_7d_in_currency ?? pct24h;
    return pct7d < -5 && pct24h < -3;
  }).length;
  const spiralRatio = tiltSpirals / n;
  
  // Market-wide volume intensity (escalating commitment)
  const avgVolRatio = allCoins.reduce((s, c) =>
    s + (c.market_cap > 0 ? c.total_volume / c.market_cap : 0), 0) / n;
  const volumeEscalation = normalize(avgVolRatio, 0, 0.15);
  
  // Average daily range (wide ranges = emotional dysregulation)
  const avgDailyRange = allCoins.reduce((s, c) => {
    const range = c.high_24h > 0 && c.low_24h > 0
      ? (c.high_24h - c.low_24h) / c.low_24h * 100
      : 3;
    return s + range;
  }, 0) / n;
  const volatilityTilt = normalize(avgDailyRange, 0, 12);
  
  return toScore(
    normalize(extremeRatio, 0, 0.4) * 0.25 +
    normalize(spiralRatio, 0, 0.3) * 0.3 +
    volumeEscalation * 0.2 +
    volatilityTilt * 0.25
  );
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════

function generateSignals(
  marketScores: BehavioralBiasScores,
  marketRegime: MarketRegime,
  allCoins: CoinMarketData[],
  coinScores: Record<string, BehavioralBiasScores>,
): BehavioralSignal[] {
  const signals: BehavioralSignal[] = [];
  
  // Overreaction signals
  if (marketScores.overreaction >= 7) {
    const overreactingCoins = Object.entries(coinScores)
      .filter(([_, s]) => s.overreaction >= 7)
      .map(([id]) => id);
    signals.push({
      type: 'overreaction',
      severity: marketScores.overreaction >= 9 ? 'critical' : 'high',
      description: 'Significant market overreaction detected — large price swings with reversal patterns suggest emotional rather than rational trading',
      descriptionFa: 'Market overreaction detected — large price swings with reversal patterns indicate emotional trading',
      affectedCoins: overreactingCoins.slice(0, 5),
      reference: 'Kahneman — Thinking, Fast and Slow, Ch.12-13',
      confidence: 0.85,
    });
  }
  
  // Herding signals
  if (marketScores.herding >= 7) {
    const advancing = allCoins.filter(c => (c.price_change_percentage_24h ?? 0) > 0).length;
    const declining = allCoins.length - advancing;
    signals.push({
      type: 'herding',
      severity: marketScores.herding >= 9 ? 'critical' : 'high',
      description: `Strong herding behavior — ${advancing} coins advancing, ${declining} declining simultaneously, suggesting crowd-following rather than independent analysis`,
      descriptionFa: `Strong herding behavior — ${advancing} coins advancing, ${declining} declining, indicating crowd-following rather than independent analysis`,
      affectedCoins: allCoins.slice(0, 5).map(c => c.id),
      reference: 'Shefrin — Beyond Greed and Fear, Ch.4; Montier — Behavioural Investing, Ch.9',
      confidence: 0.8,
    });
  }
  
  // Fear/Greed regime signals
  if (marketRegime === 'panic' || marketRegime === 'euphoria') {
    signals.push({
      type: 'market_regime',
      severity: 'critical',
      description: `Market is in ${marketRegime} mode — extreme ${marketRegime === 'panic' ? 'fear-driven selling' : 'greed-driven buying'} creates systemic risk and potential ${marketRegime === 'panic' ? 'oversold' : 'overbought'} conditions`,
      descriptionFa: `Market in ${marketRegime === 'panic' ? 'panic' : 'euphoria'} state — ${marketRegime === 'panic' ? 'fear-driven selling' : 'greed-driven buying'} creating systematic risk`,
      affectedCoins: allCoins.slice(0, 5).map(c => c.id),
      reference: 'Tvede — The Psychology of Finance, Ch.7-8',
      confidence: 0.9,
    });
  }
  
  // Loss aversion signal
  if (marketScores.lossAversion >= 7) {
    const decliningCoins = allCoins
      .filter(c => (c.price_change_percentage_24h ?? 0) < -3)
      .map(c => c.id);
    signals.push({
      type: 'loss_aversion',
      severity: marketScores.lossAversion >= 9 ? 'critical' : 'high',
      description: 'Elevated loss aversion detected — asymmetric volume on declining coins suggests panic selling beyond rational risk management',
      descriptionFa: 'High loss aversion detected — asymmetric volume in declining coins indicates panic selling beyond rational risk management',
      affectedCoins: decliningCoins.slice(0, 5),
      reference: 'Kahneman — Thinking, Fast and Slow, Ch.26-28',
      confidence: 0.75,
    });
  }
  
  // Overconfidence signal
  if (marketScores.overconfidence >= 7) {
    signals.push({
      type: 'overconfidence',
      severity: marketScores.overconfidence >= 9 ? 'high' : 'medium',
      description: 'High market turnover indicates overconfidence — excessive trading activity typically precedes corrections',
      descriptionFa: 'High turnover indicates overconfidence — excessive trading activity typically precedes market corrections',
      affectedCoins: allCoins.filter(c => c.market_cap > 0 && c.total_volume / c.market_cap > 0.1).slice(0, 5).map(c => c.id),
      reference: 'Montier — Behavioural Investing, Ch.1-2',
      confidence: 0.7,
    });
  }
  
  // Noise trader risk
  if (marketScores.noiseTraderRisk >= 7) {
    signals.push({
      type: 'noise_trader_risk',
      severity: marketScores.noiseTraderRisk >= 9 ? 'high' : 'medium',
      description: 'Elevated noise trader activity — high volatility driven by sentiment rather than fundamentals increases mispricing risk',
      descriptionFa: 'High noise trader activity — volatility driven by sentiment rather than fundamentals, increasing mispricing risk',
      affectedCoins: allCoins.filter(c => c.market_cap < 5e9).slice(0, 5).map(c => c.id),
      reference: 'Shleifer — Inefficient Markets, Ch.3',
      confidence: 0.7,
    });
  }
  
  // Disposition effect
  if (marketScores.dispositionEffect >= 7) {
    signals.push({
      type: 'disposition_effect',
      severity: 'medium',
      description: 'Disposition effect pattern detected — investors selling winners prematurely while holding losing positions',
      descriptionFa: 'Disposition effect pattern detected — investors selling winners early and holding losers',
      affectedCoins: [],
      reference: 'Shefrin — Beyond Greed and Fear, Ch.2',
      confidence: 0.65,
    });
  }
  
  // ── New bias signals ──
  
  // Emotional utility signal (Statman)
  if (marketScores.emotionalUtility >= 7) {
    const emotionalCoins = Object.entries(coinScores)
      .filter(([_, s]) => s.emotionalUtility >= 7)
      .map(([id]) => id);
    signals.push({
      type: 'emotional_utility',
      severity: marketScores.emotionalUtility >= 9 ? 'critical' : 'high',
      description: 'Market driven by emotional/expressive benefits rather than rational utility — high volume and volatility on speculative coins indicate lottery-like behavior',
      descriptionFa: 'Market influenced by emotional and expressive benefits rather than rational utility — high volume and volatility in speculative coins indicates lottery-like behavior',
      affectedCoins: emotionalCoins.slice(0, 5),
      reference: 'Statman — What Investors Really Want, Ch.3-4',
      confidence: 0.8,
    });
  }
  
  // State dependence signal (Steenbarger)
  if (marketScores.stateDependence >= 7) {
    const stateDependentCoins = Object.entries(coinScores)
      .filter(([_, s]) => s.stateDependence >= 7)
      .map(([id]) => id);
    signals.push({
      type: 'state_dependence',
      severity: marketScores.stateDependence >= 9 ? 'critical' : 'high',
      description: 'Trading decisions appear state-dependent — price acceleration and volume spikes indicate emotionally altered states affecting decision quality',
      descriptionFa: 'Trading decisions are state-dependent — price acceleration and volume spikes indicate emotionally altered states affecting decision quality',
      affectedCoins: stateDependentCoins.slice(0, 5),
      reference: 'Steenbarger — The Psychology of Trading, Ch.5-6',
      confidence: 0.75,
    });
  }
  
  // Low mindfulness signal (Dayton) — trigger when mindfulness is LOW (<=3)
  if (marketScores.mindfulnessScore <= 3) {
    signals.push({
      type: 'low_mindfulness',
      severity: marketScores.mindfulnessScore <= 1 ? 'critical' : 'high',
      description: 'Market shows low mindfulness — chaotic price action and reactive trading suggest participants are operating on autopilot rather than with present-moment awareness',
      descriptionFa: 'Market shows low mindfulness — chaotic price action and reactive trading indicate participants acting on autopilot rather than present-moment awareness',
      affectedCoins: allCoins.filter(c => {
        const range = c.high_24h > 0 && c.low_24h > 0
          ? (c.high_24h - c.low_24h) / c.low_24h * 100
          : 3;
        return range > 10;
      }).slice(0, 5).map(c => c.id),
      reference: 'Dayton — Trade Mindfully, Ch.4-6',
      confidence: 0.7,
    });
  }
  
  // Low resilience signal (Steenbarger 2.0) — trigger when resilience is LOW (<=3)
  if (marketScores.resilience <= 3) {
    signals.push({
      type: 'low_resilience',
      severity: marketScores.resilience <= 1 ? 'critical' : 'high',
      description: 'Market shows low resilience — prices failing to recover from declines suggest weakened recovery processes and potential for extended downturns',
      descriptionFa: 'Market shows low resilience — lack of price recovery from drops indicates weak recovery processes and potential for prolonged downturns',
      affectedCoins: allCoins.filter(c =>
        (c.price_change_percentage_24h ?? 0) < -3 &&
        (c.price_change_percentage_7d_in_currency ?? 0) < -5
      ).slice(0, 5).map(c => c.id),
      reference: 'Steenbarger — Trading Psychology 2.0, Ch.7-8',
      confidence: 0.75,
    });
  }
  
  // Low loss acceptance signal (Hougaard) — trigger when lossAcceptance is LOW (<=3)
  if (marketScores.lossAcceptance <= 3) {
    signals.push({
      type: 'low_loss_acceptance',
      severity: marketScores.lossAcceptance <= 1 ? 'critical' : 'high',
      description: 'Market shows poor loss acceptance — panic selling on declines indicates participants are emotionally destabilized by losses rather than accepting them as part of the process',
      descriptionFa: 'Market shows poor loss acceptance — panic selling during declines indicates emotional instability rather than accepting losses as part of the process',
      affectedCoins: allCoins.filter(c =>
        (c.price_change_percentage_24h ?? 0) < -3 &&
        c.market_cap > 0 && c.total_volume / c.market_cap > 0.1
      ).slice(0, 5).map(c => c.id),
      reference: 'Hougaard — Best Loser Wins, Ch.2-4',
      confidence: 0.7,
    });
  }
  
  // Tilt risk signal (Tendler)
  if (marketScores.tiltRisk >= 7) {
    const tiltedCoins = Object.entries(coinScores)
      .filter(([_, s]) => s.tiltRisk >= 7)
      .map(([id]) => id);
    signals.push({
      type: 'tilt_risk',
      severity: marketScores.tiltRisk >= 9 ? 'critical' : 'high',
      description: 'High tilt risk detected — consecutive extreme moves with escalating volume indicate market participants are losing emotional control and making increasingly impulsive decisions',
      descriptionFa: 'High tilt risk detected — consecutive extreme moves with escalating volume indicate loss of emotional control and increasingly impulsive decisions',
      affectedCoins: tiltedCoins.slice(0, 5),
      reference: 'Tendler — The Mental Game of Trading, Ch.1-3',
      confidence: 0.8,
    });
  }
  
  return signals;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPUTATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute behavioral finance analysis for all coins and market overall.
 */
export function computeBehavioralFinance(allCoins: CoinMarketData[]): BehavioralFinanceResult {
  // ── Per-coin bias detection ──
  const coinScores: Record<string, BehavioralBiasScores> = {};
  
  for (const coin of allCoins) {
    coinScores[coin.id] = {
      overreaction: detectOverreaction(coin),
      herding: detectHerding(coin, allCoins),
      lossAversion: detectLossAversion(coin),
      dispositionEffect: detectDispositionEffect(coin),
      overconfidence: detectOverconfidence(coin),
      anchoring: detectAnchoring(coin),
      fearGreed: detectFearGreed(coin),
      meanReversion: detectMeanReversion(coin),
      momentumPersistence: detectMomentumPersistence(coin),
      noiseTraderRisk: detectNoiseTraderRisk(coin),
      emotionalUtility: detectEmotionalUtility(coin),
      stateDependence: detectStateDependence(coin),
      mindfulnessScore: detectMindfulnessScore(coin),
      resilience: detectResilience(coin),
      lossAcceptance: detectLossAcceptance(coin),
      tiltRisk: detectTiltRisk(coin),
    };
  }
  
  // ── Market-level aggregation ──
  const fearGreedResult = detectMarketFearGreed(allCoins);
  
  const marketScores: BehavioralBiasScores = {
    overreaction: detectMarketOverreaction(allCoins),
    herding: detectMarketHerding(allCoins),
    lossAversion: detectMarketLossAversion(allCoins),
    dispositionEffect: detectMarketDispositionEffect(allCoins),
    overconfidence: detectMarketOverconfidence(allCoins),
    anchoring: detectMarketAnchoring(allCoins),
    fearGreed: fearGreedResult.score,
    meanReversion: detectMarketMeanReversion(allCoins),
    momentumPersistence: detectMarketMomentumPersistence(allCoins),
    noiseTraderRisk: detectMarketNoiseTraderRisk(allCoins),
    emotionalUtility: detectMarketEmotionalUtility(allCoins),
    stateDependence: detectMarketStateDependence(allCoins),
    mindfulnessScore: detectMarketMindfulnessScore(allCoins),
    resilience: detectMarketResilience(allCoins),
    lossAcceptance: detectMarketLossAcceptance(allCoins),
    tiltRisk: detectMarketTiltRisk(allCoins),
  };
  
  // ── Behavioral risk level ──
  // Composite risk from all biases — higher = more dangerous market
  // Note: mindfulnessScore and resilience are inverse (high = good),
  // lossAcceptance is inverse (high = good), so we invert them for risk
  const allBiasValues = Object.values(marketScores);
  const riskAdjustedValues = allBiasValues.map((v, i) => {
    // Fields at index 12 (mindfulnessScore), 13 (resilience), 14 (lossAcceptance)
    // are inverse — high = good, so we invert for risk calculation
    if (i === 12 || i === 13 || i === 14) return 10 - v;
    return v;
  });
  const biasCount = allBiasValues.length;
  const biasAvg = riskAdjustedValues.reduce((s, v) => s + v, 0) / biasCount;
  const extremeBiases = riskAdjustedValues.filter(v => v >= 8).length;
  const behavioralRiskLevel = Math.round(clamp(biasAvg * 0.6 + extremeBiases * 0.4, 1, 10));
  
  // ── Signal generation ──
  const signals = generateSignals(marketScores, fearGreedResult.regime, allCoins, coinScores);
  
  return {
    coinScores,
    marketScores,
    marketRegime: fearGreedResult.regime,
    regimeConfidence: Math.round(fearGreedResult.confidence * 100) / 100,
    fearGreedIndex: fearGreedResult.index,
    behavioralRiskLevel,
    signals,
    computedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION: Get behavioral score for a specific coin (for scoring engine)
// ═══════════════════════════════════════════════════════════════

/**
 * Get a composite behavioral finance score for a coin (1-10 scale).
 * This integrates into the market_psychology dimension.
 */
export function getCoinBehavioralScore(biases: BehavioralBiasScores): number {
  // Weighted average: fear/greed and overreaction are most impactful
  // Inverse metrics (high=good): mindfulnessScore, resilience, lossAcceptance
  // are inverted so higher risk = higher score
  const weights = {
    overreaction: 0.10,
    herding: 0.07,
    lossAversion: 0.08,
    dispositionEffect: 0.05,
    overconfidence: 0.07,
    anchoring: 0.04,
    fearGreed: 0.12,
    meanReversion: 0.07,
    momentumPersistence: 0.05,
    noiseTraderRisk: 0.04,
    emotionalUtility: 0.08,
    stateDependence: 0.07,
    mindfulnessScore: 0.06, // inverted below
    resilience: 0.05, // inverted below
    lossAcceptance: 0.05, // inverted below
    tiltRisk: 0.10,
  };
  
  let weightedSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = biases[key as keyof BehavioralBiasScores];
    // Invert inverse metrics for risk calculation
    if (key === 'mindfulnessScore' || key === 'resilience' || key === 'lossAcceptance') {
      weightedSum += (10 - value) * weight;
    } else {
      weightedSum += value * weight;
    }
  }
  
  return Math.round(weightedSum * 10) / 10;
}

/**
 * Reference books metadata for the behavioral finance section.
 */
export const BEHAVIORAL_FINANCE_BOOKS = [
  {
    id: 'kahneman_tfs',
    title: 'Thinking, Fast and Slow',
    titleFa: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    authorFa: 'Daniel Kahneman',
    nobelPrize: true,
    keyConcepts: ['System 1 vs System 2', 'Overreaction', 'Loss Aversion', 'Anchoring', 'Availability Heuristic'],
    detectedBiases: ['overreaction', 'lossAversion', 'anchoring'] as const,
  },
  {
    id: 'shefrin_bgf',
    title: 'Beyond Greed and Fear',
    titleFa: 'Beyond Greed and Fear',
    author: 'Hersh Shefrin',
    authorFa: 'Hersh Shefrin',
    keyConcepts: ['Disposition Effect', 'Herding', 'Prospect Theory Application', 'Behavioral Portfolio'],
    detectedBiases: ['herding', 'dispositionEffect'] as const,
  },
  {
    id: 'douglas_titz',
    title: 'Trading in the Zone',
    titleFa: 'Trading in the Zone',
    author: 'Mark Douglas',
    authorFa: 'Mark Douglas',
    keyConcepts: ['Probability Thinking', 'Emotional Discipline', 'Random Distribution', 'Mental Framework'],
    detectedBiases: ['momentumPersistence', 'overconfidence'] as const,
  },
  {
    id: 'montier_bi',
    title: 'Behavioural Investing',
    titleFa: 'Behavioural Investing',
    author: 'James Montier',
    authorFa: 'James Montier',
    keyConcepts: ['Overconfidence Bias', 'Confirmation Bias', 'Herd Behavior', 'Contrarian Strategy'],
    detectedBiases: ['overconfidence', 'herding'] as const,
  },
  {
    id: 'shleifer_im',
    title: 'Inefficient Markets',
    titleFa: 'Inefficient Markets',
    author: 'Andrei Shleifer',
    authorFa: 'Andrei Shleifer',
    keyConcepts: ['Noise Trader Risk', 'Arbitrage Limits', 'Mean Reversion', 'Market Inefficiency'],
    detectedBiases: ['noiseTraderRisk', 'meanReversion'] as const,
  },
  {
    id: 'tvede_pf',
    title: 'The Psychology of Finance',
    titleFa: 'The Psychology of Finance',
    author: 'Lars Tvede',
    authorFa: 'Lars Tvede',
    keyConcepts: ['Sentiment Cycles', 'Market Turning Points', 'Bull/Bear Psychology', 'Technical + Psychological Analysis'],
    detectedBiases: ['fearGreed'] as const,
  },
  {
    id: 'douglas_dt',
    title: 'The Disciplined Trader',
    titleFa: 'The Disciplined Trader',
    author: 'Mark Douglas',
    authorFa: 'Mark Douglas',
    keyConcepts: ['Emotional Barriers', 'Self-Discipline', 'Belief Systems', 'State of Mind'],
    detectedBiases: ['lossAversion', 'dispositionEffect'] as const,
  },
  {
    id: 'thaler_nudge',
    title: 'Nudge',
    titleFa: 'Nudge',
    author: 'Richard Thaler & Cass Sunstein',
    authorFa: 'Richard Thaler & Cass Sunstein',
    nobelPrize: true,
    keyConcepts: ['Choice Architecture', 'Default Effects', 'Libertarian Paternalism', 'Anchoring in Decisions'],
    detectedBiases: ['anchoring'] as const,
  },
  {
    id: 'shermer_motm',
    title: 'The Mind of the Market',
    titleFa: 'The Mind of the Market',
    author: 'Michael Shermer',
    authorFa: 'Michael Shermer',
    keyConcepts: ['Evolutionary Biases', 'Neuroeconomics', 'Belief-Driven Markets', 'Adaptive Behavior'],
    detectedBiases: ['herding', 'overreaction'] as const,
  },
  {
    id: 'ariely_pi',
    title: 'Predictably Irrational',
    titleFa: 'Predictably Irrational',
    author: 'Dan Ariely',
    authorFa: 'Dan Ariely',
    keyConcepts: ['Anchoring Effect', 'Relativity Trap', 'Ownership Bias', 'Systematic Irrationality'],
    detectedBiases: ['anchoring', 'dispositionEffect'] as const,
  },
  {
    id: 'statman_wirw',
    title: 'What Investors Really Want',
    titleFa: 'What Investors Really Want',
    author: 'Meir Statman',
    authorFa: 'Meir Statman',
    keyConcepts: ['Expressive Benefits', 'Emotional Utility', 'Behavioral Portfolio Theory', 'Want vs Need'],
    detectedBiases: ['emotionalUtility'] as const,
  },
  {
    id: 'steenbarger_pot',
    title: 'The Psychology of Trading',
    titleFa: 'The Psychology of Trading',
    author: 'Brett Steenbarger',
    authorFa: 'Brett Steenbarger',
    keyConcepts: ['Pattern Recognition in Emotional States', 'State-Dependent Trading', 'Therapeutic Change', 'Self-observation'],
    detectedBiases: ['stateDependence'] as const,
  },
  {
    id: 'dayton_tm',
    title: 'Trade Mindfully',
    titleFa: 'Trade Mindfully',
    author: 'Gary Dayton',
    authorFa: 'Gary Dayton',
    keyConcepts: ['Mindfulness in Trading', 'Cognitive Defusion', 'Present-Moment Awareness', 'Acceptance-Based Approach'],
    detectedBiases: ['mindfulnessScore'] as const,
  },
  {
    id: 'steenbarger_tp2',
    title: 'Trading Psychology 2.0',
    titleFa: 'Trading Psychology 2.0',
    author: 'Brett Steenbarger',
    authorFa: 'Brett Steenbarger',
    keyConcepts: ['Optimal Processes', 'Resilience', 'Best Practices vs Best Processes', 'Peak Performance'],
    detectedBiases: ['resilience'] as const,
  },
  {
    id: 'hougaard_blw',
    title: 'Best Loser Wins',
    titleFa: 'Best Loser Wins',
    author: 'Tom Hougaard',
    authorFa: 'Tom Hougaard',
    keyConcepts: ['Loss Management', 'Accepting Losses', 'High Conviction Trading', 'Adding to Winners'],
    detectedBiases: ['lossAcceptance'] as const,
  },
  {
    id: 'tendler_tmgt',
    title: 'The Mental Game of Trading',
    titleFa: 'The Mental Game of Trading',
    author: 'Jared Tendler',
    authorFa: 'Jared Tendler',
    keyConcepts: ['Mental Game Classification', 'Tilt Detection', 'Emotional Control', 'Performance Correction'],
    detectedBiases: ['tiltRisk'] as const,
  },
] as const;
