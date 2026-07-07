'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Award,
  AlertCircle,
  Activity,
  Users,
  Target,
  Gauge,
  Heart,
  Flame,
  Flower2,
  BrainCircuit,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface BehavioralBiasScores {
  overreaction: number;
  herding: number;
  lossAversion: number;
  dispositionEffect: number;
  overconfidence: number;
  anchoring: number;
  fearGreed: number;
  meanReversion: number;
  momentumPersistence: number;
  noiseTraderRisk: number;
  emotionalUtility: number;
  stateDependence: number;
  mindfulnessScore: number;
  resilience: number;
  lossAcceptance: number;
  tiltRisk: number;
}

type MarketRegime = 'panic' | 'fear' | 'neutral' | 'greed' | 'euphoria';

interface BehavioralSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  descriptionFa: string;
  affectedCoins: string[];
  reference: string;
  confidence: number;
}

interface BookReference {
  id: string;
  title: string;
  titleFa: string;
  author: string;
  authorFa: string;
  nobelPrize: boolean;
  keyConcepts: string[];
  detectedBiases: readonly string[];
}

interface BehavioralFinanceData {
  marketScores: BehavioralBiasScores;
  marketRegime: MarketRegime;
  regimeConfidence: number;
  fearGreedIndex: number;
  behavioralRiskLevel: number;
  signals: BehavioralSignal[];
  computedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const BIAS_CONFIG: Record<string, {
  label: string;
  labelFa: string;
  icon: typeof Brain;
  color: string;
  description: string;
  bookRef: string;
}> = {
  overreaction: {
    label: 'Overreaction',
    labelFa: 'Overreaction',
    icon: Zap,
    color: '#ef4444',
    description: 'Large price swings followed by reversals',
    bookRef: 'Kahneman',
  },
  herding: {
    label: 'Herding',
    labelFa: 'Herding',
    icon: Users,
    color: '#8b5cf6',
    description: 'Crowd-following behavior',
    bookRef: 'Shefrin & Montier',
  },
  lossAversion: {
    label: 'Loss Aversion',
    labelFa: 'Loss Aversion',
    icon: Shield,
    color: '#f59e0b',
    description: 'Asymmetric response to losses vs gains',
    bookRef: 'Kahneman',
  },
  dispositionEffect: {
    label: 'Disposition Effect',
    labelFa: 'Disposition Effect',
    icon: Target,
    color: '#06b6d4',
    description: 'Selling winners early, holding losers',
    bookRef: 'Shefrin',
  },
  overconfidence: {
    label: 'Overconfidence',
    labelFa: 'Overconfidence',
    icon: TrendingUp,
    color: '#ec4899',
    description: 'Excessive trading activity',
    bookRef: 'Montier',
  },
  anchoring: {
    label: 'Anchoring',
    labelFa: 'Anchoring',
    icon: Gauge,
    color: '#14b8a6',
    description: 'Fixation on reference price levels',
    bookRef: 'Ariely',
  },
  fearGreed: {
    label: 'Fear & Greed',
    labelFa: 'Fear & Greed',
    icon: Activity,
    color: '#f97316',
    description: 'Market sentiment composite',
    bookRef: 'Tvede',
  },
  meanReversion: {
    label: 'Mean Reversion',
    labelFa: 'Mean Reversion',
    icon: TrendingDown,
    color: '#6366f1',
    description: 'Price deviation from average',
    bookRef: 'Shleifer',
  },
  momentumPersistence: {
    label: 'Momentum',
    labelFa: 'Momentum',
    icon: TrendingUp,
    color: '#22c55e',
    description: 'Trend continuation strength',
    bookRef: 'Douglas',
  },
  noiseTraderRisk: {
    label: 'Noise Trader Risk',
    labelFa: 'Noise Trader Risk',
    icon: AlertTriangle,
    color: '#a855f7',
    description: 'Irrational participant volatility',
    bookRef: 'Shleifer',
  },
  emotionalUtility: {
    label: 'Emotional Utility',
    labelFa: 'Emotional Utility',
    icon: Heart,
    color: '#e879f9',
    description: 'Emotional vs rational trading motives',
    bookRef: 'Statman',
  },
  stateDependence: {
    label: 'State Dependence',
    labelFa: 'State Dependence',
    icon: BrainCircuit,
    color: '#c084fc',
    description: 'Emotionally altered decision quality',
    bookRef: 'Steenbarger',
  },
  mindfulnessScore: {
    label: 'Mindfulness',
    labelFa: 'Mindfulness',
    icon: Flower2,
    color: '#34d399',
    description: 'Calm, deliberate market activity',
    bookRef: 'Dayton',
  },
  resilience: {
    label: 'Resilience',
    labelFa: 'Resilience',
    icon: ShieldCheck,
    color: '#2dd4bf',
    description: 'Market recovery after drops',
    bookRef: 'Steenbarger 2.0',
  },
  lossAcceptance: {
    label: 'Loss Acceptance',
    labelFa: 'Loss Acceptance',
    icon: Scale,
    color: '#fb923c',
    description: 'Orderly vs panic selling',
    bookRef: 'Hougaard',
  },
  tiltRisk: {
    label: 'Tilt Risk',
    labelFa: 'Tilt Risk',
    icon: Flame,
    color: '#f43f5e',
    description: 'Loss of emotional control in market',
    bookRef: 'Tendler',
  },
};

const REGIME_CONFIG: Record<MarketRegime, {
  label: string;
  labelFa: string;
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
}> = {
  panic: { label: 'PANIC', labelFa: 'PANIC', color: '#ef4444', bgColor: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle },
  fear: { label: 'FEAR', labelFa: 'FEAR', color: '#f97316', bgColor: 'bg-orange-500/10 border-orange-500/30', icon: TrendingDown },
  neutral: { label: 'NEUTRAL', labelFa: 'NEUTRAL', color: '#eab308', bgColor: 'bg-yellow-500/10 border-yellow-500/30', icon: Minus },
  greed: { label: 'GREED', labelFa: 'GREED', color: '#22c55e', bgColor: 'bg-green-500/10 border-green-500/30', icon: TrendingUp },
  euphoria: { label: 'EUPHORIA', labelFa: 'EUPHORIA', color: '#10b981', bgColor: 'bg-emerald-500/10 border-emerald-500/30', icon: Zap },
};

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  low: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  medium: { color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  high: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  critical: { color: 'text-red-500', bgColor: 'bg-red-600/15 border-red-600/40' },
};

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function FearGreedGauge({ index, size = 200 }: { index: number; size?: number }) {
  const angle = (index / 100) * 180;
  const r = size / 2 - 15;
  const cx = size / 2;
  const cy = size / 2 + 5;

  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleLen = r - 10;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  // Color gradient based on index
  const color = index <= 20 ? '#ef4444' : index <= 40 ? '#f97316' : index <= 60 ? '#eab308' : index <= 80 ? '#22c55e' : '#10b981';

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 2 + 15} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Colored segments */}
        {[
          { start: 0, end: 36, color: '#ef4444' },
          { start: 36, end: 72, color: '#f97316' },
          { start: 72, end: 108, color: '#eab308' },
          { start: 108, end: 144, color: '#22c55e' },
          { start: 144, end: 180, color: '#10b981' },
        ].map((seg, i) => {
          const startAngle = (180 - seg.start) * (Math.PI / 180);
          const endAngle = (180 - seg.end) * (Math.PI / 180);
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy - r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy - r * Math.sin(endAngle);
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.3}
            />
          );
        })}
        {/* Active segment */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={Math.PI * r}
          initial={{ strokeDashoffset: Math.PI * r }}
          animate={{ strokeDashoffset: Math.PI * r - (index / 100) * Math.PI * r }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        />
        <circle cx={cx} cy={cy} r={4} fill={color} />
        {/* Labels */}
        <text x={cx - r - 5} y={cy + 15} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">Extreme Fear</text>
        <text x={cx + r + 5} y={cy + 15} textAnchor="start" fontSize={9} fill="hsl(var(--muted-foreground))">Extreme Greed</text>
      </svg>
      <div className="absolute bottom-1 flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{index}</span>
        <span className="text-[10px] text-muted-foreground font-medium">Fear & Greed Index</span>
      </div>
    </div>
  );
}

