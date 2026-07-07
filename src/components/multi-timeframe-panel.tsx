'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Radio,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SignalDot, ConsensusDisplay } from '@/components/timeframe-signal-badge';
import { MultiTimeframeChart } from '@/components/multi-timeframe-chart';
import type { TimeFrame, TimeFrameScore, MultiTimeFrameResult } from '@/lib/multi-timeframe';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// The API can return either `timeFrames` (full) or `tfScores` (lightweight)
interface ApiTfScore {
  timeFrame: string;
  aiScore: number;
  trend: string;
  weight?: number;
  dimensions?: Array<{ key: string; name: string; score: number; signal: string }>;
  momentum?: number;
  volatility?: string;
}

interface ApiCoinResult {
  coinId: string;
  symbol: string;
  overallScore: number;
  overallSignal: string;
  consensus: {
    bullCount: number;
    bearCount: number;
    neutralCount: number;
    alignment: string;
  };
  timeFrames?: TimeFrameScore[];
  tfScores?: ApiTfScore[];
  lastUpdated?: string;
}

interface MTFAllResponse {
  coins: MultiTimeFrameResult[];
  meta: {
    totalCoins: number;
    timeframes: string[];
    lastUpdated: string;
  };
}

// Normalize API response to expected MultiTimeFrameResult format
function normalizeApiResponse(raw: { coins: ApiCoinResult[]; meta: MTFAllResponse['meta'] }): MTFAllResponse {
  return {
    coins: raw.coins.map(coin => {
      // Use timeFrames if available, otherwise map from tfScores
      const timeFrames: TimeFrameScore[] = coin.timeFrames?.length
        ? coin.timeFrames
        : (coin.tfScores ?? []).map((tf): TimeFrameScore => ({
            timeFrame: tf.timeFrame as TimeFrame,
            weight: tf.weight ?? (1 / (coin.tfScores?.length ?? 8)),
            aiScore: tf.aiScore,
            dimensions: (tf.dimensions ?? []).map(d => ({
            ...d,
            signal: d.signal as 'bullish' | 'bearish' | 'neutral',
          })),
            trend: tf.trend as TimeFrameScore['trend'],
            momentum: tf.momentum ?? 0,
            volatility: (tf.volatility ?? 'medium') as 'low' | 'medium' | 'high',
          }));

      return {
        coinId: coin.coinId,
        symbol: coin.symbol,
        overallScore: coin.overallScore,
        overallSignal: coin.overallSignal as MultiTimeFrameResult['overallSignal'],
        timeFrames,
        consensus: {
          bullCount: coin.consensus?.bullCount ?? 0,
          bearCount: coin.consensus?.bearCount ?? 0,
          neutralCount: coin.consensus?.neutralCount ?? 0,
          alignment: (coin.consensus?.alignment ?? 'neutral') as 'neutral' | 'aligned_bull' | 'aligned_bear' | 'mixed',
        },
        lastUpdated: coin.lastUpdated ?? new Date().toISOString(),
      };
    }),
    meta: raw.meta,
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const TF_DISPLAY_ORDER: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];

const DIMENSION_COLORS: Record<string, string> = {
  fundamental: '#ef4444',
  technical: '#3b82f6',
  onchain: '#22c55e',
  market_psychology: '#f59e0b',
  news_sentiment: '#8b5cf6',
  macroeconomic: '#a855f7',
  regulatory: '#94a3b8',
  network_security: '#ea580c',
  derivatives: '#06b6d4',
  whale_smart_money: '#1e40af',
  ecosystem_defi: '#10b981',
  inter_market: '#64748b',
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getConsensusIcon(alignment: string) {
  if (alignment?.includes('bull')) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (alignment?.includes('bear')) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-yellow-400" />;
}

function getConsensusLabel(alignment: string): string {
  if (!alignment) return 'Mixed';
  return alignment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getConsensusColor(alignment: string): string {
  if (alignment?.includes('bull')) return 'text-emerald-400';
  if (alignment?.includes('bear')) return 'text-red-400';
  return 'text-yellow-400';
}

function getScoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 60) return 'bg-emerald-500/15 border-emerald-500/25';
  if (score >= 40) return 'bg-yellow-500/15 border-yellow-500/25';
  return 'bg-red-500/15 border-red-500/25';
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// COIN NAME MAP (for display)
// ═══════════════════════════════════════════════════════════════

const COIN_NAMES: Record<string, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  binancecoin: 'BNB',
  solana: 'Solana',
  ripple: 'XRP',
  cardano: 'Cardano',
  dogecoin: 'Dogecoin',
  polkadot: 'Polkadot',
  avalanche: 'Avalanche',
  chainlink: 'Chainlink',
  tron: 'TRON',
  tether: 'Tether',
  'usd-coin': 'USDC',
};

// ═══════════════════════════════════════════════════════════════
// EXPANDED ROW - Per-TF Dimension Scores
// ═══════════════════════════════════════════════════════════════

function ExpandedCoinDetail({ coin }: { coin: MultiTimeFrameResult }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Per-TF Chart */}
        <div className="rounded-xl border bg-muted/5 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">
            Score Distribution Across Timeframes
          </h4>
          <MultiTimeframeChart
            timeFrames={coin.timeFrames}
            overallScore={coin.overallScore}
            height={200}
          />
        </div>

        {/* Per-TF Dimension Grid - only show if dimension data exists */}
        {coin.timeFrames[0]?.dimensions?.length > 0 && (
        <div className="rounded-xl border bg-muted/5 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">
            Dimension Scores per Timeframe
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Dimension</th>
                  {coin.timeFrames.map((tf) => (
                    <th key={tf.timeFrame} className="text-center py-2 px-1.5 font-semibold text-muted-foreground min-w-[50px]">
                      {tf.timeFrame}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coin.timeFrames[0].dimensions.map((dim, dimIdx) => (
                  <tr key={dim.key} className={cn('border-b border-border/20', dimIdx % 2 === 0 && 'bg-muted/10')}>
                    <td className="py-1.5 px-2 font-medium flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: DIMENSION_COLORS[dim.key] ?? '#888' }}
                      />
                      <span className="truncate max-w-[100px]">{dim.name}</span>
                    </td>
                    {coin.timeFrames.map((tf) => {
                      const d = tf.dimensions[dimIdx];
                      if (!d) return <td key={tf.timeFrame} className="text-center py-1.5 px-1.5">-</td>;
                      return (
                        <td key={tf.timeFrame} className="text-center py-1.5 px-1.5">
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[32px] px-1 py-0.5 rounded text-[10px] font-bold',
                            d.signal === 'bullish' ? 'bg-emerald-500/15 text-emerald-400' :
                            d.signal === 'bearish' ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          )}>
                            {d.score.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Consensus Detail */}
        <div className="rounded-xl border bg-muted/5 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">
            Consensus Breakdown
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ConsensusDisplay
              bullCount={coin.consensus.bullCount}
              bearCount={coin.consensus.bearCount}
              neutralCount={coin.consensus.neutralCount}
              alignment={coin.consensus.alignment}
              size="md"
            />
            <div className="space-y-2">
              {coin.timeFrames.map((tf) => (
                <div key={tf.timeFrame} className="flex items-center gap-2 text-xs">
                  <SignalDot trend={tf.trend} size={8} />
                  <span className="font-medium w-8">{tf.timeFrame}</span>
                  <span className={cn('font-mono', getScoreColor(tf.aiScore))}>
                    {tf.aiScore.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    Momentum: <span className={tf.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {tf.momentum >= 0 ? '+' : ''}{tf.momentum.toFixed(2)}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {tf.volatility}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COIN ROW
// ═══════════════════════════════════════════════════════════════

function CoinRow({
  coin,
  isExpanded,
  onToggle,
}: {
  coin: MultiTimeFrameResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Create a lookup map for quick TF access
  const tfMap = new Map(coin.timeFrames.map(tf => [tf.timeFrame, tf]));

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left group"
      >
        {/* Expand indicator */}
        <span className="shrink-0 w-4">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </span>

        {/* Coin name + symbol */}
        <div className="w-24 sm:w-32 shrink-0">
          <div className="text-sm font-semibold truncate">
            {COIN_NAMES[coin.coinId] ?? coin.coinId}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-mono">
            {coin.symbol}
          </div>
        </div>

        {/* Per-TF Signal Dots */}
        <div className="flex-1 flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {TF_DISPLAY_ORDER.map((tfKey) => {
            const tf = tfMap.get(tfKey);
            if (!tf) {
              return (
                <span key={tfKey} className="w-6 sm:w-8 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                </span>
              );
            }
            return (
              <span key={tfKey} className="flex flex-col items-center gap-0.5 w-6 sm:w-8 shrink-0">
                <SignalDot trend={tf.trend} size={isExpanded ? 10 : 8} />
                <span className="text-[9px] text-muted-foreground hidden sm:block">{tfKey}</span>
              </span>
            );
          })}
        </div>

        {/* Overall Score */}
        <div className={cn(
          'shrink-0 text-sm font-bold tabular-nums px-2.5 py-1 rounded-md border',
          getScoreBg(coin.overallScore),
          getScoreColor(coin.overallScore)
        )}>
          {coin.overallScore.toFixed(1)}
        </div>

        {/* Consensus */}
        <div className="w-16 sm:w-24 shrink-0 flex items-center gap-1 justify-end">
          {getConsensusIcon(coin.consensus.alignment)}
          <span className={cn(
            'text-xs font-semibold hidden sm:inline',
            getConsensusColor(coin.consensus.alignment)
          )}>
            {coin.consensus.alignment?.includes('bull') ? 'Bull' :
             coin.consensus.alignment?.includes('bear') ? 'Bear' : 'Mixed'}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && <ExpandedCoinDetail coin={coin} />}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MultiTimeframePanel({ autoExpand = false }: { autoExpand?: boolean }) {
  const [data, setData] = useState<MTFAllResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(autoExpand ? true : false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const url = forceRefresh
        ? '/api/market/multi-timeframe?all=true&forceRefresh=true'
        : '/api/market/multi-timeframe?all=true';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (HTTP ${res.status})`);
      }
      const rawJson = await res.json();
      const json: MTFAllResponse = normalizeApiResponse(rawJson);
      setData(json);
      setFetchedAt(Date.now());
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch only when expanded for the first time
  useEffect(() => {
    if (isExpanded && !data && !loading) {
      fetchData();
    }
  }, [isExpanded, data, loading, fetchData]);

  // Auto-refresh every 5 minutes when expanded
  useEffect(() => {
    if (isExpanded && data) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, CACHE_TTL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isExpanded, data, fetchData]);

  const isLive = fetchedAt > 0 && (Date.now() - fetchedAt) < CACHE_TTL_MS;

  return (
    <Card className="border-border/50 bg-[#0c0f14]">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => !autoExpand && setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Multi-Timeframe Analysis</h2>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isExpanded
                    ? 'Analysis across 8 timeframes (1m to 1M) - Weighted consensus score'
                    : '8 timeframes (1m to 1M) - Click to expand and load analysis'}
                </p>
              </div>
            </div>
            {/* Live indicator */}
            {isLive && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 text-[10px]"
              >
                <Radio className="w-3 h-3 animate-pulse" />
                Live
              </Badge>
            )}
            {refreshing && data && (
              <Badge
                variant="outline"
                className="border-purple-500/30 bg-purple-500/10 text-purple-400 gap-1.5 text-[10px]"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing...
              </Badge>
            )}
          </button>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Legend - only when expanded */}
        {isExpanded && (
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Bullish
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Bearish
            </span>
          </div>
        )}
      </CardHeader>

      {/* Content - only when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0">
              {loading && !data && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span className="text-sm text-muted-foreground">
                    Computing multi-timeframe scores for top 10 coins...
                  </span>
                </div>
              )}

              {error && !data && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                    className="gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </Button>
                </div>
              )}

              {error && data && (
                <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5 text-xs text-yellow-600 flex items-center gap-2">
                  {error} - showing cached data
                </div>
              )}

              {data && (
                <>
                  {/* Table Header */}
                  <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                    <span className="w-4" />
                    <span className="w-24 sm:w-32">Coin</span>
                    <div className="flex-1 flex items-center gap-1 sm:gap-2 overflow-x-auto">
                      {TF_DISPLAY_ORDER.map(tf => (
                        <span key={tf} className="w-6 sm:w-8 text-center shrink-0">{tf}</span>
                      ))}
                    </div>
                    <span className="shrink-0 text-center px-2">Score</span>
                    <span className="w-16 sm:w-24 shrink-0 text-right">Consensus</span>
                  </div>

                  {/* Coin Rows */}
                  <div className="max-h-96 overflow-y-auto">
                    {data.coins.map((coin) => (
                      <CoinRow
                        key={coin.coinId}
                        coin={coin}
                        isExpanded={expandedCoin === coin.coinId}
                        onToggle={() =>
                          setExpandedCoin(expandedCoin === coin.coinId ? null : coin.coinId)
                        }
                      />
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 px-4 text-[10px] text-muted-foreground">
                    <span>
                      {data.meta.totalCoins} coins - {data.meta.timeframes.length} timeframes
                    </span>
                    {data.meta.lastUpdated && (
                      <span>
                        Last updated: {formatTimeAgo(data.meta.lastUpdated)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
