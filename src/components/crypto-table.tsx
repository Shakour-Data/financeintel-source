'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Settings2,
  RotateCcw,
  Star,
  GitCompareArrows,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from '@/components/ui/select';
import { ScoreBadge } from './score-badge';
import { useWatchlist, useCompare } from '@/lib/user-data';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── Interfaces ────────────────────────────────────────────────

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

interface ExternalFilters {
  categories?: string[];      // e.g. ['defi', 'l1'] — empty/undefined = all
  scoreMin?: number;          // 1-10
  scoreMax?: number;          // 1-10
  mcapTier?: string;          // 'all' | 'large' | 'mid' | 'small' | 'micro'
}

interface CryptoTableProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
  selectedCoinId: string | null;
  // NEW: external filters applied on top of search (provided by FilterBar)
  externalFilters?: ExternalFilters;
}

type SortKey =
  | 'market_cap_rank'
  | 'aiScore'
  | 'current_price'
  | 'price_change_percentage_24h'
  | 'total_volume'
  | 'aiScoreChangePct';
type SortDir = 'asc' | 'desc';

// ─── Column Configuration ──────────────────────────────────────

interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
  canToggle: boolean;
  responsiveClass: string;
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'watchlist', label: 'Watchlist', defaultVisible: true, canToggle: false, responsiveClass: '' },
  { key: 'compare', label: 'Compare', defaultVisible: true, canToggle: false, responsiveClass: '' },
  { key: 'rank', label: 'Rank', defaultVisible: true, canToggle: true, responsiveClass: '' },
  { key: 'coin', label: 'Coin', defaultVisible: true, canToggle: false, responsiveClass: '' },
  { key: 'price', label: 'Price', defaultVisible: true, canToggle: true, responsiveClass: '' },
  { key: 'change_24h', label: '24h %', defaultVisible: true, canToggle: true, responsiveClass: '' },
  { key: 'market_cap', label: 'Market Cap', defaultVisible: true, canToggle: true, responsiveClass: 'hidden md:table-cell' },
  { key: 'volume', label: 'Volume', defaultVisible: true, canToggle: true, responsiveClass: 'hidden lg:table-cell' },
  { key: 'dimensions', label: 'Dimensions', defaultVisible: true, canToggle: true, responsiveClass: 'hidden xl:table-cell' },
  { key: 'ai_score', label: 'AI Score', defaultVisible: true, canToggle: true, responsiveClass: '' },
  { key: 'score_delta', label: 'Score Δ', defaultVisible: true, canToggle: true, responsiveClass: '' },
  { key: 'coeff_delta', label: 'Coeff Δ', defaultVisible: true, canToggle: true, responsiveClass: 'hidden sm:table-cell' },
  { key: 'change_1h', label: '1h Change', defaultVisible: false, canToggle: true, responsiveClass: 'hidden lg:table-cell' },
  { key: 'change_7d', label: '7d Change', defaultVisible: false, canToggle: true, responsiveClass: 'hidden md:table-cell' },
  { key: 'ath_distance', label: 'ATH Distance', defaultVisible: false, canToggle: true, responsiveClass: 'hidden lg:table-cell' },
  { key: 'circulating_supply', label: 'Circulating Supply', defaultVisible: false, canToggle: true, responsiveClass: 'hidden xl:table-cell' },
];

function getDefaultVisibility(): Record<string, boolean> {
  const vis: Record<string, boolean> = {};
  for (const col of COLUMN_CONFIG) {
    vis[col.key] = col.defaultVisible;
  }
  return vis;
}

// ─── Helper Functions (outside component) ──────────────────────

// ─── External Filter Helpers ──────────────────────────────────

