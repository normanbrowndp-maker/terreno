import { expect, it } from 'vitest';
import { architectureViolations } from '../../scripts/lib/architecture';

it('permits dependencies through another module public contract', () => {
  expect(architectureViolations([{ file: 'src/modules/trips/index.ts', content: "import type { Principal } from '@/modules/identity';" }])).toEqual([]);
});
it('rejects private cross-module imports and shared-to-domain coupling', () => {
  expect(architectureViolations([
    { file: 'src/modules/trips/use-case.ts', content: "import { db } from '@/modules/catalog/infrastructure/db';" },
    { file: 'src/shared/helper.ts', content: "import { Place } from '@/modules/catalog';" },
  ])).toHaveLength(2);
});
it('rejects database code in a client component', () => {
  expect(architectureViolations([{ file: 'src/app/client.tsx', content: "'use client'; import { pool } from '@/shared/db/pool';" }])).toHaveLength(1);
});
