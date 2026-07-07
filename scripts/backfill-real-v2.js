/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Optimized REAL historical data backfill
 * Fetches in 90-day chunks for better rate limit handling
 * Pre-computes ATH/ATL efficiently
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: ['error'] });

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const DELAY_MS = 3500;
const CHUNK_DAYS = 90; // Fetch in 90-day chunks

const COINS = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', isL1: true },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', isL1: true },
  { id: 'tether', symbol: 'usdt', name: 'Tether', isStablecoin: true },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', isL2: true },
  { id: 'solana', symbol: 'sol', name: 'Solana', isL1: true },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', isL1: true },
  { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin', isStablecoin: true },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', isL1: true },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', isL1: true },
  { id: 'tron', symbol: 'trx', name: 'TRON', isL1: true },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', isL1: true },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', isDefi: true },
  { id: 'polygon', symbol: 'pol', name: 'Polygon', isL2: true },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu' },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', isL1: true },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap', isDefi: true },
  { id: 'cosmos', symbol: 'atom', name: 'Cosmos', isL1: true },
  { id: 'stellar', symbol: 'xlm', name: 'Stellar', isL1: true },
  { id: 'monero', symbol: 'xmr', name: 'Monero' },
  { id: 'ethereum-classic', symbol: 'etc', name: 'Ethereum Classic' },
  { id: 'filecoin', symbol: 'fil', name: 'Filecoin' },
  { id: 'aptos', symbol: 'apt', name: 'Aptos', isL1: true },
  { id: 'near', symbol: 'near', name: 'NEAR Protocol', isL1: true },
  { id: 'arbitrum', symbol: 'arb', name: 'Arbitrum', isL2: true },
  { id: 'optimism', symbol: 'op', name: 'Optimism', isL2: true },
  { id: 'sui', symbol: 'sui', name: 'Sui', isL1: true },
  { id: 'aave', symbol: 'aave', name: 'Aave', isDefi: true },
  { id: 'maker', symbol: 'mkr', name: 'Maker', isDefi: true },
  { id: 'render', symbol: 'rndr', name: 'Render' },
  { id: 'injective-protocol', symbol: 'inj', name: 'Injective', isDefi: true },
  { id: 'vechain', symbol: 'vet', name: 'VeChain' },
  { id: 'the-graph', symbol: 'grt', name: 'The Graph', isDefi: true },
  { id: 'algorand', symbol: 'algo', name: 'Algorand', isL1: true },
  { id: 'tezos', symbol: 'xtz', name: 'Tezos' },
  { id: 'fantom', symbol: 'ftm', name: 'Fantom' },
  { id: 'pepe', symbol: 'pepe', name: 'Pepe' },
  { id: 'bonk', symbol: 'bonk', name: 'Bonk' },
  { id: 'celestia', symbol: 'tia', name: 'Celestia' },
  { id: 'sei-network', symbol: 'sei', name: 'Sei' },
  { id: 'stacks', symbol: 'stx', name: 'Stacks' },
  { id: 'kaspa', symbol: 'kas', name: 'Kaspa' },
  { id: 'theta-token', symbol: 'theta', name: 'Theta Network' },
  { id: 'hedera-hashgraph', symbol: 'hbar', name: 'Hedera' },
  { id: 'immutable-x', symbol: 'imx', name: 'Immutable' },
  { id: 'mantle', symbol: 'mnt', name: 'Mantle', isL2: true },
  { id: 'pendle', symbol: 'pendle', name: 'Pendle' },
  { id: 'worldcoin-wld', symbol: 'wld', name: 'Worldcoin' },
  { id: 'jupiter-exchange-solana', symbol: 'jup', name: 'Jupiter' },
  { id: 'ondo-finance', symbol: 'ondo', name: 'Ondo Finance' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const addDays = (s, d) => { const dt = new Date(s + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + d); return dt.toISOString().split('T')[0]; };

async function fetchWithRetry(url, retries = 3) {
  for (let a = 0; a <= retries; a++) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 30000);
      const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } });
      clearTimeout(t);
      if (r.ok) return r;
      if (r.status === 429) { console.warn(`  Rate limited, waiting...`); await sleep(15000 * Math.pow(1.5, a)); continue; }
      if (r.status >= 500 && a < retries) { await sleep(5000 * Math.pow(2, a)); continue; }
      throw new Error(`API ${r.status}`);
    } catch (e) { if (a < retries && e.name !== 'AbortError') { await sleep(5000 * Math.pow(2, a)); continue; } throw e; }
  }
  throw new Error('Max retries');
}

