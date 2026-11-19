import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Client, escapeLiteral } from "pg";
import { runner } from "node-pg-migrate";
import { resolveDatabaseConnection } from "./connection-profile";
import { assertProfileIdentity } from "./profile-identity";
import { validateMigrationSql } from "./safety";

interface MigrationFile {
  name: string;
  sql: string;
  checksum: string;
}
const wrapperLock = 23942026;
type MigrationLoader = Exclude<
  NonNullable<
    Parameters<typeof runner>[0]["migrationLoaderStrategies"]
  >[number]["loader"],
  string
>;

export async function migrateDatabase(
  url: string,
  purpose: "development" | "test",
  directory = resolve("db/migrations"),
): Promise<number> {
  const connection = resolveDatabaseConnection(url, purpose);
  const files = new Map<string, MigrationFile>();
  for (const filename of (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    if (!/^\d{13}_[a-z0-9_]+\.sql$/.test(filename))
      throw new Error("Invalid migration filename");
    const sql = (await readFile(resolve(directory, filename), "utf8")).replace(
      /\r\n/g,
      "\n",
    );
    validateMigrationSql(sql);
    const name = basename(filename, ".sql");
    files.set(name, {
      name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }
  if (files.size === 0) throw new Error("No SQL migrations found");
  const db = connection.withConnectionString(
    (connectionString) =>
      new Client({
        connectionString,
        connectionTimeoutMillis:
          connection.target.profile === "neon-test" ? 10000 : 3000,
        query_timeout: 15000,
      }),
  );
  await db.connect();
  let locked = false;
  try {
    await assertProfileIdentity(db, connection.target, purpose);
    locked =
      (
        await db.query<{ locked: boolean }>(
          "SELECT pg_try_advisory_lock($1) AS locked",
          [wrapperLock],
        )
      ).rows[0]?.locked === true;
    if (!locked) throw new Error("Migration already running");
    await db.query(
      "CREATE TABLE IF NOT EXISTS public.travel_migration_checksums (name text PRIMARY KEY, checksum text NOT NULL CHECK(length(checksum)=64))",
    );
    const history = await db.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM public.travel_migration_checksums",
    );
    for (const row of history.rows) {
      if (files.get(row.name)?.checksum !== row.checksum)
        throw new Error("Migration checksum mismatch or applied file missing");
    }
    const exists = (
      await db.query<{ table: string | null }>(
        "SELECT to_regclass('public.travel_migrations')::text AS table",
      )
    ).rows[0]?.table;
    if (exists) {
      const applied = await db.query<{ name: string }>(
        "SELECT name FROM public.travel_migrations",
      );
      const verified = new Set(history.rows.map((row) => row.name));
      if (applied.rows.some((row) => !verified.has(row.name)))
        throw new Error("Unverified migration history");
    }
    const loader: MigrationLoader = async (paths) =>
      paths.map((path) => {
        const name = basename(path, ".sql");
        const migration = files.get(name);
        if (!migration) throw new Error("Unexpected migration file");
        return {
          id: name,
          filePaths: [path],
          actions: {
            down: false,
            up: (pgm) => {
              pgm.sql(migration.sql);
              // Checksum and migration DDL commit together in the runner transaction.
              pgm.sql(
                `INSERT INTO public.travel_migration_checksums(name,checksum) VALUES (${escapeLiteral(name)},${escapeLiteral(migration.checksum)})`,
              );
            },
          },
        };
      });
    const applied = await runner({
      dbClient: db,
      dir: directory,
      direction: "up",
      migrationsTable: "travel_migrations",
      migrationsSchema: "public",
      checkOrder: true,
      singleTransaction: true,
      migrationLoaderStrategies: [{ extensions: [".sql"], loader }],
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });
    return applied.length;
  } finally {
    try {
      if (locked)
        await db.query("SELECT pg_advisory_unlock($1)", [wrapperLock]);
    } finally {
      await db.end();
    }
  }
}
