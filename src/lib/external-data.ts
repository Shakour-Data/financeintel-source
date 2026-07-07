/**
 * External Market Data API Layer
 *
 * Fetches real-time data from free public APIs to replace mock/placeholder data
 * in the crypto AI scoring dashboard. Each API call is backed by in-memory caching
 * with configurable TTL and robust error handling.
 *
 * Data Sources:
 * 1. Alternative.me — Fear & Greed Index (Market Psychology, dim 4/8)
 * 2. DeFiLlama — TVL & protocol data (Ecosystem & DeFi, dim 11)
 * 3. Yahoo Finance — Macro indicators: DXY, S&P500, Gold, Oil, Treasury, BTC (dim 6 & 12)
 * 4. Binance Futures — Funding rates, OI, long/short ratio, taker volume (dim 9)
 * 5. Binance Futures (extended) — Per-symbol derivatives for SOL, BNB, XRP, ADA, DOGE, DOT, AVAX, POL, LINK, UNI
 * 6. CryptoCompare — Historical OHLCV price data (3 years daily) for charting & ML
 * 7. CryptoCompare — BTC social stats as Fear & Greed backup
 * 8. Coinglass — Open interest, liquidation, funding rate data
 * 9. Yahoo Finance (extended) — VIX, NASDAQ, Russell 2000, Copper
 *
 * CRITICAL: Never returns fake/mock data. If an API is down, returns null.
 */

// ═══════════════════════════════════════════════════════════════════
// CACHE INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Cache TTLs
const CACHE_TTL = {
  FEAR_AND_GREED: 60 * 60 * 1000,      // 1 hour
  DEFILLAMA: 30 * 60 * 1000,            // 30 minutes
  YAHOO_FINANCE: 15 * 60 * 1000,        // 15 minutes
  BINANCE_FUTURES: 5 * 60 * 1000,       // 5 minutes
  CRYPTOCOMPARE_HISTORICAL: 4 * 60 * 60 * 1000,  // 4 hours (daily data changes slowly)
  CRYPTOCOMPARE_SOCIAL: 30 * 60 * 1000,           // 30 minutes
  COINGLASS: 10 * 60 * 1000,                      // 10 minutes
  PER_SYMBOL_DERIVATIVES: 5 * 60 * 1000,           // 5 minutes
  ADDITIONAL_MACRO: 15 * 60 * 1000,                // 15 minutes
} as const;

// ═══════════════════════════════════════════════════════════════════
// FETCH UTILITIES
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 10_000; // 10 seconds

const BINANCE_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch JSON from a URL with timeout and error handling.
 * Returns null on any failure — never throws, never returns fake data.
 */
