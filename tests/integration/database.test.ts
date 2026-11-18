import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { readFile, readdir, mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { migrateDatabase } from '../../src/shared/db/migrate';
import { assertDatabaseIdentity } from '../../src/shared/db/identity';
import { assertTestRuntimeTarget } from '../../src/shared/db/safety';

const url = process.env.TEST_DATABASE_URL!;
const client = new Client({ connectionString: url });

beforeAll(async () => { await client.connect(); await assertDatabaseIdentity(client, 'test'); });
afterAll(async () => { await client.end(); });

describe('real PostgreSQL/PostGIS foundation', () => {
  it('applies the schema with tracked migration checksums', async () => {
    await migrateDatabase(url, 'test');
    const result = await client.query('SELECT checksum FROM travel_migration_checksums');
    expect(result.rowCount).toBe(4);
    expect(result.rows[0].checksum).toMatch(/^[a-f0-9]{64}$/);
  });
  it('does not reapply an already committed migration', async () => {
    expect(await migrateDatabase(url, 'test')).toBe(0);
  });
  it('uses real geography distances in metres', async () => {
    const result = await client.query<{ metres: number }>("SELECT ST_Distance(ST_SetSRID(ST_Point(76.9,43.2),4326)::geography, ST_SetSRID(ST_Point(76.91,43.2),4326)::geography) AS metres");
    expect(result.rows[0]!.metres).toBeGreaterThan(800);
    expect(result.rows[0]!.metres).toBeLessThan(820);
  });
  it('keeps Russian and Kazakh Unicode intact', async () => {
    const result = await client.query("SELECT lower('АЛМАТЫ') AS name, 'Қазақстан'::text AS country");
    expect(result.rows[0]).toEqual({ name: 'алматы', country: 'Қазақстан' });
  });
  it('rejects a region from another country and rolls back the write', async () => {
    await client.query('BEGIN');
    try {
      await client.query("INSERT INTO countries(code,default_locale) VALUES('KZ','ru'),('KG','ru')");
      await client.query("INSERT INTO regions(id,country_code,code,timezone) VALUES('22222222-2222-4222-8222-222222222222','KG','synthetic','Asia/Bishkek')");
      await expect(client.query("INSERT INTO places(id,country_code,region_id,location,timezone) VALUES('11111111-1111-4111-8111-111111111111','KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(76.9,43.2),4326),'Asia/Almaty')")).rejects.toMatchObject({ code: '23503' });
    } finally { await client.query('ROLLBACK'); }
  });
  it('rejects out-of-range stored coordinates rather than silently normalising them', async () => {
    await client.query('BEGIN');
    try {
      await client.query("INSERT INTO countries(code,default_locale) VALUES('KZ','ru')");
      await client.query("INSERT INTO regions(id,country_code,code,timezone) VALUES('22222222-2222-4222-8222-222222222222','KZ','synthetic','Asia/Almaty')");
      await expect(client.query("INSERT INTO places(id,country_code,region_id,location,timezone) VALUES('11111111-1111-4111-8111-111111111111','KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(181,43.2),4326),'Asia/Almaty')")).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('ROLLBACK'); }
  });
  it('cannot publish a place without translations, category and provenance', async () => {
    await client.query('BEGIN');
    try {
      await client.query("INSERT INTO countries(code,default_locale) VALUES('KZ','ru')");
      await client.query("INSERT INTO regions(id,country_code,code,timezone) VALUES('22222222-2222-4222-8222-222222222222','KZ','synthetic','Asia/Almaty')");
      await client.query("INSERT INTO places(id,country_code,region_id,location,timezone,status,verified_at) VALUES('11111111-1111-4111-8111-111111111111','KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(76.9,43.2),4326),'Asia/Almaty','published',now())");
      await expect(client.query('SET CONSTRAINTS ALL IMMEDIATE')).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('ROLLBACK'); }
  });
  it('does not leave fixture content after transactional tests', async () => {
    expect((await client.query('SELECT count(*)::int AS count FROM places')).rows[0].count).toBe(0);
  });
  it('rejects moving the last translation away from a published place', async () => {
    await client.query('BEGIN');
    try {
      await client.query(await readFile('db/fixtures/publication.sql', 'utf8'));
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      await expect(client.query("UPDATE place_translations SET place_id='55555555-5555-4555-8555-555555555555' WHERE place_id='11111111-1111-4111-8111-111111111111'")).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('ROLLBACK'); }
  });
  it('accepts a fully translated, categorised and sourced publication', async () => {
    await client.query('BEGIN');
    try {
      await client.query(await readFile('db/fixtures/publication.sql', 'utf8'));
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      expect((await client.query("SELECT count(*)::int AS count FROM places WHERE status='published'")).rows[0].count).toBe(1);
    } finally { await client.query('ROLLBACK'); }
  });
  it('refuses concurrent migration writers before running DDL', async () => {
    await client.query('SELECT pg_advisory_lock($1)', [23942026]);
    try { await expect(migrateDatabase(url, 'test')).rejects.toThrow('Migration already running'); }
    finally { await client.query('SELECT pg_advisory_unlock($1)', [23942026]); }
  });
  it('detects edited applied SQL and atomically rolls back a failing new migration', async () => {
    const prefix = join(resolve(tmpdir()), 'travel-stage1-migration-');
    const directory = await mkdtemp(prefix);
    try {
      for (const file of await readdir('db/migrations')) await copyFile(join('db/migrations', file), join(directory, file));
      const first = join(directory, '1794960000000_catalog.sql');
      const original = await readFile(first, 'utf8');
      await writeFile(first, original + '\n-- modified applied migration\n');
      await expect(migrateDatabase(url, 'test', directory)).rejects.toThrow('checksum mismatch');
      await writeFile(first, original);
      await writeFile(join(directory, '1794960000004_failure.sql'), 'CREATE TABLE transactional_probe(id int); SELECT missing_test_function();');
      await expect(migrateDatabase(url, 'test', directory)).rejects.toMatchObject({ code: '42883' });
      expect((await client.query("SELECT to_regclass('public.transactional_probe') AS name")).rows[0].name).toBeNull();
      expect((await client.query('SELECT count(*)::int AS count FROM travel_migration_checksums')).rows[0].count).toBe(4);
      expect((await client.query('SELECT count(*)::int AS count FROM travel_migrations')).rows[0].count).toBe(4);
    } finally {
      if (!resolve(directory).startsWith(resolve(tmpdir()) + sep + 'travel-stage1-migration-')) throw new Error('Unsafe test cleanup path');
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('uses a runtime identity without DDL permission', async () => {
    if (!process.env.TEST_RUNTIME_DATABASE_URL) throw new Error('TEST_RUNTIME_DATABASE_URL is required');
    assertTestRuntimeTarget(url, process.env.TEST_RUNTIME_DATABASE_URL);
    const runtime = new Client({ connectionString: process.env.TEST_RUNTIME_DATABASE_URL });
    await runtime.connect();
    try {
      await assertDatabaseIdentity(runtime, 'test');
      await runtime.query('BEGIN');
      expect((await runtime.query('SELECT count(*) FROM places')).rowCount).toBe(1);
      await expect(runtime.query('CREATE TABLE should_not_exist(id int)')).rejects.toMatchObject({ code: '42501' });
    } finally { await runtime.query('ROLLBACK'); await runtime.end(); }
  });
  it('rejects a source whose unknown license is padded with whitespace', async () => {
    await client.query('BEGIN');
    try {
      await expect(client.query("INSERT INTO data_sources(name,canonical_url,license_code,attribution_text) VALUES('Synthetic','https://example.invalid',' unknown ','Synthetic')")).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('ROLLBACK'); }
  });
  it('proves runtime has neither schema DDL nor inherited temporary-table privilege', async () => {
    const runtimeUrl = process.env.TEST_RUNTIME_DATABASE_URL!;
    assertTestRuntimeTarget(url, runtimeUrl);
    const runtime = new Client({ connectionString: runtimeUrl });
    await runtime.connect();
    try {
      await assertDatabaseIdentity(runtime, 'test');
      expect((await runtime.query("SELECT has_database_privilege(current_user,current_database(),'TEMPORARY') AS temp")).rows[0].temp).toBe(false);
      await runtime.query('BEGIN');
      await expect(runtime.query('CREATE TEMP TABLE temporary_probe(id int)')).rejects.toMatchObject({ code: '42501' });
    } finally { await runtime.query('ROLLBACK'); await runtime.end(); }
  });
  it('does not write migration metadata when the provisioned identity does not match', async () => {
    const previous = process.env.TRAVEL_DATABASE_ID;
    const count = (await client.query('SELECT count(*)::int AS count FROM travel_migrations')).rows[0].count;
    try {
      process.env.TRAVEL_DATABASE_ID = 'travel_wrong_project';
      await expect(migrateDatabase(url, 'test')).rejects.toThrow('Project database identity mismatch');
    } finally { if (previous === undefined) delete process.env.TRAVEL_DATABASE_ID; else process.env.TRAVEL_DATABASE_ID = previous; }
    expect((await client.query('SELECT count(*)::int AS count FROM travel_migrations')).rows[0].count).toBe(count);
  });
  it('uses the spatial and name indexes on a realistic synthetic dataset without disabling sequential scans', async () => {
    await client.query('BEGIN');
    try {
      await client.query("INSERT INTO countries(code,default_locale) VALUES('KZ','ru'); INSERT INTO regions(id,country_code,code,timezone) VALUES('22222222-2222-4222-8222-222222222222','KZ','synthetic','Asia/Almaty')");
      await client.query("INSERT INTO places(country_code,region_id,location,timezone) SELECT 'KZ','22222222-2222-4222-8222-222222222222',ST_SetSRID(ST_Point(76.0+(i%100)*0.001,43.0+(i/100)*0.001),4326),'Asia/Almaty' FROM generate_series(1,10000) AS i");
      await client.query("INSERT INTO place_translations(place_id,locale,name) SELECT id,'ru','Синтетическое место '||row_number() OVER(ORDER BY id) FROM places");
      // Flush the bulk-load GIN pending list just as post-import maintenance does.
      // Otherwise the planner correctly prices a fresh pending list above a scan.
      await client.query("SELECT gin_clean_pending_list('place_names_search'::regclass)");
      await client.query('ANALYZE places; ANALYZE place_translations');
      const queries = [
        ['places_bbox', 'SELECT id FROM places WHERE location && ST_MakeEnvelope(76.001,43.001,76.003,43.003,4326)'],
        ['places_radius', 'SELECT id FROM places WHERE ST_DWithin(location::geography,ST_SetSRID(ST_Point(76.001,43.001),4326)::geography,100)'],
        ['place_names_search', "SELECT place_id FROM place_translations WHERE lower(name) LIKE '%место 9876%'"],
      ] as const;
      for (const [index, query] of queries) {
        const plan = (await client.query('EXPLAIN (FORMAT JSON) ' + query)).rows;
        expect(JSON.stringify(plan)).toContain(index);
      }
    } finally { await client.query('ROLLBACK'); await client.query('ANALYZE places; ANALYZE place_translations'); }
  });
});
