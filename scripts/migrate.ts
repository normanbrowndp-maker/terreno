import { loadLocalEnv } from './load-local-env';
import { migrateDatabase } from '../src/shared/db/migrate';

loadLocalEnv();
const test = process.argv.includes('--test');
const value = process.env[test ? 'TEST_DATABASE_URL' : 'MIGRATION_DATABASE_URL'];
if (!value) throw new Error('Required local migration configuration is missing');

migrateDatabase(value, test ? 'test' : 'development')
  .then((count) => console.log(`Applied ${count} migration(s) to the guarded ${test ? 'test' : 'development'} database`))
  .catch(() => { console.error('Migration failed. No down/reset is performed. Check local SQL and migration history.'); process.exitCode = 1; });
