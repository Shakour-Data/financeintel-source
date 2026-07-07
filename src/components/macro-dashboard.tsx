'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Gauge,
  DollarSign,
  Flame,
  Droplets,
  Globe,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Landmark,
  Coins,
  PiggyBank,
  CircleDot,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MacroData } from '@/lib/macro-data';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface MacroApiResponse {
  success: boolean;
  data: MacroData;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Format numbers compactly
// ═══════════════════════════════════════════════════════════════

function formatNumber(value: number, decimals = 2): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(decimals)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
  return `$${value.toFixed(decimals)}`;
}

function formatPrice(value: number, decimals = 2): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// ═══════════════════════════════════════════════════════════════
// CHANGE BADGE — Green for positive, red for negative
// ═══════════════════════════════════════════════════════════════

function ChangeBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const isPositive = value >= 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] h-5 px-1.5 font-mono font-medium gap-0.5',
        isPositive
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      )}
    >
      {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {formatPercent(value)}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// FEAR & GREED GAUGE — SVG semicircular arc
// ═══════════════════════════════════════════════════════════════

function FearGreedGauge({ value }: { value: number }) {
  // Clamp value to 0-100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Determine color and label based on value
  const getSegment = (v: number) => {
    if (v <= 25) return { color: '#ef4444', label: 'Extreme Fear' };
    if (v <= 45) return { color: '#f97316', label: 'Fear' };
    if (v <= 55) return { color: '#eab308', label: 'Neutral' };
    if (v <= 75) return { color: '#84cc16', label: 'Greed' };
    return { color: '#22c55e', label: 'Extreme Greed' };
  };

  const segment = getSegment(clampedValue);

  // SVG arc parameters
  const cx = 120;
  const cy = 100;
  const radius = 80;
  const strokeWidth = 14;

  // Arc from 180° to 0° (left to right semicircle)
  // Start angle: 180° (left), End angle: 0° (right)
  const startAngle = Math.PI; // 180°
  const endAngle = 0; // 0°

  // Create arc path
  const describeArc = (start: number, end: number, r: number) => {
    const startX = cx + r * Math.cos(start);
    const startY = cy + r * Math.sin(start);
    const endX = cx + r * Math.cos(end);
    const endY = cy + r * Math.sin(end);
    const largeArcFlag = end - start > Math.PI ? 1 : 0;
    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 0 ${endX} ${endY}`;
  };

  // Background track
  const trackPath = describeArc(startAngle, endAngle, radius);

  // Filled portion based on value
  const valueAngle = startAngle - (clampedValue / 100) * Math.PI;
  const filledPath = describeArc(startAngle, valueAngle, radius);

  // Needle position
  const needleAngle = startAngle - (clampedValue / 100) * Math.PI;
  const needleX = cx + (radius - 5) * Math.cos(needleAngle);
  const needleY = cy + (radius - 5) * Math.sin(needleAngle);

  // Color segments along the arc
  const segments = [
    { start: 180, end: 135, color: '#ef4444' },  // Extreme Fear: 0-25
    { start: 135, end: 99, color: '#f97316' },    // Fear: 25-45
    { start: 99, end: 81, color: '#eab308' },     // Neutral: 45-55
    { start: 81, end: 45, color: '#84cc16' },     // Greed: 55-75
    { start: 45, end: 0, color: '#22c55e' },      // Extreme Greed: 75-100
  ];

  const segmentPath = (startDeg: number, endDeg: number, r: number) => {
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const sx = cx + r * Math.cos(s);
    const sy = cy + r * Math.sin(s);
    const ex = cx + r * Math.cos(e);
    const ey = cy + r * Math.sin(e);
    const largeArc = (startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="240" height="130" viewBox="0 0 240 130" className="overflow-visible">
        {/* Track background */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Color segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={segmentPath(seg.start, seg.end, radius)}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={0.25}
          />
        ))}

        {/* Filled arc up to current value */}
        <path
          d={filledPath}
          fill="none"
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.9}
          className="transition-all duration-700"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = Math.PI - (tick / 100) * Math.PI;
          const innerR = radius - strokeWidth / 2 - 4;
          const outerR = radius - strokeWidth / 2 - 10;
          const x1 = cx + innerR * Math.cos(angle);
          const y1 = cy + innerR * Math.sin(angle);
          const x2 = cx + outerR * Math.cos(angle);
          const y2 = cy + outerR * Math.sin(angle);
          return (
            <line
              key={tick}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Needle */}
        <circle cx={cx} cy={cy} r={5} fill={segment.color} opacity={0.3} />
        <line
          x1={cx} y1={cy}
          x2={needleX} y2={needleY}
          stroke={segment.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <circle cx={cx} cy={cy} r={3} fill={segment.color} />
      </svg>

      {/* Center value display */}
      <div className="text-center -mt-4">
        <div
          className="text-3xl font-bold font-mono transition-colors duration-700"
          style={{ color: segment.color }}
        >
          {clampedValue}
        </div>
        <div
          className="text-xs font-semibold uppercase tracking-wider mt-0.5 transition-colors duration-700"
          style={{ color: segment.color }}
        >
          {segment.label}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MINI SPARKLINE — Simple SVG sparkline for Fear & Greed history
// ═══════════════════════════════════════════════════════════════

function MiniSparkline({ data, width = 200, height = 40 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  // Determine color from last value
  const lastVal = data[data.length - 1];
  const color = lastVal <= 25 ? '#ef4444' : lastVal <= 45 ? '#f97316' : lastVal <= 55 ? '#eab308' : lastVal <= 75 ? '#84cc16' : '#22c55e';

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Fill area under the line */}
      <polygon
        points={`0,${height} ${points.join(' ')} ${width},${height}`}
        fill="url(#sparkGrad)"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAIN TVL BAR — Horizontal bar for top chains
// ═══════════════════════════════════════════════════════════════

function ChainTvlBar({ name, tvl, maxTvl }: { name: string; tvl: number; maxTvl: number }) {
  const pct = maxTvl > 0 ? (tvl / maxTvl) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground font-medium w-16 truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
        />
      </div>
      <span className="text-[10px] font-mono text-gray-300 w-16 text-right">{formatNumber(tvl)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DATA UNAVAILABLE PLACEHOLDER
// ═══════════════════════════════════════════════════════════════

function DataUnavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs py-2">
      <CircleDot className="w-3 h-3 opacity-40" />
      <span>{label} unavailable</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════

function MacroSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT: MacroDashboard
// ═══════════════════════════════════════════════════════════════

export function MacroDashboard() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/macro');
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as Record<string, string>).error || `Server error (HTTP ${res.status})`);
      }
      const json: MacroApiResponse = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(json.error || 'Invalid response from macro API');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData, data]);

  // ── Loading State ──
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Macroeconomic Dashboard</h2>
        </div>
        <MacroSkeleton />
      </div>
    );
  }

  // ── Error State ──
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-sm text-destructive font-semibold">Failed to load macro data</p>
        <p className="text-xs text-muted-foreground max-w-md text-center leading-relaxed">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Destructure for convenience
  const { gold, oil, sp500, dxy, vix, fearGreed, btcDominance, defiTvl, fedFundsRate } = data;

  // Stale data warning
  const showStaleWarning = error && data;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Macroeconomic Dashboard</h2>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            <Activity className="w-2.5 h-2.5 mr-0.5" /> Live
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
              'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stale data warning */}
      {showStaleWarning && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{error} — showing cached data</span>
        </div>
      )}

      {/* ── Info Box ── */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
        <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Macro overview:</span>{' '}
          Track commodities, market indices, and crypto-specific macro indicators that influence digital asset prices.
          <span className="text-primary font-medium"> These signals feed into the 12-dimension AI scoring engine.</span>
        </div>
      </div>

      {/* ── Data Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* ═══ 1. COMMODITY PRICES CARD ═══ */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Commodity Prices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gold ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gold (XAU/USD)</div>
                    <div className="text-sm font-bold font-mono">{formatPrice(gold.price)}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <ChangeBadge value={gold.change24h} />
                  {gold.change7d !== undefined && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      7d: {formatPercent(gold.change7d)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <DataUnavailable label="Gold" />
            )}

            <div className="border-t border-white/[0.06]" />

            {oil ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-slate-500/10 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Oil ({oil.type})</div>
                    <div className="text-sm font-bold font-mono">{formatPrice(oil.price)}</div>
                  </div>
                </div>
                <ChangeBadge value={oil.change24h} />
              </div>
            ) : (
              <DataUnavailable label="Oil" />
            )}
          </CardContent>
        </Card>

        {/* ═══ 2. MARKET INDICES CARD ═══ */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Market Indices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sp500 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">S&P 500</div>
                    <div className="text-sm font-bold font-mono">{sp500.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
                <ChangeBadge value={sp500.change24h} />
              </div>
            ) : (
              <DataUnavailable label="S&P 500" />
            )}

            <div className="border-t border-white/[0.06]" />

            {dxy ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">DXY (Dollar Index)</div>
                    <div className="text-sm font-bold font-mono">{dxy.value.toFixed(2)}</div>
                  </div>
                </div>
                <ChangeBadge value={dxy.change24h} />
              </div>
            ) : (
              <DataUnavailable label="DXY" />
            )}

            <div className="border-t border-white/[0.06]" />

            {vix ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">VIX (Volatility)</div>
                    <div className="text-sm font-bold font-mono">{vix.value.toFixed(2)}</div>
                  </div>
                </div>
                <ChangeBadge value={vix.change24h} />
              </div>
            ) : (
              <DataUnavailable label="VIX" />
            )}
          </CardContent>
        </Card>

        {/* ═══ 3. FEAR & GREED GAUGE CARD ═══ */}
        <Card className="overflow-hidden md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-orange-400" />
              Fear & Greed Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fearGreed ? (
              <div className="space-y-2">
                <FearGreedGauge value={fearGreed.value} />

                {/* Comparison stats */}
                <div className="flex items-center justify-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Yesterday:</span>
                    <span className="font-mono font-bold text-gray-300">{fearGreed.yesterday}</span>
                    <span className={cn(
                      'font-mono',
                      fearGreed.value - fearGreed.yesterday >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      ({fearGreed.value - fearGreed.yesterday >= 0 ? '+' : ''}{fearGreed.value - fearGreed.yesterday})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Last week:</span>
                    <span className="font-mono font-bold text-gray-300">{fearGreed.lastWeek}</span>
                    <span className={cn(
                      'font-mono',
                      fearGreed.value - fearGreed.lastWeek >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      ({fearGreed.value - fearGreed.lastWeek >= 0 ? '+' : ''}{fearGreed.value - fearGreed.lastWeek})
                    </span>
                  </div>
                </div>

                {/* Sparkline of 30-day history */}
                {fearGreed.history && fearGreed.history.length > 1 && (
                  <div className="mt-2">
                    <div className="text-[9px] text-muted-foreground mb-1">30-Day History</div>
                    <MiniSparkline data={fearGreed.history.map(h => h.value)} />
                  </div>
                )}
              </div>
            ) : (
              <DataUnavailable label="Fear & Greed Index" />
            )}
          </CardContent>
        </Card>

        {/* ═══ 4. BTC DOMINANCE & DEFI TVL CARD ═══ */}
        <Card className="overflow-hidden md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              BTC Dominance & DeFi TVL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BTC Dominance */}
              <div className="space-y-3">
                {btcDominance ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-muted-foreground">BTC Dominance</div>
                      <ChangeBadge value={btcDominance.change24h} />
                    </div>
                    <div className="text-2xl font-bold font-mono">{btcDominance.value.toFixed(1)}%</div>
                    <div className="mt-2 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${btcDominance.value}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500/60 to-yellow-400"
                      />
                    </div>
                  </div>
                ) : (
                  <DataUnavailable label="BTC Dominance" />
                )}

                <div className="border-t border-white/[0.06]" />

                {/* DeFi TVL */}
                {defiTvl ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">DeFi Total Value Locked</div>
                    <div className="text-2xl font-bold font-mono">{formatNumber(defiTvl.total)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">24h:</span>
                      <ChangeBadge value={defiTvl.change24h} />
                      <span className="text-[10px] text-muted-foreground">7d:</span>
                      <ChangeBadge value={defiTvl.change7d} />
                    </div>
                  </div>
                ) : (
                  <DataUnavailable label="DeFi TVL" />
                )}
              </div>

              {/* Top Chains by TVL */}
              <div>
                {defiTvl && defiTvl.topChains && defiTvl.topChains.length > 0 ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Top Chains by TVL</div>
                    <div className="space-y-2">
                      {defiTvl.topChains.slice(0, 5).map((chain) => (
                        <ChainTvlBar
                          key={chain.name}
                          name={chain.name}
                          tvl={chain.tvl}
                          maxTvl={defiTvl.topChains[0]?.tvl ?? 1}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <DataUnavailable label="Chain TVL data" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 5. FED FUNDS RATE CARD ═══ */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              Fed Funds Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fedFundsRate ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <PiggyBank className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono">{fedFundsRate.value.toFixed(2)}%</div>
                    <div className="text-xs text-muted-foreground">Current Rate</div>
                  </div>
                </div>
                <div className="border-t border-white/[0.06] pt-2">
                  <div className="text-[10px] text-muted-foreground">Last change</div>
                  <div className="text-xs font-medium text-gray-300">{fedFundsRate.lastChange}</div>
                </div>
                {/* Rate direction indicator */}
                <div className="flex items-center gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-1.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-relaxed">
                    Fed rate impacts crypto through liquidity and risk appetite channels
                  </span>
                </div>
              </div>
            ) : (
              <DataUnavailable label="Fed Funds Rate" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Source Status ── */}
      {data.sources && data.sources.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="font-medium">Data sources:</span>
          {data.sources.map((source, i) => (
            <span key={i} className="flex items-center gap-1">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  source.status === 'live' && 'bg-emerald-400',
                  source.status === 'cached' && 'bg-amber-400',
                  source.status === 'failed' && 'bg-red-400'
                )}
              />
              <span>{source.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
