'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SiteRouterProvider, useSiteRouter, PAGE_META, type DashboardTab } from '@/lib/site-router';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardTopBar } from '@/components/dashboard-topbar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PageTransition, SitePageTransition } from '@/components/page-transition';
import { BackButton } from '@/components/back-button';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── Dynamic imports for heavy components ───────────────────────
const LandingPage = dynamic(() => import('@/components/pages/landing-page').then(m => ({ default: m.LandingPage })), { ssr: false });
const PricingPage = dynamic(() => import('@/components/pages/pricing-page').then(m => ({ default: m.PricingPage })), { ssr: false });
const AboutPage = dynamic(() => import('@/components/pages/about-page').then(m => ({ default: m.AboutPage })), { ssr: false });
const DocsPage = dynamic(() => import('@/components/pages/docs-page').then(m => ({ default: m.DocsPage })), { ssr: false });
const BlogPage = dynamic(() => import('@/components/pages/blog-page').then(m => ({ default: m.BlogPage })), { ssr: false });
const ContactPage = dynamic(() => import('@/components/pages/contact-page').then(m => ({ default: m.ContactPage })), { ssr: false });
const FAQPage = dynamic(() => import('@/components/pages/faq-page').then(m => ({ default: m.FAQPage })), { ssr: false });
const TermsPage = dynamic(() => import('@/components/pages/terms-page').then(m => ({ default: m.TermsPage })), { ssr: false });
const PrivacyPage = dynamic(() => import('@/components/pages/privacy-page').then(m => ({ default: m.PrivacyPage })), { ssr: false });

const MarketHeader = dynamic(() => import('@/components/market-header').then(m => ({ default: m.MarketHeader })), { ssr: false });
const CryptoTable = dynamic(() => import('@/components/crypto-table').then(m => ({ default: m.CryptoTable })), { ssr: false });
const StockTable = dynamic(() => import('@/components/stock-table').then(m => ({ default: m.StockTable })), { ssr: false });
const CountrySelector = dynamic(() => import('@/components/country-selector').then(m => ({ default: m.CountrySelector })), { ssr: false });
const WatchlistPanel = dynamic(() => import('@/components/watchlist-panel').then(m => ({ default: m.WatchlistPanel })), { ssr: false });
const CryptoDetailPanel = dynamic(() => import('@/components/crypto-detail-panel').then(m => ({ default: m.CryptoDetailPanel })), { ssr: false });
const MarketIndicatorsDashboard = dynamic(() => import('@/components/market-indicators-dashboard').then(m => ({ default: m.MarketIndicatorsDashboard })), { ssr: false });
const NewsPanel = dynamic(() => import('@/components/news-panel').then(m => ({ default: m.NewsPanel })), { ssr: false });
const BehavioralFinancePanel = dynamic(() => import('@/components/behavioral-finance-panel').then(m => ({ default: m.BehavioralFinancePanel })), { ssr: false });
const PredictionPanel = dynamic(() => import('@/components/prediction-panel').then(m => ({ default: m.PredictionPanel })), { ssr: false });
const ReferencesPanel = dynamic(() => import('@/components/references-panel').then(m => ({ default: m.ReferencesPanel })), { ssr: false });
const ComparePanel = dynamic(() => import('@/components/compare-panel').then(m => ({ default: m.ComparePanel })), { ssr: false });
const PortfolioPanel = dynamic(() => import('@/components/portfolio-panel').then(m => ({ default: m.PortfolioPanel })), { ssr: false });
const AlertsPanel = dynamic(() => import('@/components/alerts-panel').then(m => ({ default: m.AlertsPanel })), { ssr: false });
const MarketHeatmap = dynamic(() => import('@/components/market-heatmap').then(m => ({ default: m.MarketHeatmap })), { ssr: false });
const FilterBar = dynamic(() => import('@/components/filter-bar').then(m => ({ default: m.FilterBar })), { ssr: false });
const SmartSearch = dynamic(() => import('@/components/smart-search').then(m => ({ default: m.SmartSearch })), { ssr: false });
const CustomWeightsPanel = dynamic(() => import('@/components/custom-weights-panel').then(m => ({ default: m.CustomWeightsPanel })), { ssr: false });
const ExportMenu = dynamic(() => import('@/components/export-menu').then(m => ({ default: m.ExportMenu })), { ssr: false });

