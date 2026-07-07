/**
 * Background data fetcher - runs as a separate process
 * Fetches raw market data from CoinGecko and saves as static JSON.
 * The API route reads this file and enriches it with full scoring
 * engine results and external data at request time.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';

const OUTPUT_FILE = '/home/z/my-project/public/market-data.json';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchMarketData() {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d`;
  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

async function fetchGlobalData() {
  const res = await fetchWithTimeout(`${COINGECKO_BASE}/global`, 8000);
  if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`[${new Date().toISOString()}] Fetching raw market data...`);
  
  try {
    const [coins, globalData] = await Promise.all([
      fetchMarketData().catch(e => { console.warn('Market fetch failed:', e.message); return null; }),
      fetchGlobalData().catch(e => { console.warn('Global fetch failed:', e.message); return null; }),
    ]);

    if (!coins || coins.length === 0) {
      console.warn('No coins data available');
      if (existsSync(OUTPUT_FILE)) {
        console.log('Keeping existing market-data.json');
      }
      return;
    }

    // Save raw CoinGecko data — no score computation here.
    // The API route will compute full 12-dimension scores using
    // the scoring engine V2 with real external data.
    const result = {
      coins: coins,
      globalData: globalData?.data ?? null,
      meta: {
        lastUpdated: new Date().toISOString(),
        rawFormat: true,
      },
    };

    writeFileSync(OUTPUT_FILE, JSON.stringify(result));
    console.log(`[${new Date().toISOString()}] Saved ${coins.length} raw coins to market-data.json`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
  }
}

// Run once, then exit
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
