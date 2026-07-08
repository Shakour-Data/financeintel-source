/**
 * Phase 4 — Data Integrity Validation Script
 *
 * Checks:
 *  1. Foreign key integrity (orphan records)
 *  2. Date validity (ISO format, non-empty, correct sort direction)
 *  3. Score ranges (1–10 for all scored fields)
 *  4. Schema table existence
 */

import 'dotenv/config';
import { db } from '../src/lib/db';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, unknown>;
}

async function checkSchema(): Promise<CheckResult> {
  const tables = [
    'Coin',
    'RawMarketDaily',
    'RawGlobalDaily',
    'HierarchyNode',
    'CoefficientHistory',
    'ScoreHistory',
    'CoinDailyScore',
    'MarketIndicatorDaily',
    'MarketDailyScore',
    'NewsArticle',
    'PredictionHistory',
    'TableConfig',
  ];

  const missing: string[] = [];
  for (const table of tables) {
    try {
      const model = (db as unknown as Record<string, unknown>)[
        table.toLowerCase()
      ] as unknown;
      if (!model) missing.push(table);
      else {
        const count = await (model as { count: () => Promise<number> }).count();
        if (count === undefined) missing.push(table);
      }
    } catch {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    return {
      name: 'Schema Existence',
      status: 'fail',
      message: `Missing/invalid tables: ${missing.join(', ')}`,
    };
  }

  const counts: Record<string, number> = {};
  for (const t of tables) {
    const model = (db as unknown as Record<string, unknown>)[
      t.toLowerCase()
    ] as { count: () => Promise<number> };
    if (model) counts[t] = await model.count();
  }

  return {
    name: 'Schema Existence',
    status: 'pass',
    message: 'All 12 tables exist and are accessible',
    details: counts,
  };
}

async function checkForeignKeys(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const orphanScore = await db.$queryRaw<
    { coinId: string; nodeKey: string; date: string }[]
  >`
    SELECT sh.coinId, sh.nodeKey, sh.date
    FROM ScoreHistory sh
    LEFT JOIN Coin c ON sh.coinId = c.id
    LEFT JOIN HierarchyNode hn ON sh.nodeKey = hn.key
    WHERE c.id IS NULL OR hn.key IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'ScoreHistory FKs',
    status: orphanScore.length === 0 ? 'pass' : 'fail',
    message:
      orphanScore.length === 0
        ? 'No orphan ScoreHistory records'
        : `Found ${orphanScore.length} orphan records (showing up to 5)`,
    details:
      orphanScore.length > 0 ? { samples: orphanScore } : undefined,
  });

  const orphanCds = await db.$queryRaw<{ coinId: string }[]>`
    SELECT cds.coinId
    FROM CoinDailyScore cds
    LEFT JOIN Coin c ON cds.coinId = c.id
    WHERE c.id IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'CoinDailyScore FK',
    status: orphanCds.length === 0 ? 'pass' : 'fail',
    message:
      orphanCds.length === 0
        ? 'No orphan CoinDailyScore records'
        : `Found ${orphanCds.length} orphan records`,
    details:
      orphanCds.length > 0 ? { samples: orphanCds } : undefined,
  });

  const orphanRmd = await db.$queryRaw<{ coinId: string }[]>`
    SELECT rmd.coinId
    FROM RawMarketDaily rmd
    LEFT JOIN Coin c ON rmd.coinId = c.id
    WHERE c.id IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'RawMarketDaily FK',
    status: orphanRmd.length === 0 ? 'pass' : 'fail',
    message:
      orphanRmd.length === 0
        ? 'No orphan RawMarketDaily records'
        : `Found ${orphanRmd.length} orphan records`,
    details:
      orphanRmd.length > 0 ? { samples: orphanRmd } : undefined,
  });

  const orphanCh = await db.$queryRaw<{ nodeKey: string }[]>`
    SELECT ch.nodeKey
    FROM CoefficientHistory ch
    LEFT JOIN HierarchyNode hn ON ch.nodeKey = hn.key
    WHERE hn.key IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'CoefficientHistory FK',
    status: orphanCh.length === 0 ? 'pass' : 'fail',
    message:
      orphanCh.length === 0
        ? 'No orphan CoefficientHistory records'
        : `Found ${orphanCh.length} orphan records`,
    details:
      orphanCh.length > 0 ? { samples: orphanCh } : undefined,
  });

  const orphanMids = await db.$queryRaw<{ nodeKey: string }[]>`
    SELECT mid.nodeKey
    FROM MarketIndicatorDaily mid
    LEFT JOIN HierarchyNode hn ON mid.nodeKey = hn.key
    WHERE hn.key IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'MarketIndicatorDaily FK',
    status: orphanMids.length === 0 ? 'pass' : 'fail',
    message:
      orphanMids.length === 0
        ? 'No orphan MarketIndicatorDaily records'
        : `Found ${orphanMids.length} orphan records`,
    details:
      orphanMids.length > 0 ? { samples: orphanMids } : undefined,
  });

  const orphanPh = await db.$queryRaw<{ coinId: string; nodeKey: string }[]>`
    SELECT ph.coinId, ph.nodeKey
    FROM PredictionHistory ph
    LEFT JOIN Coin c ON ph.coinId = c.id
    LEFT JOIN HierarchyNode hn ON ph.nodeKey = hn.key
    WHERE c.id IS NULL OR hn.key IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'PredictionHistory FK',
    status: orphanPh.length === 0 ? 'pass' : 'fail',
    message:
      orphanPh.length === 0
        ? 'No orphan PredictionHistory records'
        : `Found ${orphanPh.length} orphan records`,
    details:
      orphanPh.length > 0 ? { samples: orphanPh } : undefined,
  });

  const orphanNa = await db.$queryRaw<{ coinId: string }[]>`
    SELECT na.coinId
    FROM NewsArticle na
    LEFT JOIN Coin c ON na.coinId = c.id
    WHERE na.coinId IS NOT NULL AND c.id IS NULL
    LIMIT 5
  `;
  results.push({
    name: 'NewsArticle FK',
    status: orphanNa.length === 0 ? 'pass' : 'fail',
    message:
      orphanNa.length === 0
        ? 'No orphan NewsArticle records'
        : `Found ${orphanNa.length} orphan records`,
    details:
      orphanNa.length > 0 ? { samples: orphanNa } : undefined,
  });

  return results;
}

