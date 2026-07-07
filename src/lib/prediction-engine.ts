/**
 * ML Prediction Engine V2 — Enhanced EWMA + Trend + Momentum + Mean Reversion + Cross-Dim Correlation
 *
 * Predicts tomorrow's scores at all hierarchy levels:
 *   Sub-aspects → Aspects → Sub-dimensions → Dimensions → Total AI Score
 *
 * Algorithm:
 *   1. EWMA (Exponential Weighted Moving Average) baseline
 *   2. Linear regression trend (last N days)
 *   3. Momentum signal (score acceleration)
 *   4. Enhanced mean reversion (adaptive strength, stronger at extremes)
 *   5. Volatility-adjusted confidence intervals
 *   6. Cross-dimension correlation adjustments
 *   7. Confidence estimation based on volatility, data quality, and direction consensus
 *
 * Predictions are stored in PredictionHistory for later comparison with actuals.
 */

import { db } from '@/lib/db';
import { getFullHierarchy, type ExternalDataContext, EMPTY_EXTERNAL_DATA, type CoinInput } from './scoring-engine-v2';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PredictionResult {
  nodeKey: string;
  coinId: string;
  targetDate: string;
  predictedScore: number;
  predictedChange: number;
  predictedDirection: number; // 1, -1, 0
  confidence: number; // 0-1
  confidenceLow: number; // lower bound of confidence interval
  confidenceHigh: number; // upper bound of confidence interval
  modelVersion: string;
}

export interface PredictionAccuracy {
  nodeKey: string;
  level: 'total' | 'dimension' | 'subDimension' | 'aspect' | 'subAspect';
  mae: number;
  rmse: number;
  directionAccuracy: number;
  totalPredictions: number;
  recentMae: number;
  recentDirectionAccuracy: number;
}

export interface PredictionComparison {
  date: string;
  predicted: number;
  actual: number;
  error: number;
  directionCorrect: boolean;
  confidence: number;
  predictedDirection: number;
  actualDirection: number;
}

export interface CoinPrediction {
  coinId: string;
  coinName: string;
  totalPrediction: PredictionResult;
  dimensionPredictions: PredictionResult[];
  subDimensionPredictions: PredictionResult[];
  aspectPredictions: PredictionResult[];
  subAspectPredictions: PredictionResult[];
}

export interface DimensionComparison {
  nodeKey: string;
  label: string;
  mae: number;
  rmse: number;
  directionAccuracy: number;
  count: number;
  recentMae: number;
  recentDirectionAccuracy: number;
  avgConfidence: number;
  comparisons: PredictionComparison[];
}

export interface ConfidenceCalibration {
  bucket: string; // "0-20%", "20-40%", etc.
  avgConfidence: number;
  avgError: number;
  directionAccuracy: number;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED PREDICTION MODEL V2
// ═══════════════════════════════════════════════════════════════

const MODEL_VERSION = 'ewma_trend_v2';
const EWMA_ALPHA = 0.3;
const TREND_WINDOW = 7;
const MIN_HISTORY_DAYS = 2;
const NEUTRAL_SCORE = 5.5;
const SCORE_MIN = 1;
const SCORE_MAX = 10;

// Cross-dimension correlation matrix
// If one dimension moves, correlated dimensions tend to follow
const DIMENSION_CORRELATIONS: Record<string, Record<string, number>> = {
  fundamental: { onchain: 0.3, ecosystem_defi: 0.25, inter_market: 0.15 },
  technical: { derivatives: 0.35, market_psychology: 0.2, whale_smart_money: 0.15 },
  onchain: { fundamental: 0.3, ecosystem_defi: 0.35, whale_smart_money: 0.2 },
  market_psychology: { news_sentiment: 0.4, technical: 0.2, derivatives: 0.15 },
  news_sentiment: { market_psychology: 0.4, regulatory: 0.2 },
  macroeconomic: { inter_market: 0.35, regulatory: 0.15 },
  regulatory: { news_sentiment: 0.2, macroeconomic: 0.15 },
  network_security: { onchain: 0.2, fundamental: 0.15 },
  derivatives: { technical: 0.35, market_psychology: 0.15 },
  whale_smart_money: { onchain: 0.2, technical: 0.15 },
  ecosystem_defi: { onchain: 0.35, fundamental: 0.25 },
  inter_market: { macroeconomic: 0.35, fundamental: 0.15 },
};

// ─── Core Math Functions ───────────────────────────────────

function ewma(values: number[], alpha: number): number {
  if (values.length === 0) return NEUTRAL_SCORE;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den === 0 ? 0 : num / den;
}

function momentum(values: number[]): number {
  if (values.length < 3) return 0;
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }
  if (changes.length < 2) return 0;
  return (changes[changes.length - 1] - changes[0]) / changes.length;
}

