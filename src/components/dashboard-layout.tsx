'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSiteRouter, type DashboardTab } from '@/lib/site-router';
import dynamic from 'next/dynamic';

// Lightweight imports
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardTopBar } from '@/components/dashboard-topbar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PageTransition } from '@/components/page-transition';
import { useAlertEngine } from '@/hooks/use-alert-engine';
import { useAlerts } from '@/lib/user-data';
import { DEFAULT_FILTERS, type FilterState } from '@/components/filter-bar';
import { applyExternalFilters } from '@/lib/coin-filters';
import { STOCK_COUNTRIES } from '@/lib/stock-data-engine';
import type { Dimension } from '@/lib/scoring-engine-v2';

// Lazy load ALL heavy components - one at a time
const MarketHeader = dynamic(() => import('@/components/market-header').then(m => ({ default: m.MarketHeader })), { ssr: false });
const CryptoTable = dynamic(() => import('@/components/crypto-table').then(m => ({ default: m.CryptoTable })), { ssr: false });
const StockTable = dynamic(() => import('@/components/stock-table').then(m => ({ default: m.StockTable })), { ssr: false });
const CountrySelector = dynamic(() => import('@/components/country-selector').then(m => ({ default: m.CountrySelector })), { ssr: false });
const CryptoDetailPanel = dynamic(() => import('@/components/crypto-detail-panel').then(m => ({ default: m.CryptoDetailPanel })), { ssr: false });
const MarketHeatmap = dynamic(() => import('@/components/market-heatmap').then(m => ({ default: m.MarketHeatmap })), { ssr: false });
const FilterBar = dynamic(() => import('@/components/filter-bar').then(m => ({ default: m.FilterBar })), { ssr: false });
const ExportMenu = dynamic(() => import('@/components/export-menu').then(m => ({ default: m.ExportMenu })), { ssr: false });
const SmartSearch = dynamic(() => import('@/components/smart-search').then(m => ({ default: m.SmartSearch })), { ssr: false });

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

interface StockData {
  symbol: string; name: string; country: string; sector: string;
  price: number; change: number; changePct: number; marketCap: number;
  aiScore: number; confidence?: 'high' | 'medium' | 'low';
  profitabilityScore?: number; valuationScore?: number; growthScore?: number;
  financialHealthScore?: number; dividendScore?: number; technicalScore?: number;
  momentumScore?: number; analystScore?: number; institutionalScore?: number;
  marketSentimentScore?: number; sectorRotationScore?: number; macroScore?: number;
}

interface MarketResponse {
  coins: CoinData[];
  globalData: { active_cryptocurrencies?: number; total_market_cap?: Record<string, number>; total_volume?: Record<string, number>; market_cap_change_percentage_24h_usd?: number; } | null;
  meta: { fromCache: boolean; isStale: boolean; totalCoins: number; lastUpdated: string; coefficientVersion?: number; hierarchyStats?: { dimensions: number; subDimensions: number; aspects: number; subAspects: number; totalCoefficients: number; }; };
}

interface StockResponse {
  stocks: StockData[];
  meta: { totalStocks: number; lastUpdated: string; scoringDimensions: number; defaultCountry: string; };
}