async function safeFetchJson<T>(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs, options);

    if (!response.ok) {
      console.warn(
        `[ExternalData] HTTP ${response.status} for ${url.substring(0, 80)}...`
      );
      return null;
    }

    const data: T = await response.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ExternalData] Fetch failed for ${url.substring(0, 80)}...: ${message}`);
    return null;
  }
}

/**
 * Small delay utility for rate-limiting batch requests.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a promise with a maximum time limit.
 * Returns null on timeout or error — never throws.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(`[ExternalData] Timeout (${timeoutMs}ms) for ${label}`);
          resolve(null);
        }, timeoutMs)
      ),
    ]);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ExternalData] Error in ${label}: ${message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

// ─── Fear & Greed ───────────────────────────────────────────────

export interface FearAndGreedData {
  value: number;           // 0-100
  classification: string;  // "Fear", "Greed", "Extreme Fear", etc.
  previousValue: number;
  change24h: number;
}

// ─── DeFiLlama ──────────────────────────────────────────────────

export interface DefiLlamaChain {
  name: string;
  tvl: number;
  change24h: number | null;
  change7d: number | null;
}

export interface DefiLlamaData {
  chains: DefiLlamaChain[];
  totalTvl: number;
}

export interface ProtocolTvlData {
  slug: string;
  name: string;
  tvl: number;
  change24h: number | null;
  change7d: number | null;
  category: string | null;
  chains: string[];
}

// ─── Macro Indicators (Yahoo Finance) ───────────────────────────

export interface MacroIndicator {
  value: number;
  change24h: number;
}

export interface MacroIndicatorsData {
  dxy: MacroIndicator | null;
  sp500: MacroIndicator | null;
  gold: MacroIndicator | null;
  oil: MacroIndicator | null;
  treasury10y: MacroIndicator | null;
  btcYfinance: MacroIndicator | null;
}

// ─── Derivatives (Binance Futures) ──────────────────────────────

export interface DerivativesData {
  btcFundingRate: number | null;
  ethFundingRate: number | null;
  btcOpenInterest: number | null;
  ethOpenInterest: number | null;
  btcLongShortRatio: number | null;
  ethLongShortRatio: number | null;
  btcTakerBuyRatio: number | null;
}

// ─── Per-Symbol Derivatives (Binance Futures extended) ──────────

export interface PerSymbolDerivativeData {
  symbol: string;           // e.g. "SOLUSDT"
  fundingRate: number | null;
  openInterest: number | null;
  longShortRatio: number | null;
  takerBuyRatio: number | null;
}

export interface PerSymbolDerivativesData {
  [symbolKey: string]: PerSymbolDerivativeData; // key is like "SOL", "BNB", etc.
}

// ─── Historical OHLCV (CryptoCompare) ───────────────────────────

export interface HistoricalOhlcv {
  date: string;      // ISO date string, e.g. "2023-01-15"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalPricesData {
  [symbolKey: string]: HistoricalOhlcv[]; // key is like "BTC", "ETH", etc.
}

// ─── CryptoCompare Social Stats (Fear & Greed backup) ───────────

export interface CryptoCompareSocialData {
  coinId: number;
  name: string;
  symbol: string;
  redditPostsPerDay: number | null;
  redditCommentsPerDay: number | null;
  redditSubscribers: number | null;
  twitterFollowers: number | null;
  twitterStatuses: number | null;
  forkCount: number | null;
  totalSubscribers: number | null;
}

// ─── Coinglass Derivatives ──────────────────────────────────────

export interface CoinglassFundingItem {
  symbol: string;           // e.g. "BTC"
  fundingRate: number | null;
  nextFundingTime: number | null;  // Unix ms
  price: number | null;
}

export interface CoinglassOpenInterestItem {
  symbol: string;
  openInterest: number | null;      // in USD
  openInterestChange24h: number | null; // percentage
}

export interface CoinglassData {
  fundingRates: CoinglassFundingItem[];
  openInterest: CoinglassOpenInterestItem[];
}

// ─── Additional Macro Indicators (Yahoo Finance extended) ────────

export interface AdditionalMacroIndicators {
  vix: MacroIndicator | null;
  nasdaq: MacroIndicator | null;
  russell2000: MacroIndicator | null;
  copper: MacroIndicator | null;
}

// ─── Aggregated ─────────────────────────────────────────────────

export interface ExternalMarketData {
  fearAndGreed: FearAndGreedData | null;
  defiLlama: DefiLlamaData | null;
  macroIndicators: MacroIndicatorsData | null;
  derivatives: DerivativesData | null;
  fetchedAt: string;
  // ── New fields (all optional for backward compatibility) ──
  perSymbolDerivatives?: PerSymbolDerivativesData | null;
  historicalPrices?: HistoricalPricesData | null;
  cryptoCompareSocial?: CryptoCompareSocialData | null;
  coinglass?: CoinglassData | null;
  additionalMacro?: AdditionalMacroIndicators | null;
}

// ═══════════════════════════════════════════════════════════════════
// 1. FEAR & GREED INDEX (Alternative.me)
// ═══════════════════════════════════════════════════════════════════

// API response shape from Alternative.me
interface FnGApiResponse {
  data: Array<{
    value: string;          // e.g. "45"
    value_classification: string; // e.g. "Fear"
    timestamp: string;      // Unix timestamp
    time_until_update: string;
  }>;
}

export async function fetchFearAndGreed(): Promise<FearAndGreedData | null> {
  const cacheKey = 'fear-and-greed';
  const cached = getFromCache<FearAndGreedData>(cacheKey, CACHE_TTL.FEAR_AND_GREED);
  if (cached) return cached;

  const url = 'https://api.alternative.me/fng/?limit=2&format=json';
  const result = await safeFetchJson<FnGApiResponse>(url);

  if (!result?.data || !Array.isArray(result.data) || result.data.length < 2) {
    console.warn('[ExternalData] Fear & Greed: invalid response structure');
    return null;
  }

  const current = result.data[0];
  const previous = result.data[1];

  const currentValue = parseInt(current.value, 10);
  const previousValue = parseInt(previous.value, 10);

  if (isNaN(currentValue) || isNaN(previousValue)) {
    console.warn('[ExternalData] Fear & Greed: could not parse values');
    return null;
  }

  const data: FearAndGreedData = {
    value: currentValue,
    classification: current.value_classification,
    previousValue,
    change24h: currentValue - previousValue,
  };

  setCache(cacheKey, data);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// 2. DEFILLAMA TVL DATA
// ═══════════════════════════════════════════════════════════════════

// DeFiLlama /v2/chains response item
interface DefiLlamaChainApiItem {
  name: string;
  tvl: number;
  chainId?: number;
  gecko_id?: string;
  change_1d?: number | null;
  change_7d?: number | null;
  mcap?: number | null;
  tokenSymbol?: string | null;
}

// DeFiLlama protocol list item (partial — only fields we need)
interface DefiLlamaProtocolApiItem {
  slug: string;
  name: string;
  tvl: number;
  change_1d?: number | null;
  change_7d?: number | null;
  category?: string;
  chains?: string[];
}

export async function fetchDeFiLlamaTVL(): Promise<DefiLlamaData | null> {
  const cacheKey = 'defillama-chains';
  const cached = getFromCache<DefiLlamaData>(cacheKey, CACHE_TTL.DEFILLAMA);
  if (cached) return cached;

  const url = 'https://api.llama.fi/v2/chains';
  const result = await safeFetchJson<DefiLlamaChainApiItem[]>(url);

  if (!Array.isArray(result) || result.length === 0) {
    console.warn('[ExternalData] DeFiLlama chains: invalid response');
    return null;
  }

  const chains: DefiLlamaChain[] = result
    .filter((c) => typeof c.tvl === 'number' && c.tvl > 0)
    .map((c) => ({
      name: c.name,
      tvl: c.tvl,
      change24h: c.change_1d ?? null,
      change7d: c.change_7d ?? null,
    }))
    .sort((a, b) => b.tvl - a.tvl);

  const totalTvl = chains.reduce((sum, c) => sum + c.tvl, 0);

  const data: DefiLlamaData = { chains, totalTvl };
  setCache(cacheKey, data);
  return data;
}

/**
 * Map coin IDs to DeFiLlama protocol slugs for coin-specific DeFi data.
 */
const COIN_TO_DEFILLAMA_SLUGS: Record<string, string[]> = {
  bitcoin: ['wbtc', 'renvm'],
  ethereum: ['lido', 'rocket-pool', 'frax-ether'],
  solana: ['marinade-finance', 'jito-solana', 'drift-protocol'],
  avalanche: ['aave-avalanche', 'benqi', 'trader-joe'],
  binancecoin: ['venus', 'pancake-swap', 'bi-swap'],
  polygon: ['aave-polygon', 'quickswap', 'radiant-capital-2'],
  arbitrum: ['gmx', 'pendle', 'radiant-capital'],
  optimism: ['velodrome', 'beethoven-x', 'sonne-finance'],
  sui: ['cetus', 'scallop', 'navi-protocol'],
  cardano: ['minswap', 'muesliswap', 'wingriders'],
  polkadot: ['acala', 'moonwell', 'hydradx'],
  cosmos: ['osmosis', 'cosmos-hub', 'kava'],
  near: ['ref-finance', 'aurora', 'trisolaris'],
  aptos: ['pontem-liquidswap', 'aux-exchange', 'amnis-finance'],
  uniswap: ['uniswap'],
  aave: ['aave-v3', 'aave-v2'],
  maker: ['makerdao'],
  chainlink: ['chainlink'],
  'shiba-inu': ['shibaswap'],
  dogecoin: [],
  litecoin: [],
  ripple: [],
  tron: ['justlend', 'sun', 'juststables'],
  stellar: [],
  monero: [],
  'ethereum-classic': [],
  filecoin: ['glif'],
  injective: ['injective-proposal', 'helix'],
  vechain: ['vebetter-dao'],
  'the-graph': ['the-graph'],
  algorand: ['tinyman', 'pact', 'folks-finance'],
  tezos: ['quipuswap', 'plenty-defi'],
  fantom: ['spookyswap', 'beethoven-x-2', 'geist-finance'],
  pepe: [],
  bonk: [],
  celestia: [],
  sei: ['astroport-sei', 'silostake'],
  stacks: ['alexlab', 'arkadiko'],
  kaspa: [],
  theta: [],
  hedera: ['saucerswap', 'stader-hbar'],
  immutable: [],
  mantle: ['merchant-moe', 'init-capital', 'lends'],
  pendle: ['pendle'],
  worldcoin: [],
  jupiter: ['jupiter'],
  ondo: ['ondo-finance'],
  render: [],
};

/**
 * Fetch coin-specific DeFi data from DeFiLlama.
 * Returns TVL data for protocols associated with a given coin.
 */
export async function fetchCoinDefiData(coinId: string): Promise<ProtocolTvlData[] | null> {
  const cacheKey = `defillama-coin-${coinId}`;
  const cached = getFromCache<ProtocolTvlData[]>(cacheKey, CACHE_TTL.DEFILLAMA);
  if (cached) return cached;

  const slugs = COIN_TO_DEFILLAMA_SLUGS[coinId];
  if (!slugs || slugs.length === 0) {
    return null;
  }

  // Fetch each protocol in parallel (limited to first 5 to avoid hammering)
  const slugsToFetch = slugs.slice(0, 5);
  const results = await Promise.all(
    slugsToFetch.map(async (slug) => {
      const url = `https://api.llama.fi/protocol/${slug}`;
      const result = await safeFetchJson<{
        slug?: string;
        name?: string;
        tvl?: number;
        chainTvls?: Record<string, number>;
        change_1d?: number | null;
        change_7d?: number | null;
        category?: string;
        chains?: string[];
      }>(url, 10_000);

      if (!result || typeof result.tvl !== 'number') return null;

      return {
        slug,
        name: result.name ?? slug,
        tvl: result.tvl,
        change24h: result.change_1d ?? null,
        change7d: result.change_7d ?? null,
        category: result.category ?? null,
        chains: result.chains ?? [],
      } satisfies ProtocolTvlData;
    })
  );

  const data = results.filter((r): r is ProtocolTvlData => r !== null);

  if (data.length === 0) return null;

  setCache(cacheKey, data);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// 3. MACRO INDICATORS (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════════

