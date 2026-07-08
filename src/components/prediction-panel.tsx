'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Target,
  BarChart3,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Gauge,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  Cell,
  ComposedChart,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface PredictionResult {
  nodeKey: string;
  coinId: string;
  targetDate: string;
  predictedScore: number;
  predictedChange: number;
  predictedDirection: number;
  confidence: number;
  modelVersion: string;
}

interface CoinPrediction {
  coinId: string;
  coinName: string;
  totalPrediction: PredictionResult;
  dimensionPredictions: PredictionResult[];
  subDimensionPredictions: PredictionResult[];
  aspectPredictions: PredictionResult[];
  subAspectPredictions: PredictionResult[];
}

interface PredictionSummary {
  totalPredictions: number;
  avgMae: number;
  avgDirectionAccuracy: number;
  avgConfidence: number;
  recentMae: number;
  recentDirectionAccuracy: number;
  byLevel: Record<string, { mae: number; directionAccuracy: number; count: number }>;
}

interface PredictionComparison {
  date: string;
  predicted: number;
  actual: number;
  error: number;
  directionCorrect: boolean;
  confidence: number;
  predictedDirection: number;
  actualDirection: number;
}

interface DimensionComparison {
  nodeKey: string;
  label: string;
  mae: number;
  rmse: number;
  directionAccuracy: number;
  count: number;
  recentMae: number;
  recentDirectionAccuracy: number;
  avgConfidence: number;
  comparisons: PredictionComparison[];
}

