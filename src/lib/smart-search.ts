/**
 * Intelligent Crypto Search Engine
 * ─────────────────────────────────────────────────────────────────
 * A multi-layered search system that understands:
 *
 *   1. Plain text  →  "bitcoin", "btc", "ethereum"
 *   2. Fuzzy match  →  "bitoin" (typo) → bitcoin, "ethe" → ethereum
 *   3. Category NL  →  "defi", "ai tokens", "layer 1", "memes"
 *   4. Score syntax →  "score>8", "score:7-9", "high score"
 *   5. Price syntax →  "price<1", "under $1", "between $10 and $100"
 *   6. Market cap   →  "large cap", "mid cap", "small cap"
 *   7. Change/sort  →  "gainers", "losers", "trending", "top 10", "high volume"
 *   8. Volume       →  "high volume", "low volume"
 *
 * Results are grouped into:
 *   - Smart Queries  (NL → filter+sort action)
 *   - Coins          (fuzzy ranked name/symbol matches)
 *   - Quick Filters  (category chips that match the text)
 */

import type { Dimension } from '@/lib/scoring-engine-v2';
import { detectCategories, mcapTierOf, type ExternalFilters } from '@/lib/coin-filters';

// ─── Types ────────────────────────────────────────────────────────

export interface SearchableCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  aiScore: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

export type SortKey =
  | 'market_cap_rank'
  | 'aiScore'
  | 'current_price'
  | 'price_change_percentage_24h'
  | 'total_volume';

export interface ParsedQuery {
  /** Free-text portion (for fuzzy coin matching) */
  text: string;
  /** Detected category filter chips */
  categories: string[];
  /** Score range */
  scoreMin?: number;
  scoreMax?: number;
  /** Price range (USD) */
  priceMin?: number;
  priceMax?: number;
  /** Market cap tier */
  mcapTier?: 'large' | 'mid' | 'small' | 'micro';
  /** Sort directive */
  sortKey?: SortKey;
  sortDir?: 'asc' | 'desc';
  /** Result limit (for "top N" queries) */
  limit?: number;
}

export interface CoinMatch {
  type: 'coin';
  coin: SearchableCoin;
  /** 0–100 match quality */
  score: number;
  /** Which field matched best */
  matchedField: 'name' | 'symbol' | 'id';
}

export interface SmartQueryMatch {
  type: 'smart';
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Parsed query to apply */
  parsed: ParsedQuery;
}

export interface FilterChipMatch {
  type: 'filter';
  category: string;
  label: string;
  description: string;
}

export interface SearchResults {
  coins: CoinMatch[];
  smartQueries: SmartQueryMatch[];
  filters: FilterChipMatch[];
  parsed: ParsedQuery;
}

// ─── Category keyword synonyms ───────────────────────────────────

interface CategorySynonym {
  category: string;
  label: string;
  description: string;
  keywords: string[];
}

