/**
 * News Sentiment Analyzer — Pure Algorithmic NLP (No LLM)
 *
 * Flow:
 * 1. Generate algorithmic market insights from CoinGecko data (PRIMARY - always available)
 * 2. Fetch crypto news from Binance & CryptoCompare APIs (optional - may be blocked in cloud)
 * 3. Analyze sentiment using lexicon-based NLP (AFINN + crypto-specific terms)
 * 4. Store results in NewsArticle table
 * 5. Return aggregated sentiment data
 *
 * NO LLM / NO AI text generation — all analysis is done algorithmically.
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface NewsItem {
  sourceUrl: string;
  sourceName: string;
  title: string;
  snippet: string;
  publishedAt: string;
  sentimentScore: number;  // -1 to +1
  sentimentLabel: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  impactScore: number;     // 0-10
  impactCategory: string;
  autoSummary: string;       // Auto-generated summary (algorithmic, not LLM)
  relevantCoins: string[];
}

export interface NewsSentimentResult {
  articles: NewsItem[];
  aggregateSentiment: number;  // -1 to +1
  sentimentDistribution: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
  topImpactCategory: string;
  averageImpactScore: number;
  coinSpecificSentiment: Record<string, { score: number; count: number }>;
}

// ═══════════════════════════════════════════════════════════════
// NEWS SOURCES (Public APIs — No LLM)
// ═══════════════════════════════════════════════════════════════

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  body: string;
  publishedOn: number;  // Unix timestamp
  categories: string;
}

// ═══════════════════════════════════════════════════════════════
// NEWS SOURCES (No LLM — all free public APIs)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch crypto news from Binance public API (no API key needed)
 * Uses multiple catalog IDs for broader coverage
 */
async function fetchBinanceNews(pageSize: number = 20): Promise<NewsArticle[]> {
  try {
    // Binance public CMS API — no auth required
    // catalogId=48 = New Listings, catalogId=49 = Latest News, catalogId=50 = Market Analysis
    const allArticles: NewsArticle[] = [];
    
    const catalogs = [
      { id: 49, name: 'Latest News' },
      { id: 50, name: 'Market Analysis' },
      { id: 48, name: 'New Listings' },
    ];
    
    for (const catalog of catalogs) {
      try {
        const url = `https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=${catalog.id}&pageNo=1&pageSize=${Math.ceil(pageSize / catalogs.length)}`;
        
        const response = await fetch(url, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; FinanceIntel/1.0)',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          console.warn(`[NewsSentiment] Binance catalog ${catalog.id} returned ${response.status}`);
          continue;
        }

        const json = await response.json();
        const cats = json?.data?.catalogs;
        if (!Array.isArray(cats)) {
          console.warn(`[NewsSentiment] Binance catalog ${catalog.id}: no catalogs in response, keys=${Object.keys(json ?? {}).join(',')}`);
          continue;
        }

        for (const cat of cats) {
          if (!Array.isArray(cat.articles)) continue;
          for (const a of cat.articles) {
            allArticles.push({
              title: (a.title as string) ?? '',
              url: `https://www.binance.com/en/news/flash/${a.id ?? ''}`,
              source: `Binance · ${catalog.name}`,
              body: (a.title as string) ?? '',
              publishedOn: typeof a.releaseDate === 'number' ? Math.floor(a.releaseDate / 1000) : Math.floor(Date.now() / 1000),
              categories: catalog.name,
            });
          }
        }
      } catch {
        // Skip individual catalog errors
      }
    }

    console.log(`[NewsSentiment] Binance: fetched ${allArticles.length} articles`);
    return allArticles;
  } catch (error) {
    console.error('[NewsSentiment] Binance news fetch error:', error);
    return [];
  }
}

/**
 * Fetch crypto news from CryptoCompare (requires API key, optional)
 */
