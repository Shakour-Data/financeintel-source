/**
 * Prisma client configured for SQLite with Prisma 7 client engine.
 *
 * Uses the @prisma/adapter-better-sqlite3 adapter for direct SQLite connection.
 * The database file is located at /home/z/my-project/db/custom.db.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import path from 'node:path';

const rawDbPath = process.env.DATABASE_URL?.replace('file:', '').trim();
const dbPath = rawDbPath
  ? path.isAbsolute(rawDbPath)
    ? rawDbPath
    : path.join(process.cwd(), rawDbPath)
  : path.join(process.cwd(), 'db', 'custom.db');

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const database = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(database);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export default db;