const CATEGORY_SYNONYMS: CategorySynonym[] = [
  {
    category: 'l1',
    label: 'Layer 1',
    description: 'Base-layer blockchains (Bitcoin, Ethereum, Solana…)',
    keywords: ['l1', 'layer1', 'layer 1', 'layer-1', 'base layer', 'base chain'],
  },
  {
    category: 'l2',
    label: 'Layer 2',
    description: 'Scaling solutions (Polygon, Arbitrum, Optimism…)',
    keywords: ['l2', 'layer2', 'layer 2', 'layer-2', 'scaling', 'rollup', 'rollups'],
  },
  {
    category: 'defi',
    label: 'DeFi',
    description: 'Decentralized finance tokens (Uniswap, Aave, Maker…)',
    keywords: ['defi', 'decentralized finance', 'decentralised finance', 'tvl', 'yield', 'liquidity'],
  },
  {
    category: 'stablecoin',
    label: 'Stablecoins',
    description: 'Price-stable tokens (USDT, USDC, DAI…)',
    keywords: ['stablecoin', 'stable coin', 'stable', 'usd', 'pegged'],
  },
  {
    category: 'meme',
    label: 'Meme coins',
    description: 'Community-driven meme tokens (DOGE, SHIB, PEPE…)',
    keywords: ['meme', 'memes', 'doge', 'shib', 'pepe', 'floki', 'bonk'],
  },
  {
    category: 'privacy',
    label: 'Privacy coins',
    description: 'Privacy-focused (Monero, Zcash, Dash…)',
    keywords: ['privacy', 'anonymous', 'monero', 'zcash', 'xmr'],
  },
  {
    category: 'oracle',
    label: 'Oracles',
    description: 'Data oracle networks (Chainlink, Pyth…)',
    keywords: ['oracle', 'oracles', 'chainlink', 'pyth', 'data feed'],
  },
  {
    category: 'ai',
    label: 'AI tokens',
    description: 'AI & ML tokens (Fetch.ai, Render, Bittensor…)',
    keywords: ['ai', 'ai token', 'ai tokens', 'artificial intelligence', 'machine learning', 'ml', 'render', 'bittensor', 'tao'],
  },
  {
    category: 'gaming',
    label: 'Gaming',
    description: 'GameFi & metaverse (Axie, Sandbox, MANA…)',
    keywords: ['gaming', 'game', 'gamefi', 'metaverse', 'play to earn', 'p2e'],
  },
  {
    category: 'exchange',
    label: 'Exchange tokens',
    description: 'Centralized exchange tokens (BNB, OKB, CRO…)',
    keywords: ['exchange', 'exchange token', 'cex', 'binance', 'bnb'],
  },
  {
    category: 'rwa',
    label: 'RWA',
    description: 'Real World Asset tokenization (Ondo, Maple…)',
    keywords: ['rwa', 'real world', 'real-world', 'tokenized', 'treasury', 'real estate'],
  },
  {
    category: 'lst',
    label: 'Liquid Staking',
    description: 'Liquid staking tokens (Lido, Rocket Pool…)',
    keywords: ['lst', 'liquid staking', 'staked', 'steth', 'lido'],
  },
];

// ─── Smart query templates ───────────────────────────────────────

interface SmartQueryTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Trigger keywords — if any appear in the query, this template fires */
  keywords: string[];
  /** Build the parsed query */
  build: (coins: SearchableCoin[]) => ParsedQuery;
}