// Tab content components - lazy loaded
function TabContent({ tab, coins, filters, setFilters, setSelectedCoin, filteredCoinsCount }: {
  tab: DashboardTab; coins: CoinData[]; filters: FilterState; setFilters: (f: FilterState) => void;
  setSelectedCoin: (c: CoinData | null) => void; filteredCoinsCount: number;
}) {
  switch (tab) {
    case 'overview':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-xs text-muted-foreground mb-1">Market AI Score</div>
              <div className="text-2xl font-bold">{coins.length > 0 ? Math.round(coins.reduce((s, c) => s + c.aiScore, 0) / coins.length) : '—'}</div>
            </div>
            <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground mb-1">Coins Tracked</div><div className="text-2xl font-bold">{coins.length}</div></div>
            <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground mb-1">Bullish</div><div className="text-2xl font-bold text-emerald-600">{coins.filter(c => c.aiScore >= 6.5).length}</div></div>
            <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground mb-1">Bearish</div><div className="text-2xl font-bold text-red-500">{coins.filter(c => c.aiScore < 3.5).length}</div></div>
          </div>
          <MarketHeatmap coins={coins} onSelectCoin={setSelectedCoin} />
          <FilterBar filters={filters} onChange={setFilters} coinsCount={coins.length} filteredCount={filteredCoinsCount} />
          <CryptoTable coins={coins} onSelectCoin={setSelectedCoin} selectedCoinId={null} externalFilters={filters} />
        </div>
      );
    case 'watchlist': return <WatchlistTab coins={coins} onSelectCoin={setSelectedCoin} />;
    case 'portfolio': return <PortfolioTab coins={coins} />;
    case 'alerts': return <AlertsTab coins={coins} />;
    case 'compare': return <CompareTab coins={coins} onSelectCoin={setSelectedCoin} />;
    default: return <PlaceholderTab tab={tab} />;
  }
}

// Lightweight placeholder for tabs that need heavy components
function PlaceholderTab({ tab }: { tab: DashboardTab }) {
  const labels: Record<string, string> = {
    'ai-scoring': '12-Dimension ML Scoring',
    'custom-weights': 'Custom Dimension Weights',
    'predictions': 'ML Prediction Engine',
    'news-sentiment': 'News & Sentiment Analysis',
    'behavioral-finance': 'Behavioral Finance Analysis',
    'references': 'References & Methodology',
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-xl font-semibold">{labels[tab] || tab}</div>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        This tab requires additional components to be loaded. Click the tab again to load, or navigate to Overview for the full market data.
      </p>
    </div>
  );
}

// Simple tab wrappers using dynamic imports
const WatchlistPanel = dynamic(() => import('@/components/watchlist-panel').then(m => ({ default: m.WatchlistPanel })), { ssr: false });
const PortfolioPanel = dynamic(() => import('@/components/portfolio-panel').then(m => ({ default: m.PortfolioPanel })), { ssr: false });
const AlertsPanel = dynamic(() => import('@/components/alerts-panel').then(m => ({ default: m.AlertsPanel })), { ssr: false });
const ComparePanel = dynamic(() => import('@/components/compare-panel').then(m => ({ default: m.ComparePanel })), { ssr: false });

function WatchlistTab({ coins, onSelectCoin }: { coins: CoinData[]; onSelectCoin: (c: CoinData | null) => void }) {
  return <WatchlistPanel coins={coins} onSelectCoin={onSelectCoin} selectedCoinId={null} />;
}
function PortfolioTab({ coins }: { coins: CoinData[] }) {
  return <PortfolioPanel coins={coins} />;
}
function AlertsTab({ coins }: { coins: CoinData[] }) {
  return <AlertsPanel coins={coins} />;
}
function CompareTab({ coins, onSelectCoin }: { coins: CoinData[]; onSelectCoin: (c: CoinData | null) => void }) {
  return <ComparePanel coins={coins} onSelectCoin={onSelectCoin} />;
}

