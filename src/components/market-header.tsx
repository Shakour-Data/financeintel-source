'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  AlertTriangle,
  Database,
  Cpu,
  Radio,
  BookOpen,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MarketHeaderProps {
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
  };
  onRefresh: () => void;
  isLoading: boolean;
}

const DATA_SOURCES = [
  {
    category: 'Market Data',
    items: [
      { name: 'Price & Volume', source: 'CoinGecko API', status: 'real' as const, desc: 'Live price, market cap, volume, 24h changes' },
      { name: 'Global Stats', source: 'CoinGecko API', status: 'real' as const, desc: 'Total market cap, active coins, market dominance' },
      { name: 'Sparkline (7d)', source: 'CoinGecko API', status: 'real' as const, desc: '7-day price history chart data' },
    ],
  },
  {
    category: 'Scoring Dimensions',
    items: [
      { name: 'Fundamental Analysis', source: 'Derived from market data', status: 'computed' as const, desc: 'Market cap, supply dynamics, project quality scores from real price/volume data' },
      { name: 'Technical Analysis', source: 'Derived from market data', status: 'computed' as const, desc: 'Trend, momentum, volatility scores from real price changes' },
      { name: 'On-Chain & Microstructure', source: 'Proxy estimation', status: 'estimated' as const, desc: 'Network activity approximated from volume/rank; real on-chain data requires Glassnode/CryptoQuant API' },
      { name: 'Market Psychology', source: 'Derived from market data', status: 'computed' as const, desc: 'Fear/greed, sentiment proxies from real price/volume patterns' },
      { name: 'News & Sentiment', source: 'CryptoCompare + NLP', status: 'real' as const, desc: 'Real-time news fetched from CryptoCompare API, analyzed by algorithmic lexicon-based NLP for sentiment' },
      { name: 'Macroeconomic', source: 'Yahoo Finance + CoinGecko', status: 'computed' as const, desc: 'Real DXY, S&P500, Gold, Oil, Treasury rates from Yahoo Finance; falls back to CoinGecko price proxies' },
      { name: 'Regulatory & Legal', source: 'Factual classification', status: 'estimated' as const, desc: 'Known regulatory status (SEC classifications, MiCA compliance) based on factual knowledge; not real-time' },
      { name: 'Network Security', source: 'Proxy estimation', status: 'estimated' as const, desc: 'Approximated from rank/age; real data requires blockchain monitoring APIs' },
      { name: 'Derivatives & Funding', source: 'Binance Futures API', status: 'computed' as const, desc: 'Real funding rates, OI, long/short ratio, taker volume from Binance Futures; falls back to price/volume proxies' },
      { name: 'Whale & Smart Money', source: 'Proxy estimation', status: 'estimated' as const, desc: 'Derived from real volume/price data; actual whale tracking requires Glassnode/Whale Alert API' },
      { name: 'Ecosystem & DeFi', source: 'DeFiLlama API', status: 'computed' as const, desc: 'Real chain TVL and protocol data from DeFiLlama; falls back to market cap rank proxy' },
      { name: 'Inter-Market Correlation', source: 'Yahoo Finance API', status: 'computed' as const, desc: 'Real S&P500, DXY, Gold, Oil correlation data from Yahoo Finance; falls back to market cap rank proxy' },
    ],
  },
  {
    category: 'ML & Algorithms',
    items: [
      { name: 'ML Coefficient Optimization', source: 'Gradient Descent', status: 'computed' as const, desc: 'Real ML optimization with ±5% daily constraint on coefficients' },
      { name: 'Behavioral Finance', source: 'Derived from market data', status: 'computed' as const, desc: '16 biases detected from real price/volume/volatility patterns' },
      { name: '3-Year Historical Data', source: 'CoinGecko + GBM', status: 'estimated' as const, desc: 'Real historical prices from CoinGecko where available; GBM model fills gaps with deterministic parameters' },
    ],
  },
];

const STATUS_CONFIG = {
  real: { label: 'Live Data', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  computed: { label: 'Computed', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Cpu },
  estimated: { label: 'Estimated', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: AlertCircle },
  simulated: { label: 'Simulated', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
};

export function MarketHeader({ globalData, meta, onRefresh, isLoading }: MarketHeaderProps) {
  const [showDataInfo, setShowDataInfo] = useState(false);

  const totalMarketCap = globalData?.total_market_cap?.usd ?? 0;
  const totalVolume = globalData?.total_volume?.usd ?? 0;
  const change24h = globalData?.market_cap_change_percentage_24h_usd ?? 0;
  const activeCoins = globalData?.active_cryptocurrencies ?? 0;

  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  // Count data source statuses
  const allItems = DATA_SOURCES.flatMap(s => s.items);
  const realCount = allItems.filter(i => i.status === 'real').length;
  const computedCount = allItems.filter(i => i.status === 'computed').length;
  const estimatedCount = allItems.filter(i => i.status === 'estimated').length;

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Crypto Intelligence Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              ML-powered multi-dimensional scoring for {meta.totalCoins} cryptocurrencies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Data Source Info Button */}
          <button
            onClick={() => setShowDataInfo(!showDataInfo)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              showDataInfo
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            )}
          >
            <Database className="w-3.5 h-3.5" />
            Data Sources
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-0.5">
              {realCount} live
            </Badge>
          </button>

          {meta.isStale && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500 text-xs">
              <AlertTriangle className="w-3 h-3" />
              Cached data
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-primary/10 hover:bg-primary/20 text-primary transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Data Source Info Panel */}
      {showDataInfo && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Data Source Transparency</h3>
            </div>
            <button onClick={() => setShowDataInfo(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const count = allItems.filter(i => i.status === key).length;
              return (
                <div key={key} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs', config.bg)}>
                  <config.icon className={cn('w-3 h-3', config.color)} />
                  <span className={config.color}>{config.label}</span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              );
            })}
          </div>

          {/* Categories */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {DATA_SOURCES.map(section => (
              <div key={section.category}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {section.category}
                </h4>
                <div className="space-y-1.5">
                  {section.items.map(item => {
                    const status = STATUS_CONFIG[item.status];
                    return (
                      <div key={item.name} className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
                        <status.icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', status.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{item.name}</span>
                            <span className={cn('text-[9px] px-1.5 py-0 rounded border', status.bg, status.color)}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Source: <span className="text-foreground/70">{item.source}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {realCount + computedCount} data-driven dimensions
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-yellow-400" />
              {estimatedCount} estimated (need API integration)
            </span>
          </div>
        </div>
      )}

      {/* Market Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
            <Activity className="w-3 h-3" />
            Total Market Cap
          </div>
          <div className="text-lg font-bold">{formatLargeNumber(totalMarketCap)}</div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs mb-1">
            {change24h >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className="text-muted-foreground">24h Change</span>
          </div>
          <div className={cn('text-lg font-bold', change24h >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
            <BarChart3 className="w-3 h-3" />
            24h Volume
          </div>
          <div className="text-lg font-bold">{formatLargeNumber(totalVolume)}</div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
            <Activity className="w-3 h-3" />
            Active Coins
          </div>
          <div className="text-lg font-bold">{activeCoins.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
