import { expect, it } from 'vitest';
import { assessDependencyAudit } from '../../scripts/lib/dependency-review';

const known = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
it('permits only a time-bounded reviewed advisory in development-only nodes', () => {
  expect(assessDependencyAudit({ picomatch: { nodes: ['node_modules/picomatch'], via: [{ url: known }] } }, { 'node_modules/picomatch': { dev: true } }, '2026-11-18').blocked).toEqual([]);
});
it('blocks the same advisory if it reaches the production graph', () => {
  expect(assessDependencyAudit({ picomatch: { nodes: ['node_modules/picomatch'], via: [{ url: known }] } }, { 'node_modules/picomatch': {} }, '2026-11-18').blocked).toHaveLength(1);
});
it('blocks unreviewed advisories and expires the exception', () => {
  const nodes = { 'node_modules/picomatch': { dev: true } };
  expect(assessDependencyAudit({ picomatch: { nodes: ['node_modules/picomatch'], via: [{ url: 'https://github.com/advisories/unknown' }] } }, nodes, '2026-11-18').blocked).toHaveLength(1);
  expect(assessDependencyAudit({ picomatch: { nodes: ['node_modules/picomatch'], via: [{ url: known }] } }, nodes, '2026-12-19').blocked).toHaveLength(1);
});
