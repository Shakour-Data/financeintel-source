/**
 * Auto-seed API — ensures the database has data.
 *
 * POST /api/data/ensure-seeded
 *   Returns { seeded: boolean, coinCount: number } immediately.
 *   If the database is empty, kicks off background seeding.
 *
 * GET /api/data/ensure-seeded
 *   Returns { needsSeed: boolean, coinCount: number } without seeding.
 */

import { NextResponse } from 'next/server';
import { needsSeed, ensureSeeded } from '@/lib/auto-seed';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const needed = await needsSeed();
    const count = await db.coin.count();
    return NextResponse.json({ needsSeed: needed, coinCount: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Run the seed synchronously and return the result
    const success = await ensureSeeded();
    const count = await db.coin.count();
    return NextResponse.json({
      seeded: success,
      coinCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        seeded: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
