'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ScoreBadge } from './score-badge';

// ─── Interfaces ────────────────────────────────────────────────

export interface StockData {
  symbol: string;
  name: string;
  country: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  aiScore: number;
  confidence?: 'high' | 'medium' | 'low';
  profitabilityScore?: number;
  valuationScore?: number;
  growthScore?: number;
  financialHealthScore?: number;
  dividendScore?: number;
  technicalScore?: number;
  momentumScore?: number;
  analystScore?: number;
  institutionalScore?: number;
  marketSentimentScore?: number;
  sectorRotationScore?: number;
  macroScore?: number;
}

interface StockTableProps {
  stocks: StockData[];
  onSelectStock: (stock: StockData) => void;
  selectedCountry: string;
}

type SortKey =
  | 'rank'
  | 'symbol'
  | 'name'
  | 'sector'
  | 'price'
  | 'changePct'
  | 'marketCap'
  | 'aiScore';
type SortDir = 'asc' | 'desc';

// ─── Helper Functions ──────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1)
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toExponential(3)}`;
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

function getAiScoreColor(score: number): string {
  if (score >= 6.5) return 'text-emerald-400';
  if (score >= 3.5) return 'text-yellow-400';
  return 'text-red-400';
}

function getAiScoreBg(score: number): string {
  if (score >= 6.5) return 'bg-emerald-500/15 border-emerald-500/25';
  if (score >= 3.5) return 'bg-yellow-500/15 border-yellow-500/25';
  return 'bg-red-500/15 border-red-500/25';
}

// ─── SortIcon ──────────────────────────────────────────────────

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

// ─── DimensionMiniBar ──────────────────────────────────────────

const DIMENSION_KEYS: { key: keyof StockData; label: string; color: string }[] = [
  { key: 'profitabilityScore', label: 'Pf', color: '#ef4444' },
  { key: 'valuationScore', label: 'Va', color: '#f59e0b' },
  { key: 'growthScore', label: 'Gr', color: '#22c55e' },
  { key: 'financialHealthScore', label: 'FH', color: '#3b82f6' },
  { key: 'dividendScore', label: 'Di', color: '#8b5cf6' },
  { key: 'technicalScore', label: 'Te', color: '#06b6d4' },
  { key: 'momentumScore', label: 'Mo', color: '#ec4899' },
  { key: 'analystScore', label: 'An', color: '#14b8a6' },
  { key: 'institutionalScore', label: 'IS', color: '#1e40af' },
  { key: 'marketSentimentScore', label: 'MS', color: '#a855f7' },
  { key: 'sectorRotationScore', label: 'SR', color: '#f97316' },
  { key: 'macroScore', label: 'Mc', color: '#64748b' },
];

function DimensionMiniBar({ score, color, label }: { score: number | undefined; color: string; label: string }) {
  const val = score ?? 0;
  return (
    <div className="flex items-center gap-0.5" title={`${label}: ${val.toFixed(1)}`}>
      <span className="text-[8px] text-muted-foreground w-3 text-right font-medium leading-none">{label}</span>
      <div className="w-6 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(val / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function StockTable({
  stocks,
  onSelectStock,
  selectedCountry,
}: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const filteredStocks = useMemo(() => {
    let filtered = stocks;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortKey === 'rank') {
        // Rank by market cap (implicit)
        aVal = a.marketCap;
        bVal = b.marketCap;
        return sortDir === 'asc'
          ? (bVal as number) - (aVal as number)
          : (aVal as number) - (bVal as number);
      }

      if (sortKey === 'symbol' || sortKey === 'name' || sortKey === 'sector') {
        aVal = a[sortKey] as string;
        bVal = b[sortKey] as string;
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = a[sortKey] as number;
      bVal = b[sortKey] as number;
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [stocks, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' || key === 'symbol' || key === 'name' || key === 'sector' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Search ${selectedCountry} stocks...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead
                className="w-10 text-left cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('rank')}
              >
                <span className="inline-flex items-center gap-1">
                  # <SortIcon column="rank" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-left cursor-pointer hover:text-foreground transition-colors min-w-[100px]"
                onClick={() => toggleSort('symbol')}
              >
                <span className="inline-flex items-center gap-1">
                  Symbol <SortIcon column="symbol" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-left cursor-pointer hover:text-foreground transition-colors min-w-[120px] hidden md:table-cell"
                onClick={() => toggleSort('name')}
              >
                <span className="inline-flex items-center gap-1">
                  Name <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-left cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                onClick={() => toggleSort('sector')}
              >
                <span className="inline-flex items-center gap-1">
                  Sector <SortIcon column="sector" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('price')}
              >
                <span className="inline-flex items-center gap-1">
                  Price <SortIcon column="price" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('changePct')}
              >
                <span className="inline-flex items-center gap-1">
                  Change% <SortIcon column="changePct" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                onClick={() => toggleSort('marketCap')}
              >
                <span className="inline-flex items-center gap-1">
                  Market Cap <SortIcon column="marketCap" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('aiScore')}
              >
                <span className="inline-flex items-center gap-1">
                  AI Score <SortIcon column="aiScore" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="text-right hidden xl:table-cell">
                Mini Scores
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.map((stock, idx) => (
              <TableRow
                key={stock.symbol}
                onClick={() => onSelectStock(stock)}
                className="cursor-pointer transition-colors hover:bg-muted/30"
              >
                {/* Rank */}
                <TableCell className="text-muted-foreground text-xs">
                  {idx + 1}
                </TableCell>

                {/* Symbol */}
                <TableCell>
                  <span className="font-semibold text-sm">{stock.symbol}</span>
                  <span className="block text-xs text-muted-foreground md:hidden">{stock.name}</span>
                </TableCell>

                {/* Name */}
                <TableCell className="hidden md:table-cell">
                  <span className="font-medium text-sm">{stock.name}</span>
                </TableCell>

                {/* Sector */}
                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {stock.sector}
                  </span>
                </TableCell>

                {/* Price */}
                <TableCell className="text-right font-mono text-sm">
                  {formatPrice(stock.price)}
                </TableCell>

                {/* Change% */}
                <TableCell
                  className={cn(
                    'text-right font-medium text-sm',
                    stock.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {stock.changePct >= 0 ? '+' : ''}
                  {stock.changePct.toFixed(2)}%
                </TableCell>

                {/* Market Cap */}
                <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                  {formatMarketCap(stock.marketCap)}
                </TableCell>

                {/* AI Score */}
                <TableCell className="text-center">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-md border text-xs font-bold px-2 py-0.5 min-w-[3rem]',
                      getAiScoreBg(stock.aiScore),
                      getAiScoreColor(stock.aiScore)
                    )}
                  >
                    {stock.aiScore.toFixed(1)}
                  </span>
                </TableCell>

                {/* 12 Dimension Mini Scores */}
                <TableCell className="text-right hidden xl:table-cell">
                  <div className="grid grid-cols-6 gap-x-1.5 gap-y-0.5">
                    {DIMENSION_KEYS.map((dim) => (
                      <DimensionMiniBar
                        key={dim.key}
                        score={stock[dim.key] as number | undefined}
                        color={dim.color}
                        label={dim.label}
                      />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {filteredStocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No stocks found matching &quot;{search}&quot;
        </div>
      )}

      {/* Count Footer */}
      {filteredStocks.length > 0 && (
        <div className="flex items-center justify-between px-2 py-2 border-t text-xs text-muted-foreground">
          <span>Showing {filteredStocks.length} of {stocks.length} stocks</span>
          <span>Sorted by {sortKey} ({sortDir === 'asc' ? 'ascending' : 'descending'})</span>
        </div>
      )}
    </div>
  );
}
