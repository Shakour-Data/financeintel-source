'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Crosshair,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Target,
  BarChart3,
  Activity,
  Network,
  Brain,
  Newspaper,
  Globe,
  Landmark,
  Shield,
  Anchor,
  Layers,
  Link as LinkIcon,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info,
  List,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CoefficientEvolutionChart } from './coefficient-evolution-chart';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DimensionCoeffData {
  key: string;
  name: string;
  color: string;
  icon: string;
  currentCoefficient: number;
  previousCoefficient: number;
  coefficientChange: number;
  totalChange: number;
  totalChangePct: number;
  avgPredictionError: number | null;
  maxAbsChange: number;
  trendDirection: 'up' | 'down' | 'stable';
  dataPoints: number;
  latestVersion: number;
  history: Array<{
    date: string;
    coefficient: number;
    coefficientChange: number;
    predictionError: number | null;
    version: number;
  }>;
}

interface FocusItem {
  key: string;
  name: string;
  color: string;
  icon: string;
  focusScore: number;
  reasons: string[];
  currentCoefficient: number;
  totalChangePct: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface AllCoefficientsResponse {
  dimensions: DimensionCoeffData[];
  focusAdvisor: FocusItem[];
  meta: {
    totalDays: number;
    dataPoints: number;
    startDate: string;
    endDate: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  BarChart3, Activity, Network, Brain, Newspaper, Globe, Landmark, Shield,
  TrendingUp, Anchor, Layers, LinkIcon,
};

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
  { label: '3y', value: 1095 },
] as const;

// ═══════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP FOR BAR CHART
// ═══════════════════════════════════════════════════════════════

function CoeffBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name: string; coefficient: number; change: number; color: string; key: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ backgroundColor: 'rgba(15, 18, 25, 0.95)', borderColor: d.color + '40' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
        <span className="text-xs font-semibold text-gray-200">{d.name}</span>
      </div>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Coefficient</span>
          <span className="font-mono font-bold" style={{ color: d.color }}>{(d.coefficient * 100).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Change</span>
          <span className={cn('font-mono font-medium', d.change > 0 ? 'text-emerald-400' : d.change < 0 ? 'text-red-400' : 'text-gray-400')}>
            {d.change > 0 ? '+' : ''}{(d.change * 100).toFixed(3)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOCUS ADVISOR CARD
// ═══════════════════════════════════════════════════════════════

function FocusAdvisorCard({ item, rank }: { item: FocusItem; rank: number }) {
  const IconComponent = ICON_MAP[item.icon] ?? Activity;

  const focusLevel = item.focusScore >= 5 ? 'critical' : item.focusScore >= 3 ? 'high' : item.focusScore >= 1.5 ? 'moderate' : 'low';

  const focusConfig = {
    critical: { label: 'Critical', bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400' },
    high: { label: 'High', bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400' },
    moderate: { label: 'Moderate', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400' },
    low: { label: 'Low', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
  };

  const config = focusConfig[focusLevel];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={cn('flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors', config.bg, config.border)}
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.06] shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-gray-400">{rank + 1}</span>
      </div>
      <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5" style={{ backgroundColor: `${item.color}15` }}>
        <IconComponent className="w-3.5 h-3.5" style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-200 truncate">{item.name}</span>
          <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 font-medium shrink-0', config.text)}>
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px] mb-1">
          <span className="text-gray-400">Coeff: <span className="font-mono font-bold" style={{ color: item.color }}>{(item.currentCoefficient * 100).toFixed(1)}%</span></span>
          <span className="text-gray-400">Change: <span className={cn('font-mono font-medium', item.totalChangePct > 0 ? 'text-emerald-400' : item.totalChangePct < 0 ? 'text-red-400' : 'text-gray-400')}>
            {item.totalChangePct > 0 ? '+' : ''}{item.totalChangePct.toFixed(1)}%
          </span></span>
          {item.trendDirection !== 'stable' && (
            <span className={cn('flex items-center gap-0.5 font-medium', item.trendDirection === 'up' ? 'text-emerald-400' : 'text-red-400')}>
              {item.trendDirection === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.trendDirection === 'up' ? 'Rising' : 'Falling'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {item.reasons.map((reason, i) => (
            <span key={i} className="text-[9px] text-gray-500 bg-white/[0.04] px-1.5 py-0.5 rounded">{reason}</span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.focusScore.toFixed(1)}</div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider">Focus</div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION COEFFICIENT ROW (expandable)
// ═══════════════════════════════════════════════════════════════

function DimensionCoeffRow({ dim, isExpanded, onToggle }: { dim: DimensionCoeffData; isExpanded: boolean; onToggle: () => void }) {
  const IconComponent = ICON_MAP[dim.icon] ?? Activity;
  const TrendIcon = dim.trendDirection === 'up' ? TrendingUp : dim.trendDirection === 'down' ? TrendingDown : Minus;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${dim.color}25` }}>
      <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition-colors text-left" onClick={onToggle}>
        <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: `${dim.color}12` }}>
          <IconComponent className="w-3.5 h-3.5" style={{ color: dim.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-200 truncate">{dim.name}</span>
            <TrendIcon className={cn('w-3 h-3 shrink-0', dim.trendDirection === 'up' ? 'text-emerald-400' : dim.trendDirection === 'down' ? 'text-red-400' : 'text-gray-500')} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, dim.currentCoefficient * 100 * 3))}%`, backgroundColor: dim.color }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-sm font-bold font-mono" style={{ color: dim.color }}>{(dim.currentCoefficient * 100).toFixed(1)}%</span>
          </div>
          {dim.totalChangePct !== 0 && (
            <div className="text-right min-w-[3rem]">
              <span className={cn('text-[10px] font-mono font-medium flex items-center gap-0.5 justify-end', dim.totalChangePct > 0 ? 'text-emerald-400' : 'text-red-400')}>
                {dim.totalChangePct > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                {Math.abs(dim.totalChangePct).toFixed(1)}%
              </span>
            </div>
          )}
          <div className="text-right min-w-[2rem]">
            <span className="text-[9px] text-gray-500 font-mono">{dim.dataPoints}d</span>
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: `${dim.color}10` }}>
              <CoefficientEvolutionChart nodeKey={dim.key} color={dim.color} title={`${dim.name} — ML Coefficient Evolution`} height={250} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT: CoefficientDashboard
// ═══════════════════════════════════════════════════════════════

export function CoefficientDashboard() {
  const [data, setData] = useState<AllCoefficientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(90);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list' | 'focus'>('chart');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/indicators/coefficients/all?days=${period}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load coefficient data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const barData = useMemo(() => {
    if (!data) return [];
    return data.dimensions.slice().sort((a, b) => b.currentCoefficient - a.currentCoefficient).map((dim) => ({
      key: dim.key, name: dim.name.split(' ')[0], fullName: dim.name,
      coefficient: dim.currentCoefficient, change: dim.totalChange, color: dim.color,
    }));
  }, [data]);

  const { flatLineData, lineSeries } = useMemo(() => {
    if (!data) return { flatLineData: [] as Array<Record<string, string | number>>, lineSeries: [] as Array<{ key: string; name: string; color: string }> };
    // Collect all unique dates
    const dateSet = new Set<string>();
    for (const dim of data.dimensions) { for (const h of dim.history) dateSet.add(h.date); }
    const dates = [...dateSet].sort();

    // Build a map: date → { dimKey: coefficient }
    const dimMaps = new Map<string, Map<string, number>>();
    for (const dim of data.dimensions) {
      const m = new Map<string, number>();
      for (const h of dim.history) m.set(h.date, h.coefficient);
      dimMaps.set(dim.key, m);
    }

    // Flatten into rows: each row = { date, fundamental: 0.115, technical: 0.09, ... }
    const flatLineData = dates.map((date) => {
      const row: Record<string, string | number> = { date: date.slice(5) }; // MM-DD for display
      for (const dim of data.dimensions) {
        row[dim.key] = dimMaps.get(dim.key)?.get(date) ?? 0;
      }
      return row;
    });

    const lineSeries = data.dimensions.map((dim) => ({
      key: dim.key, name: dim.name.split(' ')[0], color: dim.color,
    }));

    return { flatLineData, lineSeries };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Coefficient Analysis</h2>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> ML Engine
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/50 rounded-md p-0.5">
            {([{ mode: 'chart' as const, icon: BarChart3, label: 'Chart' }, { mode: 'list' as const, icon: List, label: 'Detail' }, { mode: 'focus' as const, icon: Target, label: 'Focus' }] as const).map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={cn('flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors', viewMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setPeriod(opt.value)} className={cn('px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors', period === opt.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* INFO BOX */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Why coefficients matter:</span>{' '}
          Each dimension&apos;s coefficient shows how much weight the ML engine assigns to it.
          <span className="text-primary font-medium"> Higher coefficients = more impact on the final score.</span>
          {' '}When a coefficient changes significantly, analysts should focus more attention on that dimension&apos;s signals.
        </div>
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading coefficient data across 12 dimensions…</p>
        </div>
      )}

      {error && !data && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Retry</button>
        </div>
      )}

      {data && (
        <AnimatePresence mode="wait">
          <motion.div key={viewMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {/* CHART VIEW */}
            {viewMode === 'chart' && (
              <div className="space-y-4">
                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Coefficient Distribution</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">How the ML engine weights each dimension — sorted by impact</p>
                    </div>
                  </div>
                  <div className="p-4" style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -5, bottom: 40 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} angle={-45} textAnchor="end" interval={0} height={60} />
                        <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} width={40} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip content={<CoeffBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <ReferenceLine y={1 / 12} stroke="#6b7280" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Equal (8.33%)', position: 'insideTopRight', fontSize: 9, fill: '#6b7280' }} />
                        <Bar dataKey="coefficient" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} stroke={entry.color} strokeWidth={0} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold">Coefficient Evolution Over Time</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Track how ML adjusts each dimension&apos;s weight</p>
                  </div>
                  <div className="p-4" style={{ height: 300 }}>
                    {flatLineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={flatLineData} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" />
                          <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval={Math.floor(flatLineData.length / 8)} />
                          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} width={40} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 18, 25, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '10px' }} formatter={(value: number, name: string) => [`${(value * 100).toFixed(2)}%`, name]} />
                          <Legend wrapperStyle={{ fontSize: '9px' }} iconType="line" />
                          <ReferenceLine y={1 / 12} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={0.5} />
                          {lineSeries.map((s) => (
                            <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={1.5} dot={false} type="monotone" connectNulls />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No evolution data available for this period</div>
                    )}
                  </div>
                </Card>

                {data.focusAdvisor.length > 0 && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-semibold">Top Focus Areas</h3>
                      <span className="text-[9px] text-muted-foreground">— Dimensions needing analyst attention</span>
                    </div>
                    <div className="space-y-2">
                      {data.focusAdvisor.slice(0, 3).map((item, i) => (
                        <FocusAdvisorCard key={item.key} item={item} rank={i} />
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* LIST/DETAIL VIEW */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dimensions</p><p className="text-xl font-bold">{data.dimensions.length}</p></Card>
                  <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Points</p><p className="text-xl font-bold">{data.meta.dataPoints}</p></Card>
                  <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Coeff</p><p className="text-xl font-bold">{data.dimensions.length > 0 ? `${(Math.max(...data.dimensions.map(d => d.currentCoefficient)) * 100).toFixed(1)}%` : '—'}</p></Card>
                  <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Coeff</p><p className="text-xl font-bold">{data.dimensions.length > 0 ? `${(Math.min(...data.dimensions.map(d => d.currentCoefficient)) * 100).toFixed(1)}%` : '—'}</p></Card>
                </div>
                <div className="space-y-1.5">
                  {data.dimensions.sort((a, b) => b.currentCoefficient - a.currentCoefficient).map((dim) => (
                    <DimensionCoeffRow key={dim.key} dim={dim} isExpanded={expandedDim === dim.key} onToggle={() => setExpandedDim(expandedDim === dim.key ? null : dim.key)} />
                  ))}
                </div>
              </div>
            )}

            {/* FOCUS ADVISOR VIEW */}
            {viewMode === 'focus' && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-semibold">Analyst Focus Advisor</h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto">Based on ML coefficient analysis</Badge>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                    Dimensions with <span className="font-semibold">higher focus scores</span> have undergone significant coefficient changes or show high prediction errors. Analysts should verify the signals driving these changes.
                  </div>
                </div>
                <div className="space-y-2">
                  {data.focusAdvisor.map((item, i) => (
                    <FocusAdvisorCard key={item.key} item={item} rank={i} />
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
