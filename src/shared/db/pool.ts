import 'server-only';
import { Pool } from 'pg';
import { parseServerConfig } from '@/shared/config/env';
import { assertLocalDatabaseTarget } from './target';
import { foundationMigration } from './schema-version';
import { assertDatabaseIdentity } from './identity';
import type { CatalogDatabase } from './catalog-database';

let pool: Pool | undefined;

function runtimePool(): Pool {
  const { databaseUrl } = parseServerConfig(process.env);
  if (!databaseUrl) throw new Error('Database not configured');
  assertLocalDatabaseTarget(databaseUrl, 'runtime');
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 1500, query_timeout: 2000, idleTimeoutMillis: 10000 });
    pool.on('error', () => console.warn('database_pool_idle_error'));
  }
  return pool;
}

export async function checkDatabaseReadiness(): Promise<void> {
  const db = runtimePool();
  const target = assertLocalDatabaseTarget(parseServerConfig(process.env).databaseUrl!, 'runtime');
  await assertDatabaseIdentity(db, target.database === 'travel_dev' ? 'development' : 'test');
  const result = await db.query<{ ready: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM public.travel_migrations WHERE name = $1)
       AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ready`,
    [foundationMigration],
  );
  if (!result.rows[0]?.ready) throw new Error('Database schema not ready');
}

export async function withCatalogDatabase<T>(read: (db: CatalogDatabase) => Promise<T>): Promise<T> {
  const db = runtimePool();
  const target = assertLocalDatabaseTarget(parseServerConfig(process.env).databaseUrl!, 'runtime');
  await assertDatabaseIdentity(db, target.database === 'travel_dev' ? 'development' : 'test');
  return read(db);
}