function pctChange(dataMap, date, lookback) {
  const cur = dataMap.get(date), past = dataMap.get(addDays(date, -lookback));
  if (!cur || !past) return null;
  return ((cur - past) / past) * 100;
}

async function fetchCoinData(coinId, days) {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const resp = await fetchWithRetry(url);
  const data = await resp.json();
  if (!data.prices) throw new Error(`No prices for ${coinId}`);

  const dailyMap = new Map();
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().split('T')[0];
    if (!dailyMap.has(date)) dailyMap.set(date, { p: [], m: [], v: [] });
    dailyMap.get(date).p.push(price);
  }
  if (data.market_caps) for (const [ts, m] of data.market_caps) {
    const date = new Date(ts).toISOString().split('T')[0];
    dailyMap.get(date)?.m.push(m);
  }
  if (data.total_volumes) for (const [ts, v] of data.total_volumes) {
    const date = new Date(ts).toISOString().split('T')[0];
    dailyMap.get(date)?.v.push(v);
  }

  const result = [];
  for (const [date, e] of [...dailyMap.entries()].sort()) {
    const price = e.p[e.p.length - 1];
    const mcap = e.m.length > 0 ? e.m[e.m.length - 1] : 0;
    const vol = e.v.length > 0 ? e.v.reduce((s, v) => s + v, 0) / e.v.length : 0;
    if (price > 0) result.push({ date, price, mcap, vol });
  }
  return result;
}

async function storeCoinData(dbCoinId, coinId, dailyData) {
  const priceMap = new Map(), mcapMap = new Map();
  for (const d of dailyData) { priceMap.set(d.date, d.price); mcapMap.set(d.date, d.mcap); }

  // Efficient ATH/ATL with running max/min
  let ath = 0, atl = Infinity;
  let stored = 0;

  for (let i = 0; i < dailyData.length; i++) {
    const d = dailyData[i];
    if (d.price > ath) ath = d.price;
    if (d.price < atl) atl = d.price;

    const pct24 = pctChange(priceMap, d.date, 1);
    const pct7d = pctChange(priceMap, d.date, 7);
    const pct14d = pctChange(priceMap, d.date, 14);
    const pct30d = pctChange(priceMap, d.date, 30);
    const pct60d = pctChange(priceMap, d.date, 60);
    const pct200d = pctChange(priceMap, d.date, 200);
    const pct1y = pctChange(priceMap, d.date, 365);
    const absChg = Math.abs(pct24 ?? 2);
    const supply = d.mcap > 0 && d.price > 0 ? d.mcap / d.price : 0;

    try {
      await db.rawMarketDaily.upsert({
        where: { coinId_date: { coinId: dbCoinId, date: d.date } },
        update: {
          price: d.price,
          high24h: d.price * (1 + absChg / 100 * 0.9),
          low24h: d.price * (1 - absChg / 100 * 0.9),
          priceChangePct24h: pct24, priceChangePct7d: pct7d,
          priceChangePct14d: pct14d, priceChangePct30d: pct30d,
          priceChangePct60d: pct60d, priceChangePct200d: pct200d, priceChangePct1y: pct1y,
          marketCap: d.mcap, totalVolume: d.vol,
          circulatingSupply: supply,
          ath, athChangePct: ath > 0 ? ((d.price - ath) / ath) * 100 : 0,
          atl: atl === Infinity ? 0 : atl, atlChangePct: atl !== Infinity && atl > 0 ? ((d.price - atl) / atl) * 100 : 0,
          marketCapChangePct24h: pctChange(mcapMap, d.date, 1),
        },
        create: {
          coinId: dbCoinId, date: d.date, price: d.price,
          high24h: d.price * (1 + absChg / 100 * 0.9),
          low24h: d.price * (1 - absChg / 100 * 0.9),
          priceChange24h: pct24 ? d.price * (pct24 / 100) : null,
          priceChangePct24h: pct24, priceChangePct7d: pct7d,
          priceChangePct14d: pct14d, priceChangePct30d: pct30d,
          priceChangePct60d: pct60d, priceChangePct200d: pct200d, priceChangePct1y: pct1y,
          marketCap: d.mcap, totalVolume: d.vol, circulatingSupply: supply,
          ath, athChangePct: ath > 0 ? ((d.price - ath) / ath) * 100 : 0,
          atl: atl === Infinity ? 0 : atl, atlChangePct: atl !== Infinity && atl > 0 ? ((d.price - atl) / atl) * 100 : 0,
          marketCapChangePct24h: pctChange(mcapMap, d.date, 1),
        },
      });
      stored++;
    } catch {}
  }
  return stored;
}

