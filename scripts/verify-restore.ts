import { mkdir } from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { loadLocalEnv } from './load-local-env';
import { assertLocalDatabaseTarget } from '../src/shared/db/target';

loadLocalEnv();
const sourceUrl = process.env.TEST_DATABASE_URL;
const targetUrl = process.env.RESTORE_DATABASE_URL;
if (!sourceUrl || !targetUrl) throw new Error('TEST_DATABASE_URL and RESTORE_DATABASE_URL required');
const sourceTarget = assertLocalDatabaseTarget(sourceUrl, 'test');
const restoreTarget = assertLocalDatabaseTarget(targetUrl, 'test');
if (!restoreTarget.database.startsWith('travel_test_restore') || restoreTarget.database === sourceTarget.database) throw new Error('Restore requires a separate dedicated restore database');
const bin = process.env.PG_BIN_DIR ?? (process.platform === 'win32' ? resolve('.local/postgresql/bin') : '/usr/bin');
const executable = (name: string) => join(bin, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
const source = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 3000 });
const target = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 3000 });
let markerCreated = false;

function run(name: string, url: string, args: string[]) {
  const parsed = new URL(url);
  if (!existsSync(executable(name))) throw new Error('PostgreSQL backup tools missing');
  const result = spawnSync(executable(name), ['--host', parsed.hostname, '--port', parsed.port, '--username', decodeURIComponent(parsed.username), '--dbname', parsed.pathname.slice(1), ...args], {
    encoding: 'utf8', windowsHide: true, timeout: 60000,
    env: { ...process.env, PGPASSWORD: decodeURIComponent(parsed.password) },
  });
  if (result.status !== 0) {
    writeFileSync('.local/restore-error.log', result.stderr || 'Tool did not return diagnostics');
    throw new Error(`${name} failed; see ignored .local/restore-error.log; no reset/clean attempted`);
  }
}

async function main() {
  await source.connect();
  await target.connect();
  try {
    const tables = await target.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'spatial_ref_sys'");
    if (tables.rowCount !== 0) throw new Error('Restore target is not empty; refusing to overwrite');
    if ((await source.query("SELECT 1 FROM countries WHERE code='ZZ'")).rowCount) throw new Error('Synthetic restore marker already exists');
    await source.query("INSERT INTO countries(code,default_locale,active) VALUES('ZZ','ru',false)");
    markerCreated = true;
    const folder = resolve('.local/backups');
    await mkdir(folder, { recursive: true });
    const backup = join(folder, `foundation-${Date.now()}.dump`);
    // Extension-owned reference rows are already provisioned by the admin.
    // Only WGS84 is supported; no user-defined SRIDs exist at this stage.
    run('pg_dump', sourceUrl!, ['--format=custom', '--no-owner', '--no-acl', '--no-comments', '--exclude-table-data=public.spatial_ref_sys', '--file', backup]);
    run('pg_restore', targetUrl!, ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', backup]);
    const query = "SELECT (SELECT count(*)::int FROM countries WHERE code='ZZ') AS marker, (SELECT count(*)::int FROM travel_migrations) AS migrations, (SELECT count(*)::int FROM travel_migration_checksums) AS checksums, (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace) AS constraints, PostGIS_Version() AS postgis";
    const before = (await source.query(query)).rows[0];
    const restored = (await target.query(query)).rows[0];
    if (JSON.stringify(before) !== JSON.stringify(restored) || restored.marker !== 1) throw new Error('Restored schema/data verification mismatch');
    console.log(JSON.stringify({ status: 'PASS', ...restored, backup: backup.replaceAll('\\', '/') }));
  } finally {
    try { if (markerCreated) await source.query("DELETE FROM countries WHERE code='ZZ'"); }
    finally { await Promise.all([source.end(), target.end()]); }
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Restore verification failed'); process.exitCode = 1; });