function BiasMeter({ label, labelFa, score, color, icon: Icon, bookRef }: {
  label: string;
  labelFa: string;
  score: number;
  color: string;
  icon: typeof Brain;
  bookRef: string;
}) {
  const severity = score >= 8 ? 'critical' : score >= 6 ? 'high' : score >= 4 ? 'medium' : 'low';
  
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{label}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(score / 10) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums shrink-0" style={{ color }}>
            {score.toFixed(2)}
          </span>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          'text-[8px] px-1 py-0 h-4 shrink-0',
          severity === 'critical' ? 'border-red-500/30 text-red-400' :
          severity === 'high' ? 'border-orange-500/30 text-orange-400' :
          severity === 'medium' ? 'border-yellow-500/30 text-yellow-400' :
          'border-muted text-muted-foreground'
        )}
      >
        {bookRef}
      </Badge>
    </div>
  );
}

function SignalCard({ signal, index }: { signal: BehavioralSignal; index: number }) {
  const severity = SEVERITY_CONFIG[signal.severity] ?? SEVERITY_CONFIG.medium;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={cn(
        'rounded-lg border p-3',
        severity.bgColor
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className={cn('w-4 h-4 shrink-0 mt-0.5', severity.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 h-4', severity.color)}>
              {signal.severity.toUpperCase()}
            </Badge>
            <span className="text-xs font-semibold capitalize">{signal.type.replace(/_/g, ' ')}</span>
            <span className="text-[9px] text-muted-foreground">
              Confidence: {Math.round(signal.confidence * 100)}%
            </span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{signal.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <BookOpen className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground italic">{signal.reference}</span>
          </div>
          {signal.affectedCoins.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {signal.affectedCoins.slice(0, 4).map(coin => (
                <Badge key={coin} variant="secondary" className="text-[8px] px-1.5 py-0 h-4">
                  {coin.toUpperCase()}
                </Badge>
              ))}
              {signal.affectedCoins.length > 4 && (
                <span className="text-[9px] text-muted-foreground">+{signal.affectedCoins.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BookCard({ book, detectedScores }: { book: BookReference; detectedScores: BehavioralBiasScores }) {
  const [expanded, setExpanded] = useState(false);
  
  // Get relevant bias scores for this book
  const relevantBiases = book.detectedBiases.map(bias => ({
    key: bias,
    score: detectedScores[bias as keyof BehavioralBiasScores] ?? 0,
    config: BIAS_CONFIG[bias],
  }));
  
  return (
    <motion.div
      className="rounded-lg border bg-card/80 p-3 cursor-pointer hover:bg-muted/10 transition-colors"
      onClick={() => setExpanded(!expanded)}
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{book.title}</span>
            {book.nobelPrize && <Award className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{book.author}</span>
          </div>
          {/* Bias indicators */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {relevantBiases.map(bias => (
              <div
                key={bias.key}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{
                  backgroundColor: `${bias.config.color}15`,
                  color: bias.config.color,
                }}
              >
                <bias.config.icon className="w-2.5 h-2.5" />
                {bias.score.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t space-y-2">
              <div className="text-[10px] text-muted-foreground font-medium">Key Concepts:</div>
              <div className="flex flex-wrap gap-1">
                {book.keyConcepts.map(concept => (
                  <Badge key={concept} variant="secondary" className="text-[9px] px-1.5 py-0 h-5">
                    {concept}
                  </Badge>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium mt-2">Detected Biases:</div>
              {relevantBiases.map(bias => (
                <div key={bias.key} className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: bias.config.color }}>{bias.config.label}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(bias.score / 10) * 100}%`, backgroundColor: bias.config.color }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: bias.config.color }}>{bias.score.toFixed(2)}/10</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function BehavioralFinancePanel() {
  const [data, setData] = useState<BehavioralFinanceData | null>(null);
  const [books, setBooks] = useState<BookReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBooks, setShowBooks] = useState(false);
  const [showSignals, setShowSignals] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/behavioral-finance');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      
      if (json.success && json.data) {
        setData(json.data);
        setBooks(json.books ?? []);
      } else {
        throw new Error(json.error ?? 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isExpanded && !data && !loading) {
      fetchData();
    }
  }, [isExpanded, data, loading, fetchData]);

  const regime = data ? REGIME_CONFIG[data.marketRegime] : null;
  const RegimeIcon = regime?.icon ?? Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-1">
        <Brain className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold tracking-tight">
          Behavioral Finance Analysis
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
        >
          {isExpanded ? (
            <><ChevronDown className="w-4 h-4" />Hide</>
          ) : (
            <><ChevronRight className="w-4 h-4" />Load Analysis<Badge variant="secondary" className="text-[9px] px-1.5 py-0">ML</Badge></>
          )}
        </button>
        {isExpanded && data && (
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* Collapsed preview */}
      {!isExpanded && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Algorithmic behavioral finance analysis based on 16 authoritative books</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>🧠 Overreaction</span>
              <span>👥 Herding</span>
              <span>⚡ Fear & Greed</span>
              <span>🎯 16 Biases</span>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LOADING STATE
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && loading && !data && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Analyzing market psychology and behavioral biases...</p>
          <p className="text-xs text-muted-foreground">16 Cognitive Biases • Based on 16 Reference Books</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ERROR STATE
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && error && !data && (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button onClick={fetchData} className="text-xs text-primary hover:underline">Try again</button>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && data && (
        <div className="space-y-4">
          {/* Row 1: Fear & Greed Gauge + Market Regime + Risk Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fear & Greed Gauge */}
            <Card className="p-4 flex flex-col items-center border-amber-500/20 bg-amber-500/5">
              <FearGreedGauge index={data.fearGreedIndex} size={200} />
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Market Sentiment</span>
              </div>
            </Card>

            {/* Market Regime + Risk Level */}
            <Card className="p-4 flex flex-col justify-center">
              <div className="text-xs font-semibold text-muted-foreground mb-3">Market Regime</div>
              {regime && (
                <div className={cn('rounded-xl border p-4 flex flex-col items-center gap-2', regime.bgColor)}>
                  <RegimeIcon className="w-8 h-8" style={{ color: regime.color }} />
                  <span className="text-xl font-bold" style={{ color: regime.color }}>{regime.label}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground">Confidence:</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${data.regimeConfidence * 100}%`, backgroundColor: regime.color }}
                      />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: regime.color }}>
                      {Math.round(data.regimeConfidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Behavioral Risk Level */}
            <Card className="p-4 flex flex-col justify-center">
              <div className="text-xs font-semibold text-muted-foreground mb-3">Behavioral Risk Level</div>
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted) / 0.3)" strokeWidth={6} />
                    <motion.circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={
                        data.behavioralRiskLevel >= 8 ? '#ef4444' :
                        data.behavioralRiskLevel >= 6 ? '#f97316' :
                        data.behavioralRiskLevel >= 4 ? '#eab308' : '#22c55e'
                      }
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeDasharray={264}
                      initial={{ strokeDashoffset: 264 }}
                      animate={{ strokeDashoffset: 264 - (data.behavioralRiskLevel / 10) * 264 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums" style={{
                      color: data.behavioralRiskLevel >= 8 ? '#ef4444' :
                             data.behavioralRiskLevel >= 6 ? '#f97316' :
                             data.behavioralRiskLevel >= 4 ? '#eab308' : '#22c55e'
                    }}>
                      {data.behavioralRiskLevel}
                    </span>
                    <span className="text-[9px] text-muted-foreground">/10</span>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{
                  color: data.behavioralRiskLevel >= 8 ? '#ef4444' :
                         data.behavioralRiskLevel >= 6 ? '#f97316' :
                         data.behavioralRiskLevel >= 4 ? '#eab308' : '#22c55e'
                }}>
                  {data.behavioralRiskLevel >= 8 ? 'Very High Risk' :
                   data.behavioralRiskLevel >= 6 ? 'High Risk' :
                   data.behavioralRiskLevel >= 4 ? 'Moderate Risk' : 'Low Risk'}
                </span>
              </div>
            </Card>
          </div>

          {/* Row 2: Bias Meters */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">16 Cognitive Biases</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span>1=Low</span>
                <span>→</span>
                <span>10=High</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {Object.entries(BIAS_CONFIG).map(([key, config]) => {
                const score = data.marketScores[key as keyof BehavioralBiasScores] ?? 5;
                return (
                  <BiasMeter
                    key={key}
                    label={config.label}
                    labelFa={config.labelFa}
                    score={score}
                    color={config.color}
                    icon={config.icon}
                    bookRef={config.bookRef}
                  />
                );
              })}
            </div>
          </Card>

          {/* Row 3: Signals + Books */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Behavioral Signals */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">Active Signals</span>
                </div>
                <Badge variant="secondary" className="text-[9px]">
                  {data.signals.length} detected
                </Badge>
              </div>
              {data.signals.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No significant behavioral signals</p>
                  <p className="text-xs">Market appears rationally balanced</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {data.signals.map((signal, i) => (
                    <SignalCard key={`${signal.type}-${i}`} signal={signal} index={i} />
                  ))}
                </div>
              )}
            </Card>

            {/* Reference Books */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  className="flex items-center gap-2"
                  onClick={() => setShowBooks(!showBooks)}
                >
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">16 Reference Books</span>
                  {showBooks ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </div>
              {!showBooks ? (
                <div className="space-y-1">
                  {books.slice(0, 3).map(book => (
                    <div key={book.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{book.title}</span>
                      {book.nobelPrize && <Award className="w-3 h-3 text-yellow-500 shrink-0" />}
                    </div>
                  ))}
                  <button
                    onClick={() => setShowBooks(true)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Show all 16 books →
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {books.map(book => (
                    <BookCard key={book.id} book={book} detectedScores={data.marketScores} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}
