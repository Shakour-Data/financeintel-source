'use client';

import { useMemo } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  Scale,
  Gauge,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useCustomWeights,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  type DimensionKey,
} from '@/lib/user-data';
import type { Dimension } from '@/lib/scoring-engine-v2';
import { recomputeScore } from '@/lib/recompute-score';

// ─── CoinData (mirror of dashboard shape) ─────────────────────

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
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface CustomWeightsPanelProps {
  coins: CoinData[];
}

// ─── Dimension color map (fallback if coin.dimensions is missing) ───

const DIMENSION_COLORS: Record<DimensionKey, string> = {
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

// ─── Presets ──────────────────────────────────────────────────

type PresetSpec = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  build: () => Record<DimensionKey, number>;
};

function buildPreset(
  primary: Partial<Record<DimensionKey, number>>
): Record<DimensionKey, number> {
  // Primary keys get their explicit weights; the remaining budget is split
  // equally across the rest. Weights are then normalized to sum=1.
  const out = {} as Record<DimensionKey, number>;
  const primaryKeys = Object.keys(primary) as DimensionKey[];
  const usedBudget = primaryKeys.reduce((s, k) => s + (primary[k] ?? 0), 0);
  const remainingKeys = DIMENSION_KEYS.filter((k) => !primaryKeys.includes(k));
  const remaining = Math.max(0, 1 - usedBudget);
  const each = remainingKeys.length > 0 ? remaining / remainingKeys.length : 0;

  for (const k of DIMENSION_KEYS) {
    if (primary[k] !== undefined) {
      out[k] = primary[k] as number;
    } else {
      out[k] = each;
    }
  }
  return out;
}

const PRESETS: PresetSpec[] = [
  {
    key: 'equal',
    label: 'Equal Weights',
    description: '1/12 across every dimension',
    icon: Scale,
    build: () => {
      const w = {} as Record<DimensionKey, number>;
      for (const k of DIMENSION_KEYS) w[k] = 1 / DIMENSION_KEYS.length;
      return w;
    },
  },
  {
    key: 'technical',
    label: 'Technical Focus',
    description: 'Technical 30% • Fundamental 20% • rest equal',
    icon: Gauge,
    build: () =>
      buildPreset({
        technical: 0.3,
        fundamental: 0.2,
      }),
  },
  {
    key: 'fundamental',
    label: 'Fundamental Focus',
    description: 'Fundamental 30% • Technical 20% • On-Chain 15%',
    icon: Gauge,
    build: () =>
      buildPreset({
        fundamental: 0.3,
        technical: 0.2,
        onchain: 0.15,
      }),
  },
  {
    key: 'risk-aware',
    label: 'Risk-Aware',
    description: 'Security 20% • Reg 15% • Deriv 15% • Whale 15%',
    icon: ShieldAlert,
    build: () =>
      buildPreset({
        network_security: 0.2,
        regulatory: 0.15,
        derivatives: 0.15,
        whale_smart_money: 0.15,
      }),
  },
];

// ─── Score color helper ──────────────────────────────────────

function scoreColorClass(score: number): string {
  if (score >= 8.5) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
  if (score >= 7) return 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25';
  if (score >= 5) return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/25';
  if (score >= 3) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25';
  return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25';
}

// ─── Component ───────────────────────────────────────────────

