'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
// Note: useEffect is still used below for the close-delay cleanup.
import {
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  BrainCircuit,
  Crown,
  ListOrdered,
  Building,
  Layers,
  Sparkles,
  Zap,
  Coins,
  ShieldCheck,
  X,
  Clock,
  ArrowRight,
  CornerDownLeft,
  Filter,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScoreBadge } from './score-badge';
import {
  smartSearch,
  applyParsedQuery,
  parsedToExternalFilters,
  loadRecentSearches,
  saveRecentSearch,
  clearRecentSearches,
  defaultSmartQueries,
  type SearchableCoin,
  type ParsedQuery,
} from '@/lib/smart-search';
import type { FilterState } from '@/components/filter-bar';

// ─── Icon resolver ───────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'bar-chart': BarChart3,
  brain: Brain,
  'brain-circuit': BrainCircuit,
  crown: Crown,
  'list-ordered': ListOrdered,
  building: Building,
  layers: Layers,
  sparkles: Sparkles,
  zap: Zap,
  coins: Coins,
  'shield-check': ShieldCheck,
};

function SmartIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_MAP[name] ?? Sparkles;
  return <Cmp className={className} />;
}

// ─── Format helpers ──────────────────────────────────────────────

function formatPrice(p: number): string {
  if (p >= 1) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p >= 0.0001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}

function formatMcap(m: number): string {
  if (m >= 1e12) return `$${(m / 1e12).toFixed(2)}T`;
  if (m >= 1e9) return `$${(m / 1e9).toFixed(2)}B`;
  if (m >= 1e6) return `$${(m / 1e6).toFixed(1)}M`;
  return `$${m.toLocaleString()}`;
}

// ─── Props ───────────────────────────────────────────────────────