const SMART_QUERY_TEMPLATES: SmartQueryTemplate[] = [
  {
    id: 'top-gainers',
    label: 'Top 24h Gainers',
    description: 'Biggest positive price moves in the last 24 hours',
    icon: 'trending-up',
    keywords: ['gainers', 'gainer', 'green', 'rising', 'pumping', 'bullish', 'winners'],
    build: () => ({ text: '', categories: [], sortKey: 'price_change_percentage_24h', sortDir: 'desc', limit: 20 }),
  },
  {
    id: 'top-losers',
    label: 'Top 24h Losers',
    description: 'Biggest negative price moves in the last 24 hours',
    icon: 'trending-down',
    keywords: ['losers', 'loser', 'red', 'falling', 'dumping', 'bearish', 'crashing'],
    build: () => ({ text: '', categories: [], sortKey: 'price_change_percentage_24h', sortDir: 'asc', limit: 20 }),
  },
  {
    id: 'high-volume',
    label: 'Highest Volume',
    description: 'Most traded coins by 24h volume',
    icon: 'bar-chart',
    keywords: ['high volume', 'volume', 'most traded', 'liquid', 'liquidity'],
    build: () => ({ text: '', categories: [], sortKey: 'total_volume', sortDir: 'desc', limit: 20 }),
  },
  {
    id: 'top-scored',
    label: 'Top AI Scores',
    description: 'Highest-rated coins by the 12-dimension ML engine',
    icon: 'brain',
    keywords: ['top score', 'best score', 'highest score', 'top rated', 'best rated', 'strong buy', 'buy signal'],
    build: () => ({ text: '', categories: [], scoreMin: 7, sortKey: 'aiScore', sortDir: 'desc', limit: 20 }),
  },
  {
    id: 'low-scored',
    label: 'Weakest AI Scores',
    description: 'Lowest-rated coins — potential sell signals',
    icon: 'brain-circuit',
    keywords: ['low score', 'worst score', 'weakest', 'sell signal', 'strong sell'],
    build: () => ({ text: '', categories: [], scoreMax: 4, sortKey: 'aiScore', sortDir: 'asc', limit: 20 }),
  },
  {
    id: 'top-10',
    label: 'Top 10 by Market Cap',
    description: 'The ten largest cryptocurrencies',
    icon: 'crown',
    keywords: ['top 10', 'top ten', 'top10', 'biggest'],
    build: () => ({ text: '', categories: [], sortKey: 'market_cap_rank', sortDir: 'asc', limit: 10 }),
  },
  {
    id: 'top-50',
    label: 'Top 50 by Market Cap',
    description: 'The fifty largest cryptocurrencies',
    icon: 'list-ordered',
    keywords: ['top 50', 'top fifty', 'top50'],
    build: () => ({ text: '', categories: [], sortKey: 'market_cap_rank', sortDir: 'asc', limit: 50 }),
  },
  {
    id: 'large-cap',
    label: 'Large Cap (>$10B)',
    description: 'Blue-chip cryptocurrencies with market cap over $10B',
    icon: 'building',
    keywords: ['large cap', 'large-cap', 'largecap', 'blue chip', 'big cap'],
    build: () => ({ text: '', categories: [], mcapTier: 'large' }),
  },
  {
    id: 'mid-cap',
    label: 'Mid Cap ($1B–$10B)',
    description: 'Established projects with $1B–$10B market cap',
    icon: 'layers',
    keywords: ['mid cap', 'mid-cap', 'midcap', 'medium cap'],
    build: () => ({ text: '', categories: [], mcapTier: 'mid' }),
  },
  {
    id: 'small-cap',
    label: 'Small Cap ($100M–$1B)',
    description: 'Emerging projects with $100M–$1B market cap',
    icon: 'sparkles',
    keywords: ['small cap', 'small-cap', 'smallcap'],
    build: () => ({ text: '', categories: [], mcapTier: 'small' }),
  },
  {
    id: 'micro-cap',
    label: 'Micro Cap (<$100M)',
    description: 'High-risk, high-reward micro-cap coins',
    icon: 'zap',
    keywords: ['micro cap', 'micro-cap', 'microcap', 'tiny cap'],
    build: () => ({ text: '', categories: [], mcapTier: 'micro' }),
  },
  {
    id: 'penny-coins',
    label: 'Penny Coins (<$1)',
    description: 'Coins trading under $1',
    icon: 'coins',
    keywords: ['penny', 'under $1', 'under 1', 'cheap', 'cheapest'],
    build: () => ({ text: '', categories: [], priceMax: 1, sortKey: 'current_price', sortDir: 'asc' }),
  },
  {
    id: 'high-confidence',
    label: 'High-Confidence Signals',
    description: 'Coins where the ML engine has high confidence in its score',
    icon: 'shield-check',
    keywords: ['high confidence', 'confident', 'reliable', 'trustworthy'],
    build: (coins) => ({
      text: '',
      categories: [],
      // No direct confidence filter in ParsedQuery, but we can pass a score threshold
      // as a proxy — high-confidence coins tend to have scores away from 5.
      scoreMin: 7,
      sortKey: 'aiScore',
      sortDir: 'desc',
      limit: Math.min(20, coins.length),
    }),
  },
];

// ─── Parser ───────────────────────────────────────────────────────

/**
 * Parse a raw search string into a structured ParsedQuery.
 * Extracts special syntax and removes it from the free-text portion.
 */