export function CustomWeightsPanel({ coins }: CustomWeightsPanelProps) {
  const { weights, enabled, setWeight, setWeights, reset, toggle } = useCustomWeights();

  // Reference coin for default coefficient read-out. Use the first coin with dimensions.
  const referenceCoin = useMemo(
    () => coins.find((c) => c.dimensions && c.dimensions.length > 0) ?? coins[0],
    [coins]
  );

  // Map of dimension key -> default coefficient from the reference coin.
  const defaultCoeffs = useMemo(() => {
    const m: Record<string, number> = {};
    if (referenceCoin?.dimensions) {
      for (const d of referenceCoin.dimensions) {
        m[d.key] = d.coefficient;
      }
    }
    return m;
  }, [referenceCoin]);

  const totalWeight = DIMENSION_KEYS.reduce((s, k) => s + (weights[k] ?? 0), 0);

  // Recomputed preview rows (sorted by absolute delta desc).
  const previewRows = useMemo(() => {
    if (!enabled || coins.length === 0) return [];
    const rows = coins.slice(0, 20).map((c) => {
      const recomputed = recomputeScore(c.dimensions, weights);
      const delta = recomputed - c.aiScore;
      const deltaPct = c.aiScore > 0 ? (delta / c.aiScore) * 100 : 0;
      return { coin: c, original: c.aiScore, recomputed, delta, deltaPct };
    });
    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return rows;
  }, [coins, weights, enabled]);

  // Slider change handler: store normalizes on setWeight.
  const handleSliderChange = (key: DimensionKey, value: number[]) => {
    const v = value[0];
    if (typeof v === 'number' && Number.isFinite(v)) {
      setWeight(key, v);
    }
  };

  const handlePreset = (preset: PresetSpec) => {
    setWeights(preset.build());
  };

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Enable / Disable ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="size-4 text-emerald-500" />
                Enable Custom Weights
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-relaxed">
                When enabled, coin AI scores are recomputed using your custom dimension weights across the dashboard.
                When disabled, the default ML-optimized coefficients are used.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="custom-weights-toggle" className="text-xs text-muted-foreground hidden sm:block">
                {enabled ? 'On' : 'Off'}
              </Label>
              <Switch
                id="custom-weights-toggle"
                checked={enabled}
                onCheckedChange={(checked) => toggle(checked)}
                aria-label="Toggle custom weights"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ─── Section 3: Preset Buttons ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Presets</CardTitle>
          <CardDescription>
            Apply a curated weighting profile. Custom weights are normalized to sum to 100%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={cn(
                    'group flex flex-col items-start gap-1.5 rounded-lg border bg-card p-3 text-left transition-all',
                    'hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                    !enabled && 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="font-medium text-sm">{p.label}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {p.description}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => reset()}
              className={cn(
                'group flex flex-col items-start gap-1.5 rounded-lg border bg-card p-3 text-left transition-all',
                'hover:border-red-500/40 hover:bg-red-500/5 hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                  <RotateCcw className="size-3.5" />
                </span>
                <span className="font-medium text-sm">Reset to Default</span>
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">
                Disable + equal weights
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 2: Weight Sliders ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dimension Weights</CardTitle>
          <CardDescription>
            Drag to adjust. Other dimensions auto-rebalance to keep the total at 100%.
            The gray “default” value is the ML-optimized coefficient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'space-y-4 transition-opacity',
              !enabled && 'opacity-50 pointer-events-none'
            )}
          >
            {DIMENSION_KEYS.map((key) => {
              const label = DIMENSION_LABELS[key];
              const value = weights[key] ?? 0;
              const defaultValue = defaultCoeffs[key];
              const color = DIMENSION_COLORS[key];
              const pct = (value * 100).toFixed(1);
              const defaultPct =
                typeof defaultValue === 'number' && Number.isFinite(defaultValue)
                  ? (defaultValue * 100).toFixed(1)
                  : null;
              const diff = defaultPct !== null ? value - (defaultValue as number) : 0;
              const diffPct = diff * 100;
              const isDiff = Math.abs(diffPct) > 0.05;

              return (
                <div key={key} className="grid grid-cols-1 md:grid-cols-[200px_1fr_120px] gap-3 items-center">
                  {/* Label + color dot */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0 ring-2 ring-background shadow-sm"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium">{label}</span>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-3">
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={[value]}
                      onValueChange={(v) => handleSliderChange(key, v)}
                      aria-label={`${label} weight`}
                      className="flex-1"
                    />
                  </div>

                  {/* Numeric display */}
                  <div className="flex flex-col items-end md:items-end gap-0.5">
                    <span className="font-mono text-sm font-semibold tabular-nums">{pct}%</span>
                    {defaultPct !== null && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        default: {defaultPct}%
                        {isDiff && (
                          <span
                            className={cn(
                              'ml-1 font-medium',
                              diffPct > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-500'
                            )}
                          >
                            ({diffPct > 0 ? '+' : ''}
                            {diffPct.toFixed(1)})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total indicator */}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-mono text-sm font-bold tabular-nums',
                    Math.abs(totalWeight - 1) < 0.001
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  )}
                >
                  {(totalWeight * 100).toFixed(1)}%
                </span>
                {Math.abs(totalWeight - 1) < 0.001 ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                    Balanced
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25">
                    Unbalanced
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Section 4: Recomputed Score Preview ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recomputed Score Preview</CardTitle>
          <CardDescription>
            Original (ML) AI score → recomputed score using your custom weights. Sorted by largest absolute change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!enabled ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
              <SlidersHorizontal className="mx-auto mb-3 size-6 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Enable custom weights to see the recomputed score preview.
              </p>
            </div>
          ) : coins.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No coin data available. Load the dashboard to preview recomputed scores.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[28rem] w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-10 text-right">#</TableHead>
                    <TableHead>Coin</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-center"></TableHead>
                    <TableHead className="text-right">Recomputed</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead className="text-right">Δ %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map(({ coin, original, recomputed, delta, deltaPct }, idx) => (
                    <TableRow key={coin.id}>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          {coin.image ? (
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="size-5 rounded-full shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <span className="size-5 rounded-full bg-muted shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{coin.symbol?.toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{coin.name}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn('font-mono tabular-nums', scoreColorClass(original))}>
                          {original.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        <ArrowRight className="size-3.5 mx-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn('font-mono tabular-nums', scoreColorClass(recomputed))}>
                          {recomputed.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 font-mono text-xs tabular-nums',
                            delta > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : delta < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          )}
                        >
                          {delta > 0 ? (
                            <TrendingUp className="size-3" />
                          ) : delta < 0 ? (
                            <TrendingDown className="size-3" />
                          ) : (
                            <Minus className="size-3" />
                          )}
                          {delta > 0 ? '+' : ''}
                          {delta.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-mono text-xs tabular-nums',
                            deltaPct > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : deltaPct < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          )}
                        >
                          {deltaPct > 0 ? '+' : ''}
                          {deltaPct.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomWeightsPanel;
