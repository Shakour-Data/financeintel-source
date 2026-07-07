/**
 * CoinGecko API layer with resilient caching and background refresh.
 *
 * Strategy:
 * - Stale-while-revalidate: Serve cached data, refresh in background
 * - Exponential backoff on 429/5xx errors (up to 3 retries)
 * - Background refresh: non-blocking API calls to update cache
 * - 10s request timeout per attempt
 * - No mock/fake data: returns empty/null when real data is unavailable
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// ─── Cache Types ───────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

// ─── In-memory cache ───────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();

const FRESH_TTL = 5 * 60 * 1000;   // 5 minutes (fresh)
const STALE_TTL = 60 * 60 * 1000;  // 1 hour (still usable)

function getFromCache<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > STALE_TTL) {
    cache.delete(key);
    return null;
  }

  return { data: entry.data as T, isStale: age > FRESH_TTL };
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now(), isStale: false });
}

// Track background refresh to avoid duplicate calls
const refreshingKeys = new Set<string>();

// ─── Fetch with exponential backoff retry ──────────────────────

async function fetchWithRetry(
  url: string,
  retries = 1,
  baseDelay = 2000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);

      if (response.ok) return response;

      // 429 = rate limited — wait longer
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
        const cappedWait = Math.min(waitMs, 5000); // Cap at 5s
        console.warn(`[CryptoAPI] Rate limited (429), waiting ${cappedWait}ms before retry ${attempt + 1}/${retries}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, cappedWait));
          continue;
        }
      }

      // 5xx = server error — retry with backoff
      if (response.status >= 500 && attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[CryptoAPI] Server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    } catch (err: unknown) {
      clearTimeout(timeout);

      if (attempt < retries && err instanceof Error && err.name !== 'AbortError') {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[CryptoAPI] Fetch error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries}):`, err.message);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

// ─── Background refresh (non-blocking) ─────────────────────────

function backgroundRefresh(cacheKey: string, url: string): void {
  if (refreshingKeys.has(cacheKey)) return; // Already refreshing
  refreshingKeys.add(cacheKey);

  fetchWithRetry(url, 2, 3000)
    .then(response => response.json())
    .then(data => {
      setCache(cacheKey, data);
      console.log(`[CryptoAPI] Background refresh succeeded for ${cacheKey}`);
    })
    .catch(err => {
      console.warn(`[CryptoAPI] Background refresh failed for ${cacheKey}:`, err.message);
    })
    .finally(() => {
      refreshingKeys.delete(cacheKey);
    });
}

// ─── Types ─────────────────────────────────────────────────────

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
}

export interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: { thumb: string; small: string; large: string };
  market_cap_rank: number;
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_14d: number;
    price_change_percentage_30d: number;
    price_change_percentage_60d: number;
    price_change_percentage_200d: number;
    price_change_percentage_1y: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: Record<string, number>;
    ath_change_percentage: Record<string, number>;
    ath_date: Record<string, string>;
    atl: Record<string, number>;
    atl_change_percentage: Record<string, number>;
    atl_date: Record<string, string>;
    fully_diluted_valuation: Record<string, number>;
    total_value_locked: Record<string, number> | null;
  };
  links: {
    homepage: string[];
    blockchain_site: string[];
    subreddit_url: string;
    repos_url: { github: string[] };
  };
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    commit_count_4_weeks: number;
  };
}

// ─── API Functions ──────────────────────────────────────────────

/**
 * Fetch top N coins market data with stale-while-revalidate caching.
 * Strategy:
 * 1. Return cached data immediately (even if stale)
 * 2. If stale, trigger background refresh from CoinGecko
 * 3. If no cache, try CoinGecko with retries; return empty array on failure
 *
 * Default `perPage` is 200 — CoinGecko's `/coins/markets` allows up to 250
 * per page, so 200 fits in a single request. We request all standard price
 * change percentages (1h/24h/7d/14d/30d/60d/200d/1y) so the schema's full
 * RawMarketDaily row can be populated.
 */
