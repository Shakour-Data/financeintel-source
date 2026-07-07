'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Layers,
  Tag,
  Sparkles,
  ArrowRight,
  Command as CommandIcon,
} from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { detectCategories } from '@/lib/coin-filters';
import { cn } from '@/lib/utils';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── Types ──────────────────────────────────────────────────────

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  aiScore: number;
  price_change_percentage_24h: number;
  dimensions: Dimension[];
}

interface SmartSearchProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
  onFilterCategory: (category: string) => void;
  onFilterDimension: (dimensionKey: string) => void;
}

// ─── Dimension metadata for smart search ────────────────────────

const DIMENSION_META: Array<{
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  aliases: string[];
  aliasesFa: string[];
}> = [
  {
    key: 'fundamental',
    name: 'Fundamental Analysis',
    nameFa: 'تحلیل بنیادی',
    color: '#ef4444',
    icon: 'BarChart3',
    aliases: ['fundamental', 'fundamentals', 'fundy', 'basis'],
    aliasesFa: ['بنیادی', 'فاندامنتال', 'فاندامنت'],
  },
  {
    key: 'technical',
    name: 'Technical Analysis',
    nameFa: 'تحلیل تکنیکال',
    color: '#3b82f6',
    icon: 'Activity',
    aliases: ['technical', 'technicals', 'ta', 'chart'],
    aliasesFa: ['تکنیکال', 'تکنیکی', 'چارت'],
  },
  {
    key: 'onchain',
    name: 'On-Chain & Microstructure',
    nameFa: 'آنچین و ریزساختار',
    color: '#22c55e',
    icon: 'Network',
    aliases: ['onchain', 'on-chain', 'on chain', 'microstructure', 'blockchain'],
    aliasesFa: ['آنچین', 'زنجیره‌ای', 'بلاکچین'],
  },
  {
    key: 'market_psychology',
    name: 'Market Psychology',
    nameFa: 'روانشناسی بازار',
    color: '#f59e0b',
    icon: 'Brain',
    aliases: ['psychology', 'sentiment', 'fear', 'greed', 'behavior'],
    aliasesFa: ['روانشناسی', 'احساسات', 'ترس', 'طمع'],
  },
  {
    key: 'news_sentiment',
    name: 'News & Sentiment',
    nameFa: 'اخبار و احساسات',
    color: '#8b5cf6',
    icon: 'Newspaper',
    aliases: ['news', 'sentiment', 'media', 'social'],
    aliasesFa: ['اخبار', 'خبر', 'رسانه', 'شبکه اجتماعی'],
  },
  {
    key: 'macroeconomic',
    name: 'Macroeconomic',
    nameFa: 'اقتصاد کلان',
    color: '#a855f7',
    icon: 'Globe',
    aliases: ['macro', 'macroeconomic', 'economy', 'dxy', 'inflation'],
    aliasesFa: ['کلان', 'اقتصاد', 'تورم', 'اقتصاد کلان'],
  },
  {
    key: 'regulatory',
    name: 'Regulatory',
    nameFa: 'تنظیم‌گری',
    color: '#94a3b8',
    icon: 'Shield',
    aliases: ['regulatory', 'regulation', 'legal', 'compliance', 'sec'],
    aliasesFa: ['تنظیم', 'قانون', 'تنظیم‌گری', 'حقوقی'],
  },
  {
    key: 'network_security',
    name: 'Network Security',
    nameFa: 'امنیت شبکه',
    color: '#ea580c',
    icon: 'Lock',
    aliases: ['security', 'network', 'hashrate', 'safety', 'attack'],
    aliasesFa: ['امنیت', 'حریم', 'هش‌ریت', 'حمله'],
  },
  {
    key: 'derivatives',
    name: 'Derivatives',
    nameFa: 'مشتقات',
    color: '#06b6d4',
    icon: 'CandlestickChart',
    aliases: ['derivatives', 'futures', 'options', 'funding', 'perp'],
    aliasesFa: ['مشتقات', 'فیوچرز', 'آپشن', 'قرارداد'],
  },
  {
    key: 'whale_smart_money',
    name: 'Whale & Smart Money',
    nameFa: 'نهنگ‌ها و پول هوشمند',
    color: '#1e40af',
    icon: 'Fish',
    aliases: ['whale', 'smart money', 'institutional', 'flow', 'accumulation'],
    aliasesFa: ['نهنگ', 'پول هوشمند', 'صندوق', 'انباشت'],
  },
  {
    key: 'ecosystem_defi',
    name: 'Ecosystem & DeFi',
    nameFa: 'اکوسیستم و دیفای',
    color: '#10b981',
    icon: 'Hexagon',
    aliases: ['ecosystem', 'defi', 'tvl', 'dapp', 'protocol'],
    aliasesFa: ['اکوسیستم', 'دیفای', 'تی‌وی‌ال', 'پروتکل'],
  },
  {
    key: 'inter_market',
    name: 'Inter-Market',
    nameFa: 'بین‌بازاری',
    color: '#64748b',
    icon: 'GitBranch',
    aliases: ['intermarket', 'inter-market', 'correlation', 'rotation', 'sector'],
    aliasesFa: ['بین‌بازاری', 'همبستگی', 'چرخش', 'بخش'],
  },
];

