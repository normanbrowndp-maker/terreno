import "server-only";
import { Pool } from "pg";
import { parseServerConfig } from "@/shared/config/env";
import { foundationMigration } from "./schema-version";
import { resolveDatabaseConnection } from "./connection-profile";
import { assertProfileIdentity } from "./profile-identity";
import type { CatalogDatabase } from "./catalog-database";

let pool: Pool | undefined;
let poolTarget: string | undefined;

function runtimePool() {
  const { databaseUrl } = parseServerConfig(process.env);
  if (!databaseUrl) throw new Error("Database not configured");
  const connection = resolveDatabaseConnection(databaseUrl, "runtime");
  const targetKey = JSON.stringify(connection.target); // Public identity metadata only, never the URL.
  if (pool && targetKey !== poolTarget)
    throw new Error("Database configuration changed; restart required");
  if (!pool) {
    pool = connection.withConnectionString(
      (connectionString) =>
        new Pool({
          connectionString,
          max: 5,
          connectionTimeoutMillis:
            connection.target.profile === "neon-test" ? 10000 : 1500,
          query_timeout: 2000,
          idleTimeoutMillis: 10000,
        }),
    );
    poolTarget = targetKey;
    pool.on("error", () => console.warn("database_pool_idle_error"));
  }
  return { db: pool, target: connection.target };
}

export async function checkDatabaseReadiness(): Promise<void> {
  const { db, target } = runtimePool();
  await assertProfileIdentity(
    db,
    target,
    target.database === "travel_dev" ? "development" : "test",
  );
  const result = await db.query<{ ready: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM public.travel_migrations WHERE name = $1)
       AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ready`,
    [foundationMigration],
  );
  if (!result.rows[0]?.ready) throw new Error("Database schema not ready");
}

export async function withCatalogDatabase<T>(
  read: (db: CatalogDatabase) => Promise<T>,
): Promise<T> {
  const { db, target } = runtimePool();
  await assertProfileIdentity(
    db,
    target,
    target.database === "travel_dev" ? "development" : "test",
  );
  return read(db);
}
