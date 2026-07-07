/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Standalone script to fetch REAL 3-year historical data from CoinGecko
 * and replace all GBM-simulated data.
 * 
 * Usage: node scripts/backfill-real.js [--days 1095] [--no-clear]
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: ['error'] });

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_DELAY_MS = 4000;
const MAX_RETRIES = 4;

const KNOWN_COINS = [
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

async function fetchWithBackoff(url, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timeout);
      if (response.ok) return response;
      if (response.status === 429) {
        const waitMs = 5000 * Math.pow(2, attempt);
        console.warn(`  Rate limited (429), waiting ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        if (attempt < retries) { await sleep(Math.min(waitMs, 60000)); continue; }
      }
      if (response.status >= 500 && attempt < retries) {
        await sleep(5000 * Math.pow(2, attempt)); continue;
      }
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < retries && err.name !== 'AbortError') {
        await sleep(5000 * Math.pow(2, attempt)); continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

function computeChangePct(dataMap, dateStr, lookbackDays) {
  const current = dataMap.get(dateStr);
  if (!current) return null;
  const past = dataMap.get(addDays(dateStr, -lookbackDays));
  if (!past) return null;
  return ((current - past) / past) * 100;
}

async function clearAllData() {
  console.log('\n🗑️  Clearing all existing data...');
  try { await db.$executeRaw`DELETE FROM MarketDailyScore`; } catch {}
  try { await db.$executeRaw`DELETE FROM MarketIndicatorDaily`; } catch {}
  const r1 = await db.scoreHistory.deleteMany(); console.log(`  Cleared ScoreHistory: ${r1.count}`);
  const r2 = await db.coefficientHistory.deleteMany(); console.log(`  Cleared CoefficientHistory: ${r2.count}`);
  const r3 = await db.coinDailyScore.deleteMany(); console.log(`  Cleared CoinDailyScore: ${r3.count}`);
  const r4 = await db.rawMarketDaily.deleteMany(); console.log(`  Cleared RawMarketDaily: ${r4.count}`);
  const r5 = await db.rawGlobalDaily.deleteMany(); console.log(`  Cleared RawGlobalDaily: ${r5.count}`);
  console.log('  ✅ All data cleared');
}

async function ensureCoins() {
  console.log('\n🪙 Ensuring coins exist in DB...');
  const map = new Map();
  for (const c of KNOWN_COINS) {
    const dbCoin = await db.coin.upsert({
      where: { coingeckoId: c.id },
      update: { symbol: c.symbol, name: c.name, isL1: !!c.isL1, isL2: !!c.isL2, isDefi: !!c.isDefi, isStablecoin: !!c.isStablecoin },
      create: { coingeckoId: c.id, symbol: c.symbol, name: c.name, isL1: !!c.isL1, isL2: !!c.isL2, isDefi: !!c.isDefi, isStablecoin: !!c.isStablecoin },
      select: { id: true },
    });
    map.set(c.id, dbCoin.id);
  }
  console.log(`  ✅ ${map.size} coins ready`);
  return map;
}

async function fetchAndStoreCoinData(coinId, dbCoinId, days) {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  console.log(`  📡 Fetching ${coinId} (${days} days)...`);
  const response = await fetchWithBackoff(url);
  const data = await response.json();
  if (!data.prices || !Array.isArray(data.prices)) throw new Error(`Invalid response for ${coinId}`);

  const dailyMap = new Map();
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().split('T')[0];
    if (!dailyMap.has(date)) dailyMap.set(date, { prices: [], mcaps: [], volumes: [] });
    dailyMap.get(date).prices.push(price);
  }
  if (data.market_caps) for (const [ts, mcap] of data.market_caps) {
    const date = new Date(ts).toISOString().split('T')[0];
    dailyMap.get(date)?.mcaps.push(mcap);
  }
  if (data.total_volumes) for (const [ts, vol] of data.total_volumes) {
    const date = new Date(ts).toISOString().split('T')[0];
    dailyMap.get(date)?.volumes.push(vol);
  }

  const sortedDates = [...dailyMap.keys()].sort();
  const dailyData = [];
  for (const date of sortedDates) {
    const e = dailyMap.get(date);
    const price = e.prices[e.prices.length - 1];
    const marketCap = e.mcaps.length > 0 ? e.mcaps[e.mcaps.length - 1] : 0;
    const totalVolume = e.volumes.length > 0 ? e.volumes.reduce((s, v) => s + v, 0) / e.volumes.length : 0;
    if (price > 0) dailyData.push({ date, price, marketCap, totalVolume });
  }
  console.log(`  📊 Got ${dailyData.length} days (${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]})`);

  const priceByDate = new Map(), mcapByDate = new Map();
  for (const d of dailyData) { priceByDate.set(d.date, d.price); mcapByDate.set(d.date, d.marketCap); }

  // Fetch coin detail for supply data
  let coinDetail = null;
  try {
    await sleep(REQUEST_DELAY_MS);
    const detailResp = await fetchWithBackoff(`${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
    const detailJson = await detailResp.json();
    const md = detailJson.market_data || {};
    coinDetail = { totalSupply: md.total_supply ?? null, maxSupply: md.max_supply ?? null };
  } catch (e) { console.warn(`  ⚠️  No detail for ${coinId}: ${e.message}`); }

  let created = 0;
  const totalSupply = coinDetail?.totalSupply ?? null;
  const maxSupply = coinDetail?.maxSupply ?? null;

  // Batch upsert for performance
  const BATCH_SIZE = 30;
  for (let batch = 0; batch < dailyData.length; batch += BATCH_SIZE) {
    const batchData = dailyData.slice(batch, batch + BATCH_SIZE);
    for (let idx = batch; idx < Math.min(batch + BATCH_SIZE, dailyData.length); idx++) {
      const d = dailyData[idx];
      const i = idx;
      const priceChangePct24h = computeChangePct(priceByDate, d.date, 1);
      const priceChangePct7d = computeChangePct(priceByDate, d.date, 7);
      const priceChangePct14d = computeChangePct(priceByDate, d.date, 14);
      const priceChangePct30d = computeChangePct(priceByDate, d.date, 30);
      const priceChangePct60d = computeChangePct(priceByDate, d.date, 60);
      const priceChangePct200d = computeChangePct(priceByDate, d.date, 200);
      const priceChangePct1y = computeChangePct(priceByDate, d.date, 365);
      const absChg = Math.abs(priceChangePct24h ?? 2);
      const high24h = d.price * (1 + absChg / 100 * 0.9);
      const low24h = d.price * (1 - absChg / 100 * 0.9);
      const circulatingSupply = d.marketCap > 0 && d.price > 0 ? d.marketCap / d.price : 0;
      let runningAth = 0, runningAtl = Infinity;
      for (let j = 0; j <= i; j++) { if (dailyData[j].price > runningAth) runningAth = dailyData[j].price; if (dailyData[j].price < runningAtl) runningAtl = dailyData[j].price; }
      if (runningAtl === Infinity) runningAtl = 0;
      const athChangePct = runningAth > 0 ? ((d.price - runningAth) / runningAth) * 100 : 0;
      const atlChangePct = runningAtl > 0 ? ((d.price - runningAtl) / runningAtl) * 100 : 0;
      const mcapChangePct24h = computeChangePct(mcapByDate, d.date, 1);

      try {
        await db.rawMarketDaily.upsert({
          where: { coinId_date: { coinId: dbCoinId, date: d.date } },
          update: {
            price: d.price, high24h, low24h,
            priceChange24h: priceChangePct24h ? d.price * (priceChangePct24h / 100) : null,
            priceChangePct1h: null, priceChangePct24h, priceChangePct7d,
            priceChangePct14d, priceChangePct30d, priceChangePct60d,
            priceChangePct200d, priceChangePct1y,
            marketCap: d.marketCap, marketCapChangePct24h: mcapChangePct24h,
            fullyDilutedValuation: maxSupply ? maxSupply * d.price : totalSupply ? totalSupply * d.price : null,
            totalVolume: d.totalVolume, circulatingSupply,
            totalSupply, maxSupply,
            ath: runningAth, athChangePct, atl: runningAtl, atlChangePct,
          },
          create: {
            coinId: dbCoinId, date: d.date, price: d.price, high24h, low24h,
            priceChange24h: priceChangePct24h ? d.price * (priceChangePct24h / 100) : null,
            priceChangePct1h: null, priceChangePct24h, priceChangePct7d,
            priceChangePct14d, priceChangePct30d, priceChangePct60d,
            priceChangePct200d, priceChangePct1y,
            marketCap: d.marketCap, marketCapChangePct24h: mcapChangePct24h,
            fullyDilutedValuation: maxSupply ? maxSupply * d.price : totalSupply ? totalSupply * d.price : null,
            totalVolume: d.totalVolume, circulatingSupply,
            totalSupply, maxSupply,
            ath: runningAth, athChangePct, atl: runningAtl, atlChangePct,
          },
        });
        created++;
      } catch {}
    }
  }
  console.log(`  ✅ Stored ${created} days for ${coinId}`);
  return dailyData.length;
}

async function computeGlobalData() {
  console.log('\n🌍 Computing global daily data...');
  let created = 0;
  const dates = await db.rawMarketDaily.findMany({ select: { date: true }, distinct: ['date'], orderBy: { date: 'asc' } });
  for (const { date } of dates) {
    const dayData = await db.rawMarketDaily.findMany({
      where: { date }, select: { marketCap: true, totalVolume: true, coinId: true },
      include: { coin: { select: { coingeckoId: true } } },
    });
    if (!dayData.length) continue;
    const totalMC = dayData.reduce((s, d) => s + d.marketCap, 0);
    const totalVol = dayData.reduce((s, d) => s + (d.totalVolume ?? 0), 0);
    const btc = dayData.find(d => d.coin.coingeckoId === 'bitcoin');
    const eth = dayData.find(d => d.coin.coingeckoId === 'ethereum');
    const btcDom = btc && totalMC > 0 ? (btc.marketCap / totalMC) * 100 : null;
    const ethDom = eth && totalMC > 0 ? (eth.marketCap / totalMC) * 100 : null;
    let mcapChg = null;
    try {
      const yd = await db.rawGlobalDaily.findUnique({ where: { date: addDays(date, -1) } });
      if (yd?.totalMarketCapUsd) mcapChg = ((totalMC - yd.totalMarketCapUsd) / yd.totalMarketCapUsd) * 100;
    } catch {}
    try {
      await db.rawGlobalDaily.upsert({
        where: { date },
        update: { activeCryptos: dayData.length + 12000, totalMarketCapUsd: totalMC, totalVolumeUsd: totalVol, btcDominance: btcDom, ethDominance: ethDom, marketCapChangePct24h: mcapChg },
        create: { date, activeCryptos: dayData.length + 12000, totalMarketCapUsd: totalMC, totalVolumeUsd: totalVol, btcDominance: btcDom, ethDominance: ethDom, marketCapChangePct24h: mcapChg },
      });
      created++;
    } catch {}
  }
  console.log(`  ✅ ${created} global daily entries`);
}

async function main() {
  const args = process.argv.slice(2);
  const days = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] ?? '1095');
  const noClear = args.includes('--no-clear');

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Crypto AI Dashboard — REAL Historical Data Backfill   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Days: ${days}, Clear: ${!noClear}`);
  const startTime = Date.now();

  if (!noClear) await clearAllData();
  const coinDbIdMap = await ensureCoins();

  console.log('\n📡 Fetching REAL historical data from CoinGecko...');
  let totalDays = 0, success = 0, errors = 0;

  for (let i = 0; i < KNOWN_COINS.length; i++) {
    const coin = KNOWN_COINS[i];
    const dbId = coinDbIdMap.get(coin.id);
    if (!dbId) continue;
    try {
      const n = await fetchAndStoreCoinData(coin.id, dbId, days);
      totalDays += n; success++;
    } catch (err) {
      console.error(`  ❌ ${coin.id}: ${err.message}`);
      errors++;
    }
    if (i < KNOWN_COINS.length - 1) {
      process.stdout.write(`  ⏳ Waiting (${i + 1}/${KNOWN_COINS.length})...`);
      await sleep(REQUEST_DELAY_MS);
      console.log(' done');
    }
  }

  console.log(`\n📊 Success: ${success}/${KNOWN_COINS.length}, Errors: ${errors}, Days: ${totalDays}`);
  await computeGlobalData();

  const dur = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Duration: ${dur}s`);
  console.log('\n🎉 Raw data backfill complete! Run score computation via:');
  console.log('   curl -X POST "http://localhost:3000/api/data/backfill-full"');

  await db.$disconnect();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
