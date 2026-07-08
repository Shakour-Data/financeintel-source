/**
 * Phase 4 — CoinGecko Comparison Validation Script
 *
 * Verifies that local data is sourced from real CoinGecko data (not mock/fake).
 *
 * Checks:
 *  1. Fetches live market data from CoinGecko for a sample of coins
 *  2. Compares the most recent local RawMarketDaily price against CoinGecko live price
 *  3. Allows tolerance (up to 15%) to account for time-of-day price movement
 *  4. Validates coin symbols and names look reasonable (not placeholders)
 */

import { db } from '../src/lib/db';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

interface CheckResult {
  ok: boolean;
  details: string;
}

const SAMPLE_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'ripple',
  'cardano',
  'dogecoin',
  'polkadot',
  'avalanche-2',
  'tron',
];

const PRICE_TOLERANCE = 0.15;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000;

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap_rank: number;
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY * Math.pow(2, attempt);
        const cappedWait = Math.min(waitMs, 5000);
        console.warn(
          `  Rate limited (429), waiting ${cappedWait}ms before retry ${attempt + 1}/${retries}`
        );
        await new Promise(r => setTimeout(r, cappedWait));
        continue;
      }

      if (response.status >= 500 && attempt < retries) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.warn(
          `  Server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    } catch (err) {
      clearTimeout(timeout);
      if (
        attempt < retries &&
        err instanceof Error &&
        err.name !== 'AbortError'
      ) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.warn(
          `  Fetch error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries}):`,
          err.message
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

async function fetchCoinGeckoData(): Promise<CoinGeckoMarketCoin[]> {
  const ids = SAMPLE_COINS.join(',');
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&per_page=${SAMPLE_COINS.length}&sparkline=false`;

  console.log('Fetching live market data from CoinGecko...');
  const response = await fetchWithRetry(url);
  const data: CoinGeckoMarketCoin[] = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('CoinGecko returned empty or invalid data');
  }

  console.log(`Received ${data.length} coins from CoinGecko`);
  return data;
}

async function validateSymbols(): Promise<CheckResult> {
  const coins = await db.coin.findMany({
    select: { coingeckoId: true, symbol: true, name: true },
    take: 20,
  });

  const suspicious = coins.filter(c => {
    const s = c.symbol.toUpperCase();
    const n = c.name.toLowerCase();
    return (
      c.coingeckoId === '' ||
      s.length < 2 ||
      s.length > 10 ||
      n.includes('placeholder') ||
      n.includes('mock') ||
      n.includes('test') ||
      n.includes('fake') ||
      c.name === c.symbol ||
      c.name === ''
    );
  });

  return {
    name: 'Coin Metadata Sanity',
    status: suspicious.length === 0 ? 'pass' : 'fail',
    message:
      suspicious.length === 0
        ? 'Coin symbols/names look realistic'
        : `Found ${suspicious.length} suspicious coin entries`,
    details:
      suspicious.length > 0 ? { samples: suspicious.slice(0, 5) } : undefined,
  };
}

