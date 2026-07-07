/**
 * Data Cleanup Module — Clears all fake/GBM-generated data from the database.
 *
 * Only clears data tables (RawMarketDaily, RawGlobalDaily, ScoreHistory,
 * CoinDailyScore, CoefficientHistory, MarketIndicatorDaily, MarketDailyScore).
 * Preserves structural tables (Coin, HierarchyNode) which contain real metadata.
 */

import { db } from '@/lib/db';

/**
 * Delete ALL data from the data/analytical tables.
 * Preserves Coin and HierarchyNode tables (structural metadata).
 *
 * Returns counts of deleted rows from each table.
 */
export async function clearAllFakeData(): Promise<{
  rawMarketDaily: number;
  rawGlobalDaily: number;
  scoreHistory: number;
  coinDailyScore: number;
  coefficientHistory: number;
  marketIndicatorDaily: number;
  marketDailyScore: number;
}> {
  console.log('[DataCleanup] Starting cleanup of all fake data...');

  // Delete in dependency order (child tables first to respect FK constraints)
  // SQLite with Prisma doesn't always enforce FK but let's be safe.

  // 1. MarketIndicatorDaily (depends on HierarchyNode)
  let marketIndicatorDaily = 0;
  try {
    const result = await db.marketIndicatorDaily.deleteMany();
    marketIndicatorDaily = result.count;
    console.log(`[DataCleanup] Cleared MarketIndicatorDaily (${marketIndicatorDaily} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing MarketIndicatorDaily:', err);
  }

  // 2. MarketDailyScore (standalone, but logically depends on CoinDailyScore)
  let marketDailyScore = 0;
  try {
    const result = await db.$executeRaw`DELETE FROM "MarketDailyScore"`;
    marketDailyScore = result;
    console.log(`[DataCleanup] Cleared MarketDailyScore (${marketDailyScore} rows)`);
  } catch (err) {
    // Table might not exist or be empty
    console.warn('[DataCleanup] Error clearing MarketDailyScore:', err);
  }

  // 3. ScoreHistory (depends on Coin and HierarchyNode)
  let scoreHistory = 0;
  try {
    const result = await db.scoreHistory.deleteMany();
    scoreHistory = result.count;
    console.log(`[DataCleanup] Cleared ScoreHistory (${scoreHistory} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing ScoreHistory:', err);
  }

  // 4. CoinDailyScore (depends on Coin)
  let coinDailyScore = 0;
  try {
    const result = await db.coinDailyScore.deleteMany();
    coinDailyScore = result.count;
    console.log(`[DataCleanup] Cleared CoinDailyScore (${coinDailyScore} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing CoinDailyScore:', err);
  }

  // 5. CoefficientHistory (depends on HierarchyNode)
  let coefficientHistory = 0;
  try {
    const result = await db.coefficientHistory.deleteMany();
    coefficientHistory = result.count;
    console.log(`[DataCleanup] Cleared CoefficientHistory (${coefficientHistory} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing CoefficientHistory:', err);
  }

  // 6. RawMarketDaily (depends on Coin)
  let rawMarketDaily = 0;
  try {
    const result = await db.rawMarketDaily.deleteMany();
    rawMarketDaily = result.count;
    console.log(`[DataCleanup] Cleared RawMarketDaily (${rawMarketDaily} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing RawMarketDaily:', err);
  }

  // 7. RawGlobalDaily (standalone)
  let rawGlobalDaily = 0;
  try {
    const result = await db.rawGlobalDaily.deleteMany();
    rawGlobalDaily = result.count;
    console.log(`[DataCleanup] Cleared RawGlobalDaily (${rawGlobalDaily} rows)`);
  } catch (err) {
    console.warn('[DataCleanup] Error clearing RawGlobalDaily:', err);
  }

  const total = rawMarketDaily + rawGlobalDaily + scoreHistory + coinDailyScore + coefficientHistory + marketIndicatorDaily + marketDailyScore;
  console.log(`[DataCleanup] Complete. Total rows deleted: ${total}`);

  return {
    rawMarketDaily,
    rawGlobalDaily,
    scoreHistory,
    coinDailyScore,
    coefficientHistory,
    marketIndicatorDaily,
    marketDailyScore,
  };
}
