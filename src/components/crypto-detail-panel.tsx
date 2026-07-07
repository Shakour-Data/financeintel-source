'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  BarChart3,
  Network,
  Loader2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  LineChart,
  Maximize2,
  Minimize2,
  Newspaper,
  Layers,
  RotateCcw,
  Expand,
  Shrink,
  Globe,
  Landmark,
  Shield,
  Anchor,
  Link as LinkIcon,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScoreBadge } from './score-badge';
import { TrendChart } from './trend-chart';
import { CoefficientChart } from './coefficient-chart';
import { TradingViewWidget } from './tradingview-widget';
import type {
  Dimension,
  SubDimension,
  Aspect,
  SubAspect,
} from '@/lib/scoring-engine-v2';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_1h_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface CryptoDetailPanelProps {
  coin: CoinData;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

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

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  fundamental: <BarChart3 className="w-4 h-4" />,
  technical: <Activity className="w-4 h-4" />,
  onchain: <Network className="w-4 h-4" />,
  market_psychology: <Brain className="w-4 h-4" />,
  news_sentiment: <Newspaper className="w-4 h-4" />,
  macroeconomic: <Globe className="w-4 h-4" />,
  regulatory: <Landmark className="w-4 h-4" />,
  network_security: <Shield className="w-4 h-4" />,
  derivatives: <TrendingUp className="w-4 h-4" />,
  whale_smart_money: <Anchor className="w-4 h-4" />,
  ecosystem_defi: <Layers className="w-4 h-4" />,
  inter_market: <LinkIcon className="w-4 h-4" />,
};

const DIMENSION_SHORT_NAMES: Record<string, string> = {
  fundamental: 'Fund',
  technical: 'Tech',
  onchain: 'OnChain',
  market_psychology: 'Psych',
  news_sentiment: 'News',
  macroeconomic: 'Macro',
  regulatory: 'Reg',
  network_security: 'Sec',
  derivatives: 'Deriv',
  whale_smart_money: 'Whale',
  ecosystem_defi: 'DeFi',
  inter_market: 'Inter',
};

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT',
  ripple: 'XRPUSDT',
  cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT',
  polkadot: 'DOTUSDT',
  avalanche: 'AVAXUSDT',
  chainlink: 'LINKUSDT',
  polygon: 'MATICUSDT',
  litecoin: 'LTCUSDT',
  cosmos: 'ATOMUSDT',
  near: 'NEARUSDT',
  uniswap: 'UNIUSDT',
  stellar: 'XLMUSDT',
  monero: 'XMRUSDT',
  arbitrum: 'ARBUSDT',
  optimism: 'OPUSDT',
  sui: 'SUIUSDT',
  aptos: 'APTUSDT',
};