// Yahoo Finance v8 chart response (simplified)
interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
        }>;
      };
    }>;
    error?: unknown;
  };
}

/**
 * Extract latest value and 24h change from a Yahoo Finance chart response.
 */
function parseYahooIndicator(response: YahooChartResponse | null): MacroIndicator | null {
  if (!response?.chart?.result?.[0]) return null;

  const result = response.chart.result[0];
  const meta = result.meta;

  // Prefer meta data for the latest price
  if (meta?.regularMarketPrice != null && meta?.previousClose != null) {
    const value = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    if (previousClose !== 0) {
      return {
        value,
        change24h: ((value - previousClose) / previousClose) * 100,
      };
    }
  }

  // Fallback: derive from indicator close array
  const closes = result.indicators?.quote?.[0]?.close;
  if (closes && closes.length >= 2) {
    // Find last two non-null close values
    let latest: number | null = null;
    let previous: number | null = null;

    for (let i = closes.length - 1; i >= 0; i--) {
      if (closes[i] != null) {
        if (latest === null) {
          latest = closes[i]!;
        } else {
          previous = closes[i]!;
          break;
        }
      }
    }

    if (latest !== null && previous !== null && previous !== 0) {
      return {
        value: latest,
        change24h: ((latest - previous) / previous) * 100,
      };
    }
  }

  return null;
}