async function fetchCryptoCompareNews(coinCategory?: string, limit: number = 30): Promise<NewsArticle[]> {
  try {
    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
    const categories = coinCategory ? `${coinCategory}` : '';
    let url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${encodeURIComponent(categories)}&limit=${limit}`;
    if (apiKey) {
      url += `&api_key=${apiKey}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`[NewsSentiment] CryptoCompare news API returned ${response.status}`);
      return [];
    }

    const json = await response.json();
    const data = json.Data;
    
    if (!Array.isArray(data)) {
      console.warn('[NewsSentiment] CryptoCompare news: invalid response format');
      return [];
    }

    return data.map((a: Record<string, unknown>) => ({
      title: (a.title as string) ?? '',
      url: (a.url as string) ?? '',
      source: (a.source as string) ?? 'CryptoCompare',
      body: (a.body as string) ?? '',
      publishedOn: (a.published_on as number) ?? Math.floor(Date.now() / 1000),
      categories: (a.categories as string) ?? '',
    }));
  } catch (error) {
    console.error('[NewsSentiment] CryptoCompare news fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// ALGORITHMIC MARKET INSIGHTS (from CoinGecko market data)
// ═══════════════════════════════════════════════════════════════

interface CoinDataForInsights {
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  ath: number;
  ath_change_percentage: number;
  aiScore?: number;
}

function generateMarketInsights(coins: CoinDataForInsights[]): NewsArticle[] {
  const now = Math.floor(Date.now() / 1000);
  const insights: NewsArticle[] = [];

  // 1. Top movers (significant price changes >3%)
  const bigMovers = coins
    .filter(c => Math.abs(c.price_change_percentage_24h) > 3)
    .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h));
  for (const coin of bigMovers.slice(0, 5)) {
    const direction = coin.price_change_percentage_24h > 0 ? 'surges' : 'plunges';
    const pct = Math.abs(coin.price_change_percentage_24h).toFixed(1);
    insights.push({
      title: `${coin.name} (${coin.symbol.toUpperCase()}) ${direction} ${pct}% in 24 hours`,
      url: `https://www.coingecko.com/en/coins/${coin.symbol.toLowerCase()}`,
      source: 'Market Data Analysis',
      body: `${coin.name} has ${direction === 'surges' ? 'surged' : 'plunged'} ${pct}% in the last 24 hours, currently trading at $${coin.current_price.toLocaleString()}. ${direction === 'surges' ? 'The rally comes with strong volume, indicating genuine market interest.' : 'The decline is accompanied by increased selling pressure.'}`,
      publishedOn: now,
      categories: 'market',
    });
  }

  // 2. ATH proximity alerts
  const nearATH = coins
    .filter(c => c.ath > 0 && Math.abs(c.ath_change_percentage) < 15)
    .sort((a, b) => a.ath_change_percentage - b.ath_change_percentage);
  for (const coin of nearATH.slice(0, 3)) {
    const pctFromATH = Math.abs(coin.ath_change_percentage).toFixed(1);
    insights.push({
      title: `${coin.name} (${coin.symbol.toUpperCase()}) is ${pctFromATH}% away from all-time high`,
      url: `https://www.coingecko.com/en/coins/${coin.symbol.toLowerCase()}`,
      source: 'ATH Monitor',
      body: `${coin.name} is currently ${pctFromATH}% below its all-time high of $${coin.ath.toLocaleString()}, trading at $${coin.current_price.toLocaleString()}. Proximity to ATH often signals strong momentum and potential breakout.`,
      publishedOn: now,
      categories: 'market',
    });
  }

  // 3. Volume leaders
  const volumeLeaders = [...coins].sort((a, b) => b.total_volume - a.total_volume).slice(0, 3);
  for (const coin of volumeLeaders) {
    const volToMcap = ((coin.market_cap > 0 ? coin.total_volume / coin.market_cap : 0) * 100).toFixed(1);
    insights.push({
      title: `${coin.name} leads trading volume with $${(coin.total_volume / 1e9).toFixed(1)}B (${volToMcap}% of market cap)`,
      url: `https://www.coingecko.com/en/coins/${coin.symbol.toLowerCase()}`,
      source: 'Volume Analysis',
      body: `${coin.name} has a 24h trading volume of $${(coin.total_volume / 1e9).toFixed(1)}B, representing ${volToMcap}% of its market capitalization. ${parseFloat(volToMcap) > 10 ? 'High volume-to-market-cap ratio suggests strong market activity.' : 'Moderate volume levels indicate steady trading conditions.'}`,
      publishedOn: now,
      categories: 'market',
    });
  }

  // 4. Score-based insights
  const scoredCoins = coins.filter(c => c.aiScore !== undefined);
  if (scoredCoins.length > 0) {
    const bullish = scoredCoins.filter(c => c.aiScore! >= 7).sort((a, b) => b.aiScore! - a.aiScore!);
    const bearish = scoredCoins.filter(c => c.aiScore! < 4).sort((a, b) => a.aiScore! - b.aiScore!);
    if (bullish.length > 0) {
      insights.push({
        title: `ML Scoring highlights bullish signals: ${bullish.slice(0, 3).map(c => c.name).join(', ')}`,
        url: '#',
        source: 'ML Score Analysis',
        body: `The multi-dimensional ML scoring system identifies ${bullish.length} assets with bullish scores (≥7/10). Top picks: ${bullish.slice(0, 3).map(c => `${c.name} (${c.aiScore!.toFixed(1)})`).join(', ')}.`,
        publishedOn: now,
        categories: 'market',
      });
    }
    if (bearish.length > 0) {
      insights.push({
        title: `ML Scoring flags bearish conditions: ${bearish.slice(0, 3).map(c => c.name).join(', ')}`,
        url: '#',
        source: 'ML Score Analysis',
        body: `The multi-dimensional ML scoring system identifies ${bearish.length} assets with bearish scores (<4/10). Affected: ${bearish.slice(0, 3).map(c => `${c.name} (${c.aiScore!.toFixed(1)})`).join(', ')}.`,
        publishedOn: now,
        categories: 'market',
      });
    }
  }

  // 5. Market overview
  const totalMcap = coins.reduce((s, c) => s + c.market_cap, 0);
  const avgChange = coins.reduce((s, c) => s + c.price_change_percentage_24h, 0) / coins.length;
  const positiveCount = coins.filter(c => c.price_change_percentage_24h > 0).length;
  const marketDirection = avgChange > 0.5 ? 'bullish' : avgChange < -0.5 ? 'bearish' : 'neutral';
  insights.push({
    title: `Market Overview: $${(totalMcap / 1e12).toFixed(2)}T cap, ${marketDirection} sentiment with ${positiveCount}/${coins.length} coins green`,
    url: '#',
    source: 'Market Overview',
    body: `The crypto market shows ${marketDirection} conditions with an average 24h change of ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%. ${positiveCount} out of ${coins.length} tracked assets are in positive territory.`,
    publishedOn: now,
    categories: 'macro',
  });

  return insights;
}