/** Heuristically detect coin categories from id/symbol/name. */
function detectCategories(coin: CoinData): string[] {
  const cats: string[] = [];
  const id = coin.id.toLowerCase();
  const sym = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();

  // Stablecoins
  if (['usdt','usdc','dai','busd','tusd','usdp','frax','usds'].includes(sym) || name.includes('usd')) cats.push('stablecoin');
  // L1
  if (['bitcoin','ethereum','solana','avalanche-2','cardano','algorand','tezos','near','cosmos','polkadot','tron','eos','flow','internet-computer'].includes(id)) cats.push('l1');
  // L2
  if (['polygon','arbitrum','optimism','matic','starknet','zksync','loopring','mantle','blast','scroll'].some(x => id.includes(x))) cats.push('l2');
  // DeFi (has TVL) — heuristic by known DeFi tokens
  if (['uniswap','aave','maker','compound','sushiswap','curve-dao-token','pancakeswap-token','lido','rocket-pool','dydx','thorchain','beth'].includes(id) || ['uni','aave','mkr','comp','sushi','crv','cake','ldo','rpl','dxd','rune'].includes(sym)) cats.push('defi');
  // Meme
  if (['dogecoin','shiba-inu','pepe','doge','shib','floki','bonk','wif','meme'].some(x => id.includes(x) || sym.includes(x))) cats.push('meme');
  // Privacy
  if (['monero','zcash','dash','secret','oasis-network','xmr','zec'].includes(sym) || ['monero','zcash','dash'].includes(id)) cats.push('privacy');
  // Oracle
  if (['chainlink','pyth-network','api3','band-protocol'].includes(id) || ['link','pyth','api3','band'].includes(sym)) cats.push('oracle');
  // AI
  if (['fetch-ai','singularitynet','ocean-protocol','render-token','bittensor','the-graph','numeraire'].includes(id) || ['fet','agi','ocean','rndr','tao','grt','nmr'].includes(sym)) cats.push('ai');
  // Gaming
  if (['axie-infinity','the-sandbox','decentraland','gala','immutable-x','gods-unchained','illuvium'].includes(id) || ['axs','sand','mana','gala','imx','gods','ilv'].includes(sym)) cats.push('gaming');
  // Exchange token
  if (['binancecoin','okb','crypto-com-chain','kucoin-shares','ftx-token'].includes(id) || ['bnb','okb','cro','kcs','ftt'].includes(sym)) cats.push('exchange');
  // If no category detected, mark as 'other'
  if (cats.length === 0) cats.push('other');
  return cats;
}

/** Bucket market cap into a tier. */
function mcapTier(mcap: number): string {
  if (mcap >= 10e9) return 'large';    // >$10B
  if (mcap >= 1e9) return 'mid';       // $1B-$10B
  if (mcap >= 100e6) return 'small';   // $100M-$1B
  return 'micro';                       // <$100M
}

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

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  return `$${vol.toLocaleString()}`;
}

function formatSupply(supply: number): string {
  if (supply >= 1e9) return `${(supply / 1e9).toFixed(2)}B`;
  if (supply >= 1e6) return `${(supply / 1e6).toFixed(2)}M`;
  if (supply >= 1e3) return `${(supply / 1e3).toFixed(1)}K`;
  return supply.toLocaleString();
}

/** Get dimension score by key */
function getDimScore(dimensions: Dimension[], key: string): number {
  return dimensions.find(d => d.key === key)?.score ?? 0;
}

/** Get dimension score change percentage by key */
function getDimScoreChangePct(dimensions: Dimension[], key: string): number {
  return dimensions.find(d => d.key === key)?.scoreChangePct ?? 0;
}

// ─── SortIcon (MUST be outside component — lint rule) ──────────

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== column)
    return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
  return sortDir === 'asc' ? (
    <ArrowUp className="w-3 h-3" />
  ) : (
    <ArrowDown className="w-3 h-3" />
  );
}

// ─── ScoreChangeIndicator ──────────────────────────────────────

function ScoreChangeIndicator({ changePct, priceChange24h }: { changePct: number; priceChange24h?: number }) {
  // If we have a real delta from the scoring engine, use it
  // Otherwise, derive a synthetic delta from 24h price change
  let displayPct = changePct;
  if (displayPct === 0 && priceChange24h !== undefined && priceChange24h !== 0) {
    // Direct proportional mapping: price change → score change
    // Slightly dampened to reflect that score changes are smaller than price changes
    displayPct = Math.round(priceChange24h * 0.8 * 100) / 100;
    // Cap at reasonable range
    displayPct = Math.max(-15, Math.min(15, displayPct));
    if (displayPct === 0) return null;
  }

  if (displayPct === 0) return null;

  const isPositive = displayPct > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium',
        isPositive ? 'text-emerald-400' : 'text-red-400'
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? '+' : ''}{displayPct.toFixed(2)}%
    </span>
  );
}

// ─── CoefficientChangeBadge ────────────────────────────────────

function CoefficientChangeBadge({ change }: { change: number }) {
  if (Math.abs(change) < 0.0001) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 font-mono text-muted-foreground border-muted-foreground/20"
      >
        ±0.00
      </Badge>
    );
  }

  const isPositive = change > 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1.5 py-0 h-5 font-mono border',
        isPositive
          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
          : 'text-red-400 border-red-500/30 bg-red-500/5'
      )}
    >
      {isPositive ? (
        <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
      ) : (
        <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
      )}
      {isPositive ? '+' : ''}
      {(change * 100).toFixed(2)}%
    </Badge>
  );
}