/**
 * Fetch a single Yahoo Finance indicator.
 */
async function fetchYahooIndicator(symbol: string): Promise<MacroIndicator | null> {
  const cacheKey = `yahoo-${symbol}`;
  const cached = getFromCache<MacroIndicator>(cacheKey, CACHE_TTL.YAHOO_FINANCE);
  if (cached) return cached;

  // Do NOT encodeURIComponent — Yahoo symbols with %5E (^) should be passed as-is
  // encodeURIComponent would double-encode %5E to %255E
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;
  const result = await safeFetchJson<YahooChartResponse>(url);

  const data = parseYahooIndicator(result);

  if (data) {
    setCache(cacheKey, data);
  }

  return data;
}

export async function fetchMacroIndicators(): Promise<MacroIndicatorsData> {
  // Fetch all macro indicators in parallel
  const [dxy, sp500, gold, oil, treasury10y, btcYfinance] = await Promise.all([
    fetchYahooIndicator('DX-Y.NYB'),
    fetchYahooIndicator('%5EGSPC'),   // S&P 500 (^GSPC) — must use URL-encoded form
    fetchYahooIndicator('GC=F'),      // Gold futures
    fetchYahooIndicator('CL=F'),      // WTI Oil futures
    fetchYahooIndicator('%5ETNX'),   // 10Y Treasury (^TNX) — must use URL-encoded form
    fetchYahooIndicator('BTC-USD'),   // Bitcoin
  ]);

  return {
    dxy,
    sp500,
    gold,
    oil,
    treasury10y,
    btcYfinance,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. DERIVATIVES DATA (Binance Futures API)
// ═══════════════════════════════════════════════════════════════════

// Binance funding rate response item
interface BinanceFundingRateItem {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  markPrice?: string;
}

// Binance open interest response
interface BinanceOpenInterestResponse {
  openInterest: string;
  symbol: string;
  time: number;
}

// Binance long/short ratio response item
interface BinanceLongShortRatioItem {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

// Binance taker buy/sell ratio response item
interface BinanceTakerRatioItem {
  buyVol: string;
  sellVol: string;
  buySellRatio: string;
  timestamp: number;
}

/**
 * Fetch the latest funding rate for a symbol from Binance Futures.
 */
async function fetchFundingRate(symbol: string): Promise<number | null> {
  const cacheKey = `binance-funding-${symbol}`;
  const cached = getFromCache<number>(cacheKey, CACHE_TTL.BINANCE_FUTURES);
  if (cached !== null) return cached;

  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const result = await safeFetchJson<BinanceFundingRateItem[]>(url, DEFAULT_TIMEOUT, {
    headers: BINANCE_HEADERS,
  });

  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }

  const rate = parseFloat(result[0].fundingRate);
  if (isNaN(rate)) return null;

  setCache(cacheKey, rate);
  return rate;
}

/**
 * Fetch open interest for a symbol from Binance Futures.
 */
async function fetchOpenInterest(symbol: string): Promise<number | null> {
  const cacheKey = `binance-oi-${symbol}`;
  const cached = getFromCache<number>(cacheKey, CACHE_TTL.BINANCE_FUTURES);
  if (cached !== null) return cached;

  const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`;
  const result = await safeFetchJson<BinanceOpenInterestResponse>(url, DEFAULT_TIMEOUT, {
    headers: BINANCE_HEADERS,
  });

  if (!result?.openInterest) return null;

  const oi = parseFloat(result.openInterest);
  if (isNaN(oi)) return null;

  setCache(cacheKey, oi);
  return oi;
}

/**
 * Fetch top trader long/short position ratio from Binance Futures.
 */
async function fetchLongShortRatio(symbol: string): Promise<number | null> {
  const cacheKey = `binance-ls-${symbol}`;
  const cached = getFromCache<number>(cacheKey, CACHE_TTL.BINANCE_FUTURES);
  if (cached !== null) return cached;

  const url = `https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`;
  const result = await safeFetchJson<BinanceLongShortRatioItem[]>(url, DEFAULT_TIMEOUT, {
    headers: BINANCE_HEADERS,
  });

  if (!Array.isArray(result) || result.length === 0) return null;

  const ratio = parseFloat(result[0].longShortRatio);
  if (isNaN(ratio)) return null;

  setCache(cacheKey, ratio);
  return ratio;
}

/**
 * Fetch taker buy/sell volume ratio from Binance Futures.
 */
async function fetchTakerBuyRatio(symbol: string): Promise<number | null> {
  const cacheKey = `binance-taker-${symbol}`;
  const cached = getFromCache<number>(cacheKey, CACHE_TTL.BINANCE_FUTURES);
  if (cached !== null) return cached;

  const url = `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=1`;
  const result = await safeFetchJson<BinanceTakerRatioItem[]>(url, DEFAULT_TIMEOUT, {
    headers: BINANCE_HEADERS,
  });

  if (!Array.isArray(result) || result.length === 0) return null;

  const ratio = parseFloat(result[0].buySellRatio);
  if (isNaN(ratio)) return null;

  setCache(cacheKey, ratio);
  return ratio;
}

export async function fetchDerivativesData(): Promise<DerivativesData> {
  // Fetch all derivatives data in parallel
  const [
    btcFundingRate,
    ethFundingRate,
    btcOpenInterest,
    ethOpenInterest,
    btcLongShortRatio,
    ethLongShortRatio,
    btcTakerBuyRatio,
  ] = await Promise.all([
    fetchFundingRate('BTCUSDT'),
    fetchFundingRate('ETHUSDT'),
    fetchOpenInterest('BTCUSDT'),
    fetchOpenInterest('ETHUSDT'),
    fetchLongShortRatio('BTCUSDT'),
    fetchLongShortRatio('ETHUSDT'),
    fetchTakerBuyRatio('BTCUSDT'),
  ]);

  return {
    btcFundingRate,
    ethFundingRate,
    btcOpenInterest,
    ethOpenInterest,
    btcLongShortRatio,
    ethLongShortRatio,
    btcTakerBuyRatio,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. PER-SYMBOL DERIVATIVES (Binance Futures extended)
// ═══════════════════════════════════════════════════════════════════

/**
 * Additional symbols to fetch per-symbol derivatives for.
 * Maps from short key (used in output) to Binance Futures symbol.
 */
const ADDITIONAL_DERIVATIVE_SYMBOLS: Record<string, string> = {
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  DOT: 'DOTUSDT',
  AVAX: 'AVAXUSDT',
  POL: 'POLUSDT',
  LINK: 'LINKUSDT',
  UNI: 'UNIUSDT',
};

/**
 * Fetch all 4 derivatives metrics for a single symbol from Binance Futures.
 * Used internally by fetchPerSymbolDerivatives.
 */
async function fetchSingleSymbolDerivatives(
  symbolKey: string,
  binanceSymbol: string
): Promise<PerSymbolDerivativeData> {
  const [fundingRate, openInterest, longShortRatio, takerBuyRatio] = await Promise.all([
    fetchFundingRate(binanceSymbol),
    fetchOpenInterest(binanceSymbol),
    fetchLongShortRatio(binanceSymbol),
    fetchTakerBuyRatio(binanceSymbol),
  ]);

  return {
    symbol: binanceSymbol,
    fundingRate,
    openInterest,
    longShortRatio,
    takerBuyRatio,
  };
}

/**
 * Fetch derivatives data for multiple symbols beyond BTC/ETH.
 * Uses batch requests with small delays between symbols to respect rate limits.
 * Each symbol fetches 4 metrics in parallel (funding, OI, L/S ratio, taker ratio).
 */
export async function fetchPerSymbolDerivatives(): Promise<PerSymbolDerivativesData | null> {
  const cacheKey = 'per-symbol-derivatives';
  const cached = getFromCache<PerSymbolDerivativesData>(cacheKey, CACHE_TTL.PER_SYMBOL_DERIVATIVES);
  if (cached) return cached;

  const entries = Object.entries(ADDITIONAL_DERIVATIVE_SYMBOLS);
  const results: PerSymbolDerivativesData = {};
  let successCount = 0;

  // Process symbols in small batches (3 at a time) with delays between batches
  const BATCH_SIZE = 3;
  const DELAY_BETWEEN_BATCHES_MS = 200;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ([symbolKey, binanceSymbol]) => {
        try {
          const data = await fetchSingleSymbolDerivatives(symbolKey, binanceSymbol);
          return { symbolKey, data };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[ExternalData] Per-symbol derivatives failed for ${symbolKey}: ${message}`
          );
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) {
        results[result.symbolKey] = result.data;
        successCount++;
      }
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < entries.length) {
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  if (successCount === 0) {
    console.warn('[ExternalData] Per-symbol derivatives: all symbols failed');
    return null;
  }

  console.log(`[ExternalData] Per-symbol derivatives: ${successCount}/${entries.length} symbols fetched`);
  setCache(cacheKey, results);
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// 6. HISTORICAL OHLCV DATA (CryptoCompare)
// ═══════════════════════════════════════════════════════════════════

/**
 * CryptoCompare histoday API response shape.
 */
interface CryptoCompareHistodayResponse {
  Response: string;      // "Success" or "Error"
  Message: string;
  Data: {
    Aggregated: boolean;
    TimeFrom: number;
    TimeTo: number;
    Data: Array<{
      time: number;      // Unix timestamp
      high: number;
      low: number;
      open: number;
      volumefrom: number;
      volumeto: number;
      close: number;
      conversionType: string;
      conversionSymbol: string;
    }>;
  };
}

/**
 * Symbols to fetch historical price data for.
 * Maps from display key to CryptoCompare fsym.
 */
const HISTORICAL_PRICE_SYMBOLS: Record<string, string> = {
  BTC: 'BTC',
  ETH: 'ETH',
  SOL: 'SOL',
  BNB: 'BNB',
  XRP: 'XRP',
  ADA: 'ADA',
  DOGE: 'DOGE',
  DOT: 'DOT',
  AVAX: 'AVAX',
  LINK: 'LINK',
};

/**
 * Fetch historical daily OHLCV data for a single symbol from CryptoCompare.
 * Returns up to 3 years (1095 days) of daily data.
 */
async function fetchSingleHistoricalPrice(
  symbolKey: string,
  fsym: string
): Promise<{ symbolKey: string; data: HistoricalOhlcv[] } | null> {
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=1095`;
  const result = await safeFetchJson<CryptoCompareHistodayResponse>(url, 12_000);

  if (!result || result.Response !== 'Success' || !result.Data?.Data) {
    console.warn(`[ExternalData] CryptoCompare historical ${symbolKey}: invalid response`);
    return null;
  }

  const candles = result.Data.Data.filter(
    (c) => c.open > 0 && c.close > 0 // Filter out zero-price placeholder entries
  );

  if (candles.length === 0) {
    console.warn(`[ExternalData] CryptoCompare historical ${symbolKey}: no valid candles`);
    return null;
  }

  const ohlcv: HistoricalOhlcv[] = candles.map((c) => ({
    date: new Date(c.time * 1000).toISOString().split('T')[0],
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volumeto, // USD volume is more useful than coin volume
  }));

  return { symbolKey, data: ohlcv };
}

/**
 * Fetch historical OHLCV price data for multiple symbols from CryptoCompare.
 * Returns up to 3 years of daily data per symbol.
 * Uses batch requests with delays to respect rate limits.
 */
export async function fetchHistoricalPrices(): Promise<HistoricalPricesData | null> {
  const cacheKey = 'historical-prices';
  const cached = getFromCache<HistoricalPricesData>(cacheKey, CACHE_TTL.CRYPTOCOMPARE_HISTORICAL);
  if (cached) return cached;

  const entries = Object.entries(HISTORICAL_PRICE_SYMBOLS);
  const results: HistoricalPricesData = {};
  let successCount = 0;

  // Process 2 symbols at a time with delays (CryptoCompare free tier rate limits)
  const BATCH_SIZE = 2;
  const DELAY_BETWEEN_BATCHES_MS = 300;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ([symbolKey, fsym]) => {
        try {
          return await fetchSingleHistoricalPrice(symbolKey, fsym);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[ExternalData] Historical price failed for ${symbolKey}: ${message}`
          );
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) {
        results[result.symbolKey] = result.data;
        successCount++;
      }
    }

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < entries.length) {
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  if (successCount === 0) {
    console.warn('[ExternalData] Historical prices: all symbols failed');
    return null;
  }

  console.log(`[ExternalData] Historical prices: ${successCount}/${entries.length} symbols fetched`);
  setCache(cacheKey, results);
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// 7. CRYPTOCOMPARE SOCIAL STATS (Fear & Greed backup)
// ═══════════════════════════════════════════════════════════════════

/**
 * CryptoCompare social/stats API response shape.
 */
interface CryptoCompareSocialResponse {
  Response: string;
  Message: string;
  Data: {
    CoinId: number;
    Name: string;
    Symbol: string;
    Reddit?: {
      posts_per_day?: number;
      comments_per_day?: number;
      subscribers?: number;
    };
    Twitter?: {
      followers?: number;
      statuses?: number;
    };
    Forks?: number;
    TotalSubscribers?: number;
  };
}

/**
 * Fetch BTC social stats from CryptoCompare as a Fear & Greed alternative.
 * High social activity often correlates with market sentiment extremes.
 * CoinId 1182 = Bitcoin on CryptoCompare.
 */
export async function fetchCryptoCompareSocialStats(): Promise<CryptoCompareSocialData | null> {
  const cacheKey = 'cryptocompare-social';
  const cached = getFromCache<CryptoCompareSocialData>(cacheKey, CACHE_TTL.CRYPTOCOMPARE_SOCIAL);
  if (cached) return cached;

  const url = 'https://min-api.cryptocompare.com/data/social/coin/latest?coinId=1182';
  const result = await safeFetchJson<CryptoCompareSocialResponse>(url, 8_000);

  if (!result || result.Response !== 'Success' || !result.Data) {
    console.warn('[ExternalData] CryptoCompare social: invalid response');
    return null;
  }

  const d = result.Data;
  const data: CryptoCompareSocialData = {
    coinId: d.CoinId,
    name: d.Name,
    symbol: d.Symbol,
    redditPostsPerDay: d.Reddit?.posts_per_day ?? null,
    redditCommentsPerDay: d.Reddit?.comments_per_day ?? null,
    redditSubscribers: d.Reddit?.subscribers ?? null,
    twitterFollowers: d.Twitter?.followers ?? null,
    twitterStatuses: d.Twitter?.statuses ?? null,
    forkCount: d.Forks ?? null,
    totalSubscribers: d.TotalSubscribers ?? null,
  };

  console.log(`[ExternalData] CryptoCompare social: BTC stats fetched (Reddit subs: ${data.redditSubscribers}, Twitter followers: ${data.twitterFollowers})`);
  setCache(cacheKey, data);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// 8. COINGLASS DERIVATIVES DATA
// ═══════════════════════════════════════════════════════════════════

/**
 * Coinglass public v2 funding rate API response.
 * Note: The free API may change or require an API key in the future.
 */
interface CoinglassFundingApiResponse {
  success: boolean;
  data?: Array<{
    symbol: string;
    uMarginList?: Array<{
      exchange: string;
      rate: number;
      nextFundingTime: number;
    }>;
    rate: number;
    nextFundingTime: number;
    price: number;
  }>;
}

/**
 * Coinglass public v2 open interest API response.
 */
interface CoinglassOIApiResponse {
  success: boolean;
  data?: Array<{
    symbol: string;
    uMarginList?: Array<{
      exchange: string;
      openInterest: number;
    }>;
    openInterest: number;
    openInterestChange24h: number;
  }>;
}

/**
 * Fetch Coinglass funding rate data for major symbols.
 * Provides cross-exchange aggregated funding rates.
 */
export async function fetchCoinglassFunding(): Promise<CoinglassFundingItem[]> {
  const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
  const results: CoinglassFundingItem[] = [];

  for (const symbol of symbols) {
    const url = `https://open-api.coinglass.com/public/v2/funding?symbol=${symbol}&time_type=all`;
    const response = await safeFetchJson<CoinglassFundingApiResponse>(url, 8_000);

    if (!response?.success || !response.data || response.data.length === 0) {
      console.warn(`[ExternalData] Coinglass funding ${symbol}: invalid or empty response`);
      results.push({
        symbol,
        fundingRate: null,
        nextFundingTime: null,
        price: null,
      });
      continue;
    }

    const item = response.data[0];
    results.push({
      symbol,
      fundingRate: item.rate ?? null,
      nextFundingTime: item.nextFundingTime ?? null,
      price: item.price ?? null,
    });

    // Small delay between symbol requests
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      await delay(200);
    }
  }

  return results;
}

/**
 * Fetch Coinglass open interest data for major symbols.
 */
export async function fetchCoinglassOpenInterest(): Promise<CoinglassOpenInterestItem[]> {
  const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
  const results: CoinglassOpenInterestItem[] = [];

  for (const symbol of symbols) {
    const url = `https://open-api.coinglass.com/public/v2/openInterest?symbol=${symbol}&time_type=all`;
    const response = await safeFetchJson<CoinglassOIApiResponse>(url, 8_000);

    if (!response?.success || !response.data || response.data.length === 0) {
      console.warn(`[ExternalData] Coinglass OI ${symbol}: invalid or empty response`);
      results.push({
        symbol,
        openInterest: null,
        openInterestChange24h: null,
      });
      continue;
    }

    const item = response.data[0];
    results.push({
      symbol,
      openInterest: item.openInterest ?? null,
      openInterestChange24h: item.openInterestChange24h ?? null,
    });

    // Small delay between symbol requests
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      await delay(200);
    }
  }

  return results;
}

