import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tables/[id] — Get a single table configuration
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await db.tableConfig.findUnique({ where: { id } });
    if (!config) {
      return NextResponse.json({ error: 'Table config not found' }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch table config:', error);
    return NextResponse.json({ error: 'Failed to fetch table config' }, { status: 500 });
  }
}

// PUT /api/tables/[id] — Update a table configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, columns, isDefault, sortOrder } = body;

    const existing = await db.tableConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Table config not found' }, { status: 404 });
    }

    // If setting as default, unset others
    if (isDefault) {
      await db.tableConfig.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const config = await db.tableConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(columns !== undefined && { columns: JSON.stringify(columns) }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update table config:', error);
    return NextResponse.json({ error: 'Failed to update table config' }, { status: 500 });
  }
}

// DELETE /api/tables/[id] — Delete a table configuration
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.tableConfig.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Table config not found' }, { status: 404 });
    }

    if (existing.isBuiltIn) {
      return NextResponse.json({ error: 'Cannot delete built-in table configuration' }, { status: 403 });
    }

    await db.tableConfig.delete({ where: { id } });

    // If we deleted the default, set another as default
    if (existing.isDefault) {
      const first = await db.tableConfig.findFirst({ orderBy: { createdAt: 'asc' } });
      if (first) {
        await db.tableConfig.update({ where: { id: first.id }, data: { isDefault: true } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete table config:', error);
    return NextResponse.json({ error: 'Failed to delete table config' }, { status: 500 });
  }
}
