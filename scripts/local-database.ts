import { existsSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Client, escapeIdentifier, escapeLiteral } from 'pg';
import { assertClusterIdentifier } from '../src/shared/db/safety';

const root = realpathSync(process.cwd());
const local = resolve(root, '.local');
const data = join(local, 'postgres-data');
const binary = join(local, 'postgresql', 'bin');
const stateFile = join(local, 'database-state.json');
// 55432 is already occupied on this workstation. Never stop/adopt its listener.
const port = 55433;
const mode = process.argv[2] ?? 'start';

function run(executable: string, args: string[]) {
  // PostgreSQL children inherit Windows pipe handles; ignored stdio prevents a
  // successful pg_ctl start from keeping spawnSync blocked until server exit.
  const result = spawnSync(join(binary, `${executable}.exe`), args, { stdio: 'ignore', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`Local PostgreSQL command failed: ${executable}`);
  }
}

interface State { cluster: string; admin: string; migrator: string; runtime: string; testMigrator: string; testRuntime: string; systemIdentifier?: string; restoreDatabase?: string; ownedDatabases?: string[] }
function connection(user: string, password: string, database: string) {
  return `postgresql://${user}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;
}

function controlIdentifier(): string {
  const result = spawnSync(join(binary, 'pg_controldata.exe'), ['-D', data], { encoding: 'utf8', windowsHide: true, env: { ...process.env, LC_ALL: 'C', LANG: 'C', LANGUAGE: 'C' } });
  const id = /Database system identifier:\s+(\d+)/.exec(result.stdout ?? '')?.[1];
  if (result.status !== 0 || !id) throw new Error('Cannot verify physical cluster identity');
  return id;
}

function verifyOwnedDirectory(state: State) {
  if (realpathSync(data).toLowerCase() !== data.toLowerCase()) throw new Error('Data directory redirects outside the project');
  assertClusterIdentifier(state.systemIdentifier, controlIdentifier());
}

async function main() {
  if (process.platform !== 'win32') throw new Error('Use the documented Compose environment on Linux/macOS');
  if (!existsSync(join(binary, 'postgres.exe'))) throw new Error('Portable binaries missing; see docs/LOCAL_DEVELOPMENT.md');
  if (!['start', 'stop', 'status'].includes(mode)) throw new Error('Use db:local start|stop|status');
  mkdirSync(local, { recursive: true });
  if (mode === 'stop' || mode === 'status') {
    if (!existsSync(stateFile) || !existsSync(join(data, 'PG_VERSION'))) throw new Error('No project-owned cluster');
    verifyOwnedDirectory(JSON.parse(readFileSync(stateFile, 'utf8')) as State);
    run('pg_ctl', [mode, '-D', data, ...(mode === 'stop' ? ['-m', 'fast', '-w'] : [])]);
    console.log(`Project-owned PostgreSQL ${mode}: complete`);
    return;
  }
  if (!existsSync(stateFile)) {
    if (existsSync(join(data, 'PG_VERSION'))) throw new Error('Refusing to adopt an unrecognised data directory');
    const secret = () => randomBytes(24).toString('hex');
    const state: State = { cluster: `travel_${randomBytes(8).toString('hex')}`, admin: secret(), migrator: secret(), runtime: secret(), testMigrator: secret(), testRuntime: secret() };
    writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
  }
  const state = JSON.parse(readFileSync(stateFile, 'utf8')) as State;
  if (existsSync(data) && realpathSync(data).toLowerCase() !== data.toLowerCase()) throw new Error('Unsafe data directory');
  if (existsSync(join(data, 'PG_VERSION'))) verifyOwnedDirectory(state);
  if (!existsSync(join(data, 'PG_VERSION'))) {
    const passwordFile = join(local, 'initdb-password.txt');
    writeFileSync(passwordFile, state.admin, { mode: 0o600 });
    run('initdb', ['-D', data, '-U', 'travel_admin', '--pwfile', passwordFile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale-provider=builtin', '--builtin-locale=C.UTF-8']);
    state.systemIdentifier = controlIdentifier();
    writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
    verifyOwnedDirectory(state);
    writeFileSync(join(data, 'postgresql.auto.conf'), `listen_addresses = '127.0.0.1'\nport = ${port}\nmax_connections = 30\nshared_buffers = '32MB'\ncluster_name = '${state.cluster}'\n`, { flag: 'a' });
  }
  const status = spawnSync(join(binary, 'pg_ctl.exe'), ['status', '-D', data], { windowsHide: true, encoding: 'utf8' });
  if (status.status !== 0) {
    writeFileSync(join(data, 'postgresql.auto.conf'), `\nport = ${port}\n`, { flag: 'a' });
    run('pg_ctl', ['start', '-D', data, '-l', join(local, 'postgres.log'), '-w', '-t', '30']);
  }
  const admin = new Client({ connectionString: connection('travel_admin', state.admin, 'postgres'), connectionTimeoutMillis: 3000 });
  await admin.connect();
  try {
    const ownership = await admin.query<{ cluster_name: string; data_directory: string }>("SELECT current_setting('cluster_name') AS cluster_name, current_setting('data_directory') AS data_directory");
    if (ownership.rows[0]?.cluster_name !== state.cluster || resolve(ownership.rows[0].data_directory) !== data) throw new Error('Refusing to configure a different PostgreSQL cluster');
    const roles = [['travel_migrator', state.migrator], ['travel_runtime', state.runtime], ['travel_test_migrator', state.testMigrator], ['travel_test_runtime', state.testRuntime]] as const;
    for (const [name, password] of roles) {
      if ((await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [name])).rowCount === 0) {
        await admin.query(`CREATE ROLE ${escapeIdentifier(name)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ${escapeLiteral(password)}`);
      }
    }
    const restoreDatabase = state.restoreDatabase ?? 'travel_test_restore';
    if (!/^travel_test_restore(?:_[a-z0-9_]+)?$/.test(restoreDatabase)) throw new Error('Invalid restore database name');
    for (const [database, owner] of [['travel_dev', 'travel_migrator'], ['travel_test_foundation', 'travel_test_migrator'], [restoreDatabase, 'travel_test_migrator']]) {
      if (!database || !owner) throw new Error('Invalid provisioning tuple');
      const existing = await admin.query<{ owner: string }>('SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1', [database]);
      if (existing.rowCount === 0) {
        await admin.query(`CREATE DATABASE ${escapeIdentifier(database)} OWNER ${escapeIdentifier(owner)}`);
        state.ownedDatabases = [...new Set([...(state.ownedDatabases ?? []), database])];
        writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
      } else if (existing.rows[0]?.owner !== owner) throw new Error('Existing database owner mismatch');
      const db = new Client({ connectionString: connection('travel_admin', state.admin, database) });
      await db.connect();
      try {
        const purpose = database === 'travel_dev' ? 'development' : database === 'travel_test_foundation' ? 'test' : 'restore';
        const markerExists = (await db.query("SELECT to_regclass('public.travel_database_identity') AS marker")).rows[0].marker;
        if (markerExists) {
          const markers = await db.query('SELECT project_id,purpose FROM public.travel_database_identity');
          if (markers.rowCount !== 1 || markers.rows[0].project_id !== state.cluster || markers.rows[0].purpose !== purpose) throw new Error('Existing database marker mismatch');
        } else if (!state.ownedDatabases?.includes(database)) throw new Error('Refusing to adopt an unmarked existing database');
        await db.query('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm; REVOKE CREATE ON SCHEMA public FROM PUBLIC;');
        await db.query(`REVOKE TEMPORARY ON DATABASE ${escapeIdentifier(database)} FROM PUBLIC`);
        await db.query("CREATE TABLE IF NOT EXISTS public.travel_database_identity(project_id text PRIMARY KEY, purpose text NOT NULL CHECK(purpose IN ('development','test','restore')))");
        const markers = await db.query('SELECT project_id,purpose FROM public.travel_database_identity');
        if (markers.rowCount === 0) await db.query('INSERT INTO public.travel_database_identity(project_id,purpose) VALUES($1,$2)', [state.cluster, purpose]);
        else if (markers.rowCount !== 1 || markers.rows[0].project_id !== state.cluster || markers.rows[0].purpose !== purpose) throw new Error('Existing database marker mismatch');
        const runtime = database === 'travel_dev' ? 'travel_runtime' : 'travel_test_runtime';
        await db.query(`GRANT CONNECT ON DATABASE ${escapeIdentifier(database)} TO ${escapeIdentifier(runtime)}; GRANT USAGE ON SCHEMA public TO ${escapeIdentifier(runtime)}`);
        await db.query(`REVOKE ALL ON public.travel_database_identity FROM PUBLIC; GRANT SELECT ON public.travel_database_identity TO ${escapeIdentifier(owner)},${escapeIdentifier(runtime)}`);
      } finally { await db.end(); }
    }
  } finally { await admin.end(); }
  const env = {
    DATABASE_URL: connection('travel_runtime', state.runtime, 'travel_dev'),
    MIGRATION_DATABASE_URL: connection('travel_migrator', state.migrator, 'travel_dev'),
    TEST_DATABASE_URL: connection('travel_test_migrator', state.testMigrator, 'travel_test_foundation'),
    TEST_RUNTIME_DATABASE_URL: connection('travel_test_runtime', state.testRuntime, 'travel_test_foundation'),
    RESTORE_DATABASE_URL: connection('travel_test_migrator', state.testMigrator, state.restoreDatabase ?? 'travel_test_restore'),
    TRAVEL_DATABASE_ID: state.cluster,
  };
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) writeFileSync(envPath, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  else if (!/^TRAVEL_DATABASE_ID=/m.test(readFileSync(envPath, 'utf8'))) writeFileSync(envPath, `\nTRAVEL_DATABASE_ID=${state.cluster}\n`, { flag: 'a' });
  console.log(`Project-owned PostgreSQL/PostGIS ready on 127.0.0.1:${port}; existing 5432 and 55432 untouched.`);
  console.log('Generated credentials are kept in ignored .local and .env.local; existing env files are preserved.');
}

main().catch(() => { console.error('Local database operation failed. Check .local/postgres.log and the local setup guide. No existing database was targeted.'); process.exitCode = 1; });