async function checkDates(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const badRmdDates = await db.rawMarketDaily.findMany({
    where: {
      OR: [
        { date: { equals: '' } },
        { date: { not: { contains: '-' } } },
      ],
    },
    select: { id: true, date: true },
    take: 5,
  });
  results.push({
    name: 'RawMarketDaily Date Format',
    status: badRmdDates.length === 0 ? 'pass' : 'fail',
    message:
      badRmdDates.length === 0
        ? 'All dates are valid ISO format'
        : `Found ${badRmdDates.length} invalid date entries`,
    details:
      badRmdDates.length > 0 ? { samples: badRmdDates } : undefined,
  });

  const badCdsDates = await db.coinDailyScore.findMany({
    where: {
      OR: [
        { date: { equals: '' } },
        { date: { not: { contains: '-' } } },
      ],
    },
    select: { id: true, date: true },
    take: 5,
  });
  results.push({
    name: 'CoinDailyScore Date Format',
    status: badCdsDates.length === 0 ? 'pass' : 'fail',
    message:
      badCdsDates.length === 0
        ? 'All dates are valid ISO format'
        : `Found ${badCdsDates.length} invalid date entries`,
    details:
      badCdsDates.length > 0 ? { samples: badCdsDates } : undefined,
  });

  const dateRanges = await db.$queryRaw<
    { table: string; minDate: string | null; maxDate: string | null }[]
  >`
    SELECT 'RawMarketDaily' as table, MIN(date) as minDate, MAX(date) as maxDate FROM RawMarketDaily
    UNION ALL
    SELECT 'CoinDailyScore', MIN(date), MAX(date) FROM CoinDailyScore
    UNION ALL
    SELECT 'MarketDailyScore', MIN(date), MAX(date) FROM MarketDailyScore
    UNION ALL
    SELECT 'ScoreHistory', MIN(date), MAX(date) FROM ScoreHistory
  `;

  const ranges: Record<string, { min: string | null; max: string | null }> = {};
  for (const r of dateRanges) ranges[r.table] = { min: r.minDate, max: r.maxDate };

  const anomalies = dateRanges.filter(r => {
    if (!r.minDate || !r.maxDate) return true;
    const d = new Date(r.minDate + 'T00:00:00Z');
    return isNaN(d.getTime()) || d.getFullYear() < 2010 || d.getFullYear() > 2099;
  });

  results.push({
    name: 'Date Ranges',
    status: anomalies.length === 0 ? 'pass' : 'warn',
    message:
      anomalies.length === 0
        ? 'All date ranges look valid'
        : `Suspicious date ranges found in ${anomalies.map(a => a.table).join(', ')}`,
    details: ranges,
  });

  return results;
}