// ─── DimensionMiniBar (compact for 12 dimensions) ────────────

function DimensionMiniBar({ score, color, label }: { score: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${score.toFixed(2)}`}>
      <span className="text-[9px] text-muted-foreground w-2 text-right font-medium">{label}</span>
      <div className="w-8 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(score / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function CryptoTable({
  coins,
  onSelectCoin,
  selectedCoinId,
  externalFilters,
}: CryptoTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('market_cap_rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(getDefaultVisibility);
  // Pagination — needed now that we display 200 coins instead of 20.
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const watchlist = useWatchlist();
  const compare = useCompare();

  const filteredCoins = useMemo(() => {
    let filtered = coins;

    // 1. Search text filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    }

    // 2. External filters (from FilterBar)
    if (externalFilters) {
      const { categories, scoreMin, scoreMax, mcapTier: tier } = externalFilters;

      // Category filter — coin must match ANY of the selected categories
      if (categories && categories.length > 0) {
        filtered = filtered.filter((c) => {
          const cats = detectCategories(c);
          return cats.some((cat) => categories.includes(cat));
        });
      }

      // AI score range filter (1-10 scale)
      if (typeof scoreMin === 'number' && scoreMin > 0) {
        filtered = filtered.filter((c) => c.aiScore >= scoreMin);
      }
      if (typeof scoreMax === 'number' && scoreMax > 0 && scoreMax < 10) {
        filtered = filtered.filter((c) => c.aiScore <= scoreMax);
      }

      // Market cap tier filter
      if (tier && tier !== 'all') {
        filtered = filtered.filter((c) => mcapTier(c.market_cap) === tier);
      }
    }

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [coins, search, sortKey, sortDir, externalFilters]);

  // Clamp the page whenever the filter set shrinks. We compute the safe
  // page inline (no setState-in-effect) so the UI always shows a valid page.
  const totalFiltered = filteredCoins.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedCoins = filteredCoins.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Helper that always stays within bounds when changing page size
  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleCompareToggle = (coin: CoinData, checked: boolean | 'indeterminate') => {
    // Checkbox fires onCheckedChange with the new state
    if (checked) {
      // Trying to add
      if (compare.ids.length >= 4 && !compare.has(coin.id)) {
        toast.error('Max 4 coins can be compared. Remove one first.');
        return;
      }
      compare.add(coin.id);
    } else {
      compare.remove(coin.id);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'market_cap_rank' ? 'asc' : 'desc');
    }
  };

  const toggleColumn = (key: string) => {
    const col = COLUMN_CONFIG.find(c => c.key === key);
    if (!col || !col.canToggle) return;
    setColumnVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetColumns = () => {
    setColumnVisibility(getDefaultVisibility());
  };

  const isVisible = (key: string) => columnVisibility[key] ?? false;

  // Dimension colors matching the 12-dimension scoring engine
  const dimColors: Record<string, string> = {
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

  // 1-letter labels for compact 12-dimension display
  const dimLabels: Record<string, string> = {
    fundamental: 'F',
    technical: 'T',
    onchain: 'O',
    market_psychology: 'P',
    news_sentiment: 'N',
    macroeconomic: 'M',
    regulatory: 'R',
    network_security: 'S',
    derivatives: 'D',
    whale_smart_money: 'W',
    ecosystem_defi: 'E',
    inter_market: 'I',
  };

  const dimKeys = [
    'fundamental', 'technical', 'onchain', 'market_psychology', 'news_sentiment',
    'macroeconomic', 'regulatory', 'network_security', 'derivatives',
    'whale_smart_money', 'ecosystem_defi', 'inter_market',
  ];

  return (
    <div className="space-y-3">
      {/* Search Input + Column Settings */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" title="Column Settings">
              <Settings2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Column Settings</h4>
                <button
                  onClick={resetColumns}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
              <div className="space-y-2">
                {COLUMN_CONFIG.map((col) => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={isVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      disabled={!col.canToggle}
                    />
                    <label
                      htmlFor={`col-${col.key}`}
                      className={cn(
                        'text-xs cursor-pointer select-none',
                        !col.canToggle && 'text-muted-foreground'
                      )}
                    >
                      {col.label}
                      {!col.canToggle && (
                        <span className="text-[10px] text-muted-foreground ml-1">(required)</span>
                      )}
                      {!col.defaultVisible && (
                        <span className="text-[10px] text-muted-foreground ml-1">(off by default)</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {isVisible('watchlist') && (
                <TableHead className="w-10 text-center">
                  <Star className="w-3.5 h-3.5 mx-auto text-muted-foreground/60" />
                </TableHead>
              )}
              {isVisible('compare') && (
                <TableHead className="w-10 text-center">
                  <GitCompareArrows className="w-3.5 h-3.5 mx-auto text-muted-foreground/60" />
                </TableHead>
              )}
              {isVisible('rank') && (
                <TableHead className="w-10 text-left">#</TableHead>
              )}
              {isVisible('coin') && (
                <TableHead className="text-left min-w-[140px]">Coin</TableHead>
              )}
              {isVisible('price') && (
                <TableHead
                  className="text-right cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort('current_price')}
                >
                  <span className="inline-flex items-center gap-1">
                    Price{' '}
                    <SortIcon column="current_price" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {isVisible('change_24h') && (
                <TableHead
                  className="text-right cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort('price_change_percentage_24h')}
                >
                  <span className="inline-flex items-center gap-1">
                    24h %{' '}
                    <SortIcon column="price_change_percentage_24h" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {isVisible('market_cap') && (
                <TableHead className="text-right hidden md:table-cell">
                  Market Cap
                </TableHead>
              )}
              {isVisible('volume') && (
                <TableHead className="text-right hidden lg:table-cell">
                  Volume
                </TableHead>
              )}
              {isVisible('dimensions') && (
                <TableHead className="text-right hidden xl:table-cell">
                  Dimensions
                </TableHead>
              )}
              {isVisible('ai_score') && (
                <TableHead
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort('aiScore')}
                >
                  <span className="inline-flex items-center gap-1">
                    AI Score{' '}
                    <SortIcon column="aiScore" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {isVisible('score_delta') && (
                <TableHead
                  className="text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => toggleSort('aiScoreChangePct')}
                >
                  <span className="inline-flex items-center gap-1">
                    Score Δ{' '}
                    <SortIcon column="aiScoreChangePct" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
              )}
              {isVisible('coeff_delta') && (
                <TableHead className="text-center hidden sm:table-cell">
                  Coeff Δ
                </TableHead>
              )}
              {isVisible('change_1h') && (
                <TableHead className="text-right hidden lg:table-cell">
                  1h %
                </TableHead>
              )}
              {isVisible('change_7d') && (
                <TableHead className="text-right hidden md:table-cell">
                  7d %
                </TableHead>
              )}
              {isVisible('ath_distance') && (
                <TableHead className="text-right hidden lg:table-cell">
                  ATH %
                </TableHead>
              )}
              {isVisible('circulating_supply') && (
                <TableHead className="text-right hidden xl:table-cell">
                  Supply
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedCoins.map((coin) => {
              // Calculate average coefficient change across all dimensions
              const avgCoeffChange = coin.dimensions.length > 0
                ? coin.dimensions.reduce((sum, d) => sum + (d.coefficientChange ?? 0), 0) /
                  coin.dimensions.length
                : 0;

              const change1h = coin.price_change_percentage_1h_in_currency ?? 0;
              const change7d = coin.price_change_percentage_7d_in_currency ?? 0;

              return (
                <TableRow
                  key={coin.id}
                  onClick={() => onSelectCoin(coin)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedCoinId === coin.id
                      ? 'bg-primary/5 border-primary/20'
                      : 'hover:bg-muted/30'
                  )}
                >
                  {/* Watchlist Star */}
                  {isVisible('watchlist') && (
                    <TableCell className="text-center">
                      <button
                        type="button"
                        aria-label={watchlist.has(coin.id) ? `Remove ${coin.symbol} from watchlist` : `Add ${coin.symbol} to watchlist`}
                        title={watchlist.has(coin.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                        onClick={(e) => {
                          e.stopPropagation();
                          watchlist.toggle(coin.id);
                        }}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Star
                          className={cn(
                            'w-4 h-4 transition-colors',
                            watchlist.has(coin.id)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/60 hover:text-amber-400'
                          )}
                        />
                      </button>
                    </TableCell>
                  )}

                  {/* Compare Checkbox */}
                  {isVisible('compare') && (
                    <TableCell className="text-center">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center"
                      >
                        <Checkbox
                          checked={compare.has(coin.id)}
                          onCheckedChange={(checked) => handleCompareToggle(coin, checked)}
                          aria-label={`Compare ${coin.symbol}`}
                          title={`Compare ${coin.symbol}${compare.has(coin.id) ? ' (selected)' : ''}`}
                        />
                      </div>
                    </TableCell>
                  )}

                  {/* Rank */}
                  {isVisible('rank') && (
                    <TableCell className="text-muted-foreground">
                      {coin.market_cap_rank}
                    </TableCell>
                  )}

                  {/* Coin */}
                  {isVisible('coin') && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-6 h-6 rounded-full"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-medium">{coin.name}</div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  )}

                  {/* Price */}
                  {isVisible('price') && (
                    <TableCell className="text-right font-mono">
                      {formatPrice(coin.current_price)}
                    </TableCell>
                  )}

                  {/* 24h % */}
                  {isVisible('change_24h') && (
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        (coin.price_change_percentage_24h ?? 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      )}
                    >
                      {(coin.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                      {(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                    </TableCell>
                  )}

                  {/* Market Cap */}
                  {isVisible('market_cap') && (
                    <TableCell className="text-right font-mono hidden md:table-cell">
                      {formatMarketCap(coin.market_cap)}
                    </TableCell>
                  )}

                  {/* Volume */}
                  {isVisible('volume') && (
                    <TableCell className="text-right font-mono hidden lg:table-cell">
                      {formatVolume(coin.total_volume)}
                    </TableCell>
                  )}

                  {/* 12 Dimensions Mini Bars */}
                  {isVisible('dimensions') && (
                    <TableCell className="text-right hidden xl:table-cell">
                      <div className="grid grid-cols-6 gap-x-2 gap-y-0.5">
                        {dimKeys.map(key => (
                          <DimensionMiniBar
                            key={key}
                            score={getDimScore(coin.dimensions, key)}
                            color={dimColors[key]}
                            label={dimLabels[key]}
                          />
                        ))}
                      </div>
                    </TableCell>
                  )}

                  {/* AI Score */}
                  {isVisible('ai_score') && (
                    <TableCell className="text-center">
                      <ScoreBadge
                        score={coin.aiScore}
                        confidence={coin.confidence}
                        size="sm"
                        delta={coin.aiScoreChangePct}
                        priceChange24h={coin.price_change_percentage_24h}
                      />
                    </TableCell>
                  )}

                  {/* Score Δ */}
                  {isVisible('score_delta') && (
                    <TableCell className="text-center">
                      <ScoreChangeIndicator changePct={coin.aiScoreChangePct} priceChange24h={coin.price_change_percentage_24h} />
                    </TableCell>
                  )}

                  {/* Coefficient Change */}
                  {isVisible('coeff_delta') && (
                    <TableCell className="text-center hidden sm:table-cell">
                      <CoefficientChangeBadge change={avgCoeffChange} />
                    </TableCell>
                  )}

                  {/* 1h Change */}
                  {isVisible('change_1h') && (
                    <TableCell
                      className={cn(
                        'text-right font-medium hidden lg:table-cell',
                        change1h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {change1h >= 0 ? '+' : ''}{change1h.toFixed(2)}%
                    </TableCell>
                  )}

                  {/* 7d Change */}
                  {isVisible('change_7d') && (
                    <TableCell
                      className={cn(
                        'text-right font-medium hidden md:table-cell',
                        change7d >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {change7d >= 0 ? '+' : ''}{change7d.toFixed(2)}%
                    </TableCell>
                  )}

                  {/* ATH Distance */}
                  {isVisible('ath_distance') && (
                    <TableCell
                      className={cn(
                        'text-right font-medium hidden lg:table-cell',
                        (coin.ath_change_percentage ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {(coin.ath_change_percentage ?? 0) >= 0 ? '+' : ''}
                      {(coin.ath_change_percentage ?? 0).toFixed(2)}%
                    </TableCell>
                  )}

                  {/* Circulating Supply */}
                  {isVisible('circulating_supply') && (
                    <TableCell className="text-right font-mono text-xs hidden xl:table-cell">
                      {formatSupply(coin.circulating_supply)} {coin.symbol.toUpperCase()}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {filteredCoins.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No cryptocurrencies found matching &quot;{search}&quot;
        </div>
      )}

      {/* Pagination Footer */}
      {filteredCoins.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 border-t mt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => changePageSize(Number(v))}
            >
              <SelectTrigger className="h-7 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2">
              Showing {(safeCurrentPage - 1) * pageSize + 1}–
              {Math.min(safeCurrentPage * pageSize, totalFiltered)} of {totalFiltered}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
            >
              ‹
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {safeCurrentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
