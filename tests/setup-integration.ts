import { loadLocalEnv } from '../scripts/load-local-env';
import { assertLocalDatabaseTarget } from '../src/shared/db/target';

loadLocalEnv();
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required; run the isolated local setup first');
assertLocalDatabaseTarget(process.env.TEST_DATABASE_URL, 'test');