// ─── Category metadata with Persian aliases ─────────────────────

const CATEGORY_META: Array<{
  key: string;
  name: string;
  nameFa: string;
  aliases: string[];
  aliasesFa: string[];
}> = [
  { key: 'l1', name: 'Layer 1', nameFa: 'لایه ۱', aliases: ['l1', 'layer1', 'layer 1', 'base'], aliasesFa: ['لایه ۱', 'لایه یک', 'بیس'] },
  { key: 'l2', name: 'Layer 2', nameFa: 'لایه ۲', aliases: ['l2', 'layer2', 'layer 2', 'scaling'], aliasesFa: ['لایه ۲', 'لایه دو', 'اسکیلینگ'] },
  { key: 'defi', name: 'DeFi', nameFa: 'دیفای', aliases: ['defi', 'decentralized finance', 'tvl'], aliasesFa: ['دیفای', 'مالی غیرمتمرکز', 'تی‌وی‌ال'] },
  { key: 'stablecoin', name: 'Stablecoin', nameFa: 'استیبل‌کوین', aliases: ['stablecoin', 'stable', 'pegged', 'usd'], aliasesFa: ['استیبل', 'استیبل‌کوین', 'ثابت'] },
  { key: 'meme', name: 'Meme', nameFa: 'میم‌کوین', aliases: ['meme', 'memecoin', 'doge', 'pepe'], aliasesFa: ['میم', 'میم‌کوین', 'سگ', 'قورباغه'] },
  { key: 'privacy', name: 'Privacy', nameFa: 'حریم خصوصی', aliases: ['privacy', 'private', 'anonymous', 'zcash'], aliasesFa: ['حریم', 'خصوصی', 'ناشناس'] },
  { key: 'oracle', name: 'Oracle', nameFa: 'اوراکل', aliases: ['oracle', 'data feed', 'chainlink'], aliasesFa: ['اوراکل', 'دیتا', 'زنجیره'] },
  { key: 'ai', name: 'AI', nameFa: 'هوش مصنوعی', aliases: ['ai', 'artificial intelligence', 'ml', 'machine learning'], aliasesFa: ['هوش مصنوعی', 'ای‌آی', 'یادگیری ماشین'] },
  { key: 'gaming', name: 'Gaming', nameFa: 'گیمینگ', aliases: ['gaming', 'game', 'metaverse', 'play to earn'], aliasesFa: ['گیمینگ', 'بازی', 'متیورس', 'پلی تو ارن'] },
  { key: 'exchange', name: 'Exchange', nameFa: 'صرافی', aliases: ['exchange', 'cex', 'token'], aliasesFa: ['صرافی', 'صرافی مرکزی', 'توکن'] },
  { key: 'rwa', name: 'RWA', nameFa: 'دارایی واقعی', aliases: ['rwa', 'real world asset', 'tokenized'], aliasesFa: ['دارایی واقعی', 'آر‌دبلیو‌ای', 'توکنایز'] },
  { key: 'lst', name: 'LST', nameFa: 'استیکیگ نقدشونده', aliases: ['lst', 'liquid staking', 'staked'], aliasesFa: ['استیکیگ', 'لیکوید', 'استیک'] },
];