export function parseQuery(raw: string): ParsedQuery {
  const original = raw.trim();
  let text = original.toLowerCase();

  const result: ParsedQuery = {
    text: original,
    categories: [],
  };

  // ── 1. Score syntax: score>8, score>=8, score:7-9, score 7-9 ──
  const scoreGt = text.match(/\bscore\s*[>＝=]\s*(\d+(?:\.\d+)?)/);
  const scoreLt = text.match(/\bscore\s*[<]\s*(\d+(?:\.\d+)?)/);
  const scoreRange = text.match(/\bscore\s*[:]\s*(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
  const scoreRangeWord = text.match(/\bscore\s+(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)/);

  if (scoreRange) {
    result.scoreMin = clampScore(parseFloat(scoreRange[1]));
    result.scoreMax = clampScore(parseFloat(scoreRange[2]));
    text = text.replace(scoreRange[0], ' ');
  } else if (scoreRangeWord) {
    result.scoreMin = clampScore(parseFloat(scoreRangeWord[1]));
    result.scoreMax = clampScore(parseFloat(scoreRangeWord[2]));
    text = text.replace(scoreRangeWord[0], ' ');
  } else if (scoreGt) {
    // Support "score>8" and "score>=8"
    const op = scoreGt[0].match(/>=/) ? '>=' : '>';
    result.scoreMin = op === '>='
      ? clampScore(parseFloat(scoreGt[1]))
      : clampScore(parseFloat(scoreGt[1]) + 0.01);
    text = text.replace(scoreGt[0], ' ');
  }
  if (scoreLt) {
    result.scoreMax = clampScore(parseFloat(scoreLt[1]));
    text = text.replace(scoreLt[0], ' ');
  }

  // NL score synonyms
  if (/\b(high score|high rated|top rated|best rated|strong buy)\b/.test(text)) {
    if (result.scoreMin === undefined) result.scoreMin = 7;
    text = text.replace(/\b(high score|high rated|top rated|best rated|strong buy)\b/g, ' ');
  }
  if (/\b(low score|low rated|weak|strong sell)\b/.test(text)) {
    if (result.scoreMax === undefined) result.scoreMax = 4;
    text = text.replace(/\b(low score|low rated|weak|strong sell)\b/g, ' ');
  }

  // ── 2. Price syntax: price<1, under $1, between $10 and $100 ──
  const priceLt = text.match(/\b(?:price\s*)?[<]\s*\$?(\d+(?:\.\d+)?)/);
  const priceGt = text.match(/\b(?:price\s*)?[>]\s*\$?(\d+(?:\.\d+)?)/);
  const priceRange = text.match(/\bbetween\s+\$?(\d+(?:\.\d+)?)\s*(?:and|&|-|–|to)\s*\$?(\d+(?:\.\d+)?)\b/);

  if (priceRange) {
    result.priceMin = parseFloat(priceRange[1]);
    result.priceMax = parseFloat(priceRange[2]);
    text = text.replace(priceRange[0], ' ');
  } else {
    if (priceLt && !priceLt[0].includes('score')) {
      result.priceMax = parseFloat(priceLt[1]);
      text = text.replace(priceLt[0], ' ');
    }
    if (priceGt && !priceGt[0].includes('score')) {
      result.priceMin = parseFloat(priceGt[1]);
      text = text.replace(priceGt[0], ' ');
    }
  }

  // NL price synonyms
  const underMatch = text.match(/\bunder\s+\$?(\d+(?:\.\d+)?)\b/);
  if (underMatch) {
    result.priceMax = parseFloat(underMatch[1]);
    text = text.replace(underMatch[0], ' ');
  }
  const overMatch = text.match(/\b(?:over|above|more than)\s+\$?(\d+(?:\.\d+)?)\b/);
  if (overMatch) {
    result.priceMin = parseFloat(overMatch[1]);
    text = text.replace(overMatch[0], ' ');
  }

  // ── 3. Market cap tier ──
  if (/\b(?:large cap|large-cap|blue chip|big cap)\b/.test(text)) {
    result.mcapTier = 'large';
    text = text.replace(/\b(?:large cap|large-cap|blue chip|big cap)\b/g, ' ');
  } else if (/\b(?:mid cap|mid-cap|medium cap)\b/.test(text)) {
    result.mcapTier = 'mid';
    text = text.replace(/\b(?:mid cap|mid-cap|medium cap)\b/g, ' ');
  } else if (/\b(?:small cap|small-cap)\b/.test(text)) {
    result.mcapTier = 'small';
    text = text.replace(/\b(?:small cap|small-cap)\b/g, ' ');
  } else if (/\b(?:micro cap|micro-cap|tiny cap)\b/.test(text)) {
    result.mcapTier = 'micro';
    text = text.replace(/\b(?:micro cap|micro-cap|tiny cap)\b/g, ' ');
  }

  // ── 4. Limit: "top 10", "top 20", "top 50" ──
  const topN = text.match(/\btop\s+(\d{1,3})\b/);
  if (topN) {
    result.limit = Math.min(parseInt(topN[1], 10), 200);
    text = text.replace(topN[0], ' ');
    // Default sort: by score (smart) unless already specified
    if (!result.sortKey) result.sortKey = 'aiScore';
    if (!result.sortDir) result.sortDir = 'desc';
  }

  // ── 5. Sort directives ──
  if (/\b(?:gainers?|green|rising|pumping|bullish|winners?)\b/.test(text)) {
    result.sortKey = 'price_change_percentage_24h';
    result.sortDir = 'desc';
    if (!result.limit) result.limit = 20;
    text = text.replace(/\b(?:gainers?|green|rising|pumping|bullish|winners?)\b/g, ' ');
  } else if (/\b(?:losers?|red|falling|dumping|bearish|crashing)\b/.test(text)) {
    result.sortKey = 'price_change_percentage_24h';
    result.sortDir = 'asc';
    if (!result.limit) result.limit = 20;
    text = text.replace(/\b(?:losers?|red|falling|dumping|bearish|crashing)\b/g, ' ');
  }
  if (/\b(?:high volume|most traded|most liquid)\b/.test(text)) {
    result.sortKey = 'total_volume';
    result.sortDir = 'desc';
    if (!result.limit) result.limit = 20;
    text = text.replace(/\b(?:high volume|most traded|most liquid)\b/g, ' ');
  }
  if (/\b(?:trending|popular|hot)\b/.test(text)) {
    // Trending = high volume + positive 24h change
    result.sortKey = 'total_volume';
    result.sortDir = 'desc';
    if (!result.limit) result.limit = 20;
    text = text.replace(/\b(?:trending|popular|hot)\b/g, ' ');
  }

  // ── 6. Category keywords ──
  for (const syn of CATEGORY_SYNONYMS) {
    for (const kw of syn.keywords) {
      const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'g');
      if (re.test(text)) {
        if (!result.categories.includes(syn.category)) {
          result.categories.push(syn.category);
        }
        text = text.replace(re, ' ');
      }
    }
  }

  // Clean up remaining text
  result.text = text.replace(/\s+/g, ' ').trim();
  return result;
}

function clampScore(s: number): number {
  return Math.max(1, Math.min(10, s));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if `text` contains `keyword` as a whole word/phrase (word-boundary
 * match). This prevents false positives like "ai" matching inside "gainers".
 * For multi-word keywords (e.g. "ai tokens"), the boundary is applied around
 * the entire phrase.
 */
function containsKeyword(text: string, keyword: string): boolean {
  if (!keyword) return false;
  // For very short keywords (1-2 chars), require strict word boundaries
  // to avoid matching inside other words.
  const re = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
  return re.test(text);
}

// ─── Fuzzy matching ──────────────────────────────────────────────

/**
 * Lightweight Levenshtein distance (bounded — stops at maxDist+1).
 * Returns Infinity if distance exceeds maxDist.
 */
function boundedLevenshtein(a: string, b: string, maxDist: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > maxDist) return Infinity;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let best = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
      if (curr[j] < best) best = curr[j];
    }
    if (best > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/**
 * Score how well `query` matches `target` (0–100).
 * Combines:
 *   - Exact match (100)
 *   - Prefix match (85–95)
 *   - Word-start match (70–85)
 *   - Substring match (50–70)
 *   - Fuzzy (Levenshtein) match (0–60)
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!q || !t) return 0;

  // Exact
  if (q === t) return 100;

  // Prefix
  if (t.startsWith(q)) {
    // Longer target = slightly lower score (more ambiguity)
    return Math.max(85, 98 - (t.length - q.length) * 2);
  }

  // Word-start (e.g., "bit" matches "bitcoin cash")
  const words = t.split(/[\s\-_]+/);
  for (const w of words) {
    if (w.startsWith(q)) {
      return Math.max(75, 92 - (w.length - q.length) * 2);
    }
  }

  // Substring
  if (t.includes(q)) {
    return Math.max(55, 75 - (t.length - q.length));
  }

  // Token substring (each word)
  for (const w of words) {
    if (w.includes(q) && q.length >= 3) {
      return 60;
    }
  }

  // Fuzzy — only worthwhile for short queries (typos)
  if (q.length >= 3 && q.length <= 12) {
    const maxDist = q.length <= 4 ? 1 : 2;
    const dist = boundedLevenshtein(q, t, maxDist);
    if (dist !== Infinity) {
      const ratio = 1 - dist / Math.max(q.length, t.length);
      return Math.round(ratio * 55);
    }
    // Try against each word too (e.g., "bitoin" → "bitcoin" inside "bitcoin cash")
    for (const w of words) {
      if (Math.abs(w.length - q.length) > maxDist) continue;
      const d = boundedLevenshtein(q, w, maxDist);
      if (d !== Infinity) {
        const ratio = 1 - d / Math.max(q.length, w.length);
        return Math.round(ratio * 50);
      }
    }
  }

  return 0;
}

/**
 * Compute match score for a coin against the free-text query.
 * Returns the best score across name/symbol/id fields.
 */
function matchCoin(query: string, coin: SearchableCoin): { score: number; field: 'name' | 'symbol' | 'id' } {
  const nameScore = fuzzyScore(query, coin.name);
  const symScore = fuzzyScore(query, coin.symbol) * 1.15; // symbol boost
  const idScore = fuzzyScore(query, coin.id);

  let best = nameScore;
  let field: 'name' | 'symbol' | 'id' = 'name';
  if (symScore > best) {
    best = symScore;
    field = 'symbol';
  }
  if (idScore > best) {
    best = idScore;
    field = 'id';
  }
  return { score: Math.min(100, best), field };
}

// ─── Main search function ────────────────────────────────────────

/**
 * Run an intelligent search over a coin list.
 * Returns grouped results:
 *   - smartQueries: NL templates that match (gainers, top 10, etc.)
 *   - filters:      Category chips that match the text
 *   - coins:        Fuzzy-ranked coin matches (top 8)
 */
export function smartSearch(
  rawQuery: string,
  coins: SearchableCoin[],
  recentSearches: string[] = []
): SearchResults {
  const parsed = parseQuery(rawQuery);

  // ── Smart query suggestions ──
  // A template fires when one of its keywords appears in the raw query,
  // OR when the parsed query has a sort directive that maps to it.
  const smartQueries: SmartQueryMatch[] = [];
  const lower = rawQuery.toLowerCase().trim();

  if (lower.length >= 2) {
    for (const tpl of SMART_QUERY_TEMPLATES) {
      const matches = tpl.keywords.some((kw) =>
        containsKeyword(lower, kw.toLowerCase())
      );
      if (matches) {
        smartQueries.push({
          type: 'smart',
          id: tpl.id,
          label: tpl.label,
          description: tpl.description,
          icon: tpl.icon,
          parsed: tpl.build(coins),
        });
      }
    }
  }

  // ── Filter chip suggestions ──
  // Show category chips whose label/keywords match the text.
  const filters: FilterChipMatch[] = [];
  if (lower.length >= 2) {
    for (const syn of CATEGORY_SYNONYMS) {
      // Skip if the category is already in the parsed categories
      if (parsed.categories.includes(syn.category)) continue;
      const matches = syn.keywords.some((kw) =>
        containsKeyword(lower, kw.toLowerCase())
      );
      if (matches) {
        filters.push({
          type: 'filter',
          category: syn.category,
          label: syn.label,
          description: syn.description,
        });
      }
    }
  }

  // ── Coin fuzzy matches ──
  // Use the text portion of the parsed query (after stripping syntax).
  const coins_out: CoinMatch[] = [];
  const textQuery = parsed.text;

  if (textQuery.length >= 1) {
    const scored: Array<{ coin: SearchableCoin; score: number; field: 'name' | 'symbol' | 'id' }> = [];
    for (const coin of coins) {
      const { score, field } = matchCoin(textQuery, coin);
      if (score >= 30) {
        scored.push({ coin, score, field });
      }
    }
    // Sort: score desc, then market cap rank asc (prefer bigger coins on ties)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.coin.market_cap_rank - b.coin.market_cap_rank;
    });
    for (const s of scored.slice(0, 8)) {
      coins_out.push({
        type: 'coin',
        coin: s.coin,
        score: s.score,
        matchedField: s.field,
      });
    }
  }

  return { coins: coins_out, smartQueries, filters, parsed };
}

