import { expect, it } from 'vitest';
import { assertTestRuntimeTarget, cleanLibpqEnvironment, assertClusterIdentifier, validateMigrationSql } from '../../src/shared/db/safety';

const source = 'postgresql://travel_test_migrator:example@127.0.0.1:55433/travel_test_foundation';
it('requires test runtime to point at the same physical database and low-privilege role', () => {
  expect(() => assertTestRuntimeTarget(source, 'postgresql://travel_test_runtime:example@127.0.0.1:55433/travel_test_foundation')).not.toThrow();
  for (const url of [
    'postgresql://postgres:example@127.0.0.1:55433/travel_test_foundation',
    'postgresql://travel_test_runtime:example@remote.example:55433/travel_test_foundation',
    'postgresql://travel_test_runtime:example@127.0.0.1:55432/travel_test_foundation',
    'postgresql://travel_test_runtime:example@127.0.0.1:55433/travel_test_restore',
  ]) expect(() => assertTestRuntimeTarget(source, url)).toThrow();
});
it('prevents all inherited libpq routing/service variables from redirecting restore', () => {
  const env = cleanLibpqEnvironment({ NODE_ENV: 'test', PATH: 'system', PGHOSTADDR: 'remote', pgservice: 'unsafe', PGSERVICEFILE: 'outside', PGPASSFILE: 'outside', PGOPTIONS: 'unsafe' }, 'local-test-password');
  expect(env).toEqual({ NODE_ENV: 'test', PATH: 'system', PGPASSWORD: 'local-test-password' });
});
it('rejects a data/state pair from different physical clusters', () => {
  expect(() => assertClusterIdentifier('123456789', '123456789')).not.toThrow();
  expect(() => assertClusterIdentifier('123456789', '987654321')).toThrow('Cluster identity mismatch');
  expect(() => assertClusterIdentifier(undefined, '123456789')).toThrow('Cluster identity mismatch');
});
it.each(['TRUNCATE places;', 'TRUNCATE TABLE places;', 'ALTER TABLE places DROP COLUMN name;', 'DELETE FROM places;', 'DROP TABLE places;'])('rejects destructive SQL before opening a connection', (sql) => {
  expect(() => validateMigrationSql(sql)).toThrow('Destructive migration is not allowed');
});