/**
 * Fetch combined Coinglass data (funding rates + open interest).
 * Each sub-fetch has independent error handling so one failure
 * doesn't block the other.
 */
export async function fetchCoinglassData(): Promise<CoinglassData | null> {
  const cacheKey = 'coinglass-data';
  const cached = getFromCache<CoinglassData>(cacheKey, CACHE_TTL.COINGLASS);
  if (cached) return cached;

  const [fundingRates, openInterest] = await Promise.all([
    fetchCoinglassFunding(),
    fetchCoinglassOpenInterest(),
  ]);

  const hasFunding = fundingRates.some((f) => f.fundingRate !== null);
  const hasOI = openInterest.some((o) => o.openInterest !== null);

  if (!hasFunding && !hasOI) {
    console.warn('[ExternalData] Coinglass: both funding and OI data empty');
    return null;
  }

  const data: CoinglassData = { fundingRates, openInterest };
  console.log(`[ExternalData] Coinglass: funding=${hasFunding}, OI=${hasOI}`);
  setCache(cacheKey, data);
  return data;
}

// ═══════════════════════════════════════════════════════════════════
// 9. ADDITIONAL MACRO INDICATORS (Yahoo Finance extended)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch additional macro indicators from Yahoo Finance.
 * - VIX: CBOE Volatility Index — market fear/uncertainty gauge
 * - NASDAQ: NASDAQ Composite — tech-heavy equity index
 * - Russell 2000: Small-cap equity index — risk appetite indicator
 * - Copper: Industrial metal — economic growth proxy
 */