// ─── Apply a parsed query to filter+sort coins ───────────────────

/**
 * Apply a ParsedQuery (from selecting a smart query or hitting Enter)
 * to a coin list, returning the filtered + sorted + limited list.
 */
export function applyParsedQuery(
  coins: SearchableCoin[],
  parsed: ParsedQuery
): SearchableCoin[] {
  let out = coins;

  // Category filter
  if (parsed.categories.length > 0) {
    out = out.filter((c) => {
      const cats = detectCategories(c);
      return parsed.categories.some((cat) => cats.includes(cat));
    });
  }

  // Score range
  if (parsed.scoreMin !== undefined) {
    out = out.filter((c) => c.aiScore >= parsed.scoreMin!);
  }
  if (parsed.scoreMax !== undefined) {
    out = out.filter((c) => c.aiScore <= parsed.scoreMax!);
  }

  // Price range
  if (parsed.priceMin !== undefined) {
    out = out.filter((c) => c.current_price >= parsed.priceMin!);
  }
  if (parsed.priceMax !== undefined) {
    out = out.filter((c) => c.current_price <= parsed.priceMax!);
  }

  // Market cap tier
  if (parsed.mcapTier) {
    out = out.filter((c) => mcapTierOf(c.market_cap) === parsed.mcapTier);
  }

  // Free-text filter (in addition to fuzzy — exact substring on name/symbol)
  if (parsed.text) {
    const q = parsed.text.toLowerCase();
    out = out.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  // Sort
  if (parsed.sortKey) {
    const key = parsed.sortKey;
    const dir = parsed.sortDir === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[key] as number;
      const bv = b[key] as number;
      return (av - bv) * dir;
    });
  }

  // Limit
  if (parsed.limit) {
    out = out.slice(0, parsed.limit);
  }

  return out;
}