const PRICE_CHANGE_FIELDS =
  'price_change_percentage=1h%2C24h%2C7d%2C14d%2C30d%2C60d%2C200d%2C1y';

export async function fetchMarketData(
  perPage = 200
): Promise<{ data: MarketCoin[]; fromCache: boolean; isStale: boolean }> {
  // CoinGecko hard caps per_page at 250.
  const safePerPage = Math.min(Math.max(perPage, 1), 250);
  const cacheKey = `market-${safePerPage}`;

  const marketUrl = (page: number) =>
    `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${safePerPage}&page=${page}&sparkline=false&price_change_percentage=${PRICE_CHANGE_FIELDS}`;

  // Try cache first
  const cached = getFromCache<MarketCoin[]>(cacheKey);
  if (cached) {
    // If cache is stale, trigger background refresh (non-blocking)
    if (cached.isStale) {
      backgroundRefresh(cacheKey, marketUrl(1));
    }
    return { data: cached.data, fromCache: true, isStale: cached.isStale };
  }

  // No cache — try CoinGecko with retries
  try {
    console.log(`[CryptoAPI] Fetching market data from CoinGecko (perPage=${safePerPage})...`);
    const response = await fetchWithRetry(marketUrl(1));
    const data: MarketCoin[] = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      console.log(`[CryptoAPI] Got ${data.length} coins from CoinGecko`);
      setCache(cacheKey, data);
      return { data, fromCache: false, isStale: false };
    }

    throw new Error('CoinGecko returned empty or invalid data');
  } catch (error) {
    console.error('[CryptoAPI] Failed to fetch market data:', error);
    // No mock data — return empty array to indicate failure
    return { data: [], fromCache: false, isStale: true };
  }
}

/**
 * Fetch global market data with stale-while-revalidate caching.
 */
export async function fetchGlobalData(): Promise<{
  data: GlobalData | null;
  fromCache: boolean;
  isStale: boolean;
}> {
  const cacheKey = 'global';

  const cached = getFromCache<GlobalData>(cacheKey);
  if (cached) {
    if (cached.isStale) {
      backgroundRefresh(cacheKey, `${COINGECKO_BASE}/global`);
    }
    return { data: cached.data, fromCache: true, isStale: cached.isStale };
  }

  try {
    console.log('[CryptoAPI] Fetching global data from CoinGecko...');
    const response = await fetchWithRetry(`${COINGECKO_BASE}/global`);
    const data: GlobalData = await response.json();

    if (data?.data) {
      setCache(cacheKey, data);
      return { data, fromCache: false, isStale: false };
    }

    throw new Error('CoinGecko returned invalid global data');
  } catch (error) {
    console.error('[CryptoAPI] Failed to fetch global data:', error);
    // No mock data — return null to indicate failure
    return { data: null, fromCache: false, isStale: true };
  }
}

/**
 * Fetch individual coin detail.
 */
export async function fetchCoinDetail(
  coinId: string
): Promise<{ data: CoinDetail | null; fromCache: boolean; isStale: boolean }> {
  const cacheKey = `coin-${coinId}`;

  const cached = getFromCache<CoinDetail>(cacheKey);
  if (cached) {
    if (!cached.isStale) {
      return { data: cached.data, fromCache: true, isStale: false };
    }
  }

  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=true`;
    const response = await fetchWithRetry(url, 2, 1500);
    const data: CoinDetail = await response.json();

    setCache(cacheKey, data);
    return { data, fromCache: false, isStale: false };
  } catch (error) {
    console.error(`[CryptoAPI] Failed to fetch coin detail for ${coinId}:`, error);

    if (cached) {
      return { data: cached.data, fromCache: true, isStale: true };
    }

    return { data: null, fromCache: false, isStale: false };
  }
}

/**
 * Force refresh all market data (clears cache and refetches).
 */
export function clearCache(): void {
  cache.clear();
  console.log('[CryptoAPI] Cache cleared');
}
