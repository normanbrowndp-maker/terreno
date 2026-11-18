import { expect, it } from 'vitest';
import { GET as live } from '../../src/app/health/live/route';
import { GET as version } from '../../src/app/api/v1/route';

it('exposes only truthful version metadata and process liveness', async () => {
  const response = live();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
  expect(await version().json()).toEqual({ data: { apiVersion: 'v1', stage: 'foundation' } });
});