interface ConfidenceCalibration {
  bucket: string;
  avgConfidence: number;
  avgError: number;
  directionAccuracy: number;
  count: number;
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION METADATA
// ═══════════════════════════════════════════════════════════════

const DIMENSION_META: Record<string, { name: string; color: string; icon: string }> = {
  fundamental: { name: 'Fundamental', color: '#ef4444', icon: 'BarChart3' },
  technical: { name: 'Technical', color: '#3b82f6', icon: 'Activity' },
  onchain: { name: 'On-Chain', color: '#22c55e', icon: 'Network' },
  market_psychology: { name: 'Psychology', color: '#f59e0b', icon: 'Brain' },
  news_sentiment: { name: 'News & Sentiment', color: '#8b5cf6', icon: 'Newspaper' },
  macroeconomic: { name: 'Macroeconomic', color: '#a855f7', icon: 'Globe' },
  regulatory: { name: 'Regulatory', color: '#94a3b8', icon: 'Landmark' },
  network_security: { name: 'Network Security', color: '#ea580c', icon: 'Shield' },
  derivatives: { name: 'Derivatives', color: '#06b6d4', icon: 'TrendingUp' },
  whale_smart_money: { name: 'Whale & Smart Money', color: '#1e40af', icon: 'Anchor' },
  ecosystem_defi: { name: 'Ecosystem & DeFi', color: '#10b981', icon: 'Layers' },
  inter_market: { name: 'Inter-Market', color: '#64748b', icon: 'Link' },
};

const NODE_KEY_LABELS: Record<string, string> = {
  total: 'Total AI Score',
  fundamental: 'Fundamental Analysis',
  technical: 'Technical Analysis',
  onchain: 'On-Chain & Microstructure',
  market_psychology: 'Market & Investment Psychology',
  news_sentiment: 'News & Sentiment Analysis',
  macroeconomic: 'Macroeconomic',
  regulatory: 'Regulatory',
  network_security: 'Network Security',
  derivatives: 'Derivatives',
  whale_smart_money: 'Whale & Smart Money',
  ecosystem_defi: 'Ecosystem & DeFi',
  inter_market: 'Inter-Market',
};

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function getNodeLabel(key: string): string {
  if (NODE_KEY_LABELS[key]) return NODE_KEY_LABELS[key];
  const parts = key.split('.');
  return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getDimensionColor(key: string): string {
  const dimKey = key === 'total' ? '' : key.split('.')[0];
  return DIMENSION_META[dimKey]?.color ?? '#64748b';
}

function getDirectionIcon(dir: number) {
  if (dir > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (dir < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getConfidenceColor(conf: number): string {
  if (conf >= 0.7) return 'text-green-500';
  if (conf >= 0.4) return 'text-yellow-500';
  return 'text-red-500';
}

// ═══════════════════════════════════════════════════════════════
// PREDICTION PANEL
// ═══════════════════════════════════════════════════════════════

export function PredictionPanel() {
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [predictions, setPredictions] = useState<CoinPrediction[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, PredictionComparison[]>>({});
  const [dimComparisons, setDimComparisons] = useState<DimensionComparison[]>([]);
  const [calibration, setCalibration] = useState<ConfidenceCalibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedCoin, setExpandedCoin] = useState<string | null>(null);
  const [selectedDimForChart, setSelectedDimForChart] = useState<string>('total');
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<string>('comparison');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, predRes] = await Promise.all([
        fetch('/api/predictions?action=summary'),
        fetch('/api/predictions?action=latest'),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (predRes.ok) {
        const predData = await predRes.json();
        setPredictions(predData.predictions || []);
        // Auto-select first coin
        if (predData.predictions?.length > 0 && !selectedCoinId) {
          setSelectedCoinId(predData.predictions[0].coinId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, [selectedCoinId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch dimension comparisons and calibration when coin is selected
  useEffect(() => {
    if (!selectedCoinId) return;

    const fetchDimData = async () => {
      try {
        const [dimRes, calRes] = await Promise.all([
          fetch(`/api/predictions?action=comparison-dims&coinId=${selectedCoinId}&days=14`),
          fetch('/api/predictions?action=confidence-cal&days=30'),
        ]);

        if (dimRes.ok) {
          const dimData = await dimRes.json();
          setDimComparisons(dimData.dimensions || []);
        }

        if (calRes.ok) {
          const calData = await calRes.json();
          setCalibration(calData.calibration || []);
        }
      } catch (err) {
        console.error('Dim comparison error:', err);
      }
    };

    fetchDimData();
  }, [selectedCoinId, summary]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // First generate predictions
      const res = await fetch('/api/predictions?action=generate');
      if (res.ok) {
        // Then generate historical comparisons for retroactive data
        await fetch('/api/predictions?action=generate-historical&days=7');
        // Refresh
        await fetchData();
      }
    } catch (err) {
      console.error('Generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const fetchComparison = async (coinId: string, nodeKey: string) => {
    try {
      const res = await fetch(`/api/predictions?action=comparison&coinId=${coinId}&nodeKey=${nodeKey}&days=14`);
      if (res.ok) {
        const data = await res.json();
        setComparisons(prev => ({
          ...prev,
          [`${coinId}.${nodeKey}`]: data.comparison || [],
        }));
      }
    } catch (err) {
      console.error('Comparison error:', err);
    }
  };

  // ─── Loading State ──────────────────────────────────────
  if (loading && !summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading ML predictions...</span>
        </CardContent>
      </Card>
    );
  }

  // ─── No Data State ──────────────────────────────────────
  if (!summary || summary.totalPredictions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            ML Prediction Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Sparkles className="w-12 h-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-medium mb-1">No Predictions Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first ML predictions to start tracking accuracy.
              The model uses EWMA + Trend + Momentum + Mean Reversion analysis.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate Predictions'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentComparisons = comparisons[`${selectedCoinId}.${selectedDimForChart}`] || [];
  const currentDimComparison = dimComparisons.find(d => d.nodeKey === selectedDimForChart);

  // ─── Main Dashboard ────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header with Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-primary" />
              ML Prediction Engine
              <Badge variant="outline" className="text-xs font-mono">
                {predictions.length > 0 ? predictions[0].totalPrediction.modelVersion : 'v2'}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {generating ? 'Training...' : 'Regenerate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <SummaryCard
              label="Total Predictions"
              value={summary.totalPredictions.toLocaleString()}
              icon={<Target className="w-4 h-4" />}
              colorClass="text-blue-500"
            />
            <SummaryCard
              label="Avg MAE"
              value={summary.avgMae.toFixed(2)}
              icon={<BarChart3 className="w-4 h-4" />}
              colorClass={summary.avgMae < 1 ? 'text-green-500' : summary.avgMae < 2 ? 'text-yellow-500' : 'text-red-500'}
            />
            <SummaryCard
              label="Direction Accuracy"
              value={`${summary.avgDirectionAccuracy.toFixed(1)}%`}
              icon={<Activity className="w-4 h-4" />}
              colorClass={summary.avgDirectionAccuracy > 60 ? 'text-green-500' : summary.avgDirectionAccuracy > 45 ? 'text-yellow-500' : 'text-red-500'}
            />
            <SummaryCard
              label="Recent MAE (7d)"
              value={summary.recentMae.toFixed(2)}
              icon={<BarChart3 className="w-4 h-4" />}
              colorClass={summary.recentMae < 1 ? 'text-green-500' : summary.recentMae < 2 ? 'text-yellow-500' : 'text-red-500'}
            />
            <SummaryCard
              label="Recent Dir. Acc. (7d)"
              value={`${summary.recentDirectionAccuracy.toFixed(1)}%`}
              icon={<Activity className="w-4 h-4" />}
              colorClass={summary.recentDirectionAccuracy > 60 ? 'text-green-500' : summary.recentDirectionAccuracy > 45 ? 'text-yellow-500' : 'text-red-500'}
            />
            <SummaryCard
              label="Avg Confidence"
              value={`${(summary.avgConfidence * 100).toFixed(0)}%`}
              icon={<Sparkles className="w-4 h-4" />}
              colorClass={summary.avgConfidence > 0.6 ? 'text-green-500' : summary.avgConfidence > 0.35 ? 'text-yellow-500' : 'text-red-500'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accuracy by Level + Prediction Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accuracy by Hierarchy Level */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Prediction Accuracy by Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['total', 'dimension', 'subDimension', 'aspect', 'subAspect'].map(level => {
                const data = summary.byLevel[level];
                if (!data) return null;
                const levelLabel = level === 'subDimension' ? 'Sub-dimension'
                  : level === 'subAspect' ? 'Sub-aspect'
                  : level.charAt(0).toUpperCase() + level.slice(1);

                return (
                  <div key={level} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{levelLabel}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>MAE: <span className={cn('font-mono', data.mae < 1 ? 'text-green-600' : data.mae < 2 ? 'text-yellow-600' : 'text-red-600')}>{data.mae}</span></span>
                        <span>Dir: <span className={cn('font-mono', data.directionAccuracy > 60 ? 'text-green-600' : data.directionAccuracy > 45 ? 'text-yellow-600' : 'text-red-600')}>{data.directionAccuracy}%</span></span>
                        <span>({data.count} preds)</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Progress value={Math.min(100, (1 - data.mae / 3) * 100)} className="h-2" />
                        <span className="text-[10px] text-muted-foreground">Score accuracy</span>
                      </div>
                      <div className="flex-1">
                        <Progress value={data.directionAccuracy} className="h-2" />
                        <span className="text-[10px] text-muted-foreground">Direction accuracy</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(summary.byLevel).length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                No fulfilled predictions yet. Generate predictions and wait for actuals to see accuracy.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prediction vs Reality Charts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Prediction vs Reality
              </CardTitle>
              {/* Coin selector */}
              {predictions.length > 0 && (
                <select
                  value={selectedCoinId || ''}
                  onChange={(e) => setSelectedCoinId(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 bg-card"
                >
                  {predictions.map(p => (
                    <option key={p.coinId} value={p.coinId}>{p.coinName}</option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Dimension selector */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['total', ...Object.keys(DIMENSION_META)].map(key => {
                const meta = DIMENSION_META[key];
                const isActive = selectedDimForChart === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedDimForChart(key);
                      if (selectedCoinId) {
                        fetchComparison(selectedCoinId, key);
                      }
                    }}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md border transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    )}
                    style={isActive ? {} : { borderColor: meta?.color + '40' }}
                  >
                    {key === 'total' ? 'Total' : meta?.name || key}
                  </button>
                );
              })}
            </div>

            {/* Chart tabs */}
            <Tabs value={chartTab} onValueChange={setChartTab}>
              <TabsList className="w-full h-8">
                <TabsTrigger value="comparison" className="text-xs flex-1">Line Chart</TabsTrigger>
                <TabsTrigger value="error" className="text-xs flex-1">Error by Dim</TabsTrigger>
                <TabsTrigger value="direction" className="text-xs flex-1">Direction</TabsTrigger>
                <TabsTrigger value="calibration" className="text-xs flex-1">Calibration</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="mt-3">
                <PredictionVsRealityLineChart
                  data={currentComparisons}
                  color={selectedDimForChart === 'total' ? '#3b82f6' : DIMENSION_META[selectedDimForChart]?.color || '#64748b'}
                />
                {selectedCoinId && currentComparisons.length === 0 && (
                  <div className="text-center py-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchComparison(selectedCoinId, selectedDimForChart)}
                      className="gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Load Comparison Chart
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="error" className="mt-3">
                <PredictionErrorBarChart data={dimComparisons} />
              </TabsContent>

              <TabsContent value="direction" className="mt-3">
                <DirectionAccuracyChart data={dimComparisons} />
              </TabsContent>

              <TabsContent value="calibration" className="mt-3">
                <ConfidenceCalibrationChart data={calibration} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Coin-level Predictions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tomorrow&apos;s Predictions by Coin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <div className="space-y-1">
              {predictions.map(pred => (
                <CoinPredictionRow
                  key={pred.coinId}
                  prediction={pred}
                  isExpanded={expandedCoin === pred.coinId}
                  onToggle={() => setExpandedCoin(prev => prev === pred.coinId ? null : pred.coinId)}
                  onFetchComparison={(nodeKey) => fetchComparison(pred.coinId, nodeKey)}
                  comparisonData={comparisons}
                />
              ))}

              {predictions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No predictions available. Click &quot;Regenerate&quot; to create predictions.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SummaryCard({ label, value, icon, colorClass }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorClass?: string;
  color?: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5 text-center">
      <div className={cn('mx-auto mb-1 w-fit', colorClass || 'text-primary')}>
        {icon}
      </div>
      <div className={cn('text-lg font-bold font-mono', colorClass)}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}

// ─── Prediction vs Reality Line Chart ──────────────────────

function PredictionVsRealityLineChart({ data, color }: { data: PredictionComparison[]; color: string }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No comparison data yet</p>
          <p className="text-xs mt-1">Generate predictions and wait for actuals to compare</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: d.date.slice(5), // MM-DD
    predicted: Math.round(d.predicted * 10) / 10,
    actual: Math.round(d.actual * 10) / 10,
    error: Math.round(d.error * 10) / 10,
  }));

  // Calculate stats
  const avgError = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.error, 0) / data.length * 100) / 100
    : 0;
  const dirAcc = data.length > 0
    ? Math.round(data.filter(d => d.directionCorrect).length / data.length * 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* Quick stats */}
      <div className="flex gap-4 text-xs">
        <span className="text-muted-foreground">Avg Error: <span className={cn('font-mono font-medium', avgError < 0.5 ? 'text-green-600' : avgError < 1.5 ? 'text-yellow-600' : 'text-red-600')}>{avgError}</span></span>
        <span className="text-muted-foreground">Direction: <span className={cn('font-mono font-medium', dirAcc > 60 ? 'text-green-600' : dirAcc > 45 ? 'text-yellow-600' : 'text-red-600')}>{dirAcc}%</span></span>
        <span className="text-muted-foreground">Points: <span className="font-mono">{data.length}</span></span>
      </div>

      {/* Main line chart */}
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`predGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="actualGradLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['auto', 'auto']} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="predicted"
            stroke={color}
            fill={`url(#predGrad-${color.replace('#', '')})`}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Predicted"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#22c55e"
            fill="url(#actualGradLine)"
            strokeWidth={2}
            name="Actual"
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Error bars */}
      {data.length > 1 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="error" radius={[2, 2, 0, 0]} name="Error">
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.error < 0.3 ? '#22c55e' : entry.error < 1 ? '#f59e0b' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Prediction Error by Dimension Bar Chart ──────────────

function PredictionErrorBarChart({ data }: { data: DimensionComparison[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No dimension error data yet</p>
        </div>
      </div>
    );
  }

  const chartData = data
    .filter(d => d.nodeKey !== 'total')
    .map(d => ({
      name: d.label.length > 12 ? d.label.substring(0, 12) + '…' : d.label,
      fullName: d.label,
      mae: d.mae,
      rmse: d.rmse,
      color: DIMENSION_META[d.nodeKey]?.color || '#64748b',
    }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} stroke="hsl(var(--muted-foreground))" />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              value.toFixed(2),
              name === 'mae' ? 'MAE' : 'RMSE',
            ]}
            labelFormatter={(label: string, payload: Array<{ payload?: { fullName?: string } }>) => {
              const item = payload?.[0]?.payload;
              return item?.fullName || label;
            }}
          />
          <Bar dataKey="mae" name="MAE" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
          <Bar dataKey="rmse" name="RMSE" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.4} />
            ))}
          </Bar>
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Direction Accuracy Chart ─────────────────────────────

function DirectionAccuracyChart({ data }: { data: DimensionComparison[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <Gauge className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No direction data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map(dim => {
        const color = DIMENSION_META[dim.nodeKey]?.color || '#64748b';
        const isGood = dim.directionAccuracy > 60;
        const isOk = dim.directionAccuracy > 45;

        return (
          <div key={dim.nodeKey} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{dim.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-mono font-bold',
                    isGood ? 'text-green-600' : isOk ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {dim.directionAccuracy.toFixed(0)}%
                  </span>
                  {dim.directionAccuracy > 60 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : dim.directionAccuracy < 45 ? (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </div>
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${dim.directionAccuracy}%`,
                    backgroundColor: isGood ? '#22c55e' : isOk ? '#f59e0b' : '#ef4444',
                  }}
                />
                {/* 50% reference line */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/30" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">n={dim.count}</span>
          </div>
        );
      })}

      {/* Overall direction accuracy summary */}
      {data.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Overall Direction Accuracy</span>
            <span className={cn(
              'text-sm font-mono font-bold',
              data.reduce((s, d) => s + d.directionAccuracy, 0) / data.length > 60 ? 'text-green-600' : 'text-yellow-600'
            )}>
              {(data.reduce((s, d) => s + d.directionAccuracy, 0) / data.length).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {data.filter(d => d.directionAccuracy > 60).length}/{data.length} dimensions above 60%
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confidence Calibration Chart ─────────────────────────

function ConfidenceCalibrationChart({ data }: { data: ConfidenceCalibration[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No calibration data yet</p>
          <p className="text-xs mt-1">Need fulfilled predictions with varying confidence levels</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    bucket: d.bucket,
    avgConfidence: Math.round(d.avgConfidence * 100),
    avgError: d.avgError,
    directionAccuracy: d.directionAccuracy,
    count: d.count,
  }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'avgError') return [value.toFixed(2), 'Avg Error'];
              if (name === 'directionAccuracy') return [`${value.toFixed(1)}%`, 'Dir. Accuracy'];
              return [value, name];
            }}
          />
          <Bar yAxisId="left" dataKey="avgError" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Error" />
          <Line yAxisId="right" type="monotone" dataKey="directionAccuracy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Dir. Accuracy" />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Calibration interpretation */}
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span>Well-calibrated: higher confidence → lower error</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-yellow-500" />
          <span>Poorly-calibrated: confidence doesn&apos;t predict accuracy</span>
        </div>
        {data.length > 0 && (
          <div className="mt-1 pt-1 border-t">
            {data[0].avgError < 0.5
              ? '✓ Model predictions are quite accurate'
              : data[0].avgError < 1.5
              ? '~ Model predictions have moderate accuracy'
              : '⚠ Model predictions need improvement'
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Coin Prediction Row ──────────────────────────────────

function CoinPredictionRow({
  prediction,
  isExpanded,
  onToggle,
  onFetchComparison,
  comparisonData,
}: {
  prediction: CoinPrediction;
  isExpanded: boolean;
  onToggle: () => void;
  onFetchComparison: (nodeKey: string) => void;
  comparisonData: Record<string, PredictionComparison[]>;
}) {
  const total = prediction.totalPrediction;
  const dirIcon = getDirectionIcon(total.predictedDirection);
  const confColor = getConfidenceColor(total.confidence);

  return (
    <div className="border rounded-lg">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <div className="flex-1 text-left">
          <span className="font-medium text-sm">{prediction.coinName}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Predicted Score */}
          <div className="text-right">
            <div className="text-sm font-mono font-bold">
              {total.predictedScore.toFixed(1)}
            </div>
            <div className="text-[10px] text-muted-foreground">Predicted</div>
          </div>
          {/* Change */}
          <div className={cn('text-sm font-mono flex items-center gap-1', total.predictedChange > 0 ? 'text-green-600' : total.predictedChange < 0 ? 'text-red-600' : 'text-muted-foreground')}>
            {dirIcon}
            {total.predictedChange > 0 ? '+' : ''}{total.predictedChange.toFixed(1)}
          </div>
          {/* Confidence */}
          <div className="text-right">
            <div className={cn('text-sm font-mono font-medium', confColor)}>
              {(total.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-[10px] text-muted-foreground">Confidence</div>
          </div>
        </div>
      </button>

      {/* Expanded: Dimension Predictions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <Separator />
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dimension Predictions for Tomorrow
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {prediction.dimensionPredictions.map(dim => {
                  const meta = DIMENSION_META[dim.nodeKey];
                  return (
                    <button
                      key={dim.nodeKey}
                      onClick={() => onFetchComparison(dim.nodeKey)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md border hover:bg-muted/50 transition-colors text-left"
                      style={{ borderColor: (meta?.color || '#64748b') + '40' }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta?.color || '#64748b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{meta?.name || dim.nodeKey}</div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono">{dim.predictedScore.toFixed(1)}</span>
                          {getDirectionIcon(dim.predictedDirection)}
                        </div>
                      </div>
                      <div className={cn('text-[10px] font-mono', getConfidenceColor(dim.confidence))}>
                        {(dim.confidence * 100).toFixed(0)}%
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mini comparison chart for total */}
              {comparisonData[`${prediction.coinId}.total`] && comparisonData[`${prediction.coinId}.total`].length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Total Score: Prediction vs Reality</div>
                  <PredictionVsRealityLineChart
                    data={comparisonData[`${prediction.coinId}.total`]}
                    color="#3b82f6"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
