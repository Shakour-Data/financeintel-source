/**
 * Full Historical Data Backfill API
 *
 * POST /api/data/backfill-full
 * Body: { days?: number, stage?: 'raw'|'global'|'scores'|'market-indicators'|'score-history' }
 *
 * - days: Number of days to backfill (default 1095 = 3 years)
 * - stage: If provided, only run that specific stage (for chunked processing)
 *   Options: 'raw', 'global', 'scores', 'fast-scores', 'market-indicators', 'score-history'
 *
 * GET /api/data/backfill-full
 * Returns the current backfill status (row counts for all tables)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullBackfill, runBackfillStage, getBackfillStatus } from '@/lib/historical-backfill';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = Math.min(Math.max(body.days ?? 1095, 1), 3650);
    const stage = body.stage as 'raw' | 'global' | 'scores' | 'fast-scores' | 'market-indicators' | 'score-history' | undefined;

    if (stage) {
      // Run a specific stage
      const endDate = new Date().toISOString().split('T')[0];
      const startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - days);
      const startDate = startDateObj.toISOString().split('T')[0];

      console.log(`[BackfillFull] Running stage "${stage}" for ${days} days (${startDate} to ${endDate})...`);

      const result = await runBackfillStage(stage, startDate, endDate);

      return NextResponse.json({
        success: result.success,
        stage,
        daysRange: { start: startDate, end: endDate },
        stages: result.stages,
        durationMs: result.durationMs,
        error: result.error,
      });
    }

    // Run full backfill (all stages)
    console.log(`[BackfillFull] Starting comprehensive backfill for ${days} days...`);

    const result = await runFullBackfill(days);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Backfill completed in ${Math.round(result.durationMs / 1000)}s`,
        stages: result.stages,
        durationMs: result.durationMs,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error, stages: result.stages, durationMs: result.durationMs },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[BackfillFull] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Backfill failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getBackfillStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[BackfillFull] Status error:', error);
    return NextResponse.json({ error: 'Failed to get backfill status' }, { status: 500 });
  }
}
