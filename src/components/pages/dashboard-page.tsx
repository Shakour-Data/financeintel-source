'use client';

import { useState, useEffect, useCallback, Component, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Brain,
  Activity,
  BarChart3,
  Newspaper,
  BrainCircuit,
  List,
  Eye,
  Crosshair,
  Globe,
} from 'lucide-react';
import { MarketHeader } from '@/components/market-header';
import { CryptoTable } from '@/components/crypto-table';
import { CryptoDetailPanel } from '@/components/crypto-detail-panel';
import { CoefficientDashboard } from '@/components/coefficient-dashboard';
import { MarketIndicatorsDashboard } from '@/components/market-indicators-dashboard';
import { NewsPanel } from '@/components/news-panel';
import { BehavioralFinancePanel } from '@/components/behavioral-finance-panel';
import { MacroDashboard } from '@/components/macro-dashboard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { Dimension } from '@/lib/scoring-engine';

// ═══════════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════

interface ErrorBoundaryState { hasError: boolean; error: string; }

class TabErrorBoundary extends Component<
  { children: ReactNode; name: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || 'Unknown error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <p className="text-sm text-destructive font-semibold">Failed to load {this.props.name}</p>
          <p className="text-xs text-muted-foreground max-w-md text-center leading-relaxed">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA TYPES
// ═══════════════════════════════════════════════════════════════════

interface CoinData {
  id: string; symbol: string; name: string; image: string;
  current_price: number; market_cap: number; market_cap_rank: number;
  total_volume: number; price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_1h_in_currency?: number;
  high_24h: number; low_24h: number; ath: number; ath_change_percentage: number;
  circulating_supply: number; total_supply: number | null; max_supply: number | null;
  sparkline_in_7d?: { price: number[] };
  aiScore: number; previousAiScore: number; aiScoreChange: number;
  aiScoreChangePct: number; confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface MarketMeta {
  fromCache: boolean; isStale: boolean; totalCoins: number; lastUpdated: string;
  coefficientVersion?: number;
  hierarchyStats?: { dimensions: number; subDimensions: number; aspects: number; subAspects: number; totalCoefficients: number; };
}

interface MarketResponse {
  coins: CoinData[];
  globalData: {
    active_cryptocurrencies?: number;
    total_market_cap?: Record<string, number>;
    total_volume?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
  } | null;
  meta: MarketMeta;
}

// ═══════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const TABS = [
  { value: 'scores', label: 'Scores', icon: List },
  { value: 'macro', label: 'Macro', icon: Globe },
  { value: 'coefficients', label: 'Coefficients', icon: Crosshair },
  { value: 'intelligence', label: 'Intelligence', icon: BarChart3 },
  { value: 'news', label: 'News', icon: Newspaper },
  { value: 'behavioral', label: 'Behavioral', icon: BrainCircuit },
] as const;

type TabValue = (typeof TABS)[number]['value'];

const TAB_TRIGGER_CLASS =
  'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 h-9 gap-1.5 text-xs font-medium text-muted-foreground data-[state=active]:text-foreground transition-colors';

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('scores');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch('/api/market/overview', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as Record<string, string>).error || `Server error (HTTP ${res.status})`);
      }
      const json: MarketResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out after 60 seconds. Please try again shortly.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!data) return;
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData, data]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCoin) setSelectedCoin(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCoin]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <Loader2 className="w-5 h-5 text-primary absolute -bottom-1 -right-1 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Loading Market Intelligence</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Fetching live data &amp; computing AI scores across 12 dimensions…
          </p>
        </div>
        <div className="w-64 space-y-2">
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-4/5 rounded-full" />
          <Skeleton className="h-3 w-3/5 rounded-full" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-lg font-semibold">Failed to Load Dashboard</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Market Stats Bar (sticky) ── */}
      <header className="shrink-0 border-b bg-card/50 backdrop-blur-sm sticky top-16 z-20">
        <div className="max-w-[1440px] mx-auto px-4 py-2">
          <MarketHeader
            globalData={data?.globalData ?? null}
            meta={data?.meta ?? { fromCache: false, isStale: false, totalCoins: 0, lastUpdated: '' }}
            onRefresh={fetchData}
            isLoading={loading}
          />
          {error && data && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 rounded border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2"
            >
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error} — showing cached data</span>
            </motion.div>
          )}
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <nav className="shrink-0 border-b bg-background">
        <div className="max-w-[1440px] mx-auto px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="h-9 bg-transparent p-0 gap-0 rounded-none border-b-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER_CLASS}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* ── Tab Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 py-4 h-full overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
            >
              {activeTab === 'scores' && data && (
                <TabErrorBoundary name="Crypto Scores">
                  <CryptoTable coins={data.coins} onSelectCoin={setSelectedCoin} selectedCoinId={selectedCoin?.id ?? null} />
                </TabErrorBoundary>
              )}

              {activeTab === 'macro' && (
                <TabErrorBoundary name="Macroeconomic Data">
                  <MacroDashboard />
                </TabErrorBoundary>
              )}

              {activeTab === 'coefficients' && (
                <TabErrorBoundary name="Coefficient Analysis">
                  <CoefficientDashboard />
                </TabErrorBoundary>
              )}

              {activeTab === 'intelligence' && (
                <TabErrorBoundary name="Market Intelligence">
                  <MarketIndicatorsDashboard coins={data?.coins} />
                </TabErrorBoundary>
              )}

              {activeTab === 'news' && (
                <TabErrorBoundary name="News & Sentiment">
                  <NewsPanel />
                </TabErrorBoundary>
              )}

              {activeTab === 'behavioral' && (
                <TabErrorBoundary name="Behavioral Finance">
                  <BehavioralFinancePanel />
                </TabErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Sticky Footer ── */}
      <footer className="mt-auto shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground/50">
          <span>Crypto AI Scoring Dashboard — {data?.meta.totalCoins ?? 0} coins tracked</span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> Powered by 12-dimension ML engine
          </span>
        </div>
      </footer>

      {/* ── Coin Detail Overlay ── */}
      <AnimatePresence>
        {selectedCoin && (
          <CryptoDetailPanel coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
