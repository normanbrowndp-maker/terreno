import { describe, expect, it } from 'vitest';
import { readiness } from '@/shared/db/readiness';

describe('readiness isolation', () => {
  it('reports unavailable when no database is configured', async () => {
    const response = await readiness(undefined);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'not_ready' });
  });
  it('checks connection and schema, not just process liveness', async () => {
    const response = await readiness(async () => { throw new Error('credential-private'); });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('credential-private');
  });
  it('returns no-store after a successful database check', async () => {
    const response = await readiness(async () => undefined);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
