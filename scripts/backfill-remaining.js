/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: ['error'] });

const ALL_COINS = [
  'bitcoin','ethereum','tether','binancecoin','solana','ripple','usd-coin',
  'cardano','dogecoin','avalanche-2','tron','polkadot','chainlink','polygon',
  'shiba-inu','litecoin','uniswap','cosmos','stellar','monero',
  'ethereum-classic','filecoin','aptos','near','arbitrum','optimism','sui',
  'aave','maker','render','injective-protocol','vechain','the-graph',
  'algorand','tezos','fantom','pepe','bonk','celestia','sei-network',
  'stacks','kaspa','theta-token','hedera-hashgraph','immutable-x','mantle',
  'pendle','worldcoin-wld','jupiter-exchange-solana','ondo-finance'
];

function addDays(s, n) { const dt = new Date(s + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().split('T')[0]; }
function pct(map, date, lookback) { const c = map.get(date), p = map.get(addDays(date, -lookback)); return c && p ? ((c - p) / p) * 100 : null; }

async function fetchAndStore(coinId, dbCoinId, days) {
  const url = 'https://api.coingecko.com/api/v3/coins/' + coinId + '/market_chart?vs_currency=usd&days=' + days;
  for (let retry = 0; retry < 5; retry++) {
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (resp.status === 429) { console.log('  Rate limited, waiting 30s...'); await new Promise(r => setTimeout(r, 30000)); continue; }
      if (resp.status >= 500) { console.log('  Server error, waiting...'); await new Promise(r => setTimeout(r, 10000)); continue; }
      const data = await resp.json();
      if (!data.prices) throw new Error('No prices');

      const dailyMap = new Map();
      for (const [ts, price] of data.prices) { dailyMap.set(new Date(ts).toISOString().split('T')[0], { price, mcap: 0, vol: 0 }); }
      if (data.market_caps) for (const [ts, mcap] of data.market_caps) { const d = new Date(ts).toISOString().split('T')[0]; if (dailyMap.has(d)) dailyMap.get(d).mcap = mcap; }
      if (data.total_volumes) for (const [ts, vol] of data.total_volumes) { const d = new Date(ts).toISOString().split('T')[0]; if (dailyMap.has(d)) dailyMap.get(d).vol = vol; }

      const priceArr = [...dailyMap.entries()].sort().map(([d, e]) => ({ date: d, price: e.price, mcap: e.mcap, vol: e.vol }));
      const priceMap = new Map(priceArr.map(d => [d.date, d.price]));
      let ath = 0, atl = Infinity, stored = 0;
      for (const d of priceArr) {
        if (d.price > ath) ath = d.price;
        if (d.price < atl) atl = d.price;
        const p24 = pct(priceMap, d.date, 1);
        const absChg = Math.abs(p24 ?? 2);
        const supply = d.mcap > 0 && d.price > 0 ? d.mcap / d.price : 0;
        try {
          await db.rawMarketDaily.upsert({
            where: { coinId_date: { coinId: dbCoinId, date: d.date } },
            update: { price: d.price, marketCap: d.mcap, totalVolume: d.vol, high24h: d.price * (1 + absChg / 100 * 0.9), low24h: d.price * (1 - absChg / 100 * 0.9), priceChangePct24h: p24, priceChangePct7d: pct(priceMap, d.date, 7), priceChangePct30d: pct(priceMap, d.date, 30), circulatingSupply: supply, ath, athChangePct: ath > 0 ? ((d.price - ath) / ath) * 100 : 0, atl: atl === Infinity ? 0 : atl, atlChangePct: atl !== Infinity && atl > 0 ? ((d.price - atl) / atl) * 100 : 0 },
            create: { coinId: dbCoinId, date: d.date, price: d.price, marketCap: d.mcap, totalVolume: d.vol, high24h: d.price * (1 + absChg / 100 * 0.9), low24h: d.price * (1 - absChg / 100 * 0.9), priceChangePct24h: p24, priceChangePct7d: pct(priceMap, d.date, 7), priceChangePct30d: pct(priceMap, d.date, 30), circulatingSupply: supply, ath, athChangePct: ath > 0 ? ((d.price - ath) / ath) * 100 : 0, atl: atl === Infinity ? 0 : atl, atlChangePct: atl !== Infinity && atl > 0 ? ((d.price - atl) / atl) * 100 : 0 },
          });
          stored++;
        } catch {}
      }
      return stored;
    } catch (e) {
      if (retry >= 4) throw e;
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  throw new Error('Max retries');
}

async function main() {
  // Find coins that already have data
  const existingCoins = await db.rawMarketDaily.findMany({ distinct: ['coinId'], include: { coin: { select: { coingeckoId: true } } } });
  const existingIds = new Set(existingCoins.map(c => c.coin.coingeckoId));
  const remaining = ALL_COINS.filter(id => !existingIds.has(id));
  console.log('Already have:', existingIds.size, 'coins. Remaining:', remaining.length);

  let total = 0, success = 0;
  for (let i = 0; i < remaining.length; i++) {
    const id = remaining[i];
    let coin = await db.coin.findFirst({ where: { coingeckoId: id } });
    if (!coin) coin = await db.coin.create({ data: { coingeckoId: id, symbol: id.substring(0, 5), name: id } });
    try {
      const n = await fetchAndStore(id, coin.id, 365);
      total += n; success++;
      console.log('[' + (i + 1) + '/' + remaining.length + '] ' + id + ': ' + n + ' days');
    } catch (e) {
      console.error('[' + (i + 1) + '/' + remaining.length + '] ' + id + ': FAILED - ' + e.message);
    }
    if (i < remaining.length - 1) await new Promise(r => setTimeout(r, 6000));
  }

  console.log('\nDone! Success: ' + success + '/' + remaining.length + ', Total rows: ' + total);
  await db.$disconnect();
}

main().catch(e => console.error('Fatal:', e));
