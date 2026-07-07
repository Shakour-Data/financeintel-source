'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Network,
  Brain,
  Newspaper,
  Globe,
  Landmark,
  Shield,
  TrendingUp as DerivativesIcon,
  Anchor,
  Layers,
  Link2,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreBadge } from './score-badge';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── Types ──────────────────────────────────────────────────────

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  aiScore: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface ScoreRankingsPanelProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
}

// ─── Dimension Metadata ─────────────────────────────────────────

const DIMENSION_META: {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { key: 'fundamental', name: 'Fundamental', nameFa: 'بنیادی', color: '#ef4444', icon: BarChart3, description: 'Valuation, supply dynamics, project quality' },
  { key: 'technical', name: 'Technical', nameFa: 'تکنیکال', color: '#3b82f6', icon: Activity, description: 'Trend analysis, patterns, risk management' },
  { key: 'onchain', name: 'On-Chain', nameFa: 'آنچین', color: '#22c55e', icon: Network, description: 'Transaction analysis, liquidity, smart money' },
  { key: 'market_psychology', name: 'Market Psychology', nameFa: 'روانشناسی بازار', color: '#f59e0b', icon: Brain, description: 'Investor sentiment, behavioral patterns' },
  { key: 'news_sentiment', name: 'News & Sentiment', nameFa: 'اخبار و احساسات', color: '#8b5cf6', icon: Newspaper, description: 'News impact, social signals, NLP scoring' },
  { key: 'macroeconomic', name: 'Macroeconomic', nameFa: 'کلان اقتصادی', color: '#a855f7', icon: Globe, description: 'DXY, SPX, gold, oil, treasury impacts' },
  { key: 'regulatory', name: 'Regulatory', nameFa: 'قانونی و نظارتی', color: '#94a3b8', icon: Landmark, description: 'Regulatory clarity, compliance, legal risk' },
  { key: 'network_security', name: 'Network Security', nameFa: 'امنیت شبکه', color: '#ea580c', icon: Shield, description: 'Hash rate, decentralization, attack risk' },
  { key: 'derivatives', name: 'Derivatives', nameFa: 'مشتقات', color: '#06b6d4', icon: TrendingUp, description: 'Funding rates, open interest, liquidations' },
  { key: 'whale_smart_money', name: 'Whale & Smart Money', nameFa: 'نهنگ‌ها و هوشمند', color: '#1e40af', icon: Anchor, description: 'Whale flows, institutional activity' },
  { key: 'ecosystem_defi', name: 'Ecosystem & DeFi', nameFa: 'اکوسیستم و دیفای', color: '#10b981', icon: Layers, description: 'TVL, DeFi integration, ecosystem health' },
  { key: 'inter_market', name: 'Inter-Market', nameFa: 'بین‌بازاری', color: '#64748b', icon: Link2, description: 'Cross-market correlations, spillover effects' },
];

// ─── Helpers ────────────────────────────────────────────────────

function getDimScore(dimensions: Dimension[], key: string): number {
  return dimensions.find(d => d.key === key)?.score ?? 0;
}

function getDimScoreChangePct(dimensions: Dimension[], key: string): number {
  return dimensions.find(d => d.key === key)?.scoreChangePct ?? 0;
}

function getDimCoefficient(dimensions: Dimension[], key: string): number {
  return dimensions.find(d => d.key === key)?.coefficient ?? 0;
}

function getScoreColor(score: number): string {
  if (score >= 8.5) return 'text-emerald-500';
  if (score >= 7) return 'text-emerald-400';
  if (score >= 5) return 'text-yellow-500';
  if (score >= 3) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 8.5) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 7) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 5) return 'bg-yellow-500/10 border-yellow-500/20';
  if (score >= 3) return 'bg-orange-400/10 border-orange-400/20';
  return 'bg-red-400/10 border-red-400/20';
}

function getRankBadge(rank: number): { label: string; className: string } | null {
  if (rank === 1) return { label: '🥇', className: 'text-lg' };
  if (rank === 2) return { label: '🥈', className: 'text-lg' };
  if (rank === 3) return { label: '🥉', className: 'text-lg' };
  return null;
}

