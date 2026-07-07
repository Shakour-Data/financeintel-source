/**
 * Data Cleanup API — DELETE /api/data/cleanup
 *
 * Clears all fake/GBM-generated data from the database.
 * Only clears data tables; preserves Coin and HierarchyNode structural metadata.
 */

import { NextResponse } from 'next/server';
import { clearAllFakeData } from '@/lib/data-cleanup';

export async function DELETE() {
  try {
    console.log('[CleanupAPI] Starting data cleanup...');
    const counts = await clearAllFakeData();

    const totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);

    console.log(`[CleanupAPI] Cleanup complete: ${totalRows} total rows deleted`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${totalRows} rows of fake data`,
      deleted: counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CleanupAPI] Error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Data cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