// ─── Persian coin name aliases ──────────────────────────────────

const COIN_ALIASES_FA: Record<string, string[]> = {
  bitcoin: ['بیت‌کوین', 'بیت کوین', 'بیتکوین'],
  ethereum: ['اتریوم', 'اتر'],
  solana: ['سولانا', 'سول'],
  binancecoin: ['بایننس', 'ب‌ان‌ب'],
  ripple: ['ریپل', 'ایکس‌آر‌پی'],
  cardano: ['کاردانو', 'اِیدا'],
  dogecoin: ['دوج‌کوین', 'دوج'],
  polkadot: ['پولکادات', 'دات'],
  avalanche: ['آوالانچ', 'آواکس'],
  chainlink: ['چین‌لینک', 'لینک'],
  polygon: ['پالیگون', 'متیک', 'پالی'],
  tron: ['ترون', 'تراکس'],
  tether: ['تتر'],
  'usd-coin': ['یو‌اس‌دی‌سی'],
  uniswap: ['یونی‌سواپ', 'یونی'],
  'shiba-inu': ['شیبا', 'شیبا اینو'],
  litecoin: ['لایت‌کوین', 'لایت'],
  near: ['نیر', 'نیر پروتکل'],
  cosmos: ['کازموس', 'اتم'],
  stellar: ['استلار', 'الم'],
  monero: ['مونرو', 'ایکس‌ام‌آر'],
  sui: ['سویی'],
  aptos: ['آپتوس'],
  arbitrum: ['آربیتروم', 'آرب'],
  optimism: ['آپتیمیزم', 'اوپی'],
  pepe: ['پپه', 'پی‌پی'],
  'the-graph': ['گراف', 'جی‌آر‌تی'],
  'render-token': ['رندر'],
  'fetch-ai': ['فچ', 'اف‌ای‌تی'],
  aave: ['آوی'],
  maker: ['میکر', 'ام‌کی‌آر'],
};

// ─── Helpers ────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

/** Fuzzy match — returns a relevance score (0 = no match, higher = better) */
function fuzzyMatch(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  // Exact match
  if (t === q) return 100;
  // Starts with
  if (t.startsWith(q)) return 80;
  // Contains
  if (t.includes(q)) return 60;
  // Fuzzy: all characters appear in order
  let ti = 0;
  let matched = 0;
  for (let qi = 0; qi < q.length; qi++) {
    while (ti < t.length && t[ti] !== q[qi]) ti++;
    if (ti < t.length) { matched++; ti++; }
  }
  if (matched === q.length) return 30 + (matched / t.length) * 20;
  return 0;
}

