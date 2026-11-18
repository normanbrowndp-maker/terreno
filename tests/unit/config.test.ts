import { describe, expect, it } from 'vitest';
import { parseServerConfig } from '@/shared/config/env';

describe('server configuration', () => {
  it('allows the foundation page to run without a database', () => {
    expect(parseServerConfig({})).toEqual({ databaseUrl: undefined });
  });
  it('accepts a PostgreSQL URL without changing it', () => {
    const url = 'postgresql://runtime:local-example@127.0.0.1:55432/travel_dev';
    expect(parseServerConfig({ DATABASE_URL: url }).databaseUrl).toBe(url);
  });
  it.each(['https://example.com/db', 'postgresql://', 'not-a-url'])('rejects invalid DB config without exposing input: %s', (value) => {
    expect(() => parseServerConfig({ DATABASE_URL: value })).toThrow('Invalid server configuration: DATABASE_URL');
  });
  it('never includes credentials in configuration errors', () => {
    const secret = 'private-placeholder';
    try { parseServerConfig({ DATABASE_URL: `https://user:${secret}@example.test` }); }
    catch (error) { expect(String(error)).not.toContain(secret); return; }
    throw new Error('Expected validation error');
  });
});