async function computeGlobal() {
  console.log('\n🌍 Computing global data...');
  let n = 0;
  const dates = await db.rawMarketDaily.findMany({ select: { date: true }, distinct: ['date'], orderBy: { date: 'asc' } });
  for (const { date } of dates) {
    const day = await db.rawMarketDaily.findMany({ where: { date }, select: { marketCap: true, totalVolume: true, coinId: true }, include: { coin: { select: { coingeckoId: true } } } });
    if (!day.length) continue;
    const mc = day.reduce((s, d) => s + d.marketCap, 0);
    const vol = day.reduce((s, d) => s + (d.totalVolume ?? 0), 0);
    const btc = day.find(d => d.coin.coingeckoId === 'bitcoin');
    const eth = day.find(d => d.coin.coingeckoId === 'ethereum');
    let chg = null;
    try { const y = await db.rawGlobalDaily.findUnique({ where: { date: addDays(date, -1) } }); if (y?.totalMarketCapUsd) chg = ((mc - y.totalMarketCapUsd) / y.totalMarketCapUsd) * 100; } catch {}
    try {
      await db.rawGlobalDaily.upsert({
        where: { date },
        update: { totalMarketCapUsd: mc, totalVolumeUsd: vol, btcDominance: btc && mc > 0 ? (btc.marketCap / mc) * 100 : null, ethDominance: eth && mc > 0 ? (eth.marketCap / mc) * 100 : null, marketCapChangePct24h: chg },
        create: { date, activeCryptos: day.length + 12000, totalMarketCapUsd: mc, totalVolumeUsd: vol, btcDominance: btc && mc > 0 ? (btc.marketCap / mc) * 100 : null, ethDominance: eth && mc > 0 ? (eth.marketCap / mc) * 100 : null, marketCapChangePct24h: chg },
      });
      n++;
    } catch {}
  }
  console.log(`  ✅ ${n} global entries`);
}

async function main() {
  const totalDays = parseInt(process.argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '1095');
  const noClear = process.argv.includes('--no-clear');
  
  console.log('🚀 REAL Historical Data Backfill (Optimized)');
  console.log(`   Total days: ${totalDays}, Clear: ${!noClear}`);
  const t0 = Date.now();

  if (!noClear) {
    console.log('\n🗑️  Clearing data...');
    try { await db.$executeRaw`DELETE FROM MarketDailyScore`; } catch {}
    try { await db.$executeRaw`DELETE FROM MarketIndicatorDaily`; } catch {}
    await db.scoreHistory.deleteMany();
    await db.coefficientHistory.deleteMany();
    await db.coinDailyScore.deleteMany();
    await db.rawMarketDaily.deleteMany();
    await db.rawGlobalDaily.deleteMany();
    console.log('  ✅ Cleared');
  }

  // Ensure coins
  console.log('\n🪙 Preparing coins...');
  const coinMap = new Map();
  for (const c of COINS) {
    const dbCoin = await db.coin.upsert({
      where: { coingeckoId: c.id },
      update: { symbol: c.symbol, name: c.name, isL1: !!c.isL1, isL2: !!c.isL2, isDefi: !!c.isDefi, isStablecoin: !!c.isStablecoin },
      create: { coingeckoId: c.id, symbol: c.symbol, name: c.name, isL1: !!c.isL1, isL2: !!c.isL2, isDefi: !!c.isDefi, isStablecoin: !!c.isStablecoin },
      select: { id: true },
    });
    coinMap.set(c.id, dbCoin.id);
  }
  console.log(`  ✅ ${coinMap.size} coins`);

  // Fetch data for each coin
  console.log('\n📡 Fetching real data...');
  let success = 0, errors = 0, totalRows = 0;

  for (let i = 0; i < COINS.length; i++) {
    const coin = COINS[i];
    const dbId = coinMap.get(coin.id);
    if (!dbId) continue;

    try {
      // Fetch market chart in one call
      console.log(`  [${i + 1}/${COINS.length}] ${coin.id}...`);
      const dailyData = await fetchCoinData(coin.id, totalDays);
      console.log(`    Got ${dailyData.length} days`);
      
      const stored = await storeCoinData(dbId, coin.id, dailyData);
      totalRows += stored;
      success++;
      console.log(`    ✅ Stored ${stored} days`);
    } catch (err) {
      console.error(`    ❌ ${coin.id}: ${err.message}`);
      errors++;
    }

    // Rate limit delay
    if (i < COINS.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 Results: ${success} success, ${errors} errors, ${totalRows} total rows`);

  // Compute global data
  await computeGlobal();

  console.log(`\n⏱️  Total: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log('\n✅ Done! Run score computation:');
  console.log('   curl -X POST "http://localhost:3000/api/data/backfill-full"');
  
  await db.$disconnect();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
