'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  GitCompareArrows,
  X,
  Trash2,
  Trophy,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip as RTooltip,
} from 'recharts';
import { useCompare } from '@/lib/user-data';
import type { Dimension } from '@/lib/scoring-engine-v2';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

// ─── Interfaces ────────────────────────────────────────────────

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_1h_in_currency?: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface ComparePanelProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
}

// ─── Constants ─────────────────────────────────────────────────

// Dimension colors (reuse from crypto-table.tsx)
const DIM_COLORS: Record<string, string> = {
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

const DIM_KEYS = [
  'fundamental',
  'technical',
  'onchain',
  'market_psychology',
  'news_sentiment',
  'macroeconomic',
  'regulatory',
  'network_security',
  'derivatives',
  'whale_smart_money',
  'ecosystem_defi',
  'inter_market',
] as const;

// Short labels for radar axis and table
const DIM_SHORT: Record<string, string> = {
  fundamental: 'Fundamental',
  technical: 'Technical',
  onchain: 'On-Chain',
  market_psychology: 'Psychology',
  news_sentiment: 'News',
  macroeconomic: 'Macro',
  regulatory: 'Regulatory',
  network_security: 'Security',
  derivatives: 'Derivatives',
  whale_smart_money: 'Whale',
  ecosystem_defi: 'DeFi',
  inter_market: 'Inter-Market',
};

// 4 colors for the coin series in the radar chart — emerald/teal/amber/rose
// (NO blue/indigo per design system)
const COIN_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e'];

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const MAX_COMPARE = 4;

// ─── Helper Functions ──────────────────────────────────────────

function formatPrice(p: number): string {
  if (p >= 1)
    return `$${p.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toExponential(3)}`;
}

function formatCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatSupply(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}

function formatPct(p: number | undefined | null): string {
  if (p === undefined || p === null || Number.isNaN(p)) return '—';
  return `${p > 0 ? '+' : ''}${p.toFixed(2)}%`;
}

function getDimScore(coin: CoinData, key: string): number {
  const dim = coin.dimensions.find((d) => d.key === key);
  return dim?.score ?? 0;
}

function aiScoreColor(score: number): string {
  if (score >= 7) return 'text-emerald-500';
  if (score >= 5) return 'text-amber-500';
  return 'text-rose-500';
}

/**
 * Find the index of the "best" value among the coins for a given getter.
 * higherIsBetter: true → max wins, false → min wins.
 * Returns -1 if no valid best (e.g. all undefined).
 */
function findBestIdx(
  coins: CoinData[],
  getter: (c: CoinData) => number | undefined,
  higherIsBetter: boolean,
): number {
  let bestIdx = -1;
  let bestVal: number | undefined;
  for (let i = 0; i < coins.length; i++) {
    const v = getter(coins[i]);
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    if (bestVal === undefined) {
      bestVal = v;
      bestIdx = i;
    } else if (higherIsBetter ? v > bestVal : v < bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── Main Component ────────────────────────────────────────────

export function ComparePanel({ coins, onSelectCoin }: ComparePanelProps) {
  const ids = useCompare((s) => s.ids);
  const add = useCompare((s) => s.add);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);

  // Local state for the "add coin" Select — reset to '' after each pick so the
  // placeholder reappears.
  const [selectValue, setSelectValue] = useState<string>('');

  const selectedCoins = useMemo(() => {
    return ids
      .map((id) => coins.find((c) => c.id === id))
      .filter((c): c is CoinData => Boolean(c));
  }, [ids, coins]);

  const availableCoins = useMemo(() => {
    return coins
      .filter((c) => !ids.includes(c.id))
      .sort((a, b) => a.market_cap_rank - b.market_cap_rank);
  }, [coins, ids]);

  // Build radar chart data: array of 12 rows, each with {dimension, [symbol]: score}
  const radarData = useMemo(() => {
    return DIM_KEYS.map((key) => {
      const row: Record<string, number | string> = {
        dimension: DIM_SHORT[key],
      };
      for (const coin of selectedCoins) {
        row[coin.symbol.toUpperCase()] = getDimScore(coin, key);
      }
      return row;
    });
  }, [selectedCoins]);

  // AI Score leader (highest); handle ties
  const aiScoreLeader = useMemo(() => {
    if (selectedCoins.length === 0) return null;
    let max = -Infinity;
    const leaders: CoinData[] = [];
    for (const c of selectedCoins) {
      if (c.aiScore > max + 1e-9) {
        max = c.aiScore;
        leaders.length = 0;
        leaders.push(c);
      } else if (Math.abs(c.aiScore - max) < 1e-9) {
        leaders.push(c);
      }
    }
    return { coins: leaders, score: max };
  }, [selectedCoins]);

  const canAddMore = selectedCoins.length < MAX_COMPARE;

  const handleSelect = (value: string) => {
    if (!value) return;
    add(value);
    setSelectValue('');
  };

  return (
    <div className="space-y-4">
      {/* ─── Top Bar: Coin Selector ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCompareArrows className="w-5 h-5 text-emerald-500" />
                Coin Comparison
              </CardTitle>
              <CardDescription className="mt-1">
                Select 2-4 coins to compare. Currently:{' '}
                <span className="font-semibold text-foreground">
                  {selectedCoins.length}/{MAX_COMPARE}
                </span>
              </CardDescription>
            </div>
            {selectedCoins.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clear}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            {selectedCoins.map((coin) => (
              <button
                key={coin.id}
                onClick={() => remove(coin.id)}
                className="group inline-flex items-center gap-2 rounded-full border bg-muted/40 py-1.5 pl-2 pr-3 text-sm hover:bg-muted transition-colors"
                title={`Remove ${coin.name} from comparison`}
                aria-label={`Remove ${coin.name} from comparison`}
              >
                {coin.image ? (
                  <img
                    src={coin.image}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                ) : null}
                <span className="font-semibold">
                  {coin.symbol.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {coin.name}
                </span>
                <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}

            {canAddMore && (
              <Select value={selectValue} onValueChange={handleSelect}>
                <SelectTrigger
                  className="h-9 gap-1.5 w-[180px]"
                  aria-label="Add coin to comparison"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <SelectValue placeholder="Add coin…" />
                </SelectTrigger>
                <SelectContent>
                  {availableCoins.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No more coins available
                    </div>
                  ) : (
                    availableCoins.map((coin) => (
                      <SelectItem key={coin.id} value={coin.id}>
                        <span className="flex items-center gap-2">
                          {coin.image ? (
                            <img
                              src={coin.image}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          ) : null}
                          <span className="font-medium">
                            {coin.symbol.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {coin.name}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Empty State ─── */}
      {selectedCoins.length < 2 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-4">
              <GitCompareArrows className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">Compare coins side-by-side</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select at least 2 coins to compare. Use the checkbox column in the
              Overview tab, or pick from the dropdown above.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ─── Comparison View (2+ coins) ─── */}
      {selectedCoins.length >= 2 && (
        <>
          {/* Section A: Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                12-Dimension Score Comparison
              </CardTitle>
              <CardDescription>
                Radar view of all 12 scoring dimensions (1–10 scale, higher is
                better)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[360px] sm:h-[440px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{
                        fontSize: 11,
                        fill: 'hsl(var(--muted-foreground))',
                      }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 10]}
                      tickCount={6}
                      tick={{
                        fontSize: 10,
                        fill: 'hsl(var(--muted-foreground))',
                      }}
                      stroke="hsl(var(--border))"
                    />
                    {selectedCoins.map((coin, i) => (
                      <Radar
                        key={coin.id}
                        name={coin.symbol.toUpperCase()}
                        dataKey={coin.symbol.toUpperCase()}
                        stroke={COIN_COLORS[i % COIN_COLORS.length]}
                        fill={COIN_COLORS[i % COIN_COLORS.length]}
                        fillOpacity={0.12}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    ))}
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="circle"
                    />
                    <RTooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'hsl(var(--popover-foreground))',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Section B: Metrics Table (side-by-side) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Comparison</CardTitle>
              <CardDescription className="flex items-center gap-2">
                Best value in each row is highlighted
                <span className="inline-block w-3 h-3 align-middle rounded bg-emerald-500/20 border border-emerald-500/40" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="sticky left-0 bg-inherit z-10 min-w-[140px]">
                        Metric
                      </TableHead>
                      {selectedCoins.map((coin) => (
                        <TableHead
                          key={coin.id}
                          className="min-w-[150px] align-top"
                        >
                          <button
                            onClick={() => onSelectCoin(coin)}
                            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                            title={`View ${coin.name} details`}
                          >
                            {coin.image ? (
                              <img
                                src={coin.image}
                                alt=""
                                className="w-5 h-5 rounded-full shrink-0"
                              />
                            ) : null}
                            <span className="flex flex-col leading-tight">
                              <span className="font-semibold text-xs">
                                {coin.symbol.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                                {coin.name}
                              </span>
                            </span>
                          </button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <MetricRow
                      label="Rank"
                      coins={selectedCoins}
                      getter={(c) => c.market_cap_rank}
                      higherIsBetter={false}
                      render={(c) => `#${c.market_cap_rank}`}
                    />
                    <MetricRow
                      label="Price"
                      coins={selectedCoins}
                      getter={() => undefined}
                      higherIsBetter
                      render={(c) => formatPrice(c.current_price)}
                    />
                    <MetricRow
                      label="Market Cap"
                      coins={selectedCoins}
                      getter={(c) => c.market_cap}
                      higherIsBetter
                      render={(c) => formatCompact(c.market_cap)}
                    />
                    <MetricRow
                      label="24h Volume"
                      coins={selectedCoins}
                      getter={(c) => c.total_volume}
                      higherIsBetter
                      render={(c) => formatCompact(c.total_volume)}
                    />
                    <MetricRow
                      label="24h Change"
                      coins={selectedCoins}
                      getter={(c) => c.price_change_percentage_24h}
                      higherIsBetter
                      render={(c) => (
                        <ChangeCell pct={c.price_change_percentage_24h} />
                      )}
                    />
                    <MetricRow
                      label="7d Change"
                      coins={selectedCoins}
                      getter={(c) =>
                        c.price_change_percentage_7d_in_currency ?? undefined
                      }
                      higherIsBetter
                      render={(c) => (
                        <ChangeCell
                          pct={c.price_change_percentage_7d_in_currency}
                        />
                      )}
                    />
                    <MetricRow
                      label="ATH Distance"
                      coins={selectedCoins}
                      getter={(c) => c.ath_change_percentage}
                      higherIsBetter
                      render={(c) => formatPct(c.ath_change_percentage)}
                    />
                    <MetricRow
                      label="AI Score"
                      coins={selectedCoins}
                      getter={(c) => c.aiScore}
                      higherIsBetter
                      render={(c) => (
                        <span
                          className={cn(
                            'font-bold text-base',
                            aiScoreColor(c.aiScore),
                          )}
                        >
                          {c.aiScore.toFixed(2)}
                        </span>
                      )}
                    />
                    <MetricRow
                      label="Score Δ %"
                      coins={selectedCoins}
                      getter={(c) => c.aiScoreChangePct}
                      higherIsBetter
                      render={(c) => <ChangeCell pct={c.aiScoreChangePct} />}
                    />
                    <MetricRow
                      label="Confidence"
                      coins={selectedCoins}
                      getter={(c) => CONFIDENCE_RANK[c.confidence] ?? 0}
                      higherIsBetter
                      render={(c) => (
                        <ConfidenceBadge level={c.confidence} />
                      )}
                    />
                    <MetricRow
                      label="Circulating Supply"
                      coins={selectedCoins}
                      getter={() => undefined}
                      higherIsBetter
                      render={(c) => formatSupply(c.circulating_supply)}
                    />
                    <MetricRow
                      label="Max Supply"
                      coins={selectedCoins}
                      getter={() => undefined}
                      higherIsBetter
                      render={(c) =>
                        c.max_supply !== null && c.max_supply !== undefined
                          ? formatSupply(c.max_supply)
                          : '∞'
                      }
                    />

                    {/* 12 Dimension rows */}
                    {DIM_KEYS.map((key) => (
                      <MetricRow
                        key={key}
                        label={
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: DIM_COLORS[key] }}
                            />
                            <span className="truncate">
                              {DIM_SHORT[key]}
                            </span>
                          </span>
                        }
                        coins={selectedCoins}
                        getter={(c) => getDimScore(c, key)}
                        higherIsBetter
                        render={(c) => (
                          <DimensionScoreCell
                            score={getDimScore(c, key)}
                            color={DIM_COLORS[key]}
                          />
                        )}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Section C: Winner Summary */}
          {aiScoreLeader && (
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-emerald-500/15 p-2.5 shrink-0">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    AI Score Leader
                  </div>
                  {aiScoreLeader.coins.length === 1 ? (
                    <div className="text-sm">
                      <button
                        onClick={() => onSelectCoin(aiScoreLeader.coins[0])}
                        className="font-semibold hover:underline"
                      >
                        {aiScoreLeader.coins[0].name} (
                        {aiScoreLeader.coins[0].symbol.toUpperCase()})
                      </button>{' '}
                      with score{' '}
                      <span
                        className={cn(
                          'font-bold',
                          aiScoreColor(aiScoreLeader.score),
                        )}
                      >
                        {aiScoreLeader.score.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="font-semibold">
                        Tie between{' '}
                        {aiScoreLeader.coins
                          .map(
                            (c) => `${c.name} (${c.symbol.toUpperCase()})`,
                          )
                          .join(', ')}
                      </span>{' '}
                      at{' '}
                      <span
                        className={cn(
                          'font-bold',
                          aiScoreColor(aiScoreLeader.score),
                        )}
                      >
                        {aiScoreLeader.score.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function MetricRow({
  label,
  coins,
  getter,
  higherIsBetter,
  render,
}: {
  label: ReactNode;
  coins: CoinData[];
  getter: (c: CoinData) => number | undefined;
  higherIsBetter: boolean;
  render: (c: CoinData) => ReactNode;
}) {
  const bestIdx = findBestIdx(coins, getter, higherIsBetter);
  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-card z-10 font-medium text-muted-foreground text-xs">
        {label}
      </TableCell>
      {coins.map((coin, i) => (
        <TableCell
          key={coin.id}
          className={cn(
            'font-mono tabular-nums text-xs',
            i === bestIdx && 'bg-emerald-500/10',
          )}
        >
          {render(coin)}
        </TableCell>
      ))}
    </TableRow>
  );
}

function ChangeCell({ pct }: { pct: number | undefined | null }) {
  if (pct === undefined || pct === null || Number.isNaN(pct)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const isPositive = pct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        isPositive ? 'text-emerald-500' : 'text-rose-500',
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {formatPct(pct)}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles: Record<string, string> = {
    high: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
    medium: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
    low: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
  };
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] capitalize h-5', styles[level])}
    >
      {level}
    </Badge>
  );
}

function DimensionScoreCell({
  score,
  color,
}: {
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold tabular-nums" style={{ color }}>
        {score.toFixed(2)}
      </span>
      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(score / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