type TabKey = 'overview' | 'breakdown' | 'trends' | 'tradingview' | 'stats';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatPrice(price: number): string {
  if (price >= 1)
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(3)}`;
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}

function ScoreChangeArrow({ changePct }: { changePct: number }) {
  if (Math.abs(changePct) < 0.01) return null;
  const isPositive = changePct > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive ? 'text-emerald-400' : 'text-red-400'
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? '+' : ''}
      {changePct.toFixed(2)}%
    </span>
  );
}

function CoeffChangeIndicator({ change }: { change: number }) {
  if (Math.abs(change) < 0.0001) return null;
  const isPositive = change > 0;
  return (
    <span
      className={cn(
        'text-[10px] font-mono',
        isPositive ? 'text-emerald-400' : 'text-red-400'
      )}
    >
      {isPositive ? '+' : ''}
      {(change * 100).toFixed(2)}%
    </span>
  );
}

function getScoreColor(score: number): string {
  if (score >= 7) return 'text-emerald-400';
  if (score >= 5) return 'text-yellow-400';
  if (score >= 3) return 'text-orange-400';
  return 'text-red-400';
}

// ═══════════════════════════════════════════════════════════════
// STAT ITEM
// ═══════════════════════════════════════════════════════════════

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium font-mono truncate">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE BAR
// ═══════════════════════════════════════════════════════════════

function ScoreBar({ score, color, height = 6 }: { score: number; color: string; height?: number }) {
  return (
    <div
      className="w-full rounded-full bg-muted overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${(score / 10) * 100}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COLLAPSIBLE TREE NODE (improved for full-screen)
// ═══════════════════════════════════════════════════════════════

function TreeNode({
  name,
  score,
  scoreChangePct,
  coefficient,
  coefficientChange,
  color,
  depth,
  children,
  defaultOpen = false,
  coinId,
  nodeKey,
}: {
  name: string;
  score: number;
  scoreChange: number;
  scoreChangePct: number;
  coefficient?: number;
  coefficientChange?: number;
  color: string;
  depth: number;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  coinId: string;
  nodeKey: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showTrend, setShowTrend] = useState(false);
  const hasChildren = children != null;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3 rounded-lg transition-colors group',
          'hover:bg-muted/50',
          depth === 0 && 'bg-muted/30 border border-border/50',
          depth === 1 && 'ml-2',
          depth === 2 && 'ml-4',
          depth === 3 && 'ml-6',
        )}
      >
        <button
          onClick={() => hasChildren && setOpen(!open)}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          )}
        </button>

        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />

        <span
          className={cn(
            'flex-1',
            depth === 0
              ? 'text-sm font-semibold'
              : depth === 1
                ? 'text-sm font-medium'
                : depth === 2
                  ? 'text-xs font-medium'
                  : 'text-xs text-muted-foreground'
          )}
        >
          {name}
        </span>

        {coefficient !== undefined && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono">
              W: {(coefficient * 100).toFixed(1)}%
            </span>
            {coefficientChange !== undefined && (
              <CoeffChangeIndicator change={coefficientChange} />
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs font-bold tabular-nums', getScoreColor(score))}>
            {score.toFixed(2)}
          </span>
          <ScoreChangeArrow changePct={scoreChangePct} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTrend(!showTrend);
          }}
          className={cn(
            'shrink-0 p-1 rounded transition-colors',
            showTrend ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'
          )}
          title="Toggle trend chart"
        >
          <LineChart className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline trend chart */}
      <AnimatePresence>
        {showTrend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'px-3 py-2',
              depth === 0 && 'ml-7',
              depth === 1 && 'ml-9',
              depth === 2 && 'ml-11',
              depth === 3 && 'ml-13',
            )}>
              <TrendChart
                coinId={coinId}
                nodeKey={nodeKey}
                days={30}
                title={`${name} Score Trend`}
                color={color}
                height={160}
                showCoefficient={coefficient !== undefined}
              />
              {coefficient !== undefined && (
                <CoefficientChart
                  nodeKey={nodeKey}
                  days={30}
                  color={color}
                  height={120}
                  title={`${name} Coefficient`}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasChildren && open && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION SECTION (for breakdown tab - full width)
// ═══════════════════════════════════════════════════════════════

function DimensionSection({
  dim,
  coinId,
  expanded,
  onToggle,
}: {
  dim: Dimension;
  coinId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = DIMENSION_COLORS[dim.key] ?? '#888';

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <span style={{ color }}>{DIMENSION_ICONS[dim.key]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">{dim.name}</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-2xl font-bold" style={{ color }}>
              {dim.score.toFixed(2)}
            </span>
            <ScoreChangeArrow changePct={dim.scoreChangePct} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Weight:</span>
              <span className="font-mono font-medium">{(dim.coefficient * 100).toFixed(1)}%</span>
              <CoeffChangeIndicator change={dim.coefficientChange ?? 0} />
            </div>
          </div>
          <div className="mt-2 max-w-xs">
            <ScoreBar score={dim.score} color={color} height={4} />
          </div>
        </div>

        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t p-4 space-y-4">
              {/* Trend + Coefficient charts side by side on wider screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrendChart
                  coinId={coinId}
                  nodeKey={dim.key}
                  days={30}
                  title={`${dim.name} Score`}
                  color={color}
                  height={200}
                />
                <CoefficientChart
                  nodeKey={dim.key}
                  days={30}
                  color={color}
                  height={200}
                  title={`${dim.name} Coefficient`}
                />
              </div>

              {/* Sub-dimensions */}
              <div className="space-y-2">
                {(dim.subDimensions ?? []).map((subDim) => (
                  <SubDimensionSection
                    key={subDim.key}
                    subDim={subDim}
                    dimKey={dim.key}
                    color={color}
                    coinId={coinId}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubDimensionSection({
  subDim,
  dimKey,
  color,
  coinId,
}: {
  subDim: SubDimension;
  dimKey: string;
  color: string;
  coinId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const nodeKey = `${dimKey}.${subDim.key}`;

  return (
    <div className="rounded-lg border bg-muted/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium flex-1">
          {subDim.name}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground font-mono">
            W: {(subDim.coefficient * 100).toFixed(1)}%
          </span>
          <CoeffChangeIndicator change={subDim.coefficientChange ?? 0} />
          <span className="text-sm font-semibold" style={{ color }}>
            {subDim.score.toFixed(2)}
          </span>
          <ScoreChangeArrow changePct={subDim.scoreChangePct} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <TrendChart
                coinId={coinId}
                nodeKey={nodeKey}
                days={30}
                title={subDim.name}
                color={color}
                height={160}
              />
              {(subDim.aspects ?? []).map((aspect) => (
                <AspectSection
                  key={aspect.key}
                  aspect={aspect}
                  dimKey={dimKey}
                  subDimKey={subDim.key}
                  color={color}
                  coinId={coinId}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AspectSection({
  aspect,
  dimKey,
  subDimKey,
  color,
  coinId,
}: {
  aspect: Aspect;
  dimKey: string;
  subDimKey: string;
  color: string;
  coinId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const nodeKey = `${dimKey}.${subDimKey}.${aspect.key}`;

  return (
    <div className="rounded-md border bg-muted/10 ml-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {aspect.subAspects.length > 0 ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3.5 inline-block shrink-0" />
        )}
        <span className="text-xs font-medium flex-1">
          {aspect.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono">
            {(aspect.coefficient * 100).toFixed(1)}%
          </span>
          <span className="text-xs font-semibold" style={{ color }}>
            {aspect.score.toFixed(2)}
          </span>
          <ScoreChangeArrow changePct={aspect.scoreChangePct} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 ml-2">
              {/* Sub-aspects as a clean table */}
              <div className="space-y-1">
                {(aspect.subAspects ?? []).map((sa) => (
                  <div
                    key={sa.key}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted-foreground flex-1">
                      {sa.name}
                    </span>
                    <span className={cn('text-xs font-bold tabular-nums', getScoreColor(sa.score))}>
                      {sa.score.toFixed(2)}
                    </span>
                    <ScoreChangeArrow changePct={sa.scoreChangePct} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT — FULL-SCREEN MODAL
// ═══════════════════════════════════════════════════════════════

export function CryptoDetailPanel({ coin: initialCoin, onClose }: CryptoDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [treeExpandAll, setTreeExpandAll] = useState(false);
  const [fullCoin, setFullCoin] = useState<CoinData>(initialCoin);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Fetch full hierarchy data from detail API since overview only returns light dimensions
  useEffect(() => {
    let cancelled = false;
    async function fetchFullDetail() {
      try {
        const res = await fetch(`/api/crypto/${initialCoin.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.score?.dimensions) {
          setFullCoin(prev => ({
            ...prev,
            dimensions: data.score.dimensions,
          }));
        }
      } catch (err) {
        console.warn('[CryptoDetailPanel] Failed to fetch full detail, using overview data:', err);
        // Fallback: overview data (light dimensions) is still usable for the radar chart
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }
    fetchFullDetail();
    return () => { cancelled = true; };
  }, [initialCoin.id]);

  // Use fullCoin for rendering (has full hierarchy when available)
  const coin = fullCoin;

  const radarData = useMemo(
    () =>
      (coin.dimensions ?? []).map((d) => ({
        dimension: DIMENSION_SHORT_NAMES[d.key] ?? d.name.split(' ')[0],
        fullName: d.name,
        score: d.score,
        fullMark: 10,
      })),
    [coin.dimensions ?? []]
  );

  const change1h = coin.price_change_percentage_1h_in_currency ?? 0;
  const change24h = coin.price_change_percentage_24h ?? 0;
  const change7d = coin.price_change_percentage_7d_in_currency ?? 0;

  // Get TradingView symbol
  const tvSymbol = SYMBOL_MAP[coin.id] ?? `${coin.symbol.toUpperCase()}USDT`;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { key: 'breakdown', label: 'Score Breakdown', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'trends', label: 'Trends', icon: <LineChart className="w-4 h-4" /> },
    { key: 'tradingview', label: 'TradingView', icon: <Activity className="w-4 h-4" /> },
    { key: 'stats', label: 'Statistics', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* ─── TOP BAR ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
        {loadingDetail && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {/* Coin Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={coin.image}
            alt={coin.name}
            className="w-9 h-9 rounded-full shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-bold text-lg truncate">{coin.name}</h2>
            <span className="text-xs text-muted-foreground uppercase">
              {coin.symbol}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3 ml-4">
          <span className="text-xl font-bold font-mono">
            {formatPrice(coin.current_price)}
          </span>
          <span
            className={cn(
              'text-sm font-medium flex items-center gap-0.5',
              change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {change24h >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {change24h >= 0 ? '+' : ''}
            {change24h.toFixed(2)}%
          </span>
        </div>

        {/* Time Changes */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            1h:{' '}
            <span className={change1h >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {change1h >= 0 ? '+' : ''}{change1h.toFixed(2)}%
            </span>
          </span>
          <span>
            7d:{' '}
            <span className={change7d >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {change7d >= 0 ? '+' : ''}{change7d.toFixed(2)}%
            </span>
          </span>
          <span>Rank: #{coin.market_cap_rank}</span>
        </div>

        {/* AI Score */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <ScoreBadge
            score={coin.aiScore}
            confidence={coin.confidence}
            size="md"
            showLabel
            delta={coin.aiScoreChangePct}
            priceChange24h={coin.price_change_percentage_24h}
          />
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── DIMENSION QUICK STRIP ─────────────────────────── */}
      <div className="px-4 sm:px-6 py-2 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(coin.dimensions ?? []).map((dim) => (
            <button
              key={dim.key}
              onClick={() => {
                setActiveTab('breakdown');
                setExpandedDim(expandedDim === dim.key ? null : dim.key);
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors shrink-0',
                expandedDim === dim.key && activeTab === 'breakdown'
                  ? 'bg-card shadow-sm'
                  : 'hover:bg-muted/50'
              )}
              style={{ borderColor: `${DIMENSION_COLORS[dim.key]}30` }}
            >
              <span style={{ color: DIMENSION_COLORS[dim.key] }}>
                {DIMENSION_ICONS[dim.key]}
              </span>
              <span className="text-xs font-medium whitespace-nowrap">
                {DIMENSION_SHORT_NAMES[dim.key] ?? dim.name.split(' ')[0]}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: DIMENSION_COLORS[dim.key] }}
              >
                {dim.score.toFixed(2)}
              </span>
              <ScoreChangeArrow changePct={dim.scoreChangePct} />
            </button>
          ))}
        </div>
      </div>

      {/* ─── TABS ───────────────────────────────────────────── */}
      <div className="flex border-b px-4 sm:px-6 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
              activeTab === tab.key
                ? 'text-primary border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

          {/* ═══ TAB: OVERVIEW ════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div className="rounded-xl border p-5">
                  <h3 className="text-sm font-semibold mb-4">
                    Dimension Scores (12D Framework)
                  </h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={radarData}
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                      >
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="dimension"
                          tick={{
                            fontSize: 12,
                            fill: 'hsl(var(--muted-foreground))',
                          }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 10]}
                          tick={{
                            fontSize: 9,
                            fill: 'hsl(var(--muted-foreground))',
                          }}
                          tickCount={6}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number, name: string) => [
                            value.toFixed(2),
                            name === 'score' ? 'Score' : name,
                          ]}
                          labelFormatter={(label: string) =>
                            radarData.find((d) => d.dimension === label)
                              ?.fullName ?? label
                          }
                        />
                        <Radar
                          name="score"
                          dataKey="score"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Dimension Scores + Bars */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Dimension Breakdown</h3>
                  {(coin.dimensions ?? []).map((dim) => {
                    const color = DIMENSION_COLORS[dim.key] ?? '#888';
                    return (
                      <div key={dim.key} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-lg"
                              style={{ backgroundColor: `${color}15` }}
                            >
                              <span style={{ color }}>{DIMENSION_ICONS[dim.key]}</span>
                            </div>
                            <span className="text-sm font-semibold">{dim.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold" style={{ color }}>
                              {dim.score.toFixed(2)}
                            </span>
                            <ScoreChangeArrow changePct={dim.scoreChangePct} />
                          </div>
                        </div>
                        <ScoreBar score={dim.score} color={color} height={6} />
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>Weight: {(dim.coefficient * 100).toFixed(1)}%</span>
                          <CoeffChangeIndicator change={dim.coefficientChange ?? 0} />
                        </div>
                        {/* Sub-dimension mini list */}
                        <div className="mt-3 space-y-1">
                          {(dim.subDimensions ?? []).map((sd) => (
                            <div
                              key={sd.key}
                              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => {
                                setActiveTab('breakdown');
                                setExpandedDim(dim.key);
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-xs flex-1">{sd.name}</span>
                              <span className="text-xs font-medium" style={{ color }}>
                                {sd.score.toFixed(2)}
                              </span>
                              <ScoreChangeArrow changePct={sd.scoreChangePct} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reference Framework */}
              <div className="rounded-xl border p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  Reference Framework (48 Books)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(coin.dimensions ?? []).map((dim) => (
                    <div key={dim.key} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: DIMENSION_COLORS[dim.key] }}>
                          {DIMENSION_ICONS[dim.key]}
                        </span>
                        <span className="text-xs font-semibold">{dim.name}</span>
                      </div>
                      <div className="space-y-0.5">
                        {(dim.references ?? []).map((ref, i) => (
                          <div key={i} className="text-[10px] text-muted-foreground">
                            📚 {ref}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: BREAKDOWN ═════════════════════════════════ */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground max-w-2xl">
                  12-dimension hierarchical scoring with ML-optimized coefficients.
                  Expand each dimension to see sub-dimensions, aspects, and sub-aspects with trend charts.
                </p>
                <button
                  onClick={() => {
                    if (expandedDim) {
                      setExpandedDim(null);
                    } else if ((coin.dimensions ?? []).length > 0) {
                      setExpandedDim(coin.dimensions?.[0]?.key);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted/50 transition-colors shrink-0"
                >
                  {expandedDim ? (
                    <>
                      <Shrink className="w-3 h-3" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <Expand className="w-3 h-3" />
                      Expand First
                    </>
                  )}
                </button>
              </div>

              {/* Dimension Cards */}
              <div className="space-y-3">
                {(coin.dimensions ?? []).map((dim) => (
                  <DimensionSection
                    key={dim.key}
                    dim={dim}
                    coinId={coin.id}
                    expanded={expandedDim === dim.key}
                    onToggle={() =>
                      setExpandedDim(expandedDim === dim.key ? null : dim.key)
                    }
                  />
                ))}
              </div>

              {/* Full Hierarchical Tree */}
              <div className="rounded-xl border p-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">
                    Full Scoring Hierarchy (88 Nodes)
                  </h3>
                  <button
                    onClick={() => setTreeExpandAll(!treeExpandAll)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    {treeExpandAll ? (
                      <>
                        <Shrink className="w-3 h-3" />
                        Collapse Tree
                      </>
                    ) : (
                      <>
                        <Expand className="w-3 h-3" />
                        Expand Tree
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {(coin.dimensions ?? []).map((dim) => (
                    <TreeNode
                      key={dim.key}
                      name={dim.name}
                      score={dim.score}
                      scoreChange={dim.scoreChange}
                      scoreChangePct={dim.scoreChangePct}
                      coefficient={dim.coefficient}
                      coefficientChange={dim.coefficientChange ?? 0}
                      color={DIMENSION_COLORS[dim.key] ?? '#888'}
                      depth={0}
                      defaultOpen={treeExpandAll}
                      coinId={coin.id}
                      nodeKey={dim.key}
                    >
                      {(dim.subDimensions ?? []).map((subDim) => (
                        <TreeNode
                          key={subDim.key}
                          name={subDim.name}
                          score={subDim.score}
                          scoreChange={subDim.scoreChange}
                          scoreChangePct={subDim.scoreChangePct}
                          coefficient={subDim.coefficient}
                          coefficientChange={subDim.coefficientChange}
                          color={DIMENSION_COLORS[dim.key] ?? '#888'}
                          depth={1}
                          defaultOpen={treeExpandAll}
                          coinId={coin.id}
                          nodeKey={`${dim.key}.${subDim.key}`}
                        >
                          {(subDim.aspects ?? []).map((aspect) => (
                            <TreeNode
                              key={aspect.key}
                              name={aspect.name}
                              score={aspect.score}
                              scoreChange={aspect.scoreChange}
                              scoreChangePct={aspect.scoreChangePct}
                              coefficient={aspect.coefficient}
                              coefficientChange={aspect.coefficientChange ?? 0}
                              color={DIMENSION_COLORS[dim.key] ?? '#888'}
                              depth={2}
                              defaultOpen={treeExpandAll}
                              coinId={coin.id}
                              nodeKey={`${dim.key}.${subDim.key}.${aspect.key}`}
                            >
                              {(aspect.subAspects ?? []).map((sa) => (
                                <TreeNode
                                  key={sa.key}
                                  name={sa.name}
                                  score={sa.score}
                                  scoreChange={sa.scoreChange}
                                  scoreChangePct={sa.scoreChangePct}
                                  color={DIMENSION_COLORS[dim.key] ?? '#888'}
                                  depth={3}
                                  defaultOpen={treeExpandAll}
                                  coinId={coin.id}
                                  nodeKey={`${dim.key}.${subDim.key}.${aspect.key}.${sa.key}`}
                                />
                              ))}
                            </TreeNode>
                          ))}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB: TRENDS ═══════════════════════════════════ */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Score and coefficient evolution over time. Each chart shows how the
                AI score for each dimension has changed, with ML coefficient weights.
              </p>

              {/* Overall AI Score Trend */}
              <TrendChart
                coinId={coin.id}
                nodeKey="overall"
                days={90}
                title="Overall AI Score"
                color="#a855f7"
                height={220}
                showCoefficient={false}
              />

              {/* Dimension Trends — 2 columns on wide screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(coin.dimensions ?? []).map((dim) => (
                  <TrendChart
                    key={dim.key}
                    coinId={coin.id}
                    nodeKey={dim.key}
                    days={90}
                    title={`${dim.name} Score`}
                    color={DIMENSION_COLORS[dim.key] ?? '#888'}
                    height={200}
                  />
                ))}
              </div>

              {/* Coefficient Trends */}
              <h3 className="text-sm font-semibold mt-4">Coefficient Evolution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(coin.dimensions ?? []).map((dim) => (
                  <CoefficientChart
                    key={`coeff-${dim.key}`}
                    nodeKey={dim.key}
                    days={90}
                    color={DIMENSION_COLORS[dim.key] ?? '#888'}
                    height={180}
                    title={`${dim.name.split(' ')[0]} Coefficient`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB: TRADINGVIEW ═════════════════════════════ */}
          {activeTab === 'tradingview' && (
            <div>
              <TradingViewWidget
                symbol={tvSymbol}
                height={600}
              />
            </div>
          )}

          {/* ═══ TAB: STATS ═══════════════════════════════════ */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold">Key Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatItem label="Market Cap" value={`$${formatNumber(coin.market_cap)}`} />
                <StatItem label="24h Volume" value={`$${formatNumber(coin.total_volume)}`} />
                <StatItem label="24h High" value={formatPrice(coin.high_24h)} />
                <StatItem label="24h Low" value={formatPrice(coin.low_24h)} />
                <StatItem label="All-Time High" value={formatPrice(coin.ath)} />
                <StatItem label="ATH Change" value={`${coin.ath_change_percentage.toFixed(2)}%`} />
                <StatItem label="Circulating Supply" value={formatNumber(coin.circulating_supply)} />
                <StatItem label="Total Supply" value={coin.total_supply ? formatNumber(coin.total_supply) : '∞'} />
                <StatItem label="Max Supply" value={coin.max_supply ? formatNumber(coin.max_supply) : '∞'} />
                <StatItem label="Market Cap Rank" value={`#${coin.market_cap_rank}`} />
                <StatItem label="1h Change" value={`${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%`} />
                <StatItem label="7d Change" value={`${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%`} />
              </div>

              {/* Supply Breakdown */}
              <div className="rounded-xl border p-5">
                <h3 className="text-sm font-semibold mb-3">Supply Breakdown</h3>
                {coin.max_supply && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Circulating / Max</span>
                      <span className="font-mono">
                        {((coin.circulating_supply / coin.max_supply) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${(coin.circulating_supply / coin.max_supply) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{formatNumber(coin.circulating_supply)}</span>
                      <span>{formatNumber(coin.max_supply)}</span>
                    </div>
                  </div>
                )}
                {!coin.max_supply && (
                  <p className="text-xs text-muted-foreground">
                    No maximum supply defined — inflationary model
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