// Hierarchy Analysis Pages (NEW)
const HierarchyAnalysisPage = dynamic(() => import('@/components/pages/hierarchy-analysis-page').then(m => ({ default: m.HierarchyAnalysisPage })), { ssr: false });
const TradingViewHierarchyPage = dynamic(() => import('@/components/pages/tradingview-hierarchy-page').then(m => ({ default: m.TradingViewHierarchyPage })), { ssr: false });

// Lightweight import (not dynamic) — hook has no UI
import { useAlertEngine } from '@/hooks/use-alert-engine';
import { useAlerts } from '@/lib/user-data';
import { DEFAULT_FILTERS, type FilterState } from '@/components/filter-bar';
import { applyExternalFilters } from '@/lib/coin-filters';
import { STOCK_COUNTRIES } from '@/lib/stock-data-engine';

// ─── Coin Data Interface ────────────────────────────────────────

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
  sparkline_in_7d?: { price: number[] };
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

// ─── Stock Data Interface ────────────────────────────────────────

interface StockData {
  symbol: string;
  name: string;
  country: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  aiScore: number;
  confidence: 'high' | 'medium' | 'low';
  profitabilityScore: number;
  valuationScore: number;
  growthScore: number;
  financialHealthScore: number;
  dividendScore: number;
  technicalScore: number;
  momentumScore: number;
  analystScore: number;
  institutionalScore: number;
  marketSentimentScore: number;
  sectorRotationScore: number;
  macroScore: number;
}

interface MarketResponse {
  coins: CoinData[];
  globalData: {
    active_cryptocurrencies?: number;
    total_market_cap?: Record<string, number>;
    total_volume?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
  } | null;
  meta: {
    fromCache: boolean;
    isStale: boolean;
    totalCoins: number;
    lastUpdated: string;
    coefficientVersion?: number;
    hierarchyStats?: {
      dimensions: number;
      subDimensions: number;
      aspects: number;
      subAspects: number;
      totalCoefficients: number;
    };
  };
}

interface StockResponse {
  stocks: StockData[];
  meta: {
    totalStocks: number;
    lastUpdated: string;
    scoringDimensions: number;
    defaultCountry: string;
  };
}

// ─── Dashboard Layout Component ─────────────────────────────────

