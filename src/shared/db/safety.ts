import { assertLocalDatabaseTarget } from './target';

export function assertTestRuntimeTarget(source: string, runtime: string): void {
  const expected = assertLocalDatabaseTarget(source, 'test');
  const actual = assertLocalDatabaseTarget(runtime, 'runtime');
  if (expected.database !== actual.database || expected.port !== actual.port || new URL(source).hostname !== new URL(runtime).hostname || actual.username !== 'travel_test_runtime') throw new Error('Unsafe test runtime target');
}
export function cleanLibpqEnvironment(env: NodeJS.ProcessEnv, password: string): NodeJS.ProcessEnv {
  const cleaned = { ...env };
  for (const key of Object.keys(cleaned)) if (key.toUpperCase().startsWith('PG')) delete cleaned[key];
  cleaned.PGPASSWORD = password;
  return cleaned;
}
export function assertClusterIdentifier(expected: string | undefined, actual: string): void {
  if (!expected || !/^\d+$/.test(actual) || expected !== actual) throw new Error('Cluster identity mismatch');
}
/** Conservative forward-only policy, not a parser for untrusted arbitrary SQL. */
export function validateMigrationSql(sql: string): void {
  const content = sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ');
  if (/\b(?:DROP|TRUNCATE)\b|\bDELETE\s+FROM\b/i.test(content)) throw new Error('Destructive migration is not allowed');
}
