import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tables — List all saved table configurations
export async function GET() {
  try {
    const configs = await db.tableConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(configs);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch table configs:', msg);
    return NextResponse.json({ error: 'Failed to fetch table configs', detail: msg }, { status: 500 });
  }
}

// POST /api/tables — Create a new table configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, columns, isDefault, isBuiltIn, sortOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: 'Columns must be an array' }, { status: 400 });
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await db.tableConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const config = await db.tableConfig.create({
      data: {
        name: name.trim(),
        columns: JSON.stringify(columns),
        isDefault: !!isDefault,
        isBuiltIn: !!isBuiltIn,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Failed to create table config:', error);
    return NextResponse.json({ error: 'Failed to create table config' }, { status: 500 });
  }
}
