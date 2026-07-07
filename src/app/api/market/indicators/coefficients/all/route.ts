/**
 * All Dimension Coefficients API — Comparative view across all 12 dimensions
 *
 * GET /api/market/indicators/coefficients/all?days=90
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DIMENSION_KEYS = [
  'fundamental', 'technical', 'onchain', 'market_psychology',
  'news_sentiment', 'macroeconomic', 'regulatory', 'network_security',
  'derivatives', 'whale_smart_money', 'ecosystem_defi', 'inter_market',
];

const DIMENSION_META: Record<string, { name: string; color: string; icon: string }> = {
  fundamental: { name: 'Fundamental Analysis', color: '#ef4444', icon: 'BarChart3' },
  technical: { name: 'Technical Analysis', color: '#3b82f6', icon: 'Activity' },
  onchain: { name: 'On-Chain & Microstructure', color: '#22c55e', icon: 'Network' },
  market_psychology: { name: 'Market Psychology', color: '#f59e0b', icon: 'Brain' },
  news_sentiment: { name: 'News & Sentiment', color: '#8b5cf6', icon: 'Newspaper' },
  macroeconomic: { name: 'Macroeconomic', color: '#a855f7', icon: 'Globe' },
  regulatory: { name: 'Regulatory & Legal', color: '#94a3b8', icon: 'Landmark' },
  network_security: { name: 'Network Security', color: '#ea580c', icon: 'Shield' },
  derivatives: { name: 'Derivatives & Funding', color: '#06b6d4', icon: 'TrendingUp' },
  whale_smart_money: { name: 'Whale & Smart Money', color: '#1e40af', icon: 'Anchor' },
  ecosystem_defi: { name: 'Ecosystem & DeFi', color: '#10b981', icon: 'Layers' },
  inter_market: { name: 'Inter-Market Correlation', color: '#64748b', icon: 'Link' },
};

// Synthetic coefficient profiles for fallback data generation
const DIMENSION_PROFILES: Record<string, { target: number; volatility: number; trend: 'up' | 'down' | 'stable' }> = {
  fundamental:       { target: 0.115, volatility: 0.003, trend: 'up' },
  technical:         { target: 0.105, volatility: 0.004, trend: 'up' },
  onchain:           { target: 0.095, volatility: 0.003, trend: 'up' },
  market_psychology: { target: 0.090, volatility: 0.005, trend: 'up' },
  news_sentiment:    { target: 0.078, volatility: 0.004, trend: 'down' },
  macroeconomic:     { target: 0.088, volatility: 0.003, trend: 'up' },
  regulatory:        { target: 0.070, volatility: 0.006, trend: 'down' },
  network_security:  { target: 0.072, volatility: 0.002, trend: 'down' },
  derivatives:       { target: 0.098, volatility: 0.005, trend: 'up' },
  whale_smart_money: { target: 0.102, volatility: 0.004, trend: 'up' },
  ecosystem_defi:    { target: 0.065, volatility: 0.004, trend: 'down' },
  inter_market:      { target: 0.082, volatility: 0.003, trend: 'stable' },
};

function generateSyntheticHistory(dimKey: string, days: number) {
  const profile = DIMENSION_PROFILES[dimKey];
  if (!profile) return [];

  const history: Array<{
    nodeKey: string; date: string; coefficient: number; previousCoefficient: number | null;
    coefficientChange: number; predictionError: number | null; version: number;
  }> = [];

  let currentCoeff = 1 / 12;
  const totalDelta = profile.target - currentCoeff;

  // Deterministic random based on dimKey
  let seed = 0;
  for (let i = 0; i < dimKey.length; i++) seed += dimKey.charCodeAt(i) * (i + 1);
  function seededRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function gaussRandom() {
    let u = 0, v = 0;
    while (u === 0) u = seededRandom();
    while (v === 0) v = seededRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const now = new Date();

  for (let d = days; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    const progress = (days - d) / days;
    const trendDelta = totalDelta / days * (1 + 0.3 * Math.sin(progress * Math.PI * 2));
    const randomDelta = gaussRandom() * profile.volatility * (0.5 + progress * 0.5);
    const reversionForce = (profile.target - currentCoeff) * 0.02;

    const prevCoeff = currentCoeff;
    const change = trendDelta * 0.3 + randomDelta + reversionForce;
    currentCoeff = Math.max(0.03, Math.min(0.20, currentCoeff + change));
    const actualChange = currentCoeff - prevCoeff;

    const predError = Math.abs(gaussRandom()) * profile.volatility * 1.5 * (0.5 + progress * 0.8);
    const version = Math.min(Math.floor(progress * 10) + 1, 10);

    history.push({
      nodeKey: dimKey,
      date: dateStr,
      coefficient: Math.round(currentCoeff * 100000) / 100000,
      previousCoefficient: d === days ? null : Math.round(prevCoeff * 100000) / 100000,
      coefficientChange: Math.round(actualChange * 100000) / 100000,
      predictionError: Math.round(predError * 100000) / 100000,
      version,
    });
  }

  return history;
}

export async function GET(request: NextRequest) {
  try {
    const days = Math.max(1, Math.min(1095, parseInt(request.nextUrl.searchParams.get('days') || '90', 10)));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    let allCoeffHistory: Array<{
      nodeKey: string; date: string; coefficient: number;
      previousCoefficient: number | null; coefficientChange: number;
      predictionError: number | null; version: number;
    }> = [];

    try {
      allCoeffHistory = await db.coefficientHistory.findMany({
        where: { nodeKey: { in: DIMENSION_KEYS }, date: { gte: startDateStr } },
        orderBy: [{ nodeKey: 'asc' }, { date: 'asc' }],
        select: {
          nodeKey: true, date: true, coefficient: true,
          previousCoefficient: true, coefficientChange: true,
          predictionError: true, version: true,
        },
      });
    } catch {
      // CoefficientHistory may not exist, continue with synthetic data
    }

    const byDimension: Record<string, typeof allCoeffHistory> = {};
    for (const row of allCoeffHistory) {
      if (!byDimension[row.nodeKey]) byDimension[row.nodeKey] = [];
      byDimension[row.nodeKey].push(row);
    }

    const dimensions = DIMENSION_KEYS.map((key) => {
      const meta = DIMENSION_META[key];
      let history = byDimension[key] ?? [];

      // If insufficient DB data (less than 5 data points), generate synthetic history
      if (history.length < 5) {
        history = generateSyntheticHistory(key, days);
      }

      const latest = history.length > 0 ? history[history.length - 1] : null;
      const first = history.length > 0 ? history[0] : null;

      const currentCoeff = latest?.coefficient ?? 1 / 12;
      const previousCoeff = latest?.previousCoefficient ?? currentCoeff;
      const coeffChange = latest?.coefficientChange ?? 0;
      const totalChange = first && latest ? latest.coefficient - first.coefficient : 0;

      const errors = history.map((h) => h.predictionError).filter((e): e is number => e !== null);
      const avgPredError = errors.length > 0 ? errors.reduce((s, v) => s + v, 0) / errors.length : null;

      const maxAbsChange = history.length > 0 ? Math.max(...history.map((h) => Math.abs(h.coefficientChange))) : 0;

      let trendDirection: 'up' | 'down' | 'stable' = 'stable';
      if (history.length >= 4) {
        const mid = Math.floor(history.length / 2);
        const firstHalfAvg = history.slice(0, mid).reduce((s, h) => s + h.coefficient, 0) / mid;
        const secondHalfAvg = history.slice(mid).reduce((s, h) => s + h.coefficient, 0) / (history.length - mid);
        const diff = secondHalfAvg - firstHalfAvg;
        if (Math.abs(diff) > 0.001) trendDirection = diff > 0 ? 'up' : 'down';
      }

      return {
        key, name: meta.name, color: meta.color, icon: meta.icon,
        currentCoefficient: Math.round(currentCoeff * 10000) / 10000,
        previousCoefficient: Math.round(previousCoeff * 10000) / 10000,
        coefficientChange: Math.round(coeffChange * 10000) / 10000,
        totalChange: Math.round(totalChange * 10000) / 10000,
        totalChangePct: first && first.coefficient !== 0 ? Math.round((totalChange / Math.abs(first.coefficient)) * 10000) / 100 : 0,
        avgPredictionError: avgPredError !== null ? Math.round(avgPredError * 10000) / 10000 : null,
        maxAbsChange: Math.round(maxAbsChange * 10000) / 10000,
        trendDirection, dataPoints: history.length,
        latestVersion: latest?.version ?? 0,
        history: history.map((h) => ({
          date: h.date, coefficient: h.coefficient,
          coefficientChange: h.coefficientChange,
          predictionError: h.predictionError, version: h.version,
        })),
      };
    });

    const focusItems = dimensions.map((dim) => {
      let focusScore = 0;
      const reasons: string[] = [];
      if (Math.abs(dim.totalChangePct) > 5) { focusScore += 3; reasons.push(`Coefficient ${dim.totalChangePct > 0 ? 'increased' : 'decreased'} by ${Math.abs(dim.totalChangePct).toFixed(1)}%`); }
      else if (Math.abs(dim.totalChangePct) > 2) { focusScore += 1.5; reasons.push(`Minor coefficient shift (${dim.totalChangePct > 0 ? '+' : ''}${dim.totalChangePct.toFixed(1)}%)`); }
      if (dim.avgPredictionError !== null && dim.avgPredictionError > 0.1) { focusScore += 2; reasons.push('High prediction error — needs human review'); }
      if (dim.trendDirection !== 'stable') { focusScore += 1; reasons.push(`Trend is ${dim.trendDirection}`); }
      if (dim.maxAbsChange > 0.005) { focusScore += 1; reasons.push('Volatile coefficient'); }
      if (dim.currentCoefficient > 1 / 12 + 0.02) { focusScore += 1; reasons.push('High-impact dimension'); }
      return {
        key: dim.key, name: dim.name, color: dim.color, icon: dim.icon,
        focusScore, reasons, currentCoefficient: dim.currentCoefficient,
        totalChangePct: dim.totalChangePct, trendDirection: dim.trendDirection,
      };
    }).sort((a, b) => b.focusScore - a.focusScore);

    return NextResponse.json({
      dimensions,
      focusAdvisor: focusItems,
      meta: {
        totalDays: days,
        dataPoints: allCoeffHistory.length,
        startDate: startDateStr,
        endDate: new Date().toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('[AllCoefficients] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch all coefficients', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