export async function fetchAdditionalMacroIndicators(): Promise<AdditionalMacroIndicators> {
  const [vix, nasdaq, russell2000, copper] = await Promise.all([
    fetchYahooIndicator('%5EVIX'),      // CBOE Volatility Index (^VIX)
    fetchYahooIndicator('%5EIXIC'),     // NASDAQ Composite (^IXIC)
    fetchYahooIndicator('%5ERUT'),      // Russell 2000 (^RUT)
    fetchYahooIndicator('HG=F'),        // Copper futures
  ]);

  console.log(`[ExternalData] Additional macro: VIX=${vix?.value ?? 'N/A'}, NASDAQ=${nasdaq?.value ?? 'N/A'}, RUT=${russell2000?.value ?? 'N/A'}, Copper=${copper?.value ?? 'N/A'}`);

  return { vix, nasdaq, russell2000, copper };
}

// ═══════════════════════════════════════════════════════════════════
// 10. BATCH FETCH — ALL EXTERNAL DATA
// ═══════════════════════════════════════════════════════════════════

export async function fetchAllExternalData(): Promise<ExternalMarketData> {
  console.log('[ExternalData] === Starting full data fetch ===');

  // Core data (original 4 sources) — always fetched
  const [fearAndGreed, defiLlama, macroIndicators, derivatives] = await Promise.all([
    withTimeout(fetchFearAndGreed(), 8_000, 'FearAndGreed'),
    withTimeout(fetchDeFiLlamaTVL(), 8_000, 'DeFiLlama'),
    withTimeout(fetchMacroIndicators(), 10_000, 'MacroIndicators'),
    withTimeout(fetchDerivativesData(), 10_000, 'Derivatives'),
  ]);

  // New data sources — fetched in parallel with timeout protection
  // Each has independent error handling so one failure doesn't block others
  const [perSymbolDerivatives, historicalPrices, cryptoCompareSocial, coinglass, additionalMacro] =
    await Promise.all([
      withTimeout(fetchPerSymbolDerivatives(), 12_000, 'PerSymbolDerivatives'),
      withTimeout(fetchHistoricalPrices(), 15_000, 'HistoricalPrices'),
      withTimeout(fetchCryptoCompareSocialStats(), 8_000, 'CryptoCompareSocial'),
      withTimeout(fetchCoinglassData(), 10_000, 'Coinglass'),
      withTimeout(fetchAdditionalMacroIndicators(), 8_000, 'AdditionalMacro'),
    ]);

  // Log success/failure summary
  const summary = {
    fearAndGreed: fearAndGreed ? '✓' : '✗',
    defiLlama: defiLlama ? '✓' : '✗',
    macroIndicators: macroIndicators ? '✓' : '✗',
    derivatives: derivatives ? '✓' : '✗',
    perSymbolDerivatives: perSymbolDerivatives ? '✓' : '✗',
    historicalPrices: historicalPrices ? '✓' : '✗',
    cryptoCompareSocial: cryptoCompareSocial ? '✓' : '✗',
    coinglass: coinglass ? '✓' : '✗',
    additionalMacro: additionalMacro ? '✓' : '✗',
  };
  console.log('[ExternalData] Fetch summary:', JSON.stringify(summary));

  return {
    fearAndGreed,
    defiLlama,
    macroIndicators,
    derivatives,
    fetchedAt: new Date().toISOString(),
    perSymbolDerivatives,
    historicalPrices,
    cryptoCompareSocial,
    coinglass,
    additionalMacro,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Clear all cached external data. Useful for forcing a refresh.
 */
export function clearExternalDataCache(): void {
  cache.clear();
  console.log('[ExternalData] Cache cleared');
}

/**
 * Get cache statistics for monitoring/debugging.
 */
export function getExternalDataCacheStats(): {
  entries: number;
  keys: string[];
} {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
