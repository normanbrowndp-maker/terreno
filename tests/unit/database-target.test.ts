import { describe, expect, it } from 'vitest';
import { assertLocalDatabaseTarget } from '@/shared/db/target';

describe('database isolation guard', () => {
  it('accepts only the dedicated local test database and role', () => {
    expect(assertLocalDatabaseTarget('postgresql://travel_test_migrator:example@127.0.0.1:55432/travel_test_foundation', 'test').database).toBe('travel_test_foundation');
  });
  it.each([
    'postgresql://travel_test_migrator:example@remote.example:55432/travel_test_foundation',
    'postgresql://travel_test_migrator:example@127.0.0.1:5432/travel_test_foundation',
    'postgresql://postgres:example@127.0.0.1:55432/travel_test_foundation',
    'postgresql://travel_test_migrator:example@127.0.0.1:55432/postgres',
    'postgresql://travel_test_migrator:example@127.0.0.1:55432/travel_dev',
    'postgresql://travel_test_migrator:example@127.0.0.1:55433/travel_test_restore',
    'postgresql://travel_test_migrator:example@127.0.0.1:55433/%E0',
    'postgresql://travel_test_migrator:example@127.0.0.1:55432/travel_test_foundation?host=remote.example',
  ])('refuses unsafe targets before connecting', (url) => {
    expect(() => assertLocalDatabaseTarget(url, 'test')).toThrow('Unsafe database target');
  });
  it('allows the separate dev migration identity only for dev', () => {
    expect(assertLocalDatabaseTarget('postgresql://travel_migrator:example@127.0.0.1:55432/travel_dev', 'development').database).toBe('travel_dev');
  });
});