interface SmartSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coins: SearchableCoin[];
  /** Called when a coin is selected — opens the detail panel */
  onSelectCoin: (coin: SearchableCoin) => void;
  /** Called when a smart query / filter is selected — applies to FilterBar + table */
  onApplyQuery: (parsed: ParsedQuery, externalFilters: Partial<FilterState>) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function SmartSearchDialog({
  open,
  onOpenChange,
  coins,
  onSelectCoin,
  onApplyQuery,
}: SmartSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  // Sync state when the dialog opens — using the "adjust state during render"
  // pattern (React-recommended) rather than setState-in-effect, to avoid
  // cascading renders. See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setRecent(loadRecentSearches());
      setQuery('');
    }
  }

  // Compute results (debounced via useMemo on query + coins)
  const results = useMemo(() => {
    if (!query.trim()) return null;
    return smartSearch(query, coins);
  }, [query, coins]);

  const defaultQueries = useMemo(() => defaultSmartQueries(coins), [coins]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectCoin = useCallback(
    (coin: SearchableCoin) => {
      onSelectCoin(coin);
      if (query.trim()) saveRecentSearch(query.trim());
      onOpenChange(false);
    },
    [onSelectCoin, onOpenChange, query]
  );

  const handleApplyParsed = useCallback(
    (parsed: ParsedQuery) => {
      const filters = parsedToExternalFilters(parsed);
      onApplyQuery(parsed, filters as Partial<FilterState>);
      if (query.trim()) saveRecentSearch(query.trim());
      onOpenChange(false);
    },
    [onApplyQuery, onOpenChange, query]
  );

  const handleApplyRecent = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
    },
    []
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecent([]);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(''), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const hasQuery = query.trim().length > 0;
  const showDefaults = !hasQuery;
  const showParsedSummary = results?.parsed &&
    (results.parsed.scoreMin !== undefined ||
      results.parsed.scoreMax !== undefined ||
      results.parsed.priceMin !== undefined ||
      results.parsed.priceMax !== undefined ||
      results.parsed.mcapTier !== undefined ||
      results.parsed.categories.length > 0 ||
      results.parsed.sortKey !== undefined ||
      results.parsed.limit !== undefined);

  const totalActiveFilters =
    (results?.parsed.scoreMin !== undefined ? 1 : 0) +
    (results?.parsed.scoreMax !== undefined ? 1 : 0) +
    (results?.parsed.priceMin !== undefined ? 1 : 0) +
    (results?.parsed.priceMax !== undefined ? 1 : 0) +
    (results?.parsed.mcapTier !== undefined ? 1 : 0) +
    (results?.parsed.categories.length > 0 ? 1 : 0) +
    (results?.parsed.sortKey !== undefined ? 1 : 0) +
    (results?.parsed.limit !== undefined ? 1 : 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Smart Crypto Search"
      description="Search coins by name, symbol, score, price, or category. Try “score>8”, “under $1”, “top 10 defi”, or “gainers”."
      className="max-w-2xl"
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        placeholder="Search 200 coins… e.g. “bitcoin”, “score>8”, “top 10 defi gainers”, “under $1”"
        value={query}
        onValueChange={setQuery}
      />

      {/* Active filter chips (shows what the parser understood) */}
      {showParsedSummary && results && totalActiveFilters > 0 && (
        <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Understood:
          </span>
          {results.parsed.categories.map((c) => (
            <Badge key={`cat-${c}`} variant="secondary" className="text-[10px] h-5 capitalize">
              {c}
            </Badge>
          ))}
          {results.parsed.scoreMin !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {/* score>8 → scoreMin=8.01 (exclusive). Display as "score > 8" for clarity. */}
              score {'>'} {Math.round((results.parsed.scoreMin % 1) * 100) === 1
                ? Math.floor(results.parsed.scoreMin)
                : results.parsed.scoreMin}
            </Badge>
          )}
          {results.parsed.scoreMax !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5">
              score {'<'} {results.parsed.scoreMax}
            </Badge>
          )}
          {results.parsed.priceMin !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5">
              price ≥ {formatPrice(results.parsed.priceMin)}
            </Badge>
          )}
          {results.parsed.priceMax !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-5">
              price ≤ {formatPrice(results.parsed.priceMax)}
            </Badge>
          )}
          {results.parsed.mcapTier && (
            <Badge variant="secondary" className="text-[10px] h-5 capitalize">
              {results.parsed.mcapTier} cap
            </Badge>
          )}
          {results.parsed.sortKey && (
            <Badge variant="secondary" className="text-[10px] h-5">
              sort: {results.parsed.sortKey.replace(/_/g, ' ')} {results.parsed.sortDir}
            </Badge>
          )}
          {results.parsed.limit && (
            <Badge variant="secondary" className="text-[10px] h-5">
              top {results.parsed.limit}
            </Badge>
          )}
        </div>
      )}

      <CommandList className="max-h-[60vh]">
        {hasQuery &&
          !results?.coins.length &&
          !results?.smartQueries.length &&
          !results?.filters.length &&
          !(showParsedSummary && totalActiveFilters > 0) && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No matches found.</p>
              <p className="text-xs text-muted-foreground/70 max-w-sm">
                Try a simpler query, a ticker symbol (BTC, ETH), or a smart phrase like “gainers”, “top 10”, or “defi”.
              </p>
            </div>
          </CommandEmpty>
        )}

        {/* ── Default state (no query): quick starts + recent ── */}
        {showDefaults && (
          <>
            {recent.length > 0 && (
              <>
                <CommandGroup heading="Recent searches" className="flex items-center justify-between">
                  <div className="flex flex-col w-full">
                    {recent.map((r) => (
                      <CommandItem
                        key={`recent-${r}`}
                        value={`recent ${r}`}
                        onSelect={() => handleApplyRecent(r)}
                        className="gap-2"
                      >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{r}</span>
                        <CornerDownLeft className="w-3 h-3 text-muted-foreground/50" />
                      </CommandItem>
                    ))}
                  </div>
                </CommandGroup>
                <CommandGroup heading="">
                  <CommandItem
                    value="clear recent searches"
                    onSelect={handleClearRecent}
                    className="text-xs text-muted-foreground gap-2"
                  >
                    <X className="w-3 h-3" />
                    Clear recent searches
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Quick starts — try one of these">
              {defaultQueries.map((sq) => (
                <CommandItem
                  key={sq.id}
                  value={`${sq.label} ${sq.description}`}
                  onSelect={() => handleApplyParsed(sq.parsed)}
                  className="gap-3 items-start py-2.5"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                    <SmartIcon name={sq.icon} className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-sm font-medium">{sq.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{sq.description}</span>
                  </div>
                  <CornerDownLeft className="w-3 h-3 text-muted-foreground/50 mt-1" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Search tips">
              <div className="px-2 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                <Tip label="score>8" desc="Coins with AI score above 8" />
                <Tip label="price&lt;$1" desc="Penny coins under $1" />
                <Tip label="top 10 defi" desc="Top DeFi by score" />
                <Tip label="gainers" desc="24h top gainers" />
                <Tip label="large cap" desc="Blue-chip >$10B" />
                <Tip label="between $10 and $100" desc="Price range" />
                <Tip label="ai tokens" desc="AI category" />
                <Tip label="layer 1" desc="L1 blockchains" />
              </div>
            </CommandGroup>
          </>
        )}

        {/* ── Active query results ── */}
        {hasQuery && results && (
          <>
            {/* Smart query templates */}
            {results.smartQueries.length > 0 && (
              <CommandGroup heading="Smart queries — apply filter + sort">
                {results.smartQueries.map((sq) => (
                  <CommandItem
                    key={sq.id}
                    value={`smart ${sq.label}`}
                    onSelect={() => handleApplyParsed(sq.parsed)}
                    className="gap-3 items-start py-2.5"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                      <SmartIcon name={sq.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-medium">{sq.label}</span>
                      <span className="text-xs text-muted-foreground truncate">{sq.description}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 mt-1.5" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Filter chip suggestions */}
            {results.filters.length > 0 && (
              <CommandGroup heading="Filter by category">
                {results.filters.map((f) => (
                  <CommandItem
                    key={`filter-${f.category}`}
                    value={`filter ${f.label} ${f.category}`}
                    onSelect={() =>
                      handleApplyParsed({
                        text: '',
                        categories: [f.category],
                      })
                    }
                    className="gap-3 items-start py-2.5"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-medium capitalize">{f.label}</span>
                      <span className="text-xs text-muted-foreground truncate">{f.description}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 mt-1.5" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Coin matches */}
            {results.coins.length > 0 && (
              <CommandGroup heading={`Coins (${results.coins.length}${results.coins.length >= 8 ? '+' : ''})`}>
                {results.coins.map((m) => (
                  <CommandItem
                    key={m.coin.id}
                    value={`${m.coin.name} ${m.coin.symbol} ${m.coin.id}`}
                    onSelect={() => handleSelectCoin(m.coin)}
                    className="gap-3 items-center py-2"
                  >
                    {/* Coin icon */}
                    {m.coin.image ? (
                      <img
                        src={m.coin.image}
                        alt={m.coin.name}
                        className="w-7 h-7 rounded-full shrink-0 bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {m.coin.symbol.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Name + symbol */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">{m.coin.name}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {m.coin.symbol} · Rank #{m.coin.market_cap_rank}
                      </span>
                    </div>

                    {/* Price + 24h change */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-sm font-mono tabular-nums">
                        {formatPrice(m.coin.current_price)}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium tabular-nums',
                          m.coin.price_change_percentage_24h >= 0
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        )}
                      >
                        {m.coin.price_change_percentage_24h >= 0 ? '+' : ''}
                        {m.coin.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </div>

                    {/* AI Score badge */}
                    <div className="shrink-0 ml-1">
                      <ScoreBadge
                        score={m.coin.aiScore}
                        size="sm"
                        confidence={m.coin.confidence}
                      />
                    </div>

                    <CornerDownLeft className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Apply-parsed action (Enter on empty selection) */}
            {showParsedSummary && totalActiveFilters > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="">
                  <CommandItem
                    value="apply current filter to table"
                    onSelect={() => handleApplyParsed(results.parsed)}
                    className="gap-2 py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10"
                  >
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Apply filter to the table
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({applyParsedQuery(coins, results.parsed).length} coins match)
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>

      {/* ── Footer hint ── */}
      <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono">esc</kbd>
            close
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Brain className="w-3 h-3" />
          Intelligent search · {coins.length} coins indexed
        </span>
      </div>
    </CommandDialog>
  );
}

// ─── Tip subcomponent ────────────────────────────────────────────

function Tip({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-2 py-1.5 rounded border bg-background/50">
      <code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
        {label}
      </code>
      <span className="text-[10px] text-muted-foreground">{desc}</span>
    </div>
  );
}

export default SmartSearchDialog;