function DashboardLayout() {
  const { dashboardTab, navigateToTab, tabDirection, dashboardMode, setDashboardMode, selectedCountry, setSelectedCountry } = useSiteRouter();
  const [data, setData] = useState<MarketResponse | null>(null);
  const [stockData, setStockData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Active alerts drive faster polling (60s) so alerts fire promptly.
  const activeAlertCount = useAlerts((s) => s.alerts.filter(a => a.active && !a.triggered).length);

  // Fire alert notifications whenever coin prices update
  useAlertEngine(data?.coins ?? []);

  // Compute filtered coin count for the FilterBar display
  const filteredCoinsCount = data?.coins
    ? applyExternalFilters(data.coins, filters).length
    : 0;

  const handleSearchCategory = useCallback((catKey: string) => {
    setFilters(prev => {
      const newCats = prev.categories.includes(catKey)
        ? prev.categories
        : [...prev.categories, catKey];
      return { ...prev, categories: newCats };
    });
  }, []);

  const handleSearchDimension = useCallback((_dimKey: string) => {
    navigateToTab('ai-scoring');
  }, [navigateToTab]);

  // ─── Crypto Data Fetch ─────────────────────────────────────────
  const fetchCryptoData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch('/api/market/overview', { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (HTTP ${res.status})`);
      }

      const json: MarketResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The API may be rate-limited — please try again shortly.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Stock Data Fetch ─────────────────────────────────────────
  const fetchStockData = useCallback(async (country: string) => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`/api/stocks/overview?country=${country}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (HTTP ${res.status})`);
      }

      const json: StockResponse = await res.json();
      setStockData(json);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Initial Fetch & Auto-refresh ──────────────────────────────
  useEffect(() => {
    if (dashboardMode === 'crypto') {
      fetchCryptoData();
      const interval = setInterval(fetchCryptoData, activeAlertCount > 0 ? 60_000 : 10 * 60_000);
      return () => clearInterval(interval);
    } else {
      fetchStockData(selectedCountry);
      const interval = setInterval(() => fetchStockData(selectedCountry), 5 * 60_000);
      return () => clearInterval(interval);
    }
  }, [dashboardMode, selectedCountry, activeAlertCount, fetchCryptoData, fetchStockData]);

  // Refetch when country changes in stocks mode
  useEffect(() => {
    if (dashboardMode === 'stocks') {
      fetchStockData(selectedCountry);
    }
  }, [selectedCountry, dashboardMode, fetchStockData]);

  // ─── Stock Country Info ─────────────────────────────────────────
  const currentCountryInfo = STOCK_COUNTRIES.find(c => c.code === selectedCountry);

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar activeTab={dashboardTab} onTabChange={navigateToTab} />

      <SidebarInset>
        {/* ── Top Bar: trigger + breadcrumb ── */}
        <DashboardTopBar
          activeTab={dashboardTab}
          globalData={data?.globalData ?? null}
          meta={data?.meta ?? { fromCache: false, isStale: false, totalCoins: 0, lastUpdated: '' }}
          onRefresh={dashboardMode === 'crypto' ? fetchCryptoData : () => fetchStockData(selectedCountry)}
          isLoading={loading}
        />

        {/* ── Market Header + Mode Toggle ── */}
        <div className="border-b bg-card/30">
          <div className="px-4 md:px-6 py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              {dashboardMode === 'crypto' ? (
                <MarketHeader
                  globalData={data?.globalData ?? null}
                  meta={data?.meta ?? { fromCache: false, isStale: false, totalCoins: 0, lastUpdated: '' }}
                  onRefresh={fetchCryptoData}
                  isLoading={loading}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{currentCountryInfo?.flag} {currentCountryInfo?.name} Stock Market</h2>
                    <CountrySelector />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Total Stocks</div>
                      <div className="text-xl font-bold">{stockData?.meta.totalStocks ?? '—'}</div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Avg AI Score</div>
                      <div className="text-xl font-bold">
                        {stockData?.stocks.length
                          ? (stockData.stocks.reduce((s, st) => s + st.aiScore, 0) / stockData.stocks.length).toFixed(1)
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Bullish Stocks</div>
                      <div className="text-xl font-bold text-emerald-600">
                        {stockData?.stocks.filter(s => s.aiScore >= 6.5).length ?? '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-card p-3">
                      <div className="text-xs text-muted-foreground">Bearish Stocks</div>
                      <div className="text-xl font-bold text-red-500">
                        {stockData?.stocks.filter(s => s.aiScore < 3.5).length ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {dashboardMode === 'crypto' && data && (
                <SmartSearch
                  coins={data.coins}
                  onSelectCoin={(coin) => setSelectedCoin(coin)}
                  onFilterCategory={handleSearchCategory}
                  onFilterDimension={handleSearchDimension}
                />
            )}
            {/* Mode Toggle */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => setDashboardMode('crypto')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dashboardMode === 'crypto' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              >
                🪙 Crypto
              </button>
              <button
                onClick={() => setDashboardMode('stocks')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dashboardMode === 'stocks' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/25' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              >
                📈 Stocks
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Content with transitions ── */}
        <div className="flex-1 px-4 md:px-6 py-6 pb-20 md:pb-6">
          {loading && !data && !stockData && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading market data and computing AI scores...</p>
              <p className="text-muted-foreground text-xs">
                {dashboardMode === 'crypto'
                  ? '12 dimensions • 40 sub-dimensions • 80 aspects • 173 sub-aspects'
                  : '12 dimensions • 24 sub-dimensions • 44 aspects • 59 sub-aspects'}
              </p>
            </div>
          )}

          {error && !data && !stockData && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-6 h-6" />
                <span className="font-medium">Failed to load market data</span>
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
              <button
                onClick={dashboardMode === 'crypto' ? fetchCryptoData : () => fetchStockData(selectedCountry)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* ─── STOCKS MODE CONTENT ─── */}
          {dashboardMode === 'stocks' && stockData && (
            <div className="space-y-6">
              {/* Stock Overview */}
              {dashboardTab === 'overview' && (
                <div className="space-y-4">
                  <StockTable
                    stocks={stockData.stocks}
                    onSelectStock={(stock) => setSelectedStock(stock)}
                    selectedCountry={selectedCountry}
                  />
                </div>
              )}

              {/* Stock Detail Panel */}
              {selectedStock && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedStock(null)}>
                  <div className="bg-background rounded-xl border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold">{selectedStock.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{selectedStock.name} • {selectedStock.sector}</p>
                        </div>
                        <button onClick={() => setSelectedStock(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                      </div>

                      {/* Score + Price Header */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="rounded-lg border p-4">
                          <div className="text-xs text-muted-foreground mb-1">AI Score</div>
                          <div className="text-3xl font-bold">{selectedStock.aiScore.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Confidence: {selectedStock.confidence}</div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-xs text-muted-foreground mb-1">Price</div>
                          <div className="text-2xl font-bold">${selectedStock.price.toLocaleString()}</div>
                          <div className={`text-sm ${selectedStock.changePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {selectedStock.changePct >= 0 ? '+' : ''}{selectedStock.changePct.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {/* 12 Dimension Scores */}
                      <h4 className="text-sm font-semibold mb-3">12-Dimension Score Breakdown</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Profitability', key: 'profitabilityScore', color: '#10b981' },
                          { label: 'Valuation', key: 'valuationScore', color: '#f59e0b' },
                          { label: 'Growth', key: 'growthScore', color: '#22c55e' },
                          { label: 'Financial Health', key: 'financialHealthScore', color: '#3b82f6' },
                          { label: 'Dividend', key: 'dividendScore', color: '#8b5cf6' },
                          { label: 'Technical', key: 'technicalScore', color: '#06b6d4' },
                          { label: 'Momentum', key: 'momentumScore', color: '#ec4899' },
                          { label: 'Analyst', key: 'analystScore', color: '#14b8a6' },
                          { label: 'Institutional', key: 'institutionalScore', color: '#1e40af' },
                          { label: 'Market Sentiment', key: 'marketSentimentScore', color: '#a855f7' },
                          { label: 'Sector Rotation', key: 'sectorRotationScore', color: '#f97316' },
                          { label: 'Macro', key: 'macroScore', color: '#64748b' },
                        ].map(dim => (
                          <div key={dim.key} className="flex items-center justify-between rounded-md border p-2">
                            <span className="text-xs text-muted-foreground">{dim.label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${((selectedStock as unknown as Record<string, unknown>)[dim.key] as number ?? 0) / 10 * 100}%`, backgroundColor: dim.color }} />
                              </div>
                               <span className="text-xs font-mono font-semibold w-7 text-right">{((selectedStock as unknown as Record<string, unknown>)[dim.key] as number ?? 0).toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Market Info */}
                      <div className="mt-4 rounded-lg border p-3 grid grid-cols-3 gap-3 text-xs">
                        <div><span className="text-muted-foreground">Market Cap</span><br />${(selectedStock.marketCap / 1e9).toFixed(1)}B</div>
                        <div><span className="text-muted-foreground">Sector</span><br />{selectedStock.sector}</div>
                        <div><span className="text-muted-foreground">Country</span><br />{selectedStock.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CRYPTO MODE CONTENT ─── */}
          {dashboardMode === 'crypto' && data && (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error} — showing cached data
                </div>
              )}

              <AnimatePresence mode="wait" custom={tabDirection}>
                <PageTransition key={dashboardTab} direction={tabDirection}>
                  {/* ─── Overview Tab ─── */}
                  {dashboardTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Hierarchy Stats Bar */}
                      {data.meta.hierarchyStats && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                          <span className="font-medium text-foreground">ML Scoring Hierarchy:</span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {data.meta.hierarchyStats.dimensions} Dimensions
                          </span>
                          <span className="text-muted-foreground/50">&rarr;</span>
                          <span>{data.meta.hierarchyStats.subDimensions} Sub-dims</span>
                          <span className="text-muted-foreground/50">&rarr;</span>
                          <span>{data.meta.hierarchyStats.aspects} Aspects</span>
                          <span className="text-muted-foreground/50">&rarr;</span>
                          <span>{data.meta.hierarchyStats.subAspects} Sub-aspects</span>
                          <span className="ml-2 font-mono text-primary/80">
                            ({data.meta.hierarchyStats.totalCoefficients} ML coefficients)
                          </span>
                        </div>
                      )}

                      {/* Compact Market Score Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-xl border bg-card p-4">
                          <div className="text-xs text-muted-foreground mb-1">Market AI Score</div>
                          <div className="text-2xl font-bold">
                            {data.coins.length > 0
                              ? Math.round(data.coins.reduce((s, c) => s + c.aiScore, 0) / data.coins.length)
                              : '—'}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-card p-4">
                          <div className="text-xs text-muted-foreground mb-1">Coins Tracked</div>
                          <div className="text-2xl font-bold">{data.coins.length}</div>
                        </div>
                        <div className="rounded-xl border bg-card p-4">
                          <div className="text-xs text-muted-foreground mb-1">Bullish</div>
                          <div className="text-2xl font-bold text-emerald-600">
                            {data.coins.filter(c => c.aiScore >= 6.5).length}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-card p-4">
                          <div className="text-xs text-muted-foreground mb-1">Bearish</div>
                          <div className="text-2xl font-bold text-red-500">
                            {data.coins.filter(c => c.aiScore < 3.5).length}
                          </div>
                        </div>
                      </div>

                      {/* Market Heatmap */}
                      <MarketHeatmap coins={data.coins} onSelectCoin={(coin) => setSelectedCoin(coin)} />

                      {/* Advanced Filter Bar */}
                      <FilterBar
                        filters={filters}
                        onChange={setFilters}
                        coinsCount={data.coins.length}
                        filteredCount={filteredCoinsCount}
                      />

                      {/* Coin Table with filters + Export */}
                      <div className="flex items-center justify-end -mb-2">
                        <ExportMenu coins={data.coins} label="Export Scores" />
                      </div>
                      <CryptoTable
                        coins={data.coins}
                        onSelectCoin={setSelectedCoin}
                        selectedCoinId={selectedCoin?.id ?? null}
                        externalFilters={filters}
                      />
                    </div>
                  )}

                  {/* ─── Watchlist Tab ─── */}
                  {dashboardTab === 'watchlist' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Your Watchlist</h2>
                        <p className="text-sm text-muted-foreground">
                          Coins you&rsquo;ve starred for quick access. Click the star icon on any coin in the Overview tab to add or remove it here.
                        </p>
                      </div>
                      <WatchlistPanel
                        coins={data.coins}
                        onSelectCoin={setSelectedCoin}
                        selectedCoinId={selectedCoin?.id ?? null}
                      />
                    </div>
                  )}

                  {/* ─── Portfolio Tab ─── */}
                  {dashboardTab === 'portfolio' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Portfolio Tracker</h2>
                        <p className="text-sm text-muted-foreground">
                          Track your crypto holdings, monitor profit &amp; loss, and visualize your allocation. All data is stored locally in your browser &mdash; nothing leaves your device.
                        </p>
                      </div>
                      <PortfolioPanel coins={data.coins} />
                    </div>
                  )}

                  {/* ─── Alerts Tab ─── */}
                  {dashboardTab === 'alerts' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Price &amp; Score Alerts</h2>
                        <p className="text-sm text-muted-foreground">
                          Get notified when coins hit target prices, 24h change thresholds, or AI score levels. Active alerts enable faster 60-second price polling for near real-time triggers.
                        </p>
                      </div>
                      <AlertsPanel coins={data.coins} />
                    </div>
                  )}

                  {/* ─── Compare Tab ─── */}
                  {dashboardTab === 'compare' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Coin Comparison</h2>
                        <p className="text-sm text-muted-foreground">
                          Side-by-side comparison with radar chart, detailed metrics, and 12-dimension score breakdown. Select up to 4 coins.
                        </p>
                      </div>
                      <ComparePanel
                        coins={data.coins}
                        onSelectCoin={setSelectedCoin}
                      />
                    </div>
                  )}

                  {/* ─── AI Scoring Tab ─── */}
                  {dashboardTab === 'ai-scoring' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">12-Dimension ML Scoring</h2>
                        <p className="text-sm text-muted-foreground">
                          Deep analysis across technical, fundamental, on-chain, sentiment, macro, regulatory, network security, derivatives, whale activity, ecosystem, inter-market, and market psychology dimensions.
                        </p>
                      </div>
                      <MarketIndicatorsDashboard coins={data.coins} />
                    </div>
                  )}

                  {/* ─── Predictions Tab ─── */}
                  {dashboardTab === 'predictions' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">ML Prediction Engine</h2>
                        <p className="text-sm text-muted-foreground">
                          Machine learning-powered predictions with confidence calibration, dimension-level comparisons, and prediction vs. reality tracking.
                        </p>
                      </div>
                      <PredictionPanel />
                    </div>
                  )}

                  {/* ─── News & Sentiment Tab ─── */}
                  {dashboardTab === 'news-sentiment' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">News & Sentiment Analysis</h2>
                        <p className="text-sm text-muted-foreground">
                          Real-time news aggregation, algorithmic NLP sentiment scoring, social signal tracking, and impact analysis across the crypto market.
                        </p>
                      </div>
                      <NewsPanel />
                    </div>
                  )}

                  {/* ─── Behavioral Finance Tab ─── */}
                  {dashboardTab === 'behavioral-finance' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Behavioral Finance Analysis</h2>
                        <p className="text-sm text-muted-foreground">
                          Market psychology insights, cognitive bias detection, emotional state tracking, and regime identification for smarter decision-making.
                        </p>
                      </div>
                      <BehavioralFinancePanel />
                    </div>
                  )}

                  {/* ─── References & Methodology Tab ─── */}
                  {dashboardTab === 'references' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">References & Methodology</h2>
                        <p className="text-sm text-muted-foreground">
                          30+ academic and practical references across technical analysis, trading strategies, and signal generation — the scientific foundations of our 12-dimension scoring engine.
                        </p>
                      </div>
                      <ReferencesPanel />
                    </div>
                  )}

                  {/* ─── Custom Weights Tab ─── */}
                  {dashboardTab === 'custom-weights' && (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-xl font-semibold mb-1">Custom Dimension Weights</h2>
                          <p className="text-sm text-muted-foreground max-w-2xl">
                            Override the ML-optimized coefficients and recompute every coin&rsquo;s AI score with your own weighting. Adjust sliders, apply a preset, then export the recomputed scores.
                          </p>
                        </div>
                        <ExportMenu coins={data.coins} label="Export Scores" />
                      </div>
                      <CustomWeightsPanel coins={data.coins} />
                    </div>
                  )}
                </PageTransition>
              </AnimatePresence>
            </>
          )}

        {/* ── Mobile Bottom Nav ── */}
        <MobileBottomNav activeTab={dashboardTab} onTabChange={navigateToTab} />

        {/* ── Coin Detail Overlay ── */}
        {dashboardMode === 'crypto' && selectedCoin && (
          <CryptoDetailPanel coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
        )}
      </div>
    </SidebarInset>
  </SidebarProvider>
);
}

// ─── Page Renderer ──────────────────────────────────────────────

function PageContent() {
  const { currentPage, navigate, prevPage } = useSiteRouter();

  // Update document title
  useEffect(() => {
    const meta = PAGE_META[currentPage];
    if (meta) {
      document.title = meta.title;
    }
  }, [currentPage]);

  const handleNavigate = (page: string) => {
    navigate(page as 'home' | 'dashboard' | 'pricing' | 'about' | 'docs' | 'blog' | 'contact' | 'faq' | 'terms' | 'privacy');
  };

  const isDashboard = currentPage === 'dashboard';

  const renderSitePage = () => {
    switch (currentPage) {
      case 'pricing':
        return <PricingPage onNavigate={handleNavigate} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'docs':
        return <DocsPage onNavigate={handleNavigate} />;
      case 'blog':
        return <BlogPage onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactPage onNavigate={handleNavigate} />;
      case 'faq':
        return <FAQPage onNavigate={handleNavigate} />;
      case 'terms':
        return <TermsPage onNavigate={handleNavigate} />;
      case 'privacy':
        return <PrivacyPage onNavigate={handleNavigate} />;
      case 'home':
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  // ── DASHBOARD LAYOUT ──
  if (isDashboard) {
    return <DashboardLayout />;
  }

  // ── SITE PAGES LAYOUT ──
  return (
    <div className="min-h-svh flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {currentPage !== 'home' && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <BackButton
              label={prevPage ? PAGE_META[prevPage]?.title.split(' — ')[0] ?? 'Home' : 'Home'}
              onClick={() => navigate(prevPage ?? 'home')}
            />
          </div>
        )}
        <AnimatePresence mode="wait">
          <SitePageTransition key={currentPage}>
            {renderSitePage()}
          </SitePageTransition>
        </AnimatePresence>
      </main>
      <SiteFooter />
    </div>
  );
}

// ─── Root App Component ─────────────────────────────────────────

export default function Home() {
  return (
    <SiteRouterProvider>
      <TooltipProvider>
        <PageContent />
      </TooltipProvider>
    </SiteRouterProvider>
  );
}