// Map coinId to CryptoCompare category
const categoryMap: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'solana': 'SOL',
  'ripple': 'XRP',
  'cardano': 'ADA',
  'dogecoin': 'DOGE',
  'polkadot': 'DOT',
  'chainlink': 'LINK',
  'litecoin': 'LTC',
  'uniswap': 'UNI',
  'avalanche-2': 'AVAX',
  'tron': 'TRX',
  'stellar': 'XLM',
  'cosmos': 'ATOM',
  'monero': 'XMR',
  'shiba-inu': 'SHIB',
  'binancecoin': 'BNB',
};

/**
 * Fetch news from all available sources, aggregate and deduplicate.
 * Algorithmic market insights are the PRIMARY source (always available).
 */
async function fetchAllNews(coinId?: string): Promise<NewsArticle[]> {
  // 1. Generate algorithmic insights from our market data (PRIMARY - always available)
  let algorithmicInsights: NewsArticle[] = [];
  try {
    const { fetchMarketData } = await import('@/lib/crypto-api');
    const result = await fetchMarketData(200);
    const coins = result.data;
    if (coins && coins.length > 0) {
      algorithmicInsights = generateMarketInsights(coins.map(c => ({
        symbol: c.symbol,
        name: c.name,
        current_price: c.current_price,
        price_change_percentage_24h: c.price_change_percentage_24h,
        total_volume: c.total_volume,
        market_cap: c.market_cap,
        ath: c.ath,
        ath_change_percentage: c.ath_change_percentage,
        aiScore: (c as Record<string, unknown>).aiScore as number | undefined,
      })));
    }
  } catch (error) {
    console.error('[NewsSentiment] Algorithmic insights error:', error);
  }

  // 2. Try external sources (optional - may be blocked in cloud)
  const [binanceArticles, ccArticles] = await Promise.all([
    fetchBinanceNews(20),
    fetchCryptoCompareNews(coinId ? (categoryMap[coinId] ?? '') : undefined, 30),
  ]);

  const allArticles = [...algorithmicInsights, ...binanceArticles, ...ccArticles];

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = allArticles.filter(a => {
    const key = a.title.toLowerCase().trim().substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[NewsSentiment] Fetched ${unique.length} articles (Algorithmic: ${algorithmicInsights.length}, Binance: ${binanceArticles.length}, CryptoCompare: ${ccArticles.length})`);
  return unique;
}

// ═══════════════════════════════════════════════════════════════
// SENTIMENT LEXICON (AFINN-inspired + crypto-specific terms)
// ═══════════════════════════════════════════════════════════════

/**
 * Crypto-specific sentiment lexicon — word → score (-5 to +5)
 * Based on AFINN methodology adapted for financial/crypto domain
 */
const SENTIMENT_LEXICON: Record<string, number> = {
  // Strong positive
  'surge': 4, 'soar': 4, 'moon': 4, 'rally': 3, 'bullish': 4, 'breakout': 3,
  'adoption': 3, 'approve': 4, 'approved': 4, 'approval': 4, 'launch': 3,
  'partnership': 3, 'institutional': 3, 'accumulate': 2, 'upgrade': 3,
  'milestone': 3, 'all-time high': 4, 'ath': 3, 'outperform': 3,
  'boom': 3, 'thrive': 3, 'skyrocket': 4, 'pump': 2,
  'gain': 2, 'gains': 2, 'profit': 2, 'profitable': 3, 'grow': 2,
  'growth': 2, 'growing': 2, 'grown': 2, 'recovery': 3, 'recover': 3,
  'recovered': 3, 'positive': 2, 'optimism': 3, 'optimistic': 3,
  'bull': 3, 'bullrun': 4, 'bull-run': 4,
  'whale buy': 4, 'buy wall': 3, 'support': 2, 'supported': 2,
  'success': 3, 'successful': 3, 'win': 3, 'winner': 3,
  'sec approve': 5, 'etf approve': 5, 'etf approval': 5,
  'mainnet': 2, 'staking': 2, 'defi growth': 3, 'tvl increase': 3,
  
  // Moderate positive
  'rise': 2, 'rising': 2, 'rose': 2, 'climb': 2, 'climbing': 2,
  'increase': 2, 'increased': 2, 'increasing': 2, 'higher': 2,
  'up': 1, 'uptrend': 2, 'bounce': 2, 'bounced': 2,
  'stable': 1, 'stability': 1, 'hold': 1, 'holding': 1,
  'strong': 2, 'strength': 2, 'resilient': 2, 'resilience': 2,
  'opportunity': 2, 'potential': 2, 'promising': 2,
  'innovation': 2, 'innovative': 2, 'develop': 2, 'development': 2,
  'expand': 2, 'expansion': 2, 'boost': 2, 'boosted': 2,
  'confidence': 2, 'confident': 2, 'demand': 2,

  // Moderate negative
  'fall': -2, 'falling': -2, 'fell': -2, 'drop': -2, 'dropping': -2,
  'dropped': -2, 'decline': -2, 'declined': -2, 'declining': -2,
  'decrease': -2, 'decreased': -2, 'lower': -2, 'downturn': -2,
  'down': -1, 'dip': -1, 'dipped': -1, 'correction': -2,
  'weak': -2, 'weakness': -2, 'struggle': -2, 'struggling': -2,
  'uncertain': -2, 'uncertainty': -2, 'risk': -1, 'risky': -2,
  'concern': -2, 'concerns': -2, 'worried': -2, 'worry': -2,
  'loss': -2, 'losses': -2, 'sell': -1, 'selling': -2, 'selloff': -3,
  'sell-off': -3, 'pressure': -2, 'selling pressure': -3,
  'volatile': -2, 'volatility': -2, 'caution': -2, 'cautious': -2,
  'cautiously': -2, 'hesitant': -2, 'hesitation': -2,

  // Strong negative
  'crash': -5, 'crashed': -5, 'crashing': -5, 'plunge': -4, 'plunged': -4,
  'tank': -4, 'tanked': -4, 'collapse': -5, 'collapsed': -5, 'collapsing': -5,
  'bearish': -4, 'bear': -3, 'bearishness': -3,
  'ban': -4, 'banned': -5, 'banish': -4, 'prohibit': -4, 'prohibited': -4,
  'hack': -5, 'hacked': -5, 'hacking': -5, 'exploit': -4, 'exploited': -4,
  'breach': -4, 'breached': -4, 'vulnerability': -3, 'vulnerable': -3,
  'scam': -5, 'scammer': -5, 'fraud': -5, 'fraudulent': -5, 'ponzi': -5,
  'rugpull': -5, 'rug pull': -5, 'rug-pull': -5,
  'sec reject': -4, 'sec deny': -4, 'etf reject': -4, 'rejected': -4,
  'rejection': -4, 'lawsuit': -4, 'sue': -3, 'sued': -4, 'legal action': -3,
  'delist': -5, 'delisted': -5, 'delisting': -5,
  'liquidate': -3, 'liquidation': -3, 'liquidated': -3,
  'insolvency': -5, 'insolvent': -5, 'bankrupt': -5, 'bankruptcy': -5,
  'frozen': -4, 'freeze': -4, 'halt': -4, 'halted': -4, 'suspended': -4,
  'investigation': -3, 'investigated': -3, 'penalty': -3, 'fined': -3,
  'panic': -4, 'capitulation': -4, 'capitulate': -4,
  'bloodbath': -5, 'massacre': -5, 'carnage': -4,
  'depeg': -5, 'depegged': -5,
};

// ═══════════════════════════════════════════════════════════════
// IMPACT CATEGORY KEYWORDS
// ═══════════════════════════════════════════════════════════════

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  regulatory: [
    'sec', 'regulation', 'regulatory', 'compliance', 'ban', 'banned', 'lawsuit',
    'legal', 'law', 'court', 'judge', 'ruling', 'enforcement', 'fine', 'fined',
    'congress', 'senate', 'legislation', 'legislative', 'policy', 'policies',
    'kyc', 'aml', 'sanctions', 'license', 'licensed', 'approve', 'approval',
    'rejected', 'rejection', 'etf', 'subclassification',
  ],
  technology: [
    'upgrade', 'fork', 'protocol', 'smart contract', 'layer', 'scaling',
    'consensus', 'validator', 'node', 'mainnet', 'testnet', 'deploy',
    'implementation', 'release', 'version', 'update', 'patch', 'bug',
    'fix', 'vulnerability', 'security', 'secure', 'encryption',
    'zero-knowledge', 'zk', 'rollup', 'sharding', 'interop',
    'merge', 'roadmap', 'milestone', 'github', 'commit', 'dev',
  ],
  market: [
    'price', 'volume', 'market cap', 'trading', 'trader', 'exchange',
    'order book', 'liquidity', 'whale', 'institutional', 'otc',
    'rally', 'crash', 'dump', 'pump', 'correction', 'support',
    'resistance', 'breakout', 'breakdown', 'trend', 'bullish', 'bearish',
    'ath', 'all-time high', 'bottom', 'top', 'accumulation',
    'distribution', 'sell-off', 'buyback', 'buy wall', 'sell wall',
  ],
  adoption: [
    'adoption', 'adopt', 'accepted', 'payment', 'merchant', 'retail',
    'partner', 'partnership', 'integration', 'integrate', 'launch',
    'announce', 'announcement', 'use case', 'real-world', 'enterprise',
    'bank', 'banking', 'financial', 'fintech', 'app', 'wallet',
    'user', 'users', 'growth', 'growing', 'mainstream', 'mass',
  ],
  security: [
    'hack', 'hacked', 'exploit', 'breach', 'attack', 'stolen', 'theft',
    'vulnerability', 'vulnerable', 'bug', 'flaw', 'risk', 'threat',
    'malware', 'phishing', 'scam', 'fraud', 'fraudulent', 'rug pull',
    'rugpull', 'ponzi', 'audit', 'audited', 'certik', 'rekt',
    'insolvency', 'insolvent', 'bankrupt', 'bankruptcy', 'exploited',
  ],
  macro: [
    'fed', 'federal reserve', 'interest rate', 'inflation', 'deflation',
    'recession', 'gdp', 'employment', 'cpi', 'monetary', 'fiscal',
    'treasury', 'bond', 'yield', 'dollar', 'dxy', 'currency',
    'geopolitical', 'war', 'conflict', 'sanctions', 'trade',
    'global', 'economy', 'economic', 'central bank', 'quantitative',
    'stimulus', 'tapering', 'hawkish', 'dovish',
  ],
};

// ═══════════════════════════════════════════════════════════════
// COIN NAME/SYMBOL MAPPING
// ═══════════════════════════════════════════════════════════════

const COIN_IDENTIFIERS: Record<string, string[]> = {
  'bitcoin': ['bitcoin', 'btc', '₿'],
  'ethereum': ['ethereum', 'eth', 'ether'],
  'tether': ['tether', 'usdt'],
  'binancecoin': ['bnb', 'binance coin', 'binance'],
  'solana': ['solana', 'sol'],
  'ripple': ['xrp', 'ripple'],
  'usd-coin': ['usdc', 'usd coin'],
  'cardano': ['cardano', 'ada'],
  'dogecoin': ['dogecoin', 'doge'],
  'tron': ['tron', 'trx'],
  'polkadot': ['polkadot', 'dot'],
  'chainlink': ['chainlink', 'link'],
  'avalanche-2': ['avalanche', 'avax'],
  'litecoin': ['litecoin', 'ltc'],
  'uniswap': ['uniswap', 'uni'],
  'stellar': ['stellar', 'xlm'],
  'cosmos': ['cosmos', 'atom'],
  'monero': ['monero', 'xmr'],
  'shiba-inu': ['shiba inu', 'shib', 'shibarium'],
  'toncoin': ['ton', 'toncoin'],
};

// ═══════════════════════════════════════════════════════════════
// ALGORITHMIC SENTIMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Tokenize text into lowercase words for lexicon matching
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Analyze sentiment of a text using lexicon-based approach
 * Returns a score from -1.0 (very negative) to +1.0 (very positive)
 */
function analyzeSentiment(text: string): { score: number; wordCount: number; matchedTerms: number } {
  const tokens = tokenize(text);
  
  // Also check for multi-word phrases
  const textLower = text.toLowerCase();
  
  let totalScore = 0;
  let matchedTerms = 0;
  
  // Single-word matching
  for (const token of tokens) {
    if (SENTIMENT_LEXICON[token] !== undefined) {
      totalScore += SENTIMENT_LEXICON[token];
      matchedTerms++;
    }
  }
  
  // Multi-word phrase matching
  for (const phrase of Object.keys(SENTIMENT_LEXICON)) {
    if (phrase.includes(' ') && textLower.includes(phrase)) {
      totalScore += SENTIMENT_LEXICON[phrase];
      matchedTerms++;
    }
  }
  
  if (matchedTerms === 0) return { score: 0, wordCount: tokens.length, matchedTerms: 0 };
  
  // Normalize: typical matched score range is roughly -15 to +15
  // We want to map this to -1 to +1
  const normalized = totalScore / Math.max(matchedTerms * 3, 1);
  const clamped = Math.max(-1, Math.min(1, normalized));
  
  return { score: Math.round(clamped * 100) / 100, wordCount: tokens.length, matchedTerms };
}

/**
 * Classify sentiment label from score
 */
function classifySentiment(score: number): 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' {
  if (score >= 0.5) return 'very_positive';
  if (score >= 0.15) return 'positive';
  if (score <= -0.5) return 'very_negative';
  if (score <= -0.15) return 'negative';
  return 'neutral';
}

/**
 * Determine impact category from text using keyword matching
 */
function classifyImpactCategory(text: string): string {
  const textLower = text.toLowerCase();
  const scores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      // Count occurrences
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        scores[category] += matches.length;
      }
    }
  }
  
  // Return category with highest score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] > 0 ? sorted[0][0] : 'market';
}

/**
 * Calculate impact score (0-10) based on text features
 */
function calculateImpactScore(text: string, sentimentScore: number): number {
  let impact = 3; // baseline
  
  // Higher absolute sentiment → higher impact
  impact += Math.abs(sentimentScore) * 3;
  
  // Strong signal words increase impact
  const strongSignals = ['sec', 'etf', 'ban', 'hack', 'crash', 'rally', 'approve', 'reject', 'fed', 'collapse'];
  const textLower = text.toLowerCase();
  for (const signal of strongSignals) {
    if (textLower.includes(signal)) {
      impact += 0.5;
    }
  }
  
  // All-time high / all-time low mentions increase impact
  if (textLower.includes('all-time') || textLower.includes('ath') || textLower.includes('atl')) {
    impact += 1;
  }
  
  return Math.max(0, Math.min(10, Math.round(impact * 10) / 10));
}

/**
 * Extract relevant coins from text
 */
function extractRelevantCoins(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: string[] = [];
  
  for (const [coinId, identifiers] of Object.entries(COIN_IDENTIFIERS)) {
    for (const identifier of identifiers) {
      // Use word boundary matching for short identifiers
      if (identifier.length <= 3) {
        const regex = new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
          if (!found.includes(coinId)) found.push(coinId);
          break;
        }
      } else {
        if (textLower.includes(identifier)) {
          if (!found.includes(coinId)) found.push(coinId);
          break;
        }
      }
    }
  }
  
  return found;
}

/**
 * Generate algorithmic summary from title + snippet
 * (No LLM — uses keyword extraction and template-based summarization)
 */
function generateAlgorithmicSummary(
  title: string,
  snippet: string,
  sentimentLabel: string,
  impactCategory: string,
  relevantCoins: string[],
): string {
  const parts: string[] = [];
  
  // Coin mentions
  if (relevantCoins.length > 0) {
    const coinNames = relevantCoins
      .map(id => COIN_IDENTIFIERS[id]?.[0] ?? id)
      .join(', ');
    parts.push(`Related to ${coinNames}`);
  }
  
  // Sentiment + category
  const sentimentPhrases: Record<string, string> = {
    'very_positive': 'Strongly positive signals',
    'positive': 'Positive developments',
    'neutral': 'Mixed or neutral signals',
    'negative': 'Negative developments',
    'very_negative': 'Strongly negative signals',
  };
  
  const categoryPhrases: Record<string, string> = {
    'regulatory': 'in regulatory context',
    'technology': 'regarding technology',
    'market': 'in market activity',
    'adoption': 'in adoption trends',
    'security': 'regarding security',
    'macro': 'in macro environment',
  };
  
  const sentimentPhrase = sentimentPhrases[sentimentLabel] ?? 'Mixed signals';
  const categoryPhrase = categoryPhrases[impactCategory] ?? '';
  
  if (categoryPhrase) {
    parts.push(`${sentimentPhrase} ${categoryPhrase}`);
  } else {
    parts.push(sentimentPhrase);
  }
  
  // Extract key action words from title
  const actionWords: string[] = [];
  const actionPatterns = [
    { pattern: /\b(surge[sd]?|soar[sd]?|rally|rallied|jump[sd]?|climb[sd]?)\b/i, label: 'price surge' },
    { pattern: /\b(crash[sd]?|plunge[sd]?|tank[sd]?|drop[sd]?|fall[sd]?)\b/i, label: 'price decline' },
    { pattern: /\b(approve[sd]?|approval|etf)\b/i, label: 'regulatory approval' },
    { pattern: /\b(ban[sd]?|banned|reject[sd]?|rejection)\b/i, label: 'regulatory rejection' },
    { pattern: /\b(hack[sd]?|exploit[sd]?|breach[sd]?)\b/i, label: 'security incident' },
    { pattern: /\b(launch|launching|launched|deploy)\b/i, label: 'new launch' },
    { pattern: /\b(partner|partnership|integrat)\b/i, label: 'partnership' },
    { pattern: /\b(upgrade|fork|merge|update)\b/i, label: 'protocol update' },
  ];
  
  for (const { pattern, label } of actionPatterns) {
    if (pattern.test(title)) {
      actionWords.push(label);
    }
  }
  
  if (actionWords.length > 0) {
    parts.push(`Key: ${actionWords.slice(0, 2).join(', ')}`);
  }
  
  return parts.join(' — ');
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch and analyze crypto news using pure algorithmic NLP
 */
export async function fetchAndAnalyzeNews(
  coinId?: string,
  coinName?: string,
  forceRefresh: boolean = false
): Promise<NewsSentimentResult> {
  // Check if we have recent cached news (< 1 hour old)
  if (!forceRefresh) {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const cachedArticles = await db.newsArticle.findMany({
      where: {
        ...(coinId ? { coinId } : {}),
        fetchedAt: { gte: oneHourAgo },
      },
      orderBy: { fetchedAt: 'desc' },
      take: 20,
    });

    if (cachedArticles.length >= 5) {
      console.log(`[NewsSentiment] Using ${cachedArticles.length} cached articles`);
      return buildResultFromArticles(cachedArticles.map(a => ({
        sourceUrl: a.sourceUrl,
        sourceName: a.sourceName ?? '',
        title: a.title,
        snippet: a.snippet ?? '',
        publishedAt: a.publishedAt ?? '',
        sentimentScore: a.sentimentScore ?? 0,
        sentimentLabel: (a.sentimentLabel as NewsItem['sentimentLabel']) ?? 'neutral',
        impactScore: a.impactScore ?? 3,
        impactCategory: a.impactCategory ?? 'market',
        autoSummary: a.aiSummary ?? '',
        relevantCoins: a.relevantCoins ? JSON.parse(a.relevantCoins) : [],
      })));
    }
  }

  // Fetch news from all available sources
  const rawNews = await fetchAllNews(coinId);

  if (rawNews.length === 0) {
    return emptyResult();
  }

  return processNewsArticles(rawNews, coinId);
}

/**
 * Process raw news articles through our algorithmic pipeline
 */
async function processNewsArticles(
  rawNews: NewsArticle[],
  coinId?: string
): Promise<NewsSentimentResult> {
  // Analyze each article algorithmically
  const newsItems: NewsItem[] = rawNews.map(article => {
    const fullText = `${article.title} ${article.body ?? ''}`;
    const titleText = article.title;
    
    // 1. Sentiment analysis (lexicon-based)
    const { score: sentimentScore } = analyzeSentiment(fullText);
    const sentimentLabel = classifySentiment(sentimentScore);
    
    // 2. Impact category (keyword matching)
    const impactCategory = classifyImpactCategory(fullText);
    
    // 3. Impact score (algorithmic)
    const impactScore = calculateImpactScore(fullText, sentimentScore);
    
    // 4. Relevant coins (entity extraction)
    const relevantCoins = extractRelevantCoins(fullText);
    
    // 5. Algorithmic summary (template-based)
    const autoSummary = generateAlgorithmicSummary(
      titleText,
      article.body ?? '',
      sentimentLabel,
      impactCategory,
      relevantCoins,
    );
    
    return {
      sourceUrl: article.url,
      sourceName: article.source,
      title: article.title,
      snippet: (article.body ?? '').substring(0, 300),
      publishedAt: new Date(article.publishedOn * 1000).toISOString(),
      sentimentScore,
      sentimentLabel,
      impactScore,
      impactCategory,
      autoSummary,
      relevantCoins,
    };
  });

  // Store in database
  await storeNewsArticles(newsItems, coinId);

  return buildResultFromArticles(newsItems);
}

/**
 * Store news articles in the database
 */
async function storeNewsArticles(articles: NewsItem[], coinId?: string): Promise<void> {
  for (const article of articles) {
    try {
      await db.newsArticle.upsert({
        where: { sourceUrl: article.sourceUrl },
        create: {
          coinId: coinId ?? null,
          sourceUrl: article.sourceUrl,
          sourceName: article.sourceName,
          title: article.title,
          snippet: article.snippet,
          publishedAt: article.publishedAt,
          sentimentScore: article.sentimentScore,
          sentimentLabel: article.sentimentLabel,
          impactScore: article.impactScore,
          impactCategory: article.impactCategory,
          aiSummary: article.autoSummary,
          relevantCoins: JSON.stringify(article.relevantCoins),
          searchQuery: coinId ? `${coinId} crypto news` : 'crypto market news',
        },
        update: {
          sentimentScore: article.sentimentScore,
          sentimentLabel: article.sentimentLabel,
          impactScore: article.impactScore,
          impactCategory: article.impactCategory,
          aiSummary: article.autoSummary,
          relevantCoins: JSON.stringify(article.relevantCoins),
        },
      });
    } catch (error) {
      // Skip individual insert errors
      console.error('[NewsSentiment] Error storing article:', error);
    }
  }
}

/**
 * Get latest cached news
 */
export async function getLatestNews(coinId?: string, limit: number = 20): Promise<NewsItem[]> {
  try {
    const articles = await db.newsArticle.findMany({
      where: coinId ? { coinId } : {},
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });

    return articles.map(a => ({
      sourceUrl: a.sourceUrl ?? '',
      sourceName: a.sourceName ?? '',
      title: a.title ?? '',
      snippet: a.snippet ?? '',
      publishedAt: a.publishedAt ?? '',
      sentimentScore: a.sentimentScore ?? 0,
      sentimentLabel: (a.sentimentLabel as NewsItem['sentimentLabel']) ?? 'neutral',
      impactScore: a.impactScore ?? 3,
      impactCategory: a.impactCategory ?? 'market',
      aiSummary: a.aiSummary ?? '',
      relevantCoins: a.relevantCoins ? JSON.parse(a.relevantCoins) : [],
    }));
  } catch (error) {
    console.warn('[NewsSentiment] getLatestNews failed:', error);
    return [];
  }
}

/**
 * Build aggregated result from news items
 */
function buildResultFromArticles(articles: NewsItem[]): NewsSentimentResult {
  if (articles.length === 0) return emptyResult();

  // Aggregate sentiment
  const totalSentiment = articles.reduce((sum, a) => sum + a.sentimentScore, 0);
  const aggregateSentiment = totalSentiment / articles.length;

  // Sentiment distribution
  const distribution = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
  for (const a of articles) {
    distribution[a.sentimentLabel]++;
  }

  // Top impact category
  const categoryCount: Record<string, number> = {};
  for (const a of articles) {
    categoryCount[a.impactCategory] = (categoryCount[a.impactCategory] ?? 0) + 1;
  }
  const topImpactCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'market';

  // Average impact
  const avgImpact = articles.reduce((sum, a) => sum + a.impactScore, 0) / articles.length;

  // Per-coin sentiment
  const coinSentiment: Record<string, { score: number; count: number }> = {};
  for (const a of articles) {
    for (const coin of a.relevantCoins) {
      if (!coinSentiment[coin]) {
        coinSentiment[coin] = { score: 0, count: 0 };
      }
      coinSentiment[coin].score += a.sentimentScore;
      coinSentiment[coin].count++;
    }
  }
  // Average the coin sentiments
  for (const coin of Object.keys(coinSentiment)) {
    coinSentiment[coin].score /= coinSentiment[coin].count;
  }

  return {
    articles,
    aggregateSentiment: Math.round(aggregateSentiment * 100) / 100,
    sentimentDistribution: distribution,
    topImpactCategory,
    averageImpactScore: Math.round(avgImpact * 10) / 10,
    coinSpecificSentiment: coinSentiment,
  };
}

function emptyResult(): NewsSentimentResult {
  return {
    articles: [],
    aggregateSentiment: 0,
    sentimentDistribution: { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 },
    topImpactCategory: 'market',
    averageImpactScore: 0,
    coinSpecificSentiment: {},
  };
}

/**
 * Get a quick sentiment score for a coin (for scoring engine integration)
 * Returns a 1-10 score based on recent news sentiment
 */
export async function getCoinNewsSentimentScore(coinId: string, coinName: string): Promise<{
  overallScore: number;        // 1-10 scale
  sentimentScore: number;      // -1 to +1
  impactScore: number;         // 0-10
  articleCount: number;
}> {
  // Check cache first
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  let cachedArticles = await db.newsArticle.findMany({
    where: {
      OR: [
        { coinId },
        { relevantCoins: { contains: coinId } },
      ],
      fetchedAt: { gte: oneHourAgo },
    },
    orderBy: { fetchedAt: 'desc' },
    take: 10,
  });

  // If no cached articles, fetch fresh ones
  if (cachedArticles.length < 3) {
    const result = await fetchAndAnalyzeNews(coinId, coinName, true);
    cachedArticles = await db.newsArticle.findMany({
      where: {
        OR: [
          { coinId },
          { relevantCoins: { contains: coinId } },
        ],
      },
      orderBy: { fetchedAt: 'desc' },
      take: 10,
    });
  }

  if (cachedArticles.length === 0) {
    return { overallScore: 5, sentimentScore: 0, impactScore: 3, articleCount: 0 };
  }

  const avgSentiment = cachedArticles.reduce((s, a) => s + (a.sentimentScore ?? 0), 0) / cachedArticles.length;
  const avgImpact = cachedArticles.reduce((s, a) => s + (a.impactScore ?? 3), 0) / cachedArticles.length;

  // Convert sentiment (-1 to +1) to score (1-10)
  const overallScore = Math.round(((avgSentiment + 1) / 2) * 9 + 1);

  return {
    overallScore: Math.max(1, Math.min(10, overallScore)),
    sentimentScore: Math.round(avgSentiment * 100) / 100,
    impactScore: Math.round(avgImpact * 10) / 10,
    articleCount: cachedArticles.length,
  };
}