export function DashboardLayout() {
  const { dashboardTab, navigateToTab, tabDirection, dashboardMode, setDashboardMode, selectedCountry, setSelectedCountry } = useSiteRouter();
  const [data, setData] = useState<MarketResponse | null>(null);
  const [stockData, setStockData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const activeAlertCount = useAlerts((s) => s.alerts.filter(a => a.active && !a.triggered).length);
  useAlertEngine(data?.coins ?? []);

  const filteredCoinsCount = data?.coins ? applyExternalFilters(data.coins, filters).length : 0;

  const fetchCryptoData = useCallback(async () => {
    setLoading(true); setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch('/api/market/overview', { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `Server error (HTTP ${res.status})`); }
      const json: MarketResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') setError('Request timed out.');
      else if (err instanceof Error) setError(err.message);
      else setError('An unexpected error occurred');
    } finally { setLoading(false); }
  }, []);

  const fetchStockData = useCallback(async (country: string) => {
    setLoading(true); setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`/api/stocks/overview?country=${country}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `Server error (HTTP ${res.status})`); }
      const json: StockResponse = await res.json();
      setStockData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') setError('Request timed out.');
      else if (err instanceof Error) setError(err.message);
      else setError('An unexpected error occurred');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (dashboardMode === 'crypto') { fetchCryptoData(); const interval = setInterval(fetchCryptoData, activeAlertCount > 0 ? 60_000 : 10 * 60_000); return () => clearInterval(interval); }
    else { fetchStockData(selectedCountry); const interval = setInterval(() => fetchStockData(selectedCountry), 5 * 60_000); return () => clearInterval(interval); }
  }, [dashboardMode, selectedCountry, activeAlertCount, fetchCryptoData, fetchStockData]);

  const currentCountryInfo = STOCK_COUNTRIES.find(c => c.code === selectedCountry);

  if (loading && !data && !stockData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading market data...</p>
      </div>
    );
  }

  if (error && !data && !stockData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <span className="font-medium">Failed to load market data</span>
        <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
        <button onClick={dashboardMode === 'crypto' ? fetchCryptoData : () => fetchStockData(selectedCountry)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar activeTab={dashboardTab} onTabChange={navigateToTab} />
      <SidebarInset>
        <DashboardTopBar activeTab={dashboardTab} globalData={data?.globalData ?? null} meta={data?.meta ?? { fromCache: false, isStale: false, totalCoins: 0, lastUpdated: '' }} onRefresh={dashboardMode === 'crypto' ? fetchCryptoData : () => fetchStockData(selectedCountry)} isLoading={loading} />

        <div className="border-b bg-card/30">
          <div className="px-4 md:px-6 py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              {dashboardMode === 'crypto' ? (
                <MarketHeader globalData={data?.globalData ?? null} meta={data?.meta ?? { fromCache: false, isStale: false, totalCoins: 0, lastUpdated: '' }} onRefresh={fetchCryptoData} isLoading={loading} />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{currentCountryInfo?.flag} {currentCountryInfo?.name} Stock Market</h2>
                    <CountrySelector />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Total Stocks</div><div className="text-xl font-bold">{stockData?.meta.totalStocks ?? '—'}</div></div>
                    <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Avg AI Score</div><div className="text-xl font-bold">{stockData?.stocks.length ? (stockData.stocks.reduce((s, st) => s + st.aiScore, 0) / stockData.stocks.length).toFixed(1) : '—'}</div></div>
                    <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Bullish</div><div className="text-xl font-bold text-emerald-600">{stockData?.stocks.filter(s => s.aiScore >= 6.5).length ?? '—'}</div></div>
                    <div className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">Bearish</div><div className="text-xl font-bold text-red-500">{stockData?.stocks.filter(s => s.aiScore < 3.5).length ?? '—'}</div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button onClick={() => setDashboardMode('crypto')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dashboardMode === 'crypto' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>🪙 Crypto</button>
              <button onClick={() => setDashboardMode('stocks')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dashboardMode === 'stocks' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>📈 Stocks</button>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 md:px-6 py-6 pb-20 md:pb-6">
          {dashboardMode === 'stocks' && stockData && (
            <div className="space-y-6">
              {dashboardTab === 'overview' && <StockTable stocks={stockData.stocks} onSelectStock={setSelectedStock} selectedCountry={selectedCountry} />}
            </div>
          )}

          {dashboardMode === 'crypto' && data && (
            <>
              <TabContent tab={dashboardTab} coins={data.coins} filters={filters} setFilters={setFilters} setSelectedCoin={setSelectedCoin} filteredCoinsCount={filteredCoinsCount} />
            </>
          )}

          <MobileBottomNav activeTab={dashboardTab} onTabChange={navigateToTab} />
          {dashboardMode === 'crypto' && selectedCoin && <CryptoDetailPanel coin={selectedCoin} onClose={() => setSelectedCoin(null)} />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