async function validatePrices(): Promise<CheckResult> {
  const liveData = await fetchCoinGeckoData();
  const samples: {
    coingeckoId: string;
    localPrice: number | null;
    livePrice: number | null;
    diffPct: number | null;
    withinTolerance: boolean;
  }[] = [];

  let matched = 0;
  let mismatched = 0;
  let missing = 0;

  for (const cg of liveData) {
    const localCoin = await db.coin.findUnique({
      where: { coingeckoId: cg.id },
      include: {
        rawMarketDaily: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    if (!localCoin) {
      missing++;
      samples.push({
        coingeckoId: cg.id,
        localPrice: null,
        livePrice: cg.current_price,
        diffPct: null,
        withinTolerance: false,
      });
      continue;
    }

    if (!localCoin.rawMarketDaily || localCoin.rawMarketDaily.length === 0) {
      missing++;
      samples.push({
        coingeckoId: cg.id,
        localPrice: null,
        livePrice: cg.current_price,
        diffPct: null,
        withinTolerance: false,
      });
      continue;
    }

    const latestLocal = localCoin.rawMarketDaily[0];
    const localPrice = latestLocal.price;
    const livePrice = cg.current_price;

    if (livePrice <= 0 || localPrice <= 0) {
      samples.push({
        coingeckoId: cg.id,
        localPrice,
        livePrice,
        diffPct: null,
        withinTolerance: false,
      });
      continue;
    }

    const diffPct = Math.abs((localPrice - livePrice) / livePrice) * 100;
    const within = diffPct <= PRICE_TOLERANCE * 100;

    samples.push({
      coingeckoId: cg.id,
      localPrice,
      livePrice,
      diffPct: Math.round(diffPct * 100) / 100,
      withinTolerance: within,
    });

    if (within) matched++;
    else mismatched++;
  }

  const total = matched + mismatched + missing;
  const status: 'pass' | 'warn' | 'fail' =
    mismatched === 0 && missing === 0
      ? 'pass'
      : missing === total
        ? 'fail'
        : 'warn';

  return {
    name: 'Live CoinGecko Price Comparison',
    status,
    message:
      status === 'pass'
        ? `All ${total} sampled coins match CoinGecko (tolerance: ±${Math.round(PRICE_TOLERANCE * 100)}%)`
        : `${matched}/${total} match | ${mismatched} outside tolerance | ${missing} missing locally`,
    details: {
      tolerancePct: Math.round(PRICE_TOLERANCE * 100),
      matched,
      mismatched,
      missing,
      samples,
    },
  };
}

async function validateVolumeRealness(): Promise<CheckResult> {
  const liveData = await fetchCoinGeckoData();

  const samples: {
    coingeckoId: string;
    localVolume: number | null;
    liveVolume: number | null;
  }[] = [];

  let suspicious = 0;

  for (const cg of liveData) {
    const localCoin = await db.coin.findUnique({
      where: { coingeckoId: cg.id },
      include: {
        rawMarketDaily: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    const localVolume = localCoin?.rawMarketDaily?.[0]?.totalVolume ?? null;
    const liveVolume = cg.current_price * 200000; // approximate daily volume proxy from market cap/mcap not returned, so use a rough check

    samples.push({
      coingeckoId: cg.id,
      localVolume,
      liveVolume,
    });

    if (localVolume === null || localVolume === 0 || localVolume < 0) {
      suspicious++;
    }
  }

  return {
    name: 'Volume Realism',
    status: suspicious === 0 ? 'pass' : 'warn',
    message:
      suspicious === 0
        ? 'All sampled coins have valid volume data'
        : `${suspicious} coints have null/zero/negative volume`,
    details: { samples: samples.slice(0, 10) },
  };
}

function formatTable(items: unknown[]): string {
  return items
    .map(item => {
      if (typeof item === 'string') return `  - ${item}`;
      const obj = item as Record<string, unknown>;
      const parts = Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`);
      return `  - ${parts.join(', ')}`;
    })
    .join('\n');
}

async function main(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║     CoinGecko Realness Validation (Phase 4)      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const allResults: CheckResult[] = [];

  try {
    allResults.push(await validateSymbols());
  } catch (e) {
    allResults.push({
      name: 'Symbol Sanity',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  try {
    const priceResult = await validatePrices();
    allResults.push(priceResult);
  } catch (e) {
    allResults.push({
      name: 'CoinGecko Price Comparison',
      status: 'fail',
      message: `Error fetching/validating: ${(e as Error).message}`,
    });
  }

  try {
    const volResult = await validateVolumeRealness();
    allResults.push(volResult);
  } catch (e) {
    allResults.push({
      name: 'Volume Realism',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  console.log('── Results ──────────────────────────────────────\n');
  for (const r of allResults) {
    const icon =
      r.status === 'pass'
        ? '\x1b[32m✔\x1b[0m'
        : r.status === 'warn'
          ? '\x1b[33m⚠\x1b[0m'
          : '\x1b[31m✘\x1b[0m';
    console.log(`${icon} [${r.status.toUpperCase().padEnd(4)}] ${r.name}`);
    console.log(`    ${r.message}`);
    if (r.details && typeof r.details === 'object') {
      const formatted = formatTable([r.details]).trim();
      if (formatted) {
        console.log(formatted);
      }
    }
    console.log('');
  }

  const passed = allResults.filter(r => r.status === 'pass').length;
  const warned = allResults.filter(r => r.status === 'warn').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  console.log(
    `\nSummary: ${passed} passed, ${warned} warnings, ${failed} failed (${allResults.length} total)\n`
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
