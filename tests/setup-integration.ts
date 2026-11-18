import { loadLocalEnv } from '../scripts/load-local-env';
import { assertLocalDatabaseTarget } from '../src/shared/db/target';
import { assertTestRuntimeTarget } from '../src/shared/db/safety';

loadLocalEnv();
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required; run the isolated local setup first');
assertLocalDatabaseTarget(process.env.TEST_DATABASE_URL, 'test');
if (!process.env.TEST_RUNTIME_DATABASE_URL) throw new Error('TEST_RUNTIME_DATABASE_URL is required');
assertTestRuntimeTarget(process.env.TEST_DATABASE_URL, process.env.TEST_RUNTIME_DATABASE_URL);
