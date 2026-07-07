/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script to compute missing CoinDailyScore and ScoreHistory entries
 * for dates that have RawMarketDaily data but no scores.
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('Starting missing score computation...');

  // Import scoring engine
  const { calculateCryptoScore, getDimensionDefinitions } = require('../src/lib/scoring-engine-v2');
  
  // Dimension key to CoinDailyScore field mapping
  const dimensionFieldMap = {
    fundamental: 'fundamentalScore',
    technical: 'technicalScore',
    onchain: 'onchainScore',
    market_psychology: 'marketScore',
    news_sentiment: 'newsSentimentScore',
    macroeconomic: 'macroeconomicScore',
    regulatory: 'regulatoryScore',
    network_security: 'networkSecurityScore',
    derivatives: 'derivativesScore',
    whale_smart_money: 'whaleSmartMoneyScore',
    ecosystem_defi: 'ecosystemDefiScore',
    inter_market: 'interMarketScore',
  };

  // Find dates without scores
  const rawDates = await db.rawMarketDaily.findMany({
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'asc' },
  });
  const scoreDates = await db.coinDailyScore.findMany({
    select: { date: true },
    distinct: ['date'],
  });
  const scoreDateSet = new Set(scoreDates.map(d => d.date));
  const missingDates = rawDates.filter(d => !scoreDateSet.has(d.date));

  console.log(`Found ${missingDates.length} dates without scores`);

  if (missingDates.length === 0) {
    console.log('No missing scores to compute!');
    return;
  }

  // Get latest coefficient version
  const latestCoeff = await db.coefficientHistory.findFirst({
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  let currentVersion = (latestCoeff?.version ?? 0) + 1;

  let totalScores = 0;
  let totalHistories = 0;
  const CHUNK_SIZE = 5;

  for (let chunkStart = 0; chunkStart < missingDates.length; chunkStart += CHUNK_SIZE) {
    const chunkDates = missingDates.slice(chunkStart, chunkStart + CHUNK_SIZE);

    for (const { date } of chunkDates) {
      const rawMarketData = await db.rawMarketDaily.findMany({
        where: { date },
        include: { coin: true },
      });

      if (rawMarketData.length === 0) continue;

      const yesterday = addDays(date, -1);

      for (const rmd of rawMarketData) {
        try {
          const coinInput = {
            id: rmd.coin.coingeckoId,
            dbCoinId: rmd.coinId,
            symbol: rmd.coin.symbol,
            name: rmd.coin.name,
            current_price: rmd.price,
            market_cap: rmd.marketCap,
            market_cap_rank: 50,
            fully_diluted_valuation: rmd.fullyDilutedValuation,
            total_volume: rmd.totalVolume ?? 0,
            high_24h: rmd.high24h ?? rmd.price,
            low_24h: rmd.low24h ?? rmd.price,
            price_change_24h: rmd.priceChange24h ?? 0,
            price_change_percentage_24h: rmd.priceChangePct24h ?? 0,
            market_cap_change_24h: rmd.marketCapChangePct24h ? rmd.marketCap * (rmd.marketCapChangePct24h / 100) : 0,
            market_cap_change_percentage_24h: rmd.marketCapChangePct24h ?? 0,
            circulating_supply: rmd.circulatingSupply ?? 0,
            total_supply: rmd.totalSupply,
            max_supply: rmd.maxSupply,
            ath: rmd.ath ?? rmd.price,
            ath_change_percentage: rmd.athChangePct ?? 0,
            price_change_percentage_1h_in_currency: rmd.priceChangePct1h ?? undefined,
            price_change_percentage_7d_in_currency: rmd.priceChangePct7d ?? undefined,
          };

          const score = calculateCryptoScore(coinInput);
          const dbCoinId = rmd.coinId;

          const prevScore = await db.coinDailyScore.findUnique({
            where: { coinId_date: { coinId: dbCoinId, date: yesterday } },
          });

          const previousAiScore = prevScore?.aiScore ?? score.aiScore;
          const aiScoreChange = Math.round((score.aiScore - previousAiScore) * 100) / 100;

          const dimensionScores = {};
          for (const dim of score.dimensions) {
            dimensionScores[dim.key] = dim.score;
          }
          const dimensionFields = {};
          for (const [dimKey, fieldName] of Object.entries(dimensionFieldMap)) {
            dimensionFields[fieldName] = dimensionScores[dimKey] ?? null;
          }

          await db.coinDailyScore.upsert({
            where: { coinId_date: { coinId: dbCoinId, date } },
            update: {
              aiScore: score.aiScore,
              previousAiScore,
              aiScoreChange,
              confidence: score.confidence,
              coefficientVersion: currentVersion,
              ...dimensionFields,
            },
            create: {
              coinId: dbCoinId,
              date,
              aiScore: score.aiScore,
              previousAiScore,
              aiScoreChange,
              confidence: score.confidence,
              coefficientVersion: currentVersion,
              ...dimensionFields,
            },
          });
          totalScores++;

          // Store dimension-level ScoreHistory
          const prevScores = await db.scoreHistory.findMany({
            where: { coinId: dbCoinId, date: yesterday, nodeKey: { in: score.dimensions.map(d => d.key) } },
            select: { nodeKey: true, score: true },
          });
          const prevScoreMap = new Map(prevScores.map(s => [s.nodeKey, s.score]));

          for (const dim of score.dimensions) {
            const prevDimScore = prevScoreMap.get(dim.key);
            const dimChange = prevDimScore !== undefined
              ? Math.round((dim.score - prevDimScore) * 100) / 100
              : 0;

            await db.scoreHistory.upsert({
              where: { coinId_nodeKey_date: { coinId: dbCoinId, nodeKey: dim.key, date } },
              update: {
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
              create: {
                coinId: dbCoinId,
                nodeKey: dim.key,
                date,
                score: dim.score,
                previousScore: prevDimScore !== undefined && prevDimScore !== dim.score ? prevDimScore : null,
                scoreChange: dimChange !== 0 ? dimChange : null,
                coefficient: dim.coefficient,
              },
            });
            totalHistories++;
          }
        } catch (err) {
          console.error(`Score error for ${rmd.coin.coingeckoId} on ${date}:`, err.message);
        }
      }
    }

    console.log(`Processed chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}/${Math.ceil(missingDates.length / CHUNK_SIZE)} (${totalScores} scores, ${totalHistories} histories)`);
  }

  console.log(`\nDone! Total: ${totalScores} CoinDailyScore, ${totalHistories} ScoreHistory`);
}

main().catch(console.error).finally(() => db.$disconnect());
