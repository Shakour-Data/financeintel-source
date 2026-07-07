'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, Activity, Network, Brain, Newspaper, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Loader2, Sparkles, Eye, EyeOff,
  Globe, Landmark, Shield, Anchor, Layers, Link as LinkIcon,
  BookMarked, Calculator,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketScoreGauge } from '@/components/market-score-gauge';
import { MarketBreadthBar } from '@/components/market-breadth-bar';
import { CoefficientEvolutionChart } from '@/components/coefficient-evolution-chart';
import { cn } from '@/lib/utils';
import type { Dimension } from '@/lib/scoring-engine-v2';
import { DIMENSION_FORMULAS, getReferencesForDimension, type DimensionKey } from '@/lib/references';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface CoinData {
  id: string;
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  dimensions: Dimension[];
}

interface SubDimensionData {
  key: string;
  name: string;
  nameFa: string;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  bullBearRatio: number;
}

interface DimensionIndicator {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  score: number;
  previousScore: number;
  scoreChange: number;
  scoreChangePct: number;
  coefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  bullBearRatio: number;
  subDimensions: SubDimensionData[];
}

interface MarketIndicatorsResult {
  marketAiScore: number;
  previousMarketAiScore: number;
  marketAiScoreChange: number;
  marketAiScoreChangePct: number;
  dimensions: DimensionIndicator[];
  breadth: {
    bullCoins: number;
    neutralCoins: number;
    bearCoins: number;
    total: number;
    marketBreadth: number;
  };
  coefficientVersion: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DIMENSION_META: Record<string, { name: string; nameFa: string; color: string; icon: string }> = {
  fundamental: { name: 'Fundamental Analysis', nameFa: 'Fundamental Analysis', color: '#ef4444', icon: 'BarChart3' },
  technical: { name: 'Technical Analysis', nameFa: 'Technical Analysis', color: '#3b82f6', icon: 'Activity' },
  onchain: { name: 'On-Chain & Microstructure', nameFa: 'On-Chain & Microstructure', color: '#22c55e', icon: 'Network' },
  market_psychology: { name: 'Market Psychology', nameFa: 'Market Psychology', color: '#f59e0b', icon: 'Brain' },
  news_sentiment: { name: 'News & Sentiment', nameFa: 'News & Sentiment', color: '#8b5cf6', icon: 'Newspaper' },
  macroeconomic: { name: 'Macroeconomic', nameFa: 'Macroeconomic', color: '#a855f7', icon: 'Globe' },
  regulatory: { name: 'Regulatory & Legal', nameFa: 'Regulatory & Legal', color: '#94a3b8', icon: 'Landmark' },
  network_security: { name: 'Network Security', nameFa: 'Network Security', color: '#ea580c', icon: 'Shield' },
  derivatives: { name: 'Derivatives & Funding', nameFa: 'Derivatives & Funding', color: '#06b6d4', icon: 'TrendingUpIcon' },
  whale_smart_money: { name: 'Whale & Smart Money', nameFa: 'Whale & Smart Money', color: '#1e40af', icon: 'Anchor' },
  ecosystem_defi: { name: 'Ecosystem & DeFi', nameFa: 'Ecosystem & DeFi', color: '#10b981', icon: 'Layers' },
  inter_market: { name: 'Inter-Market Correlation', nameFa: 'Inter-Market Correlation', color: '#64748b', icon: 'LinkIcon' },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  BarChart3,
  Activity,
  Network,
  Brain,
  Newspaper,
  Globe,
  Landmark,
  Shield,
  TrendingUpIcon: TrendingUp,
  Anchor,
  Layers,
  LinkIcon,
};

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE COMPUTATION from coin data
// ═══════════════════════════════════════════════════════════════

function computeIndicatorsFromCoins(coins: CoinData[]): MarketIndicatorsResult {
  if (coins.length === 0) {
    return {
      marketAiScore: 5,
      previousMarketAiScore: 5,
      marketAiScoreChange: 0,
      marketAiScoreChangePct: 0,
      dimensions: [],
      breadth: { bullCoins: 0, neutralCoins: 0, bearCoins: 0, total: 0, marketBreadth: 0 },
      coefficientVersion: 0,
    };
  }

  let totalScore = 0;
  let totalPrevScore = 0;
  let bullCoins = 0;
  let neutralCoins = 0;
  let bearCoins = 0;

  for (const coin of coins) {
    totalScore += coin.aiScore;
    totalPrevScore += coin.previousAiScore;

    if (coin.aiScore > 6) bullCoins++;
    else if (coin.aiScore < 4) bearCoins++;
    else neutralCoins++;
  }

  const numCoins = coins.length;
  const marketAiScore = Math.round((totalScore / numCoins) * 10) / 10;
  const previousMarketAiScore = Math.round((totalPrevScore / numCoins) * 10) / 10;
  const marketAiScoreChange = Math.round((marketAiScore - previousMarketAiScore) * 10) / 10;

  // Compute per-dimension aggregates
  const dimKeys = ['fundamental', 'technical', 'onchain', 'market_psychology', 'news_sentiment', 'macroeconomic', 'regulatory', 'network_security', 'derivatives', 'whale_smart_money', 'ecosystem_defi', 'inter_market'] as const;

  const dimensions: DimensionIndicator[] = dimKeys.map(dimKey => {
    const meta = DIMENSION_META[dimKey];

    let dimScoreSum = 0;
    let dimPrevScoreSum = 0;
    let dimCoeffSum = 0;
    let dimPrevCoeffSum = 0;
    let dimCount = 0;

    for (const coin of coins) {
      const dim = coin.dimensions.find(d => d.key === dimKey);
      if (dim) {
        dimScoreSum += dim.score;
        dimPrevScoreSum += dim.previousScore ?? (dim.score - (dim.scoreChange ?? 0));
        dimCoeffSum += dim.coefficient;
        dimPrevCoeffSum += dim.previousCoefficient ?? dim.coefficient;
        dimCount++;
      }
    }

    const dimScore = dimCount > 0 ? Math.round((dimScoreSum / dimCount) * 10) / 10 : 5;
    const dimPrevScore = dimCount > 0 ? Math.round((dimPrevScoreSum / dimCount) * 10) / 10 : 5;
    const dimScoreChange = Math.round((dimScore - dimPrevScore) * 10) / 10;
    const dimScoreChangePct = dimPrevScore !== 0 ? Math.round(((dimScore - dimPrevScore) / Math.abs(dimPrevScore)) * 1000) / 10 : 0;
    const dimCoeff = dimCount > 0 ? dimCoeffSum / dimCount : 0.25;
    const dimPrevCoeff = dimCount > 0 ? dimPrevCoeffSum / dimCount : 0.25;

    // Sub-dimensions from the first coin (they're the same structure)
    // Note: API may not include subDimensions in lightweight mode
    const firstDim = coins[0]?.dimensions.find(d => d.key === dimKey);
    const subDimensions: SubDimensionData[] = (firstDim?.subDimensions ?? []).map(sd => {
      const sdScore = dimCount > 0
        ? Math.round(coins.reduce((s, c) => {
            const d = c.dimensions.find(dd => dd.key === dimKey);
            const sub = d?.subDimensions?.find(ss => ss.key === sd.key);
            return s + (sub?.score ?? 5);
          }, 0) / dimCount * 10) / 10
        : 5;
      const sdPrevScore = dimCount > 0
        ? Math.round(coins.reduce((s, c) => {
            const d = c.dimensions.find(dd => dd.key === dimKey);
            const sub = d?.subDimensions?.find(ss => ss.key === sd.key);
            return s + (sub?.previousScore ?? 5);
          }, 0) / dimCount * 10) / 10
        : 5;
      const sdChange = Math.round((sdScore - sdPrevScore) * 10) / 10;
      const sdChangePct = sdPrevScore !== 0 ? Math.round(((sdScore - sdPrevScore) / Math.abs(sdPrevScore)) * 1000) / 10 : 0;
      return {
      key: sd.key,
      name: sd.name,
      nameFa: sd.nameFa,
      score: sdScore,
      previousScore: sdPrevScore,
      scoreChange: sdChange,
      scoreChangePct: sdChangePct,
      coefficient: sd.coefficient ?? 0.1,
      previousCoefficient: sd.previousCoefficient ?? 0.1,
      coefficientChange: sd.coefficientChange ?? 0,
      bullBearRatio: 1,
    };
    }) ?? [];

    return {
      key: dimKey,
      name: meta.name,
      nameFa: meta.nameFa,
      color: meta.color,
      icon: meta.icon,
      score: dimScore,
      previousScore: dimPrevScore,
      scoreChange: dimScoreChange,
      scoreChangePct: dimScoreChangePct,
      coefficient: Math.round(dimCoeff * 10000) / 10000,
      previousCoefficient: Math.round(dimPrevCoeff * 10000) / 10000,
      coefficientChange: Math.round((dimCoeff - dimPrevCoeff) * 10000) / 10000,
      bullBearRatio: bearCoins > 0 ? Math.round((bullCoins / bearCoins) * 100) / 100 : bullCoins > 0 ? 99 : 1,
      subDimensions,
    };
  });

  const breadth = {
    bullCoins,
    neutralCoins,
    bearCoins,
    total: numCoins,
    marketBreadth: numCoins > 0
      ? Math.round(((bullCoins - bearCoins) / numCoins) * 1000) / 10
      : 0,
  };

  const marketAiScoreChangePct = previousMarketAiScore !== 0
    ? Math.round(((marketAiScore - previousMarketAiScore) / Math.abs(previousMarketAiScore)) * 1000) / 10
    : 0;

  return {
    marketAiScore,
    previousMarketAiScore,
    marketAiScoreChange,
    marketAiScoreChangePct,
    dimensions,
    breadth,
    coefficientVersion: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// SPARKLINE COMPONENT
// ═══════════════════════════════════════════════════════════════

function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BULL/BEAR MINI GAUGE
// ═══════════════════════════════════════════════════════════════

function BullBearGauge({ ratio, size = 28 }: { ratio: number; size?: number }) {
  const clampedRatio = Math.max(0, Math.min(5, ratio));
  const pct = (clampedRatio / 5) * 100;
  const r = size / 2 - 3;
  const circumference = Math.PI * r;
  const progress = (pct / 100) * circumference;

  return (
    <svg width={size} height={size / 2 + 2} className="overflow-visible">
      <path
        d={`M 3 ${size / 2 - 1} A ${r} ${r} 0 0 1 ${size - 3} ${size / 2 - 1}`}
        fill="none"
        stroke="hsl(var(--muted) / 0.4)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <motion.path
        d={`M 3 ${size / 2 - 1} A ${r} ${r} 0 0 1 ${size - 3} ${size / 2 - 1}`}
        fill="none"
        stroke={pct > 60 ? '#22c55e' : pct > 40 ? '#facc15' : '#ef4444'}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION CARD
// ═══════════════════════════════════════════════════════════════

function DimensionCard({
  dimension,
  isExpanded,
  onToggle,
  sparklineData,
  trendData,
  trendLoading,
}: {
  dimension: DimensionIndicator;
  isExpanded: boolean;
  onToggle: () => void;
  sparklineData: number[];
  trendData: { date: string; aggregateScore?: number; score?: number }[];
  trendLoading: boolean;
}) {
  const IconComponent = ICON_MAP[dimension.icon] ?? BarChart3;
  const [showCoeffPanel, setShowCoeffPanel] = useState(false);

  return (
    <motion.div
      layout
      className="rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      {/* Main card content */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon + Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ backgroundColor: `${dimension.color}15` }}
            >
              <IconComponent className="w-4 h-4" style={{ color: dimension.color } as React.CSSProperties} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: dimension.color }}
                />
                <span className="text-sm font-semibold truncate">{dimension.name}</span>
              </div>

            </div>
          </div>

          {/* Right: Score + Delta */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tabular-nums" style={{ color: dimension.color }}>
                {dimension.score.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">/10</span>
            </div>
            {dimension.scoreChange !== 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] font-semibold',
                  dimension.scoreChange > 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {dimension.scoreChange > 0 ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {dimension.scoreChange > 0 ? '+' : ''}{dimension.scoreChangePct.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-3 text-[10px]">
          {/* Coefficient */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Coeff:</span>
            <span className="font-mono font-medium" style={{ color: dimension.color }}>
              {(dimension.coefficient * 100).toFixed(1)}%
            </span>
            {dimension.coefficientChange !== 0 && (
              <span className={cn(
                'font-mono',
                dimension.coefficientChange > 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                ({dimension.coefficientChange > 0 ? '+' : ''}{(dimension.coefficientChange * 100).toFixed(2)}%)
              </span>
            )}
          </div>

          {/* Bull/Bear */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">B/B:</span>
            <BullBearGauge ratio={dimension.bullBearRatio} size={24} />
            <span className="font-mono font-medium">{dimension.bullBearRatio.toFixed(1)}</span>
          </div>

          {/* Reference indicator + Expand */}
          <div className="ml-auto flex items-center gap-1 text-muted-foreground">
            {(() => {
              const dimKey = dimension.key as DimensionKey;
              const formulas = DIMENSION_FORMULAS.find(f => f.dimensionKey === dimKey);
              return formulas && formulas.formulas.length > 0 ? (
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 gap-0.5" style={{ borderColor: dimension.color + '30', color: dimension.color }}>
                  <BookMarked className="w-2 h-2" />
                  {formulas.formulas.length}
                </Badge>
              ) : null;
            })()}
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData.length > 1 && (
          <div className="mt-2 h-8 opacity-60 hover:opacity-100 transition-opacity">
            <MiniSparkline data={sparklineData} color={dimension.color} height={28} />
          </div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 py-3 space-y-3">
              {/* Trend Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">Score Trend</span>
                </div>
                <div className="h-[140px]">
                  {trendLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData.map(d => ({
                        date: d.date.slice(5),
                        score: d.aggregateScore ?? d.score,
                      }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[0, 10]}
                          tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                          width={20}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            fontSize: '10px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={dimension.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      No trend data
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-dimensions */}
              {dimension.subDimensions.length > 0 && (
                <div>
                  <span className="text-xs font-semibold mb-2 block">Sub-Dimensions</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {dimension.subDimensions.map((sub) => (
                      <div
                        key={sub.key}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: dimension.color }}
                          />
                          <span className="text-xs truncate">{sub.name}</span>

                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-bold tabular-nums" style={{ color: dimension.color }}>
                              {sub.score.toFixed(2)}
                            </span>
                            {sub.scoreChange !== 0 && (
                              <span className={cn(
                                'text-[9px] ml-1',
                                sub.scoreChange > 0 ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {sub.scoreChange > 0 ? '+' : ''}{sub.scoreChangePct.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          <div className="text-right w-14">
                            <span className="text-[9px] text-muted-foreground">Coeff</span>
                            <span className="text-[10px] font-mono ml-1">{(sub.coefficient * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas & Academic Sources */}
              {(() => {
                const dimKey = dimension.key as DimensionKey;
                const formulas = DIMENSION_FORMULAS.find(f => f.dimensionKey === dimKey);
                const refs = getReferencesForDimension(dimKey);
                if (!formulas && refs.length === 0) return null;
                return (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calculator className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-semibold">Formulas & Sources</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4" style={{ borderColor: dimension.color + '40', color: dimension.color }}>
                        {formulas ? formulas.formulas.length : 0} formulas
                      </Badge>
                    </div>
                    {/* Formula list */}
                    {formulas && formulas.formulas.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {formulas.formulas.map((f) => (
                          <div key={f.name} className="rounded-md border bg-muted/20 p-2">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-medium">{f.name}</span>
                              <span className="text-[9px] text-muted-foreground font-mono" dir="rtl" style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}>
                                {f.nameFa}
                              </span>
                            </div>
                            <div className="overflow-x-auto rounded bg-muted/50 px-2 py-1 mb-1">
                              <code className="whitespace-nowrap text-[10px] font-mono">{f.formula}</code>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{f.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <BookMarked className="w-2.5 h-2.5 text-primary/60" />
                              <span className="text-[9px] text-primary/70 font-medium">Source: {f.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Academic references for this dimension */}
                    {refs.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] text-muted-foreground">Academic references:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {refs.map((r) => (
                            <Badge
                              key={r.id}
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 max-w-[200px] truncate"
                              title={`${r.title} — ${r.author} (${r.year})`}
                            >
                              <BookMarked className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                              <span className="truncate">{r.author.split('&')[0].trim()} ({r.year})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Coefficient Evolution toggle */}
              <div className="pt-2 border-t">
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowCoeffPanel(!showCoeffPanel); }}
                >
                  {showCoeffPanel ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showCoeffPanel ? 'Hide' : 'Show'} Coefficient Evolution
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">ML</Badge>
                </button>
              </div>

              <AnimatePresence>
                {showCoeffPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CoefficientEvolutionChart
                      nodeKey={dimension.key}
                      color={dimension.color}
                      height={220}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface MarketIndicatorsDashboardProps {
  coins?: CoinData[];
}

export function MarketIndicatorsDashboard({ coins }: MarketIndicatorsDashboardProps) {
  const [apiData, setApiData] = useState<MarketIndicatorsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [showCoeffEvolution, setShowCoeffEvolution] = useState(false);

  // Per-dimension trend data (fetched on expand)
  const [trendDataMap, setTrendDataMap] = useState<Record<string, { date: string; aggregateScore?: number; score?: number }[]>>({});
  const [trendLoadingMap, setTrendLoadingMap] = useState<Record<string, boolean>>({});

  // Sparkline data (last 30 days per dimension)
  const [sparklineMap, setSparklineMap] = useState<Record<string, number[]>>({});

  // Compute indicators from coins data as primary source
  const computedIndicators = useMemo(() => {
    if (coins && coins.length > 0) {
      return computeIndicatorsFromCoins(coins);
    }
    return null;
  }, [coins]);

  // Fetch API data as secondary source
  const fetchIndicators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/indicators');
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      // Check if it's the new format (has dimensions array) or old format
      if (json.dimensions && Array.isArray(json.dimensions)) {
        setApiData(json);
      } else if (json.marketScore) {
        // Old format from other agent - convert it
        const ms = json.marketScore;
        const converted: MarketIndicatorsResult = {
          marketAiScore: ms.marketAiScore ?? 5,
          previousMarketAiScore: (ms.marketAiScore ?? 5) - (ms.change ?? 0),
          marketAiScoreChange: ms.change ?? 0,
          marketAiScoreChangePct: 0,
          dimensions: Object.entries(ms.dimensions ?? {}).map(([key, score]) => {
            const meta = DIMENSION_META[key];
            const prevScore = ms.previousDimensions?.[key] ?? (score as number);
            return {
              key,
              name: meta?.name ?? key,
              nameFa: meta?.nameFa ?? '',
              color: meta?.color ?? '#888',
              icon: meta?.icon ?? 'BarChart3',
              score: (score as number) ?? 5,
              previousScore: (prevScore as number) ?? 5,
              scoreChange: ((score as number) ?? 5) - ((prevScore as number) ?? 5),
              scoreChangePct: (prevScore as number) !== 0 ? Math.round((((score as number) ?? 5) - ((prevScore as number) ?? 5)) / Math.abs((prevScore as number) ?? 5) * 1000) / 10 : 0,
              coefficient: json.indicators?.[key]?.coefficient ?? 0.25,
              previousCoefficient: 0.25,
              coefficientChange: json.indicators?.[key]?.coefficientChange ?? 0,
              bullBearRatio: json.indicators?.[key]?.bullBearRatio ?? 1,
              subDimensions: [],
            };
          }),
          breadth: ms.breadth ?? { bullCoins: 0, neutralCoins: 0, bearCoins: 0, total: 0, marketBreadth: 0 },
          coefficientVersion: json.coefficientVersion ?? 0,
        };
        setApiData(converted);
      }
      // If neither branch matched (e.g., marketScore is null), that's fine —
      // the component falls back to computedIndicators from coins data
    } catch {
      // API failed, will use computed data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  // Use computed data from coins as PRIMARY source (supports all 12 dimensions),
  // API data only as supplementary for trend/sparkline data
  const data = computedIndicators ?? apiData;

  // Fetch sparkline data for each dimension
  useEffect(() => {
    if (!data) return;

    const fetchSparklines = async () => {
      for (const dim of data.dimensions) {
        try {
          const res = await fetch(
            `/api/market/indicators/history?nodeKey=${encodeURIComponent(dim.key)}&days=30`
          );
          if (!res.ok) continue;
          const json = await res.json();
          const history = json.history ?? json.data ?? [];
          const scores = history
            .map((h: { aggregateScore?: number | null; score?: number | null }) => h.aggregateScore ?? h.score)
            .filter((s: number | null | undefined): s is number => s != null);
          if (scores.length > 0) {
            setSparklineMap(prev => ({ ...prev, [dim.key]: scores }));
          }
        } catch {
          // Skip failed sparklines
        }
      }
    };

    fetchSparklines();
  }, [data]);

  // Fetch trend data when dimension is expanded
  useEffect(() => {
    if (!expandedDim) return;

    const fetchTrend = async () => {
      setTrendLoadingMap(prev => ({ ...prev, [expandedDim]: true }));
      try {
        const res = await fetch(
          `/api/market/indicators/history?nodeKey=${encodeURIComponent(expandedDim)}&days=90`
        );
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const history = json.history ?? json.data ?? [];
        setTrendDataMap(prev => ({ ...prev, [expandedDim]: history }));
      } catch {
        setTrendDataMap(prev => ({ ...prev, [expandedDim]: [] }));
      } finally {
        setTrendLoadingMap(prev => ({ ...prev, [expandedDim]: false }));
      }
    };

    if (!trendDataMap[expandedDim]) {
      fetchTrend();
    }
  }, [expandedDim, trendDataMap]);

  // ── Loading State ──
  if (loading && !data) {
    return (
      <div className="space-y-4 p-4 rounded-xl border bg-card/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex justify-center sm:col-span-2 lg:col-span-1">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER: Market Intelligence Index
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold tracking-tight">
          Market Intelligence Index
        </h2>

        {data.coefficientVersion > 0 && (
          <Badge variant="outline" className="text-[9px] ml-auto">
            Coeff v{data.coefficientVersion}
          </Badge>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT: Gauge + Dimension Cards
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overall Market AI Score Gauge */}
        <Card className="sm:col-span-2 lg:col-span-1 flex items-center justify-center p-4 border-primary/20 bg-primary/5">
          <CardContent className="p-0 flex flex-col items-center">
            <MarketScoreGauge
              score={data.marketAiScore}
              previousScore={data.previousMarketAiScore}
              size={160}
              maxValue={10}
              label="Market Intelligence Index"
              sublabel="Market Intelligence Index"
            />
          </CardContent>
        </Card>

        {/* 12 Dimension Cards */}
        {data.dimensions.map((dim) => (
          <DimensionCard
            key={dim.key}
            dimension={dim}
            isExpanded={expandedDim === dim.key}
            onToggle={() => setExpandedDim(expandedDim === dim.key ? null : dim.key)}
            sparklineData={sparklineMap[dim.key] ?? []}
            trendData={trendDataMap[dim.key] ?? []}
            trendLoading={trendLoadingMap[dim.key] ?? false}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MARKET BREADTH
          ═══════════════════════════════════════════════════════════ */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold">Market Breadth</span>

          <Badge
            variant="secondary"
            className={cn(
              'ml-auto text-xs font-bold',
              (data.breadth.marketBreadth ?? 0) > 20 ? 'bg-emerald-500/15 text-emerald-400' :
              (data.breadth.marketBreadth ?? 0) > 0 ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'
            )}
          >
            {(data.breadth.marketBreadth ?? 0) > 0 ? '+' : ''}{(data.breadth.marketBreadth ?? 0).toFixed(0)}%
          </Badge>
        </div>
        <MarketBreadthBar
          bullCoins={data.breadth.bullCoins}
          neutralCoins={data.breadth.neutralCoins}
          bearCoins={data.breadth.bearCoins}
          total={data.breadth.total}
        />
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          COEFFICIENT EVOLUTION PANEL (toggleable)
          ═══════════════════════════════════════════════════════════ */}
      <div>
        <button
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-1"
          onClick={() => setShowCoeffEvolution(!showCoeffEvolution)}
        >
          {showCoeffEvolution ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showCoeffEvolution ? 'Hide' : 'Show'} Coefficient Evolution Panel
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
            {data.dimensions.length} dimensions • ML
          </Badge>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', showCoeffEvolution && 'rotate-180')}
          />
        </button>

        <AnimatePresence>
          {showCoeffEvolution && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {data.dimensions.map((dim) => (
                  <CoefficientEvolutionChart
                    key={dim.key}
                    nodeKey={dim.key}
                    color={dim.color}
                    title={`${dim.name} Coefficient Evolution`}
                    height={250}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