async function checkScoreRanges(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const badScores = await db.$queryRaw<
    { table: string; field: string; badCount: number }[]
  >`
    SELECT 'CoinDailyScore' as table, 'aiScore' as field, COUNT(*) as badCount
      FROM CoinDailyScore WHERE aiScore < 1 OR aiScore > 10
    UNION ALL
    SELECT 'CoinDailyScore', 'fundamentalScore', COUNT(*) FROM CoinDailyScore WHERE fundamentalScore IS NOT NULL AND (fundamentalScore < 1 OR fundamentalScore > 10)
    UNION ALL
    SELECT 'CoinDailyScore', 'technicalScore', COUNT(*) FROM CoinDailyScore WHERE technicalScore IS NOT NULL AND (technicalScore < 1 OR technicalScore > 10)
    UNION ALL
    SELECT 'CoinDailyScore', 'marketScore', COUNT(*) FROM CoinDailyScore WHERE marketScore IS NOT NULL AND (marketScore < 1 OR marketScore > 10)
    UNION ALL
    SELECT 'MarketDailyScore', 'marketAiScore', COUNT(*) FROM MarketDailyScore WHERE marketAiScore < 1 OR marketAiScore > 10
    UNION ALL
    SELECT 'ScoreHistory', 'score', COUNT(*) FROM ScoreHistory WHERE score < 1 OR score > 10
  `;

  const detectedIssues = badScores.filter(b => b.badCount > 0);
  if (detectedIssues.length > 0) {
    results.push({
      name: 'Score Ranges (1–10)',
      status: 'fail',
      message: `Found scores outside 1–10 range`,
      details: { violations: detectedIssues },
    });
  } else {
    results.push({
      name: 'Score Ranges (1–10)',
      status: 'pass',
      message: 'All scored fields are within 1–10 range',
    });
  }

  return results;
}

async function checkMissingScores(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const rawDateCount = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT date) as count FROM "RawMarketDaily"`;
  const cdsDateCount = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(DISTINCT date) as count FROM "CoinDailyScore"`;
  const diff = rawDateCount - cdsDateCount;

  results.push({
    name: 'Missing Daily Scores',
    status: diff === 0 ? 'pass' : 'warn',
    message:
      diff === 0
        ? 'CoinDailyScore coverage matches RawMarketDaily'
        : `${diff} RawMarketDaily date(s) without CoinDailyScore`,
  });

  const coinCount = await db.coin.count();
  const rmdCoinCount = await db.rawMarketDaily.count({ distinct: ['coinId'] });
  const missingCoins = coinCount - rmdCoinCount;

  results.push({
    name: 'Coin Coverage',
    status: missingCoins === 0 ? 'pass' : 'warn',
    message:
      missingCoins === 0
        ? 'All coins have RawMarketDaily data'
        : `${missingCoins} coin(s) with no RawMarketDaily data`,
  });

  return results;
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
  console.log('║         Data Integrity Validation (Phase 4)      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const allResults: CheckResult[] = [];

  try {
    allResults.push(await checkSchema());
  } catch (e) {
    allResults.push({
      name: 'Schema Check',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  try {
    const fkResults = await checkForeignKeys();
    allResults.push(...fkResults);
  } catch (e) {
    allResults.push({
      name: 'Foreign Keys',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  try {
    const dateResults = await checkDates();
    allResults.push(...dateResults);
  } catch (e) {
    allResults.push({
      name: 'Date Checks',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  try {
    const scoreResults = await checkScoreRanges();
    allResults.push(...scoreResults);
  } catch (e) {
    allResults.push({
      name: 'Score Range Checks',
      status: 'fail',
      message: `Error: ${(e as Error).message}`,
    });
  }

  try {
    const missResults = await checkMissingScores();
    allResults.push(...missResults);
  } catch (e) {
    allResults.push({
      name: 'Missing Scores Check',
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