/** Search coins and return sorted by relevance */
function searchCoins(coins: CoinData[], query: string): Array<{ coin: CoinData; relevance: number }> {
  const results: Array<{ coin: CoinData; relevance: number }> = [];

  for (const coin of coins) {
    let relevance = 0;

    // Name match
    relevance = Math.max(relevance, fuzzyMatch(coin.name, query) * 1.2);

    // Symbol match (higher weight for short symbol match)
    relevance = Math.max(relevance, fuzzyMatch(coin.symbol, query) * 1.5);

    // ID match
    relevance = Math.max(relevance, fuzzyMatch(coin.id, query));

    // Persian alias match
    const faAliases = COIN_ALIASES_FA[coin.id] ?? [];
    for (const alias of faAliases) {
      relevance = Math.max(relevance, fuzzyMatch(alias, query) * 1.3);
    }

    // Category match (lower weight)
    const cats = detectCategories(coin);
    for (const cat of cats) {
      relevance = Math.max(relevance, fuzzyMatch(cat, query) * 0.4);
    }

    if (relevance > 0) {
      results.push({ coin, relevance });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/** Search categories by query */
function searchCategories(query: string): Array<typeof CATEGORY_META[number]> {
  const results: Array<typeof CATEGORY_META[number]> = [];
  const q = query.toLowerCase();

  for (const cat of CATEGORY_META) {
    let match = false;
    if (cat.key.toLowerCase().includes(q)) match = true;
    if (cat.name.toLowerCase().includes(q)) match = true;
    if (cat.nameFa.includes(q)) match = true;
    for (const alias of cat.aliases) {
      if (alias.toLowerCase().includes(q)) { match = true; break; }
    }
    for (const alias of cat.aliasesFa) {
      if (alias.includes(q)) { match = true; break; }
    }
    if (match) results.push(cat);
  }

  return results;
}

/** Search dimensions by query */
function searchDimensions(query: string): Array<typeof DIMENSION_META[number]> {
  const results: Array<typeof DIMENSION_META[number]> = [];
  const q = query.toLowerCase();

  for (const dim of DIMENSION_META) {
    let match = false;
    if (dim.key.toLowerCase().includes(q)) match = true;
    if (dim.name.toLowerCase().includes(q)) match = true;
    if (dim.nameFa.includes(q)) match = true;
    for (const alias of dim.aliases) {
      if (alias.toLowerCase().includes(q)) { match = true; break; }
    }
    for (const alias of dim.aliasesFa) {
      if (alias.includes(q)) { match = true; break; }
    }
    if (match) results.push(dim);
  }

  return results;
}

// ─── Component ──────────────────────────────────────────────────

export function SmartSearch({
  coins,
  onSelectCoin,
  onFilterCategory,
  onFilterDimension,
}: SmartSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setQuery(''), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Computed results (our own smart search)
  const coinResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchCoins(coins, query.trim()).slice(0, 8);
  }, [coins, query]);

  const categoryResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchCategories(query.trim());
  }, [query]);

  const dimensionResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchDimensions(query.trim());
  }, [query]);

  // Top coins by AI score for empty state
  const topCoins = useMemo(() => {
    if (query.trim()) return [];
    return [...coins]
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 6);
  }, [coins, query]);

  const trendingCoins = useMemo(() => {
    if (query.trim()) return [];
    return [...coins]
      .sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0))
      .slice(0, 6);
  }, [coins, query]);

  const handleSelectCoin = useCallback(
    (coin: CoinData) => {
      setOpen(false);
      onSelectCoin(coin);
    },
    [onSelectCoin]
  );

  const handleSelectCategory = useCallback(
    (catKey: string) => {
      setOpen(false);
      onFilterCategory(catKey);
    },
    [onFilterCategory]
  );

  const handleSelectDimension = useCallback(
    (dimKey: string) => {
      setOpen(false);
      onFilterDimension(dimKey);
    },
    [onFilterDimension]
  );

  // Whether we have any search results (to show/hide CommandEmpty)
  const hasSearchResults = query.trim() && (
    coinResults.length > 0 ||
    categoryResults.length > 0 ||
    dimensionResults.length > 0
  );
  const showNoResults = query.trim() && !hasSearchResults;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card',
          'hover:bg-accent hover:border-accent-foreground/20 transition-colors',
          'text-sm text-muted-foreground max-w-[260px] shrink-0',
          'md:w-full'
        )}
        aria-label="Search cryptocurrencies"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden md:flex flex-1 text-left text-xs">Search coins, categories...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
          <CommandIcon className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Search dialog — built with Dialog + Command directly so we can disable cmdk's built-in filter */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[560px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Smart Search — FinanceIntel</DialogTitle>
            <DialogDescription>
              Search cryptocurrencies by name, symbol, category, dimension, or type in Persian
            </DialogDescription>
          </DialogHeader>
          <Command
            // Disable cmdk's built-in filter — we handle filtering ourselves
            filter={() => 1}
            className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          >
            <CommandInput
              placeholder="Search by name, symbol, category, dimension... (فارسی هم بنویسید)"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[420px]">

              {/* No results */}
              {showNoResults && (
                <CommandEmpty>
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No results found for &ldquo;{query}&rdquo;
                    <p className="text-xs mt-1">
                      Try searching in Persian (فارسی) or by category/dimension
                    </p>
                  </div>
                </CommandEmpty>
              )}

              {/* ── Search Results ── */}
              {query.trim() && (
                <>
                  {/* Coin results */}
                  {coinResults.length > 0 && (
                    <CommandGroup heading="Coins">
                      {coinResults.map(({ coin }) => (
                        <CommandItem
                          key={coin.id}
                          value={`${coin.name} ${coin.symbol} ${coin.id}`}
                          onSelect={() => handleSelectCoin(coin)}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-7 h-7 rounded-full shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {coin.name}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase">
                                {coin.symbol}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatPrice(coin.current_price)}</span>
                              <span className={cn(
                                'flex items-center gap-0.5',
                                (coin.price_change_percentage_24h ?? 0) >= 0
                                  ? 'text-emerald-500'
                                  : 'text-red-500'
                              )}>
                                {(coin.price_change_percentage_24h ?? 0) >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                              </span>
                              <span>MCap {formatMarketCap(coin.market_cap)}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs font-mono px-1.5 shrink-0',
                              coin.aiScore >= 7
                                ? 'border-emerald-500/30 text-emerald-500'
                                : coin.aiScore >= 4
                                  ? 'border-yellow-500/30 text-yellow-600'
                                  : 'border-red-500/30 text-red-500'
                            )}
                          >
                            {coin.aiScore.toFixed(1)}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Category results */}
                  {categoryResults.length > 0 && (
                    <CommandGroup heading="Categories">
                      {categoryResults.map((cat) => (
                        <CommandItem
                          key={cat.key}
                          value={`category-${cat.key}`}
                          onSelect={() => handleSelectCategory(cat.key)}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                            <Tag className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{cat.name}</span>
                              <span className="text-xs text-muted-foreground" dir="rtl">
                                {cat.nameFa}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Dimension results */}
                  {dimensionResults.length > 0 && (
                    <CommandGroup heading="Scoring Dimensions">
                      {dimensionResults.map((dim) => (
                        <CommandItem
                          key={dim.key}
                          value={`dimension-${dim.key}`}
                          onSelect={() => handleSelectDimension(dim.key)}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div
                            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                            style={{ backgroundColor: `${dim.color}20` }}
                          >
                            <Layers
                              className="w-3.5 h-3.5"
                              style={{ color: dim.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{dim.name}</span>
                              <span className="text-xs text-muted-foreground" dir="rtl">
                                {dim.nameFa}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}

              {/* ── Empty state suggestions ── */}
              {!query.trim() && (
                <>
                  {/* Quick actions */}
                  <CommandGroup heading="Quick Filters">
                    {CATEGORY_META.slice(0, 6).map((cat) => (
                      <CommandItem
                        key={cat.key}
                        value={`qa-${cat.key}`}
                        onSelect={() => handleSelectCategory(cat.key)}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                          <Tag className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-xs text-muted-foreground ml-1" dir="rtl">
                          {cat.nameFa}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  <CommandSeparator />

                  {/* Top AI Scored */}
                  {topCoins.length > 0 && (
                    <CommandGroup heading="Top AI Scored">
                      {topCoins.map((coin) => (
                        <CommandItem
                          key={`top-${coin.id}`}
                          value={`top-${coin.id}`}
                          onSelect={() => handleSelectCoin(coin)}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-6 h-6 rounded-full shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-medium truncate flex-1">
                            {coin.name}
                          </span>
                          <span className="text-xs text-muted-foreground uppercase">
                            {coin.symbol}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono px-1.5 shrink-0 border-emerald-500/30 text-emerald-500"
                          >
                            {coin.aiScore.toFixed(1)}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandSeparator />

                  {/* Trending */}
                  {trendingCoins.length > 0 && (
                    <CommandGroup heading="Trending (24h)">
                      {trendingCoins.map((coin) => (
                        <CommandItem
                          key={`trend-${coin.id}`}
                          value={`trend-${coin.id}`}
                          onSelect={() => handleSelectCoin(coin)}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="w-6 h-6 rounded-full shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-medium truncate flex-1">
                            {coin.name}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-medium flex items-center gap-0.5',
                              (coin.price_change_percentage_24h ?? 0) >= 0
                                ? 'text-emerald-500'
                                : 'text-red-500'
                            )}
                          >
                            {(coin.price_change_percentage_24h ?? 0) >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {Math.abs(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>

            {/* Footer hints */}
            <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">esc</kbd>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Smart Search — Persian supported
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SmartSearch;