function volatility(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Enhanced Mean Reversion ───────────────────────────────
// Stronger reversion at extremes, adaptive based on distance from neutral

function enhancedMeanReversion(score: number, historicalVol: number): number {
  const distance = score - NEUTRAL_SCORE;
  const absDistance = Math.abs(distance);

  // Adaptive reversion strength: stronger at extremes
  let reversionStrength: number;
  if (absDistance > 3.5) {
    reversionStrength = 0.35; // Very extreme — strong pull back
  } else if (absDistance > 2.5) {
    reversionStrength = 0.25; // Quite extreme
  } else if (absDistance > 1.5) {
    reversionStrength = 0.15; // Moderate
  } else {
    reversionStrength = 0.05; // Near neutral — weak reversion
  }

  // Adjust by volatility: high volatility → more reversion (extremes less reliable)
  const volMultiplier = 1 + Math.min(historicalVol / 2, 0.5);

  return -distance * reversionStrength * volMultiplier;
}

// ─── Volatility-Adjusted Confidence Interval ──────────────

function computeConfidenceInterval(
  predicted: number,
  historicalVol: number,
  confidence: number
): { low: number; high: number } {
  // Wider interval when:
  // - Volatility is high
  // - Confidence is low
  const baseWidth = 0.3; // minimum interval width
  const volWidth = historicalVol * 1.5; // volatility contribution
  const confAdjust = (1 - confidence) * 1.2; // low confidence → wider

  const halfWidth = baseWidth + volWidth + confAdjust;

  return {
    low: Math.max(SCORE_MIN, Math.round((predicted - halfWidth) * 10) / 10),
    high: Math.min(SCORE_MAX, Math.round((predicted + halfWidth) * 10) / 10),
  };
}

// ─── Enhanced Confidence Calculation ───────────────────────

function calculateConfidence(
  values: number[],
  trendStrength: number,
  directionConsensus: number
): number {
  if (values.length < MIN_HISTORY_DAYS) return 0.15;

  const histVol = volatility(values);
  const n = values.length;

  // Volatility score: lower volatility → higher confidence
  const volatilityScore = Math.max(0.15, Math.min(0.95, 1 - histVol / 3));

  // Data quality score: more data → higher confidence
  const dataScore = Math.min(0.25, (n / 14) * 0.25);

  // Trend strength score: strong trend → more predictable
  const trendScore = Math.min(0.15, Math.abs(trendStrength) * 0.5);

  // Direction consensus: if multiple signals agree on direction, higher confidence
  const consensusScore = directionConsensus * 0.15;

  const raw = volatilityScore * 0.5 + dataScore + trendScore + consensusScore + 0.05;

  return Math.round(Math.min(0.95, Math.max(0.1, raw)) * 100) / 100;
}

// ─── Cross-Dimension Correlation Adjustment ────────────────

function crossDimensionAdjustment(
  dimKey: string,
  allDimensionPredictions: Map<string, { predicted: number; lastScore: number; change: number }>
): number {
  const correlations = DIMENSION_CORRELATIONS[dimKey];
  if (!correlations) return 0;

  let adjustment = 0;
  let totalWeight = 0;

  for (const [relatedDim, corrStrength] of Object.entries(correlations)) {
    const relatedPred = allDimensionPredictions.get(relatedDim);
    if (!relatedPred) continue;

    // If correlated dimension is moving, pull our prediction slightly in that direction
    const relatedChange = relatedPred.change;
    adjustment += relatedChange * corrStrength * 0.3; // Scale down the influence
    totalWeight += corrStrength;
  }

  return totalWeight > 0 ? adjustment / totalWeight * 0.5 : 0;
}

// ─── Main Prediction Function V2 ──────────────────────────

function predictNextValue(
  historicalScores: number[],
  dimKey: string = '',
  allDimensionPredictions: Map<string, { predicted: number; lastScore: number; change: number }> = new Map()
): { predicted: number; change: number; direction: number; confidence: number; confidenceLow: number; confidenceHigh: number } {
  if (historicalScores.length === 0) {
    return { predicted: NEUTRAL_SCORE, change: 0, direction: 0, confidence: 0.1, confidenceLow: 3, confidenceHigh: 8 };
  }

  const lastScore = historicalScores[historicalScores.length - 1];

  if (historicalScores.length < MIN_HISTORY_DAYS) {
    return {
      predicted: lastScore,
      change: 0,
      direction: 0,
      confidence: 0.2,
      confidenceLow: Math.max(SCORE_MIN, lastScore - 1.5),
      confidenceHigh: Math.min(SCORE_MAX, lastScore + 1.5),
    };
  }

  // 1. EWMA baseline
  const baseline = ewma(historicalScores, EWMA_ALPHA);

  // 2. Linear trend
  const trendWindow = historicalScores.slice(-TREND_WINDOW);
  const trend = linearTrend(trendWindow);

  // 3. Momentum
  const mom = momentum(historicalScores.slice(-5));

  // 4. Enhanced mean reversion
  const histVol = volatility(historicalScores);
  const reversion = enhancedMeanReversion(lastScore, histVol);

  // 5. Cross-dimension correlation adjustment
  const crossDimAdj = crossDimensionAdjustment(dimKey, allDimensionPredictions);

  // 6. Compute direction consensus for confidence
  const ewmaDir = baseline - lastScore;
  const trendDir = trend;
  const momDir = mom;
  const revDir = reversion;
  const signals = [ewmaDir, trendDir, momDir, revDir];
  const positiveSignals = signals.filter(s => s > 0).length;
  const negativeSignals = signals.filter(s => s < 0).length;
  const directionConsensus = Math.max(positiveSignals, negativeSignals) / signals.length;

  // 7. Weighted combination — V2 weights
  const weights = {
    ewma: 0.45,
    trend: 0.22,
    momentum: 0.05,
    reversion: 0.18,
    crossDim: 0.10,
  };

  const predicted =
    weights.ewma * baseline +
    weights.trend * (lastScore + trend) +
    weights.momentum * (lastScore + mom) +
    weights.reversion * (lastScore + reversion) +
    weights.crossDim * (lastScore + crossDimAdj);

  // Clamp to valid range
  const clampedPredicted = Math.round(Math.max(SCORE_MIN, Math.min(SCORE_MAX, predicted)) * 10) / 10;
  const change = Math.round((clampedPredicted - lastScore) * 10) / 10;
  const direction = change > 0.2 ? 1 : change < -0.2 ? -1 : 0;

  // Confidence
  const confidence = calculateConfidence(historicalScores, trend, directionConsensus);

  // Confidence interval
  const { low, high } = computeConfidenceInterval(clampedPredicted, histVol, confidence);

  return { predicted: clampedPredicted, change, direction, confidence, confidenceLow: low, confidenceHigh: high };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE OPERATIONS (Optimized with batch reads)
// ═══════════════════════════════════════════════════════════════

/**
 * Read historical scores for a coin from the database — ALL nodeKeys at once.
 * Returns a Map of nodeKey → sorted score array.
 */
async function readAllHistoricalScores(
  coinId: string,
  days: number = 14
): Promise<Map<string, number[]>> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const rows = await db.scoreHistory.findMany({
    where: {
      coinId,
      date: { gte: since },
    },
    orderBy: { date: 'asc' },
    select: { nodeKey: true, score: true },
  });

  const map = new Map<string, number[]>();
  for (const row of rows) {
    if (!map.has(row.nodeKey)) map.set(row.nodeKey, []);
    map.get(row.nodeKey)!.push(row.score);
  }
  return map;
}

/**
 * Read CoinDailyScore for overall AI score history.
 */
async function readCoinDailyScores(
  coinId: string,
  days: number = 14
): Promise<number[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const rows = await db.coinDailyScore.findMany({
    where: { coinId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: { aiScore: true },
  });
  return rows.map(r => r.aiScore);
}

/**
 * Backfill actuals for past predictions that don't have actual values yet.
 */
async function backfillPredictionActuals(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const unfulfilled = await db.predictionHistory.findMany({
    where: {
      targetDate: { lt: today },
      actualScore: null,
    },
    take: 200,
  });

  if (unfulfilled.length === 0) return 0;

  let updated = 0;

  for (const pred of unfulfilled) {
    let actualScore: number | null = null;

    if (pred.nodeKey === 'total') {
      const dailyScore = await db.coinDailyScore.findFirst({
        where: { coinId: pred.coinId, date: pred.targetDate },
        select: { aiScore: true },
      });
      actualScore = dailyScore?.aiScore ?? null;
    } else {
      const scoreRecord = await db.scoreHistory.findFirst({
        where: { coinId: pred.coinId, nodeKey: pred.nodeKey, date: pred.targetDate },
        select: { score: true },
      });
      actualScore = scoreRecord?.score ?? null;
    }

    if (actualScore !== null) {
      const actualChange = actualScore - pred.predictedScore + pred.predictedChange;
      const actualDirection = actualChange > 0.2 ? 1 : actualChange < -0.2 ? -1 : 0;
      const absoluteError = Math.abs(actualScore - pred.predictedScore);
      const directionCorrect = pred.predictedDirection === actualDirection ||
        (pred.predictedDirection === 0 && Math.abs(actualChange) <= 0.2);

      await db.predictionHistory.update({
        where: { id: pred.id },
        data: {
          actualScore,
          actualChange: Math.round(actualChange * 10) / 10,
          actualDirection,
          absoluteError: Math.round(absoluteError * 10) / 10,
          directionCorrect,
        },
      });
      updated++;
    }
  }

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE PREDICTIONS (Optimized)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate predictions for all coins at all hierarchy levels.
 * Optimized to batch-read historical scores per coin.
 */
export async function generatePredictions(
  coins: CoinInput[],
  _externalData: ExternalDataContext = EMPTY_EXTERNAL_DATA
): Promise<{
  predictions: CoinPrediction[];
  backfilledCount: number;
}> {
  const backfilledCount = await backfillPredictionActuals();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const hierarchy = getFullHierarchy();

  // Collect all node keys for reference
  const dimKeys = hierarchy.map(d => d.key);
  const subDimKeys: string[] = [];
  const aspectKeys: string[] = [];
  const subAspectKeys: string[] = [];

  for (const dim of hierarchy) {
    for (const sd of dim.subDimensions) {
      subDimKeys.push(`${dim.key}.${sd.key}`);
      for (const asp of sd.aspects) {
        aspectKeys.push(`${dim.key}.${sd.key}.${asp.key}`);
        for (const sa of asp.subAspects) {
          subAspectKeys.push(`${dim.key}.${sd.key}.${asp.key}.${sa.key}`);
        }
      }
    }
  }

  const predictions: CoinPrediction[] = [];

  // Process coins in small batches to avoid memory issues
  const BATCH_SIZE = 10;
  for (let i = 0; i < coins.length; i += BATCH_SIZE) {
    const batch = coins.slice(i, i + BATCH_SIZE);

    for (const coin of batch) {
      const dbCoin = await db.coin.findUnique({
        where: { coingeckoId: coin.id },
        select: { id: true, name: true },
      });

      if (!dbCoin) continue;

      const coinId = dbCoin.id;

      // Batch read all historical scores for this coin
      const [allScores, totalScores] = await Promise.all([
        readAllHistoricalScores(coinId, 14),
        readCoinDailyScores(coinId, 14),
      ]);

      // ── First pass: compute dimension-level predictions for cross-dim correlation ──
      const dimensionPredictionsMap = new Map<string, { predicted: number; lastScore: number; change: number }>();
      for (const dimKey of dimKeys) {
        const scores = allScores.get(dimKey) || [];
        const lastScore = scores.length > 0 ? scores[scores.length - 1] : NEUTRAL_SCORE;
        // Quick estimate without cross-dim (will refine later)
        const quickPred = predictNextValue(scores, dimKey, new Map());
        dimensionPredictionsMap.set(dimKey, {
          predicted: quickPred.predicted,
          lastScore,
          change: quickPred.change,
        });
      }

      // ── Total AI Score prediction (with cross-dim) ──
      const totalPred = predictNextValue(totalScores, 'total', dimensionPredictionsMap);
      const totalResult: PredictionResult = {
        nodeKey: 'total',
        coinId,
        targetDate: tomorrow,
        predictedScore: totalPred.predicted,
        predictedChange: totalPred.change,
        predictedDirection: totalPred.direction,
        confidence: totalPred.confidence,
        confidenceLow: totalPred.confidenceLow,
        confidenceHigh: totalPred.confidenceHigh,
        modelVersion: MODEL_VERSION,
      };

      // ── Dimension predictions (refined with cross-dim correlation) ──
      const dimPreds: PredictionResult[] = dimKeys.map(key => {
        const scores = allScores.get(key) || [];
        const pred = predictNextValue(scores, key, dimensionPredictionsMap);
        return {
          nodeKey: key,
          coinId,
          targetDate: tomorrow,
          predictedScore: pred.predicted,
          predictedChange: pred.change,
          predictedDirection: pred.direction,
          confidence: pred.confidence,
          confidenceLow: pred.confidenceLow,
          confidenceHigh: pred.confidenceHigh,
          modelVersion: MODEL_VERSION,
        };
      });

      // ── Sub-dimension predictions ──
      const sdPreds: PredictionResult[] = subDimKeys.map(key => {
        const scores = allScores.get(key) || [];
        const parentDimKey = key.split('.')[0];
        const pred = predictNextValue(scores, parentDimKey, dimensionPredictionsMap);
        return {
          nodeKey: key,
          coinId,
          targetDate: tomorrow,
          predictedScore: pred.predicted,
          predictedChange: pred.change,
          predictedDirection: pred.direction,
          confidence: pred.confidence,
          confidenceLow: pred.confidenceLow,
          confidenceHigh: pred.confidenceHigh,
          modelVersion: MODEL_VERSION,
        };
      });

      // ── Aspect predictions ──
      const aspPreds: PredictionResult[] = aspectKeys.map(key => {
        const scores = allScores.get(key) || [];
        const parentDimKey = key.split('.')[0];
        const pred = predictNextValue(scores, parentDimKey, dimensionPredictionsMap);
        return {
          nodeKey: key,
          coinId,
          targetDate: tomorrow,
          predictedScore: pred.predicted,
          predictedChange: pred.change,
          predictedDirection: pred.direction,
          confidence: pred.confidence,
          confidenceLow: pred.confidenceLow,
          confidenceHigh: pred.confidenceHigh,
          modelVersion: MODEL_VERSION,
        };
      });

      // ── Sub-aspect predictions ──
      const saPreds: PredictionResult[] = subAspectKeys.map(key => {
        const scores = allScores.get(key) || [];
        const parentDimKey = key.split('.')[0];
        const pred = predictNextValue(scores, parentDimKey, dimensionPredictionsMap);
        return {
          nodeKey: key,
          coinId,
          targetDate: tomorrow,
          predictedScore: pred.predicted,
          predictedChange: pred.change,
          predictedDirection: pred.direction,
          confidence: pred.confidence,
          confidenceLow: pred.confidenceLow,
          confidenceHigh: pred.confidenceHigh,
          modelVersion: MODEL_VERSION,
        };
      });

      // ── Store predictions in DB ──
      // Store all levels for comprehensive comparison
      const allPreds = [totalResult, ...dimPreds, ...sdPreds, ...aspPreds, ...saPreds];

      // Upsert in small chunks to avoid SQLite locks
      const rows = allPreds.map(pred => ({
        coinId: pred.coinId,
        nodeKey: pred.nodeKey,
        targetDate: pred.targetDate,
        createdAt: today,
        predictedScore: pred.predictedScore,
        predictedChange: pred.predictedChange,
        predictedDirection: pred.predictedDirection,
        confidence: pred.confidence,
        modelVersion: pred.modelVersion,
      }));

      for (let j = 0; j < rows.length; j += 50) {
        const chunk = rows.slice(j, j + 50);
        await Promise.all(chunk.map(row =>
          db.predictionHistory.upsert({
            where: {
              coinId_nodeKey_targetDate: {
                coinId: row.coinId,
                nodeKey: row.nodeKey,
                targetDate: row.targetDate,
              },
            },
            update: {
              predictedScore: row.predictedScore,
              predictedChange: row.predictedChange,
              predictedDirection: row.predictedDirection,
              confidence: row.confidence,
              modelVersion: row.modelVersion,
              createdAt: row.createdAt,
            },
            create: row,
          })
        ));
      }

      predictions.push({
        coinId,
        coinName: dbCoin.name,
        totalPrediction: totalResult,
        dimensionPredictions: dimPreds,
        subDimensionPredictions: sdPreds,
        aspectPredictions: aspPreds,
        subAspectPredictions: saPreds,
      });
    }
  }

  return { predictions, backfilledCount };
}

// ═══════════════════════════════════════════════════════════════
// READ PREDICTIONS & ACCURACY
// ═══════════════════════════════════════════════════════════════

/**
 * Get the latest predictions for a coin (or all coins).
 */
export async function getLatestPredictions(coinId?: string): Promise<CoinPrediction[]> {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Get dimension-level and total predictions for performance
  const dimensionKeys = ['total', 'fundamental', 'technical', 'onchain', 'market_psychology',
    'news_sentiment', 'macroeconomic', 'regulatory', 'network_security',
    'derivatives', 'whale_smart_money', 'ecosystem_defi', 'inter_market'];

  const where: Record<string, unknown> = {
    targetDate: { in: [tomorrow, today] },
    nodeKey: { in: dimensionKeys },
  };
  if (coinId) where.coinId = coinId;

  const preds = await db.predictionHistory.findMany({
    where,
    orderBy: { targetDate: 'desc' },
  });

  if (preds.length === 0) return [];

  // Batch load all coin names
  const uniqueCoinIds = [...new Set(preds.map(p => p.coinId))];
  const coinNames = await db.coin.findMany({
    where: { id: { in: uniqueCoinIds } },
    select: { id: true, name: true },
  });
  const coinNameMap = new Map(coinNames.map(c => [c.id, c.name]));

  // Group by coinId
  const grouped = new Map<string, Map<string, (typeof preds)[0]>>();
  for (const p of preds) {
    if (!grouped.has(p.coinId)) grouped.set(p.coinId, new Map());
    grouped.get(p.coinId)!.set(p.nodeKey, p);
  }

  const result: CoinPrediction[] = [];
  for (const [cid, nodeMap] of grouped) {
    const coinName = coinNameMap.get(cid) ?? cid;

    const totalPred = nodeMap.get('total');
    const dimPreds: PredictionResult[] = [];

    for (const [key, p] of nodeMap) {
      if (key === 'total') continue;
      dimPreds.push({
        nodeKey: p.nodeKey,
        coinId: p.coinId,
        targetDate: p.targetDate,
        predictedScore: p.predictedScore,
        predictedChange: p.predictedChange,
        predictedDirection: p.predictedDirection,
        confidence: p.confidence ?? 0.5,
        confidenceLow: 0,
        confidenceHigh: 0,
        modelVersion: p.modelVersion,
      });
    }

    result.push({
      coinId: cid,
      coinName,
      totalPrediction: totalPred ? {
        nodeKey: 'total',
        coinId: cid,
        targetDate: totalPred.targetDate,
        predictedScore: totalPred.predictedScore,
        predictedChange: totalPred.predictedChange,
        predictedDirection: totalPred.predictedDirection,
        confidence: totalPred.confidence ?? 0.5,
        confidenceLow: 0,
        confidenceHigh: 0,
        modelVersion: totalPred.modelVersion,
      } : {
        nodeKey: 'total',
        coinId: cid,
        targetDate: tomorrow,
        predictedScore: NEUTRAL_SCORE,
        predictedChange: 0,
        predictedDirection: 0,
        confidence: 0.1,
        confidenceLow: 3,
        confidenceHigh: 8,
        modelVersion: MODEL_VERSION,
      },
      dimensionPredictions: dimPreds,
      subDimensionPredictions: [],
      aspectPredictions: [],
      subAspectPredictions: [],
    });
  }

  return result;
}

/**
 * Get prediction accuracy metrics.
 */
export async function getPredictionAccuracy(days: number = 30): Promise<PredictionAccuracy[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const fulfilled = await db.predictionHistory.findMany({
    where: {
      targetDate: { gte: since },
      actualScore: { not: null },
    },
  });

  const grouped = new Map<string, typeof fulfilled>();
  for (const f of fulfilled) {
    if (!grouped.has(f.nodeKey)) grouped.set(f.nodeKey, []);
    grouped.get(f.nodeKey)!.push(f);
  }

  const results: PredictionAccuracy[] = [];
  for (const [nodeKey, entries] of grouped) {
    const depth = nodeKey === 'total' ? 0 : nodeKey.split('.').length;
    const level = depth === 0 ? 'total' as const
      : depth === 1 ? 'dimension' as const
      : depth === 2 ? 'subDimension' as const
      : depth === 3 ? 'aspect' as const
      : 'subAspect' as const;

    const errors = entries.map(e => e.absoluteError ?? 0);
    const mae = errors.length > 0 ? errors.reduce((s, e) => s + e, 0) / errors.length : 0;
    const rmse = errors.length > 0 ? Math.sqrt(errors.map(e => e * e).reduce((s, e) => s + e, 0) / errors.length) : 0;

    const dirCorrect = entries.filter(e => e.directionCorrect === true).length;
    const dirTotal = entries.filter(e => e.directionCorrect !== null).length;
    const directionAccuracy = dirTotal > 0 ? (dirCorrect / dirTotal) * 100 : 0;

    const recent7 = entries.slice(-7);
    const recentErrors = recent7.map(e => e.absoluteError ?? 0);
    const recentMae = recentErrors.length > 0 ? recentErrors.reduce((s, e) => s + e, 0) / recentErrors.length : 0;
    const recentDirCorrect = recent7.filter(e => e.directionCorrect === true).length;
    const recentDirTotal = recent7.filter(e => e.directionCorrect !== null).length;
    const recentDirectionAccuracy = recentDirTotal > 0 ? (recentDirCorrect / recentDirTotal) * 100 : 0;

    results.push({
      nodeKey,
      level,
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      directionAccuracy: Math.round(directionAccuracy * 10) / 10,
      totalPredictions: entries.length,
      recentMae: Math.round(recentMae * 100) / 100,
      recentDirectionAccuracy: Math.round(recentDirectionAccuracy * 10) / 10,
    });
  }

  return results;
}

/**
 * Get prediction vs actual comparison data for charting.
 */
export async function getPredictionComparison(
  coinId: string,
  nodeKey: string,
  days: number = 30
): Promise<PredictionComparison[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const preds = await db.predictionHistory.findMany({
    where: {
      coinId,
      nodeKey,
      targetDate: { gte: since },
      actualScore: { not: null },
    },
    orderBy: { targetDate: 'asc' },
  });

  return preds.map(p => ({
    date: p.targetDate,
    predicted: p.predictedScore,
    actual: p.actualScore ?? p.predictedScore,
    error: p.absoluteError ?? 0,
    directionCorrect: p.directionCorrect ?? false,
    confidence: p.confidence ?? 0.5,
    predictedDirection: p.predictedDirection,
    actualDirection: p.actualDirection ?? 0,
  }));
}

/**
 * Get comparison data for ALL dimensions of a coin at once.
 * This is used for the bar chart showing error by dimension.
 */
export async function getDimensionComparisons(
  coinId: string,
  days: number = 14
): Promise<DimensionComparison[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const dimensionKeys = ['total', 'fundamental', 'technical', 'onchain', 'market_psychology',
    'news_sentiment', 'macroeconomic', 'regulatory', 'network_security',
    'derivatives', 'whale_smart_money', 'ecosystem_defi', 'inter_market'];

  const preds = await db.predictionHistory.findMany({
    where: {
      coinId,
      nodeKey: { in: dimensionKeys },
      targetDate: { gte: since },
      actualScore: { not: null },
    },
    orderBy: { targetDate: 'asc' },
  });

  const grouped = new Map<string, typeof preds>();
  for (const p of preds) {
    if (!grouped.has(p.nodeKey)) grouped.set(p.nodeKey, []);
    grouped.get(p.nodeKey)!.push(p);
  }

  const DIMENSION_LABELS: Record<string, string> = {
    total: 'Total AI Score',
    fundamental: 'Fundamental',
    technical: 'Technical',
    onchain: 'On-Chain',
    market_psychology: 'Psychology',
    news_sentiment: 'News & Sentiment',
    macroeconomic: 'Macroeconomic',
    regulatory: 'Regulatory',
    network_security: 'Network Security',
    derivatives: 'Derivatives',
    whale_smart_money: 'Whale & Smart Money',
    ecosystem_defi: 'Ecosystem & DeFi',
    inter_market: 'Inter-Market',
  };

  const results: DimensionComparison[] = [];

  for (const dimKey of dimensionKeys) {
    const entries = grouped.get(dimKey) || [];
    if (entries.length === 0) continue;

    const errors = entries.map(e => e.absoluteError ?? 0);
    const mae = errors.reduce((s, e) => s + e, 0) / errors.length;
    const rmse = Math.sqrt(errors.map(e => e * e).reduce((s, e) => s + e, 0) / errors.length);

    const dirCorrect = entries.filter(e => e.directionCorrect === true).length;
    const dirTotal = entries.filter(e => e.directionCorrect !== null).length;
    const directionAccuracy = dirTotal > 0 ? (dirCorrect / dirTotal) * 100 : 0;

    const recent7 = entries.slice(-7);
    const recentErrors = recent7.map(e => e.absoluteError ?? 0);
    const recentMae = recentErrors.length > 0 ? recentErrors.reduce((s, e) => s + e, 0) / recentErrors.length : 0;
    const recentDirCorrect = recent7.filter(e => e.directionCorrect === true).length;
    const recentDirTotal = recent7.filter(e => e.directionCorrect !== null).length;
    const recentDirectionAccuracy = recentDirTotal > 0 ? (recentDirCorrect / recentDirTotal) * 100 : 0;

    const avgConfidence = entries.reduce((s, e) => s + (e.confidence ?? 0.5), 0) / entries.length;

    const comparisons: PredictionComparison[] = entries.map(p => ({
      date: p.targetDate,
      predicted: p.predictedScore,
      actual: p.actualScore ?? p.predictedScore,
      error: p.absoluteError ?? 0,
      directionCorrect: p.directionCorrect ?? false,
      confidence: p.confidence ?? 0.5,
      predictedDirection: p.predictedDirection,
      actualDirection: p.actualDirection ?? 0,
    }));

    results.push({
      nodeKey: dimKey,
      label: DIMENSION_LABELS[dimKey] || dimKey,
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      directionAccuracy: Math.round(directionAccuracy * 10) / 10,
      count: entries.length,
      recentMae: Math.round(recentMae * 100) / 100,
      recentDirectionAccuracy: Math.round(recentDirectionAccuracy * 10) / 10,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      comparisons,
    });
  }

  return results;
}

/**
 * Get confidence calibration data — are high-confidence predictions more accurate?
 */
export async function getConfidenceCalibration(days: number = 30): Promise<ConfidenceCalibration[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const fulfilled = await db.predictionHistory.findMany({
    where: {
      targetDate: { gte: since },
      actualScore: { not: null },
      confidence: { not: null },
    },
    select: {
      confidence: true,
      absoluteError: true,
      directionCorrect: true,
    },
  });

  if (fulfilled.length === 0) return [];

  // Bucket by confidence level
  const buckets: Record<string, { errors: number[]; dirCorrect: number; dirTotal: number }> = {
    '0-20%': { errors: [], dirCorrect: 0, dirTotal: 0 },
    '20-40%': { errors: [], dirCorrect: 0, dirTotal: 0 },
    '40-60%': { errors: [], dirCorrect: 0, dirTotal: 0 },
    '60-80%': { errors: [], dirCorrect: 0, dirTotal: 0 },
    '80-100%': { errors: [], dirCorrect: 0, dirTotal: 0 },
  };

  for (const p of fulfilled) {
    const conf = (p.confidence ?? 0.5) * 100;
    let bucket: string;
    if (conf < 20) bucket = '0-20%';
    else if (conf < 40) bucket = '20-40%';
    else if (conf < 60) bucket = '40-60%';
    else if (conf < 80) bucket = '60-80%';
    else bucket = '80-100%';

    buckets[bucket].errors.push(p.absoluteError ?? 0);
    if (p.directionCorrect !== null) {
      buckets[bucket].dirTotal++;
      if (p.directionCorrect === true) buckets[bucket].dirCorrect++;
    }
  }

  const results: ConfidenceCalibration[] = [];
  for (const [bucket, data] of Object.entries(buckets)) {
    if (data.errors.length === 0) continue;
    const avgError = data.errors.reduce((s, e) => s + e, 0) / data.errors.length;
    const avgConf = data.errors.length > 0
      ? fulfilled.filter(p => {
          const c = (p.confidence ?? 0.5) * 100;
          if (bucket === '0-20%') return c < 20;
          if (bucket === '20-40%') return c >= 20 && c < 40;
          if (bucket === '40-60%') return c >= 40 && c < 60;
          if (bucket === '60-80%') return c >= 60 && c < 80;
          return c >= 80;
        }).reduce((s, p) => s + (p.confidence ?? 0.5), 0) / data.errors.length
      : 0;

    results.push({
      bucket,
      avgConfidence: Math.round(avgConf * 100) / 100,
      avgError: Math.round(avgError * 100) / 100,
      directionAccuracy: data.dirTotal > 0 ? Math.round((data.dirCorrect / data.dirTotal) * 100 * 10) / 10 : 0,
      count: data.errors.length,
    });
  }

  return results;
}

/**
 * Get overall prediction summary for the dashboard.
 */
export async function getPredictionSummary(): Promise<{
  totalPredictions: number;
  avgMae: number;
  avgDirectionAccuracy: number;
  avgConfidence: number;
  recentMae: number;
  recentDirectionAccuracy: number;
  byLevel: Record<string, { mae: number; directionAccuracy: number; count: number }>;
}> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // Get count of total predictions (fast)
  const totalPredictions = await db.predictionHistory.count();

  if (totalPredictions === 0) {
    return {
      totalPredictions: 0,
      avgMae: 0,
      avgDirectionAccuracy: 0,
      avgConfidence: 0,
      recentMae: 0,
      recentDirectionAccuracy: 0,
      byLevel: {},
    };
  }

  // Get fulfilled predictions only
  const fulfilled = await db.predictionHistory.findMany({
    where: {
      actualScore: { not: null },
    },
    select: {
      nodeKey: true,
      absoluteError: true,
      directionCorrect: true,
      confidence: true,
      targetDate: true,
    },
  });

  const recentFulfilled = fulfilled.filter(p => p.targetDate >= weekAgo);

  const avgMae = fulfilled.length > 0
    ? fulfilled.reduce((s, p) => s + (p.absoluteError ?? 0), 0) / fulfilled.length
    : 0;

  const dirCorrect = fulfilled.filter(p => p.directionCorrect === true).length;
  const dirTotal = fulfilled.filter(p => p.directionCorrect !== null).length;
  const avgDirectionAccuracy = dirTotal > 0 ? (dirCorrect / dirTotal) * 100 : 0;

  const avgConfidence = fulfilled.length > 0
    ? fulfilled.reduce((s, p) => s + (p.confidence ?? 0.5), 0) / fulfilled.length
    : 0;

  const recentMae = recentFulfilled.length > 0
    ? recentFulfilled.reduce((s, p) => s + (p.absoluteError ?? 0), 0) / recentFulfilled.length
    : 0;

  const recentDirCorrect = recentFulfilled.filter(p => p.directionCorrect === true).length;
  const recentDirTotal = recentFulfilled.filter(p => p.directionCorrect !== null).length;
  const recentDirectionAccuracy = recentDirTotal > 0 ? (recentDirCorrect / recentDirTotal) * 100 : 0;

  // By level
  const byLevel: Record<string, { mae: number; directionAccuracy: number; count: number }> = {};
  const levelGroups = new Map<string, typeof fulfilled>();
  for (const p of fulfilled) {
    const depth = p.nodeKey === 'total' ? 0 : p.nodeKey.split('.').length;
    const level = depth === 0 ? 'total' : depth === 1 ? 'dimension' : depth === 2 ? 'subDimension' : depth === 3 ? 'aspect' : 'subAspect';
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(p);
  }

  for (const [level, entries] of levelGroups) {
    const lMae = entries.reduce((s, p) => s + (p.absoluteError ?? 0), 0) / entries.length;
    const lDirCorrect = entries.filter(p => p.directionCorrect === true).length;
    const lDirTotal = entries.filter(p => p.directionCorrect !== null).length;
    byLevel[level] = {
      mae: Math.round(lMae * 100) / 100,
      directionAccuracy: lDirTotal > 0 ? Math.round((lDirCorrect / lDirTotal) * 100 * 10) / 10 : 0,
      count: entries.length,
    };
  }

  return {
    totalPredictions,
    avgMae: Math.round(avgMae * 100) / 100,
    avgDirectionAccuracy: Math.round(avgDirectionAccuracy * 10) / 10,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    recentMae: Math.round(recentMae * 100) / 100,
    recentDirectionAccuracy: Math.round(recentDirectionAccuracy * 10) / 10,
    byLevel,
  };
}

/**
 * Generate retroactive predictions for historical dates.
 * This populates the comparison chart with data by creating predictions
 * for past dates and then backfilling the actuals.
 */
export async function generateHistoricalComparisons(
  coinDbId: string,
  days: number = 7
): Promise<number> {
  const hierarchy = getFullHierarchy();
  const dimKeys = hierarchy.map(d => d.key);
  const subDimKeys: string[] = [];

  for (const dim of hierarchy) {
    for (const sd of dim.subDimensions) {
      subDimKeys.push(`${dim.key}.${sd.key}`);
    }
  }

  const allKeys = ['total', ...dimKeys, ...subDimKeys];

  // Get available dates
  const scoreDates = await db.scoreHistory.findMany({
    where: { coinId: coinDbId },
    orderBy: { date: 'desc' },
    distinct: ['date'],
    select: { date: true },
    take: days + 1,
  });

  const dailyDates = await db.coinDailyScore.findMany({
    where: { coinId: coinDbId },
    orderBy: { date: 'desc' },
    select: { date: true },
    take: days + 1,
  });

  const availableDates = [...new Set([
    ...scoreDates.map(s => s.date),
    ...dailyDates.map(d => d.date),
  ])].sort();

  if (availableDates.length < 2) return 0;

  let created = 0;

  // For each date (except the first), create a "prediction" based on the previous day's score
  // This simulates what our model would have predicted
  for (let i = 1; i < availableDates.length; i++) {
    const targetDate = availableDates[i];
    const prevDate = availableDates[i - 1];

    // Check if prediction already exists for this date
    const existing = await db.predictionHistory.findFirst({
      where: { coinId: coinDbId, targetDate },
    });
    if (existing) continue;

    // Get the previous day's scores as the "prediction"
    for (const nodeKey of allKeys) {
      let predictedScore: number | null = null;
      let actualScore: number | null = null;

      if (nodeKey === 'total') {
        const prevDaily = await db.coinDailyScore.findFirst({
          where: { coinId: coinDbId, date: prevDate },
          select: { aiScore: true },
        });
        const targetDaily = await db.coinDailyScore.findFirst({
          where: { coinId: coinDbId, date: targetDate },
          select: { aiScore: true },
        });
        predictedScore = prevDaily?.aiScore ?? null;
        actualScore = targetDaily?.aiScore ?? null;
      } else {
        const prevScore = await db.scoreHistory.findFirst({
          where: { coinId: coinDbId, nodeKey, date: prevDate },
          select: { score: true },
        });
        const targetScore = await db.scoreHistory.findFirst({
          where: { coinId: coinDbId, nodeKey, date: targetDate },
          select: { score: true },
        });
        predictedScore = prevScore?.score ?? null;
        actualScore = targetScore?.score ?? null;
      }

      if (predictedScore === null) continue;

      const predictedChange = 0; // Naive prediction: no change
      const predictedDirection = 0; // Neutral
      const absoluteError = actualScore !== null ? Math.abs(actualScore - predictedScore) : null;
      const actualChange = actualScore !== null ? actualScore - predictedScore : null;
      const actualDirection = actualChange !== null
        ? (actualChange > 0.2 ? 1 : actualChange < -0.2 ? -1 : 0)
        : null;
      const directionCorrect = actualDirection !== null
        ? (predictedDirection === actualDirection || (predictedDirection === 0 && Math.abs(actualChange!) <= 0.2))
        : null;

      await db.predictionHistory.upsert({
        where: {
          coinId_nodeKey_targetDate: {
            coinId: coinDbId,
            nodeKey,
            targetDate,
          },
        },
        update: {
          actualScore,
          actualChange: actualChange !== null ? Math.round(actualChange * 10) / 10 : null,
          actualDirection,
          absoluteError: absoluteError !== null ? Math.round(absoluteError * 10) / 10 : null,
          directionCorrect,
        },
        create: {
          coinId: coinDbId,
          nodeKey,
          targetDate,
          createdAt: prevDate,
          predictedScore,
          predictedChange,
          predictedDirection,
          modelVersion: 'naive_baseline',
          confidence: 0.3,
          actualScore,
          actualChange: actualChange !== null ? Math.round(actualChange * 10) / 10 : null,
          actualDirection,
          absoluteError: absoluteError !== null ? Math.round(absoluteError * 10) / 10 : null,
          directionCorrect,
        },
      });
      created++;
    }
  }

  return created;
}