// ─── Dimension Leaderboard Card ─────────────────────────────────

function DimensionLeaderboard({
  dimMeta,
  coins,
  onSelectCoin,
  expanded,
  onToggle,
}: {
  dimMeta: typeof DIMENSION_META[number];
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sorted = useMemo(() =>
    [...coins]
      .map(c => ({
        ...c,
        dimScore: getDimScore(c.dimensions, dimMeta.key),
        dimChange: getDimScoreChangePct(c.dimensions, dimMeta.key),
        dimCoeff: getDimCoefficient(c.dimensions, dimMeta.key),
      }))
      .sort((a, b) => b.dimScore - a.dimScore),
    [coins, dimMeta.key]
  );

  const avgScore = sorted.length > 0
    ? sorted.reduce((s, c) => s + c.dimScore, 0) / sorted.length
    : 0;

  const topCount = sorted.filter(c => c.dimScore >= 7).length;
  const bottomCount = sorted.filter(c => c.dimScore < 3).length;

  const Icon = dimMeta.icon;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/* Header - Always visible */}
      <div
        className="cursor-pointer p-4"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${dimMeta.color}15`, border: `1px solid ${dimMeta.color}30` }}
          >
            <Icon className="w-5 h-5" style={{ color: dimMeta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{dimMeta.name}</h3>
              <span className="text-xs text-muted-foreground" dir="rtl">{dimMeta.nameFa}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{dimMeta.description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Stats */}
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: dimMeta.color }}>
                {avgScore.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground">avg score</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-emerald-500">{topCount}</div>
              <div className="text-[10px] text-muted-foreground">strong</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-red-400">{bottomCount}</div>
              <div className="text-[10px] text-muted-foreground">weak</div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Top 3 Preview (collapsed) */}
        {!expanded && (
          <div className="flex items-center gap-2 mt-3">
            {sorted.slice(0, 3).map((coin, i) => (
              <div
                key={coin.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-muted/30 text-xs"
              >
                <span className="font-mono text-muted-foreground">{i + 1}</span>
                <img src={coin.image} alt={coin.symbol} className="w-4 h-4 rounded-full" loading="lazy" />
                <span className="font-medium uppercase">{coin.symbol}</span>
                <span className={cn('font-bold', getScoreColor(coin.dimScore))}>
                  {coin.dimScore.toFixed(1)}
                </span>
              </div>
            ))}
            {sorted.length > 3 && (
              <span className="text-xs text-muted-foreground">+{sorted.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Leaderboard */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 pb-4 pt-3">
              <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {sorted.map((coin, i) => {
                  const rankBadge = getRankBadge(i + 1);
                  return (
                    <div
                      key={coin.id}
                      onClick={() => onSelectCoin(coin)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        i < 3 && 'bg-muted/20'
                      )}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center shrink-0">
                        {rankBadge ? (
                          <span className={rankBadge.className}>{rankBadge.label}</span>
                        ) : (
                          <span className="text-sm font-mono text-muted-foreground">{i + 1}</span>
                        )}
                      </div>

                      {/* Coin info */}
                      <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full shrink-0" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{coin.name}</span>
                          <span className="text-xs text-muted-foreground uppercase">{coin.symbol}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Rank #{coin.market_cap_rank}</span>
                          <span>·</span>
                          <span className={(coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                            {(coin.price_change_percentage_24h ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="w-24 shrink-0">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(coin.dimScore / 10) * 100}%`,
                              backgroundColor: dimMeta.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Score value */}
                      <div className="w-12 text-right shrink-0">
                        <span className={cn('text-sm font-bold', getScoreColor(coin.dimScore))}>
                          {coin.dimScore.toFixed(1)}
                        </span>
                      </div>

                      {/* Change */}
                      <div className="w-14 text-right shrink-0">
                        {coin.dimChange !== 0 && (
                          <span className={cn(
                            'text-xs font-medium inline-flex items-center gap-0.5',
                            coin.dimChange > 0 ? 'text-emerald-400' : 'text-red-400'
                          )}>
                            {coin.dimChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {coin.dimChange > 0 ? '+' : ''}{coin.dimChange.toFixed(2)}%
                          </span>
                        )}
                      </div>

                      {/* Weight */}
                      <div className="w-12 text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                          {(coin.dimCoeff * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Overall Rankings Summary ────────────────────────────────────

function OverallRankingsSummary({ coins, onSelectCoin }: { coins: CoinData[]; onSelectCoin: (coin: CoinData) => void }) {
  // Compute overall rankings with all dimensions considered
  const rankedCoins = useMemo(() => {
    return [...coins].map(c => {
      const dimScores = DIMENSION_META.map(d => getDimScore(c.dimensions, d.key));
      const strongDims = dimScores.filter(s => s >= 7).length;
      const weakDims = dimScores.filter(s => s < 3).length;
      const maxDim = Math.max(...dimScores);
      const minDim = Math.min(...dimScores);
      const bestDimKey = DIMENSION_META[dimScores.indexOf(maxDim)]?.key ?? '';
      const worstDimKey = DIMENSION_META[dimScores.indexOf(minDim)]?.key ?? '';

      return {
        ...c,
        strongDims,
        weakDims,
        maxDim,
        minDim,
        bestDimKey,
        worstDimKey,
        scoreVariance: dimScores.length > 0
          ? Math.sqrt(dimScores.reduce((sum, s) => sum + Math.pow(s - c.aiScore, 2), 0) / dimScores.length)
          : 0,
      };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }, [coins]);

  const topOverall = rankedCoins.slice(0, 10);
  const mostBalanced = [...rankedCoins].sort((a, b) => a.scoreVariance - b.scoreVariance).slice(0, 10);
  const mostStrongDims = [...rankedCoins].sort((a, b) => b.strongDims - a.strongDims).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Three summary cards in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Overall */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top Overall AI Score
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {topOverall.slice(0, 5).map((coin, i) => (
                <div
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" loading="lazy" />
                  <span className="text-xs font-medium flex-1 truncate">{coin.symbol.toUpperCase()}</span>
                  <ScoreBadge score={coin.aiScore} confidence={coin.confidence} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Balanced */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Medal className="w-4 h-4 text-blue-500" />
              Most Balanced Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {mostBalanced.slice(0, 5).map((coin, i) => (
                <div
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" loading="lazy" />
                  <span className="text-xs font-medium flex-1 truncate">{coin.symbol.toUpperCase()}</span>
                  <Badge variant="outline" className="text-[10px] font-mono h-5">
                    σ={coin.scoreVariance.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Strong Dimensions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Most Strong Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {mostStrongDims.slice(0, 5).map((coin, i) => (
                <div
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                  <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" loading="lazy" />
                  <span className="text-xs font-medium flex-1 truncate">{coin.symbol.toUpperCase()}</span>
                  <Badge variant="outline" className="text-[10px] font-mono h-5 text-emerald-400 border-emerald-500/30">
                    {coin.strongDims}/12 ≥7
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Dimension Comparison Matrix ────────────────────────────────

function DimensionComparisonMatrix({ coins, onSelectCoin }: { coins: CoinData[]; onSelectCoin: (coin: CoinData) => void }) {
  const [sortBy, setSortBy] = useState<string>('aiScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number>(20);

  const sorted = useMemo(() => {
    const withScores = coins.map(c => {
      const dimMap: Record<string, number> = {};
      DIMENSION_META.forEach(d => {
        dimMap[d.key] = getDimScore(c.dimensions, d.key);
      });
      return { ...c, dimMap };
    });

    return [...withScores].sort((a, b) => {
      const aVal = sortBy === 'aiScore' ? a.aiScore : a.dimMap[sortBy] ?? 0;
      const bVal = sortBy === 'aiScore' ? b.aiScore : b.dimMap[sortBy] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    }).slice(0, limit);
  }, [coins, sortBy, sortDir, limit]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Score Comparison Matrix
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show:</span>
            {[20, 50, 100, 200].map(n => (
              <Button
                key={n}
                variant={limit === n ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setLimit(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 sticky left-0 bg-card z-10 min-w-[120px]">Coin</th>
                <th
                  className="text-center py-2 px-1 cursor-pointer hover:text-foreground transition-colors min-w-[40px]"
                  onClick={() => {
                    if (sortBy === 'aiScore') setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                    else { setSortBy('aiScore'); setSortDir('desc'); }
                  }}
                >
                  <div className={cn('font-semibold', sortBy === 'aiScore' && 'text-emerald-500')}>AI</div>
                </th>
                {DIMENSION_META.map(d => (
                  <th
                    key={d.key}
                    className="text-center py-2 px-0.5 cursor-pointer hover:text-foreground transition-colors min-w-[32px]"
                    onClick={() => {
                      if (sortBy === d.key) setSortDir(dir => dir === 'desc' ? 'asc' : 'desc');
                      else { setSortBy(d.key); setSortDir('desc'); }
                    }}
                  >
                    <div
                      className={cn('font-semibold', sortBy === d.key && 'underline')}
                      style={{ color: d.color }}
                      title={d.name}
                    >
                      {d.name.slice(0, 3)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(coin => (
                <tr
                  key={coin.id}
                  className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => onSelectCoin(coin)}
                >
                  <td className="py-1.5 px-2 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-1.5">
                      <img src={coin.image} alt={coin.symbol} className="w-4 h-4 rounded-full" loading="lazy" />
                      <span className="font-medium uppercase">{coin.symbol}</span>
                    </div>
                  </td>
                  <td className="text-center py-1.5 px-1">
                    <span className={cn('font-bold', getScoreColor(coin.aiScore))}>
                      {coin.aiScore.toFixed(1)}
                    </span>
                  </td>
                  {DIMENSION_META.map(d => {
                    const score = getDimScore(coin.dimensions, d.key);
                    return (
                      <td key={d.key} className="text-center py-1.5 px-0.5">
                        <div
                          className={cn(
                            'inline-flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold border',
                            getScoreBg(score),
                            getScoreColor(score)
                          )}
                        >
                          {score.toFixed(1)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Score Rankings Panel ──────────────────────────────────

export function ScoreRankingsPanel({ coins, onSelectCoin }: ScoreRankingsPanelProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>('fundamental');
  const [activeView, setActiveView] = useState<'leaderboards' | 'overview' | 'matrix'>('leaderboards');

  const toggleDim = (key: string) => {
    setExpandedDim(prev => prev === key ? null : key);
  };

  // Compute dimension-level stats
  const dimStats = useMemo(() => {
    return DIMENSION_META.map(d => {
      const scores = coins.map(c => getDimScore(c.dimensions, d.key));
      const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      const max = scores.length > 0 ? Math.max(...scores) : 0;
      const min = scores.length > 0 ? Math.min(...scores) : 0;
      const strong = scores.filter(s => s >= 7).length;
      const weak = scores.filter(s => s < 3).length;
      return { ...d, avg, max, min, strong, weak };
    });
  }, [coins]);

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <Tabs value={activeView} onValueChange={v => setActiveView(v as typeof activeView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboards" className="gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            Dimension Leaderboards
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Overall Rankings
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Comparison Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboards" className="mt-4">
          {/* Quick Stats Bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {dimStats.map(d => {
              const Icon = d.icon;
              const isExpanded = expandedDim === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => toggleDim(d.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    isExpanded
                      ? 'border-foreground/30 bg-foreground/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  )}
                  style={isExpanded ? { borderColor: `${d.color}40`, backgroundColor: `${d.color}10` } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                  <span>{d.name}</span>
                  <span className="font-mono font-bold" style={{ color: d.color }}>
                    {d.avg.toFixed(1)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dimension Leaderboards */}
          <div className="space-y-3">
            {DIMENSION_META.map(d => (
              <DimensionLeaderboard
                key={d.key}
                dimMeta={d}
                coins={coins}
                onSelectCoin={onSelectCoin}
                expanded={expandedDim === d.key}
                onToggle={() => toggleDim(d.key)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <OverallRankingsSummary coins={coins} onSelectCoin={onSelectCoin} />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <DimensionComparisonMatrix coins={coins} onSelectCoin={onSelectCoin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ScoreRankingsPanel;