// ─── Convert ParsedQuery → ExternalFilters (for FilterBar sync) ──

export function parsedToExternalFilters(parsed: ParsedQuery): ExternalFilters {
  const filters: ExternalFilters = {};
  if (parsed.categories.length > 0) filters.categories = parsed.categories;
  if (parsed.scoreMin !== undefined) filters.scoreMin = parsed.scoreMin;
  if (parsed.scoreMax !== undefined) filters.scoreMax = parsed.scoreMax;
  if (parsed.mcapTier) filters.mcapTier = parsed.mcapTier;
  return filters;
}

// ─── Recent searches persistence ─────────────────────────────────

const RECENT_KEY = 'cryptointel-recent-searches';
const RECENT_MAX = 8;

export function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (typeof window === 'undefined') return;
  const q = query.trim();
  if (!q) return;
  try {
    const current = loadRecentSearches();
    const next = [q, ...current.filter((s) => s !== q)].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // ignore
  }
}

// ─── Default smart-query suggestions (when query is empty) ───────

export function defaultSmartQueries(coins: SearchableCoin[]): SmartQueryMatch[] {
  return SMART_QUERY_TEMPLATES.slice(0, 6).map((tpl) => ({
    type: 'smart' as const,
    id: tpl.id,
    label: tpl.label,
    description: tpl.description,
    icon: tpl.icon,
    parsed: tpl.build(coins),
  }));
}
